"""Sisi perjalanan: jaringan, stasiun, profil kepadatan, dan sel heatmap.

Menjawab F1 (profil jam sibuk), F2 (peta indeks per slot), F3 (rekomendasi jam
berangkat), F4 (rute & interchange), dan F5 (fasilitas stasiun).
"""
from __future__ import annotations

from flask import Blueprint, request

from lumina.data.network import LINES, STATIONS
from lumina.errors import ValidationError
from lumina.services import geoai_service, map_config, places_service
from lumina.utils.api import (
    bool_arg,
    int_arg,
    paginate_list,
    require_slot,
    require_station,
)
from lumina.utils.responses import success_response

geo_bp = Blueprint("geo", __name__, url_prefix="/api")


def _station_summary(station: dict, slot_id: str | None = None) -> dict:
    payload = {
        "id": station["id"],
        "name": station["name"],
        "position": station["position"],
        "line": station["line"],
        "district": station["district"],
        "calibrated": station["calibrated"],
        "interchange": station["interchange"],
        "reliability": geoai_service.reliability_of(station),
    }
    if slot_id:
        index = geoai_service.density_index(station, slot_id)
        payload["slot_id"] = slot_id
        payload["index"] = index
        payload["level"] = geoai_service.crowd_level(index)
    return payload


# --------------------------------------------------------------------------
#  Jaringan (F4)
# --------------------------------------------------------------------------
@geo_bp.get("/network")
def network():
    """Lin, titik interchange, dan koridor kalibrasi sebagai layer konteks."""
    published = map_config.published_stations()
    return success_response(
        "Jaringan transit LUMINA.",
        {
            "lines": [
                {
                    "name": line,
                    "stations": [s["id"] for s in STATIONS if s["line"] == line],
                }
                for line in LINES
            ],
            "interchanges": [
                _station_summary(s) for s in published if s["interchange"]
            ],
            "calibration_corridor": [
                _station_summary(s) for s in published if s["calibrated"]
            ],
            "source": "OpenStreetMap · jaringan transit",
        },
    )


@geo_bp.get("/map/layers")
def map_layers():
    """Layer yang diterbitkan admin lewat Kelola Peta, untuk panel layer pengguna."""
    return success_response("Pengaturan layer peta.", map_config.public_layers())


# --------------------------------------------------------------------------
#  Daftar & detail stasiun
# --------------------------------------------------------------------------
@geo_bp.get("/stations")
def list_stations():
    query = (request.args.get("q") or "").strip().lower()
    line = (request.args.get("line") or "").strip().lower()
    calibrated = bool_arg("calibrated")
    slot = request.args.get("slot")
    slot_id = require_slot(slot) if slot else None

    # Stasiun yang belum diterbitkan admin tidak muncul di daftar maupun peta.
    results = map_config.published_stations()
    if query:
        results = [s for s in results if query in s["name"].lower()]
    if line:
        results = [s for s in results if s["line"].lower() == line]
    if calibrated is not None:
        results = [s for s in results if s["calibrated"] is calibrated]

    items, meta = paginate_list(results, default_per_page=50)
    return success_response(
        f"{meta['total']} stasiun ditemukan.",
        [_station_summary(s, slot_id) for s in items],
        meta={**meta, "lines": LINES},
    )


