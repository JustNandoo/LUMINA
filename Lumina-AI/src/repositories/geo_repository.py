"""
Data Access Layer: Repository Pattern for GeoJSON Ingestion
Single Responsibility: File IO, Schema Parsing, Coordinate Validation.
"""

import os
import json
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class IGeoDataRepository(ABC):
    @abstractmethod
    def load_features(self, filepath: str) -> List[Dict[str, Any]]:
        """Memuat feature list dari file sumber spasial."""
        pass

class LocalGeoJsonRepository(IGeoDataRepository):
    """Repository implementasi lokal untuk parsing file GeoJSON EPSG:4326."""
    
    def load_features(self, filepath: str) -> List[Dict[str, Any]]:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Berkas tidak ditemukan: {filepath}")
            
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        records = []
        for feat in data.get("features", []):
            p = feat.get("properties", {}).copy()
            geom = feat.get("geometry", {})
            coords = geom.get("coordinates", [None, None]) if geom else [None, None]
            
            lon = coords[0] if coords[0] is not None else p.get("Longitude", p.get("longitude"))
            lat = coords[1] if coords[1] is not None else p.get("Latitude", p.get("latitude"))
            
            if lat is not None and lon is not None:
                try:
                    p["lat"] = float(lat)
                    p["lon"] = float(lon)
                    records.append(p)
                except (ValueError, TypeError):
                    continue
        return records
