"""Sisi admin: pengelolaan pengguna, peran, paket B2B, mitra, survei, dan peta.

Seluruh endpoint di sini wajib role admin. Sebelum ada kolom `role`, frontend
membiarkan setiap akun yang login membuka /admin — guard `admin_required`
menutup celah itu di sisi server, yang merupakan satu-satunya sisi yang mengikat.
"""
from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import current_user

from lumina.data.network import STATIONS
from lumina.errors import ConflictError, ForbiddenError, ValidationError
from lumina.extensions import db
from lumina.models.user import ROLE_CODES, role_from_code
from lumina.models import (
    B2BPackage,
    B2BPartner,
    MapLayer,
    MapPoint,
    Role,
    Subscription,
    SurveyPoint,
    User,
)
from lumina.utils.api import (
    admin_required,
    bool_arg,
    clean_str,
    get_or_404,
    paginate,
    require_slot,
    require_station,
)
from lumina.services import map_config
from lumina.utils.responses import success_response
from lumina.utils.validators import check_email, get_json_body

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

SURVEY_STATUSES = {"on_review", "valid", "rejected"}
PARTNER_STATUSES = {"active", "suspended", "trial"}
LAYER_STATUSES = {"publik", "draf", "internal"}


# --------------------------------------------------------------------------
#  Ringkasan dasbor
# --------------------------------------------------------------------------
@admin_bp.get("/summary")
@admin_required
def summary():
    survey_total = db.session.query(SurveyPoint).count()
    survey_valid = db.session.query(SurveyPoint).filter_by(status="valid").count()

    return success_response(
        "Ringkasan dasbor admin.",
        {
            "users": {
                "total": db.session.query(User).count(),
                "verified": db.session.query(User).filter_by(is_verified=True).count(),
                "admins": db.session.query(User).filter_by(role="admin").count(),
            },
            "partners": {
                "total": db.session.query(B2BPartner).count(),
                "active": db.session.query(B2BPartner).filter_by(status="active").count(),
            },
            "subscriptions": {
                plan_id: db.session.query(Subscription).filter_by(plan_id=plan_id).count()
                for plan_id in ("explorer", "commercial", "enterprise")
            },
            "survey": {
                "total": survey_total,
                "valid": survey_valid,
                # 84 titik pengamatan terjadwal (PRD §8).
                "target": 84,
                "progress_percent": round(survey_valid / 84 * 100, 1) if survey_valid else 0.0,
            },
            "map": {
                "points": db.session.query(MapPoint).count(),
                "published": db.session.query(MapPoint).filter_by(published=True).count(),
                "layers": db.session.query(MapLayer).count(),
            },
        },
    )


# --------------------------------------------------------------------------
#  Pengguna
# --------------------------------------------------------------------------
@admin_bp.get("/users")
@admin_required
def list_users():
    query = db.session.query(User)
    search = (request.args.get("q") or "").strip().lower()
    role = (request.args.get("role") or "").strip().lower()
    if role.isdigit():
        role = role_from_code(role) or role
    active = bool_arg("is_active")

    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(db.func.lower(User.full_name).like(like), db.func.lower(User.email).like(like))
        )
    if role:
        query = query.filter(db.func.lower(User.role) == role)
    if active is not None:
        query = query.filter(User.is_active.is_(active))

    items, meta = paginate(query.order_by(User.created_at.desc()))
    return success_response(
        f"{meta['total']} pengguna.", [item.to_dict() for item in items], meta=meta
    )


