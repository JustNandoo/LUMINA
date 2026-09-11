"""Endpoint autentikasi LUMINA.

Alur yang didukung (mengikuti desain UI):
  Sign Up  -> OTP Verification -> akun aktif (auto login)
  Login    -> access + refresh token
  Google   -> Sign up / Continue with Google
  Forgot Password -> OTP / link -> Reset Password
"""
from __future__ import annotations

from flask import Blueprint, current_app
from flask_jwt_extended import (
    current_user,
    decode_token,
    get_jwt,
    jwt_required,
)

from lumina.errors import (
    ApiError,
    AuthError,
    ConflictError,
    ForbiddenError,
    RateLimitError,
    ValidationError,
)
from lumina.extensions import db
from lumina.models import OtpCode, OtpPurpose, TokenBlocklist, User
from lumina.services.google_service import verify_google_token
from lumina.services.mail_service import send_password_changed_email, send_welcome_email
from lumina.services.otp_service import send_otp, verify_otp
from lumina.services.token_service import issue_access_token, issue_tokens
from lumina.utils.responses import success_response
from lumina.utils.security import (
    generate_reset_token,
    password_fingerprint,
    read_reset_token,
)
from lumina.utils.timeutil import utcnow
from lumina.utils.validators import (
    check_email,
    check_full_name,
    check_otp_code,
    check_password,
    get_json_body,
    mask_email,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


# --------------------------------------------------------------------------
#  Helper
# --------------------------------------------------------------------------
def _verification_payload(user: User, purpose: str, meta: dict) -> dict:
    return {
        "email": user.email,
        "masked_email": mask_email(user.email),
        "purpose": purpose,
        **meta,
    }


def _reset_link(token: str) -> str:
    cfg = current_app.config
    return f"{cfg['FRONTEND_URL']}{cfg['FRONTEND_RESET_PATH']}?token={token}"


def _require_active(user: User) -> None:
    if not user.is_active:
        raise ForbiddenError(
            "Akun kamu dinonaktifkan. Hubungi dukungan LUMINA.",
            error_code="ACCOUNT_DISABLED",
        )


def _clear_otps(user: User, purpose: str) -> None:
    db.session.query(OtpCode).filter(
        OtpCode.user_id == user.id,
        OtpCode.purpose == purpose,
        OtpCode.consumed_at.is_(None),
    ).update({OtpCode.consumed_at: utcnow()}, synchronize_session=False)


# --------------------------------------------------------------------------
#  SIGN UP
# --------------------------------------------------------------------------
@auth_bp.post("/register")
def register():
    body = get_json_body()
    full_name = check_full_name(body.get("full_name") or body.get("name"))
    email = check_email(body.get("email"))
    password = check_password(
        body.get("password"),
        body.get("confirm_password", body.get("password_confirmation")),
    )

    existing = User.find_by_email(email)
    if existing:
        if existing.is_verified:
            if not existing.has_password and existing.google_id:
                raise ConflictError(
                    "Email ini terdaftar lewat Google. Gunakan tombol Continue with Google.",
                    error_code="GOOGLE_ACCOUNT_EXISTS",
                )
            raise ConflictError(
                "Email sudah terdaftar. Silakan login.", error_code="EMAIL_ALREADY_REGISTERED"
            )
        # Akun lama belum pernah diverifikasi -> perbarui datanya, kirim OTP baru.
        existing.full_name = full_name
        existing.set_password(password)
        db.session.commit()
        try:
            meta = send_otp(existing, OtpPurpose.EMAIL_VERIFICATION)
            message = "Akun belum diverifikasi. Kode OTP baru sudah dikirim ke emailmu."
        except RateLimitError as exc:
            # Kode sebelumnya masih hidup -> jangan kirim ulang, lanjut ke layar OTP.
            meta = exc.meta or {}
            message = "Kode OTP sebelumnya masih berlaku. Cek emailmu ya."
        return success_response(
            message,
            {
                "user": existing.to_dict(),
                "verification": _verification_payload(
                    existing, OtpPurpose.EMAIL_VERIFICATION, meta
                ),
            },
            status=200,
        )

    user = User(full_name=full_name, email=email, provider="email")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    meta = send_otp(user, OtpPurpose.EMAIL_VERIFICATION)
    return success_response(
        f"Kode OTP sudah dikirim ke {mask_email(email)}.",
        {
            "user": user.to_dict(),
            "verification": _verification_payload(user, OtpPurpose.EMAIL_VERIFICATION, meta),
        },
        status=201,
    )


# --------------------------------------------------------------------------
#  OTP VERIFICATION (aktivasi akun)
# --------------------------------------------------------------------------
@auth_bp.post("/verify-otp")
def verify_email_otp():
    body = get_json_body()
    email = check_email(body.get("email"))
    code = check_otp_code(body.get("otp") or body.get("code"))

    user = User.find_by_email(email)
    if user is None:
        raise ValidationError(errors={"email": "Email belum terdaftar."})
    _require_active(user)

    if user.is_verified:
        return success_response(
            "Akun kamu sudah terverifikasi. Silakan login.",
            {"user": user.to_dict()},
        )

    verify_otp(user, OtpPurpose.EMAIL_VERIFICATION, code)
    user.mark_verified()
    db.session.commit()

    send_welcome_email(user)
    tokens = issue_tokens(user)
    return success_response(
        "Verifikasi berhasil. Selamat datang di LUMINA!",
        {"user": user.to_dict(), "tokens": tokens},
    )


@auth_bp.post("/resend-otp")
def resend_otp():
    body = get_json_body()
    email = check_email(body.get("email"))
    purpose = (body.get("purpose") or OtpPurpose.EMAIL_VERIFICATION).strip()
    if purpose not in OtpPurpose.ALL:
        raise ValidationError(
            errors={"purpose": f"Purpose harus salah satu dari: {', '.join(OtpPurpose.ALL)}"}
        )

    user = User.find_by_email(email)
    generic = success_response(
        f"Jika email terdaftar, kode OTP baru sudah dikirim ke {mask_email(email)}.",
        {
            "email": email,
            "masked_email": mask_email(email),
            "purpose": purpose,
            "resend_available_in_seconds": current_app.config["OTP_RESEND_COOLDOWN_SECONDS"],
        },
    )
    if user is None or not user.is_active:
        return generic

    if purpose == OtpPurpose.EMAIL_VERIFICATION and user.is_verified:
        raise ConflictError(
            "Akun sudah terverifikasi. Silakan login.", error_code="ALREADY_VERIFIED"
        )

    reset_url = None
    if purpose == OtpPurpose.PASSWORD_RESET:
        reset_url = _reset_link(generate_reset_token(user))

    meta = send_otp(user, purpose, reset_url=reset_url)
    return success_response(
        f"Kode OTP baru sudah dikirim ke {mask_email(email)}.",
        _verification_payload(user, purpose, meta),
    )


# --------------------------------------------------------------------------
#  LOGIN
# --------------------------------------------------------------------------
@auth_bp.post("/login")
def login():
    body = get_json_body()
    email = check_email(body.get("email"))
    password = body.get("password") or ""
    if not password:
        raise ValidationError(errors={"password": "Password wajib diisi."})

    user = User.find_by_email(email)
    if user is None or not user.check_password(password):
        raise AuthError("Email atau password salah.", error_code="INVALID_CREDENTIALS")
    _require_active(user)

    if not user.is_verified:
        # Akun belum aktif -> kirim ulang OTP dan minta frontend membuka layar OTP.
        try:
            meta = send_otp(user, OtpPurpose.EMAIL_VERIFICATION)
        except RateLimitError as exc:
            meta = exc.meta or {}
        raise ForbiddenError(
            "Akun belum diverifikasi. Kami sudah mengirim kode OTP ke emailmu.",
            error_code="ACCOUNT_NOT_VERIFIED",
            meta=_verification_payload(user, OtpPurpose.EMAIL_VERIFICATION, meta),
        )

    tokens = issue_tokens(user)
    return success_response(
        f"Selamat datang kembali, {user.full_name.split()[0]}!",
        {"user": user.to_dict(), "tokens": tokens},
    )


# --------------------------------------------------------------------------
#  GOOGLE SIGN-IN
# --------------------------------------------------------------------------
@auth_bp.post("/google")
def google_auth():
    body = get_json_body()
    token = body.get("id_token") or body.get("credential") or body.get("token")
    if not token:
        raise ValidationError(errors={"id_token": "ID token Google wajib dikirim."})

    profile = verify_google_token(token)
    user = User.find_by_google_id(profile["google_id"]) or User.find_by_email(profile["email"])
    created = False

    if user is None:
        user = User(
            full_name=profile["full_name"],
            email=profile["email"],
            google_id=profile["google_id"],
            avatar_url=profile["avatar_url"],
            provider="google",
            is_verified=True,
            verified_at=utcnow(),
        )
        db.session.add(user)
        created = True
    else:
        _require_active(user)
        user.google_id = user.google_id or profile["google_id"]
        user.avatar_url = user.avatar_url or profile["avatar_url"]
        if not user.is_verified:
            user.mark_verified()
        if user.provider == "email" and not user.has_password:
            user.provider = "google"
    db.session.commit()

    if created:
        send_welcome_email(user)

    tokens = issue_tokens(user)
    return success_response(
        "Berhasil masuk dengan Google." if not created else "Akun Google berhasil didaftarkan.",
        {"user": user.to_dict(), "tokens": tokens, "is_new_user": created},
        status=201 if created else 200,
    )


# --------------------------------------------------------------------------
#  FORGOT / RESET PASSWORD
# --------------------------------------------------------------------------
@auth_bp.post("/forgot-password")
def forgot_password():
    body = get_json_body()
    email = check_email(body.get("email"))
    cooldown = current_app.config["OTP_RESEND_COOLDOWN_SECONDS"]

    user = User.find_by_email(email)
    base_data = {
        "email": email,
        "masked_email": mask_email(email),
        "purpose": OtpPurpose.PASSWORD_RESET,
        "expires_in_seconds": current_app.config["OTP_TTL_SECONDS"],
        "resend_available_in_seconds": cooldown,
    }
    message = (
        f"Jika email terdaftar, kami sudah mengirim kode dan link reset password ke {mask_email(email)}."
    )

    # Respons selalu sama supaya email yang terdaftar tidak bisa ditebak.
    if user is None or not user.is_active:
        return success_response(message, base_data)

    try:
        meta = send_otp(
            user, OtpPurpose.PASSWORD_RESET, reset_url=_reset_link(generate_reset_token(user))
        )
    except RateLimitError as exc:
        return success_response(message, {**base_data, **(exc.meta or {})})

    return success_response(message, {**base_data, **meta})


@auth_bp.post("/verify-reset-otp")
def verify_reset_otp():
    """Cek kode OTP reset password -> balikan token untuk halaman Reset Password."""
    body = get_json_body()
    email = check_email(body.get("email"))
    code = check_otp_code(body.get("otp") or body.get("code"))

    user = User.find_by_email(email)
    if user is None:
        raise ValidationError(errors={"email": "Email belum terdaftar."})
    _require_active(user)

    verify_otp(user, OtpPurpose.PASSWORD_RESET, code)
    token = generate_reset_token(user)
    return success_response(
        "Kode OTP valid. Silakan buat password baru.",
        {
            "reset_token": token,
            "expires_in_seconds": current_app.config["PASSWORD_RESET_TTL_SECONDS"],
            "reset_url": _reset_link(token),
        },
    )


@auth_bp.post("/reset-password")
def reset_password():
    """Terima `reset_token` (dari link email / verify-reset-otp)
    ATAU kombinasi `email` + `otp`."""
    body = get_json_body()
    password = check_password(
        body.get("password") or body.get("new_password"),
        body.get("confirm_password")
        or body.get("password_confirmation")
        or body.get("re_password"),
    )

    token = body.get("reset_token") or body.get("token")
    user: User | None = None

    if token:
        payload = read_reset_token(token)
        if not payload:
            raise ApiError(
                "Link/token reset password sudah kedaluwarsa atau tidak valid.",
                status_code=400,
                error_code="RESET_TOKEN_INVALID",
            )
        user = db.session.get(User, payload.get("uid"))
        if user is None:
            raise ApiError(
                "Akun tidak ditemukan.", status_code=404, error_code="USER_NOT_FOUND"
            )
        if payload.get("fp") != password_fingerprint(user.password_hash):
            raise ApiError(
                "Token reset sudah pernah dipakai. Silakan minta kode baru.",
                status_code=400,
                error_code="RESET_TOKEN_USED",
            )
    else:
        email = check_email(body.get("email"))
        code = check_otp_code(body.get("otp") or body.get("code"))
        user = User.find_by_email(email)
        if user is None:
            raise ValidationError(errors={"email": "Email belum terdaftar."})
        verify_otp(user, OtpPurpose.PASSWORD_RESET, code)

    _require_active(user)

    if user.check_password(password):
        raise ValidationError(
            errors={"password": "Password baru tidak boleh sama dengan password lama."}
        )

    user.set_password(password)
    if not user.is_verified:  # OTP/link terbukti sampai ke email tersebut
        user.mark_verified()
    user.revoke_all_sessions()
    _clear_otps(user, OtpPurpose.PASSWORD_RESET)
    db.session.commit()

    send_password_changed_email(user)
    return success_response(
        "Password berhasil diubah. Silakan login dengan password barumu.",
        {"user": user.to_dict()},
    )


# --------------------------------------------------------------------------
#  SESSION
# --------------------------------------------------------------------------
@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    body = get_json_body()
    user = current_user
    new_password = check_password(
        body.get("new_password") or body.get("password"),
        body.get("confirm_password") or body.get("password_confirmation"),
        field="new_password",
    )

    if user.has_password:
        current_password = body.get("current_password") or body.get("old_password") or ""
        if not user.check_password(current_password):
            raise ValidationError(errors={"current_password": "Password lama salah."})
        if current_password == new_password:
            raise ValidationError(
                errors={"new_password": "Password baru tidak boleh sama dengan password lama."}
            )

    user.set_password(new_password)
    user.revoke_all_sessions()
    db.session.commit()

    send_password_changed_email(user)
    tokens = issue_tokens(user, update_last_login=False)
    return success_response(
        "Password berhasil diperbarui.", {"user": user.to_dict(), "tokens": tokens}
    )


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    TokenBlocklist.revoke(get_jwt())  # rotasi: refresh token lama langsung mati
    db.session.commit()
    tokens = issue_tokens(current_user, update_last_login=False)
    return success_response("Token diperbarui.", {"tokens": tokens})


@auth_bp.post("/logout")
@jwt_required(verify_type=False)
def logout():
    TokenBlocklist.revoke(get_jwt())

    body = {}
    try:
        body = get_json_body()
    except ValidationError:
        pass
    refresh_token = body.get("refresh_token")
    if refresh_token:
        try:
            TokenBlocklist.revoke(decode_token(refresh_token))
        except Exception:
            current_app.logger.info("Refresh token pada /logout tidak valid, diabaikan.")

    db.session.commit()
    return success_response("Berhasil logout.")


@auth_bp.post("/logout-all")
@jwt_required()
def logout_all():
    current_user.revoke_all_sessions()
    db.session.commit()
    return success_response("Berhasil logout dari semua perangkat.")


@auth_bp.get("/me")
@jwt_required()
def me():
    return success_response("Profil pengguna.", {"user": current_user.to_dict()})


@auth_bp.patch("/me")
@jwt_required()
def update_me():
    body = get_json_body()
    user = current_user
    if "full_name" in body or "name" in body:
        user.full_name = check_full_name(body.get("full_name") or body.get("name"))
    if "avatar_url" in body:
        avatar = (body.get("avatar_url") or "").strip() or None
        if avatar and not avatar.startswith(("http://", "https://")):
            raise ValidationError(errors={"avatar_url": "URL avatar harus diawali http/https."})
        user.avatar_url = avatar
    db.session.commit()
    return success_response("Profil berhasil diperbarui.", {"user": user.to_dict()})
