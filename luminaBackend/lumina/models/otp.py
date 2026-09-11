"""Model penyimpanan kode OTP (disimpan dalam bentuk hash)."""
from __future__ import annotations

from lumina.extensions import db
from lumina.utils.timeutil import utcnow


class OtpPurpose:
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"

    ALL = (EMAIL_VERIFICATION, PASSWORD_RESET)


class OtpCode(db.Model):
    __tablename__ = "otp_codes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    purpose = db.Column(db.String(32), nullable=False, index=True)
    code_hash = db.Column(db.String(128), nullable=False)

    expires_at = db.Column(db.DateTime, nullable=False)
    consumed_at = db.Column(db.DateTime, nullable=True)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    max_attempts = db.Column(db.Integer, nullable=False, default=5)

    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow, index=True)

    user = db.relationship("User", back_populates="otp_codes")

    # ------------------------------------------------------------- keadaan
    @property
    def is_expired(self) -> bool:
        return utcnow() >= self.expires_at

    @property
    def is_consumed(self) -> bool:
        return self.consumed_at is not None

    @property
    def is_locked(self) -> bool:
        return self.attempts >= self.max_attempts

    @property
    def is_usable(self) -> bool:
        return not (self.is_expired or self.is_consumed or self.is_locked)

    def consume(self) -> None:
        self.consumed_at = utcnow()

    def __repr__(self) -> str:  # pragma: no cover
        return f"<OtpCode {self.purpose} user={self.user_id}>"
