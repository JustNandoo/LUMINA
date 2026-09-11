"""Exception khusus aplikasi + registrasi error handler global."""
from __future__ import annotations

from werkzeug.exceptions import HTTPException

from lumina.utils.responses import error_response


class ApiError(Exception):
    """Error yang sengaja dilempar oleh service/route dan aman ditampilkan."""

    status_code = 400
    error_code = "BAD_REQUEST"
    message = "Permintaan tidak valid."

    def __init__(self, message=None, status_code=None, error_code=None, errors=None, meta=None):
        super().__init__(message or self.message)
        self.message = message or self.message
        self.status_code = status_code or self.status_code
        self.error_code = error_code or self.error_code
        self.errors = errors
        self.meta = meta


class ValidationError(ApiError):
    status_code = 422
    error_code = "VALIDATION_ERROR"
    message = "Data yang dikirim tidak valid."


class AuthError(ApiError):
    status_code = 401
    error_code = "UNAUTHORIZED"
    message = "Email atau password salah."


class ForbiddenError(ApiError):
    status_code = 403
    error_code = "FORBIDDEN"
    message = "Kamu tidak punya akses ke resource ini."


class NotFoundError(ApiError):
    status_code = 404
    error_code = "NOT_FOUND"
    message = "Data tidak ditemukan."


class ConflictError(ApiError):
    status_code = 409
    error_code = "CONFLICT"
    message = "Data sudah ada."


class RateLimitError(ApiError):
    status_code = 429
    error_code = "TOO_MANY_REQUESTS"
    message = "Terlalu banyak permintaan. Coba lagi nanti."


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def _handle_api_error(exc: ApiError):
        return error_response(
            exc.message,
            status=exc.status_code,
            error_code=exc.error_code,
            errors=exc.errors,
            meta=exc.meta,
        )

    @app.errorhandler(HTTPException)
    def _handle_http_error(exc: HTTPException):
        codes = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            413: "PAYLOAD_TOO_LARGE",
            415: "UNSUPPORTED_MEDIA_TYPE",
            429: "TOO_MANY_REQUESTS",
        }
        return error_response(
            exc.description or exc.name,
            status=exc.code or 500,
            error_code=codes.get(exc.code, "HTTP_ERROR"),
        )

    @app.errorhandler(Exception)
    def _handle_unexpected(exc: Exception):
        app.logger.exception("Unhandled exception: %s", exc)
        message = str(exc) if app.debug else "Terjadi kesalahan pada server."
        return error_response(message, status=500, error_code="INTERNAL_SERVER_ERROR")
