"""Dataset rujukan LUMINA: jaringan stasiun, slot waktu, fasilitas, kategori usaha.

Sumber angka koordinat masih perkiraan dan harus diganti dataset resmi
(OSM / MAPID) sebelum rilis — sama seperti catatan pada dataset frontend.
Stasiun dengan `calibrated=True` adalah koridor Manggarai–Tanah Abang–Duri–
Sudirman, satu-satunya koridor yang punya 84 observasi lapangan, sehingga
hanya di situ indeks boleh dibaca sebagai tervalidasi survei.
"""
from __future__ import annotations

# --------------------------------------------------------------------------
#  Slot waktu — tiga slot yang tervalidasi survei (PRD §2)
# --------------------------------------------------------------------------
TIME_SLOTS = [
    {"id": "morning", "label": "06.00–09.00", "start": "06:00", "end": "09:00"},
    {"id": "midday", "label": "12.00–15.00", "start": "12:00", "end": "15:00"},
    {"id": "evening", "label": "16.00–19.00", "start": "16:00", "end": "19:00"},
]

SLOT_IDS = [slot["id"] for slot in TIME_SLOTS]


def slot_by_id(slot_id: str) -> dict | None:
    return next((slot for slot in TIME_SLOTS if slot["id"] == slot_id), None)


# --------------------------------------------------------------------------
#  Jaringan stasiun
# --------------------------------------------------------------------------
def _station(
    station_id: str,
    name: str,
    lat: float,
    lng: float,
    line: str,
    district: str,
    calibrated: bool = False,
    interchange: bool = False,
) -> dict:
    return {
        "id": station_id,
        "name": name,
        "position": [lat, lng],
        "line": line,
        "district": district,
        "calibrated": calibrated,
        "interchange": interchange,
    }


