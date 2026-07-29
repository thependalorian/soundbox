"""Read and write access to the operational records.

Until now the backend exposed only the paths the *device* needs — register,
heartbeat, verify a payment — plus aggregate analytics. Everything a person
uses to run the deployment (list the devices, open one, review a merchant
application, work an alert) had no endpoint at all, which is why the console
was reading fixtures.

Three rules hold throughout:

- **Tenancy on every query.** Every filter starts from `organization_id`.
  A missing tenant clause on a payments table is not a style issue.
- **Soft deletes are respected.** `deleted_at IS NULL` on every list, because
  a record that was withdrawn should not reappear in a regulatory count.
- **State changes are logged, never silent.** Any endpoint that moves a
  record's status writes the append-only companion row in the same request,
  with the actor. The fast-read `status` column and the immutable log are
  written together or not at all.

Nothing here can move money. These endpoints read payment outcomes and manage
the estate around them; the observer position described in docs/architecture.md
is a property of the whole service, not a check inside one function.
"""

import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.security import generate_device_secret, hash_password
from app.db.helpers import get_or_create_organization, log_status_change
from app.db.models import (
    AnomalyAlert,
    Settlement,
    AnomalyAlertStatusLog,
    Device,
    DeviceHeartbeatLog,
    DeviceStatusLog,
    Merchant,
    MerchantBeneficialOwner,
    MerchantStatusLog,
    Transaction,
    TransactionStatusLog,
    TypeDefinition,
    User,
)
from app.db.session import get_db
from app.events import contracts, publisher

router = APIRouter()
logger = logging.getLogger(__name__)

# Roles permitted to change a record's state. Oversight reads nationally and
# records alert verdicts; it does not administer the device estate.
ADMIN_ROLES = {"admin"}
REVIEW_ROLES = {"admin", "regulator"}

MAX_PAGE = 200


def _merchant_names(db: Session, organization_id) -> Dict[str, str]:
    """Trading name where there is one, legal name otherwise.

    A market trader's registered legal name is often not what anyone calls
    the stall, and an operator searching a list is looking for the latter.
    """
    rows = db.query(Merchant).filter(
        Merchant.organization_id == organization_id,
        Merchant.deleted_at.is_(None),
    ).all()
    return {str(m.id): (m.trading_name or m.legal_name) for m in rows}


def _type_labels(db: Session, organization_id, domain: str) -> Dict[str, str]:
    """Code-to-label map for a type_definition domain.

    Returned alongside ids so the console never keeps its own copy of a
    taxonomy that is configuration by design.
    """
    rows = db.query(TypeDefinition).filter(
        TypeDefinition.organization_id == organization_id,
        TypeDefinition.domain == domain,
    ).all()
    return {str(r.id): r.label for r in rows}


def _iso(value) -> Optional[str]:
    return value.isoformat() if value else None


def _resolve_merchant_id(db: Session, organization_id, id_or_code: Optional[str]):
    """Accept either the internal UUID or the human-readable merchant code.

    A signed-in merchant knows themselves as "M-101"; the rows store a UUID.
    Resolving here rather than in the browser means the console never needs a
    local copy of the merchant list to translate one into the other — which
    is what previously tied it to fixtures.

    Returns None for an unknown code so the caller filters on nothing rather
    than silently returning every business.
    """
    if not id_or_code:
        return None
    m = db.query(Merchant).filter(
        Merchant.organization_id == organization_id,
        or_(Merchant.merchant_code == id_or_code,
            Merchant.id == id_or_code if _looks_like_uuid(id_or_code) else False),
        Merchant.deleted_at.is_(None),
    ).first()
    return m.id if m else None


def _looks_like_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


# ---------------------------------------------------------------------------
# Devices
# ---------------------------------------------------------------------------

class AssignDevice(BaseModel):
    merchant_id: str
    note: Optional[str] = Field(default=None, max_length=500)


class DeviceStatusChange(BaseModel):
    status: str
    note: Optional[str] = Field(default=None, max_length=500)


def _device_row(d: Device, names: Dict[str, str]) -> Dict:
    return {
        "id": str(d.id),
        "deviceCode": d.device_code,
        "merchantId": str(d.merchant_id) if d.merchant_id else None,
        "merchantName": names.get(str(d.merchant_id)),
        "firmwareVersion": d.firmware_version,
        "status": d.status,
        "batteryLevel": d.battery_level,
        "signalStrength": d.signal_strength,
        "registeredAt": _iso(d.registered_at),
        "lastHeartbeatAt": _iso(d.last_heartbeat_at),
    }


