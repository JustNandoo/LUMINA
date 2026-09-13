"""Model untuk sisi admin: peran, paket B2B, mitra, survei, dan data peta."""
from __future__ import annotations

import uuid

from lumina.extensions import db
from lumina.utils.timeutil import iso, utcnow


def _uuid() -> str:
    return str(uuid.uuid4())


class TimestampMixin:
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)


class Role(TimestampMixin, db.Model):
    __tablename__ = "roles"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(60), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)

    @property
    def is_system(self) -> bool:
        """Peran yang dipakai kolom `users.role`; menghapus atau mengganti namanya
        memutus hubungan antara daftar peran dan akun yang memegangnya."""
        from lumina.models.user import ROLE_CODES

        return (self.name or "").strip().lower() in ROLE_CODES

    def to_dict(self) -> dict:
        from lumina.models.user import User

        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "system": self.is_system,
            "user_count": db.session.query(User)
            .filter(db.func.lower(User.role) == self.name.lower())
            .count(),
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }


class B2BPackage(TimestampMixin, db.Model):
    __tablename__ = "b2b_packages"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    price = db.Column(db.Integer, nullable=False, default=0)
    export_quota = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    partners = db.relationship("B2BPartner", back_populates="package", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "export_quota": self.export_quota,
            "is_active": self.is_active,
            "partner_count": self.partners.count(),
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }


class B2BPartner(TimestampMixin, db.Model):
    __tablename__ = "b2b_partners"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    company = db.Column(db.String(160), nullable=False)
    email = db.Column(db.String(255), nullable=False, index=True)
    package_id = db.Column(db.String(36), db.ForeignKey("b2b_packages.id"), nullable=True)
    export_quota = db.Column(db.Integer, nullable=False, default=0)
    export_used = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default="active")

    package = db.relationship("B2BPackage", back_populates="partners")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "company": self.company,
            "email": self.email,
            "package_id": self.package_id,
            "package_name": self.package.name if self.package else None,
            "export_quota": self.export_quota,
            "export_used": self.export_used,
            "status": self.status,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }


class SurveyPoint(TimestampMixin, db.Model):
    """Satu observasi lapangan MAPID APPS — dasar kalibrasi indeks (M-SURVEY)."""

    __tablename__ = "survey_points"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    station_id = db.Column(db.String(60), nullable=False, index=True)
    station_detail = db.Column(db.String(160), nullable=True)
    slot_id = db.Column(db.String(20), nullable=False)
    observed_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    crowd_score = db.Column(db.Integer, nullable=False, default=0)  # 1..5
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    cell_id = db.Column(db.String(60), nullable=True)
    officer = db.Column(db.String(120), nullable=True)
    note = db.Column(db.Text, nullable=True)
    photo_url = db.Column(db.String(512), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="on_review")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "station_id": self.station_id,
            "station_detail": self.station_detail,
            "slot_id": self.slot_id,
            "observed_at": iso(self.observed_at),
            "crowd_score": self.crowd_score,
            "crowd_label": f"{self.crowd_score}/5",
            "position": [self.latitude, self.longitude]
            if self.latitude is not None and self.longitude is not None
            else None,
            "cell_id": self.cell_id,
            "officer": self.officer,
            "note": self.note,
            "photo_url": self.photo_url,
            "status": self.status,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }


class MapPoint(TimestampMixin, db.Model):
    """Titik yang tampil di peta pengguna; admin mengatur publikasinya."""

    __tablename__ = "map_points"

    id = db.Column(db.String(60), primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    kind = db.Column(db.String(20), nullable=False, default="Stasiun")
    published = db.Column(db.Boolean, nullable=False, default=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "position": [self.latitude, self.longitude],
            "kind": self.kind,
            "published": self.published,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }


class MapLayer(TimestampMixin, db.Model):
    __tablename__ = "map_layers"

    id = db.Column(db.String(60), primary_key=True)
    label = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    visible = db.Column(db.Boolean, nullable=False, default=True)
    status = db.Column(db.String(20), nullable=False, default="publik")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "description": self.description,
            "visible": self.visible,
            "status": self.status,
            "updated_at": iso(self.updated_at),
        }
