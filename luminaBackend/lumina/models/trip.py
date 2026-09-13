"""Rute yang disimpan pengguna dari halaman Home.

Yang disimpan hanya pasangan stasiun dan slot pilihan, bukan hasil perhitungan
rutenya. Lintasan, durasi, dan indeks kepadatan selalu dihitung ulang saat rute
dibuka, jadi rute tersimpan tidak pernah menampilkan angka yang sudah basi.
"""
from __future__ import annotations

import uuid

from lumina.extensions import db
from lumina.utils.timeutil import iso, utcnow


def _uuid() -> str:
    return str(uuid.uuid4())


class SavedRoute(db.Model):
    __tablename__ = "saved_routes"
    # Satu rute per pasangan asal–tujuan per akun; menyimpan ulang cukup
    # memperbarui slotnya, bukan menambah baris ganda.
    __table_args__ = (
        db.UniqueConstraint("user_id", "origin_id", "destination_id", name="uq_saved_route_pair"),
    )

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    origin_id = db.Column(db.String(60), nullable=False)
    destination_id = db.Column(db.String(60), nullable=False)
    slot_id = db.Column(db.String(20), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    def to_dict(self) -> dict:
        from lumina.data.network import find_station, slot_by_id

        origin = find_station(self.origin_id)
        destination = find_station(self.destination_id)
        slot = slot_by_id(self.slot_id) if self.slot_id else None
        return {
            "id": self.id,
            "origin_id": self.origin_id,
            "origin_name": origin["name"] if origin else self.origin_id,
            "destination_id": self.destination_id,
            "destination_name": destination["name"] if destination else self.destination_id,
            "slot_id": self.slot_id,
            "slot_label": slot["label"] if slot else None,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
