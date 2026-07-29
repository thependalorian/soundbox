from fastapi import FastAPI
from app.api import (
    analytics,
    devices,
    oversight,
    payments,
    reports,
    resources,
    settings as settings_api,
)
from app.core.config import settings
from app.db.session import engine
from app.db.models import Base
import logging
from datetime import datetime

# Create database tables
try:
    Base.metadata.create_all(bind=engine)
except Exception:
    pass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="SoundBox API - Payment confirmation device for Namibia's Instant Payment Programme",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Include routers
app.include_router(devices.router, prefix=settings.API_V1_STR, tags=["devices"])
app.include_router(payments.router, prefix=settings.API_V1_STR, tags=["payments"])
app.include_router(analytics.router, prefix=settings.API_V1_STR, tags=["analytics"])
app.include_router(oversight.router, prefix=settings.API_V1_STR, tags=["oversight"])
app.include_router(reports.router, prefix=settings.API_V1_STR, tags=["reports"])
app.include_router(resources.router, prefix=settings.API_V1_STR, tags=["resources"])
app.include_router(settings_api.router, prefix=settings.API_V1_STR, tags=["settings"])

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up SoundBox API...")
    logger.info(f"Project: {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
    logger.info("Database tables created/verified")
    logger.info("API ready at http://localhost:8000")
    logger.info("API documentation at http://localhost:8000/docs")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down SoundBox API...")

@app.get("/", tags=["Root"])
async def read_root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.PROJECT_VERSION,
        "docs": "/docs",
        "api_base": settings.API_V1_STR
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
