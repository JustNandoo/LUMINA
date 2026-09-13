"""Asisten AI LUMINA (F6) — narasi dan tanya-jawab di atas angka milik sistem.

Tiga aturan yang mengikat modul ini:

* REQ-F6-02 — jawaban menarik ulang skor pada stasiun/sel yang relevan.
* REQ-F6-03 — jawaban hanya boleh bersumber dari keluaran indeks yang tersedia;
  model bahasa tidak boleh mengarang angka. Karena itu seluruh angka dirakit
  lebih dulu di `build_context()` dan dikirim sebagai konteks; prompt melarang
  angka di luar konteks itu.
* REQ-F6-04 — bila layanan model bahasa tidak tersedia, peta dan seluruh skor
  tetap dapat diakses. Modul ini karena itu tidak pernah melempar error ke
  pengguna: kegagalan API turun ke narasi deterministik dari angka yang sama.
"""
from __future__ import annotations

import json
import re
import threading

from flask import current_app

from lumina.data import network
from lumina.data.network import find_station
from lumina.data.routes import LINE_ROUTES, describe_route
from lumina.services import geoai_service, places_service

try:
    import httpx
    from google import genai
    from google.genai import errors as genai_errors
    from google.genai import types as genai_types
except ImportError:  # paket opsional — asisten tetap jalan lewat narasi deterministik
    genai = None

# Prompt sistem sengaja dibuat konstan (bukan f-string berisi waktu/ID) supaya
# prefix-nya stabil dan bisa dilayani dari prompt cache.
SYSTEM_PROMPT = """Kamu adalah Lumina AI, asisten di aplikasi LUMINA — WebGIS GeoAI untuk kawasan transit KRL Jabodetabek. Bantu pengguna dengan pertanyaan apa pun seputar perjalanan KRL: stasiun, rute dan transit, kepadatan, fasilitas stasiun, UMKM di sekitar stasiun, potensi usaha, dan cara memakai aplikasi LUMINA.

Sumber jawaban:
- Blok KONTEKS pada pesan pengguna berisi data milik LUMINA: ringkasan kepadatan seluruh stasiun, urutan stasiun per lin, detail stasiun yang sedang dibahas (fasilitas dan UMKM sekitar), rute beserta estimasi durasi dan tarif, serta panduan fitur aplikasi.
- Untuk pengetahuan umum yang tidak berupa angka (cara naik KRL, etika di kereta, cara memakai fitur, arti istilah), kamu boleh menjawab dari pengetahuanmu sendiri.

Aturan yang tidak boleh dilanggar:
1. Setiap angka (indeks, skor, durasi, tarif, jumlah stasiun, jarak, harga) WAJIB diambil dari KONTEKS. Jangan menghitung ulang, memperkirakan sendiri, atau mengarang angka.
2. Jangan mengarang jadwal keberangkatan, nomor kereta, gangguan, atau kondisi real-time. Bila ditanya, jelaskan bahwa LUMINA tidak punya data itu dan sarankan mengecek aplikasi resmi KAI Commuter — lalu tetap berikan apa yang bisa dibantu dari KONTEKS.
3. Bila hanya sebagian pertanyaan yang ada datanya, jawab bagian itu. Jangan menolak seluruh pertanyaan.
4. Indeks kepadatan adalah indeks relatif 0-100, BUKAN jumlah penumpang. Skor potensi adalah indeks komposit, BUKAN proyeksi pendapatan atau omzet.
5. Durasi dan tarif di KONTEKS adalah estimasi LUMINA, bukan jadwal atau tarif resmi. Sebutkan itu ketika memakainya.
6. Bila data yang kamu rujuk ber-reliability "low" atau "medium", sebutkan keterbatasannya secara singkat.
7. Bila pengguna menyebut stasiun yang tidak ada di KONTEKS, katakan terus terang bahwa stasiun itu belum tercakup LUMINA.
8. Jawab dengan bahasa yang sama dengan pertanyaan pengguna, ramah dan ringkas: paragraf pendek atau daftar singkat (misalnya urutan transit), paling banyak sekitar 8 kalimat.
9. Format hanya dengan Markdown sederhana: **tebal** untuk nama stasiun, lin, dan angka penting; *miring* bila perlu; daftar berpoin (- ) atau bernomor (1. ). Jangan memakai judul (#), tabel, tautan, blok kode, atau emoji."""


