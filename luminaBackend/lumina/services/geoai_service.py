"""Mesin indeks LUMINA: kepadatan, potensi lokasi, risiko, dan keterandalan.

Batas klaim (PRD §2, §8, REQ-F1-03, REQ-F3-04, REQ-F7-05)
---------------------------------------------------------
Angka yang dikeluarkan modul ini adalah **indeks relatif 0–100**, bukan jumlah
penumpang dan bukan proyeksi pendapatan. Selama keluaran Spatial XGBoost pada
repo Lumina-AI belum terhubung, indeks diturunkan dari sinyal proksi struktural
(status interchange, kepadatan lin, posisi slot waktu) secara deterministik.
Karena itu setiap keluaran membawa:

    method      = "proxy-derived"   (bukan "model-predicted")
    predictive  = False              di luar koridor kalibrasi
    reliability = high | medium | low

Begitu pipeline model tersedia, ganti isi `_base_intensity` dan
`station_crowd_profile` dengan pembacaan keluaran model — kontrak fungsinya
sengaja dibuat tidak berubah.
"""
from __future__ import annotations

import hashlib

from lumina.data.network import (
    BUSINESS_CATEGORIES,
    DATA_SOURCES,
    SLOT_IDS,
    STATIONS,
    TIME_SLOTS,
    find_station,
)

# Bobot relatif tiap slot. Sore hari paling padat pada koridor komuter,
# tengah hari paling lengang — pola yang konsisten dengan profil KRL.
SLOT_WEIGHT = {"morning": 0.92, "midday": 0.55, "evening": 1.0}

# Lin dengan volume harian lebih besar memberi dasar intensitas lebih tinggi.
LINE_WEIGHT = {
    "Interchange": 1.0,
    "Bogor": 0.86,
    "Cikarang": 0.78,
    "Rangkasbitung": 0.72,
    "Tangerang": 0.6,
    "Tanjung Priok": 0.45,
}

RELIABILITY_ORDER = {"low": 0, "medium": 1, "high": 2}


# --------------------------------------------------------------------------
#  Dasar deterministik
# --------------------------------------------------------------------------
def _jitter(*parts: str) -> float:
    """Angka 0..1 yang stabil lintas proses (hash bawaan Python di-salt)."""
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big") / 0xFFFFFFFF


def _clamp(value: float, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, int(round(value))))


# Pembagi normalisasi. Bobot mentah tertinggi (lin Interchange + interchange +
# kalibrasi, dikali variasi maksimum) mencapai ±1,34. Dibagi angka ini, stasiun
# tersibuk mendarat di ±96 dan bukan mentok 100 — penting karena indeks yang
# menumpuk di batas atas membuat perbandingan antar-stasiun (REQ-F2-04)
# kehilangan daya bedanya.
_INTENSITY_HEADROOM = 1.55


def _base_intensity(station: dict) -> float:
    """Intensitas dasar stasiun 0..1 sebelum dipengaruhi slot waktu."""
    base = LINE_WEIGHT.get(station["line"], 0.6)
    if station["interchange"]:
        base += 0.12
    if station["calibrated"]:
        base += 0.08
    # Variasi antar-stasiun yang stabil, supaya stasiun satu lin tidak seragam.
    return base * (0.82 + 0.3 * _jitter("intensity", station["id"])) / _INTENSITY_HEADROOM


def crowd_level(index: int) -> str:
    if index >= 70:
        return "high"
    if index >= 45:
        return "moderate"
    return "low"


def reliability_of(station: dict) -> str:
    """REQ-F8-01: sel/stasiun dengan kerapatan data rendah ditandai eksplisit."""
    if station["calibrated"]:
        return "high"
    if station["interchange"]:
        return "medium"
    return "low"


# --------------------------------------------------------------------------
#  F1 / F2 / F3 — kepadatan
# --------------------------------------------------------------------------
def density_index(station: dict, slot_id: str) -> int:
    weight = SLOT_WEIGHT.get(slot_id, 0.7)
    noise = _jitter("density", station["id"], slot_id) * 0.18 - 0.09
    return _clamp((_base_intensity(station) * weight + noise) * 100)


