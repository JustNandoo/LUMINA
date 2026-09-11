"""
Domain Layer: Master Transit Hubs for Bandung Raya
Enterprise Clean Architecture for MAPID WebGIS Competition 2026.
"""

from typing import List, Tuple
import math
from src.domain.entities import TransitHub


BANDUNG_TRANSIT_HUBS: List[TransitHub] = [
    TransitHub("Stasiun Bandung (Hall)", "KAI Jarak Jauh & Commuter Line", -6.9126, 107.6024),
    TransitHub("Stasiun Kiaracondong", "KAI Jarak Jauh & Commuter Line", -6.9250, 107.6465),
    TransitHub("Stasiun Cimahi", "Commuter Line Bandung Raya", -6.8856, 107.5360),
    TransitHub("Stasiun Padalarang", "Hub Kereta Cepat Whoosh & Commuter", -6.8415, 107.4789),
    TransitHub("Stasiun Ciroyom", "Commuter Line Bandung Raya", -6.9142, 107.5925),
    TransitHub("Stasiun Cikudapateuh", "Commuter Line Bandung Raya", -6.9213, 107.6253),
    TransitHub("Stasiun Cimekar", "Commuter Line Bandung Raya", -6.9458, 107.7032),
    TransitHub("Stasiun Gedebage", "Commuter Line & Transit Hub", -6.9442, 107.6789),
    TransitHub("Stasiun Kereta Cepat Tegalluar", "Kereta Cepat Whoosh Hub", -6.9669, 107.7126),
    TransitHub("Terminal Leuwipanjang", "Terminal Bus Transit Antarmoda", -6.9463, 107.5942),
    TransitHub("Terminal Cicaheum", "Terminal Bus Transit Antarmoda", -6.9015, 107.6575),
    TransitHub("Terminal Ledeng", "Terminal Angkutan Kota & Bus", -6.8588, 107.5937),
]


def get_all_transit_hubs() -> List[TransitHub]:
    """Mengembalikan seluruh daftar simpul transit master di Bandung Raya."""
    return list(BANDUNG_TRANSIT_HUBS)


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Menghitung jarak lingkaran besar (Great-Circle / Haversine) dalam kilometer."""
    R = 6371.0088
    phi1, lambda1, phi2, lambda2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dphi = phi2 - phi1
    dlambda = lambda2 - lambda1
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return round(2 * R * math.asin(math.sqrt(min(1.0, max(0.0, a)))), 4)


def find_nearest_transit_hub(lat: float, lon: float) -> Tuple[TransitHub, float]:
    """Mencari simpul transit terdekat dari koordinat geografis tertentu."""
    nearest_hub = min(
        BANDUNG_TRANSIT_HUBS,
        key=lambda hub: haversine_distance_km(lat, lon, hub.lat, hub.lon)
    )
    dist = haversine_distance_km(lat, lon, nearest_hub.lat, nearest_hub.lon)
    return nearest_hub, dist
