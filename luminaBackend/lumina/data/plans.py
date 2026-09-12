"""Paket langganan LUMINA.

Sumber tunggal untuk halaman harga publik dan halaman kelola langganan,
mengikuti daftar yang sudah dipakai frontend. `price_amount` dalam rupiah
penuh (0 = gratis, None = kuotasi per koridor).
"""
from __future__ import annotations

PLANS = [
    {
        "id": "explorer",
        "name": "Explorer",
        "badge": "Basic",
        "audience": "Komuter, pelajar, dan riset akademik",
        "price_amount": 0,
        "price_label": "Rp 0",
        "period": "/bulan",
        "billing_note": "Gratis selamanya · tanpa komitmen tahunan",
        "summary": (
            "Seluruh sisi perjalanan LUMINA. Baca kondisi stasiun mana pun "
            "sebelum kamu melangkah ke dalamnya."
        ),
        "features": [
            "Profil jam sibuk seluruh stasiun jaringan (F1)",
            "Peta indeks kepadatan untuk ketiga slot waktu (F2)",
            "Prediksi keramaian dan saran slot lebih lengang (F3)",
            "Layer rute, interchange, dan fasilitas stasiun (F4, F5)",
            "Tingkat keterandalan tampil di setiap angka (F8)",
            "Bandingkan hingga 2 stasiun",
            "5 pertanyaan asisten AI per hari (F6)",
        ],
        "limits": {"station_compare": 2, "assistant_per_day": 5, "export_per_month": 0},
        "cta": "Mulai gratis",
        "featured": False,
    },
    {
        "id": "commercial",
        "name": "Commercial",
        "badge": "Paling dipilih",
        "audience": "Pelaku UMKM, pencari lokasi ritel, dan analis lokasi",
        "price_amount": 750_000,
        "price_label": "Rp 750.000",
        "period": "/bulan",
        "billing_note": "Ditagih bulanan · bisa dibatalkan kapan saja",
        "summary": (
            "Semua isi Explorer, ditambah sisi ekonominya: sel mana cocok untuk "
            "usaha apa, dan seberapa besar risikonya."
        ),
        "features": [
            "Semua isi Explorer",
            "Skor potensi ekonomi dan indeks risiko per sel H3 (F7)",
            "Uji kelayakan kategori dari atribut Properti Go",
            "Bandingkan hingga 8 stasiun pada satu skala warna",
            "Pertanyaan asisten tanpa batas beserta faktor pendorongnya",
            "Ekspor 50 laporan sel per bulan (CSV dan GeoJSON)",
            "Area tersimpan dan watchlist dengan peringatan slot",
            "Dukungan email dalam 2 hari kerja",
        ],
        "limits": {"station_compare": 8, "assistant_per_day": None, "export_per_month": 50},
        "cta": "Naik ke Commercial",
        "featured": True,
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "badge": "B2B",
        "audience": "Operator kereta, perencana, pengembang, dan grup properti",
        "price_amount": None,
        "price_label": "Custom",
        "period": "",
        "billing_note": "Perjanjian tahunan · dikuotasi per koridor",
        "summary": (
            "LUMINA sebagai infrastruktur — indeks dialirkan ke sistem kamu "
            "sendiri, dan kalibrasi dijalankan di koridor pilihanmu."
        ),
        "features": [
            "Semua isi Commercial",
            "REST API read-only untuk indeks kepadatan dan skor potensi",
            "Ekspor massal tanpa batas bulanan",
            "Dasbor tingkat koridor untuk tim operasi dan perencanaan",
            "Kalibrasi survei lapangan pada koridor yang kamu tentukan",
            "Kontak khusus dan onboarding tim",
        ],
        "limits": {"station_compare": None, "assistant_per_day": None, "export_per_month": None},
        "cta": "Hubungi tim",
        "featured": False,
    },
]

PLAN_IDS = [plan["id"] for plan in PLANS]


def plan_by_id(plan_id: str) -> dict | None:
    return next((plan for plan in PLANS if plan["id"] == plan_id), None)