# --------------------------------------------------------------------------
#  Konteks: angka yang boleh dipakai model
# --------------------------------------------------------------------------
APP_GUIDE = {
    "Home": (
        "Rencanakan perjalanan: ketik stasiun asal dan tujuan, LUMINA mencari jalur KRL "
        "termasuk titik transit, menampilkan stasiun yang dilewati, perkiraan durasi dan "
        "tarif, serta pilihan slot keberangkatan beserta indeks kepadatannya."
    ),
    "Mulai perjalanan": (
        "Setelah memilih rute, perjalanan bisa dimulai, dijeda, atau dihentikan, dan bisa "
        "ditambah mampir ke UMKM atau toko di sekitar stasiun."
    ),
    "Explore": (
        "Peta kepadatan per slot waktu dengan layer yang bisa dinyalakan atau dimatikan, "
        "detail stasiun beserta fasilitasnya, dan perbandingan beberapa stasiun."
    ),
    "Business Potential": (
        "Skor potensi kawasan di sekitar stasiun dan rekomendasi kategori usaha yang "
        "memenuhi syarat."
    ),
    "Lumina AI": "Asisten ini: tanya tentang stasiun, rute, kepadatan, fasilitas, dan potensi usaha.",
}

# Nama panggilan yang tidak sama dengan nama resmi stasiun. Sengaja sedikit:
# alias umum seperti "kota" terlalu sering muncul sebagai kata biasa.
_STATION_ALIASES = {
    "ui": "universitas-indonesia",
    "priok": "tanjung-priok",
    "kalibata": "duren-kalibata",
}

_ROUTE_INTENT = re.compile(
    r"\b(rute|jalur|transit|naik|lewat|menuju|berapa lama|durasi|tarif|ongkos|biaya|tiket|dari|ke)\b"
)
_ORIGIN_CUE = re.compile(r"\b(dari|asal|berangkat dari)\s+(stasiun\s+|st\.?\s+)?$")
_DESTINATION_CUE = re.compile(r"\b(ke|menuju|tujuan|sampai)\s+(stasiun\s+|st\.?\s+)?$")

# Bagian konteks yang sama untuk setiap pertanyaan. Tetap dikirim ke model,
# tetapi tidak diulang di field `grounding` pada respons API.
_STATIC_KEYS = ("network_overview", "line_sequences", "app_guide", "reference")


def _name_patterns() -> list[tuple[re.Pattern, dict]]:
    pairs: list[tuple[str, dict]] = [
        (station["name"].lower(), station) for station in network.STATIONS
    ]
    pairs += [(alias, find_station(sid)) for alias, sid in _STATION_ALIASES.items()]
    # Nama terpanjang dicocokkan dulu, supaya "Depok Baru" tidak terbaca sebagai "Depok".
    pairs.sort(key=lambda item: len(item[0]), reverse=True)
    return [(re.compile(rf"\b{re.escape(name)}\b"), station) for name, station in pairs if station]


def _mentions(text: str) -> list[dict]:
    """Stasiun yang disebut dalam teks, urut sesuai kemunculan, beserta perannya."""
    lowered = " ".join((text or "").lower().split())
    taken: list[tuple[int, int]] = []
    found: list[dict] = []
    for pattern, station in _name_patterns():
        for match in pattern.finditer(lowered):
            span = match.span()
            if any(span[0] < end and start < span[1] for start, end in taken):
                continue
            taken.append(span)
            before = lowered[: span[0]]
            role = (
                "origin" if _ORIGIN_CUE.search(before)
                else "destination" if _DESTINATION_CUE.search(before)
                else None
            )
            found.append({"pos": span[0], "station": station, "role": role})
    found.sort(key=lambda item: item["pos"])
    unique: list[dict] = []
    for item in found:
        if all(item["station"]["id"] != other["station"]["id"] for other in unique):
            unique.append(item)
    return unique


