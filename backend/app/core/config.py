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

    # Used for signing sessions/JWTs once auth (changelog Next Steps) lands.
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")

    WAYAME_API_BASE_URL: str = os.getenv("WAYAME_API_BASE_URL", "https://api.wayame.com.na/v1")
    WAYAME_CLIENT_ID: str = os.getenv("WAYAME_CLIENT_ID", "")
    WAYAME_CLIENT_SECRET: str = os.getenv("WAYAME_CLIENT_SECRET", "")

    # Powers the "Ask anything" analytics composer (app/services/ask_service.py).
    # Inert (endpoint returns a clear error) until a real key is set.
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()
