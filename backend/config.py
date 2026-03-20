import os
from pathlib import Path
from typing import Type, Any
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()


def _resolve_database_uri(data_dir: Path) -> tuple[str, bool]:
    db_dir = data_dir / "db"
    neon_url = os.getenv("DATABASE_URL", "").strip()
    sqlite_url = f"sqlite:///{(db_dir / 'validator.db').as_posix()}"

    if not neon_url:
        return sqlite_url, True

    try:
        engine_kwargs: dict[str, Any] = {"pool_pre_ping": True}
        if neon_url.startswith("postgresql"):
            engine_kwargs["connect_args"] = {"connect_timeout": 3}

        engine = create_engine(neon_url, **engine_kwargs)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine.dispose()
        return neon_url, False
    except Exception as exc:
        print(f"DATABASE_URL unavailable, falling back to SQLite: {exc}")
        return sqlite_url, True

class Config:
    """Base configuration."""
    BASE_DIR = Path(__file__).resolve().parent
    DATA_DIR = BASE_DIR / "data"
    DB_DIR = DATA_DIR / "db"
    DOCUMENTS_DIR = DATA_DIR / "policies"
    BASELINES_DIR = DATA_DIR / "baselines"
    
    SQLALCHEMY_DATABASE_URI, DATABASE_FALLBACK_ACTIVE = _resolve_database_uri(DATA_DIR)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Auth and account approval settings
    JWT_SECRET = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "dev-jwt-secret-change-me"))
    JWT_EXP_HOURS = int(os.getenv("JWT_EXP_HOURS", "24"))
    APPROVAL_TOKEN_MAX_AGE_SECONDS = int(os.getenv("APPROVAL_TOKEN_MAX_AGE_SECONDS", str(7 * 24 * 3600)))
    SUPER_ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "serdar.karaman@outlook.be")
    BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:5000").rstrip("/")
    FRONTEND_LOGIN_URL = os.getenv("FRONTEND_LOGIN_URL", "http://localhost:3000/login")
    CORS_ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]

    # SMTP mail settings
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@llm-policy-validator.local")
    MAIL_PROVIDER = os.getenv("MAIL_PROVIDER", "smtp").strip().lower()
    RESEND_API_KEY = os.getenv("RESEND_API_KEY")
    RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", SMTP_FROM_EMAIL)
    RESEND_API_BASE_URL = os.getenv("RESEND_API_BASE_URL", "https://api.resend.com")
    
    # Ensure directories exist
    os.makedirs(DB_DIR, exist_ok=True)
    os.makedirs(DOCUMENTS_DIR, exist_ok=True)
    os.makedirs(BASELINES_DIR, exist_ok=True)
    
    # API Keys (Loaded from .env)
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    
    # Max upload size (32MB)
    MAX_CONTENT_LENGTH = 32 * 1024 * 1024

class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False

class TestingConfig(Config):
    DEBUG = True
    TESTING = True

config_map: dict[str, Type[Config]] = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig
}
