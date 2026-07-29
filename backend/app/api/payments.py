import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Dict, Optional

from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePublicKey
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import logging

from app.api.deps import get_authenticated_device
from app.core.config import settings
from app.services.wayame_api_client import WayaMeAPIClient, get_wayame_api_client
from app.services.namqr_processor import NAMQRProcessor, SIGNATURE_TAG
from app.db.session import get_db
from app.events import contracts, publisher
from app.db.helpers import get_or_create_merchant, get_or_create_organization, log_status_change
from app.db.models import Device, Merchant, Transaction, TransactionStatusLog

router = APIRouter()
logger = logging.getLogger(__name__)


def _resolve_namqr_public_key(db: Session, tags: Dict[str, str]) -> Optional[EllipticCurvePublicKey]:
    """NAMQR Standards S1.7.2: 'List VAE is having the merchant entry and
    having Signature key, then the key will be used for validating QR' /
    'No entry in List VAE, use parent key ... (non-verified merchant)'.

    Tag 03 (Merchant Id) resolves to this deployment's Merchant record; its
    uploaded key wins. Falling back to the org-wide key stands in for the
    full VAE/ListKeys registry this single-tenant deployment doesn't run.
    """
    merchant_id_tag = tags.get("03")
    if merchant_id_tag:
        merchant = (
            db.query(Merchant)
            .filter(Merchant.merchant_code == merchant_id_tag, Merchant.deleted_at.is_(None))
            .first()
        )
        if merchant and merchant.namqr_public_key_pem:
            try:
                return NAMQRProcessor.load_public_key(merchant.namqr_public_key_pem)
            except Exception:
                logger.error(f"Malformed NAMQR public key on file for merchant {merchant_id_tag}")

    if settings.NAMQR_ORG_PUBLIC_KEY_PEM:
        try:
            return NAMQRProcessor.load_public_key(settings.NAMQR_ORG_PUBLIC_KEY_PEM)
        except Exception:
            logger.error("Malformed NAMQR_ORG_PUBLIC_KEY_PEM in configuration.")

    return None

class PaymentVerificationRequest(BaseModel):
    transaction_id: str
    amount: str
    merchant_id: str

class QrCode(BaseModel):
    data: str