def _resolve_route(question: str, history: list[dict] | None, focus: dict | None):
    """Tebak asal dan tujuan dari pertanyaan, riwayat, atau stasiun yang dibuka."""
    mentions = _mentions(question)
    if len(mentions) < 2:
        # Pertanyaan lanjutan seperti "berapa lama?" merujuk rute yang disebut sebelumnya.
        for turn in reversed(history or []):
            if turn.get("role") != "user":
                continue
            for item in _mentions(turn.get("content") or ""):
                if all(item["station"]["id"] != m["station"]["id"] for m in mentions):
                    mentions.append(item)
            if len(mentions) >= 2:
                break

    origin = next((m["station"] for m in mentions if m["role"] == "origin"), None)
    destination = next(
        (m["station"] for m in mentions
         if m["role"] == "destination" and (origin is None or m["station"]["id"] != origin["id"])),
        None,
    )
    rest = [m["station"] for m in mentions
            if m["station"] not in (origin, destination)]
    if origin is None and rest:
        origin = rest.pop(0)
    if destination is None and rest:
        destination = rest.pop(0)

    wants_route = bool(_ROUTE_INTENT.search(question.lower()))
    if focus and wants_route:
        # Hanya satu stasiun yang disebut: stasiun yang sedang dibuka di peta
        # melengkapi pasangannya, dan arahnya dibaca dari kata "dari"/"ke".
        single = origin or destination
        if single and not (origin and destination) and single["id"] != focus["id"]:
            role = next((m["role"] for m in mentions if m["station"]["id"] == single["id"]), None)
            if role == "origin":
                origin, destination = single, focus
            else:
                origin, destination = focus, single

    if origin and destination and origin["id"] != destination["id"]:
        return origin, destination, mentions
    return None, None, mentions


def _slot_indices(station: dict) -> dict:
    profile = geoai_service.station_crowd_profile(station)
    return {slot["label"]: slot["index"] for slot in profile["slots"]}


def _route_context(origin: dict, destination: dict) -> dict:
    from lumina.api.trips import _duration, _fare  # rumus yang sama dengan halaman Home

    route = describe_route(origin["id"], destination["id"])
    if not route:
        return {
            "from": origin["name"],
            "to": destination["name"],
            "found": False,
            "note": "LUMINA tidak menemukan jalur KRL yang menghubungkan kedua stasiun ini.",
        }

    segments = route["segments"]
    transfer_at = [segment["to"]["name"] for segment in segments[:-1]]
    stop_count = route["stop_count"]
    return {
        "from": origin["name"],
        "to": destination["name"],
        "found": True,
        "stations_passed": [item["name"] for item in route["path"]],
        "segments": [
            {
                "line": segment["line"],
                "from": segment["from"]["name"],
                "to": segment["to"]["name"],
                "stop_count": segment["stop_count"],
            }
            for segment in segments
        ],
        "transfer_count": len(transfer_at),
        "transfer_at": transfer_at,
        "stop_count": stop_count,
        "estimated_minutes": _duration(stop_count, len(transfer_at)),
        "estimated_fare_rupiah": _fare(stop_count),
        "estimate_note": (
            "Estimasi LUMINA: 3 menit per stasiun dan 6 menit per transit; tarif Rp3.000 "
            "ditambah Rp1.000 setiap 10 stasiun. Bukan jadwal atau tarif resmi KAI Commuter."
        ),
        "origin_crowd_by_slot": _slot_indices(origin),
        "destination_crowd_by_slot": _slot_indices(destination),
    }


def _station_detail(station: dict) -> dict:
    return {
        "id": station["id"],
        "name": station["name"],
        "line": station["line"],
        "district": station["district"],
        "interchange": station["interchange"],
        "crowd_profile": geoai_service.station_crowd_profile(station),
        "amenities": [
            {key: item.get(key) for key in ("label", "available", "spot", "hours", "count")}
            for item in places_service.station_amenities(station)
        ],
        "nearby_places": [
            {key: item.get(key) for key in
             ("name", "category", "spot", "distance_m", "walk_minutes", "price_band")}
            for item in places_service.nearby_places(station, limit=6)
        ],
        "detail_note": "Fasilitas dan UMKM sekitar bersifat proxy-derived, bukan survei lapangan.",
    }


