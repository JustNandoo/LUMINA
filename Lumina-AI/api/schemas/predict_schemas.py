"""
DTO Schema: AI Model Inference & Explainability Models for Swagger UI
"""

from flask_restx import Namespace, fields


def create_predict_models(ns: Namespace):
    """Mendefinisikan skema Swagger untuk endpoint inferensi model AI."""
    point_predict_request = ns.model("PointPredictRequest", {
        "latitude": fields.Float(
            required=True,
            description="Garis lintang lokasi (latitude WGS84)",
            example=-6.9126
        ),
        "longitude": fields.Float(
            required=True,
            description="Garis bujur lokasi (longitude WGS84)",
            example=107.6024
        ),
        "ruko_count": fields.Integer(
            required=False,
            default=0,
            description="Jumlah unit ruko komersial di lokasi (0 - 20)",
            example=4
        ),
        "prop_count": fields.Integer(
            required=False,
            default=0,
            description="Total listing properti komersial & residensial",
            example=8
        ),
        "struk_count": fields.Integer(
            required=False,
            default=0,
            description="Intensitas transaksi struk / QRIS tercatat",
            example=1
        ),
        "act_count": fields.Integer(
            required=False,
            default=0,
            description="Jumlah laporan dinamika aktivitas warga",
            example=1
        ),
        "traffic_issues": fields.Integer(
            required=False,
            default=0,
            description="Jumlah isu kemacetan lalu lintas terdeteksi",
            example=0
        )
    })

    transit_context_model = ns.model("TransitContext", {
        "nearest_transit_hub": fields.String(description="Nama simpul transit terdekat", example="Stasiun Bandung (Hall)"),
        "hub_type": fields.String(description="Kategori moda transit", example="KAI Jarak Jauh & Commuter Line"),
        "distance_km": fields.Float(description="Jarak lurus Haversine ke stasiun (km)", example=0.15),
        "accessibility_score": fields.Float(description="Indeks aksesibilitas eksponensial (0-100)", example=88.69)
    })

    evaluation_model = ns.model("EvaluationModel", {
        "potential_score": fields.Float(description="Skor kelayakan TOD prediksi Spatial XGBoost (0-100)", example=42.5),
        "stratum": fields.String(description="Kategori strata potensi komersial", example="High Potential (Zona Emas TOD)"),
        "risk_index": fields.Float(description="Indeks risiko kemacetan dan aksesibilitas (0-100)", example=15.0),
        "recommendation": fields.String(
            description="Rekomendasi sektor bisnis berbasis domain intelligence",
            example="Zona Emas TOD: Retail Modern / Coffee Shop / Fast-Casual F&B"
        ),
        "top_positive_driver": fields.String(description="Faktor pendorong positif utama (SHAP)", example="+18.42 via built_environment_index"),
        "top_negative_driver": fields.String(description="Faktor penahan negatif utama (SHAP)", example="-0.12 via prop_count")
    })

    coordinates_model = ns.model("CoordinatesModel", {
        "latitude": fields.Float(description="Garis lintang", example=-6.9126),
        "longitude": fields.Float(description="Garis bujur", example=107.6024)
    })

    point_predict_response = ns.model("PointPredictResponse", {
        "status": fields.String(description="Status inferensi", example="success"),
        "h3_cell": fields.String(description="H3 Hexagon Cell Index Resolusi 9", example="898c1479e2fffff"),
        "block_id": fields.String(description="H3 Parent Block Index Resolusi 7", example="878c1479effffff"),
        "coordinates": fields.Nested(coordinates_model, description="Koordinat input"),
        "transit_context": fields.Nested(transit_context_model, description="Konteks transit"),
        "evaluation": fields.Nested(evaluation_model, description="Hasil evaluasi AI spasial"),
        "inference_latency_ms": fields.Float(description="Waktu komputasi model AI dalam milidetik", example=4.5)
    })

    feature_predict_request = ns.model("FeaturePredictRequest", {
        "norm_transit": fields.Float(required=True, example=0.88),
        "norm_commercial": fields.Float(required=True, example=0.65),
        "norm_spending": fields.Float(required=True, example=0.50),
        "norm_civic": fields.Float(required=True, example=0.50),
        "built_environment_index": fields.Float(required=True, example=1.53),
        "human_activity_index": fields.Float(required=True, example=1.00),
        "commercial_activity_synergy": fields.Float(required=True, example=1.15),
        "dist_to_transit_km": fields.Float(required=True, example=0.25),
        "ruko_count": fields.Float(required=True, example=5.0)
    })

    feature_predict_response = ns.model("FeaturePredictResponse", {
        "status": fields.String(description="Status", example="success"),
        "potential_score": fields.Float(description="Skor potensi TOD", example=41.8),
        "top_positive_driver": fields.String(example="+17.21 via built_environment_index"),
        "top_negative_driver": fields.String(example="-0.30 via dist_to_transit_km"),
        "shap_values": fields.Raw(description="Peta kontribusi SHAP untuk seluruh fitur")
    })

    return {
        "point_predict_request": point_predict_request,
        "point_predict_response": point_predict_response,
        "feature_predict_request": feature_predict_request,
        "feature_predict_response": feature_predict_response
    }
