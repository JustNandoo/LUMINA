"""
LUMINA AI & WebGIS Backend Application Factory
Production-ready Flask application with Flask-RESTX Swagger OpenAPI and JWT Security.
"""

from flask import Flask, redirect, jsonify
from flask_cors import CORS
from flask_restx import Api
from api.config import get_config
from api.routes.auth_routes import auth_ns
from api.routes.webgis_routes import webgis_ns
from api.routes.analytics_routes import analytics_ns
from api.routes.model_routes import model_ns
from api.routes.predict_routes import predict_ns
from src.services.model_inference_service import ModelInferenceService


def create_app(config_name: str = "default") -> Flask:
    """Application Factory untuk menginisialisasi Flask App dengan arsitektur modular."""
    app = Flask(__name__)
    config_obj = get_config(config_name)
    app.config.from_object(config_obj)

    # 1. Inisialisasi Cross-Origin Resource Sharing (CORS) untuk kemudahan integrasi WebGIS Frontend
    CORS(app, resources={r"/*": {"origins": "*"}})

    # 2. Definisi Spesifikasi Keamanan Swagger (Bearer Token JWT)
    authorizations = {
        "Bearer": {
            "type": "apiKey",
            "in": "header",
            "name": "Authorization",
            "description": "Gunakan format: Bearer <token>. Login di /api/v1/auth/api-login untuk mendapatkan token."
        }
    }

    # 3. Inisialisasi Flask-RESTX API & Swagger OpenAPI Generator
    api_title = "Lumina GEO-AI REST API"
    api_description = (
        "Backend REST API dan inferensi AI spasial untuk analisis Transit-Oriented Development (TOD) Bandung Raya.\n\n"
        "Layanan ini menyediakan layer spasial GeoJSON untuk WebGIS, analitik sel heksagon Uber H3, "
        "serta estimasi potensi TOD berbasis model Spatial XGBoost.\n\n"
        "**Kredensial Akun:**\n\n"
        "| Username | Password | Role |\n"
        "| :--- | :--- | :--- |\n"
        "| `analyst` | `lumina2026` | Analyst (Query data, analitik, dan inferensi) |\n"
        "| `admin` | `superlumina2026` | Admin (Akses penuh) |\n"
        "| `developer` | `radiant2026` | Developer (Integrasi client WebGIS) |"
    )

    api = Api(
        app,
        version="1.0.0",
        title=api_title,
        description=api_description,
        doc="/docs",
        prefix="/api/v1",
        authorizations=authorizations,
        security="Bearer"
    )

    # 4. Registrasi Namespaces (Modular Routes)
    api.add_namespace(auth_ns, path="/auth")
    api.add_namespace(webgis_ns, path="/webgis")
    api.add_namespace(analytics_ns, path="/analytics")
    api.add_namespace(model_ns, path="/model")
    api.add_namespace(predict_ns, path="/predict")

    # 5. Endpoint Utilitas & Pengalihan
    @app.route("/")
    def index():
        """Alihkan route root langsung ke dokumentasi interaktif Swagger UI."""
        return redirect("/docs")

    @app.route("/health")
    def health():
        """Health check endpoint untuk Docker / Cloud Deployment probes."""
        is_model_ready = ModelInferenceService.get_instance().is_ready()
        return jsonify({
            "status": "healthy",
            "service": "lumina-backend-api",
            "model_loaded": is_model_ready,
            "version": "1.0.0"
        }), 200

    # 6. Warm up Model Singleton saat aplikasi start
    with app.app_context():
        inference_svc = ModelInferenceService.get_instance(config_obj.MODEL_FILE_PATH)
        if not inference_svc.is_ready():
            app.logger.warning("[WARNING] Model Spatial XGBoost belum dapat dimuat saat startup.")

    return app
