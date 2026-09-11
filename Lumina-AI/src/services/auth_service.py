"""
Domain Service: Authentication & JWT Token Management
Implements PBKDF2-HMAC-SHA256 password hashing and RFC 7519 JSON Web Tokens.
"""

import os
import secrets
import hashlib
import hmac
import time
from typing import Dict, Any, Optional
import jwt


class AuthError(Exception):
    """Base exception class for authentication errors."""
    pass


class TokenExpiredError(AuthError):
    """Raised when a JWT token is expired."""
    pass


class InvalidTokenError(AuthError):
    """Raised when a JWT token signature or format is invalid."""
    pass


class AuthService:
    """Service untuk manajemen hashing password dan siklus hidup JWT."""

    @staticmethod
    def generate_salt(length: int = 16) -> str:
        """Membuat cryptographically secure random salt hex string."""
        return secrets.token_hex(length)

    @staticmethod
    def hash_password(password: str, salt: str) -> str:
        """Meng-hash password menggunakan PBKDF2-HMAC-SHA256 dengan 100,000 iterasi."""
        key = hashlib.pbkdf2_hmac(
            hash_name="sha256",
            password=password.encode("utf-8"),
            salt=salt.encode("utf-8"),
            iterations=100_000
        )
        return key.hex()

    @staticmethod
    def verify_password(plain_password: str, salt: str, expected_hash: str) -> bool:
        """Verifikasi kecocokan password menggunakan perbandingan waktu konstan (constant-time)."""
        actual_hash = AuthService.hash_password(plain_password, salt)
        return hmac.compare_digest(actual_hash, expected_hash)

    @staticmethod
    def create_access_token(
        username: str,
        role: str,
        secret_key: str,
        expires_seconds: int = 86400  # Default: 24 jam
    ) -> str:
        """Membuat JWT Access Token bertanda tangan HMAC-SHA256."""
        now = int(time.time())
        payload = {
            "sub": username,
            "role": role,
            "iat": now,
            "exp": now + expires_seconds,
            "type": "access"
        }
        return jwt.encode(payload, secret_key, algorithm="HS256")

    @staticmethod
    def create_refresh_token(
        username: str,
        secret_key: str,
        expires_seconds: int = 604800  # Default: 7 hari
    ) -> str:
        """Membuat JWT Refresh Token bertanda tangan HMAC-SHA256."""
        now = int(time.time())
        payload = {
            "sub": username,
            "iat": now,
            "exp": now + expires_seconds,
            "type": "refresh"
        }
        return jwt.encode(payload, secret_key, algorithm="HS256")

    @staticmethod
    def decode_token(token: str, secret_key: str) -> Dict[str, Any]:
        """Memvalidasi dan mendekode token JWT. Melempar error spesifik jika gagal."""
        try:
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
            return payload
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError("Token autentikasi telah kadaluarsa. Silakan login kembali.")
        except (jwt.InvalidTokenError, jwt.DecodeError):
            raise InvalidTokenError("Token autentikasi tidak valid atau rusak.")
