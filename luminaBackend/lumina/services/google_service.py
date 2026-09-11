"""Verifikasi Google ID Token untuk tombol 'Sign up / Continue with Google'."""
from __future__ import annotations

from flask import current_app

from lumina.errors import ApiError

ALLOWED_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


class GoogleAuthError(ApiError):
    status_code = 401
    error_code = "GOOGLE_AUTH_FAILED"
    message = "Login dengan Google gagal."


def verify_google_token(id_token_str: str) -> dict:
    """Validasi ID token dari Google Identity Services, return profil user."""
    client_id = current_app.config.get("GOOGLE_CLIENT_ID")
    if not client_id:
        raise ApiError(
            "Login Google belum dikonfigurasi. Isi GOOGLE_CLIENT_ID di file .env.",
            status_code=501,
            error_code="GOOGLE_NOT_CONFIGURED",
        )

    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    try:
        info = google_id_token.verify_oauth2_token(
            id_token_str, google_requests.Request(), client_id, clock_skew_in_seconds=10
        )
    except ValueError as exc:
        raise GoogleAuthError(f"Token Google tidak valid: {exc}")

    if info.get("iss") not in ALLOWED_ISSUERS:
        raise GoogleAuthError("Penerbit token Google tidak dikenal.")
    if not info.get("email"):
        raise GoogleAuthError("Akun Google tidak memiliki email.")
    if not info.get("email_verified"):
        raise GoogleAuthError("Email Google kamu belum terverifikasi.")

    return {
        "google_id": info["sub"],
        "email": info["email"].lower(),
        "full_name": info.get("name") or info["email"].split("@")[0],
        "avatar_url": info.get("picture"),
    }
