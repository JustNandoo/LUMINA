"""Helper kriptografi: OTP, hashing, dan token reset password."""
from __future__ import annotations

import hashlib
import hmac
import secrets

from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

RESET_SALT = "lumina-password-reset"


def generate_otp(length: int | None = None) -> str:
    """Kode OTP numerik yang aman secara kriptografis."""
    length = length or current_app.config["OTP_LENGTH"]
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


def hash_otp(code: str) -> str:
    """OTP tidak pernah disimpan plaintext di database."""
    key = current_app.config["SECRET_KEY"].encode()
    return hmac.new(key, code.encode(), hashlib.sha256).hexdigest()


def verify_otp_hash(code: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_otp(code), hashed or "")


def password_fingerprint(password_hash: str | None) -> str:
    """Sidik jari password saat ini -> token reset otomatis hangus
    begitu password berhasil diganti."""
    return hashlib.sha256((password_hash or "no-password").encode()).hexdigest()[:16]


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt=RESET_SALT)


def generate_reset_token(user) -> str:
    return _serializer().dumps(
        {"uid": user.id, "fp": password_fingerprint(user.password_hash)}
    )


def read_reset_token(token: str) -> dict | None:
    """Return payload kalau token valid & belum kedaluwarsa, else None."""
    max_age = current_app.config["PASSWORD_RESET_TTL_SECONDS"]
    try:
        return _serializer().loads(token, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None
