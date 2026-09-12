"""Model user LUMINA."""
from __future__ import annotations

import uuid

from werkzeug.security import check_password_hash, generate_password_hash

from lumina.extensions import db
from lumina.utils.timeutil import iso, utcnow


def _uuid() -> str:
    return str(uuid.uuid4())


# Kode peran yang dipakai klien untuk menentukan halaman tujuan setelah login.
# Disimpan sebagai nama peran (bukan angka) supaya kolomnya tetap terbaca saat
# dibuka langsung di database; angkanya diturunkan, jadi tidak mungkin melenceng
# dari `role`.
ROLE_CODES: dict[str, int] = {
    "user": 1,
    "admin": 2,
    "partner": 3,
}
DEFAULT_ROLE_CODE = ROLE_CODES["user"]


def role_code_of(role: str | None) -> int:
    """Nama peran -> kode peran. Peran tak dikenal diperlakukan sebagai user."""
    return ROLE_CODES.get((role or "").strip().lower(), DEFAULT_ROLE_CODE)


def role_from_code(code: int | str | None) -> str | None:
    """Kode peran -> nama peran. None kalau kodenya tidak dikenal."""
    try:
        value = int(code)
    except (TypeError, ValueError):
        return None
    for name, number in ROLE_CODES.items():
        if number == value:
            return name
    return None


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)  # null = akun Google

    avatar_url = db.Column(db.String(512), nullable=True)
    google_id = db.Column(db.String(64), unique=True, nullable=True, index=True)
    provider = db.Column(db.String(20), nullable=False, default="email")

    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    role = db.Column(db.String(20), nullable=False, default="user", index=True)

    verified_at = db.Column(db.DateTime, nullable=True)
    last_login_at = db.Column(db.DateTime, nullable=True)
    # Dinaikkan setiap reset / ganti password / logout-all. JWT membawa versi
    # ini di claim "tv"; token dengan versi lama otomatis ditolak.
    token_version = db.Column(db.Integer, nullable=False, default=0)

    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    otp_codes = db.relationship(
        "OtpCode", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )

    # ------------------------------------------------------------- password
    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, raw_password)

    @property
    def has_password(self) -> bool:
        return bool(self.password_hash)

    @property
    def is_admin(self) -> bool:
        return (self.role or "").lower() == "admin"

    @property
    def role_code(self) -> int:
        return role_code_of(self.role)

    @property
    def home_path(self) -> str:
        """Halaman tujuan setelah login, mengikuti kode peran."""
        return "/admin" if self.role_code == ROLE_CODES["admin"] else "/app/home"

    def revoke_all_sessions(self) -> None:
        self.token_version = (self.token_version or 0) + 1

    def mark_verified(self) -> None:
        self.is_verified = True
        self.verified_at = utcnow()

    # ---------------------------------------------------------------- query
    @classmethod
    def find_by_email(cls, email: str) -> "User | None":
        if not email:
            return None
        return db.session.execute(
            db.select(cls).filter_by(email=email.strip().lower())
        ).scalar_one_or_none()

    @classmethod
    def find_by_google_id(cls, google_id: str) -> "User | None":
        if not google_id:
            return None
        return db.session.execute(
            db.select(cls).filter_by(google_id=google_id)
        ).scalar_one_or_none()

    # ------------------------------------------------------------ serialize
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "avatar_url": self.avatar_url,
            "provider": self.provider,
            "role": self.role,
            "role_code": self.role_code,
            "is_admin": self.is_admin,
            "home_path": self.home_path,
            "is_verified": self.is_verified,
            "is_active": self.is_active,
            "has_password": self.has_password,
            "created_at": iso(self.created_at),
            "last_login_at": iso(self.last_login_at),
        }

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User {self.email}>"
