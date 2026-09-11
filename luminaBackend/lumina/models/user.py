"""Model user LUMINA."""
from __future__ import annotations

import uuid

from werkzeug.security import check_password_hash, generate_password_hash

from lumina.extensions import db
from lumina.utils.timeutil import iso, utcnow


def _uuid() -> str:
    return str(uuid.uuid4())


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
            "is_verified": self.is_verified,
            "is_active": self.is_active,
            "has_password": self.has_password,
            "created_at": iso(self.created_at),
            "last_login_at": iso(self.last_login_at),
        }

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User {self.email}>"