def _static_context() -> dict:
    return {
        "network_overview": [
            {
                "name": station["name"],
                "line": station["line"],
                "district": station["district"],
                "interchange": station["interchange"],
                "reliability": geoai_service.reliability_of(station),
                "crowd_index_by_slot": _slot_indices(station),
            }
            for station in geoai_service.STATIONS
        ],
        "line_sequences": {
            line: [find_station(sid)["name"] for sid in ids if find_station(sid)]
            for line, ids in LINE_ROUTES.items()
        },
        "app_guide": APP_GUIDE,
        "reference": {
            "time_slots": [slot["label"] for slot in network.TIME_SLOTS],
            "business_categories": [item["label"] for item in network.BUSINESS_CATEGORIES],
            "data_sources": [
                {"name": item["name"], "role": item["role"]} for item in network.DATA_SOURCES
            ],
        },
    }


def build_context(
    station_id: str | None = None,
    area_id: str | None = None,
    question: str = "",
    history: list[dict] | None = None,
) -> dict:
    """Rakit seluruh angka milik sistem yang boleh dirujuk model untuk pertanyaan ini."""
    context: dict = {
        "scale_note": (
            "Indeks kepadatan 0-100 relatif; skor potensi 0-100 indeks komposit. "
            "Bukan jumlah penumpang, bukan proyeksi pendapatan."
        ),
        "time_slots": geoai_service.TIME_SLOTS,
        **_static_context(),
    }

    station = find_station(station_id) if station_id else None
    if station:
        context["station"] = geoai_service.station_crowd_profile(station)
        context["station_detail"] = _station_detail(station)

    area_station = find_station(area_id) if area_id else None
    if area_station:
        context["area"] = geoai_service.area_potential(area_station)
        context["area_categories"] = geoai_service.category_recommendations(area_station)

    origin, destination, mentions = _resolve_route(question, history, station)
    if origin and destination:
        context["route"] = _route_context(origin, destination)
        context["_route_card"] = _route_card(origin, destination)

    focus_ids = {item["id"] for item in (station, area_station) if item}
    mentioned = [m["station"] for m in mentions if m["station"]["id"] not in focus_ids][:3]
    if mentioned:
        context["mentioned_stations"] = [_station_detail(item) for item in mentioned]

    return context


def _grounding(context: dict) -> dict:
    """Konteks yang dikembalikan ke klien: tanpa bagian statis yang selalu sama."""
    return {
        key: value
        for key, value in context.items()
        if key not in _STATIC_KEYS and not key.startswith("_")
    }


def _route_card(origin: dict, destination: dict) -> dict | None:
    """Data kartu rute untuk panel chat: koordinat tiap ruas dan peran tiap stasiun."""
    from lumina.api.trips import _duration, _fare

    route = describe_route(origin["id"], destination["id"])
    if not route:
        return None

    transfer_ids = {item["station_id"] for item in route["transfers"]}

    def role_of(station_id: str) -> str:
        if station_id == origin["id"]:
            return "origin"
        if station_id == destination["id"]:
            return "destination"
        return "transfer" if station_id in transfer_ids else "pass"

    transfer_count = len(route["transfers"])
    return {
        "origin": {"id": origin["id"], "name": origin["name"]},
        "destination": {"id": destination["id"], "name": destination["name"]},
        "segments": [
            {"line": segment["line"], "points": [item["position"] for item in segment["stations"]]}
            for segment in route["segments"]
        ],
        "stops": [
            {
                "id": item["id"],
                "name": item["name"],
                "position": item["position"],
                "role": role_of(item["id"]),
            }
            for item in route["path"]
        ],
        "stop_count": route["stop_count"],
        "transfer_count": transfer_count,
        "estimated_minutes": _duration(route["stop_count"], transfer_count),
        "estimated_fare_rupiah": _fare(route["stop_count"]),
    }


_BUSINESS_WORDS = (
    "usaha", "bisnis", "potensi", "umkm", "jualan", "berjualan", "dagang",
    "investasi", "buka toko", "sewa", "franchise", "warung",
)


