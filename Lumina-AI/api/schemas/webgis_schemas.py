"""
DTO Schema: WebGIS GeoJSON Models for Swagger UI
"""

from flask_restx import Namespace, fields


def create_webgis_models(ns: Namespace):
    """Mendefinisikan skema Swagger untuk endpoint layer WebGIS GeoJSON."""
    geojson_feature_model = ns.model("GeoJsonFeature", {
        "type": fields.String(example="Feature"),
        "geometry": fields.Raw(description="OGC GeoJSON Geometry (Polygon/Point)"),
        "properties": fields.Raw(description="Spatial attributes and TOD metrics")
    })

    geojson_collection_model = ns.model("GeoJsonFeatureCollection", {
        "type": fields.String(example="FeatureCollection"),
        "name": fields.String(example="LuminaAi_Bandung_WebGIS_H3_Res9"),
        "crs": fields.Raw(description="Coordinate Reference System"),
        "features": fields.List(fields.Nested(geojson_feature_model))
    })

    return {
        "geojson_feature": geojson_feature_model,
        "geojson_collection": geojson_collection_model
    }
