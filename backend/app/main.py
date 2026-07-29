from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import (
    analytics,
    auth,
    devices,
    oversight,
    payments,
    reports,
    resources,
    settings as settings_api,
)
from app.core.config import assert_production_ready, settings
from app.core.limiter import limiter
from app.db.helpers import ensure_bootstrap_admin
from app.db.session import engine, SessionLocal
from app.db.models import Base
import logging
from datetime import datetime

# Refuses to start with laptop-only defaults (default DB/broker credentials,
# an empty SECRET_KEY) if ENVIRONMENT=production. A no-op locally.
assert_production_ready(settings)

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

# Rate limiting (app/core/limiter.py) -- decorated per-route (see
# app/api/auth.py's /auth/login) rather than a single global limit, since
# a login attempt and a device heartbeat warrant very different budgets.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: explicit allow-list from CORS_ALLOWED_ORIGINS, never a wildcard --
# this API now issues bearer tokens, and Access-Control-Allow-Origin: *
# combined with credentialed requests is exactly the misconfiguration that
# turns a same-site-only intent into a cross-site one.
_allowed_origins = [o.strip() for o in settings.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-User-Name", "X-Device-Code", "X-Device-Key"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Defense-in-depth headers on every API response. The frontend
    (nginx.conf / vercel.json) carries the equivalent for the served HTML;
    this covers the JSON API directly, including /docs."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


# Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR, tags=["auth"])
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

    db = SessionLocal()
    try:
        ensure_bootstrap_admin(db)
    finally:
        db.close()

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
