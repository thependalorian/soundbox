from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import (
    analytics,
    assistant,
    auth,
    devices,
    oversight,
    payments,
    reports,
    resources,
    settings as settings_api,
    users,
)
from app.api.deps import get_current_user
from app.core.config import assert_production_ready, settings
from app.core.limiter import limiter
from app.core.observability import configure_langfuse
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
# Routers carrying their own auth, or deliberately public.
#
#  - auth / users: /auth/login, /auth/forgot-password and /auth/reset-password
#    must be reachable by someone who cannot sign in. Everything else in those
#    modules is gated per-route.
#  - devices / payments: device-facing. They authenticate with a provisioned
#    device credential (X-Device-Code / X-Device-Key), not a user JWT, so a
#    user-token requirement here would lock out the hardware.
#  - assistant: gated to regulator and admin inside the module.
app.include_router(auth.router, prefix=settings.API_V1_STR, tags=["auth"])
app.include_router(assistant.router, prefix=settings.API_V1_STR, tags=["assistant"])
app.include_router(users.router, prefix=settings.API_V1_STR, tags=["users"])
app.include_router(devices.router, prefix=settings.API_V1_STR, tags=["devices"])
app.include_router(payments.router, prefix=settings.API_V1_STR, tags=["payments"])

# Operator-facing routers. **Authentication is required at the router level,
# not per handler.**
#
# It has to be here rather than on each endpoint. Thirty-four read endpoints
# were reachable with no token at all -- every payment, business, device,
# alert and settlement on the platform, plus the PSD-6 and PSD-3 returns.
# Every write was correctly gated, so the gap was invisible from the write
# side and from the console, which always sends a token.
#
# The cause is that a read is the easy thing to add: a new GET only needs
# `db: Session = Depends(get_db)` to work, so the omission never fails a test
# and never shows up in the UI. Requiring it once at the mount point means a
# new endpoint is protected by default and someone has to work to expose it,
# which is the only version of this that stays true.
_AUTHENTICATED = [Depends(get_current_user)]
app.include_router(analytics.router, prefix=settings.API_V1_STR, tags=["analytics"], dependencies=_AUTHENTICATED)
app.include_router(oversight.router, prefix=settings.API_V1_STR, tags=["oversight"], dependencies=_AUTHENTICATED)
app.include_router(reports.router, prefix=settings.API_V1_STR, tags=["reports"], dependencies=_AUTHENTICATED)
app.include_router(resources.router, prefix=settings.API_V1_STR, tags=["resources"], dependencies=_AUTHENTICATED)
app.include_router(settings_api.router, prefix=settings.API_V1_STR, tags=["settings"], dependencies=_AUTHENTICATED)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up SoundBox API...")
    logger.info(f"Project: {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
    logger.info("Database tables created/verified")

    # Optional. Absent Langfuse keys log once and change nothing else — an
    # observability dependency must never be able to take the API down.
    configure_langfuse()

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
