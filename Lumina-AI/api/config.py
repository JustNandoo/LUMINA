"""
Configuration Layer: Environment-aware Application Settings
Adheres to 12-Factor App principles using environment variables.
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(BASE_DIR, ".env"))


class BaseConfig:
    """Konfigurasi dasar aplikasi."""
    SECRET_KEY = os.getenv("SECRET_KEY", "lumina-enterprise-secret-key-2026-super-secure")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "lumina-jwt-secret-key-2026-secure-sign")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 86400))  # 24 Jam
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 604800))  # 7 Hari

    BASE_DIR = BASE_DIR
    DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
    MODEL_DIR = os.path.join(BASE_DIR, "models")
    REPORTS_DIR = os.path.join(BASE_DIR, "reports")
    MODEL_FILE_PATH = os.path.join(MODEL_DIR, "best_spatial_xgboost_model.json")

    # RESTX Swagger Settings
    RESTX_MASK_SWAGGER = False
    SWAGGER_UI_DOC_EXPANSION = "list"
    RESTX_VALIDATE = False
    RESTX_ERROR_404_HELP = False


class DevelopmentConfig(BaseConfig):
    """Konfigurasi untuk lingkungan pengembangan (Development)."""
    DEBUG = True
    TESTING = False


class ProductionConfig(BaseConfig):
    """Konfigurasi untuk lingkungan produksi (Production)."""
    DEBUG = False
    TESTING = False


class TestingConfig(BaseConfig):
    """Konfigurasi untuk automated testing."""
    DEBUG = True
    TESTING = True
    JWT_SECRET_KEY = "test-jwt-secret-key"


CONFIG_MAP = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig
}


def get_config(config_name: str = "default") -> BaseConfig:
    """Mengambil instance konfigurasi berdasarkan nama environment."""
    return CONFIG_MAP.get(config_name.lower(), DevelopmentConfig)