def _attachments(context: dict, question: str) -> dict:
    """Kartu dan tombol aksi untuk panel chat.

    Dirakit dari data sistem, bukan dari teks model: tombol selalu menunjuk
    stasiun yang benar-benar ada, dan tetap muncul saat jawaban memakai narasi
    cadangan. Paling banyak tiga tombol supaya tetap terbaca di panel sempit.
    """
    q = (question or "").lower()
    card = context.get("_route_card")
    actions: list[dict] = []

    if card:
        actions.append({
            "type": "plan_trip",
            "label": "Rencanakan di Home",
            "origin_id": card["origin"]["id"],
            "destination_id": card["destination"]["id"],
        })
        actions.append({
            "type": "open_station",
            "label": f"Lihat {card['destination']['name']} di peta",
            "station_id": card["destination"]["id"],
        })
    else:
        for detail in context.get("mentioned_stations", [])[:2]:
            actions.append({
                "type": "open_station",
                "label": f"Lihat {detail['name']} di peta",
                "station_id": detail["id"],
            })

    if any(word in q for word in _BUSINESS_WORDS):
        target = None
        if context.get("mentioned_stations"):
            first = context["mentioned_stations"][0]
            target = (first["id"], first["name"])
        elif context.get("area"):
            target = (context["area"]["station_id"], context["area"]["name"])
        elif context.get("station"):
            target = (context["station"]["station_id"], context["station"]["station_name"])
        if target:
            actions.append({
                "type": "open_area",
                "label": f"Lihat potensi usaha di {target[1]}",
                "station_id": target[0],
            })

    return {"route": card, "actions": actions[:3]}


# --------------------------------------------------------------------------
#  Narasi deterministik — dipakai saat model bahasa tidak tersedia
# --------------------------------------------------------------------------
def _format_rupiah(amount: int) -> str:
    return "Rp" + f"{amount:,}".replace(",", ".")


_SLOT_WORDS = (("pagi", 0), ("siang", 1), ("sore", 2), ("malam", 2))
_QUIET_WORDS = ("lengang", "sepi", "longgar", "kosong")
_BUSY_WORDS = ("padat", "ramai", "penuh", "sesak")
_AMENITY_WORDS = ("fasilitas", "musala", "mushola", "toilet", "restroom", "atm", "lift",
                  "elevator", "eskalator", "ruang tunggu", "minimarket")
_PLACE_WORDS = ("umkm", "toko", "makan", "kopi", "kafe", "cafe", "jajan", "kuliner", "warung")


def _targeted_fallback(context: dict, question: str) -> list[str]:
    """Jawaban cadangan yang mengikuti maksud pertanyaan, bukan ringkasan umum."""
    q = (question or "").lower()
    parts: list[str] = []
    details = [context["station_detail"]] if context.get("station_detail") else []
    details += context.get("mentioned_stations", [])

    if any(word in q for word in _AMENITY_WORDS) and details:
        detail = details[0]
        available = [item["label"] for item in detail["amenities"] if item["available"]]
        parts.append(
            f"Fasilitas di Stasiun {detail['name']}: {', '.join(available)}."
            if available else f"LUMINA belum mencatat fasilitas tersedia di Stasiun {detail['name']}."
        )

    if any(word in q for word in _PLACE_WORDS) and details:
        detail = details[0]
        spots = [
            f"{item['name']} ({item['category']}, {item['walk_minutes']} menit jalan kaki)"
            for item in detail["nearby_places"][:3]
        ]
        if spots:
            parts.append(f"UMKM dekat Stasiun {detail['name']}: {'; '.join(spots)}.")

    wants_quiet = any(word in q for word in _QUIET_WORDS)
    wants_busy = any(word in q for word in _BUSY_WORDS)
    if (wants_quiet or wants_busy) and not details and not context.get("route"):
        labels = [slot["label"] for slot in context["time_slots"]]
        index = next((idx for word, idx in _SLOT_WORDS if word in q), 0)
        label = labels[index]
        ranked = sorted(
            context["network_overview"],
            key=lambda row: row["crowd_index_by_slot"][label],
            reverse=wants_busy and not wants_quiet,
        )[:3]
        listing = ", ".join(f"{row['name']} (indeks {row['crowd_index_by_slot'][label]})" for row in ranked)
        kind = "lengang" if wants_quiet else "padat"
        parts.append(f"Stasiun paling {kind} pada slot {label}: {listing}. Indeks relatif 0-100, bukan jumlah penumpang.")

    return parts