@admin_bp.patch("/users/<user_id>")
@admin_required
def update_user(user_id: str):
    user = get_or_404(User, user_id, "Pengguna")
    body = get_json_body()

    # Peran boleh dikirim sebagai nama ("admin") atau kode (2) — keduanya
    # menunjuk hal yang sama, dan klien bebas memakai yang paling cocok.
    if "role" in body or "role_code" in body:
        if "role_code" in body:
            role = role_from_code(body.get("role_code"))
            if role is None:
                raise ValidationError(
                    errors={"role_code": "Kode peran harus 1 (user), 2 (admin), atau 3 (partner)."}
                )
        else:
            role = (body.get("role") or "").strip().lower()
            if role not in ROLE_CODES:
                raise ValidationError(errors={"role": "Role harus user, admin, atau partner."})
        # Admin terakhir tidak boleh menurunkan dirinya sendiri dan mengunci
        # seluruh sisi admin.
        if user.id == current_user.id and role != "admin":
            raise ForbiddenError("Kamu tidak bisa melepas role admin milikmu sendiri.")
        user.role = role

    if "is_active" in body:
        is_active = bool(body.get("is_active"))
        if user.id == current_user.id and not is_active:
            raise ForbiddenError("Kamu tidak bisa menonaktifkan akunmu sendiri.")
        user.is_active = is_active
        if not is_active:
            user.revoke_all_sessions()

    if "full_name" in body:
        user.full_name = clean_str(body.get("full_name"), "full_name", 120)

    if "email" in body:
        email = check_email(body.get("email"))
        existing = User.find_by_email(email)
        if existing and existing.id != user.id:
            raise ConflictError("Email sudah dipakai akun lain.")
        user.email = email

    db.session.commit()
    return success_response("Pengguna diperbarui.", user.to_dict())


@admin_bp.delete("/users/<user_id>")
@admin_required
def delete_user(user_id: str):
    user = get_or_404(User, user_id, "Pengguna")
    if user.id == current_user.id:
        raise ForbiddenError("Kamu tidak bisa menghapus akunmu sendiri.")

    db.session.delete(user)
    db.session.commit()
    return success_response("Pengguna dihapus.", {"id": user_id})


# --------------------------------------------------------------------------
#  Peran
# --------------------------------------------------------------------------
@admin_bp.get("/roles")
@admin_required
def list_roles():
    items, meta = paginate(db.session.query(Role).order_by(Role.created_at))
    return success_response(
        f"{meta['total']} peran.", [item.to_dict() for item in items], meta=meta
    )


@admin_bp.post("/roles")
@admin_required
def create_role():
    body = get_json_body()
    name = clean_str(body.get("name"), "name", 60)

    if db.session.execute(db.select(Role).filter(db.func.lower(Role.name) == name.lower())).scalar_one_or_none():
        raise ConflictError("Peran dengan nama itu sudah ada.")

    role = Role(name=name, description=clean_str(body.get("description"), "description", 255, required=False))
    db.session.add(role)
    db.session.commit()
    return success_response("Peran dibuat.", role.to_dict(), status=201)


@admin_bp.patch("/roles/<role_id>")
@admin_required
def update_role(role_id: str):
    role = get_or_404(Role, role_id, "Peran")
    body = get_json_body()

    if "name" in body:
        name = clean_str(body.get("name"), "name", 60)
        if role.is_system and name.lower() != role.name.lower():
            raise ForbiddenError("Nama peran sistem tidak bisa diubah karena dipakai akun pengguna.")
        duplicate = db.session.execute(
            db.select(Role).filter(db.func.lower(Role.name) == name.lower(), Role.id != role.id)
        ).scalar_one_or_none()
        if duplicate:
            raise ConflictError("Peran dengan nama itu sudah ada.")
        role.name = name
    if "description" in body:
        role.description = clean_str(body.get("description"), "description", 255, required=False)

    db.session.commit()
    return success_response("Peran diperbarui.", role.to_dict())


@admin_bp.delete("/roles/<role_id>")
@admin_required
def delete_role(role_id: str):
    role = get_or_404(Role, role_id, "Peran")
    if role.is_system:
        raise ForbiddenError("Peran sistem (User, Admin, Partner) tidak bisa dihapus.")
    db.session.delete(role)
    db.session.commit()
    return success_response("Peran dihapus.", {"id": role_id})


# --------------------------------------------------------------------------
#  Paket B2B
# --------------------------------------------------------------------------
@admin_bp.get("/b2b-packages")
@admin_required
def list_packages():
    items, meta = paginate(db.session.query(B2BPackage).order_by(B2BPackage.created_at))
    return success_response(
        f"{meta['total']} paket B2B.", [item.to_dict() for item in items], meta=meta
    )


