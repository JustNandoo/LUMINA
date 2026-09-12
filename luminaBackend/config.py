"""Konfigurasi aplikasi LUMINA backend."""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _bool(key: str, default: bool = False) -> bool:
    raw = os.getenv(key)
    if raw is None or raw == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _int(key: str, default: int) -> int:
    try:
        return int(os.getenv(key, default))
    except (TypeError, ValueError):
        return default


def _list(key: str, default: str = "") -> list[str]:
    raw = os.getenv(key, default) or ""
    return [item.strip() for item in raw.split(",") if item.strip()]


class BaseConfig:
    # ---------------------------------------------------------------- core
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JSON_SORT_KEYS = False
    PROPAGATE_EXCEPTIONS = True

    # ------------------------------------------------------------ database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", f"sqlite:///{BASE_DIR / 'lumina.db'}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    # ----------------------------------------------------------------- jwt
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=_int("JWT_ACCESS_MINUTES", 60))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=_int("JWT_REFRESH_DAYS", 30))
    JWT_ERROR_MESSAGE_KEY = "message"
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_TYPE = "Bearer"

    # ---------------------------------------------------------------- mail
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = _int("MAIL_PORT", 587)
    MAIL_USE_TLS = _bool("MAIL_USE_TLS", True)
    MAIL_USE_SSL = _bool("MAIL_USE_SSL", False)
    MAIL_USERNAME = os.getenv("MAIL_USERNAME") or None
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD") or None
    MAIL_SENDER_NAME = os.getenv("MAIL_SENDER_NAME", "LUMINA")
    MAIL_SENDER_EMAIL = (
        os.getenv("MAIL_SENDER_EMAIL") or MAIL_USERNAME or "no-reply@lumina.app"
    )
    MAIL_DEFAULT_SENDER = (MAIL_SENDER_NAME, MAIL_SENDER_EMAIL)
    MAIL_SUPPRESS_SEND = _bool("MAIL_SUPPRESS_SEND", False)
    MAIL_TIMEOUT = _int("MAIL_TIMEOUT", 20)
    # True = kirim email di background thread (request cepat, error tidak terlihat)
    MAIL_ASYNC = _bool("MAIL_ASYNC", False)
    # Kalau kredensial SMTP belum diisi -> email tidak dikirim, tapi
    # di-render ke console + folder .mail_outbox/ supaya tetap bisa dites.
    MAIL_OUTBOX_DIR = BASE_DIR / ".mail_outbox"

    # ----------------------------------------------------------------- otp
    OTP_LENGTH = _int("OTP_LENGTH", 6)
    OTP_TTL_SECONDS = _int("OTP_TTL_SECONDS", 300)
    OTP_MAX_ATTEMPTS = _int("OTP_MAX_ATTEMPTS", 5)
    OTP_RESEND_COOLDOWN_SECONDS = _int("OTP_RESEND_COOLDOWN_SECONDS", 60)
    OTP_MAX_PER_HOUR = _int("OTP_MAX_PER_HOUR", 5)

    # ------------------------------------------------------------ password
    PASSWORD_MIN_LENGTH = _int("PASSWORD_MIN_LENGTH", 8)
    PASSWORD_RESET_TTL_SECONDS = _int("PASSWORD_RESET_TTL_SECONDS", 900)

    # ------------------------------------------------------------ frontend
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    FRONTEND_RESET_PATH = os.getenv("FRONTEND_RESET_PATH", "/reset-password")
    CORS_ORIGINS = _list("CORS_ORIGINS", "*")

    # -------------------------------------------------------------- google
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID") or None

    # ------------------------------------------------------------------ ai
    # Asisten AI (F6). Tanpa API key, endpoint asisten tetap hidup dan
    # menjawab dengan narasi yang dirakit langsung dari indeks (REQ-F6-04).
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY") or None
    AI_MODEL = os.getenv("AI_MODEL", "claude-opus-5")
    AI_EFFORT = os.getenv("AI_EFFORT", "low")
    AI_MAX_TOKENS = _int("AI_MAX_TOKENS", 16000)
    AI_TIMEOUT_SECONDS = _int("AI_TIMEOUT_SECONDS", 30)

    # ----------------------------------------------------------- app-brand
    APP_NAME = "LUMINA"
    APP_TAGLINE = "Simpan perjalananmu dengan LUMINA"
    SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "support@lumina.app")

    ENABLE_EMAIL_PREVIEW = _bool("ENABLE_EMAIL_PREVIEW", True)


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    MAIL_SUPPRESS_SEND = True
    OTP_RESEND_COOLDOWN_SECONDS = 0


class ProductionConfig(BaseConfig):
    DEBUG = False
    ENABLE_EMAIL_PREVIEW = False


CONFIG_MAP = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(name: str | None = None):
    key = (name or os.getenv("FLASK_ENV") or "development").lower()
    return CONFIG_MAP.get(key, DevelopmentConfig)