def _fallback_answer(context: dict, question: str = "") -> str:
    station = context.get("station")
    if station is None and context.get("mentioned_stations"):
        station = context["mentioned_stations"][0]["crowd_profile"]
    area = context.get("area")
    parts: list[str] = []

    route = context.get("route")
    if route and route.get("found"):
        lines = " lalu ".join(f"lin {seg['line']}" for seg in route["segments"])
        transit = (
            f", transit di {', '.join(route['transfer_at'])}" if route["transfer_at"] else ", tanpa transit"
        )
        parts.append(
            f"Dari {route['from']} ke {route['to']} naik {lines}{transit}, melewati "
            f"{route['stop_count']} stasiun. Estimasi LUMINA sekitar {route['estimated_minutes']} "
            f"menit dengan tarif {_format_rupiah(route['estimated_fare_rupiah'])}."
        )
    elif route:
        parts.append(route["note"])

    targeted = _targeted_fallback(context, question)
    if targeted:
        return " ".join(parts + targeted)

    if station:
        rec = station["recommendation"]
        busiest = station["busiest_slot"]
        parts.append(
            f"{station['station_name']} paling padat pada slot {busiest['label']} "
            f"(indeks {busiest['index']}/100) dan paling lengang pada {rec['label']} "
            f"(indeks {rec['index']}/100)."
        )
        if station["reliability"] != "high":
            parts.append(
                "Keterandalan data stasiun ini belum tinggi, jadi angka di atas "
                "dibaca sebagai indikasi awal."
            )

    if area:
        parts.append(
            f"Kawasan {area['name']} punya skor potensi {area['potential_score']}/100 "
            f"dengan indeks risiko {area['risk_index']}/100."
        )
        viable = [
            item["label"] for item in context.get("area_categories", []) if item["viable"]
        ]
        if viable:
            parts.append("Kategori yang memenuhi tiga syarat: " + ", ".join(viable) + ".")
        else:
            parts.append("Belum ada kategori yang memenuhi ketiga syarat sekaligus di sel ini.")

    if not parts:
        parts.append(
            "Sebut nama stasiun, misalnya \"rute dari Bekasi ke Manggarai\", atau pilih "
            "stasiun di peta supaya saya bisa membacakan datanya."
        )

    return " ".join(parts)


# --------------------------------------------------------------------------
#  Panggilan Gemini API
# --------------------------------------------------------------------------
# Gemini menamai giliran asisten "model", bukan "assistant".
_ROLE_MAP = {"user": "user", "assistant": "model"}

# Alasan selesai yang berarti jawaban ditahan filter Google, bukan dijawab.
_BLOCKED_FINISH = {"SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"}

_THINKING_LEVELS = {"MINIMAL", "LOW", "MEDIUM", "HIGH"}


def _client():
    """Buat client Gemini, atau None bila fitur AI tidak aktif."""
    api_key = current_app.config.get("GEMINI_API_KEY")
    if not api_key:
        return None
    if genai is None:
        current_app.logger.warning(
            "Paket `google-genai` belum terpasang — asisten memakai narasi deterministik."
        )
        return None
    # HttpOptions.timeout dalam MILIDETIK, sedangkan konfigurasi LUMINA dalam
    # detik. Tanpa dikali 1000, batas 15 detik diam-diam jadi 15 milidetik dan
    # setiap permintaan gagal sebagai timeout.
    timeout_ms = int(current_app.config.get("AI_TIMEOUT_SECONDS", 15)) * 1000
    return genai.Client(
        api_key=api_key,
        http_options=genai_types.HttpOptions(
            timeout=timeout_ms,
            # Bawaan SDK mengulang sampai 5 kali. Untuk chat, satu kali ulang
            # cukup menutup gangguan sesaat tanpa membuat pengguna menunggu.
            retry_options=genai_types.HttpRetryOptions(attempts=2),
        ),
    )


class _DeadlineExceeded(Exception):
    """Gemini tidak menjawab dalam batas waktu keras."""


