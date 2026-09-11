"""
Domain Service: Decision Support Engine & WebGIS Exporter
Calculates Risk Index, Business Sectors, and Exports OGC GeoJSON Polygons.
"""

import json
from typing import Dict, Any
import numpy as np
import pandas as pd
import h3

class BusinessDecisionService:
    @staticmethod
    def calculate_risk_index(row: pd.Series) -> float:
        norm_traffic = min(1.0, row["traffic_issues"] * 0.5)
        norm_transit_dist = min(1.0, row["dist_to_transit_km"] / 4.0)
        risk = 100.0 * (0.6 * norm_traffic + 0.4 * norm_transit_dist)
        return round(risk, 2)

    @staticmethod
    def recommend_sector(row: pd.Series) -> str:
        score = row["predicted_potential_score"]
        dist = row["dist_to_transit_km"]
        ruko = row.get("ruko_count", 0)
        traffic = row.get("traffic_issues", 0)
        sewa = row.get("sewa_count", 0)
        prop = row.get("prop_count", 0)

        if score >= 35.0 and dist <= 1.2:
            return "Zona Emas TOD: Retail Modern / Coffee Shop / Fast-Casual F&B"
        elif ruko >= 2 and sewa > 0:
            return "Koridor Komersial: Coworking Space / Kantor Cabang / Bank"
        elif dist <= 1.5 and prop > 3:
            return "Kawasan Transit Residensial: Kos Pekerja / Hunian Komuter"
        elif traffic > 0:
            return "Zona Peringatan Kemacetan: Perlu Mitigasi Aksesibilitas"
        else:
            return "Zona Penyangga Sekunder: Perdagangan Lokal / Jasa"

class WebGISGeoJsonExporter:
    @staticmethod
    def export(df: pd.DataFrame, output_path: str):
        geojson_features = []
        for _, r in df.iterrows():
            cell = r["h3_cell"]
            boundary = h3.cell_to_boundary(cell)
            coords = [[v[1], v[0]] for v in boundary]
            coords.append(coords[0])

            geojson_features.append({
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [coords]},
                "properties": {
                    "h3_cell": cell,
                    "centroid_lat": r["centroid_lat"],
                    "centroid_lon": r["centroid_lon"],
                    "dist_to_transit_km": r["dist_to_transit_km"],
                    "nearest_transit_hub": r["nearest_transit_hub"],
                    "transit_accessibility_score": r["transit_accessibility_score"],
                    "prop_count": int(r["prop_count"]),
                    "ruko_count": int(r["ruko_count"]),
                    "sewa_count": int(r["sewa_count"]),
                    "struk_count": int(r["struk_count"]),
                    "act_count": int(r["act_count"]),
                    "potential_score": float(r["predicted_potential_score"]),
                    "risk_index": float(r["risk_index"]),
                    "recommendation": r["recommendation"],
                    "top_positive_driver": r.get("top_positive_driver", ""),
                    "top_negative_driver": r.get("top_negative_driver", "")
                }
            })

        fc = {
            "type": "FeatureCollection",
            "name": "LuminaAi_Bandung_WebGIS_H3_Res9",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
            "features": geojson_features
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(fc, f, indent=2)