@admin_bp.post("/b2b-packages")
@admin_required
def create_package():
    body = get_json_body()
    name = clean_str(body.get("name"), "name", 80)

    if db.session.execute(db.select(B2BPackage).filter(db.func.lower(B2BPackage.name) == name.lower())).scalar_one_or_none():
        raise ConflictError("Paket dengan nama itu sudah ada.")

    package = B2BPackage(
        name=name,
        description=clean_str(body.get("description"), "description", 255, required=False),
        price=_non_negative_int(body, "price"),
        export_quota=_non_negative_int(body, "export_quota"),
        is_active=bool(body.get("is_active", True)),
    )
    db.session.add(package)
    db.session.commit()
    return success_response("Paket B2B dibuat.", package.to_dict(), status=201)


@admin_bp.patch("/b2b-packages/<package_id>")
@admin_required
def update_package(package_id: str):
    package = get_or_404(B2BPackage, package_id, "Paket B2B")
    body = get_json_body()

    if "name" in body:
        package.name = clean_str(body.get("name"), "name", 80)
    if "description" in body:
        package.description = clean_str(body.get("description"), "description", 255, required=False)
    if "price" in body:
        package.price = _non_negative_int(body, "price")
    if "export_quota" in body:
        package.export_quota = _non_negative_int(body, "export_quota")
    if "is_active" in body:
        package.is_active = bool(body.get("is_active"))

    db.session.commit()
    return success_response("Paket B2B diperbarui.", package.to_dict())


@admin_bp.delete("/b2b-packages/<package_id>")
@admin_required
def delete_package(package_id: str):
    package = get_or_404(B2BPackage, package_id, "Paket B2B")
    if package.partners.count():
        raise ConflictError("Paket masih dipakai mitra. Pindahkan mitranya lebih dulu.")

    db.session.delete(package)
    db.session.commit()
    return success_response("Paket B2B dihapus.", {"id": package_id})


# --------------------------------------------------------------------------
#  Mitra B2B
# --------------------------------------------------------------------------
@admin_bp.get("/b2b-partners")
@admin_required
def list_partners():
    query = db.session.query(B2BPartner)
    search = (request.args.get("q") or "").strip().lower()
    status = (request.args.get("status") or "").strip().lower()

    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(
                db.func.lower(B2BPartner.company).like(like),
                db.func.lower(B2BPartner.email).like(like),
            )
        )
    if status:
        query = query.filter(B2BPartner.status == status)

    items, meta = paginate(query.order_by(B2BPartner.created_at.desc()))
    return success_response(
        f"{meta['total']} mitra B2B.", [item.to_dict() for item in items], meta=meta
    )


@admin_bp.post("/b2b-partners")
@admin_required
def create_partner():
    body = get_json_body()
    package_id = body.get("package_id")
    if package_id:
        get_or_404(B2BPackage, package_id, "Paket B2B")

    partner = B2BPartner(
        company=clean_str(body.get("company"), "company", 160),
        email=check_email(body.get("email")),
        package_id=package_id,
        export_quota=_non_negative_int(body, "export_quota"),
        status=_partner_status(body.get("status", "active")),
    )
    db.session.add(partner)
    db.session.commit()
    return success_response("Mitra B2B dibuat.", partner.to_dict(), status=201)


@admin_bp.patch("/b2b-partners/<partner_id>")
@admin_required
def update_partner(partner_id: str):
    partner = get_or_404(B2BPartner, partner_id, "Mitra B2B")
    body = get_json_body()

    if "company" in body:
        partner.company = clean_str(body.get("company"), "company", 160)
    if "email" in body:
        partner.email = check_email(body.get("email"))
    if "package_id" in body:
        package_id = body.get("package_id")
        if package_id:
            get_or_404(B2BPackage, package_id, "Paket B2B")
        partner.package_id = package_id
    if "export_quota" in body:
        partner.export_quota = _non_negative_int(body, "export_quota")
    if "export_used" in body:
        partner.export_used = _non_negative_int(body, "export_used")
    if "status" in body:
        partner.status = _partner_status(body.get("status"))

    db.session.commit()
    return success_response("Mitra B2B diperbarui.", partner.to_dict())


