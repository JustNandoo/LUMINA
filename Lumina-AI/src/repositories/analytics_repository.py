"""
Data Access Layer: Analytics & WebGIS Repository
Provides cached, in-memory query capabilities for H3 analytics and GeoJSON layers.
"""

import os
import json
from typing import List, Dict, Any, Optional, Tuple


class AnalyticsRepository:
    """Repository untuk membaca dan memfilter data analitik H3 dan GeoJSON WebGIS."""

    def __init__(self, data_dir: Optional[str] = None):
        if data_dir is None:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            data_dir = os.path.join(base_dir, "data", "processed")
        self.data_dir = data_dir

        self._analytics_file = os.path.join(self.data_dir, "bandung_h3_analytics.json")
        self._webgis_file = os.path.join(self.data_dir, "bandung_h3_webgis.geojson")
        self._transit_file = os.path.join(self.data_dir, "bandung_transit_stations.geojson")

        self._cells: List[Dict[str, Any]] = []
        self._cells_by_id: Dict[str, Dict[str, Any]] = {}
        self._webgis_geojson: Optional[Dict[str, Any]] = None
        self._transit_geojson: Optional[Dict[str, Any]] = None

        self._load_data()

    def _load_data(self):
        """Memuat seluruh artefak data ke memori untuk menjamin latensi sub-milidetik."""
        if os.path.exists(self._analytics_file):
            with open(self._analytics_file, "r", encoding="utf-8") as f:
                self._cells = json.load(f)
                self._cells_by_id = {c["h3_cell"]: c for c in self._cells}

        if os.path.exists(self._webgis_file):
            with open(self._webgis_file, "r", encoding="utf-8") as f:
                self._webgis_geojson = json.load(f)

        if os.path.exists(self._transit_file):
            with open(self._transit_file, "r", encoding="utf-8") as f:
                self._transit_geojson = json.load(f)

    def get_all_cells(self) -> List[Dict[str, Any]]:
        """Mengembalikan seluruh daftar 253 sel analitik H3."""
        return self._cells

    def get_cell_by_id(self, cell_id: str) -> Optional[Dict[str, Any]]:
        """Mencari data sel analitik berdasarkan H3 Index."""
        return self._cells_by_id.get(cell_id)

    def filter_cells(
        self,
        min_score: Optional[float] = None,
        max_score: Optional[float] = None,
        recommendation: Optional[str] = None,
        nearest_hub: Optional[str] = None,
        sort_by: str = "predicted_potential_score",
        order: str = "desc",
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Memfilter, mengurutkan, dan melakukan paginasi terhadap sel analitik."""
        results = self._cells

        if min_score is not None:
            results = [c for c in results if c.get("predicted_potential_score", 0.0) >= min_score]

        if max_score is not None:
            results = [c for c in results if c.get("predicted_potential_score", 0.0) <= max_score]

        if recommendation:
            rec_lower = recommendation.lower()
            results = [c for c in results if rec_lower in c.get("recommendation", "").lower()]

        if nearest_hub:
            hub_lower = nearest_hub.lower()
            results = [c for c in results if hub_lower in c.get("nearest_transit_hub", "").lower()]

        if search:
            q = search.lower()
            results = [
                c for c in results
                if q in c.get("h3_cell", "").lower()
                or q in c.get("nearest_transit_hub", "").lower()
                or q in c.get("recommendation", "").lower()
            ]

        reverse = (order.lower() == "desc")
        results = sorted(results, key=lambda x: x.get(sort_by, 0) or 0, reverse=reverse)

        total_count = len(results)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_results = results[start_idx:end_idx]

        return paginated_results, total_count

    def get_top_cells(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Mengambil top sel dengan skor potensi TOD tertinggi."""
        sorted_cells = sorted(
            self._cells,
            key=lambda x: x.get("predicted_potential_score", 0.0),
            reverse=True
        )
        return sorted_cells[:limit]

    def get_webgis_geojson(
        self,
        min_score: Optional[float] = None,
        recommendation: Optional[str] = None,
        nearest_hub: Optional[str] = None
    ) -> Dict[str, Any]:
        """Mengembalikan GeoJSON FeatureCollection untuk WebGIS layer dengan opsi filter dinamis."""
        if not self._webgis_geojson:
            return {"type": "FeatureCollection", "features": []}

        features = self._webgis_geojson.get("features", [])

        if min_score is not None:
            features = [f for f in features if f.get("properties", {}).get("potential_score", 0.0) >= min_score]

        if recommendation:
            rec_lower = recommendation.lower()
            features = [
                f for f in features
                if rec_lower in f.get("properties", {}).get("recommendation", "").lower()
            ]

        if nearest_hub:
            hub_lower = nearest_hub.lower()
            features = [
                f for f in features
                if hub_lower in f.get("properties", {}).get("nearest_transit_hub", "").lower()
            ]

        return {
            "type": "FeatureCollection",
            "name": self._webgis_geojson.get("name", "LuminaAi_WebGIS_Filtered"),
            "crs": self._webgis_geojson.get("crs", {}),
            "features": features
        }

    def get_transit_stations_geojson(self) -> Dict[str, Any]:
        """Mengembalikan GeoJSON FeatureCollection dari 12 simpul stasiun transit."""
        if self._transit_geojson:
            return self._transit_geojson
        return {"type": "FeatureCollection", "features": []}

    def get_summary(self) -> Dict[str, Any]:
        """Menghitung ringkasan statistik makro TOD untuk dashboard eksekutif."""
        if not self._cells:
            return {
                "total_cells": 0,
                "average_potential_score": 0.0,
                "max_potential_score": 0.0,
                "min_potential_score": 0.0,
                "recommendations_breakdown": {},
                "strata_distribution": {},
                "transit_hub_coverage": {}
            }

        scores = [c.get("predicted_potential_score", 0.0) for c in self._cells]
        avg_score = round(sum(scores) / len(scores), 2)
        max_score = round(max(scores), 2)
        min_score = round(min(scores), 2)

        rec_counts: Dict[str, int] = {}
        hub_counts: Dict[str, int] = {}
        high_strata = 0
        med_strata = 0
        low_strata = 0

        for c in self._cells:
            rec = c.get("recommendation", "Unknown")
            rec_counts[rec] = rec_counts.get(rec, 0) + 1

            hub = c.get("nearest_transit_hub", "Unknown")
            hub_counts[hub] = hub_counts.get(hub, 0) + 1

            score = c.get("predicted_potential_score", 0.0)
            if score >= 30.0:
                high_strata += 1
            elif score >= 15.0:
                med_strata += 1
            else:
                low_strata += 1

        return {
            "total_cells": len(self._cells),
            "average_potential_score": avg_score,
            "max_potential_score": max_score,
            "min_potential_score": min_score,
            "strata_distribution": {
                "high_potential_cells": high_strata,
                "medium_potential_cells": med_strata,
                "low_potential_cells": low_strata
            },
            "recommendations_breakdown": rec_counts,
            "transit_hub_coverage": hub_counts
        }