@geo_bp.get("/stations/compare")
def compare_stations():
    """REQ-F2-04: empat stasiun studi kasus dibandingkan pada slot yang sama."""
    raw = (request.args.get("ids") or "").strip()
    if not raw:
        raise ValidationError(errors={"ids": "Isi minimal dua id stasiun, dipisah koma."})

    ids = [item.strip() for item in raw.split(",") if item.strip()]
    if len(ids) < 2:
        raise ValidationError(errors={"ids": "Perbandingan butuh minimal dua stasiun."})
    if len(ids) > 8:
        raise ValidationError(errors={"ids": "Maksimal 8 stasiun dalam satu perbandingan."})

    stations = [require_station(item) for item in ids]
    slot = request.args.get("slot")

    if slot:
        slot_id = require_slot(slot)
        rows = [_station_summary(s, slot_id) for s in stations]
        rows.sort(key=lambda row: row["index"], reverse=True)
        return success_response(
            f"Perbandingan {len(rows)} stasiun pada slot {slot_id}.",
            rows,
            meta={"slot_id": slot_id, "scale": "Indeks relatif 0–100."},
        )

    return success_response(
        f"Perbandingan {len(stations)} stasiun pada seluruh slot.",
        [geoai_service.station_crowd_profile(s) for s in stations],
        meta={"scale": "Indeks relatif 0–100."},
    )


@geo_bp.get("/stations/<station_id>")
def station_detail(station_id: str):
    """F1 + F5: profil slot, fasilitas, dan metadata keterandalan."""
    station = require_station(station_id)
    profile = geoai_service.station_crowd_profile(station)

    return success_response(
        f"Detail stasiun {station['name']}.",
        {
            **_station_summary(station),
            "crowd_profile": profile,
            "amenities": places_service.station_amenities(station),
            "amenities_source": "OpenStreetMap · POI fasilitas",
        },
    )


@geo_bp.get("/stations/<station_id>/places")
def station_places(station_id: str):
    """Tempat usaha di sekitar stasiun — dipakai fitur singgah saat perjalanan."""
    station = require_station(station_id)
    limit = min(20, max(1, int_arg("limit", 8)))
    places = places_service.nearby_places(station, limit=limit)

    return success_response(
        f"{len(places)} tempat di sekitar {station['name']}.",
        places,
        meta={
            "station_id": station["id"],
            "note": (
                "Daftar diturunkan dari kategori Properti Go dan sinyal kawasan, "
                "bukan direktori usaha terverifikasi."
            ),
        },
    )


@geo_bp.get("/stations/<station_id>/crowd")
def station_crowd(station_id: str):
    """F1 + F3: profil seluruh slot dan rekomendasi jam berangkat."""
    station = require_station(station_id)
    return success_response(
        f"Profil kepadatan {station['name']}.",
        geoai_service.station_crowd_profile(station),
    )


# --------------------------------------------------------------------------
#  Sel heatmap (F2)
# --------------------------------------------------------------------------
@geo_bp.get("/density/cells")
def density_cells():
    slot_id = require_slot(request.args.get("slot"))
    station_id = request.args.get("station_id")

    stations = [require_station(station_id)] if station_id else map_config.published_stations()
    cells = geoai_service.density_cells(slot_id, stations)

    return success_response(
        f"{len(cells)} sel kepadatan pada slot {slot_id}.",
        cells,
        meta={
            "slot_id": slot_id,
            "scale": "Indeks relatif 0–100, bukan jumlah penumpang.",
            "cell_note": (
                "Sel memakai grid heksagonal lokal setara H3 resolusi 9 "
                "(± 0,10 km²) sampai keluaran H3 dari pipeline terhubung."
            ),
        },
    )


@geo_bp.get("/density/geojson")
def density_geojson():
    """Sel yang sama dalam GeoJSON, untuk layer peta yang membaca fitur."""
    slot_id = require_slot(request.args.get("slot"))
    cells = geoai_service.density_cells(slot_id, map_config.published_stations())

    return success_response(
        f"{len(cells)} sel kepadatan (GeoJSON) pada slot {slot_id}.",
        {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "id": cell["cell_id"],
                    "geometry": {
                        "type": "Point",
                        # GeoJSON memakai urutan [lng, lat].
                        "coordinates": [cell["position"][1], cell["position"][0]],
                    },
                    "properties": {
                        "cell_id": cell["cell_id"],
                        "station_id": cell["station_id"],
                        "index": cell["index"],
                        "reliability": cell["reliability"],
                    },
                }
                for cell in cells
            ],
        },
        meta={"slot_id": slot_id},
    )
