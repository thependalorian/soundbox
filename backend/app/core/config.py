import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load backend/.env (gitignored — see .env.example for the template) before
# any os.getenv() calls below read it.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

_DB_HOST = os.getenv("DB_HOST", "localhost")
_DB_PORT = os.getenv("DB_PORT", "5432")
_DB_USER = os.getenv("DB_USER", "postgres")
_DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
_DB_NAME = os.getenv("DB_NAME", "soundbox")
_DB_SSLMODE = os.getenv("DB_SSLMODE", "")

# DATABASE_URL, if set directly (e.g. a hosted Postgres/Neon connection
# string), always wins. Otherwise it's built from the DB_* components below
# (used for local/dockerized Postgres where sslmode isn't needed).
_DEFAULT_DATABASE_URL = f"postgresql+psycopg2://{_DB_USER}:{_DB_PASSWORD}@{_DB_HOST}:{_DB_PORT}/{_DB_NAME}"
if _DB_SSLMODE:
    _DEFAULT_DATABASE_URL += f"?sslmode={_DB_SSLMODE}"


class Settings(BaseSettings):
    PROJECT_NAME: str = "SoundBox API"
    PROJECT_VERSION: str = "1.1.0"
    API_V1_STR: str = "/api/v1"

    DB_HOST: str = _DB_HOST
    DB_PORT: str = _DB_PORT
    DB_USER: str = _DB_USER
    DB_PASSWORD: str = _DB_PASSWORD
    DB_NAME: str = _DB_NAME
    DATABASE_URL: str = os.getenv("DATABASE_URL", _DEFAULT_DATABASE_URL)

    # Event broker. Publishing is best-effort: a broker outage must never
    # fail a payment, so EVENTS_ENABLED=false is a supported production
    # posture, not only a test convenience.
    RABBITMQ_URL: str = os.getenv(
        "RABBITMQ_URL", "amqp://guest:guest@localhost:5672/%2F"
    )
    EVENTS_ENABLED: bool = os.getenv("EVENTS_ENABLED", "true").lower() == "true"

    # Redis. A full URL, because a hosted instance carries credentials, a
    # port and sometimes TLS — none of which fit a host/port pair. Host and
    # port remain for the local docker-compose service.
    #
    # The value belongs in .env, never here and never in .env.example: this
    # file is committed.
    REDIS_URL: str = os.getenv("REDIS_URL", "")

    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))

    # Signs JWT session tokens (app/core/security.py).
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")

    # development | production. Gates the startup credential check below --
    # default DB/RabbitMQ credentials and an empty SECRET_KEY are fine on a
    # laptop and refused everywhere else.
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # First admin account, created once on a fresh database if both are set
    # (app/db/helpers.py ensure_bootstrap_admin). No default password.
    BOOTSTRAP_ADMIN_EMAIL: str = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "")
    BOOTSTRAP_ADMIN_PASSWORD: str = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "")

    # Comma-separated list of frontend origins allowed to call this API.
    CORS_ALLOWED_ORIGINS: str = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")

    # NAMQR Code Standards v5.0, Annexure I: fallback ECDSA P-256 public key
    # for verifying signed QR (tag 66) when the presenting merchant has no
    # key of its own (merchants.namqr_public_key_pem). Empty means only
    # merchant-specific keys are honored.
    NAMQR_ORG_PUBLIC_KEY_PEM: str = os.getenv("NAMQR_ORG_PUBLIC_KEY_PEM", "")
    NAMQR_REQUIRE_SIGNATURE: bool = os.getenv("NAMQR_REQUIRE_SIGNATURE", "false").lower() == "true"

    WAYAME_API_BASE_URL: str = os.getenv("WAYAME_API_BASE_URL", "https://api.wayame.com.na/v1")
    WAYAME_CLIENT_ID: str = os.getenv("WAYAME_CLIENT_ID", "")
    WAYAME_CLIENT_SECRET: str = os.getenv("WAYAME_CLIENT_SECRET", "")

    # Powers the "Ask anything" analytics composer (app/services/ask_service.py).
    # Inert (endpoint returns a clear error) until a real key is set.
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()


def assert_production_ready(s: "Settings") -> None:
    """Refuses to start in a shared environment with defaults that only
    make sense on a laptop. Raises RuntimeError (never a stub that logs and
    continues) so a misconfigured production deploy fails loudly at boot,
    not the first time it matters."""
    if s.ENVIRONMENT != "production":
        return

    problems = []
    if not s.SECRET_KEY:
        problems.append("SECRET_KEY is empty")
    if s.DB_PASSWORD == "postgres" and "neon.tech" not in (s.DATABASE_URL or ""):
        problems.append("DB_PASSWORD is still the default 'postgres'")
    if "guest:guest" in s.RABBITMQ_URL:
        problems.append("RABBITMQ_URL is still using the default guest:guest credentials")
    if problems:
        raise RuntimeError(
            "Refusing to start with ENVIRONMENT=production and: "
            + "; ".join(problems)
        )
