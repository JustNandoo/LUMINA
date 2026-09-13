"""Helper yang dipakai bersama seluruh blueprint /api."""
from __future__ import annotations

from functools import wraps

from flask import request
from flask_jwt_extended import current_user, jwt_required

from lumina.errors import ForbiddenError, NotFoundError, ValidationError

MAX_PER_PAGE = 100


def admin_required(fn):
    """Batasi endpoint ke akun ber-role admin.

    Menutup TODO di frontend: sebelum ada kolom role, setiap akun yang login
    masih bisa membuka /admin.
    """

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        if current_user is None or not current_user.is_admin:
            raise ForbiddenError(
                "Halaman ini hanya untuk admin.", error_code="ADMIN_ONLY"
            )
        return fn(*args, **kwargs)

    return wrapper


def paginate(query, default_per_page: int = 20) -> tuple[list, dict]:
    """Potong query SQLAlchemy memakai ?page= dan ?per_page=."""
    page = max(1, int_arg("page", 1))
    per_page = min(MAX_PER_PAGE, max(1, int_arg("per_page", default_per_page)))

    total = query.order_by(None).count()
    items = query.limit(per_page).offset((page - 1) * per_page).all()
    last_page = max(1, -(-total // per_page))

    return items, {
        "page": page,
        "per_page": per_page,
        "total": total,
        "last_page": last_page,
    }


def paginate_list(items: list, default_per_page: int = 20) -> tuple[list, dict]:
    """Versi paginasi untuk data yang sudah berupa list Python."""
    page = max(1, int_arg("page", 1))
    per_page = min(MAX_PER_PAGE, max(1, int_arg("per_page", default_per_page)))
    total = len(items)
    start = (page - 1) * per_page

    return items[start : start + per_page], {
        "page": page,
        "per_page": per_page,
        "total": total,
        "last_page": max(1, -(-total // per_page)),
    }


def int_arg(name: str, default: int) -> int:
    try:
        return int(request.args.get(name, default))
    except (TypeError, ValueError):
        return default


def bool_arg(name: str) -> bool | None:
    raw = request.args.get(name)
    if raw is None or raw == "":
        return None
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def require_slot(slot_id: str | None, field: str = "slot") -> str:
    """Validasi id slot waktu; slot di luar tiga slot tervalidasi ditolak."""
    from lumina.data.network import SLOT_IDS

    slot = (slot_id or "").strip().lower()
    if not slot:
        raise ValidationError(errors={field: "Slot waktu wajib diisi."})
    if slot not in SLOT_IDS:
        raise ValidationError(
            errors={field: f"Slot tidak dikenal. Pilihan: {', '.join(SLOT_IDS)}."}
        )
    return slot


def require_station(station_id: str | None):
    """Ambil stasiun dari dataset jaringan, atau 404."""
    from lumina.data.network import find_station

    station = find_station(station_id)
    if station is None:
        raise NotFoundError(f"Stasiun '{station_id}' tidak ada di jaringan LUMINA.")
    from lumina.services.map_config import with_overrides

    return with_overrides(station)


def get_or_404(model, record_id: str, label: str = "Data"):
    from lumina.extensions import db

    record = db.session.get(model, record_id)
    if record is None:
        raise NotFoundError(f"{label} tidak ditemukan.")
    return record


def clean_str(value, field: str, max_length: int, required: bool = True) -> str | None:
    text = " ".join(str(value or "").split())
    if not text:
        if required:
            raise ValidationError(errors={field: "Wajib diisi."})
        return None
    if len(text) > max_length:
        raise ValidationError(errors={field: f"Maksimal {max_length} karakter."})
    return text
