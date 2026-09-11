"""
DTO Schema: Analytics & Summary Models for Swagger UI
"""

from flask_restx import Namespace, fields


def create_analytics_models(ns: Namespace):
    """Mendefinisikan skema Swagger untuk endpoint analitik dan query sel H3."""
    strata_distribution_model = ns.model("StrataDistribution", {
        "high_potential_cells": fields.Integer(description="Jumlah sel potensi tinggi (>30)", example=24),
        "medium_potential_cells": fields.Integer(description="Jumlah sel potensi menengah (15-30)", example=68),
        "low_potential_cells": fields.Integer(description="Jumlah sel potensi rendah (<15)", example=161)
    })

    analytics_summary_model = ns.model("AnalyticsSummary", {
        "total_cells": fields.Integer(description="Total sel heksagon terindeks di Bandung Raya", example=253),
        "average_potential_score": fields.Float(description="Rata-rata skor potensi kelayakan TOD", example=14.82),
        "max_potential_score": fields.Float(description="Skor potensi tertinggi di koridor emas", example=48.91),
        "min_potential_score": fields.Float(description="Skor potensi terendah", example=1.25),
        "strata_distribution": fields.Nested(strata_distribution_model),
        "recommendations_breakdown": fields.Raw(description="Distribusi rekomendasi sektor komersial"),
        "transit_hub_coverage": fields.Raw(description="Jumlah sel per cakupan simpul transit")
    })

    cell_detail_model = ns.model("CellDetail", {
        "h3_cell": fields.String(description="H3 Hexagon Cell Index Resolusi 9", example="898c1479e2fffff"),
        "block_id": fields.String(description="H3 Parent Block Index Resolusi 7", example="878c1479effffff"),
        "centroid_lat": fields.Float(description="Lintang centroid", example=-6.9126),
        "centroid_lon": fields.Float(description="Bujur centroid", example=107.6024),
        "nearest_transit_hub": fields.String(description="Simpul transit terdekat", example="Stasiun Bandung (Hall)"),
        "dist_to_transit_km": fields.Float(description="Jarak transit (km)", example=0.12),
        "transit_accessibility_score": fields.Float(description="Skor aksesibilitas transit (0-100)", example=90.84),
        "prop_count": fields.Integer(description="Total properti", example=8),
        "ruko_count": fields.Integer(description="Jumlah ruko", example=5),
        "sewa_count": fields.Integer(description="Properti disewa", example=4),
        "jual_count": fields.Integer(description="Properti dijual", example=4),
        "struk_count": fields.Integer(description="Jumlah transaksi struk", example=1),
        "qris_count": fields.Integer(description="Jumlah transaksi QRIS", example=1),
        "act_count": fields.Integer(description="Jumlah laporan dinamika warga", example=1),
        "predicted_potential_score": fields.Float(description="Skor potensi hasil estimasi ML", example=45.12),
        "risk_index": fields.Float(description="Indeks risiko", example=10.0),
        "recommendation": fields.String(description="Rekomendasi sektor", example="Zona Emas TOD: Retail Modern / Coffee Shop / Fast-Casual F&B"),
        "top_positive_driver": fields.String(description="Faktor pendorong positif (SHAP)", example="+19.36 via built_environment_index"),
        "top_negative_driver": fields.String(description="Faktor penahan negatif (SHAP)", example="-0.06 via prop_count")
    })

    pagination_meta_model = ns.model("PaginationMeta", {
        "page": fields.Integer(description="Halaman aktif", example=1),
        "limit": fields.Integer(description="Item per halaman", example=20),
        "total_items": fields.Integer(description="Total item sesuai filter", example=253),
        "total_pages": fields.Integer(description="Total halaman", example=13)
    })

    paginated_cells_response = ns.model("PaginatedCellsResponse", {
        "status": fields.String(example="success"),
        "meta": fields.Nested(pagination_meta_model),
        "data": fields.List(fields.Nested(cell_detail_model))
    })

    return {
        "analytics_summary": analytics_summary_model,
        "cell_detail": cell_detail_model,
        "paginated_cells": paginated_cells_response
    }
