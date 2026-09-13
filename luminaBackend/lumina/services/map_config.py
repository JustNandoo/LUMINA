"""Jembatan antara halaman Kelola Peta di panel admin dan peta yang dilihat pengguna.

Dataset jaringan (`lumina.data.network`) tetap menjadi sumber kebenaran untuk
lintasan dan perhitungan rute. Tabel `map_points` dan `map_layers` hanya
menimpa apa yang *ditampilkan*: stasiun yang belum terbit disembunyikan dari
daftar dan peta, nama yang diubah admin ikut dipakai, dan layer yang tidak
berstatus publik tidak muncul di panel layer pengguna.

Kalau tabelnya belum ada atau database sedang bermasalah, semuanya jatuh ke
dataset jaringan apa adanya — peta pengguna tidak boleh ikut mati karena
pengaturan admin gagal dibaca.
"""
from __future__ import annotations

import logging

from lumina.data.network import STATIONS
from lumina.extensions import db

log = logging.getLogger(__name__)


def _layer_defaults() -> list[tuple]:
    from lumina.seeds import LAYERS

    return LAYERS


def _point_rows() -> dict | None:
    from lumina.models import MapPoint

    try:
        rows = db.session.query(MapPoint.id, MapPoint.name, MapPoint.published).all()
    except Exception:  # noqa: BLE001 - peta pengguna tetap jalan tanpa pengaturan admin
        db.session.rollback()
        log.exception("Gagal membaca map_points; memakai dataset jaringan apa adanya.")
        return None
    return {row.id: row for row in rows} or None


def published_stations() -> list[dict]:
    """Stasiun yang boleh tampil ke pengguna, dengan nama hasil suntingan admin."""
    points = _point_rows()
    if points is None:
        return STATIONS

    result = []
    for station in STATIONS:
        point = points.get(station["id"])
        # Stasiun baru di dataset yang belum ditarik admin tetap tampil.
        if point is None:
            result.append(station)
        elif point.published:
            result.append(
                station if point.name == station["name"] else {**station, "name": point.name}
            )
    return result


def with_overrides(station: dict) -> dict:
    """Satu stasiun dengan nama dari admin; dipakai halaman detail."""
    from lumina.models import MapPoint

    try:
        point = db.session.get(MapPoint, station["id"])
    except Exception:  # noqa: BLE001
        db.session.rollback()
        return station
    if point is None or point.name == station["name"]:
        return station
    return {**station, "name": point.name}


def ensure_layers() -> None:
    """Tambahkan layer bawaan yang belum ada tanpa menimpa pilihan admin."""
    from lumina.models import MapLayer

    added = False
    for layer_id, label, description, visible, status in _layer_defaults():
        if db.session.get(MapLayer, layer_id) is None:
            db.session.add(MapLayer(
                id=layer_id, label=label, description=description,
                visible=visible, status=status,
            ))
            added = True
    if added:
        db.session.commit()


def public_layers() -> list[dict]:
    """Status tiap layer untuk pengguna: `available` = terbit, `visible` = menyala bawaan."""
    from lumina.models import MapLayer

    try:
        rows = {layer.id: layer for layer in db.session.query(MapLayer).all()}
    except Exception:  # noqa: BLE001
        db.session.rollback()
        rows = {}

    layers = []
    for layer_id, label, _description, visible, status in _layer_defaults():
        row = rows.get(layer_id)
        status = row.status if row else status
        available = status == "publik"
        layers.append({
            "id": layer_id,
            "label": row.label if row else label,
            "status": status,
            "available": available,
            "visible": available and (row.visible if row else visible),
        })
    return layers
