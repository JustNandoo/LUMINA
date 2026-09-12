"""Blueprint /api — seluruh fitur di luar autentikasi.

Autentikasi tetap tinggal di `lumina.auth` dengan prefix /api/auth.
"""
from lumina.api.admin import admin_bp
from lumina.api.assistant import assistant_bp
from lumina.api.billing import billing_bp
from lumina.api.business import business_bp
from lumina.api.geo import geo_bp
from lumina.api.meta import meta_bp
from lumina.api.trips import trips_bp

API_BLUEPRINTS = (
    meta_bp,
    geo_bp,
    trips_bp,
    business_bp,
    assistant_bp,
    billing_bp,
    admin_bp,
)

__all__ = ["API_BLUEPRINTS"]
