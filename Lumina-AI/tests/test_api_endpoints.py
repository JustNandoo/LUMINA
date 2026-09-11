"""
Integration & Regression Test Suite for LUMINA REST API & AI Serving
Validates OpenAPI docs, JWT Authentication, WebGIS Layers, and Real-time Inference.
"""

import unittest
import json
from api import create_app
from src.services.auth_service import AuthService


class TestLuminaApiEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Inisialisasi test client Flask dalam mode testing."""
        cls.app = create_app("testing")
        cls.client = cls.app.test_client()

        # Generate token valid untuk pengujian
        secret = cls.app.config["JWT_SECRET_KEY"]
        cls.analyst_token = AuthService.create_access_token("analyst", "analyst", secret, 3600)
        cls.admin_token = AuthService.create_access_token("admin", "admin", secret, 3600)
        cls.expired_token = AuthService.create_access_token("analyst", "analyst", secret, -10)

    def test_01_health_check(self):
        """Memastikan endpoint /health merespon 200 dengan status healthy."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertTrue(data.get("model_loaded"))

    def test_02_swagger_docs_and_specs(self):
        """Memastikan Swagger UI dan OpenAPI JSON schema dapat diakses dengan benar."""
        docs_res = self.client.get("/docs")
        self.assertEqual(docs_res.status_code, 200)

        spec_res = self.client.get("/api/v1/swagger.json")
        self.assertEqual(spec_res.status_code, 200)
        spec = spec_res.get_json()
        self.assertIn("paths", spec)
        self.assertIn("/predict/api-point", spec["paths"])
        self.assertIn("/webgis/api-geojson", spec["paths"])
        self.assertIn("/auth/api-login", spec["paths"])

    def test_03_auth_login_success(self):
        """Memastikan login dengan kredensial valid mengembalikan JWT token."""
        response = self.client.post("/api/v1/auth/api-login", json={
            "username": "analyst",
            "password": "lumina2026"
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
        self.assertEqual(data["user"]["role"], "analyst")

    def test_04_auth_login_invalid(self):
        """Memastikan login dengan password salah ditolak dengan 401."""
        response = self.client.post("/api/v1/auth/api-login", json={
            "username": "analyst",
            "password": "wrong_password_123"
        })
        self.assertEqual(response.status_code, 401)

    def test_05_auth_protected_endpoint_without_token(self):
        """Memastikan akses endpoint terproteksi tanpa token ditolak dengan 401."""
        response = self.client.get("/api/v1/auth/api-me")
        self.assertEqual(response.status_code, 401)

    def test_06_auth_protected_endpoint_with_valid_token(self):
        """Memastikan akses endpoint terproteksi dengan Bearer token valid berhasil."""
        headers = {"Authorization": f"Bearer {self.analyst_token}"}
        response = self.client.get("/api/v1/auth/api-me", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["user"]["username"], "analyst")

    def test_07_auth_expired_token(self):
        """Memastikan token yang kadaluarsa ditolak dengan 401 dan pesan informatif."""
        headers = {"Authorization": f"Bearer {self.expired_token}"}
        response = self.client.get("/api/v1/auth/api-me", headers=headers)
        self.assertEqual(response.status_code, 401)
        data = response.get_json()
        self.assertIn("kadaluarsa", data.get("message", "").lower())

    def test_08_webgis_geojson_layer(self):
        """Memastikan endpoint /webgis/api-geojson mengembalikan FeatureCollection valid."""
        response = self.client.get("/api/v1/webgis/api-geojson")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("type"), "FeatureCollection")
        self.assertGreater(len(data.get("features", [])), 0)

        # Uji filter min_score
        filtered_res = self.client.get("/api/v1/webgis/api-geojson?min_score=35")
        self.assertEqual(filtered_res.status_code, 200)
        filtered_features = filtered_res.get_json().get("features", [])
        for feat in filtered_features:
            self.assertGreaterEqual(feat["properties"]["potential_score"], 35.0)

    def test_09_webgis_transit_stations(self):
        """Memastikan endpoint /webgis/api-transit-hubs mengembalikan titik stasiun transit."""
        response = self.client.get("/api/v1/webgis/api-transit-hubs")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("type"), "FeatureCollection")
        self.assertGreaterEqual(len(data.get("features", [])), 10)

    def test_10_analytics_summary(self):
        """Memastikan endpoint /analytics/api-summary menghitung agregasi makro secara akurat."""
        response = self.client.get("/api/v1/analytics/api-summary")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertGreater(data.get("total_cells", 0), 0)
        self.assertIn("average_potential_score", data)
        self.assertIn("strata_distribution", data)

    def test_11_analytics_cells_pagination(self):
        """Memastikan endpoint /analytics/api-cells mendukung paginasi dan pengurutan."""
        response = self.client.get("/api/v1/analytics/api-cells?page=1&limit=5&sort_by=predicted_potential_score&order=desc")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data["data"]), 5)
        self.assertEqual(data["meta"]["page"], 1)
        self.assertEqual(data["meta"]["limit"], 5)
        # Pastikan terurut menurun
        scores = [item["predicted_potential_score"] for item in data["data"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_12_analytics_top10(self):
        """Memastikan endpoint /analytics/api-top10 mengembalikan 10 sel skor tertinggi."""
        response = self.client.get("/api/v1/analytics/api-top10")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data.get("data", [])), 10)

    def test_13_model_info_and_benchmark(self):
        """Memastikan metadata model dan scorecard benchmark dapat diakses."""
        info_res = self.client.get("/api/v1/model/api-info")
        self.assertEqual(info_res.status_code, 200)
        info = info_res.get_json()
        self.assertEqual(info.get("features_count"), 28)
        self.assertIn("spatial_validation", info)

        bm_res = self.client.get("/api/v1/model/api-benchmark")
        self.assertEqual(bm_res.status_code, 200)
        bm = bm_res.get_json()
        self.assertIn("benchmark_results", bm)

    def test_14_predict_point_inference(self):
        """Memastikan endpoint inferensi spasial /predict/api-point bekerja real-time dengan SHAP."""
        headers = {"Authorization": f"Bearer {self.analyst_token}"}
        payload = {
            "latitude": -6.9126,
            "longitude": 107.6024,
            "ruko_count": 5,
            "prop_count": 12,
            "struk_count": 1,
            "act_count": 1,
            "traffic_issues": 0
        }
        response = self.client.post("/api/v1/predict/api-point", json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("h3_cell", data)
        self.assertIn("transit_context", data)
        self.assertEqual(data["transit_context"]["nearest_transit_hub"], "Stasiun Bandung (Hall)")
        self.assertIn("evaluation", data)
        self.assertIn("potential_score", data["evaluation"])
        self.assertIn("recommendation", data["evaluation"])
        self.assertIn("top_positive_driver", data["evaluation"])
        self.assertIn("inference_latency_ms", data)
        self.assertLess(data["inference_latency_ms"], 500)  # Sub-second latency verification


if __name__ == "__main__":
    unittest.main()
