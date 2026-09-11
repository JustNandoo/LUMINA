"""
API Controller: WebGIS GeoJSON Layer Endpoints
Enables frontend developers (Leaflet, Mapbox GL, Deck.gl, MAPID) to fetch map layers via simple GET requests.
"""

from flask import request
from flask_restx import Namespace, Resource
from src.repositories.analytics_repository import AnalyticsRepository
from api.schemas.webgis_schemas import create_webgis_models

webgis_ns = Namespace("webgis", description="WebGIS & GeoJSON Spatial Map Layers")
models = create_webgis_models(webgis_ns)

# Shared analytics repository instance
analytics_repo = AnalyticsRepository()


@webgis_ns.route("/api-geojson")
@webgis_ns.route("/geojson", doc=False)
class WebGisGeoJsonEndpoint(Resource):
    @webgis_ns.doc(
        "get_webgis_geojson",
        description="Mengambil GeoJSON FeatureCollection poligon sel heksagon H3 (Resolusi 9) Bandung Raya.<br/>"
                    "Dapat langsung di-load oleh pustaka WebGIS seperti Mapbox GL JS, Leaflet, Deck.gl, atau MAPID.<br/>"
                    "<b>Teman developer tinggal GET URL ini langsung ke map!</b>",
        params={
            "min_score": "Filter skor potensi minimal (misal: 30.0 untuk zona emas)",
            "recommendation": "Filter sektor rekomendasi (misal: 'Zona Emas' atau 'Koridor Komersial')",
            "nearest_hub": "Filter berdasarkan nama simpul stasiun transit terdekat"
        }
    )
    @webgis_ns.response(200, "GeoJSON FeatureCollection berhasil diambil", models["geojson_collection"])
    def get(self):
        """Ambil FeatureCollection poligon heksagon H3 untuk layer peta WebGIS."""
        min_score_raw = request.args.get("min_score", None)
        recommendation = request.args.get("recommendation", None)
        nearest_hub = request.args.get("nearest_hub", None)

        min_score = float(min_score_raw) if min_score_raw is not None else None

        geojson_data = analytics_repo.get_webgis_geojson(
            min_score=min_score,
            recommendation=recommendation,
            nearest_hub=nearest_hub
        )
        return geojson_data, 200


@webgis_ns.route("/api-transit-hubs")
@webgis_ns.route("/transit-hubs", doc=False)
class TransitStationsEndpoint(Resource):
    @webgis_ns.doc(
        "get_transit_stations_geojson",
        description="Mengambil GeoJSON titik simpul 12 stasiun transit utama di Bandung Raya (KAI, Commuter, Whoosh, Bus Terminal)."
    )
    @webgis_ns.response(200, "GeoJSON stasiun transit berhasil diambil", models["geojson_collection"])
    def get(self):
        """Ambil FeatureCollection titik stasiun transit antarmoda Bandung Raya."""
        return analytics_repo.get_transit_stations_geojson(), 200


@webgis_ns.route("/api-hexagons/<string:cell_id>")
@webgis_ns.route("/hexagons/<string:cell_id>", doc=False)
class HexagonDetailEndpoint(Resource):
    @webgis_ns.doc(
        "get_single_hexagon_geojson",
        description="Mengambil poligon GeoJSON tunggal untuk satu H3 cell ID tertentu."
    )
    @webgis_ns.response(200, "Poligon GeoJSON sel ditemukan", models["geojson_feature"])
    @webgis_ns.response(404, "H3 Cell ID tidak ditemukan di dataset Bandung")
    def get(self, cell_id: str):
        """Ambil fitur poligon GeoJSON untuk sel heksagon spesifik."""
        full_geojson = analytics_repo.get_webgis_geojson()
        for feat in full_geojson.get("features", []):
            if feat.get("properties", {}).get("h3_cell") == cell_id:
                return feat, 200

        return {
            "status": "error",
            "code": 404,
            "message": f"H3 Cell '{cell_id}' tidak ditemukan di dataset Bandung."
        }, 404
