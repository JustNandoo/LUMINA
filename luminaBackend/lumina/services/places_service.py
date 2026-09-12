"""Tempat usaha di sekitar stasiun — dipakai fitur singgah pada perjalanan.

Batas klaim. Ini bukan direktori usaha yang terverifikasi. Selama tarikan POI
OpenStreetMap dan Properti Go belum terhubung, daftar di bawah diturunkan
secara deterministik dari kategori Properti Go dan sinyal kawasan, lalu
ditandai `source: "proxy-derived"`. Nama gerai adalah contoh, bukan usaha
nyata — antarmuka wajib menyatakannya supaya pengguna tidak mengira ini
rekomendasi tempat yang sudah diverifikasi.
"""
from __future__ import annotations


from lumina.data.network import AMENITIES, BUSINESS_CATEGORIES
from lumina.services.geoai_service import _jitter, area_potential, reliability_of

# Pola nama per kategori. Cukup untuk menghasilkan daftar yang masuk akal
# dibaca, dan sengaja generik supaya tidak menyerupai merek yang ada.
NAME_PATTERNS: dict[str, list[str]] = {
    "coffee-shop": ["Kopi {}", "Kedai Kopi {}", "{} Coffee Corner", "Warung Kopi {}"],
    "laundry": ["Laundry {}", "{} Cuci Kilat", "Binatu {}"],
    "minimarket": ["Toko {}", "Minimarket {}", "Warung Serba Ada {}"],
    "restoran": ["Rumah Makan {}", "Warung Nasi {}", "Depot {}", "Dapur {}"],
    "retail-fnb": ["Gerai {}", "{} Snack Bar", "Jajanan {}"],
}

SUFFIXES = [
    "Melati", "Sentosa", "Barokah", "Harapan", "Mekar", "Bahagia", "Rejeki",
    "Makmur", "Sari", "Indah", "Amanah", "Berkah",
]

SPOTS = [
    "Pintu utara stasiun",
    "Pintu selatan stasiun",
    "Area peron lantai dasar",
    "Seberang pintu keluar",
    "Koridor penghubung",
    "Deret ruko depan stasiun",
]


def _pick(options: list[str], *seed: str) -> str:
    index = int(_jitter(*seed) * len(options)) % len(options)
    return options[index]


def _price_band(score: int) -> str:
    """Rentang harga indikatif — bukan harga yang dikutip dari gerai."""
    if score >= 70:
        return "Rp 25.000–50.000"
    if score >= 45:
        return "Rp 15.000–30.000"
    return "Rp 8.000–20.000"


def nearby_places(station: dict, limit: int = 8) -> list[dict]:
    """Tempat usaha di sekitar satu stasiun, urut dari yang terdekat."""
    potential = area_potential(station)
    demand = potential["signals"]["demand"]["score"]
    reliability = reliability_of(station)

    places: list[dict] = []
    for index in range(limit):
        category = BUSINESS_CATEGORIES[index % len(BUSINESS_CATEGORIES)]
        seed = (station["id"], category["id"], str(index))

        name = _pick(NAME_PATTERNS[category["id"]], "name", *seed).format(
            _pick(SUFFIXES, "suffix", *seed)
        )
        # Jarak 40–320 m; dibulatkan ke 10 m supaya tidak terkesan terukur
        # sampai satuan meter.
        distance = 40 + int(_jitter("distance", *seed) * 280)
        distance = int(round(distance / 10) * 10)

        places.append({
            "id": f"{station['id']}-{category['id']}-{index}",
            "name": name,
            "category_id": category["id"],
            "category": category["label"],
            "spot": _pick(SPOTS, "spot", *seed),
            "distance_m": distance,
            # Kecepatan jalan kaki ±80 m/menit.
            "walk_minutes": max(1, round(distance / 80)),
            "price_band": _price_band(demand),
            "station_id": station["id"],
            "station_name": station["name"],
        })

    places.sort(key=lambda item: item["distance_m"])
    return [
        {**place, "reliability": reliability, "source": "proxy-derived"}
        for place in places
    ]


def places_along_route(stations: list[dict], per_station: int = 4) -> list[dict]:
    """Tempat usaha di sepanjang lintasan, dikelompokkan per stasiun."""
    return [
        {
            "station_id": station["id"],
            "station_name": station["name"],
            "places": nearby_places(station, limit=per_station),
        }
        for station in stations
    ]


# --------------------------------------------------------------------------
#  Fasilitas stasiun (F5)
# --------------------------------------------------------------------------
AMENITY_SPOTS = [
    "Lantai dasar, dekat pintu utama",
    "Peron 1, sisi utara",
    "Peron 3, dekat eskalator",
    "Area concourse tengah",
    "Dekat pintu keluar selatan",
]

AMENITY_HOURS = ["24 jam", "05.00–22.00", "06.00–21.00", "Mengikuti jam operasional stasiun"]


def station_amenities(station: dict) -> list[dict]:
    """Fasilitas beserta atributnya (REQ-F5-02: tiap POI punya popup atribut).

    Ketersediaan diturunkan dari kelas stasiun: stasiun interchange menampung
    perpindahan antar-lin sehingga fasilitasnya lebih lengkap. Atribut lain
    (letak, jam) bersifat contoh sampai tarikan POI OpenStreetMap terhubung.
    """
    reliability = reliability_of(station)

    items = []
    for index, amenity in enumerate(AMENITIES):
        seed = (station["id"], amenity["id"])
        # Stasiun interchange hampir selalu punya fasilitas dasar; stasiun
        # kecil belum tentu — dan itu harus terlihat, bukan disamarkan.
        threshold = 0.12 if station["interchange"] else 0.38
        available = _jitter("amenity", *seed) > threshold

        items.append({
            "id": amenity["id"],
            "label": amenity["label"],
            "available": available,
            "spot": _pick(AMENITY_SPOTS, "amenity-spot", *seed) if available else None,
            "hours": _pick(AMENITY_HOURS, "amenity-hours", *seed) if available else None,
            "count": 1 + int(_jitter("amenity-count", *seed) * 3) if available else 0,
            "reliability": reliability,
            "source": "OpenStreetMap · POI fasilitas (proxy-derived)",
            "order": index,
        })
    return items
