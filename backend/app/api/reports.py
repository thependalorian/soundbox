from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from datetime import datetime

from app.db.session import get_db
from app.services.regulatory_reporting import RegulatoryReportingEngine

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/psd-6")
async def generate_psd6_report(month: int, year: int, db: Session = Depends(get_db)):
    """
    Generate PSD-6 Payment System Operator Return report
    Required by Bank of Namibia
    """
    try:
        if month < 1 or month > 12:
            raise HTTPException(status_code=400, detail="Invalid month. Must be between 1 and 12.")
        
        if year < 2020 or year > datetime.utcnow().year:
            raise HTTPException(status_code=400, detail="Invalid year.")
        
        engine = RegulatoryReportingEngine(db)
        report = engine.generate_psd6_report(month, year)
        
        if not report:
            raise HTTPException(status_code=500, detail="Failed to generate PSD-6 report")
        
        return report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating PSD-6 report: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/psd-3")
async def generate_psd3_report(db: Session = Depends(get_db)):
    """
    Generate PSD-3 E-Money Issuer Report
    Required by Bank of Namibia
    """
    try:
        engine = RegulatoryReportingEngine(db)
        report = engine.generate_psd3_report()
        
        if not report:
            raise HTTPException(status_code=500, detail="Failed to generate PSD-3 report")
        
        return report
    except Exception as e:
        logger.error(f"Error generating PSD-3 report: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/flag-trends")
async def generate_flag_trend_report(months: int = 12, db: Session = Depends(get_db)):
    """What is being flagged, by month."""
    try:
        if months < 1 or months > 36:
            raise HTTPException(status_code=400, detail="Months must be between 1 and 36")
        
        engine = RegulatoryReportingEngine(db)
        report = engine.generate_flag_trend_report(months=months)
        
        if not report:
            raise HTTPException(status_code=500, detail="Failed to generate flag trend report")
        
        return report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating flag trend report: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/system-health-report")
async def generate_system_health_report(db: Session = Depends(get_db)):
    """The regulatory system-health return.

    Distinct from `/system-health` in the analytics router, which is the live
    operational index the dashboard reads. Both existed on the same path
    until now, so this one — the filing — was shadowed and unreachable.
    """
    try:
        engine = RegulatoryReportingEngine(db)
        report = engine.generate_payment_system_health_report()
        
        if not report:
            raise HTTPException(status_code=500, detail="Failed to generate system health report")
        
        return report
    except Exception as e:
        logger.error(f"Error generating system health report: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