@router.post("/payments/verify")
async def verify_payment(
    request: PaymentVerificationRequest,
    db: Session = Depends(get_db),
    device: Device = Depends(get_authenticated_device),
    wayame_client: WayaMeAPIClient = Depends(get_wayame_api_client)
):
    """
    Verify a payment status with the WayaMe platform and persist the
    result as a Transaction row (upsert by transaction_ref, with a
    transaction_status_log entry for the audit trail).
    """
    logger.info(f"Verifying payment: {request.transaction_id}")

    is_valid, payment_data = await wayame_client.verify_payment(
        transaction_id=request.transaction_id,
        amount=request.amount,
        merchant_id=request.merchant_id
    )

    if not is_valid:
        # Announced differently by the device: a failure is spoken twice,
        # being the outcome a seller must not miss.
        publisher.publish(contracts.payment_failed(
            organization_id=str(get_or_create_organization(db).id),
            transaction_ref=request.transaction_id,
            merchant_id=request.merchant_id,
            amount=float(request.amount or 0),
            currency_code="NAD",
            reason="Not found on the rails, or details did not match.",
        ))
        raise HTTPException(status_code=404, detail="Payment not found or details do not match.")

    try:
        amount = Decimal(request.amount)
    except InvalidOperation:
        amount = Decimal("0")

    organization = get_or_create_organization(db)
    merchant = get_or_create_merchant(db, organization.id, request.merchant_id)

    transaction = db.query(Transaction).filter(
        Transaction.transaction_ref == request.transaction_id
    ).first()

    if transaction is None:
        transaction = Transaction(
            id=uuid.uuid4(),
            organization_id=organization.id,
            merchant_id=merchant.id,
            transaction_ref=request.transaction_id,
            amount=amount,
            payment_type=(payment_data or {}).get("payment_type", "p2b"),
            # Wallet or bank. Recorded because wallet-funded share is the
            # financial-inclusion measure the oversight side reports on;
            # left null rather than guessed when the rails do not say.
            payer_instrument=(payment_data or {}).get("payer_instrument"),
            status="verified",
            verified_at=datetime.utcnow(),
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        log_status_change(
            db, TransactionStatusLog, organization.id, "transaction_id", transaction.id,
            from_status="pending", to_status="verified", note="Verified via WayaMe API.",
        )
        db.commit()
    else:
        previous_status = transaction.status
        transaction.status = "verified"
        transaction.verified_at = datetime.utcnow()
        log_status_change(
            db, TransactionStatusLog, organization.id, "transaction_id", transaction.id,
            from_status=previous_status, to_status="verified", note="Re-verified via WayaMe API.",
        )
        db.commit()

    # Published after the row is committed, never before. An event describing
    # a payment that did not persist would have a consumer announcing money
    # that is not there — the one failure this product cannot have.
    #
    # Best-effort by design: if the broker is down this returns False and the
    # payment still succeeds. Postgres is the system of record; a lost event
    # costs a notification, not the truth.
    publisher.publish(contracts.payment_verified(
        organization_id=str(organization.id),
        transaction_id=str(transaction.id),
        transaction_ref=transaction.transaction_ref,
        merchant_id=str(transaction.merchant_id),
        amount=float(transaction.amount or 0),
        currency_code=transaction.currency_code or "NAD",
        payment_type=transaction.payment_type,
        device_id=str(transaction.device_id) if transaction.device_id else None,
        # The masked alias only. The box announces an amount; nothing
        # downstream needs to know who paid.
        payer_alias=(transaction.payer_info or {}).get("alias"),
    ))

    return {"status": "success", "payment_data": payment_data}

@router.post("/payments/process_qr")
async def process_qr_code(
    qr_code: QrCode,
    db: Session = Depends(get_db),
    device: Device = Depends(get_authenticated_device),
):
    """
    Parses, CRC-checks, and -- per NAMQR Code Standards v5.0 Annexure I --
    ECDSA-verifies a NAMQR code's signature (tag 66) when present.
    """
    logger.info("Processing QR code.")
    processor = NAMQRProcessor()

    try:
        is_valid_crc = processor.validate_crc(qr_code.data)
        if not is_valid_crc:
            raise HTTPException(status_code=400, detail="Invalid QR code CRC.")

        tags = processor.parse_payload(qr_code.data)
        token_id = processor.extract_token_vault_id(tags)

        signed = SIGNATURE_TAG in tags
        signature_valid: Optional[bool] = None

        if signed:
            public_key = _resolve_namqr_public_key(db, tags)
            if public_key is None:
                logger.warning(
                    "Signed NAMQR received but no verification key is on file "
                    "(merchant tag %s); treating as unverifiable.", tags.get("03")
                )
                signature_valid = False
            else:
                signature_valid = processor.verify_signature(qr_code.data, tags, public_key)

            if not signature_valid:
                # NAMQR Standards S1.7.7(b): tampered/corrupt signature -> decline.
                raise HTTPException(status_code=400, detail="QR is tampered or corrupt.")
        elif settings.NAMQR_REQUIRE_SIGNATURE:
            raise HTTPException(status_code=400, detail="Unsigned QR codes are not accepted on this deployment.")
        # else: NAMQR Standards S1.7.7(c) -- unsigned is a warning, not a
        # rejection. `signed: false` in the response is that warning; the
        # caller (device/app) decides whether to proceed.

        return {
            "status": "success",
            "message": "QR Code is valid.",
            "tags": tags,
            "token_vault_id": token_id,
            "signed": signed,
            "signature_valid": signature_valid,
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing QR code: {e}")
        raise HTTPException(status_code=500, detail="Failed to process QR code.")
