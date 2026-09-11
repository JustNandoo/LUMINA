"""Daftar JWT yang sudah dicabut (logout / rotasi refresh token)."""
from __future__ import annotations

from lumina.extensions import db
from lumina.utils.timeutil import utcnow


class TokenBlocklist(db.Model):
    __tablename__ = "token_blocklist"

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(64), nullable=False, unique=True, index=True)
    token_type = db.Column(db.String(16), nullable=False)
    user_id = db.Column(db.String(36), nullable=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    @classmethod
    def revoke(cls, jwt_payload: dict) -> None:
        from datetime import datetime, timezone

        exp = jwt_payload.get("exp")
        expires_at = (
            datetime.fromtimestamp(exp, tz=timezone.utc).replace(tzinfo=None) if exp else None
        )
        existing = db.session.execute(
            db.select(cls).filter_by(jti=jwt_payload["jti"])
        ).scalar_one_or_none()
        if existing:
            return
        db.session.add(
            cls(
                jti=jwt_payload["jti"],
                token_type=jwt_payload.get("type", "access"),
                user_id=jwt_payload.get("sub"),
                expires_at=expires_at,
            )
        )

    @classmethod
    def is_revoked(cls, jti: str) -> bool:
        return (
            db.session.execute(db.select(cls.id).filter_by(jti=jti)).scalar_one_or_none()
            is not None
        )

    @classmethod
    def purge_expired(cls) -> int:
        now = utcnow()
        deleted = db.session.query(cls).filter(cls.expires_at.isnot(None), cls.expires_at < now).delete()
        db.session.commit()
        return deleted
