"""The single place operational records are read from.

Three analytics services had each grown their own `_transactions(days)`,
`_regions()` and `_merchants()`. They looked identical and were not: one
filtered `deleted_at`, another did not; one anchored the window on
`utcnow()`, another on midnight. Metrics computed over subtly different
populations then appeared side by side in one return, which is the kind of
inconsistency that survives review precisely because every individual number
looks right.

This module owns those reads. Every caller gets the same window, the same
tenancy clause and the same soft-delete filter, or the difference is a
parameter someone had to pass deliberately.

Two rules it enforces on behalf of everything above it:

- **Tenancy on every query.** Not a convention here; there is no method that
  omits `organization_id`.
- **Soft deletes respected by default.** A withdrawn record must not
  reappear in a regulatory count. Including them requires asking.

It is a read layer only. Nothing here writes, so no caller can acquire write
access to payments by depending on it.
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Sequence

from sqlalchemy.orm import Session

from app.db.models import (
    AnomalyAlert,
    Device,
    Merchant,
    Transaction,
    TypeDefinition,
)

logger = logging.getLogger(__name__)


def window_start(days: int, anchor: Optional[datetime] = None) -> datetime:
    """The start of a rolling window.

    Anchored on midnight rather than the current instant. A "last 30 days"
    figure that shifts by the hour cannot be reproduced: run the same report
    twice in an afternoon and it returns two different answers, and neither
    is wrong, which makes the discrepancy impossible to explain.
    """
    base = anchor or datetime.utcnow()
    midnight = base.replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight - timedelta(days=days)


class PaymentRepository:
    """Read access to payments, businesses, devices and alerts."""

    def __init__(self, db: Session, organization_id):
        self.db = db
        self.organization_id = organization_id

    # -- transactions -----------------------------------------------------

    def transactions(
        self,
        days: int,
        merchant_id=None,
        anchor: Optional[datetime] = None,
        include_deleted: bool = False,
    ) -> List[Transaction]:
        """Payments inside a rolling window."""
        q = self.db.query(Transaction).filter(
            Transaction.organization_id == self.organization_id,
            Transaction.created_at >= window_start(days, anchor),
        )
        if not include_deleted:
            q = q.filter(Transaction.deleted_at.is_(None))
        if merchant_id:
            q = q.filter(Transaction.merchant_id == merchant_id)
        return q.all()

    def transactions_between(
        self, start: datetime, end: datetime, merchant_id=None
    ) -> List[Transaction]:
        """Payments in an explicit interval, for period-over-period work.

        Separate from `transactions` so a comparison is written as two
        explicit intervals rather than two windows that have to be reasoned
        about to see whether they overlap.
        """
        q = self.db.query(Transaction).filter(
            Transaction.organization_id == self.organization_id,
            Transaction.deleted_at.is_(None),
            Transaction.created_at >= start,
            Transaction.created_at < end,
        )
        if merchant_id:
            q = q.filter(Transaction.merchant_id == merchant_id)
        return q.all()

    def all_transactions(self, merchant_id=None) -> List[Transaction]:
        """Every payment, unwindowed. For first/last-seen questions only."""
        q = self.db.query(Transaction).filter(
            Transaction.organization_id == self.organization_id,
            Transaction.deleted_at.is_(None),
        )
        if merchant_id:
            q = q.filter(Transaction.merchant_id == merchant_id)
        return q.all()

    # -- businesses -------------------------------------------------------

    def merchants(self, status: Optional[str] = None) -> List[Merchant]:
        q = self.db.query(Merchant).filter(
            Merchant.organization_id == self.organization_id,
            Merchant.deleted_at.is_(None),
        )
        if status:
            q = q.filter(Merchant.status == status)
        return q.all()

    def merchant_display_names(self) -> Dict[str, str]:
        """Trading name where there is one, legal name otherwise.

        A market trader's registered legal name is often not what anyone
        calls the stall, and a person reading a list is looking for the
        latter.
        """
        return {
            str(m.id): (m.trading_name or m.legal_name)
            for m in self.merchants()
        }

    def merchant_regions(self) -> Dict[str, str]:
        """Business id to region id, for businesses that have one recorded."""
        return {
            str(m.id): str(m.region_id)
            for m in self.merchants()
            if m.region_id
        }

    def resolve_merchant(self, id_or_code: Optional[str]):
        """Accept the internal UUID or the human-readable merchant code.

        Returns None for an unknown value, so a caller filters on nothing
        rather than silently returning every business.
        """
        if not id_or_code:
            return None
        for m in self.merchants():
            if str(m.id) == str(id_or_code) or m.merchant_code == id_or_code:
                return m.id
        return None

    # -- devices ----------------------------------------------------------

    def devices(self, status: Optional[str] = None) -> List[Device]:
        q = self.db.query(Device).filter(
            Device.organization_id == self.organization_id,
            Device.deleted_at.is_(None),
        )
        if status:
            q = q.filter(Device.status == status)
        return q.all()

    # -- alerts -----------------------------------------------------------

    def alerts(self, days: Optional[int] = None, anchor: Optional[datetime] = None) -> List[AnomalyAlert]:
        q = self.db.query(AnomalyAlert).filter(
            AnomalyAlert.organization_id == self.organization_id,
            AnomalyAlert.deleted_at.is_(None),
        )
        if days is not None:
            q = q.filter(AnomalyAlert.detected_at >= window_start(days, anchor))
        return q.all()

    # -- taxonomies -------------------------------------------------------

    def type_definitions(self, domain: str) -> List[TypeDefinition]:
        return self.db.query(TypeDefinition).filter(
            TypeDefinition.organization_id == self.organization_id,
            TypeDefinition.domain == domain,
        ).order_by(TypeDefinition.sort_order).all()

    def regions(self) -> Dict[str, Dict]:
        """Region rows with their census denominators.

        Population lives in configuration rather than code, so a correction
        is an UPDATE. A region without one yields `None` here rather than
        zero — an absent denominator must not become an infinite rate.
        """
        return {
            str(r.id): {
                "code": r.code,
                "label": r.label,
                "population": (r.config or {}).get("population"),
                "adults": (r.config or {}).get("adults"),
            }
            for r in self.type_definitions("region")
        }

    def region_labels(self) -> Dict[str, str]:
        return {rid: meta["label"] for rid, meta in self.regions().items()}

    # -- shared aggregations ----------------------------------------------
    #
    # Grouping payments by day, by merchant or by type was written three
    # times over. Once here, so a metric and a forecast built on "daily
    # counts" are built on the same daily counts.

    def daily_counts(self, transactions: Sequence[Transaction]) -> Dict[str, int]:
        out: Dict[str, int] = defaultdict(int)
        for t in transactions:
            out[t.created_at.strftime("%Y-%m-%d")] += 1
        return dict(out)

    def daily_values(self, transactions: Sequence[Transaction]) -> Dict[str, float]:
        out: Dict[str, float] = defaultdict(float)
        for t in transactions:
            out[t.created_at.strftime("%Y-%m-%d")] += float(t.amount or 0)
        return dict(out)

    def value_by_merchant(self, transactions: Sequence[Transaction]) -> Dict[str, float]:
        out: Dict[str, float] = defaultdict(float)
        for t in transactions:
            out[str(t.merchant_id)] += float(t.amount or 0)
        return dict(out)

    def count_by_payment_type(self, transactions: Sequence[Transaction]) -> Dict[str, int]:
        out: Dict[str, int] = defaultdict(int)
        for t in transactions:
            out[t.payment_type or "unrecorded"] += 1
        return dict(out)
