"""Pengiriman email transaksional LUMINA (OTP, reset password, dll).

Kalau kredensial SMTP belum diisi (atau MAIL_SUPPRESS_SEND=1), email tidak
benar-benar dikirim: isinya di-log ke console dan disimpan sebagai file HTML
di folder `.mail_outbox/` supaya desainnya tetap bisa dicek saat development.
"""
from __future__ import annotations

import re
import smtplib
from datetime import datetime
from threading import Thread

from flask import current_app, render_template
from flask_mail import Message

from lumina.errors import ApiError
from lumina.extensions import mail
from lumina.utils.timeutil import fmt_datetime, fmt_time, utcnow


class MailError(ApiError):
    status_code = 502
    error_code = "EMAIL_NOT_SENT"
    message = "Email gagal dikirim. Silakan coba lagi."


def mail_is_live() -> bool:
    """True kalau email benar-benar dikirim lewat SMTP."""
    cfg = current_app.config
    if cfg.get("MAIL_SUPPRESS_SEND"):
        return False
    return bool(cfg.get("MAIL_USERNAME") and cfg.get("MAIL_PASSWORD"))


def base_context(**extra) -> dict:
    cfg = current_app.config
    ctx = {
        "app_name": cfg["APP_NAME"],
        "app_tagline": cfg["APP_TAGLINE"],
        "support_email": cfg["SUPPORT_EMAIL"],
        "frontend_url": cfg["FRONTEND_URL"],
        "login_url": cfg["FRONTEND_URL"] + "/login",
        "year": datetime.now().year,
    }
    ctx.update(extra)
    return ctx


def render_pair(template_name: str, context: dict) -> tuple[str, str]:
    """Render versi HTML + plain-text dari satu nama template."""
    html = render_template(f"emails/{template_name}.html", **context)
    try:
        text = render_template(f"emails/{template_name}.txt", **context)
    except Exception:  # template teks opsional
        text = re.sub(r"<[^>]+>", "", html)
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return html, text


def _dev_dump(subject: str, recipient: str, html: str, text: str, highlight: str | None) -> None:
    outbox = current_app.config["MAIL_OUTBOX_DIR"]
    slug = re.sub(r"[^a-z0-9]+", "-", subject.lower()).strip("-")[:40]
    try:
        outbox.mkdir(parents=True, exist_ok=True)
        path = outbox / f"{utcnow():%Y%m%d-%H%M%S}-{slug}.html"
        path.write_text(html, encoding="utf-8")
    except OSError:
        # Disk read-only (mis. Vercel): cukup dicatat di log, jangan sampai
        # kegagalan menyimpan pratinjau ikut menggagalkan request pengguna.
        path = "(tidak disimpan: disk read-only)"

    line = "=" * 64
    current_app.logger.warning(
        "\n%s\n[DEV EMAIL] SMTP belum aktif - email TIDAK dikirim.\n"
        "  Kepada : %s\n  Subjek : %s\n%s"
        "  Preview: %s\n%s",
        line,
        recipient,
        subject,
        f"  KODE   : {highlight}\n" if highlight else "",
        path,
        line,
    )


def _send_sync(app, msg: Message) -> None:
    with app.app_context():
        try:
            mail.send(msg)
        except Exception as exc:  # pragma: no cover - tergantung jaringan
            app.logger.error("Gagal mengirim email ke %s: %s", msg.recipients, exc)


def send_email(
    subject: str,
    recipient: str,
    template_name: str,
    context: dict,
    highlight: str | None = None,
) -> bool:
    """Kirim email. Return True kalau benar-benar terkirim lewat SMTP."""
    html, text = render_pair(template_name, context)
    full_subject = f"{context.get('app_name', 'LUMINA')} - {subject}"

    if not mail_is_live():
        _dev_dump(full_subject, recipient, html, text, highlight)
        return False

    msg = Message(subject=full_subject, recipients=[recipient], html=html, body=text)

    if current_app.config.get("MAIL_ASYNC"):
        Thread(
            target=_send_sync, args=(current_app._get_current_object(), msg), daemon=True
        ).start()
        return True

    try:
        mail.send(msg)
    except (smtplib.SMTPException, OSError) as exc:
        current_app.logger.error("SMTP error saat mengirim ke %s: %s", recipient, exc)

        # Saat development, SMTP yang mati tidak boleh mengunci seluruh alur
        # pendaftaran: emailnya dijatuhkan ke .mail_outbox/ dan kode OTP tetap
        # ikut di respons (`dev_otp_code`), sehingga alurnya bisa diteruskan.
        # Di production kegagalan tetap dilempar — pengguna tidak boleh disangka
        # sudah menerima email padahal tidak.
        if current_app.debug:
            current_app.logger.warning(
                "Mode debug: email untuk %s dialihkan ke %s",
                recipient,
                current_app.config["MAIL_OUTBOX_DIR"],
            )
            _dev_dump(full_subject, recipient, html, text, highlight)
            return False

        raise MailError(f"Email gagal dikirim ke {recipient}.")
    return True


# --------------------------------------------------------------------------
#  Email siap pakai
# --------------------------------------------------------------------------
def send_otp_email(user, code: str, purpose: str, expires_at, reset_url: str | None = None) -> bool:
    from lumina.models import OtpPurpose

    ttl_minutes = max(1, round(current_app.config["OTP_TTL_SECONDS"] / 60))
    context = base_context(
        user=user,
        code=code,
        ttl_minutes=ttl_minutes,
        expires_at_local=fmt_time(expires_at),
        reset_url=reset_url,
    )

    if purpose == OtpPurpose.PASSWORD_RESET:
        return send_email("Kode Reset Password", user.email, "otp_reset", context, highlight=code)
    return send_email("Kode Verifikasi Akun", user.email, "otp_verification", context, highlight=code)


def send_welcome_email(user) -> bool:
    return send_email("Selamat Datang!", user.email, "welcome", base_context(user=user))


def send_password_changed_email(user) -> bool:
    context = base_context(user=user, changed_at_local=fmt_datetime(utcnow()))
    return send_email("Password Berhasil Diubah", user.email, "password_changed", context)
