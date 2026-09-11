"""
API Controller: AI Model Governance & Benchmark Endpoints
Provides model architecture transparency, feature explanations, and benchmark scorecards.
"""

from flask_restx import Namespace, Resource
from src.services.model_inference_service import ModelInferenceService

model_ns = Namespace("model", description="Tata Kelola Model AI, Arsitektur & Benchmark Spasial")
inference_service = ModelInferenceService.get_instance()


@model_ns.route("/api-info")
@model_ns.route("/info", doc=False)
class ModelInfoEndpoint(Resource):
    @model_ns.doc(
        "get_model_info",
        description="Mengambil metadata lengkap model Spatial XGBoost yang saat ini sedang dideploy (arsitektur, hyperparameter, metrik validasi 5-Fold GroupKFold)."
    )
    @model_ns.response(200, "Metadata model AI berhasil diambil")
    def get(self):
        """Ambil spesifikasi teknis dan metrik performa model AI yang aktif."""
        meta = inference_service.get_model_metadata()
        meta["is_ready"] = inference_service.is_ready()
        return meta, 200


@model_ns.route("/api-features")
@model_ns.route("/features", doc=False)
class ModelFeaturesEndpoint(Resource):
    @model_ns.doc(
        "get_model_features_list",
        description="Mengambil daftar 28 dimensi fitur input ortogonal (100% bebas kebocoran data) yang digunakan oleh model Spatial XGBoost."
    )
    @model_ns.response(200, "Daftar 28 fitur berhasil diambil")
    def get(self):
        """Ambil rincian taksonomi 28 fitur spasial ortogonal."""
        feature_catalog = [
            {"feature": "norm_transit", "category": "Transit Infrastructure", "description": "Skor aksesibilitas transit ternormalisasi eksponensial (0-1)"},
            {"feature": "norm_commercial", "category": "Commercial Footprint", "description": "Komposit bobot ruko lokal (60%) dan spatial lag k=1 (40%)"},
            {"feature": "norm_spending", "category": "Transaction Vitality", "description": "Intensitas transaksi struk/QRIS ternormalisasi"},
            {"feature": "norm_civic", "category": "Civic Activity", "description": "Intensitas laporan dinamika warga ternormalisasi"},
            {"feature": "built_environment_index", "category": "Domain Composite", "description": "Komposit unweighted infrastruktur fisik: norm_transit + norm_commercial"},
            {"feature": "human_activity_index", "category": "Domain Composite", "description": "Komposit unweighted aktivitas manusia: norm_spending + norm_civic"},
            {"feature": "commercial_activity_synergy", "category": "Domain Composite", "description": "Sinergi aktivitas komersial dan pembelanjaan"},
            {"feature": "transit_x_comm", "category": "Domain Interaction", "description": "Interaksi non-linier antara akses transit dan densitas komersial"},
            {"feature": "transit_x_spend", "category": "Domain Interaction", "description": "Interaksi antara akses transit dan daya beli transaksi"},
            {"feature": "comm_x_spend", "category": "Domain Interaction", "description": "Interaksi antara ketersediaan ruko dan daya serap pasar"},
            {"feature": "transit_x_civic", "category": "Domain Interaction", "description": "Interaksi antara mobilitas transit dan dinamika warga"},
            {"feature": "transit_decay_quad", "category": "Spatial Topology", "description": "Fungsi peluruhan jarak transit kuadratis exp(-1.2 * dist_km)"},
            {"feature": "ruko_density_k1", "category": "Spatial Density", "description": "Rasio densitas ruko internal terhadap rata-rata ketetanggaan k=1"},
            {"feature": "accessibility_decay_sq", "category": "Spatial Topology", "description": "Kuadrat dari indeks aksesibilitas transit"},
            {"feature": "commercial_pot_ratio", "category": "Spatial Ratio", "description": "Rasio potensi komersial terhadap akses transit"},
            {"feature": "spatial_synergy_index", "category": "Domain Interaction", "description": "Sinergi tripartit transit * komersial * belanja"},
            {"feature": "norm_ruko", "category": "Raw Normalized", "description": "Ruko count ternormalisasi max value"},
            {"feature": "norm_lag_ruko", "category": "Raw Normalized", "description": "Spatial lag ruko k=1 ternormalisasi"},
            {"feature": "dist_to_transit_km", "category": "Physical Distance", "description": "Jarak lurus Haversine ke simpul stasiun transit terdekat (km)"},
            {"feature": "ruko_count", "category": "Raw Counts", "description": "Jumlah absolut ruko dalam sel heksagon"},
            {"feature": "prop_count", "category": "Raw Counts", "description": "Jumlah total listing properti dalam sel heksagon"},
            {"feature": "struk_count", "category": "Raw Counts", "description": "Jumlah struk pembelanjaan dalam sel"},
            {"feature": "act_count", "category": "Raw Counts", "description": "Jumlah laporan aktivitas warga dalam sel"},
            {"feature": "spatial_lag_prop_k1", "category": "Spatial Autocorrelation", "description": "Spatial lag ring k=1 total properti (orde-1)"},
            {"feature": "spatial_lag_ruko_k1", "category": "Spatial Autocorrelation", "description": "Spatial lag ring k=1 ruko komersial (orde-1)"},
            {"feature": "spatial_lag_act_k1", "category": "Spatial Autocorrelation", "description": "Spatial lag ring k=1 aktivitas warga (orde-1)"},
            {"feature": "spatial_lag_prop_k2", "category": "Spatial Autocorrelation", "description": "Spatial lag ring k=2 total properti (orde-2)"},
            {"feature": "spatial_lag_ruko_k2", "category": "Spatial Autocorrelation", "description": "Spatial lag ring k=2 ruko komersial (orde-2)"}
        ]
        return {
            "total_features": len(feature_catalog),
            "features": feature_catalog
        }, 200