STATIONS = [
    # --- Koridor kalibrasi (84 titik observasi lapangan) -------------------
    _station("manggarai", "Manggarai", -6.2145, 106.8506, "Interchange",
             "Kecamatan Tebet, Jakarta Selatan", calibrated=True, interchange=True),
    _station("tanah-abang", "Tanah Abang", -6.1859, 106.8107, "Interchange",
             "Kecamatan Tanah Abang, Jakarta Pusat", calibrated=True, interchange=True),
    _station("duri", "Duri", -6.1625, 106.7968, "Interchange",
             "Kecamatan Tambora, Jakarta Barat", calibrated=True, interchange=True),
    _station("sudirman", "Sudirman", -6.2025, 106.8230, "Interchange",
             "Kecamatan Setiabudi, Jakarta Selatan", calibrated=True, interchange=True),

    # --- Lin Bogor: utara --------------------------------------------------
    _station("jakarta-kota", "Jakarta Kota", -6.1376, 106.8140, "Bogor",
             "Kecamatan Taman Sari, Jakarta Barat", interchange=True),
    _station("jayakarta", "Jayakarta", -6.1417, 106.8186, "Bogor",
             "Kecamatan Taman Sari, Jakarta Barat"),
    _station("mangga-besar", "Mangga Besar", -6.1489, 106.8236, "Bogor",
             "Kecamatan Taman Sari, Jakarta Barat"),
    _station("sawah-besar", "Sawah Besar", -6.1608, 106.8253, "Bogor",
             "Kecamatan Sawah Besar, Jakarta Pusat"),
    _station("juanda", "Juanda", -6.1665, 106.8305, "Bogor",
             "Kecamatan Sawah Besar, Jakarta Pusat"),
    _station("gondangdia", "Gondangdia", -6.1861, 106.8317, "Bogor",
             "Kecamatan Menteng, Jakarta Pusat"),
    _station("cikini", "Cikini", -6.1985, 106.8410, "Bogor",
             "Kecamatan Menteng, Jakarta Pusat"),

    # --- Lin Bogor: selatan ------------------------------------------------
    _station("tebet", "Tebet", -6.2264, 106.8580, "Bogor",
             "Kecamatan Tebet, Jakarta Selatan"),
    _station("cawang", "Cawang", -6.2422, 106.8664, "Bogor",
             "Kecamatan Kramat Jati, Jakarta Timur"),
    _station("duren-kalibata", "Duren Kalibata", -6.2562, 106.8548, "Bogor",
             "Kecamatan Pancoran, Jakarta Selatan"),
    _station("pasar-minggu-baru", "Pasar Minggu Baru", -6.2627, 106.8456, "Bogor",
             "Kecamatan Pancoran, Jakarta Selatan"),
    _station("pasar-minggu", "Pasar Minggu", -6.2841, 106.8443, "Bogor",
             "Kecamatan Pasar Minggu, Jakarta Selatan"),
    _station("tanjung-barat", "Tanjung Barat", -6.3073, 106.8360, "Bogor",
             "Kecamatan Jagakarsa, Jakarta Selatan"),
    _station("lenteng-agung", "Lenteng Agung", -6.3303, 106.8340, "Bogor",
             "Kecamatan Jagakarsa, Jakarta Selatan"),
    _station("universitas-pancasila", "Universitas Pancasila", -6.3390, 106.8346, "Bogor",
             "Kecamatan Jagakarsa, Jakarta Selatan"),
    _station("universitas-indonesia", "Universitas Indonesia", -6.3610, 106.8320, "Bogor",
             "Kecamatan Beji, Depok"),
    _station("pondok-cina", "Pondok Cina", -6.3690, 106.8320, "Bogor",
             "Kecamatan Beji, Depok"),
    _station("depok-baru", "Depok Baru", -6.3915, 106.8188, "Bogor",
             "Kecamatan Pancoran Mas, Depok"),
    _station("depok", "Depok", -6.4049, 106.8172, "Bogor",
             "Kecamatan Pancoran Mas, Depok"),
    _station("citayam", "Citayam", -6.4400, 106.8036, "Bogor",
             "Kecamatan Bojonggede, Bogor"),
    _station("bojonggede", "Bojonggede", -6.4770, 106.7950, "Bogor",
             "Kecamatan Bojonggede, Bogor"),
    _station("cilebut", "Cilebut", -6.5306, 106.8007, "Bogor",
             "Kecamatan Sukaraja, Bogor"),
    _station("bogor", "Bogor", -6.5950, 106.7900, "Bogor",
             "Kecamatan Bogor Tengah, Bogor"),

    # --- Lin Rangkasbitung -------------------------------------------------
    _station("palmerah", "Palmerah", -6.2074, 106.7970, "Rangkasbitung",
             "Kecamatan Palmerah, Jakarta Barat"),
    _station("kebayoran", "Kebayoran", -6.2426, 106.7834, "Rangkasbitung",
             "Kecamatan Kebayoran Lama, Jakarta Selatan"),
    _station("pondok-ranji", "Pondok Ranji", -6.2788, 106.7444, "Rangkasbitung",
             "Kecamatan Ciputat Timur, Tangerang Selatan"),
    _station("sudimara", "Sudimara", -6.2935, 106.7122, "Rangkasbitung",
             "Kecamatan Ciputat, Tangerang Selatan"),
    _station("rawa-buntu", "Rawa Buntu", -6.3155, 106.6742, "Rangkasbitung",
             "Kecamatan Serpong, Tangerang Selatan"),
    _station("serpong", "Serpong", -6.3182, 106.6628, "Rangkasbitung",
             "Kecamatan Serpong, Tangerang Selatan"),

    # --- Lin Tangerang -----------------------------------------------------
    _station("grogol", "Grogol", -6.1655, 106.7900, "Tangerang",
             "Kecamatan Grogol Petamburan, Jakarta Barat"),
    _station("pesing", "Pesing", -6.1650, 106.7690, "Tangerang",
             "Kecamatan Kebon Jeruk, Jakarta Barat"),
    _station("kalideres", "Kalideres", -6.1590, 106.7020, "Tangerang",
             "Kecamatan Kalideres, Jakarta Barat"),
    _station("batuceper", "Batuceper", -6.1840, 106.6420, "Tangerang",
             "Kecamatan Batuceper, Tangerang"),
    _station("tangerang", "Tangerang", -6.1770, 106.6300, "Tangerang",
             "Kecamatan Tangerang, Tangerang"),

    # --- Lin Cikarang ------------------------------------------------------
    _station("jatinegara", "Jatinegara", -6.2150, 106.8700, "Cikarang",
             "Kecamatan Jatinegara, Jakarta Timur", interchange=True),
    _station("klender", "Klender", -6.2130, 106.8980, "Cikarang",
             "Kecamatan Duren Sawit, Jakarta Timur"),
    _station("buaran", "Buaran", -6.2200, 106.9280, "Cikarang",
             "Kecamatan Duren Sawit, Jakarta Timur"),
    _station("cakung", "Cakung", -6.2210, 106.9520, "Cikarang",
             "Kecamatan Cakung, Jakarta Timur"),
    _station("kranji", "Kranji", -6.2210, 106.9800, "Cikarang",
             "Kecamatan Bekasi Barat, Bekasi"),
    _station("bekasi", "Bekasi", -6.2360, 107.0000, "Cikarang",
             "Kecamatan Bekasi Timur, Bekasi"),
    _station("cikarang", "Cikarang", -6.2550, 107.1500, "Cikarang",
             "Kecamatan Cikarang Utara, Bekasi"),

    # --- Lin Tanjung Priok -------------------------------------------------
    _station("kampung-bandan", "Kampung Bandan", -6.1350, 106.8210, "Tanjung Priok",
             "Kecamatan Pademangan, Jakarta Utara", interchange=True),
    _station("ancol", "Ancol", -6.1260, 106.8430, "Tanjung Priok",
             "Kecamatan Pademangan, Jakarta Utara"),
    _station("tanjung-priok", "Tanjung Priok", -6.1050, 106.8800, "Tanjung Priok",
             "Kecamatan Tanjung Priok, Jakarta Utara"),
]