@router.get("/devices")
async def list_devices(
    status: Optional[str] = None,
    merchant_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=MAX_PAGE),
    offset: int = 0,
    db: Session = Depends(get_db),
) -> Dict:
    """Devices, newest registration first."""
    try:
        org = get_or_create_organization(db)
        q = db.query(Device).filter(
            Device.organization_id == org.id,
            Device.deleted_at.is_(None),
        )
        if status:
            q = q.filter(Device.status == status)
        if merchant_id:
            q = q.filter(Device.merchant_id == _resolve_merchant_id(db, org.id, merchant_id))
        if search:
            q = q.filter(Device.device_code.ilike(f"%{search}%"))

        total = q.count()
        rows = q.order_by(Device.registered_at.desc()).offset(offset).limit(limit).all()
        names = _merchant_names(db, org.id)
        return {
            "devices": [_device_row(d, names) for d in rows],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Error listing devices: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/devices/{device_id}")
async def get_device(device_id: str, db: Session = Depends(get_db)) -> Dict:
    """One device, with the history that explains its current state.

    The heartbeat series is included because "when did it last speak" is the
    first question about a silent device, and answering it in a second
    request would mean the page renders a device before it can say whether
    the device is actually alive.
    """
    try:
        org = get_or_create_organization(db)
        device = db.query(Device).filter(
            Device.id == device_id,
            Device.organization_id == org.id,
            Device.deleted_at.is_(None),
        ).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found.")

        names = _merchant_names(db, org.id)
        status_log = db.query(DeviceStatusLog).filter(
            DeviceStatusLog.organization_id == org.id,
            DeviceStatusLog.device_id == device.id,
        ).order_by(DeviceStatusLog.created_at.desc()).limit(50).all()

        heartbeats = db.query(DeviceHeartbeatLog).filter(
            DeviceHeartbeatLog.organization_id == org.id,
            DeviceHeartbeatLog.device_id == device.id,
        ).order_by(DeviceHeartbeatLog.recorded_at.desc()).limit(100).all()

        recent = db.query(Transaction).filter(
            Transaction.organization_id == org.id,
            Transaction.device_id == device.id,
            Transaction.deleted_at.is_(None),
        ).order_by(Transaction.created_at.desc()).limit(20).all()

        return {
            **_device_row(device, names),
            "statusLog": [{
                "id": str(s.id),
                "fromStatus": s.from_status,
                "toStatus": s.to_status,
                "note": s.note,
                "at": _iso(s.created_at),
            } for s in status_log],
            "heartbeats": [{
                "at": _iso(h.recorded_at),
                "batteryLevel": h.battery_level,
                "signalStrength": h.signal_strength,
            } for h in reversed(heartbeats)],
            "recentTransactions": [{
                "id": str(t.id),
                "transactionRef": t.transaction_ref,
                "amount": float(t.amount or 0),
                "currencyCode": t.currency_code,
                "status": t.status,
                "paymentType": t.payment_type,
                "createdAt": _iso(t.created_at),
            } for t in recent],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading device {device_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/devices/{device_id}/assign")
async def assign_device(
    device_id: str,
    body: AssignDevice,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*ADMIN_ROLES)),
) -> Dict:
    """Move a device to a merchant.

    Recorded in the status log even though the status itself does not
    change: where a device is installed is exactly the kind of fact that
    later needs explaining, and a reassignment that leaves no trace makes a
    device's transaction history impossible to interpret.
    """
    try:
        org = get_or_create_organization(db)
        device = db.query(Device).filter(
            Device.id == device_id,
            Device.organization_id == org.id,
            Device.deleted_at.is_(None),
        ).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found.")

        merchant = db.query(Merchant).filter(
            Merchant.id == body.merchant_id,
            Merchant.organization_id == org.id,
            Merchant.deleted_at.is_(None),
        ).first()
        if not merchant:
            raise HTTPException(status_code=404, detail="Business not found.")

        previous = str(device.merchant_id) if device.merchant_id else "unassigned"
        device.merchant_id = merchant.id
        db.commit()

        name = merchant.trading_name or merchant.legal_name
        log_status_change(
            db, DeviceStatusLog, org.id, "device_id", device.id,
            from_status=device.status, to_status=device.status,
            note=(f"Assigned to {name} (was {previous}) by {actor.display_name}."
                  + (f" {body.note}" if body.note else "")),
        )
        db.commit()

        names = _merchant_names(db, org.id)
        return _device_row(device, names)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning device {device_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/devices/{device_id}/status")
async def set_device_status(
    device_id: str,
    body: DeviceStatusChange,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*ADMIN_ROLES)),
) -> Dict:
    """Change a device's status.

    Valid statuses come from `type_definitions`, not from a literal list
    here — adding one is a configuration row, not a release.
    """
    try:
        org = get_or_create_organization(db)
        valid = {
            r.code for r in db.query(TypeDefinition).filter(
                TypeDefinition.organization_id == org.id,
                TypeDefinition.domain == "device_status",
                TypeDefinition.is_active.is_(True),
            ).all()
        }
        if valid and body.status not in valid:
            raise HTTPException(
                status_code=400,
                detail=f"{body.status} is not a configured device status. Configured: {', '.join(sorted(valid))}.",
            )

        device = db.query(Device).filter(
            Device.id == device_id,
            Device.organization_id == org.id,
            Device.deleted_at.is_(None),
        ).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found.")

        previous = device.status
        if previous == body.status:
            return _device_row(device, _merchant_names(db, org.id))

        device.status = body.status
        db.commit()
        log_status_change(
            db, DeviceStatusLog, org.id, "device_id", device.id,
            from_status=previous, to_status=body.status,
            note=(body.note or f"Changed by {actor.display_name}."),
        )
        db.commit()
        publisher.publish(contracts.device_status_changed(
            organization_id=str(org.id),
            device_id=str(device.id),
            device_code=device.device_code,
            from_status=previous,
            to_status=body.status,
        ))
        return _device_row(device, _merchant_names(db, org.id))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting device status {device_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


# ---------------------------------------------------------------------------
# Merchants
# ---------------------------------------------------------------------------

class MerchantStatusChange(BaseModel):
    status: str
    note: Optional[str] = Field(default=None, max_length=500)


def _merchant_row(m: Merchant, regions: Dict[str, str], constituencies: Dict[str, str]) -> Dict:
    return {
        "id": str(m.id),
        "merchantCode": m.merchant_code,
        "legalName": m.legal_name,
        "tradingName": m.trading_name,
        "displayName": m.trading_name or m.legal_name,
        "registrationNumber": m.registration_number,
        "status": m.status,
        "idVerificationStatus": m.id_verification_status,
        "fiaClientCategory": m.fia_client_category,
        "contactPhone": m.contact_phone,
        "contactEmail": m.contact_email,
        "regionId": str(m.region_id) if m.region_id else None,
        "regionLabel": regions.get(str(m.region_id)),
        "constituencyId": str(m.constituency_id) if m.constituency_id else None,
        "constituencyLabel": constituencies.get(str(m.constituency_id)),
        "lat": float(m.lat) if m.lat is not None else None,
        "lng": float(m.lng) if m.lng is not None else None,
        "createdAt": _iso(m.created_at),
    }


@router.get("/merchants")
async def list_merchants(
    status: Optional[str] = None,
    region_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=MAX_PAGE),
    offset: int = 0,
    db: Session = Depends(get_db),
) -> Dict:
    """Businesses, with a count of those still awaiting review.

    `pendingReview` is returned on every call so the console can badge the
    onboarding queue without a second request — an application waiting
    unseen is the failure this list exists to prevent.
    """
    try:
        org = get_or_create_organization(db)
        q = db.query(Merchant).filter(
            Merchant.organization_id == org.id,
            Merchant.deleted_at.is_(None),
        )
        if status:
            q = q.filter(Merchant.status == status)
        if region_id:
            q = q.filter(Merchant.region_id == region_id)
        if search:
            like = f"%{search}%"
            q = q.filter(or_(
                Merchant.legal_name.ilike(like),
                Merchant.trading_name.ilike(like),
                Merchant.merchant_code.ilike(like),
            ))

        total = q.count()
        rows = q.order_by(Merchant.created_at.desc()).offset(offset).limit(limit).all()

        pending = db.query(Merchant).filter(
            Merchant.organization_id == org.id,
            Merchant.deleted_at.is_(None),
            Merchant.status == "pending_kyc",
        ).count()

        regions = _type_labels(db, org.id, "region")
        constituencies = _type_labels(db, org.id, "constituency")
        return {
            "merchants": [_merchant_row(m, regions, constituencies) for m in rows],
            "total": total,
            "pendingReview": pending,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Error listing merchants: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/merchants/{merchant_id}")
async def get_merchant(merchant_id: str, db: Session = Depends(get_db)) -> Dict:
    """One business, with everything a reviewer needs in one response.

    Beneficial owners are a child table rather than a JSON column, so they
    are joined here. ID numbers are national identifiers and are **not**
    returned — a reviewer needs to know an owner was verified, not to read
    the number again. See docs/privacy.md.
    """
    try:
        org = get_or_create_organization(db)
        m = db.query(Merchant).filter(
            Merchant.id == _resolve_merchant_id(db, org.id, merchant_id),
            Merchant.organization_id == org.id,
            Merchant.deleted_at.is_(None),
        ).first()
        if not m:
            raise HTTPException(status_code=404, detail="Business not found.")

        owners = db.query(MerchantBeneficialOwner).filter(
            MerchantBeneficialOwner.organization_id == org.id,
            MerchantBeneficialOwner.merchant_id == m.id,
            MerchantBeneficialOwner.deleted_at.is_(None),
        ).all()

        status_log = db.query(MerchantStatusLog).filter(
            MerchantStatusLog.organization_id == org.id,
            MerchantStatusLog.merchant_id == m.id,
        ).order_by(MerchantStatusLog.created_at.desc()).limit(50).all()

        devices = db.query(Device).filter(
            Device.organization_id == org.id,
            Device.merchant_id == m.id,
            Device.deleted_at.is_(None),
        ).all()

        regions = _type_labels(db, org.id, "region")
        constituencies = _type_labels(db, org.id, "constituency")
        names = _merchant_names(db, org.id)

        return {
            **_merchant_row(m, regions, constituencies),
            "address": m.address or {},
            "beneficialOwners": [{
                "id": str(o.id),
                "fullName": o.full_name,
                "ownershipPercent": float(o.ownership_percent or 0),
                "isPep": bool(o.is_pep),
                # The identifier itself is deliberately withheld; only
                # whether one is on file is returned.
                "hasIdOnFile": bool(o.id_number),
            } for o in owners],
            "statusLog": [{
                "id": str(s.id),
                "fromStatus": s.from_status,
                "toStatus": s.to_status,
                "note": s.note,
                "at": _iso(s.created_at),
            } for s in status_log],
            "devices": [_device_row(d, names) for d in devices],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading merchant {merchant_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/merchants/{merchant_id}/status")
async def set_merchant_status(
    merchant_id: str,
    body: MerchantStatusChange,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*REVIEW_ROLES)),
) -> Dict:
    """Approve, reject, or otherwise move an application.

    A rejection must carry a note. A business turned away is owed a reason,
    and a reviewer who cannot state one has not finished reviewing.
    """
    try:
        org = get_or_create_organization(db)
        valid = {
            r.code for r in db.query(TypeDefinition).filter(
                TypeDefinition.organization_id == org.id,
                TypeDefinition.domain == "merchant_status",
                TypeDefinition.is_active.is_(True),
            ).all()
        }
        if valid and body.status not in valid:
            raise HTTPException(
                status_code=400,
                detail=f"{body.status} is not a configured status. Configured: {', '.join(sorted(valid))}.",
            )
        # The adverse outcomes in the configured merchant_status taxonomy.
        # A business turned away or shut off is owed a reason, and a reviewer
        # who cannot state one has not finished reviewing.
        if body.status in {"suspended", "closed"} and not (body.note or "").strip():
            raise HTTPException(
                status_code=400,
                detail="A note is required when suspending or closing a business.",
            )

        m = db.query(Merchant).filter(
            Merchant.id == merchant_id,
            Merchant.organization_id == org.id,
            Merchant.deleted_at.is_(None),
        ).first()
        if not m:
            raise HTTPException(status_code=404, detail="Business not found.")

        previous = m.status
        if previous == body.status:
            regions = _type_labels(db, org.id, "region")
            return _merchant_row(m, regions, _type_labels(db, org.id, "constituency"))

        m.status = body.status
        m.updated_at = datetime.utcnow()
        db.commit()
        log_status_change(
            db, MerchantStatusLog, org.id, "merchant_id", m.id,
            from_status=previous, to_status=body.status,
            note=(body.note or f"Decided by {actor.display_name}."),
        )
        db.commit()
        publisher.publish(contracts.merchant_status_changed(
            organization_id=str(org.id),
            merchant_id=str(m.id),
            from_status=previous,
            to_status=body.status,
        ))

        regions = _type_labels(db, org.id, "region")
        return _merchant_row(m, regions, _type_labels(db, org.id, "constituency"))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting merchant status {merchant_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------

def _transaction_row(t: Transaction, names: Dict[str, str]) -> Dict:
    return {
        "id": str(t.id),
        "transactionRef": t.transaction_ref,
        "merchantId": str(t.merchant_id) if t.merchant_id else None,
        "merchantName": names.get(str(t.merchant_id)),
        "deviceId": str(t.device_id) if t.device_id else None,
        "amount": float(t.amount or 0),
        "currencyCode": t.currency_code,
        "status": t.status,
        "paymentType": t.payment_type,
        "payerInstrument": t.payer_instrument,
        "createdAt": _iso(t.created_at),
    }


@router.get("/transactions")
async def list_transactions(
    merchant_id: Optional[str] = None,
    device_id: Optional[str] = None,
    status: Optional[str] = None,
    payment_type: Optional[str] = None,
    payer_instrument: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=MAX_PAGE),
    offset: int = 0,
    db: Session = Depends(get_db),
) -> Dict:
    """Payments, newest first, filterable on every dimension the console shows."""
    try:
        org = get_or_create_organization(db)
        q = db.query(Transaction).filter(
            Transaction.organization_id == org.id,
            Transaction.deleted_at.is_(None),
        )
        if merchant_id:
            q = q.filter(Transaction.merchant_id == _resolve_merchant_id(db, org.id, merchant_id))
        if device_id:
            q = q.filter(Transaction.device_id == device_id)
        if status:
            q = q.filter(Transaction.status == status)
        if payment_type:
            q = q.filter(Transaction.payment_type == payment_type)
        if payer_instrument:
            q = q.filter(Transaction.payer_instrument == payer_instrument)
        if search:
            q = q.filter(Transaction.transaction_ref.ilike(f"%{search}%"))

        total = q.count()
        rows = q.order_by(Transaction.created_at.desc()).offset(offset).limit(limit).all()
        names = _merchant_names(db, org.id)
        return {
            "transactions": [_transaction_row(t, names) for t in rows],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Error listing transactions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/transactions/{transaction_id}")
async def get_transaction(transaction_id: str, db: Session = Depends(get_db)) -> Dict:
    """One payment and how it reached its current state.

    `payer_info` is returned only as the masked alias the ingestion path
    stores. Announcing an amount never required knowing who paid, and the
    console does not need it either.
    """
    try:
        org = get_or_create_organization(db)
        t = db.query(Transaction).filter(
            Transaction.id == transaction_id,
            Transaction.organization_id == org.id,
            Transaction.deleted_at.is_(None),
        ).first()
        if not t:
            raise HTTPException(status_code=404, detail="Payment not found.")

        status_log = db.query(TransactionStatusLog).filter(
            TransactionStatusLog.organization_id == org.id,
            TransactionStatusLog.transaction_id == t.id,
        ).order_by(TransactionStatusLog.created_at.desc()).limit(50).all()

        alerts = db.query(AnomalyAlert).filter(
            AnomalyAlert.organization_id == org.id,
            AnomalyAlert.transaction_id == t.id,
            AnomalyAlert.deleted_at.is_(None),
        ).all()

        payer = t.payer_info or {}
        names = _merchant_names(db, org.id)
        return {
            **_transaction_row(t, names),
            "payerAlias": payer.get("alias") or payer.get("display_name"),
            "statusLog": [{
                "id": str(s.id),
                "fromStatus": s.from_status,
                "toStatus": s.to_status,
                "note": s.note,
                "at": _iso(s.created_at),
            } for s in status_log],
            "alerts": [{
                "id": str(a.id),
                "anomalyScore": float(a.anomaly_score or 0),
                "riskLevel": a.risk_level,
                "status": a.status,
            } for a in alerts],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading transaction {transaction_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ---------------------------------------------------------------------------
# Anomaly alerts
# ---------------------------------------------------------------------------

class AlertVerdict(BaseModel):
    # The verdict deliberately still says fraud while everything the system
    # produces says anomaly. Software finds the unusual; this is the one
    # moment a person decides whether unusual meant fraudulent.
    verdict: str
    note: Optional[str] = Field(default=None, max_length=1000)


# Where each verdict leaves the alert. The vocabulary is the one the rest of
# the system already uses (open, under_review, resolved, escalated) — a
# reviewer's decision must land in the same state machine the queue filters
# on, not a parallel one.
VERDICT_STATUS = {
    "confirmed_fraud": "escalated",
    "not_fraud": "resolved",
    "need_more_info": "under_review",
}

ALERT_STATUSES = {"open", "under_review", "resolved", "escalated"}

VERDICT_NOTE = {
    "confirmed_fraud": "Reviewer verdict: confirmed fraud.",
    "not_fraud": "Reviewer verdict: false positive, not fraud.",
    "need_more_info": "Reviewer verdict: insufficient information, investigating.",
}


@router.get("/anomaly-alerts/{alert_id}")
async def get_alert(alert_id: str, db: Session = Depends(get_db)) -> Dict:
    """One alert, with the reasoning that produced it.

    `explanation` carries the rules that fired, the numbers behind each, and
    the configuration fingerprint. An alert must stay explainable after the
    thresholds move, which is why the reasoning is persisted on the row
    rather than recomputed on read.
    """
    try:
        org = get_or_create_organization(db)
        a = db.query(AnomalyAlert).filter(
            AnomalyAlert.id == alert_id,
            AnomalyAlert.organization_id == org.id,
            AnomalyAlert.deleted_at.is_(None),
        ).first()
        if not a:
            raise HTTPException(status_code=404, detail="Alert not found.")

        status_log = db.query(AnomalyAlertStatusLog).filter(
            AnomalyAlertStatusLog.organization_id == org.id,
            AnomalyAlertStatusLog.anomaly_alert_id == a.id,
        ).order_by(AnomalyAlertStatusLog.created_at.desc()).limit(50).all()

        names = _merchant_names(db, org.id)
        explanation = a.explanation or {}
        return {
            "id": str(a.id),
            "merchantId": str(a.merchant_id) if a.merchant_id else None,
            "merchantName": names.get(str(a.merchant_id)),
            "transactionId": str(a.transaction_id) if a.transaction_id else None,
            "deviceId": str(a.device_id) if a.device_id else None,
            "amount": float(a.amount or 0),
            "anomalyScore": float(a.anomaly_score or 0),
            "currencyCode": a.currency_code,
            "expectedLoss": float(a.expected_loss or 0),
            "riskLevel": a.risk_level,
            "signalType": a.signal_type,
            "status": a.status,
            "reasons": explanation.get("reasons", []),
            "model": explanation.get("model"),
            "ruleConfig": explanation.get("rule_config"),
            "detectedAt": _iso(a.detected_at),
            "statusLog": [{
                "id": str(s.id),
                "fromStatus": s.from_status,
                "toStatus": s.to_status,
                "note": s.note,
                "at": _iso(s.created_at),
            } for s in status_log],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/anomaly-alerts/{alert_id}/verdict")
async def record_verdict(
    alert_id: str,
    body: AlertVerdict,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*REVIEW_ROLES)),
) -> Dict:
    """Record a reviewer's decision on an alert.

    This is the product's only source of ground truth. The scorer is
    unsupervised: it learns what is unusual, never what is fraudulent. Every
    verdict recorded here accumulates toward the labelled dataset a
    supervised model would need, which is why the endpoint exists long
    before that model does.
    """
    if body.verdict not in VERDICT_STATUS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown verdict. Expected one of: {', '.join(sorted(VERDICT_STATUS))}.",
        )
    try:
        org = get_or_create_organization(db)
        a = db.query(AnomalyAlert).filter(
            AnomalyAlert.id == alert_id,
            AnomalyAlert.organization_id == org.id,
            AnomalyAlert.deleted_at.is_(None),
        ).first()
        if not a:
            raise HTTPException(status_code=404, detail="Alert not found.")

        previous = a.status
        a.status = VERDICT_STATUS[body.verdict]
        db.commit()
        log_status_change(
            db, AnomalyAlertStatusLog, org.id, "anomaly_alert_id", a.id,
            from_status=previous, to_status=a.status,
            note=f"{VERDICT_NOTE[body.verdict]} Recorded by {actor.display_name}."
                 + (f" {body.note}" if body.note else ""),
        )
        db.commit()

        # The only confirmed-outcome event the platform produces. A future
        # training pipeline subscribes to this rather than polling the table.
        publisher.publish(contracts.alert_verdict(
            organization_id=str(org.id),
            alert_id=str(a.id),
            verdict=body.verdict,
            status=a.status,
            reviewer=actor.display_name,
        ))
        return {"id": str(a.id), "status": a.status, "verdict": body.verdict}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording verdict on {alert_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


# ---------------------------------------------------------------------------
# Settlements
# ---------------------------------------------------------------------------

@router.get("/settlements")
async def list_settlements(
    merchant_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=100, le=MAX_PAGE),
    offset: int = 0,
    db: Session = Depends(get_db),
) -> Dict:
    """Settlement batches, most recent first.

    A payee is credited in real time; interbank net settlement happens later
    in cycles. These rows are the second event, which is why a business can
    see money received today and a settlement dated tomorrow — the console
    shows both rather than conflating them.
    """
    try:
        org = get_or_create_organization(db)
        q = db.query(Settlement).filter(
            Settlement.organization_id == org.id,
            Settlement.deleted_at.is_(None),
        )
        if merchant_id:
            q = q.filter(Settlement.merchant_id == _resolve_merchant_id(db, org.id, merchant_id))
        if status:
            q = q.filter(Settlement.status == status)

        total = q.count()
        rows = q.order_by(Settlement.settlement_date.desc()).offset(offset).limit(limit).all()
        return {
            "settlements": [{
                "id": str(r.id),
                "merchantId": str(r.merchant_id) if r.merchant_id else None,
                "amount": float(r.amount or 0),
                "currencyCode": r.currency_code,
                "status": r.status,
                "settlementDate": _iso(r.settlement_date),
                "reference": r.reference,
            } for r in rows],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Error listing settlements: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


class AlertStatusChange(BaseModel):
    status: str
    note: Optional[str] = Field(default=None, max_length=1000)


@router.put("/anomaly-alerts/{alert_id}/status")
async def set_alert_status(
    alert_id: str,
    body: AlertStatusChange,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*REVIEW_ROLES)),
) -> Dict:
    """Move an alert through triage without recording a verdict.

    Distinct from `/verdict` on purpose. Picking an alert up for review is a
    workflow step; saying whether it was fraud is a judgement that becomes
    training data. Recording the first as though it were the second would
    poison the only ground truth this product has.
    """
    if body.status not in ALERT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown status. Expected one of: {', '.join(sorted(ALERT_STATUSES))}.",
        )
    try:
        org = get_or_create_organization(db)
        a = db.query(AnomalyAlert).filter(
            AnomalyAlert.id == alert_id,
            AnomalyAlert.organization_id == org.id,
            AnomalyAlert.deleted_at.is_(None),
        ).first()
        if not a:
            raise HTTPException(status_code=404, detail="Alert not found.")

        previous = a.status
        if previous == body.status:
            return {"id": str(a.id), "status": a.status}

        a.status = body.status
        db.commit()
        log_status_change(
            db, AnomalyAlertStatusLog, org.id, "anomaly_alert_id", a.id,
            from_status=previous, to_status=body.status,
            note=(body.note or f"Status changed by {actor.display_name}."),
        )
        db.commit()
        return {"id": str(a.id), "status": a.status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting alert status {alert_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


# ---------------------------------------------------------------------------
# Create, update, retire
# ---------------------------------------------------------------------------
#
# Deletes are soft, always. An operational record that was withdrawn still
# has to be explainable — a payment that ran through a device retired last
# year must still resolve that device. `deleted_at` takes it out of every
# list without taking it out of the history.


class CreateDevice(BaseModel):
    device_code: str = Field(min_length=1, max_length=64)
    firmware_version: str = Field(default="0.0.0", max_length=32)
    merchant_id: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=500)


class UpdateDevice(BaseModel):
    firmware_version: Optional[str] = Field(default=None, max_length=32)
    note: Optional[str] = Field(default=None, max_length=500)


@router.post("/devices", status_code=201)
async def create_device(
    body: CreateDevice,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*ADMIN_ROLES)),
) -> Dict:
    """Add a device to the estate from the console.

    Distinct from `POST /devices/register`, which is the device introducing
    itself over the air. This is a person recording a unit before it ships,
    so it starts `inactive` — a device that has never spoken should not
    appear healthy.
    """
    try:
        org = get_or_create_organization(db)
        # Deliberately does NOT filter deleted_at. `device_code` is UNIQUE at
        # the database level, so a withdrawn device still occupies its code.
        # Filtering soft-deleted rows out here would report the code as free
        # and then fail on INSERT with an integrity error the caller cannot
        # act on. This is a uniqueness check, not a record lookup.
        existing = db.query(Device).filter(
            Device.organization_id == org.id,
            Device.device_code == body.device_code,
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Device {body.device_code} already exists.",
            )

        merchant_id = None
        if body.merchant_id:
            m = db.query(Merchant).filter(
                Merchant.id == body.merchant_id,
                Merchant.organization_id == org.id,
                Merchant.deleted_at.is_(None),
            ).first()
            if not m:
                raise HTTPException(status_code=404, detail="Business not found.")
            merchant_id = m.id

        # The credential this device will use to prove it is itself on
        # /devices/register, /devices/heartbeat, /payments/verify and
        # /payments/process_qr (X-Device-Code + X-Device-Key). Shown exactly
        # once, in this response -- only its bcrypt hash is ever persisted,
        # so provision it onto the physical unit now or it must be rotated.
        device_secret = generate_device_secret()

        # Client-side UUID so a retried request cannot create a second row.
        device = Device(
            id=uuid.uuid4(),
            organization_id=org.id,
            merchant_id=merchant_id,
            device_code=body.device_code,
            firmware_version=body.firmware_version,
            status="inactive",
            battery_level=0,
            signal_strength=0,
            api_key_hash=hash_password(device_secret),
            registered_at=datetime.utcnow(),
        )
        db.add(device)
        db.commit()
        log_status_change(
            db, DeviceStatusLog, org.id, "device_id", device.id,
            from_status=None, to_status="inactive",
            note=(body.note or f"Added by {actor.display_name}. Not yet heard from."),
        )
        db.commit()
        return {
            **_device_row(device, _merchant_names(db, org.id)),
            "deviceKey": device_secret,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating device: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/devices/{device_id}/rotate-key")
async def rotate_device_key(
    device_id: str,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*ADMIN_ROLES)),
) -> Dict:
    """Issue a new device credential, invalidating the old one immediately.

    For a lost, decommissioned-and-reissued, or suspected-compromised unit.
    The old X-Device-Key stops working the moment this commits -- there is
    no grace period, because a key rotation you can still use with the old
    key is not a rotation.
    """
    try:
        org = get_or_create_organization(db)
        device = db.query(Device).filter(
            Device.id == device_id,
            Device.organization_id == org.id,
            Device.deleted_at.is_(None),
        ).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found.")

        device_secret = generate_device_secret()
        device.api_key_hash = hash_password(device_secret)
        db.commit()
        log_status_change(
            db, DeviceStatusLog, org.id, "device_id", device.id,
            from_status=device.status, to_status=device.status,
            note=f"Device key rotated by {actor.display_name}.",
        )
        db.commit()
        return {"id": str(device.id), "deviceKey": device_secret}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rotating device key for {device_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/devices/{device_id}")
async def update_device(
    device_id: str,
    body: UpdateDevice,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*ADMIN_ROLES)),
) -> Dict:
    """Update a device's recorded firmware version."""
    try:
        org = get_or_create_organization(db)
        device = db.query(Device).filter(
            Device.id == device_id,
            Device.organization_id == org.id,
            Device.deleted_at.is_(None),
        ).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found.")

        if body.firmware_version and body.firmware_version != device.firmware_version:
            previous = device.firmware_version
            device.firmware_version = body.firmware_version
            db.commit()
            log_status_change(
                db, DeviceStatusLog, org.id, "device_id", device.id,
                from_status=device.status, to_status=device.status,
                note=(f"Firmware {previous} to {body.firmware_version}, recorded by "
                      f"{actor.display_name}." + (f" {body.note}" if body.note else "")),
            )
            db.commit()
        return _device_row(device, _merchant_names(db, org.id))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating device {device_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/devices/{device_id}")
async def retire_device(
    device_id: str,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*ADMIN_ROLES)),
) -> Dict:
    """Retire a device. Soft delete: the row stays, the estate loses it."""
    try:
        org = get_or_create_organization(db)
        device = db.query(Device).filter(
            Device.id == device_id,
            Device.organization_id == org.id,
            Device.deleted_at.is_(None),
        ).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found.")

        previous = device.status
        device.status = "retired"
        device.deleted_at = datetime.utcnow()
        db.commit()
        log_status_change(
            db, DeviceStatusLog, org.id, "device_id", device.id,
            from_status=previous, to_status="retired",
            note=(note or f"Retired by {actor.display_name}."),
        )
        db.commit()
        return {"id": str(device.id), "status": "retired", "retired": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retiring device {device_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


class CreateMerchant(BaseModel):
    merchant_code: str = Field(min_length=1, max_length=64)
    legal_name: str = Field(min_length=1, max_length=255)
    trading_name: Optional[str] = Field(default=None, max_length=255)
    registration_number: Optional[str] = Field(default=None, max_length=64)
    contact_phone: Optional[str] = Field(default=None, max_length=32)
    contact_email: Optional[str] = Field(default=None, max_length=255)
    region_id: Optional[str] = None
    constituency_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class UpdateMerchant(BaseModel):
    legal_name: Optional[str] = Field(default=None, max_length=255)
    trading_name: Optional[str] = Field(default=None, max_length=255)
    registration_number: Optional[str] = Field(default=None, max_length=64)
    contact_phone: Optional[str] = Field(default=None, max_length=32)
    contact_email: Optional[str] = Field(default=None, max_length=255)
    region_id: Optional[str] = None
    constituency_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


@router.post("/merchants", status_code=201)
async def create_merchant(
    body: CreateMerchant,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*REVIEW_ROLES)),
) -> Dict:
    """Register a business application.

    Always starts `pending_kyc`. There is no path that creates an approved
    business directly: approval is a decision someone is accountable for,
    and it has to appear in the status log as one.
    """
    try:
        org = get_or_create_organization(db)
        # Deliberately does NOT filter deleted_at — `merchant_code` is UNIQUE
        # at the database level, so a withdrawn business still holds its code.
        # See the equivalent check in create_device above.
        existing = db.query(Merchant).filter(
            Merchant.organization_id == org.id,
            Merchant.merchant_code == body.merchant_code,
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Business {body.merchant_code} already exists.",
            )

        m = Merchant(
            id=uuid.uuid4(),
            organization_id=org.id,
            merchant_code=body.merchant_code,
            legal_name=body.legal_name,
            trading_name=body.trading_name,
            registration_number=body.registration_number,
            contact_phone=body.contact_phone,
            contact_email=body.contact_email,
            region_id=body.region_id,
            constituency_id=body.constituency_id,
            lat=Decimal(str(body.lat)) if body.lat is not None else None,
            lng=Decimal(str(body.lng)) if body.lng is not None else None,
            id_verification_status="pending",
            status="pending_kyc",
            address={},
            created_at=datetime.utcnow(),
        )
        db.add(m)
        db.commit()
        log_status_change(
            db, MerchantStatusLog, org.id, "merchant_id", m.id,
            from_status=None, to_status="pending_kyc",
            note=f"Application registered by {actor.display_name}.",
        )
        db.commit()
        return _merchant_row(m, _type_labels(db, org.id, "region"),
                             _type_labels(db, org.id, "constituency"))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating merchant: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/merchants/{merchant_id}")
