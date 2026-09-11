"""Penerbitan JWT (access + refresh)."""
from __future__ import annotations

from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token

from lumina.extensions import db
from lumina.utils.timeutil import utcnow


def _claims(user) -> dict:
    return {
        "email": user.email,
        "name": user.full_name,
        "verified": user.is_verified,
        "tv": user.token_version or 0,
    }


def issue_tokens(user, *, update_last_login: bool = True) -> dict:
    if update_last_login:
        user.last_login_at = utcnow()
        db.session.commit()

    return {
        "access_token": create_access_token(identity=user.id, additional_claims=_claims(user)),
        "refresh_token": create_refresh_token(identity=user.id, additional_claims=_claims(user)),
        "token_type": "Bearer",
        "expires_in": int(current_app.config["JWT_ACCESS_TOKEN_EXPIRES"].total_seconds()),
    }


def issue_access_token(user) -> dict:
    return {
        "access_token": create_access_token(identity=user.id, additional_claims=_claims(user)),
        "token_type": "Bearer",
        "expires_in": int(current_app.config["JWT_ACCESS_TOKEN_EXPIRES"].total_seconds()),
    }