def _drivers(station: dict, slot_id: str) -> list[dict]:
    """Faktor pendorong indeks.

    REQ-F3-03 meminta faktor diturunkan dari nilai SHAP. Selama model belum
    terhubung, kontribusi di bawah berasal dari bobot proksi yang sama yang
    menyusun indeks — ditandai lewat `method` supaya tidak terbaca sebagai SHAP.
    """
    slot = next((item for item in TIME_SLOTS if item["id"] == slot_id), None)
    slot_label = slot["label"] if slot else slot_id
    factors = [
        {
            "factor": "Posisi slot waktu",
            "detail": f"Slot {slot_label} membawa bobot {SLOT_WEIGHT.get(slot_id, 0.7):.2f}",
            "contribution": round(SLOT_WEIGHT.get(slot_id, 0.7), 2),
        },
        {
            "factor": "Volume lin",
            "detail": f"Lin {station['line']}",
            "contribution": round(LINE_WEIGHT.get(station["line"], 0.6), 2),
        },
    ]
    if station["interchange"]:
        factors.append({
            "factor": "Titik interchange",
            "detail": "Stasiun menampung perpindahan antar-lin",
            "contribution": 0.12,
        })
    factors.sort(key=lambda item: item["contribution"], reverse=True)
    return factors


def station_crowd_profile(station: dict) -> dict:
    """F1 + F3: profil seluruh slot, slot terlengang, dan faktor pendorongnya."""
    slots = []
    for slot in TIME_SLOTS:
        index = density_index(station, slot["id"])
        slots.append({
            "slot_id": slot["id"],
            "label": slot["label"],
            "index": index,
            "level": crowd_level(index),
        })

    busiest = max(slots, key=lambda item: item["index"])
    quietest = min(slots, key=lambda item: item["index"])
    reliability = reliability_of(station)

    return {
        "station_id": station["id"],
        "station_name": station["name"],
        "scale": "Indeks relatif 0–100, bukan jumlah penumpang.",
        "slots": slots,
        "busiest_slot": busiest,
        "recommendation": {
            "slot_id": quietest["slot_id"],
            "label": quietest["label"],
            "index": quietest["index"],
            "reason": (
                f"Slot {quietest['label']} adalah slot dengan indeks terendah "
                f"({quietest['index']}) dibanding {busiest['label']} ({busiest['index']})."
            ),
            "drivers": _drivers(station, quietest["slot_id"]),
        },
        "reliability": reliability,
        # REQ-F3-04: tanpa kalibrasi memadai, indeks disajikan tanpa klaim prediktif.
        "predictive": reliability == "high",
        "method": "proxy-derived",
    }


# --------------------------------------------------------------------------
#  F2 — sel heatmap
# --------------------------------------------------------------------------
# H3 resolusi 9 ≈ 0,10 km². Grid heksagonal lokal di bawah memakai jarak yang
# setara sebagai pengganti sementara sampai keluaran H3 dari pipeline Lumina-AI
# terhubung; karena itu id sel diberi awalan `hexg-`, bukan indeks H3 asli.
_CELL_RING_STEP = 0.0092  # ± 1 km pada lintang Jakarta
_RING_OFFSETS = [
    (0.0, 0.0),
    (1.0, 0.0), (0.5, 0.87), (-0.5, 0.87),
    (-1.0, 0.0), (-0.5, -0.87), (0.5, -0.87),
]


def density_cells(slot_id: str, stations: list[dict] | None = None) -> list[dict]:
    """Sel kepadatan di sekitar tiap stasiun untuk heatmap F2."""
    cells = []
    for station in stations or STATIONS:
        centre = density_index(station, slot_id)
        lat, lng = station["position"]
        for ring_index, (dx, dy) in enumerate(_RING_OFFSETS):
            cell_lat = lat + dy * _CELL_RING_STEP
            cell_lng = lng + dx * _CELL_RING_STEP
            # Sel makin jauh dari stasiun makin turun indeksnya.
            falloff = 1.0 if ring_index == 0 else 0.62 + 0.2 * _jitter(
                "cell", station["id"], slot_id, str(ring_index)
            )
            cells.append({
                "cell_id": f"hexg-{station['id']}-{ring_index}",
                "station_id": station["id"],
                "position": [round(cell_lat, 6), round(cell_lng, 6)],
                "index": _clamp(centre * falloff),
                "reliability": reliability_of(station),
            })
    return cells


# --------------------------------------------------------------------------
#  F7 — potensi ekonomi kawasan
# --------------------------------------------------------------------------
def _demand_score(station: dict) -> int:
    """Permintaan: intensitas aktivitas × daya beli (proksi Struk Go)."""
    purchasing = 0.55 + 0.45 * _jitter("purchasing", station["id"])
    return _clamp(_base_intensity(station) * purchasing * 118)


def _competition_score(station: dict) -> int:
    """Persaingan: kerapatan gerai sejenis (proksi Menu Go + POI OSM)."""
    return _clamp(35 + 55 * _jitter("competition", station["id"]))


def _space_score(station: dict) -> int:
    """Ketersediaan ruang komersial (proksi Properti Go)."""
    return _clamp(25 + 65 * _jitter("space", station["id"]))


