from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Dict
import logging

from app.db.session import get_db
from app.services.analytics_service import AnalyticsService
from app.services.ask_service import ask_analytics
from app.services.anomaly_scoring import AnomalyScoringEngine

router = APIRouter()
logger = logging.getLogger(__name__)


class AskRequest(BaseModel):
    question: str

@router.get("/system-health")
async def get_system_health(db: Session = Depends(get_db)):
    """Get payment system health index"""
    try:
        analytics = AnalyticsService(db)
        health = analytics.get_system_health()
        if not health:
            raise HTTPException(status_code=500, detail="Failed to calculate system health")
        return health
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/transaction-summary")
async def get_transaction_summary(days: int = 7, db: Session = Depends(get_db)):
    """Get transaction summary"""
    try:
        analytics = AnalyticsService(db)
        summary = analytics.get_transaction_summary(days=days)
        return summary
    except Exception as e:
        logger.error(f"Error getting transaction summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/transaction-trends")
async def get_transaction_trends(days: int = 7, db: Session = Depends(get_db)):
    """Get transaction trends by day"""
    try:
        analytics = AnalyticsService(db)
        trends = analytics.get_transaction_trends(days=days)
        return {"trends": trends}
    except Exception as e:
        logger.error(f"Error getting transaction trends: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/anomaly-alerts")
async def get_anomaly_alerts(hours: int = 24, db: Session = Depends(get_db)):
    """Get recent anomaly alerts"""
    try:
        analytics = AnalyticsService(db)
        alerts = analytics.get_anomaly_alerts(hours=hours)
        return {
            "alerts": alerts,
            "total": len(alerts),
            "time_range_hours": hours
        }
    except Exception as e:
        logger.error(f"Error getting anomaly alerts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/geo-distribution")
async def get_geo_distribution(db: Session = Depends(get_db)):
    """Merchant locations + activity counts for map/heatmap rendering."""
    try:
        analytics = AnalyticsService(db)
        locations = analytics.get_geo_distribution()
        return {"locations": locations, "total": len(locations)}
    except Exception as e:
        logger.error(f"Error getting geo distribution: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/geo-breakdown")
async def get_geo_breakdown(
    level: str = "region",
    parent_code: str = None,
    payment_type: str = None,
    payer_instrument: str = None,
    days: int = None,
    db: Session = Depends(get_db),
):
    """Activity at any geographic level, filtered.

    level: region | constituency | local_authority
    Supports drill-down via parent_code, and filtering by payment type,
    funding instrument and rolling window.
    """
    try:
        analytics = AnalyticsService(db)
        rows = analytics.get_geo_breakdown(
            level=level,
            parent_code=parent_code,
            payment_type=payment_type,
            payer_instrument=payer_instrument,
            days=days,
        )
        return {"level": level, "parentCode": parent_code, "rows": rows, "total": len(rows)}
    except Exception as e:
        logger.error(f"Error getting geo breakdown: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/wallet-share")
async def get_wallet_share(db: Session = Depends(get_db)):
    """Wallet vs bank funding by region — the financial-inclusion measure."""
    try:
        analytics = AnalyticsService(db)
        return {"regions": analytics.get_wallet_share()}
    except Exception as e:
        logger.error(f"Error getting wallet share: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/analytics/ask")
async def ask(request: AskRequest, db: Session = Depends(get_db)):
    """Natural-language analytics Q&A — routes the question through Claude's
    tool-calling loop over the existing analytics/reporting service methods.
    Never generates or executes arbitrary SQL."""
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")
    try:
        return ask_analytics(db, question)
    except RuntimeError as e:
        logger.error(f"Ask analytics not configured: {e}")
        raise HTTPException(status_code=503, detail="AI composer is not configured")
    except Exception as e:
        logger.error(f"Error answering analytics question: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/anomaly-score")
async def get_anomaly_score(transaction_data: Dict, db: Session = Depends(get_db)):
    """Score a transaction for anomaly"""
    try:
        engine = AnomalyScoringEngine(db)
        result = engine.predict(transaction_data)
        
        # Create alert if high risk, carrying the explanation through so the
        # persisted alert records why it was raised.
        if result["risk_level"] == "HIGH":
            engine.create_anomaly_alert(
                transaction_id=transaction_data.get("transaction_id"),
                merchant_id=transaction_data.get("merchant_id"),
                amount=transaction_data.get("amount", 0),
                anomaly_score=result["anomaly_score"],
                risk_level=result["risk_level"],
                reasons=result.get("reasons"),
            )
        
        return result
    except Exception as e:
        logger.error(f"Error getting anomaly score: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
