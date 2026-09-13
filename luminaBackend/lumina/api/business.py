"""F7 — Insight Potensi Ekonomi Kawasan.

Skor potensi dan indeks risiko disusun sebagai indeks komposit berbobot dengan
formula yang ikut dikirim ke klien, bukan sebagai prediksi pendapatan. Lihat
catatan arsitektural PRD §9: ekosistem MAPID mencatat pengeluaran konsumen
(Struk Go), bukan pendapatan gerai, sehingga tidak ada label omzet untuk
melatih model prediksi pendapatan.
"""
from __future__ import annotations

from flask import Blueprint, request

from lumina.data.network import BUSINESS_CATEGORIES
from lumina.services import geoai_service, map_config
from lumina.utils.api import int_arg, paginate_list, require_station
from lumina.utils.responses import success_response

business_bp = Blueprint("business", __name__, url_prefix="/api/business")


@business_bp.get("/categories")
def list_categories():
    """REQ-F7-02: daftar kategori bersumber dari atribut Properti Go."""
    return success_response(
        f"{len(BUSINESS_CATEGORIES)} kategori usaha.",
        BUSINESS_CATEGORIES,
    )


@business_bp.get("/areas")
def list_areas():
    query = (request.args.get("q") or "").strip().lower()
    min_score = int_arg("min_score", 0)
    max_risk = int_arg("max_risk", 100)

    areas = [geoai_service.area_potential(station) for station in map_config.published_stations()]
    if query:
        areas = [
            area for area in areas
            if query in area["name"].lower() or query in area["district"].lower()
        ]
    areas = [
        area for area in areas
        if area["potential_score"] >= min_score and area["risk_index"] <= max_risk
    ]
    areas.sort(key=lambda area: area["potential_score"], reverse=True)

    items, meta = paginate_list(areas, default_per_page=25)
    return success_response(
        f"{meta['total']} kawasan memenuhi filter.",
        items,
        meta={
            **meta,
            "filters": {"min_score": min_score, "max_risk": max_risk},
            "scale": "Indeks komposit 0–100, bukan proyeksi pendapatan.",
        },
    )


@business_bp.get("/areas/<area_id>")
def area_detail(area_id: str):
    """Skor potensi, indeks risiko, bukti, dan rekomendasi kategori."""
    station = require_station(area_id)
    potential = geoai_service.area_potential(station)
    categories = geoai_service.category_recommendations(station)

    return success_response(
        f"Potensi kawasan {station['name']}.",
        {
            **potential,
            "categories": categories,
            "viable_count": sum(1 for item in categories if item["viable"]),
            "condition_note": (
                "Kategori ditandai berpeluang hanya bila permintaan tinggi, "
                "pesaing sejenis sedikit, dan tersedia ruang dengan kategori sesuai."
            ),
        },
    )


@business_bp.get("/areas/<area_id>/categories")
def area_categories(area_id: str):
    """REQ-F7-04: tiap rekomendasi membawa bukti permintaan, persaingan, ruang."""
    station = require_station(area_id)
    categories = geoai_service.category_recommendations(station)
    only_viable = (request.args.get("viable") or "").strip().lower() in {"1", "true", "yes"}
    if only_viable:
        categories = [item for item in categories if item["viable"]]

    return success_response(
        f"{len(categories)} kategori untuk {station['name']}.",
        categories,
        meta={"station_id": station["id"], "reliability": geoai_service.reliability_of(station)},
    )


@business_bp.get("/heatmap")
def heatmap():
    """Titik potensi untuk layer heat pada halaman Business Potential."""
    areas = [geoai_service.area_potential(station) for station in map_config.published_stations()]
    return success_response(
        f"{len(areas)} titik potensi kawasan.",
        [
            {
                "id": area["station_id"],
                "name": area["name"],
                "position": area["position"],
                "score": area["potential_score"],
                "risk_index": area["risk_index"],
                "reliability": area["reliability"],
            }
            for area in areas
        ],
        meta={"scale": "Indeks komposit 0–100."},
    )
