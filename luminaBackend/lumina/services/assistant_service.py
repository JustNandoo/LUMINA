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

from flask import current_app

from lumina.data.network import find_station
from lumina.services import geoai_service

try:
    import anthropic
except ImportError:  # paket opsional — asisten tetap jalan lewat narasi deterministik
    anthropic = None

# Prompt sistem sengaja dibuat konstan (bukan f-string berisi waktu/ID) supaya
# prefix-nya stabil dan bisa dilayani dari prompt cache.
SYSTEM_PROMPT = """Kamu adalah asisten LUMINA, sebuah WebGIS GeoAI untuk kawasan transit KRL Jabodetabek.

Aturan yang tidak boleh dilanggar:
1. Jawab HANYA memakai angka yang ada di blok KONTEKS pada pesan pengguna. Dilarang keras menghitung, memperkirakan, atau mengarang angka lain.
2. Bila pertanyaan tidak dapat dijawab dari KONTEKS, katakan terus terang kamu tidak punya datanya. Jangan menebak.
3. Indeks kepadatan adalah indeks relatif 0-100, BUKAN jumlah penumpang. Jangan pernah menyebut jumlah orang.
4. Skor potensi adalah indeks komposit, BUKAN proyeksi pendapatan atau omzet. Jangan pernah menjanjikan pendapatan.
5. Bila KONTEKS menyebut reliability "low" atau "medium", sebutkan keterbatasan itu di jawabanmu.
6. Jawab dalam bahasa yang sama dengan pertanyaan pengguna. Ringkas: maksimal 4 kalimat, tanpa daftar bernomor kecuali diminta.
7. Sebut nama stasiun atau kawasan yang kamu rujuk secara eksplisit."""


# --------------------------------------------------------------------------
#  Konteks: angka yang boleh dipakai model
# --------------------------------------------------------------------------
def build_context(station_id: str | None = None, area_id: str | None = None) -> dict:
    """Rakit angka milik sistem yang relevan dengan fokus percakapan."""
    context: dict = {
        "scale_note": (
            "Indeks kepadatan 0-100 relatif; skor potensi 0-100 indeks komposit. "
            "Bukan jumlah penumpang, bukan proyeksi pendapatan."
        ),
        "time_slots": geoai_service.TIME_SLOTS,
    }

    station = find_station(station_id) if station_id else None
    if station:
        context["station"] = geoai_service.station_crowd_profile(station)

    area_station = find_station(area_id) if area_id else None
    if area_station:
        context["area"] = geoai_service.area_potential(area_station)
        context["area_categories"] = geoai_service.category_recommendations(area_station)

    if not station and not area_station:
        # Tanpa fokus: beri ringkasan koridor kalibrasi supaya model tetap
        # punya angka nyata untuk dirujuk.
        context["calibration_corridor"] = [
            geoai_service.station_crowd_profile(item)
            for item in geoai_service.STATIONS
            if item["calibrated"]
        ]

    return context


# --------------------------------------------------------------------------
#  Narasi deterministik — dipakai saat model bahasa tidak tersedia
# --------------------------------------------------------------------------
def _fallback_answer(context: dict) -> str:
    station = context.get("station")
    area = context.get("area")
    parts: list[str] = []

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
            "Pilih satu stasiun atau sel kawasan lebih dulu supaya saya bisa "
            "membacakan indeksnya."
        )

    return " ".join(parts)


# --------------------------------------------------------------------------
#  Panggilan Claude API
# --------------------------------------------------------------------------
def _client():
    """Buat client Anthropic, atau None bila fitur AI tidak aktif."""
    api_key = current_app.config.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    if anthropic is None:
        current_app.logger.warning(
            "Paket `anthropic` belum terpasang — asisten memakai narasi deterministik."
        )
        return None
    return anthropic.Anthropic(
        api_key=api_key,
        timeout=current_app.config.get("AI_TIMEOUT_SECONDS", 30.0),
    )


def _user_content(question: str, context: dict) -> str:
    return (
        "KONTEKS (satu-satunya sumber angka yang boleh kamu pakai):\n"
        f"{json.dumps(context, ensure_ascii=False, sort_keys=True)}\n\n"
        f"PERTANYAAN PENGGUNA:\n{question}"
    )


def ask(
    question: str,
    station_id: str | None = None,
    area_id: str | None = None,
    history: list[dict] | None = None,
) -> dict:
    """Jawab satu pertanyaan. Tidak pernah melempar error ke pemanggil."""
    context = build_context(station_id=station_id, area_id=area_id)
    client = _client()

    if client is None:
        return {
            "answer": _fallback_answer(context),
            "mode": "fallback",
            "model": None,
            "grounding": context,
            "note": "Layanan model bahasa belum aktif. Jawaban dirakit langsung dari indeks.",
        }

    messages: list[dict] = []
    for turn in (history or [])[-6:]:
        role = turn.get("role")
        content = (turn.get("content") or "").strip()
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": _user_content(question, context)})

    try:
        response = client.beta.messages.create(
            model=current_app.config["AI_MODEL"],
            max_tokens=current_app.config["AI_MAX_TOKENS"],
            system=[{
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }],
            messages=messages,
            output_config={"effort": current_app.config["AI_EFFORT"]},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError:
        current_app.logger.error("ANTHROPIC_API_KEY ditolak — periksa kredensial.")
        return _degraded(context, "Kredensial layanan AI ditolak.")
    except anthropic.RateLimitError:
        current_app.logger.warning("Claude API kena rate limit.")
        return _degraded(context, "Layanan AI sedang sibuk. Coba lagi sebentar lagi.")
    except anthropic.APIStatusError as exc:
        current_app.logger.error("Claude API error %s: %s", exc.status_code, exc.message)
        return _degraded(context, "Layanan AI sedang bermasalah.")
    except anthropic.APIConnectionError:
        current_app.logger.error("Tidak bisa menjangkau Claude API.")
        return _degraded(context, "Layanan AI tidak dapat dijangkau.")

    if response.stop_reason == "refusal":
        return _degraded(context, "Pertanyaan itu tidak dapat dijawab oleh layanan AI.")

    answer = next((block.text for block in response.content if block.type == "text"), "")
    if not answer.strip():
        return _degraded(context, "Layanan AI tidak mengembalikan jawaban.")

    return {
        "answer": answer.strip(),
        "mode": "model",
        "model": response.model,
        "grounding": context,
        "usage": {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "cache_read_input_tokens": getattr(
                response.usage, "cache_read_input_tokens", None
            ),
        },
    }


def _degraded(context: dict, note: str) -> dict:
    return {
        "answer": _fallback_answer(context),
        "mode": "fallback",
        "model": None,
        "grounding": context,
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
        "Kapan Tanah Abang lengang sore ini?",
        "Bandingkan kepadatan Manggarai dan Sudirman.",
        "Stasiun mana yang paling lengang pagi ini?",
    ]
