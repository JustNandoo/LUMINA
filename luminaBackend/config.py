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


def _secret(key: str) -> str | None:
    """Kredensial dari .env, dibersihkan dari spasi dan tanda kutip.

    Google menampilkan app password sebagai empat blok berspasi ("abcd efgh
    ijkl mnop") sedangkan SMTP hanya menerima 16 karakter rapat. Menyalin apa
    adanya dari layar Google adalah hal yang wajar, jadi spasinya dibuang di
    sini ketimbang menyalahkan pengguna lewat error 535 yang tidak menjelaskan
    apa pun.
    """
    raw = (os.getenv(key) or "").strip().strip("\"'")
    cleaned = "".join(raw.split())
    return cleaned or None


def _database_url() -> str:
    """DATABASE_URL yang siap dipakai SQLAlchemy.

    Neon (lewat Vercel) memberi skema `postgres://` atau `postgresql://`, yang
    oleh SQLAlchemy dibaca sebagai driver psycopg2 — driver itu tidak dipasang.
    Skemanya diarahkan ke `postgresql+psycopg://` supaya memakai psycopg 3.
    """
    url = (os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or "").strip()
    if not url:
        return f"sqlite:///{BASE_DIR / 'lumina.db'}"
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def _list(key: str, default: str = "") -> list[str]:
    raw = os.getenv(key, default) or ""
    return [item.strip() for item in raw.split(",") if item.strip()]


class BaseConfig:
    # ---------------------------------------------------------------- core
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JSON_SORT_KEYS = False
    PROPAGATE_EXCEPTIONS = True

    # ------------------------------------------------------------ database
    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Neon memutus koneksi yang lama menganggur; koneksi didaur ulang sebelum itu
    # terjadi, dan pre_ping membuang yang sudah terputus sebelum dipakai.
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}

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
    MAIL_USERNAME = _secret("MAIL_USERNAME")
    MAIL_PASSWORD = _secret("MAIL_PASSWORD")
    MAIL_SENDER_NAME = os.getenv("MAIL_SENDER_NAME", "LUMINA")
    MAIL_SENDER_EMAIL = (
        os.getenv("MAIL_SENDER_EMAIL") or MAIL_USERNAME or "no-reply@lumina.app"
    )
    MAIL_DEFAULT_SENDER = (MAIL_SENDER_NAME, MAIL_SENDER_EMAIL)
    MAIL_SUPPRESS_SEND = _bool("MAIL_SUPPRESS_SEND", False)
    # Flask-Mail menyalakan debug SMTP mengikuti app.debug, dan percakapan
    # SMTP itu memuat baris "AUTH PLAIN <base64>" — app password lengkap,
    # tersimpan apa adanya di log. Dimatikan eksplisit: kredensial tidak boleh
    # ikut tertulis hanya karena aplikasinya berjalan dalam mode debug.
    MAIL_DEBUG = _bool("MAIL_DEBUG", False)
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
    OTP_RESEND_COOLDOWN_SECONDS = _int("OTP_RESEND_COOLDOWN_SECONDS", 30)
    OTP_MAX_PER_HOUR = _int("OTP_MAX_PER_HOUR", 5)

    # ------------------------------------------------------------ password
    PASSWORD_MIN_LENGTH = _int("PASSWORD_MIN_LENGTH", 8)
    PASSWORD_RESET_TTL_SECONDS = _int("PASSWORD_RESET_TTL_SECONDS", 900)

    # ------------------------------------------------------------ frontend
    # Di Vercel halaman dan API satu domain: tanpa FRONTEND_URL, link reset di
    # email memakai domain produksi project itu sendiri.
    FRONTEND_URL = (
        os.getenv("FRONTEND_URL")
        or (
            f"https://{os.getenv('VERCEL_PROJECT_PRODUCTION_URL')}"
            if os.getenv("VERCEL_PROJECT_PRODUCTION_URL")
            else "http://localhost:5173"
        )
    ).rstrip("/")
    FRONTEND_RESET_PATH = os.getenv("FRONTEND_RESET_PATH", "/reset-password")
    CORS_ORIGINS = _list("CORS_ORIGINS", "*")

    # -------------------------------------------------------------- google
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID") or None

    # ------------------------------------------------------------------ ai
    # Asisten AI (F6). Tanpa API key, endpoint asisten tetap hidup dan
    # menjawab dengan narasi yang dirakit langsung dari indeks (REQ-F6-04).
    GEMINI_API_KEY = _secret("GEMINI_API_KEY")
    AI_MODEL = os.getenv("AI_MODEL", "gemini-3.8-flash")
    # minimal | low | medium | high — kosongkan untuk memakai bawaan model
    AI_THINKING_LEVEL = os.getenv("AI_THINKING_LEVEL", "low")
    AI_MAX_TOKENS = _int("AI_MAX_TOKENS", 16000)
    # Batas waktu keras satu jawaban; lewat dari ini asisten menjawab dari indeks.
    AI_TIMEOUT_SECONDS = _int("AI_TIMEOUT_SECONDS", 15)

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
    # Vercel selalu menyetel VERCEL=1. Di sana production dipilih otomatis, supaya
    # lupa mengisi FLASK_ENV tidak menjalankan server dalam mode debug — mode
    # yang ikut menampilkan kode OTP di respons saat email gagal terkirim.
    default = "production" if os.getenv("VERCEL") else "development"
    key = (name or os.getenv("FLASK_ENV") or default).lower()
    return CONFIG_MAP.get(key, DevelopmentConfig)
