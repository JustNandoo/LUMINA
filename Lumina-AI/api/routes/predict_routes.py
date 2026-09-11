"""
API Controller: AI Model Real-time Prediction & Explainable AI (SHAP)
Provides low-latency what-if location scenario assessment and feature scoring.
"""

import time
from flask import request
from flask_restx import Namespace, Resource
from src.services.model_inference_service import ModelInferenceService
from src.repositories.analytics_repository import AnalyticsRepository
from api.middleware.auth_middleware import jwt_required
from api.schemas.predict_schemas import create_predict_models

predict_ns = Namespace("predict", description="Inferensi Model AI, Simulasi Spasial & Explainability (SHAP)")
models = create_predict_models(predict_ns)

# Shared singletons
inference_service = ModelInferenceService.get_instance()
analytics_repo = AnalyticsRepository()


@predict_ns.route("/api-point")
@predict_ns.route("/point", doc=False)
class PointPredictionEndpoint(Resource):
    @predict_ns.doc(
        "predict_by_coordinates",
        description="Melakukan inferensi spasial real-time berbasis koordinat geografis (Latitude, Longitude) dan parameter simulasi.<br/>"
                    "Sistem secara otomatis menghitung:<br/>"
                    "1. Uber H3 Index Resolusi 9 (~174 meter)<br/>"
                    "2. Jarak ke stasiun transit terdekat & Indeks Aksesibilitas<br/>"
                    "3. Estimasi Skor Potensi TOD dari model Spatial XGBoost yang telah di-deploy<br/>"
                    "4. Analisis faktor pendorong lokal menggunakan <b>Explainable AI (SHAP)</b><br/>"
                    "5. Rekomendasi sektor usaha dan indeks risiko kemacetan.<br/><br/>"
                    "<b>Memerlukan JWT Token:</b> Klik tombol 'Authorize' di atas dan masukkan token Anda.",
        security="Bearer"
    )
    @predict_ns.expect(models["point_predict_request"], validate=False)
    @predict_ns.response(200, "Inferensi berhasil dilakukan", models["point_predict_response"])
    @predict_ns.response(400, "Parameter koordinat atau data input tidak valid")
    @predict_ns.response(401, "Token autentikasi tidak disertakan atau kadaluarsa")
    @jwt_required
    def post(self):
        """Simulasi & prediksi potensi TOD untuk koordinat lokasi tertentu."""
        payload = request.get_json() or {}

        try:
            lat = float(payload["latitude"])
            lon = float(payload["longitude"])
        except (KeyError, ValueError, TypeError):
            return {
                "status": "error",
                "code": 400,
                "message": "Parameter 'latitude' dan 'longitude' numerik wajib disertakan."
            }, 400

        ruko_count = int(payload.get("ruko_count", 0))
        prop_count = int(payload.get("prop_count", 0))
        struk_count = int(payload.get("struk_count", 0))
        act_count = int(payload.get("act_count", 0))
        traffic_issues = int(payload.get("traffic_issues", 0))

        t0 = time.perf_counter()
        result = inference_service.predict_point(
            lat=lat,
            lon=lon,
            ruko_count=ruko_count,
            prop_count=prop_count,
            struk_count=struk_count,
            act_count=act_count,
            traffic_issues=traffic_issues,
            existing_analytics_repo=analytics_repo
        )
        latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)

        return {
            "status": "success",
            "h3_cell": result["h3_cell"],
            "block_id": result["block_id"],
            "coordinates": result["coordinates"],
            "transit_context": result["transit_context"],
            "evaluation": result["evaluation"],
            "inference_latency_ms": latency_ms
        }, 200


@predict_ns.route("/api-features")
@predict_ns.route("/features", doc=False)
class FeaturePredictionEndpoint(Resource):
    @predict_ns.doc(
        "predict_by_features",
        description="Melakukan inferensi langsung terhadap vektor 28 dimensi fitur spasial numerik.<br/>"
                    "<b>Memerlukan JWT Token:</b> Klik tombol 'Authorize' di atas dan masukkan token Anda.",
        security="Bearer"
    )
    @predict_ns.expect(models["feature_predict_request"], validate=False)
    @predict_ns.response(200, "Inferensi vektor fitur berhasil", models["feature_predict_response"])
    @predict_ns.response(401, "Token autentikasi tidak valid")
    @jwt_required
    def post(self):
        """Inferensi langsung dari nilai matriks fitur spasial numerik."""
        payload = request.get_json() or {}
        try:
            result = inference_service.predict_raw_features(payload)
            return {
                "status": "success",
                "potential_score": result["potential_score"],
                "top_positive_driver": result["top_positive_driver"],
                "top_negative_driver": result["top_negative_driver"],
                "shap_values": result["shap_values"]
            }, 200
        except Exception as e:
            return {
                "status": "error",
                "code": 400,
                "message": f"Gagal menjalankan inferensi: {str(e)}"
            }, 400
