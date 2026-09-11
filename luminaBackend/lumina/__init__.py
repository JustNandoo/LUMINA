"""LUMINA backend - application factory."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from flask import Flask, jsonify

from config import get_config
from lumina.errors import register_error_handlers
from lumina.extensions import cors, db, jwt, mail, migrate
from lumina.utils.responses import error_response

__version__ = "1.0.0"


def create_app(config_name: str | None = None) -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(get_config(config_name))

    _configure_logging(app)
    _init_extensions(app)
    _register_jwt_callbacks(app)
    _register_blueprints(app)
    register_error_handlers(app)
    _register_cli(app)

    with app.app_context():
        # SQLite dev: tabel dibuat otomatis. Untuk production pakai `flask db upgrade`.
        if app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"):
            db.create_all()

    return app


# --------------------------------------------------------------------------
def _configure_logging(app: Flask) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)s in %(module)s: %(message)s"))
    app.logger.handlers = [handler]
    app.logger.setLevel(logging.DEBUG if app.debug else logging.INFO)


def _init_extensions(app: Flask) -> None:
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)

    origins = app.config["CORS_ORIGINS"] or ["*"]
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    )


def _register_blueprints(app: Flask) -> None:
    from lumina.auth import auth_bp

    app.register_blueprint(auth_bp)

    @app.get("/")
    def index():
        return jsonify(
            {
                "success": True,
                "name": "LUMINA API",
                "version": __version__,
                "docs": "/api/health",
            }
        )

    @app.get("/api/health")
    def health():
        from lumina.services.mail_service import mail_is_live
        from sqlalchemy import text

        try:
            db.session.execute(text("SELECT 1"))
            database_ok = True
        except Exception:  # pragma: no cover
            database_ok = False

        return jsonify(
            {
                "success": True,
                "status": "ok" if database_ok else "degraded",
                "version": __version__,
                "database": "connected" if database_ok else "error",
                "mail": "smtp" if mail_is_live() else "dev-console",
                "time": datetime.now(timezone.utc).isoformat(),
            }
        )

    if app.config.get("ENABLE_EMAIL_PREVIEW"):
        _register_email_preview(app)


def _register_email_preview(app: Flask) -> None:
    """Preview desain email di browser: /dev/emails/otp_verification"""
    from types import SimpleNamespace

    from flask import render_template, request

    from lumina.services.mail_service import base_context
    from lumina.utils.timeutil import fmt_datetime, fmt_time, seconds_from_now, utcnow

    TEMPLATES = ("otp_verification", "otp_reset", "welcome", "password_changed")

    @app.get("/dev/emails")
    def email_index():
        links = "".join(
            f'<li style="margin:8px 0"><a style="color:#35D6F5" href="/dev/emails/{t}">{t}</a></li>'
            for t in TEMPLATES
        )
        return (
            '<body style="background:#060E1B;color:#A9BBD3;font-family:system-ui;padding:40px">'
            "<h2 style='color:#fff'>LUMINA - Preview Email</h2><ul>" + links + "</ul></body>"
        )

    @app.get("/dev/emails/<template_name>")
    def email_preview(template_name: str):
        if template_name not in TEMPLATES:
            return error_response("Template tidak ditemukan.", 404, "NOT_FOUND")
        expires_at = seconds_from_now(app.config["OTP_TTL_SECONDS"])
        demo_user = SimpleNamespace(
            full_name=request.args.get("name", "Zaidan Alif"),
            email=request.args.get("email", "zaidan@gmail.com"),
        )
        ctx = base_context(
            user=demo_user,
            code=request.args.get("code", "417093"),
            ttl_minutes=max(1, round(app.config["OTP_TTL_SECONDS"] / 60)),
            expires_at_local=fmt_time(expires_at),
            changed_at_local=fmt_datetime(utcnow()),
            reset_url=f"{app.config['FRONTEND_URL']}{app.config['FRONTEND_RESET_PATH']}?token=demo-token",
        )
        return render_template(f"emails/{template_name}.html", **ctx)


def _register_jwt_callbacks(app: Flask) -> None:
    from lumina.models import TokenBlocklist, User

    @jwt.user_identity_loader
    def _user_identity(user_id):
        return str(user_id)

    @jwt.user_lookup_loader
    def _user_lookup(_jwt_header, jwt_data):
        return db.session.get(User, jwt_data["sub"])

    @jwt.token_in_blocklist_loader
    def _token_revoked(_jwt_header, jwt_data) -> bool:
        if TokenBlocklist.is_revoked(jwt_data["jti"]):
            return True
        user = db.session.get(User, jwt_data.get("sub"))
        if user is None:
            return False
        # Token dari sebelum reset/ganti password/logout-all -> dianggap dicabut.
        return jwt_data.get("tv") != (user.token_version or 0)

    @jwt.expired_token_loader
    def _expired(_h, _p):
        return error_response("Sesi kamu sudah habis. Silakan login lagi.", 401, "TOKEN_EXPIRED")

    @jwt.invalid_token_loader
    def _invalid(reason):
        return error_response(f"Token tidak valid: {reason}", 401, "TOKEN_INVALID")

    @jwt.unauthorized_loader
    def _unauthorized(reason):
        return error_response(
            "Kamu harus login untuk mengakses halaman ini.", 401, "AUTHORIZATION_REQUIRED",
            errors={"detail": reason},
        )

    @jwt.revoked_token_loader
    def _revoked(_h, _p):
        return error_response("Token sudah dicabut. Silakan login lagi.", 401, "TOKEN_REVOKED")

    @jwt.needs_fresh_token_loader
    def _needs_fresh(_h, _p):
        return error_response("Butuh login ulang untuk aksi ini.", 401, "FRESH_TOKEN_REQUIRED")

    @jwt.user_lookup_error_loader
    def _user_missing(_h, _p):
        return error_response("Akun tidak ditemukan.", 401, "USER_NOT_FOUND")


def _register_cli(app: Flask) -> None:
    import click

    @app.cli.command("init-db")
    def init_db():
        """Buat semua tabel database."""
        db.create_all()
        click.echo("Database siap.")

    @app.cli.command("reset-db")
    def reset_db():
        """Hapus lalu buat ulang semua tabel (HATI-HATI: data hilang)."""
        if not click.confirm("Semua data akan dihapus. Lanjutkan?"):
            return
        db.drop_all()
        db.create_all()
        click.echo("Database di-reset.")

    @app.cli.command("purge-tokens")
    def purge_tokens():
        """Bersihkan token kedaluwarsa dari blocklist."""
        from lumina.models import TokenBlocklist

        click.echo(f"{TokenBlocklist.purge_expired()} token dihapus.")

    @app.cli.command("verify-user")
    @click.argument("email")
    def verify_user(email):
        """Tandai user sebagai terverifikasi (bypass OTP saat development)."""
        from lumina.models import User

        user = User.find_by_email(email)
        if user is None:
            click.echo(f"User {email} tidak ditemukan.")
            return
        user.mark_verified()
        db.session.commit()
        click.echo(f"{email} sekarang terverifikasi.")
