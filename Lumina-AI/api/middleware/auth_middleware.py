"""
API Middleware: JWT Authentication & Role-Based Access Control
Enforces RFC 6750 Bearer Token authentication and request context injection.
"""

from functools import wraps
from typing import Callable, Any, List
from flask import request, current_app, g, jsonify
from src.services.auth_service import AuthService, TokenExpiredError, InvalidTokenError


def jwt_required(fn: Callable) -> Callable:
    """Decorator untuk memproteksi endpoint API menggunakan validasi JWT Bearer Token."""
    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        auth_header = request.headers.get("Authorization", None)
        if not auth_header:
            return {
                "status": "error",
                "code": 401,
                "message": "Akses ditolak. Header 'Authorization: Bearer <token>' wajib disertakan."
            }, 401

        parts = auth_header.strip().split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return {
                "status": "error",
                "code": 401,
                "message": "Format Authorization tidak valid. Gunakan format 'Bearer <token>'."
            }, 401

        token = parts[1]
        secret_key = current_app.config.get("JWT_SECRET_KEY", "default-secret")

        try:
            payload = AuthService.decode_token(token, secret_key)
            if payload.get("type") != "access":
                return {
                    "status": "error",
                    "code": 401,
                    "message": "Jenis token tidak valid untuk akses resource."
                }, 401

            g.current_user = {
                "username": payload.get("sub"),
                "role": payload.get("role", "analyst")
            }
            g.token_claims = payload
        except TokenExpiredError as e:
            return {
                "status": "error",
                "code": 401,
                "message": str(e)
            }, 401
        except InvalidTokenError as e:
            return {
                "status": "error",
                "code": 401,
                "message": str(e)
            }, 401
        except Exception as e:
            return {
                "status": "error",
                "code": 401,
                "message": f"Autentikasi gagal: {str(e)}"
            }, 401

        return fn(*args, **kwargs)

    return wrapper


def roles_required(*allowed_roles: str) -> Callable:
    """Decorator untuk membatasi endpoint berdasarkan role user (misal: 'admin')."""
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            current_user = getattr(g, "current_user", None)
            if not current_user:
                return {
                    "status": "error",
                    "code": 401,
                    "message": "Identitas user tidak ditemukan dalam context."
                }, 401

            user_role = current_user.get("role", "")
            if user_role not in allowed_roles:
                return {
                    "status": "error",
                    "code": 403,
                    "message": f"Akses terlarang. Diperlukan salah satu dari peran: {', '.join(allowed_roles)}."
                }, 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator
