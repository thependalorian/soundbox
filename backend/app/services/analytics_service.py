import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import logging
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.db.helpers import get_or_create_organization
from app.db.models import AnalyticsEvent, Device, AnomalyAlert, Merchant, Transaction, TypeDefinition

logger = logging.getLogger(__name__)

class AnalyticsService:
    """Service for predictive analytics and reporting"""

    def __init__(self, db: Session):
        self.db = db
        self.organization = get_or_create_organization(db)

    def get_transaction_summary(self, days: int = 7) -> Dict:
        """Get transaction summary for the last N days"""
        try:
            org_id = self.organization.id
            start_date = datetime.utcnow() - timedelta(days=days)

            total_txns = self.db.query(Transaction).filter(
                Transaction.organization_id == org_id,
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= start_date
            ).count()

            total_volume = self.db.query(
                func.sum(Transaction.amount)
            ).filter(
                Transaction.organization_id == org_id,
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= start_date
            ).scalar() or 0

            active_devices = self.db.query(Device).filter(
                Device.organization_id == org_id,
                Device.status == "active"
            ).count()

            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_count = self.db.query(Transaction).filter(
                Transaction.organization_id == org_id,
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= today_start
            ).count()

            # Fraud rate, from the denormalized fast-read anomaly_score cache
            # on Transaction (authoritative history lives in anomaly_alerts)
            flagged_count = self.db.query(Transaction).filter(
                Transaction.organization_id == org_id,
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= start_date,
                Transaction.anomaly_score > 0.7
            ).count()
            flag_rate = (flagged_count / total_txns * 100) if total_txns > 0 else 0

            return {
                "activeDevices": active_devices,
                "todayCount": today_count,
                "totalVolume": round(float(total_volume), 2),
                "flagRate": round(flag_rate, 2),
                "totalTransactions": total_txns
            }
        except Exception as e:
            logger.error(f"Error getting transaction summary: {e}")
            return {}

    def get_transaction_trends(self, days: int = 7) -> List[Dict]:
        """Get transaction trends by day"""
        try:
            org_id = self.organization.id
            start_date = datetime.utcnow() - timedelta(days=days)

            day_bucket = func.date(Transaction.created_at)
            results = self.db.query(
                day_bucket.label("date"),
                func.count(Transaction.id).label("count"),
                func.sum(Transaction.amount).label("volume")
            ).filter(
                Transaction.organization_id == org_id,
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= start_date
            ).group_by(
                day_bucket
            ).order_by(
                day_bucket
            ).all()

            return [
                {
                    "date": str(r.date),
                    "count": r.count,
                    "volume": round(float(r.volume or 0), 2)
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error getting transaction trends: {e}")
            return []

    def get_anomaly_alerts(self, hours: int = 24) -> List[Dict]:
        """Get recent anomaly alerts"""
        try:
            start_time = datetime.utcnow() - timedelta(hours=hours)

            # Ordered by expected loss, not raw probability: a 40% alert on
            # N$50,000 carries more exposure than a 95% alert on N$500, so
            # it is the one an analyst should open first. Falls back to
            # probability x amount for rows written before expected_loss
            # was persisted.
            alerts = self.db.query(AnomalyAlert).filter(
                AnomalyAlert.organization_id == self.organization.id,
                AnomalyAlert.detected_at >= start_time
            ).all()

            def exposure(alert) -> float:
                if alert.expected_loss is not None:
                    return float(alert.expected_loss)
                return float(alert.anomaly_score) * float(alert.amount)

            alerts.sort(key=exposure, reverse=True)

            return [
                {
                    "id": str(alert.id),
                    "transactionId": str(alert.transaction_id) if alert.transaction_id else None,
                    "merchantId": str(alert.merchant_id),
                    "amount": float(alert.amount),
                    "riskLevel": alert.risk_level,
                    "anomalyScore": float(alert.anomaly_score),
                    "confidenceBand": (alert.risk_level or "").lower(),
                    "expectedLoss": round(exposure(alert), 2),
                    "reasons": (alert.explanation or {}).get("reasons", []),
                    "detectedAt": alert.detected_at.isoformat()
                }
                for alert in alerts
            ]
        except Exception as e:
            logger.error(f"Error getting anomaly alerts: {e}")
            return []

    def get_system_health(self) -> Dict:
        """Calculate payment system health index"""
        try:
            org_id = self.organization.id
            yesterday = datetime.utcnow() - timedelta(hours=24)

            total_txns = self.db.query(Transaction).filter(
                Transaction.organization_id == org_id,
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= yesterday
            ).count()
            successful_txns = self.db.query(Transaction).filter(
                Transaction.organization_id == org_id,
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= yesterday,
                Transaction.status == "success"
            ).count()
            success_rate = (successful_txns / total_txns * 100) if total_txns > 0 else 0

            total_devices = self.db.query(Device).filter(
                Device.organization_id == org_id,
                Device.status == "active"
            ).count()
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            online_devices = self.db.query(Device).filter(
                Device.organization_id == org_id,
                Device.status == "active",
                Device.last_heartbeat_at >= one_hour_ago
            ).count()
            device_availability = (online_devices / total_devices * 100) if total_devices > 0 else 0

            avg_latency = self.db.query(
                func.avg(Transaction.response_time_ms)
            ).filter(
                Transaction.organization_id == org_id,
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= yesterday,
                Transaction.response_time_ms.isnot(None)
            ).scalar() or 0

            flagged_txns = self.db.query(Transaction).filter(
                Transaction.organization_id == org_id,
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= yesterday,
                Transaction.anomaly_score > 0.7
            ).count()
            flag_rate = (flagged_txns / total_txns * 100) if total_txns > 0 else 0

            weights = {
                "transaction_success_rate": 0.25,
                "device_availability": 0.20,
                "response_latency": 0.15,
                "flag_rate": 0.20,
                "merchant_coverage": 0.10,
                "settlement_compliance": 0.10
            }

            success_score = min(success_rate / 100, 1.0)
            device_score = min(device_availability / 100, 1.0)
            latency_score = max(1 - (float(avg_latency) / 500), 0)  # 500ms threshold
            anomaly_score = max(1 - (flag_rate / 5), 0)  # 5% threshold

            health_score = (
                success_score * weights["transaction_success_rate"] +
                device_score * weights["device_availability"] +
                latency_score * weights["response_latency"] +
                anomaly_score * weights["flag_rate"]
            )

            if health_score >= 0.9:
                status = "HEALTHY"
            elif health_score >= 0.7:
                status = "MONITOR"
            elif health_score >= 0.5:
                status = "ATTENTION"
            else:
                status = "CRITICAL"

            return {
                "healthScore": round(health_score, 2),
                "status": status,
                "metrics": {
                    "transaction_success_rate": round(success_rate, 2),
                    "device_availability": round(device_availability, 2),
                    "response_latency": round(float(avg_latency), 2),
                    "flag_rate": round(flag_rate, 2)
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error calculating system health: {e}")
            return {}

    def get_geo_distribution(self) -> List[Dict]:
        """Merchant locations, region, and activity counts for map/heatmap
        rendering — the data layer behind docs/device.md's "Geographic
        Distribution" / "Merchant Activity Heatmaps" analytics pitch.
        Does not render a map itself; that's a frontend concern."""
        try:
            org_id = self.organization.id

            rows = self.db.query(
                Merchant.id,
                Merchant.merchant_code,
                Merchant.legal_name,
                Merchant.lat,
                Merchant.lng,
                TypeDefinition.code.label("region_code"),
                TypeDefinition.label.label("region_label"),
            ).outerjoin(
                TypeDefinition, TypeDefinition.id == Merchant.region_id
            ).filter(
                Merchant.organization_id == org_id,
                Merchant.deleted_at.is_(None),
            ).all()

            device_counts = {
                merchant_id: count
                for merchant_id, count in self.db.query(Device.merchant_id, func.count(Device.id))
                .filter(Device.organization_id == org_id)
                .group_by(Device.merchant_id)
                .all()
            }
            txn_counts = {
                merchant_id: count
                for merchant_id, count in self.db.query(Transaction.merchant_id, func.count(Transaction.id))
                .filter(Transaction.organization_id == org_id)
                .group_by(Transaction.merchant_id)
                .all()
            }

            # Risk exposure per merchant, so the map can weight by money at
            # risk rather than raw activity. Weighting a heatmap by
            # transaction count just reproduces a population map — Windhoek
            # glows because Windhoek is busy, which tells an analyst nothing.
            # Weighting by expected loss surfaces where the money is exposed,
            # which is the question oversight actually asks.
            exposure = {
                merchant_id: float(total or 0)
                for merchant_id, total in self.db.query(
                    AnomalyAlert.merchant_id, func.sum(AnomalyAlert.expected_loss)
                )
                .filter(
                    AnomalyAlert.organization_id == org_id,
                    AnomalyAlert.deleted_at.is_(None),
                )
                .group_by(AnomalyAlert.merchant_id)
                .all()
            }
            open_alerts = {
                merchant_id: count
                for merchant_id, count in self.db.query(
                    AnomalyAlert.merchant_id, func.count(AnomalyAlert.id)
                )
                .filter(
                    AnomalyAlert.organization_id == org_id,
                    AnomalyAlert.status.in_(["open", "under_review"]),
                    AnomalyAlert.deleted_at.is_(None),
                )
                .group_by(AnomalyAlert.merchant_id)
                .all()
            }

            return [
                {
                    "merchantId": str(r.id),
                    "merchantCode": r.merchant_code,
                    "legalName": r.legal_name,
                    "lat": float(r.lat) if r.lat is not None else None,
                    "lng": float(r.lng) if r.lng is not None else None,
                    "regionCode": r.region_code,
                    "regionLabel": r.region_label,
                    "deviceCount": device_counts.get(r.id, 0),
                    "transactionCount": txn_counts.get(r.id, 0),
                    "expectedLoss": round(exposure.get(r.id, 0.0), 2),
                    "openAlertCount": open_alerts.get(r.id, 0),
                }
                for r in rows
            ]
        except Exception as e:
            logger.error(f"Error getting geo distribution: {e}")
            return []

    def get_geo_breakdown(
        self,
        level: str = "region",
        parent_code: Optional[str] = None,
        payment_type: Optional[str] = None,
        payer_instrument: Optional[str] = None,
        days: Optional[int] = None,
    ) -> List[Dict]:
        """Activity aggregated at any geographic level, with filters.

        Namibia is 14 regions, 121 constituencies and 57 local authorities.
        National totals hide everything that matters at the bottom of that
        hierarchy — a region can look healthy while three of its
        constituencies have no activity at all — so every level is queryable
        rather than only the top one.

        `level`      : region | constituency | local_authority
        `parent_code`: restrict to children of one parent, for drill-down
        `days`       : rolling window; None means all history
        """
        try:
            org_id = self.organization.id

            level_column = {
                "region": Merchant.region_id,
                "constituency": Merchant.constituency_id,
                "local_authority": Merchant.local_authority_id,
            }.get(level)
            if level_column is None:
                logger.error(f"Unknown geo level: {level}")
                return []

            q = self.db.query(
                TypeDefinition.code.label("code"),
                TypeDefinition.label.label("label"),
                func.count(Transaction.id).label("txn_count"),
                func.coalesce(func.sum(Transaction.amount), 0).label("volume"),
                func.count(func.distinct(Merchant.id)).label("merchant_count"),
                func.sum(
                    case((Transaction.payer_instrument == "wallet", 1), else_=0)
                ).label("wallet_count"),
            ).select_from(Merchant).outerjoin(
                Transaction, Transaction.merchant_id == Merchant.id
            ).outerjoin(
                TypeDefinition, TypeDefinition.id == level_column
            ).filter(
                Merchant.organization_id == org_id,
                Merchant.deleted_at.is_(None),
            )

            if payment_type:
                q = q.filter(Transaction.payment_type == payment_type)
            if payer_instrument:
                q = q.filter(Transaction.payer_instrument == payer_instrument)
            if days:
                q = q.filter(Transaction.created_at >= datetime.utcnow() - timedelta(days=days))
            if parent_code:
                # config on a type_definition row carries its parent region,
                # which is how constituencies and local authorities were
                # seeded (see namibia_geography.py).
                q = q.filter(TypeDefinition.config["region_code"].astext == parent_code)

            rows = q.group_by(TypeDefinition.code, TypeDefinition.label).all()

            out = []
            for r in rows:
                txns = int(r.txn_count or 0)
                wallet = int(r.wallet_count or 0)
                out.append({
                    "level": level,
                    "code": r.code,
                    "label": r.label or "Unassigned",
                    "merchantCount": int(r.merchant_count or 0),
                    "transactionCount": txns,
                    "volume": round(float(r.volume or 0), 2),
                    "walletCount": wallet,
                    "walletShare": round((wallet / txns) * 100, 1) if txns else 0.0,
                })
            return sorted(out, key=lambda x: x["volume"], reverse=True)
        except Exception as e:
            logger.error(f"Error getting geo breakdown: {e}")
            return []

    def get_wallet_share(self) -> List[Dict]:
        """Wallet-funded versus bank-funded payments, by region.

        A payment funded from a mobile wallet usually means someone
        transacting without a bank account, which makes this the clearest
        financial-inclusion measure the platform can produce. Volume alone
        cannot show it — a busy region and an included region are different
        questions.

        Mirrors `fetchWalletShare` in frontend/src/api/api.ts so the mocked
        and real implementations cannot drift apart.
        """
        try:
            org_id = self.organization.id

            rows = self.db.query(
                TypeDefinition.label.label("region_label"),
                Transaction.payer_instrument,
                func.count(Transaction.id).label("count"),
            ).join(
                Merchant, Merchant.id == Transaction.merchant_id
            ).outerjoin(
                TypeDefinition, TypeDefinition.id == Merchant.region_id
            ).filter(
                Transaction.organization_id == org_id,
                Transaction.deleted_at.is_(None),
            ).group_by(
                TypeDefinition.label, Transaction.payer_instrument
            ).all()

            by_region: Dict[str, Dict[str, int]] = {}
            for r in rows:
                region = r.region_label or "Unknown"
                bucket = by_region.setdefault(region, {"wallet": 0, "bank": 0, "unknown": 0})
                if r.payer_instrument == "wallet":
                    bucket["wallet"] += r.count
                elif r.payer_instrument == "bank_account":
                    bucket["bank"] += r.count
                else:
                    # Rails did not say. Counted separately rather than
                    # folded into "bank", which would overstate inclusion.
                    bucket["unknown"] += r.count

            result = []
            for region, v in by_region.items():
                known = v["wallet"] + v["bank"]
                result.append({
                    "region": region,
                    "wallet": v["wallet"],
                    "bank": v["bank"],
                    "unknown": v["unknown"],
                    "walletShare": round((v["wallet"] / known) * 100, 1) if known else 0.0,
                })
            return sorted(result, key=lambda r: r["walletShare"], reverse=True)
        except Exception as e:
            logger.error(f"Error getting wallet share: {e}")
            return []

    def queue_analytics_event(self, event_type: str, event_data: Dict):
        """Queue an analytics event for processing"""
        try:
            event = AnalyticsEvent(
                id=uuid.uuid4(),
                organization_id=self.organization.id,
                event_type=event_type,
                event_data=event_data,
            )
            self.db.add(event)
            self.db.commit()
            logger.info(f"Analytics event queued: {event_type}")
        except Exception as e:
            logger.error(f"Error queuing analytics event: {e}")
            self.db.rollback()