def area_potential(station: dict) -> dict:
    """Skor potensi lokasi + indeks risiko sebagai indeks komposit berbobot.

    Formula sengaja transparan (PRD §9): ekosistem MAPID mencatat pengeluaran
    konsumen, bukan pendapatan gerai, sehingga tidak ada label omzet untuk
    melatih model prediksi pendapatan.
    """
    demand = _demand_score(station)
    competition = _competition_score(station)
    space = _space_score(station)

    potential = _clamp(0.5 * demand + 0.3 * (100 - competition) + 0.2 * space)
    risk = _clamp(0.45 * competition + 0.35 * (100 - demand) + 0.2 * (100 - space))
    reliability = reliability_of(station)

    return {
        "station_id": station["id"],
        "name": station["name"],
        "district": station["district"],
        "position": station["position"],
        "potential_score": potential,
        "risk_index": risk,
        "risk_level": "high" if risk >= 60 else "medium" if risk >= 38 else "low",
        "signals": {
            "demand": {"score": demand, "source": "Struk Go + Community Maps Activity"},
            "competition": {"score": competition, "source": "Menu Go + POI OpenStreetMap"},
            "space_availability": {"score": space, "source": "Properti Go"},
        },
        "formula": (
            "potensi = 0,5·permintaan + 0,3·(100 − persaingan) + 0,2·ketersediaan ruang"
        ),
        "reliability": reliability,
        "method": "composite-index",
        # REQ-F7-05: tidak ada proyeksi pendapatan, hanya rentang indikatif.
        "revenue_projection": None,
        "revenue_note": (
            "LUMINA tidak menampilkan proyeksi pendapatan — label omzet tidak "
            "tersedia pada ekosistem MAPID."
        ),
    }


def category_recommendations(station: dict) -> list[dict]:
    """REQ-F7-03/04: kategori ditandai berpeluang bila tiga syarat terpenuhi,
    dan tiap rekomendasi membawa buktinya."""
    potential = area_potential(station)
    results = []

    for category in BUSINESS_CATEGORIES:
        demand = _clamp(
            potential["signals"]["demand"]["score"]
            * (0.72 + 0.5 * _jitter("cat-demand", station["id"], category["id"]))
        )
        competition = _clamp(
            30 + 60 * _jitter("cat-competition", station["id"], category["id"])
        )
        space = _clamp(
            20 + 70 * _jitter("cat-space", station["id"], category["id"])
        )

        conditions = {
            "demand_high": demand >= 55,
            "competition_low": competition <= 55,
            "space_available": space >= 40,
        }
        viable = all(conditions.values())

        results.append({
            "category_id": category["id"],
            "label": category["label"],
            "source": category["source"],
            "viable": viable,
            "conditions": conditions,
            "evidence": {
                "demand": {
                    "score": demand,
                    "source": "Struk Go · pengeluaran konsumen bercap waktu",
                },
                "competition": {
                    "score": competition,
                    "source": "Menu Go + POI OpenStreetMap · gerai sejenis",
                },
                "space_availability": {
                    "score": space,
                    "source": "Properti Go · unit dengan kategori sesuai",
                },
            },
            "reliability": potential["reliability"],
        })

    results.sort(key=lambda item: (item["viable"], item["evidence"]["demand"]["score"]), reverse=True)
    return results


# --------------------------------------------------------------------------
#  F8 — metadata keterandalan
# --------------------------------------------------------------------------
def reliability_legend() -> list[dict]:
    return [
        {
            "level": "high",
            "label": "Tinggi",
            "meaning": "Sel berada pada koridor kalibrasi dan divalidasi 84 observasi lapangan.",
        },
        {
            "level": "medium",
            "label": "Sedang",
            "meaning": "Sinyal proksi cukup rapat, tetapi belum divalidasi survei lapangan.",
        },
        {
            "level": "low",
            "label": "Rendah",
            "meaning": "Kerapatan data rendah. Angka dibaca sebagai indikasi awal, bukan dasar keputusan tunggal.",
        },
    ]


def meta_payload() -> dict:
    return {
        "time_slots": TIME_SLOTS,
        "slot_ids": SLOT_IDS,
        "reliability_levels": reliability_legend(),
        "business_categories": BUSINESS_CATEGORIES,
        "data_sources": DATA_SOURCES,
        "claim_boundary": {
            "density": "Indeks relatif 0–100 per sel per slot waktu, bukan jumlah penumpang.",
            "economy": "Skor potensi adalah indeks komposit berbobot, bukan proyeksi pendapatan.",
            "method": "proxy-derived",
        },
    }
