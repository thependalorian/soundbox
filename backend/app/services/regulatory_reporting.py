import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional

import logging
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.db.helpers import get_or_create_organization
from app.db.models import (
    Device,
    EMoneyWallet,
    AnomalyAlert,
    RegulatoryReport,
    Settlement,
    Transaction,
    TrustAccountReconciliation,
)

logger = logging.getLogger(__name__)


class RegulatoryReportingEngine:
    """Engine for generating regulatory reports (PSD-6, PSD-3, etc.)

    Every generated report is persisted as a `RegulatoryReport` row, giving
    PSD-6/PSD-3 filings the audit trail that a purely ephemeral JSON
    response can't provide.
    """

    def __init__(self, db: Session, organization_id: Optional[uuid.UUID] = None):
        self.db = db
        self.organization_id = organization_id or get_or_create_organization(db).id

    def _persist_report(
        self,
        report_type: str,
        payload: Dict,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
    ) -> None:
        try:
            self.db.add(
                RegulatoryReport(
                    id=uuid.uuid4(),
                    organization_id=self.organization_id,
                    report_type=report_type,
                    period_start=period_start,
                    period_end=period_end,
                    payload=payload,
                    generated_at=datetime.utcnow(),
                )
            )
            self.db.commit()
        except Exception as e:
            logger.error(f"Error persisting {report_type} report: {e}")
            self.db.rollback()

    def generate_psd6_report(self, month: int, year: int) -> Dict:
        """
        Generate Payment System Operator Return (PSD-6)
        Required by Bank of Namibia for payment service providers
        """
        try:
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1)
            else:
                end_date = datetime(year, month + 1, 1)

            # Transaction volumes by type
            volumes = self.db.query(
                Transaction.payment_type,
                func.count(Transaction.id).label("transaction_count"),
                func.sum(Transaction.amount).label("total_value"),
            ).filter(
                Transaction.organization_id == self.organization_id,
                Transaction.created_at >= start_date,
                Transaction.created_at < end_date,
            ).group_by(
                Transaction.payment_type
            ).all()

            # Settlement summary
            settlements = self.db.query(
                func.date(Settlement.settlement_date).label("date"),
                func.count(Settlement.id).label("settlement_count"),
                func.sum(Settlement.amount).label("settlement_value"),
            ).filter(
                Settlement.organization_id == self.organization_id,
                Settlement.settlement_date >= start_date,
                Settlement.settlement_date < end_date,
            ).group_by(
                func.date(Settlement.settlement_date)
            ).order_by(
                func.date(Settlement.settlement_date)
            ).all()

            # Device summary
            total_devices = self.db.query(Device).filter(
                Device.organization_id == self.organization_id,
                Device.registered_at < end_date,
            ).count()
            active_devices = self.db.query(Device).filter(
                Device.organization_id == self.organization_id,
                Device.registered_at < end_date,
                Device.status == "active",
            ).count()

            report = {
                "report_type": "PSD-6",
                "period": f"{month}/{year}",
                "generated_at": datetime.utcnow().isoformat(),
                "transaction_summary": {
                    "total_count": sum(v.transaction_count for v in volumes),
                    "total_value": float(sum(v.total_value or 0 for v in volumes)),
                    "by_type": [
                        {
                            "payment_type": v.payment_type,
                            "count": v.transaction_count,
                            "value": round(float(v.total_value or 0), 2),
                        }
                        for v in volumes
                    ],
                },
                "settlement_summary": {
                    "total_count": sum(s.settlement_count for s in settlements),
                    "total_value": float(sum(s.settlement_value or 0 for s in settlements)),
                    "daily": [
                        {
                            "date": str(s.date),
                            "count": s.settlement_count,
                            "value": round(float(s.settlement_value or 0), 2),
                        }
                        for s in settlements
                    ],
                },
                "device_summary": {
                    "total_devices": total_devices,
                    "active_devices": active_devices,
                },
            }
            self._persist_report("PSD-6", report, period_start=start_date, period_end=end_date)
            return report
        except Exception as e:
            logger.error(f"Error generating PSD-6 report: {e}")
            return {}

    def generate_psd3_report(self) -> Dict:
        """
        Generate E-Money Issuer Report (PSD-3)
        Required by Bank of Namibia for e-money compliance
        """
        try:
            wallets = self.db.query(
                func.count(EMoneyWallet.id).label("total_wallets"),
                func.sum(EMoneyWallet.balance).label("total_balance"),
                func.avg(EMoneyWallet.balance).label("avg_balance"),
            ).filter(
                EMoneyWallet.organization_id == self.organization_id,
            ).first()

            active_wallets = self.db.query(EMoneyWallet).filter(
                EMoneyWallet.organization_id == self.organization_id,
                EMoneyWallet.status == "active",
            ).count()

            # Dormant wallets (no transaction in 6 months)
            six_months_ago = datetime.utcnow() - timedelta(days=180)
            dormant_wallets = self.db.query(EMoneyWallet).filter(
                EMoneyWallet.organization_id == self.organization_id,
                EMoneyWallet.last_transaction_at < six_months_ago,
                EMoneyWallet.status == "active",
            ).count()

            # Trust account reconciliation
            trust_account = self.db.query(TrustAccountReconciliation).filter(
                TrustAccountReconciliation.organization_id == self.organization_id,
                TrustAccountReconciliation.reconciliation_date >= datetime.utcnow() - timedelta(days=30),
            ).order_by(
                TrustAccountReconciliation.reconciliation_date.desc()
            ).first()

            report = {
                "report_type": "PSD-3",
                "period": "CURRENT",
                "generated_at": datetime.utcnow().isoformat(),
                "wallet_summary": {
                    "total_wallets": wallets.total_wallets if wallets else 0,
                    "active_wallets": active_wallets,
                    "dormant_wallets": dormant_wallets,
                    "total_balance": round(float(wallets.total_balance or 0), 2) if wallets else 0,
                    "avg_balance": round(float(wallets.avg_balance or 0), 2) if wallets else 0,
                },
                "trust_account": {
                    "total_liabilities": round(float(trust_account.total_liabilities), 2),
                    "trust_account_balance": round(float(trust_account.trust_account_balance), 2),
                    "surplus": round(float(trust_account.surplus), 2),
                    "reconciliation_date": trust_account.reconciliation_date.isoformat(),
                } if trust_account else None,
            }
            self._persist_report("PSD-3", report)
            return report
        except Exception as e:
            logger.error(f"Error generating PSD-3 report: {e}")
            return {}

    def generate_flag_trend_report(self, months: int = 12) -> Dict:
        """Monthly view of what is being flagged, by signal."""
        try:
            start_date = datetime.utcnow() - timedelta(days=30 * months)

            month_bucket = func.date_trunc("month", AnomalyAlert.detected_at)
            trends = self.db.query(
                month_bucket.label("month"),
                func.count(AnomalyAlert.id).label("total_alerts"),
                func.sum(
                    case((AnomalyAlert.risk_level == "HIGH", 1), else_=0)
                ).label("high_risk_alerts"),
                func.avg(AnomalyAlert.anomaly_score).label("avg_probability"),
            ).filter(
                AnomalyAlert.organization_id == self.organization_id,
                AnomalyAlert.detected_at >= start_date,
            ).group_by(
                month_bucket
            ).order_by(
                month_bucket
            ).all()

            by_type = self.db.query(
                AnomalyAlert.signal_type,
                func.count(AnomalyAlert.id).label("count"),
                func.sum(AnomalyAlert.amount).label("total_value"),
            ).filter(
                AnomalyAlert.organization_id == self.organization_id,
                AnomalyAlert.detected_at >= start_date,
            ).group_by(
                AnomalyAlert.signal_type
            ).order_by(
                func.count(AnomalyAlert.id).desc()
            ).all()

            report = {
                "report_type": "FRAUD_TREND",
                "period": f"{months}_MONTHS",
                "generated_at": datetime.utcnow().isoformat(),
                "monthly_trends": [
                    {
                        "month": t.month.isoformat() if t.month else None,
                        "total_alerts": t.total_alerts,
                        "high_risk_alerts": int(t.high_risk_alerts or 0),
                        "avg_probability": round(float(t.avg_probability or 0), 2),
                    }
                    for t in trends
                ],
                "flagged_by_signal": [
                    {
                        "type": f.signal_type,
                        "count": f.count,
                        "value": round(float(f.total_value or 0), 2),
                    }
                    for f in by_type
                ],
            }
            self._persist_report("FRAUD_TREND", report, period_start=start_date, period_end=datetime.utcnow())
            return report
        except Exception as e:
            logger.error(f"Error generating flag trend report: {e}")
            return {}

    def generate_payment_system_health_report(self) -> Dict:
        """Generate payment system health report for regulators"""
        try:
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)

            total_txns = self.db.query(Transaction).filter(
                Transaction.organization_id == self.organization_id,
                Transaction.created_at >= thirty_days_ago,
            ).count()

            successful_txns = self.db.query(Transaction).filter(
                Transaction.organization_id == self.organization_id,
                Transaction.created_at >= thirty_days_ago,
                Transaction.status == "success",
            ).count()

            failed_txns = self.db.query(Transaction).filter(
                Transaction.organization_id == self.organization_id,
                Transaction.created_at >= thirty_days_ago,
                Transaction.status == "failed",
            ).count()

            total_devices = self.db.query(Device).filter(
                Device.organization_id == self.organization_id,
            ).count()
            active_devices = self.db.query(Device).filter(
                Device.organization_id == self.organization_id,
                Device.status == "active",
            ).count()

            anomaly_alerts = self.db.query(AnomalyAlert).filter(
                AnomalyAlert.organization_id == self.organization_id,
                AnomalyAlert.detected_at >= thirty_days_ago,
            ).count()

            high_risk_alerts = self.db.query(AnomalyAlert).filter(
                AnomalyAlert.organization_id == self.organization_id,
                AnomalyAlert.detected_at >= thirty_days_ago,
                AnomalyAlert.risk_level == "HIGH",
            ).count()

            report = {
                "report_type": "SYSTEM_HEALTH",
                "period": "30_DAYS",
                "generated_at": datetime.utcnow().isoformat(),
                "transaction_metrics": {
                    "total": total_txns,
                    "successful": successful_txns,
                    "failed": failed_txns,
                    "success_rate": round((successful_txns / total_txns * 100) if total_txns > 0 else 0, 2),
                },
                "device_metrics": {
                    "total": total_devices,
                    "active": active_devices,
                    "inactive": total_devices - active_devices,
                },
                "flag_metrics": {
                    "total_alerts": anomaly_alerts,
                    "high_risk_alerts": high_risk_alerts,
                    "alert_rate": round((anomaly_alerts / total_txns * 100) if total_txns > 0 else 0, 2),
                },
            }
            self._persist_report("SYSTEM_HEALTH", report, period_start=thirty_days_ago, period_end=datetime.utcnow())
            return report
        except Exception as e:
            logger.error(f"Error generating system health report: {e}")
            return {}