async def update_merchant(
    merchant_id: str,
    body: UpdateMerchant,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*REVIEW_ROLES)),
) -> Dict:
    """Update a business profile.

    Status is deliberately not settable here — it moves only through
    `/status`, so every transition carries a decision and a log row.
    """
    try:
        org = get_or_create_organization(db)
        m = db.query(Merchant).filter(
            Merchant.id == merchant_id,
            Merchant.organization_id == org.id,
            Merchant.deleted_at.is_(None),
        ).first()
        if not m:
            raise HTTPException(status_code=404, detail="Business not found.")

        changes = body.model_dump(exclude_none=True)
        changed = []
        for field, value in changes.items():
            if field in ("lat", "lng"):
                value = Decimal(str(value))
            if getattr(m, field) != value:
                setattr(m, field, value)
                changed.append(field)

        if changed:
            m.updated_at = datetime.utcnow()
            db.commit()
            log_status_change(
                db, MerchantStatusLog, org.id, "merchant_id", m.id,
                from_status=m.status, to_status=m.status,
                note=f"Profile updated ({', '.join(sorted(changed))}) by "
                     f"{actor.display_name}.",
            )
            db.commit()

        return _merchant_row(m, _type_labels(db, org.id, "region"),
                             _type_labels(db, org.id, "constituency"))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating merchant {merchant_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/merchants/{merchant_id}")
async def close_merchant(
    merchant_id: str,
    note: str = Query(min_length=1),
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*REVIEW_ROLES)),
) -> Dict:
    """Close a business. Soft delete, and the reason is required.

    Its devices are released rather than left pointing at a business that no
    longer trades — a device still assigned to a closed business would show
    up in coverage figures as active reach that does not exist.
    """
    try:
        org = get_or_create_organization(db)
        m = db.query(Merchant).filter(
            Merchant.id == merchant_id,
            Merchant.organization_id == org.id,
            Merchant.deleted_at.is_(None),
        ).first()
        if not m:
            raise HTTPException(status_code=404, detail="Business not found.")

        previous = m.status
        m.status = "closed"
        m.deleted_at = datetime.utcnow()
        m.updated_at = datetime.utcnow()

        released = db.query(Device).filter(
            Device.organization_id == org.id,
            Device.merchant_id == m.id,
            Device.deleted_at.is_(None),
        ).all()
        for d in released:
            d.merchant_id = None
        db.commit()

        log_status_change(
            db, MerchantStatusLog, org.id, "merchant_id", m.id,
            from_status=previous, to_status="closed",
            note=f"{note} Closed by {actor.display_name}."
                 + (f" {len(released)} device(s) released." if released else ""),
        )
        for d in released:
            log_status_change(
                db, DeviceStatusLog, org.id, "device_id", d.id,
                from_status=d.status, to_status=d.status,
                note=f"Unassigned: {m.trading_name or m.legal_name} was closed.",
            )
        db.commit()
        return {"id": str(m.id), "status": "closed", "devicesReleased": len(released)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error closing merchant {merchant_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


class CreateBeneficialOwner(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    id_number: str = Field(min_length=1, max_length=64)
    ownership_percent: float = Field(ge=0, le=100)
    is_pep: bool = False


@router.post("/merchants/{merchant_id}/beneficial-owners", status_code=201)
async def add_beneficial_owner(
    merchant_id: str,
    body: CreateBeneficialOwner,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*REVIEW_ROLES)),
) -> Dict:
    """Record a beneficial owner.

    The identifier is written and never read back — the response, like every
    other, returns `hasIdOnFile` rather than the number. Combined ownership
    above 100% is rejected: it means one of the figures is wrong, and an
    ownership record that does not add up is not a record.
    """
    try:
        org = get_or_create_organization(db)
        m = db.query(Merchant).filter(
            Merchant.id == merchant_id,
            Merchant.organization_id == org.id,
            Merchant.deleted_at.is_(None),
        ).first()
        if not m:
            raise HTTPException(status_code=404, detail="Business not found.")

        existing = db.query(MerchantBeneficialOwner).filter(
            MerchantBeneficialOwner.organization_id == org.id,
            MerchantBeneficialOwner.merchant_id == m.id,
            MerchantBeneficialOwner.deleted_at.is_(None),
        ).all()
        total = sum(float(o.ownership_percent or 0) for o in existing) + body.ownership_percent
        if total > 100.0:
            raise HTTPException(
                status_code=400,
                detail=f"Combined ownership would be {total:.1f}%. Recorded owners "
                       f"already hold {total - body.ownership_percent:.1f}%.",
            )

        owner = MerchantBeneficialOwner(
            id=uuid.uuid4(),
            organization_id=org.id,
            merchant_id=m.id,
            full_name=body.full_name,
            id_number=body.id_number,
            ownership_percent=Decimal(str(body.ownership_percent)),
            is_pep=body.is_pep,
            verified_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.add(owner)
        db.commit()
        log_status_change(
            db, MerchantStatusLog, org.id, "merchant_id", m.id,
            from_status=m.status, to_status=m.status,
            note=f"Beneficial owner recorded ({body.ownership_percent:g}%) by "
                 f"{actor.display_name}."
                 + (" Flagged politically exposed." if body.is_pep else ""),
        )
        db.commit()
        return {
            "id": str(owner.id),
            "fullName": owner.full_name,
            "ownershipPercent": float(owner.ownership_percent),
            "isPep": bool(owner.is_pep),
            "hasIdOnFile": True,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding beneficial owner: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/merchants/{merchant_id}/beneficial-owners/{owner_id}")
async def remove_beneficial_owner(
    merchant_id: str,
    owner_id: str,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*REVIEW_ROLES)),
) -> Dict:
    """Remove an owner record. Soft delete: ownership history is evidence."""
    try:
        org = get_or_create_organization(db)
        owner = db.query(MerchantBeneficialOwner).filter(
            MerchantBeneficialOwner.id == owner_id,
            MerchantBeneficialOwner.merchant_id == merchant_id,
            MerchantBeneficialOwner.organization_id == org.id,
            MerchantBeneficialOwner.deleted_at.is_(None),
        ).first()
        if not owner:
            raise HTTPException(status_code=404, detail="Owner record not found.")

        owner.deleted_at = datetime.utcnow()
        db.commit()
        log_status_change(
            db, MerchantStatusLog, org.id, "merchant_id", owner.merchant_id,
            from_status=None, to_status="owner_removed",
            note=f"Beneficial owner record removed by {actor.display_name}.",
        )
        db.commit()
        return {"id": str(owner.id), "removed": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing beneficial owner: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/type-definitions/{domain}")
async def list_type_definitions(domain: str, db: Session = Depends(get_db)) -> Dict:
    """The configured values for one taxonomy.

    The console reads its status options from here rather than hardcoding
    them. That is the whole point of keeping taxonomies in configuration: a
    UI with its own copy of the list will offer a value the API rejects the
    moment the two drift, which is exactly what happened with a "faulty"
    device status that existed only in the interface.
    """
    try:
        org = get_or_create_organization(db)
        rows = db.query(TypeDefinition).filter(
            TypeDefinition.organization_id == org.id,
            TypeDefinition.domain == domain,
            TypeDefinition.is_active.is_(True),
        ).order_by(TypeDefinition.sort_order).all()
        return {
            "domain": domain,
            "values": [{
                "code": r.code,
                "label": r.label,
                "config": r.config or {},
            } for r in rows],
        }
    except Exception as e:
        logger.error(f"Error loading type definitions for {domain}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