def _call_with_deadline(fn, seconds: float):
    """Jalankan `fn` dan menyerah setelah `seconds`, apa pun yang terjadi di dalamnya.

    Timeout SDK tidak bisa dijadikan pegangan: saat jaringan memblokir server
    Gemini, koneksi TCP menggantung di level sistem operasi dan melewati batas
    httpx — terukur lebih dari 60 detik untuk timeout yang diset 8 detik. Batas
    di sini dipasang di luar SDK, jadi REQ-F6-04 terjamin: pengguna selalu
    mendapat jawaban dari indeks tepat waktu. Thread yang tertinggal bersifat
    daemon dan mati sendiri begitu koneksinya menyerah.
    """
    outcome: dict = {}

    def runner():
        try:
            outcome["value"] = fn()
        except BaseException as exc:  # diteruskan ke pemanggil apa adanya
            outcome["error"] = exc

    worker = threading.Thread(target=runner, daemon=True, name="gemini-call")
    worker.start()
    worker.join(seconds)
    if worker.is_alive():
        raise _DeadlineExceeded()
    if "error" in outcome:
        raise outcome["error"]
    return outcome["value"]


def _thinking_config():
    level = (current_app.config.get("AI_THINKING_LEVEL") or "").strip().upper()
    if not level:
        return None
    if level not in _THINKING_LEVELS:
        current_app.logger.warning(
            "AI_THINKING_LEVEL=%r tidak dikenal; memakai bawaan model.", level
        )
        return None
    return genai_types.ThinkingConfig(thinking_level=level)


def _user_content(question: str, context: dict) -> str:
    return (
        "KONTEKS (satu-satunya sumber angka yang boleh kamu pakai):\n"
        f"{json.dumps({k: v for k, v in context.items() if not k.startswith('_')}, ensure_ascii=False, sort_keys=True)}\n\n"
        f"PERTANYAAN PENGGUNA:\n{question}"
    )


def _contents(question: str, context: dict, history: list[dict] | None) -> list:
    contents: list = []
    for turn in (history or [])[-6:]:
        role = _ROLE_MAP.get(turn.get("role"))
        text = (turn.get("content") or "").strip()
        if not role or not text:
            continue
        # Percakapan dikirim mulai dari giliran pengguna; potongan riwayat yang
        # kebetulan diawali jawaban model dibuang ujungnya.
        if not contents and role == "model":
            continue
        contents.append(
            genai_types.Content(role=role, parts=[genai_types.Part.from_text(text=text)])
        )
    contents.append(
        genai_types.Content(
            role="user",
            parts=[genai_types.Part.from_text(text=_user_content(question, context))],
        )
    )
    return contents


