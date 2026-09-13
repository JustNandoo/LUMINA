"""Data rujukan awal untuk sisi admin.

Dipanggil lewat `flask seed-reference`. Aman dijalankan berulang: setiap baris
hanya dibuat kalau belum ada, jadi tidak menimpa perubahan yang sudah dibuat
admin lewat antarmuka.
"""
from __future__ import annotations

from lumina.data.network import STATIONS
from lumina.extensions import db
from lumina.models import B2BPackage, MapLayer, MapPoint, Role

ROLES = [
    ("User", "Pengguna umum: komuter dan pelaku usaha."),
    ("Admin", "Pengelola platform dengan akses penuh sisi admin."),
    ("Partner", "Mitra B2B dengan kuota ekspor dan akses API."),
]

PACKAGES = [
    ("Explorer", "Tier dasar gratis untuk komuter.", 0, 0),
    ("Commercial", "Sisi ekonomi kawasan untuk pelaku UMKM.", 750_000, 50),
    ("Enterprise", "Dikuotasi per koridor untuk operator dan pengembang.", 0, 0),
]

LAYERS = [
    ("stations", "Titik stasiun", "Penanda dan label stasiun di peta Explore", True, "publik"),
    ("heatmap", "Heatmap potensi", "Heatmap potensi usaha di halaman Business Potential", True, "publik"),
    ("density", "Indeks kepadatan", "Heatmap indeks kepadatan per slot di peta Explore", True, "publik"),
    ("network", "Jaringan lin", "Jalur seluruh lin KRL di peta Explore", True, "publik"),
    ("corridor", "Koridor kalibrasi", "Garis koridor Manggarai–Tanah Abang–Duri–Sudirman", True, "publik"),
    ("routes", "Jalur antar titik", "Garis penghubung antar stasiun terbit", False, "draf"),
    ("survey", "Titik survei", "84 titik observasi lapangan kalibrasi", False, "internal"),
]

# Stasiun yang sengaja belum terbit, supaya alur publikasi di halaman admin
# punya contoh nyata untuk diuji.
UNPUBLISHED = {"tebet", "cakung", "batuceper"}


def seed_reference_data() -> dict[str, int]:
    counts = {"roles": 0, "packages": 0, "map_points": 0, "map_layers": 0}

    for name, description in ROLES:
        exists = db.session.execute(
            db.select(Role).filter(db.func.lower(Role.name) == name.lower())
        ).scalar_one_or_none()
        if exists is None:
            db.session.add(Role(name=name, description=description))
            counts["roles"] += 1

    for name, description, price, quota in PACKAGES:
        exists = db.session.execute(
            db.select(B2BPackage).filter(db.func.lower(B2BPackage.name) == name.lower())
        ).scalar_one_or_none()
        if exists is None:
            db.session.add(B2BPackage(
                name=name, description=description, price=price, export_quota=quota
            ))
            counts["packages"] += 1

    for station in STATIONS:
        if db.session.get(MapPoint, station["id"]) is None:
            db.session.add(MapPoint(
                id=station["id"],
                name=station["name"],
                latitude=station["position"][0],
                longitude=station["position"][1],
                kind="Stasiun",
                published=station["id"] not in UNPUBLISHED,
            ))
            counts["map_points"] += 1

    for layer_id, label, description, visible, status in LAYERS:
        if db.session.get(MapLayer, layer_id) is None:
            db.session.add(MapLayer(
                id=layer_id,
                label=label,
                description=description,
                visible=visible,
                status=status,
            ))
            counts["map_layers"] += 1

    db.session.commit()
    return counts