@admin_bp.delete("/b2b-partners/<partner_id>")
@admin_required
def delete_partner(partner_id: str):
    partner = get_or_404(B2BPartner, partner_id, "Mitra B2B")
    db.session.delete(partner)
    db.session.commit()
    return success_response("Mitra B2B dihapus.", {"id": partner_id})


def _partner_status(value) -> str:
    status = (value or "active").strip().lower()
    if status not in PARTNER_STATUSES:
        raise ValidationError(
            errors={"status": f"Status harus salah satu dari: {', '.join(sorted(PARTNER_STATUSES))}."}
        )
    return status


# --------------------------------------------------------------------------
#  Data survei (M-SURVEY)
# --------------------------------------------------------------------------
@admin_bp.get("/survey-points")
@admin_required
def list_survey_points():
    query = db.session.query(SurveyPoint)
    station_id = (request.args.get("station_id") or "").strip().lower()
    status = (request.args.get("status") or "").strip().lower()

    if station_id:
        query = query.filter(SurveyPoint.station_id == station_id)
    if status:
        query = query.filter(SurveyPoint.status == status)

    items, meta = paginate(query.order_by(SurveyPoint.observed_at.desc()))
    return success_response(
        f"{meta['total']} titik survei.",
        [item.to_dict() for item in items],
        meta={**meta, "target": 84},
    )


@admin_bp.post("/survey-points")
@admin_required
def create_survey_point():
    body = get_json_body()
    score = int_body(body, "crowd_score", 1, 5)
    station = require_station(clean_str(body.get("station_id"), "station_id", 60).lower())
    latitude = _float_or_none(body.get("latitude"))
    longitude = _float_or_none(body.get("longitude"))
    # Tanpa koordinat GPS, titik survei ditaruh di stasiunnya supaya tetap
    # tampil pada layer "Titik survei" di Kelola Peta.
    if latitude is None or longitude is None:
        latitude, longitude = station["position"]

    point = SurveyPoint(
        station_id=station["id"],
        station_detail=clean_str(body.get("station_detail"), "station_detail", 160, required=False),
        slot_id=require_slot(body.get("slot_id"), field="slot_id"),
        crowd_score=score,
        latitude=latitude,
        longitude=longitude,
        cell_id=clean_str(body.get("cell_id"), "cell_id", 60, required=False),
        officer=clean_str(body.get("officer"), "officer", 120, required=False),
        note=body.get("note"),
        photo_url=clean_str(body.get("photo_url"), "photo_url", 512, required=False),
        status=_survey_status(body.get("status", "on_review")),
    )
    db.session.add(point)
    db.session.commit()
    return success_response("Titik survei dicatat.", point.to_dict(), status=201)


@admin_bp.patch("/survey-points/<point_id>")
@admin_required
def update_survey_point(point_id: str):
    point = get_or_404(SurveyPoint, point_id, "Titik survei")
    body = get_json_body()

    if "status" in body:
        point.status = _survey_status(body.get("status"))
    if "crowd_score" in body:
        point.crowd_score = int_body(body, "crowd_score", 1, 5)
    if "note" in body:
        point.note = body.get("note")
    if "officer" in body:
        point.officer = clean_str(body.get("officer"), "officer", 120, required=False)
    if "slot_id" in body:
        point.slot_id = require_slot(body.get("slot_id"), field="slot_id")

    db.session.commit()
    return success_response("Titik survei diperbarui.", point.to_dict())


@admin_bp.delete("/survey-points/<point_id>")
@admin_required
def delete_survey_point(point_id: str):
    point = get_or_404(SurveyPoint, point_id, "Titik survei")
    db.session.delete(point)
    db.session.commit()
    return success_response("Titik survei dihapus.", {"id": point_id})


