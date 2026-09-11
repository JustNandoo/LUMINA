"""
API Controller: Authentication & Authorization Endpoints
Provides JWT login, profile inspection, and token refresh.
"""

from flask import request, current_app, g
from flask_restx import Namespace, Resource
from src.repositories.user_repository import UserRepository
from src.services.auth_service import AuthService, TokenExpiredError, InvalidTokenError
from api.middleware.auth_middleware import jwt_required, roles_required
from api.schemas.auth_schemas import create_auth_models

auth_ns = Namespace("auth", description="Autentikasi & Manajemen Sesi JWT (JSON Web Token)")
models = create_auth_models(auth_ns)

# Lazy/shared user repo instance
user_repo = UserRepository()


@auth_ns.route("/api-login")
@auth_ns.route("/login", doc=False)
class LoginEndpoint(Resource):
    @auth_ns.doc(
        "user_login",
        description="Login untuk mendapatkan JWT Access Token dan Refresh Token.<br/>"
                    "<b>Akun Demo Siap Pakai:</b><br/>"
                    "• <code>analyst</code> / <code>lumina2026</code> (Role: analyst)<br/>"
                    "• <code>admin</code> / <code>superlumina2026</code> (Role: admin)<br/>"
                    "• <code>developer</code> / <code>radiant2026</code> (Role: developer)"
    )
    @auth_ns.expect(models["login_request"], validate=False)
    @auth_ns.response(200, "Berhasil login dan mendapatkan token", models["login_response"])
    @auth_ns.response(401, "Kredensial username atau password salah")
    def post(self):
        """Autentikasi kredensial pengguna dan terbitkan JWT token."""
        data = request.get_json() or {}
        username = data.get("username", "").strip()
        password = data.get("password", "")

        user = user_repo.get_by_username(username)
        if not user:
            return {
                "status": "error",
                "code": 401,
                "message": "Username atau password yang dimasukkan salah."
            }, 401

        is_valid = AuthService.verify_password(password, user["salt"], user["password_hash"])
        if not is_valid:
            return {
                "status": "error",
                "code": 401,
                "message": "Username atau password yang dimasukkan salah."
            }, 401

        secret_key = current_app.config["JWT_SECRET_KEY"]
        access_exp = current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]
        refresh_exp = current_app.config["JWT_REFRESH_TOKEN_EXPIRES"]

        access_token = AuthService.create_access_token(user["username"], user["role"], secret_key, access_exp)
        refresh_token = AuthService.create_refresh_token(user["username"], secret_key, refresh_exp)

        return {
            "status": "success",
            "token_type": "Bearer",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in_seconds": access_exp,
            "user": {
                "username": user["username"],
                "role": user["role"],
                "full_name": user["full_name"]
            }
        }, 200


@auth_ns.route("/api-me")
@auth_ns.route("/me", doc=False)
class CurrentUserProfile(Resource):
    @auth_ns.doc(
        "get_current_user_profile",
        description="Melihat profil user yang sedang aktif berdasarkan Bearer JWT Token.",
        security="Bearer"
    )
    @auth_ns.response(200, "Profil user berhasil diambil", models["user_profile_response"])
    @auth_ns.response(401, "Token tidak valid atau tidak disertakan")
    @jwt_required
    def get(self):
        """Ambil data profil pengguna yang sedang login."""
        current_user = g.current_user
        user_record = user_repo.get_by_username(current_user["username"])
        if not user_record:
            return {
                "status": "error",
                "code": 404,
                "message": "User tidak ditemukan di sistem."
            }, 404

        return {
            "status": "success",
            "user": {
                "username": user_record["username"],
                "role": user_record["role"],
                "full_name": user_record["full_name"]
            }
        }, 200


@auth_ns.route("/api-refresh")
@auth_ns.route("/refresh", doc=False)
class RefreshTokenEndpoint(Resource):
    @auth_ns.doc(
        "refresh_access_token",
        description="Memperbarui Access Token menggunakan Refresh Token yang masih berlaku."
    )
    @auth_ns.expect(models["refresh_request"], validate=False)
    @auth_ns.response(200, "Access token berhasil diperbarui")
    @auth_ns.response(401, "Refresh token tidak valid atau kadaluarsa")
    def post(self):
        """Perbarui Access Token yang kadaluarsa menggunakan Refresh Token."""
        data = request.get_json() or {}
        refresh_token = data.get("refresh_token", "").strip()

        secret_key = current_app.config["JWT_SECRET_KEY"]
        try:
            payload = AuthService.decode_token(refresh_token, secret_key)
            if payload.get("type") != "refresh":
                return {
                    "status": "error",
                    "code": 401,
                    "message": "Token yang dikirim bukan jenis Refresh Token."
                }, 401

            username = payload.get("sub")
            user = user_repo.get_by_username(username)
            if not user:
                return {
                    "status": "error",
                    "code": 404,
                    "message": "User pemilik token tidak ditemukan."
                }, 404

            access_exp = current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]
            new_access_token = AuthService.create_access_token(user["username"], user["role"], secret_key, access_exp)

            return {
                "status": "success",
                "token_type": "Bearer",
                "access_token": new_access_token,
                "expires_in_seconds": access_exp
            }, 200

        except TokenExpiredError:
            return {"status": "error", "code": 401, "message": "Refresh token telah kadaluarsa. Silakan login kembali."}, 401
        except InvalidTokenError:
            return {"status": "error", "code": 401, "message": "Refresh token tidak valid atau rusak."}, 401


@auth_ns.route("/api-users")
@auth_ns.route("/users", doc=False)
class UsersListEndpoint(Resource):
    @auth_ns.doc(
        "list_registered_users",
        description="Melihat seluruh daftar pengguna terdaftar (Hanya Role Admin).",
        security="Bearer"
    )
    @auth_ns.response(200, "Daftar pengguna berhasil diambil")
    @auth_ns.response(403, "Akses terlarang - Diperlukan role Admin")
    @jwt_required
    @roles_required("admin")
    def get(self):
        """Ambil daftar semua user (Admin only)."""
        return {
            "status": "success",
            "users": user_repo.list_users()
        }, 200
