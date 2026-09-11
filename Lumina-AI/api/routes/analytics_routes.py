"""
API Controller: Spatial Analytics & Hexagon Cell Exploration
Provides high-performance querying, pagination, aggregation, and ranking.
"""

import math
from flask import request
from flask_restx import Namespace, Resource
from src.repositories.analytics_repository import AnalyticsRepository
from api.schemas.analytics_schemas import create_analytics_models

analytics_ns = Namespace("analytics", description="Eksplorasi Spasial, Paginasi & Query Analitik H3")
models = create_analytics_models(analytics_ns)

# Shared analytics repository instance
analytics_repo = AnalyticsRepository()


@analytics_ns.route("/api-summary")
@analytics_ns.route("/summary", doc=False)
class AnalyticsSummaryEndpoint(Resource):
    @analytics_ns.doc(
        "get_analytics_summary",
        description="Mengambil statistik ringkasan makro TOD Bandung Raya (total sel, rata-rata skor, sebaran strata & rekomendasi)."
    )
    @analytics_ns.response(200, "Statistik analitik makro berhasil dihitung", models["analytics_summary"])
    def get(self):
        """Ambil ringkasan agregasi metrik makro TOD Bandung Raya."""
        summary_data = analytics_repo.get_summary()
        return summary_data, 200


@analytics_ns.route("/api-cells")
@analytics_ns.route("/cells", doc=False)
class CellsListEndpoint(Resource):
    @analytics_ns.doc(
        "get_paginated_cells",
        description="Mengambil daftar sel heksagon analitik dengan dukungan paginasi, pencarian keyword, filter rentang skor, dan pengurutan dinamis.",
        params={
            "page": "Nomor halaman (default: 1)",
            "limit": "Jumlah item per halaman (default: 20, max: 100)",
            "sort_by": "Kolom pengurutan (default: 'predicted_potential_score', 'dist_to_transit_km', 'ruko_count')",
            "order": "Arah urutan: 'desc' atau 'asc' (default: 'desc')",
            "min_score": "Batas minimum skor potensi TOD",
            "max_score": "Batas maksimum skor potensi TOD",
            "recommendation": "Filter teks rekomendasi sektor",
            "nearest_hub": "Filter nama simpul transit terdekat",
            "search": "Pencarian teks bebas (H3 ID, nama stasiun, rekomendasi)"
        }
    )
    @analytics_ns.response(200, "Daftar sel berhasil difilter dan diambil", models["paginated_cells"])
    def get(self):
        """Ambil data sel analitik H3 dengan filter dan paginasi terstruktur."""
        try:
            page = max(1, int(request.args.get("page", 1)))
        except ValueError:
            page = 1

        try:
            limit = min(100, max(1, int(request.args.get("limit", 20))))
        except ValueError:
            limit = 20

        sort_by = request.args.get("sort_by", "predicted_potential_score")
        order = request.args.get("order", "desc")
        search = request.args.get("search", None)
        recommendation = request.args.get("recommendation", None)
        nearest_hub = request.args.get("nearest_hub", None)

        min_score = None
        if request.args.get("min_score") is not None:
            try: min_score = float(request.args.get("min_score"))
            except ValueError: pass

        max_score = None
        if request.args.get("max_score") is not None:
            try: max_score = float(request.args.get("max_score"))
            except ValueError: pass

        items, total_count = analytics_repo.filter_cells(
            min_score=min_score,
            max_score=max_score,
            recommendation=recommendation,
            nearest_hub=nearest_hub,
            sort_by=sort_by,
            order=order,
            page=page,
            limit=limit,
            search=search
        )

        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

        return {
            "status": "success",
            "meta": {
                "page": page,
                "limit": limit,
                "total_items": total_count,
                "total_pages": total_pages
            },
            "data": items
        }, 200


@analytics_ns.route("/api-cells/<string:cell_id>")
@analytics_ns.route("/cells/<string:cell_id>", doc=False)
class SingleCellDetailEndpoint(Resource):
    @analytics_ns.doc(
        "get_cell_detail_by_id",
        description="Mengambil profil analitik mendalam untuk satu H3 cell ID spesifik (lengkap dengan 46 variabel spasial & faktor pendorong SHAP)."
    )
    @analytics_ns.response(200, "Detail profil sel ditemukan", models["cell_detail"])
    @analytics_ns.response(404, "H3 Cell ID tidak ditemukan")
    def get(self, cell_id: str):
        """Ambil laporan spasial komprehensif untuk satu sel heksagon."""
        cell = analytics_repo.get_cell_by_id(cell_id)
        if not cell:
            return {
                "status": "error",
                "code": 404,
                "message": f"H3 Cell '{cell_id}' tidak terdaftar di wilayah studi Bandung Raya."
            }, 404
        return cell, 200


@analytics_ns.route("/api-top10")
@analytics_ns.route("/top10", doc=False)
class TopTenCellsEndpoint(Resource):
    @analytics_ns.doc(
        "get_top_10_tod_locations",
        description="Mengambil daftar 10 lokasi sel heksagon TOD paling prospektif di Bandung Raya (Zona Emas Prioritas Investasi)."
    )
    @analytics_ns.response(200, "Top 10 lokasi TOD berhasil diambil")
    def get(self):
        """Ambil 10 sel heksagon dengan skor potensi TOD tertinggi di Bandung Raya."""
        top_cells = analytics_repo.get_top_cells(limit=10)
        return {
            "status": "success",
            "total": len(top_cells),
            "data": top_cells
        }, 200