def _survey_status(value) -> str:
    status = (value or "on_review").strip().lower()
    if status not in SURVEY_STATUSES:
        raise ValidationError(
            errors={"status": f"Status harus salah satu dari: {', '.join(sorted(SURVEY_STATUSES))}."}
        )
    return status


def int_body(body: dict, field: str, low: int, high: int) -> int:
    try:
        value = int(body.get(field))
    except (TypeError, ValueError):
        raise ValidationError(errors={field: f"Harus angka {low}–{high}."})
    if not low <= value <= high:
        raise ValidationError(errors={field: f"Harus angka {low}–{high}."})
    return value


def _non_negative_int(body: dict, field: str) -> int:
    try:
        return max(0, int(body.get(field) or 0))
    except (TypeError, ValueError):
        raise ValidationError(errors={field: "Harus berupa angka."})


def _float_or_none(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


# --------------------------------------------------------------------------
#  Pengelolaan peta
# --------------------------------------------------------------------------
@admin_bp.get("/map/points")
@admin_required
def list_map_points():
    query = db.session.query(MapPoint)
    published = bool_arg("published")
    if published is not None:
        query = query.filter(MapPoint.published.is_(published))

    items, meta = paginate(query.order_by(MapPoint.name), default_per_page=50)
    return success_response(
        f"{meta['total']} titik peta.", [item.to_dict() for item in items], meta=meta
    )


@admin_bp.patch("/map/points/<point_id>")
@admin_required
def update_map_point(point_id: str):
    point = get_or_404(MapPoint, point_id, "Titik peta")
    body = get_json_body()

    if "name" in body:
        point.name = clean_str(body.get("name"), "name", 120)
    if "published" in body:
        point.published = bool(body.get("published"))
    if "kind" in body:
        point.kind = clean_str(body.get("kind"), "kind", 20)
    if "latitude" in body and "longitude" in body:
        latitude = _float_or_none(body.get("latitude"))
        longitude = _float_or_none(body.get("longitude"))
        if latitude is None or longitude is None:
            raise ValidationError(errors={"latitude": "Koordinat harus berupa angka."})
        point.latitude, point.longitude = latitude, longitude

    db.session.commit()
    return success_response("Titik peta diperbarui.", point.to_dict())


@admin_bp.get("/map/layers")
@admin_required
def list_map_layers():
    map_config.ensure_layers()
    layers = db.session.query(MapLayer).order_by(MapLayer.label).all()
    return success_response(
        f"{len(layers)} layer peta.", [layer.to_dict() for layer in layers]
    )


@admin_bp.patch("/map/layers/<layer_id>")
@admin_required
def update_map_layer(layer_id: str):
    layer = get_or_404(MapLayer, layer_id, "Layer peta")
    body = get_json_body()

    if "label" in body:
        layer.label = clean_str(body.get("label"), "label", 120)
    if "description" in body:
        layer.description = clean_str(body.get("description"), "description", 255, required=False)
    if "visible" in body:
        layer.visible = bool(body.get("visible"))
    if "status" in body:
        status = (body.get("status") or "").strip().lower()
        if status not in LAYER_STATUSES:
            raise ValidationError(
                errors={"status": f"Status harus salah satu dari: {', '.join(sorted(LAYER_STATUSES))}."}
            )
        layer.status = status

    db.session.commit()
    return success_response("Layer peta diperbarui.", layer.to_dict())


@admin_bp.post("/map/sync-stations")
@admin_required
def sync_stations():
    """Tarik stasiun dari dataset jaringan menjadi titik peta yang bisa dikelola."""
    created = 0
    for station in STATIONS:
        if db.session.get(MapPoint, station["id"]) is None:
            db.session.add(MapPoint(
                id=station["id"],
                name=station["name"],
                latitude=station["position"][0],
                longitude=station["position"][1],
                kind="Stasiun",
                published=True,
            ))
            created += 1

    db.session.commit()
    return success_response(
        f"{created} titik stasiun baru ditambahkan.",
        {"created": created, "total": db.session.query(MapPoint).count()},
    )