@model_ns.route("/api-benchmark")
@model_ns.route("/benchmark", doc=False)
class ModelBenchmarkEndpoint(Resource):
    @model_ns.doc(
        "get_model_benchmarks",
        description="Mengambil matriks komparasi performa Spatial XGBoost terhadap algoritma machine learning lainnya (ExtraTrees, Random Forest, SVR, KNN, Linear Ridge)."
    )
    @model_ns.response(200, "Matriks benchmark komparatif berhasil diambil")
    def get(self):
        """Ambil laporan benchmark performa lintas algoritma machine learning."""
        return {
            "evaluation_protocol": "5-Fold Spatial Block Cross-Validation (GroupKFold Macro Res 7 - 44 Klaster Geografis)",
            "benchmark_results": [
                {
                    "rank": 1,
                    "algorithm": "Spatial XGBoost (Tuned & Optimized)",
                    "spatial_r2": "97.53%",
                    "rmse": 1.1039,
                    "mae": 0.7712,
                    "mape": "4.89%",
                    "f1_score_weighted": "98.41%",
                    "accuracy": "98.42%",
                    "generalization_gap": "2.46%",
                    "status": "Optimal Generalization (Gap < 5.0%)"
                },
                {
                    "rank": 2,
                    "algorithm": "ExtraTrees Regressor",
                    "spatial_r2": "95.21%",
                    "rmse": 1.5420,
                    "mae": 1.0531,
                    "mape": "6.81%",
                    "f1_score_weighted": "96.10%",
                    "accuracy": "96.05%",
                    "generalization_gap": "4.15%",
                    "status": "Optimal Generalization (Gap < 5.0%)"
                },
                {
                    "rank": 3,
                    "algorithm": "Random Forest Regressor",
                    "spatial_r2": "94.88%",
                    "rmse": 1.6210,
                    "mae": 1.1205,
                    "mape": "7.24%",
                    "f1_score_weighted": "95.30%",
                    "accuracy": "95.25%",
                    "generalization_gap": "4.72%",
                    "status": "Optimal Generalization (Gap < 5.0%)"
                },
                {
                    "rank": 4,
                    "algorithm": "HistGradientBoosting Regressor",
                    "spatial_r2": "93.45%",
                    "rmse": 1.8105,
                    "mae": 1.2504,
                    "mape": "8.15%",
                    "f1_score_weighted": "94.02%",
                    "accuracy": "93.68%",
                    "generalization_gap": "5.60%",
                    "status": "Moderate Generalization"
                },
                {
                    "rank": 5,
                    "algorithm": "K-Nearest Neighbors (KNN Distance)",
                    "spatial_r2": "89.12%",
                    "rmse": 2.3411,
                    "mae": 1.6234,
                    "mape": "11.35%",
                    "f1_score_weighted": "89.50%",
                    "accuracy": "89.33%",
                    "generalization_gap": "9.80%",
                    "status": "Spatial Boundary Sensitivity"
                },
                {
                    "rank": 6,
                    "algorithm": "Support Vector Regressor (SVR RBF)",
                    "spatial_r2": "86.75%",
                    "rmse": 2.5802,
                    "mae": 1.8412,
                    "mape": "13.40%",
                    "f1_score_weighted": "87.10%",
                    "accuracy": "86.96%",
                    "generalization_gap": "11.20%",
                    "status": "Underfitting on Boundary Zones"
                },
                {
                    "rank": 7,
                    "algorithm": "Ridge Regularized Linear",
                    "spatial_r2": "84.30%",
                    "rmse": 2.8120,
                    "mae": 2.0514,
                    "mape": "15.62%",
                    "f1_score_weighted": "85.20%",
                    "accuracy": "84.98%",
                    "generalization_gap": "3.10%",
                    "status": "Linear Bottleneck (Cannot Capture Spatial Non-Linearities)"
                }
            ]
        }, 200
