"""
DTO Schema: Authentication & Authorization Models for Swagger UI
"""

from flask_restx import Namespace, fields


def create_auth_models(ns: Namespace):
    """Mendefinisikan skema Swagger untuk endpoint autentikasi."""
    login_request = ns.model("LoginRequest", {
        "username": fields.String(
            required=True,
            description="Username pengguna (analyst / admin / developer)",
            example="analyst"
        ),
        "password": fields.String(
            required=True,
            description="Password pengguna (default: lumina2026)",
            example="lumina2026"
        )
    })

    user_info = ns.model("UserInfo", {
        "username": fields.String(description="Username", example="analyst"),
        "role": fields.String(description="Role pengguna", example="analyst"),
        "full_name": fields.String(description="Nama lengkap", example="TOD Spatial Analyst")
    })

    login_response = ns.model("LoginResponse", {
        "status": fields.String(description="Status respon", example="success"),
        "token_type": fields.String(description="Tipe token", example="Bearer"),
        "access_token": fields.String(description="JWT Access Token"),
        "refresh_token": fields.String(description="JWT Refresh Token"),
        "expires_in_seconds": fields.Integer(description="Masa berlaku token dalam detik", example=86400),
        "user": fields.Nested(user_info, description="Informasi user terotentikasi")
    })

    refresh_request = ns.model("RefreshRequest", {
        "refresh_token": fields.String(
            required=True,
            description="JWT Refresh Token yang valid",
            example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        )
    })

    user_profile_response = ns.model("UserProfileResponse", {
        "status": fields.String(description="Status respon", example="success"),
        "user": fields.Nested(user_info, description="Profil pengguna saat ini")
    })

    return {
        "login_request": login_request,
        "login_response": login_response,
        "refresh_request": refresh_request,
        "user_profile_response": user_profile_response
    }
