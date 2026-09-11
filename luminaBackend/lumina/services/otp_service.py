"""Logika penerbitan & verifikasi kode OTP."""
from __future__ import annotations

from datetime import timedelta

from flask import current_app, request

from lumina.errors import ApiError, RateLimitError
from lumina.extensions import db
from lumina.models import OtpCode, OtpPurpose
from lumina.services.mail_service import send_otp_email
from lumina.utils.security import generate_otp, hash_otp, verify_otp_hash
from lumina.utils.timeutil import seconds_from_now, seconds_left, utcnow


class OtpError(ApiError):
    status_code = 400
    error_code = "OTP_INVALID"
    message = "Kode OTP salah atau sudah tidak berlaku."


def _latest(user, purpose: str) -> OtpCode | None:
    return db.session.execute(
        db.select(OtpCode)
        .filter_by(user_id=user.id, purpose=purpose)
        .order_by(OtpCode.created_at.desc(), OtpCode.id.desc())
        .limit(1)
    ).scalar_one_or_none()


def _guard_rate_limit(user, purpose: str) -> None:
    cfg = current_app.config
    now = utcnow()

    last = _latest(user, purpose)
    if last:
        cooldown_until = last.created_at + timedelta(seconds=cfg["OTP_RESEND_COOLDOWN_SECONDS"])
        wait = seconds_left(cooldown_until)
        if wait > 0:
            meta = {"retry_after_seconds": wait}
            # Kode sebelumnya masih hidup -> kirim sisa masa berlakunya supaya
            # hitung mundur di layar OTP tetap akurat.
            if last.is_usable:
                meta["expires_at"] = last.expires_at.replace(microsecond=0).isoformat() + "Z"
                meta["expires_in_seconds"] = seconds_left(last.expires_at)
            raise RateLimitError(
                f"Tunggu {wait} detik lagi sebelum meminta kode baru.",
                error_code="OTP_COOLDOWN",
                meta=meta,
            )

    sent_last_hour = db.session.execute(
        db.select(db.func.count(OtpCode.id)).filter(
            OtpCode.user_id == user.id,
            OtpCode.purpose == purpose,
            OtpCode.created_at >= now - timedelta(hours=1),
        )
    ).scalar_one()

    if sent_last_hour >= cfg["OTP_MAX_PER_HOUR"]:
        raise RateLimitError(
            "Kamu sudah terlalu sering meminta kode OTP. Coba lagi satu jam lagi.",
            error_code="OTP_QUOTA_EXCEEDED",
            meta={"retry_after_seconds": 3600},
        )


def issue_otp(user, purpose: str, *, skip_rate_limit: bool = False) -> tuple[OtpCode, str]:
    """Buat OTP baru, hanguskan OTP lama yang masih hidup."""
    if purpose not in OtpPurpose.ALL:
        raise ApiError(f"Purpose OTP tidak dikenal: {purpose}")

    if not skip_rate_limit:
        _guard_rate_limit(user, purpose)

    # OTP lama langsung dianggap terpakai supaya hanya 1 kode yang aktif.
    db.session.query(OtpCode).filter(
        OtpCode.user_id == user.id,
        OtpCode.purpose == purpose,
        OtpCode.consumed_at.is_(None),
    ).update({OtpCode.consumed_at: utcnow()}, synchronize_session=False)

    cfg = current_app.config
    code = generate_otp()
    otp = OtpCode(
        user_id=user.id,
        purpose=purpose,
        code_hash=hash_otp(code),
        expires_at=seconds_from_now(cfg["OTP_TTL_SECONDS"]),
        max_attempts=cfg["OTP_MAX_ATTEMPTS"],
        ip_address=(request.remote_addr if request else None),
    )
    db.session.add(otp)
    db.session.commit()
    return otp, code


def send_otp(user, purpose: str, *, reset_url: str | None = None, skip_rate_limit: bool = False) -> dict:
    """Terbitkan OTP lalu kirimkan lewat email. Return metadata untuk response."""
    otp, code = issue_otp(user, purpose, skip_rate_limit=skip_rate_limit)
    delivered = send_otp_email(user, code, purpose, otp.expires_at, reset_url=reset_url)

    meta = {
        "expires_at": otp.expires_at.replace(microsecond=0).isoformat() + "Z",
        "expires_in_seconds": seconds_left(otp.expires_at),
        "resend_available_in_seconds": current_app.config["OTP_RESEND_COOLDOWN_SECONDS"],
        "email_delivered": delivered,
    }
    # Di mode dev (SMTP belum diisi) kode ikut dikirim ke response supaya
    # frontend/Postman tetap bisa dites tanpa email sungguhan.
    if not delivered and current_app.debug:
        meta["dev_otp_code"] = code
    return meta


def verify_otp(user, purpose: str, code: str) -> OtpCode:
    otp = _latest(user, purpose)

    if otp is None or otp.is_consumed:
        raise OtpError(
            "Kode OTP tidak ditemukan. Silakan minta kode baru.",
            error_code="OTP_NOT_FOUND",
        )
    if otp.is_expired:
        raise OtpError(
            "Kode OTP sudah kedaluwarsa. Silakan kirim ulang OTP.",
            error_code="OTP_EXPIRED",
        )
    if otp.is_locked:
        raise OtpError(
            "Percobaan kode OTP sudah habis. Silakan minta kode baru.",
            status_code=429,
            error_code="OTP_LOCKED",
        )

    if not verify_otp_hash(code, otp.code_hash):
        otp.attempts += 1
        db.session.commit()
        remaining = max(0, otp.max_attempts - otp.attempts)
        if remaining == 0:
            raise OtpError(
                "Kode OTP salah dan percobaan sudah habis. Silakan minta kode baru.",
                status_code=429,
                error_code="OTP_LOCKED",
            )
        raise OtpError(
            f"Kode OTP salah. Sisa {remaining} percobaan.",
            error_code="OTP_INCORRECT",
            meta={"attempts_left": remaining},
        )

    otp.consume()
    db.session.commit()
    return otp
