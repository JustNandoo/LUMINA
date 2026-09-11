"""Validasi & normalisasi input yang dikirim dari form auth."""
from __future__ import annotations

import re

from email_validator import EmailNotValidError, validate_email
from flask import current_app

from lumina.errors import ValidationError

NAME_RE = re.compile(r"^[A-Za-zÀ-ɏ' .,-]{2,80}$")
DIGIT_RE = re.compile(r"\d")
LETTER_RE = re.compile(r"[A-Za-z]")


def normalize_email(value: str | None) -> str:
    return (value or "").strip().lower()


def mask_email(email: str) -> str:
    """zaidan@gmail.com -> za*@gmail.com (dipakai di layar OTP)."""
    email = normalize_email(email)
    if "@" not in email:
        return email
    local, domain = email.split("@", 1)
    visible = local[:2] if len(local) > 2 else local[:1]
    return f"{visible}*@{domain}"


def check_email(value: str | None, field: str = "email") -> str:
    email = normalize_email(value)
    if not email:
        raise ValidationError(errors={field: "Email wajib diisi."})
    try:
        result = validate_email(email, check_deliverability=False)
    except EmailNotValidError:
        raise ValidationError(errors={field: "Format email tidak valid."})
    return result.normalized.lower()


def check_full_name(value: str | None, field: str = "full_name") -> str:
    name = " ".join((value or "").split())
    if not name:
        raise ValidationError(errors={field: "Nama lengkap wajib diisi."})
    if not NAME_RE.match(name):
        raise ValidationError(
            errors={field: "Nama hanya boleh huruf, spasi, titik, dan tanda hubung (2-80 karakter)."}
        )
    return name


def check_password(value: str | None, confirm: str | None = None, field: str = "password") -> str:
    password = value or ""
    min_len = current_app.config["PASSWORD_MIN_LENGTH"]
    errors: dict[str, str] = {}

    if not password:
        errors[field] = "Password wajib diisi."
    elif len(password) < min_len:
        errors[field] = f"Password minimal {min_len} karakter."
    elif len(password) > 128:
        errors[field] = "Password maksimal 128 karakter."
    elif not LETTER_RE.search(password) or not DIGIT_RE.search(password):
        errors[field] = "Password harus mengandung minimal 1 huruf dan 1 angka."

    if confirm is not None and not errors:
        if not confirm:
            errors["confirm_password"] = "Konfirmasi password wajib diisi."
        elif password != confirm:
            errors["confirm_password"] = "Konfirmasi password tidak sama."

    if errors:
        raise ValidationError(errors=errors)
    return password


def check_otp_code(value: str | None, field: str = "otp") -> str:
    code = re.sub(r"\s+", "", str(value or ""))
    length = current_app.config["OTP_LENGTH"]
    if not code:
        raise ValidationError(errors={field: "Kode OTP wajib diisi."})
    if not code.isdigit() or len(code) != length:
        raise ValidationError(errors={field: f"Kode OTP harus {length} digit angka."})
    return code


def get_json_body() -> dict:
    """Ambil body JSON (atau form-data) tanpa melempar 400 mentah dari Flask."""
    from flask import request

    data = request.get_json(silent=True)
    if data is None and request.form:
        data = request.form.to_dict()
    if not isinstance(data, dict):
        raise ValidationError("Body request harus berupa JSON.")
    return data