STATION_INDEX = {station["id"]: station for station in STATIONS}

LINES = sorted({station["line"] for station in STATIONS})


def find_station(station_id: str) -> dict | None:
    return STATION_INDEX.get((station_id or "").strip().lower())


def calibrated_stations() -> list[dict]:
    return [station for station in STATIONS if station["calibrated"]]


# --------------------------------------------------------------------------
#  Fasilitas stasiun (F5) — label mengikuti yang dipakai antarmuka
# --------------------------------------------------------------------------
AMENITIES = [
    {"id": "restroom", "label": "Restroom"},
    {"id": "prayer-room", "label": "Prayer Room"},
    {"id": "atm-center", "label": "ATM Center"},
    {"id": "minimarket", "label": "Minimarket"},
    {"id": "waiting-room", "label": "Waiting Room"},
    {"id": "elevator", "label": "Elevator"},
    {"id": "escalator", "label": "Escalator"},
]

# --------------------------------------------------------------------------
#  Kategori usaha (F7) — REQ-F7-02: bersumber dari atribut Kategori Properti
#  pada dataset Properti Go, bukan daftar karangan sendiri.
# --------------------------------------------------------------------------
BUSINESS_CATEGORIES = [
    {"id": "coffee-shop", "label": "Coffee Shop", "source": "Properti Go · Kategori Properti"},
    {"id": "laundry", "label": "Laundry", "source": "Properti Go · Kategori Properti"},
    {"id": "minimarket", "label": "Minimarket", "source": "Properti Go · Kategori Properti"},
    {"id": "restoran", "label": "Restoran", "source": "Properti Go · Kategori Properti"},
    {"id": "retail-fnb", "label": "Retail F&B", "source": "Properti Go · Kategori Properti"},
]

CATEGORY_INDEX = {item["id"]: item for item in BUSINESS_CATEGORIES}

# --------------------------------------------------------------------------
#  Sumber data (F8 REQ-F8-03: metadata dapat ditelusuri dari antarmuka)
# --------------------------------------------------------------------------
DATA_SOURCES = [
    {
        "id": "community-maps",
        "name": "MAPID Community Maps — Activity",
        "role": "Sinyal intensitas aktivitas bercap waktu",
    },
    {
        "id": "struk-go",
        "name": "MAPID Data Mission — Struk Go",
        "role": "Sinyal daya beli dan pola belanja konsumen",
    },
    {
        "id": "menu-go",
        "name": "MAPID Data Mission — Menu Go",
        "role": "Sinyal selera harga dan tingkat persaingan",
    },
    {
        "id": "properti-go",
        "name": "MAPID Data Mission — Properti Go",
        "role": "Ketersediaan ruang komersial dan kategori properti",
    },
    {
        "id": "osm",
        "name": "OpenStreetMap",
        "role": "POI fasilitas dan jaringan transit",
    },
    {
        "id": "mapid-apps",
        "name": "MAPID APPS — survei lapangan",
        "role": "84 titik observasi untuk kalibrasi indeks",
    },
]