def ask(
    question: str,
    station_id: str | None = None,
    area_id: str | None = None,
    history: list[dict] | None = None,
) -> dict:
    """Jawab satu pertanyaan. Tidak pernah melempar error ke pemanggil."""
    context = build_context(
        station_id=station_id, area_id=area_id, question=question, history=history
    )
    client = _client()

    if client is None:
        return {
            "answer": _fallback_answer(context, question),
            "mode": "fallback",
            "model": None,
            "grounding": _grounding(context),
        "attachments": _attachments(context, question),
            "note": "Layanan model bahasa belum aktif. Jawaban dirakit langsung dari indeks.",
        }

    config = genai_types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        max_output_tokens=current_app.config["AI_MAX_TOKENS"],
        thinking_config=_thinking_config(),
        # Asisten tidak memberi tool apa pun ke model, jadi pemanggilan fungsi
        # otomatis dimatikan. Tanpa ini SDK mencatat peringatan AFC di setiap
        # pertanyaan, dan log jadi penuh derau yang menutupi error sungguhan.
        automatic_function_calling=genai_types.AutomaticFunctionCallingConfig(disable=True),
    )

    model = current_app.config["AI_MODEL"]
    contents = _contents(question, context, history)
    deadline = float(current_app.config.get("AI_TIMEOUT_SECONDS", 15))

    try:
        response = _call_with_deadline(
            lambda: client.models.generate_content(
                model=model, contents=contents, config=config
            ),
            deadline,
        )
    except _DeadlineExceeded:
        current_app.logger.error(
            "Gemini API tidak menjawab dalam %.0f detik — jawaban dirakit dari indeks.",
            deadline,
        )
        return _degraded(context, question, "Layanan AI tidak dapat dijangkau.")
    except genai_errors.ClientError as exc:
        # Gemini melaporkan key yang salah sebagai 400 "API key not valid",
        # bukan 401 — jadi pesannya ikut diperiksa, bukan hanya kodenya.
        if exc.code in (401, 403) or "API key" in (exc.message or ""):
            current_app.logger.error("GEMINI_API_KEY ditolak — periksa kredensial.")
            return _degraded(context, question, "Kredensial layanan AI ditolak.")
        if exc.code == 429:
            current_app.logger.warning("Gemini API kena batas kuota: %s", exc.message)
            return _degraded(context, question, "Kuota layanan AI habis. Coba lagi sebentar lagi.")
        current_app.logger.error("Gemini API menolak permintaan %s: %s", exc.code, exc.message)
        return _degraded(context, question, "Permintaan ke layanan AI ditolak.")
    except genai_errors.APIError as exc:
        current_app.logger.error("Gemini API error %s: %s", exc.code, exc.message)
        return _degraded(context, question, "Layanan AI sedang bermasalah.")
    except httpx.HTTPError as exc:
        current_app.logger.error("Tidak bisa menjangkau Gemini API: %s", exc)
        return _degraded(context, question, "Layanan AI tidak dapat dijangkau.")

    feedback = response.prompt_feedback
    candidate = response.candidates[0] if response.candidates else None
    finish = getattr(getattr(candidate, "finish_reason", None), "name", None)
    if (feedback and feedback.block_reason) or finish in _BLOCKED_FINISH:
        return _degraded(context, question, "Pertanyaan itu tidak dapat dijawab oleh layanan AI.")

    answer = (response.text or "").strip()
    if not answer:
        return _degraded(context, question, "Layanan AI tidak mengembalikan jawaban.")

    usage = response.usage_metadata
    return {
        "answer": answer,
        "mode": "model",
        "model": response.model_version or current_app.config["AI_MODEL"],
        "grounding": _grounding(context),
        "attachments": _attachments(context, question),
        "usage": {
            "input_tokens": getattr(usage, "prompt_token_count", None),
            "output_tokens": getattr(usage, "candidates_token_count", None),
            "thinking_tokens": getattr(usage, "thoughts_token_count", None),
            "cached_input_tokens": getattr(usage, "cached_content_token_count", None),
        },
    }


def _degraded(context: dict, question: str, note: str) -> dict:
    return {
        "answer": _fallback_answer(context, question),
        "mode": "fallback",
        "model": None,
        "grounding": _grounding(context),
        "attachments": _attachments(context, question),
        "note": note,
    }


# --------------------------------------------------------------------------
#  REQ-F6-01 — narasi otomatis saat pengguna memilih stasiun/sel
# --------------------------------------------------------------------------
def insight(station_id: str | None = None, area_id: str | None = None) -> dict:
    question = (
        "Ringkas kondisi lokasi ini dalam dua kalimat: kapan paling lengang, "
        "dan apa yang perlu diperhatikan sebelum mengambil keputusan."
    )
    return ask(question, station_id=station_id, area_id=area_id)


def suggestions(station_id: str | None = None, area_id: str | None = None) -> list[str]:
    """Pertanyaan pembuka untuk panel chat."""
    station = find_station(station_id) if station_id else None
    area = find_station(area_id) if area_id else None
    if area:
        return [
            f"Usaha apa yang berpeluang di {area['name']}?",
            f"Seberapa ketat persaingan di sekitar {area['name']}?",
            "Apa bukti di balik skor potensi ini?",
        ]
    if station:
        return [
            f"Kapan {station['name']} paling lengang?",
            f"Jam berapa sebaiknya saya berangkat dari {station['name']}?",
            "Seberapa dapat dipercaya angka ini?",
        ]
    return [
        "Rute dari Bekasi ke Sudirman lewat mana?",
        "Stasiun mana yang paling lengang pagi ini?",
        "Fasilitas apa saja di Stasiun Tanah Abang?",
    ]
