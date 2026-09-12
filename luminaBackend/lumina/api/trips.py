"""Perencanaan perjalanan untuk halaman Home.

Rutenya dihitung di atas topologi jaringan sebenarnya (lumina/data/routes.py):
lintasan mengikuti urutan stasiun per lin, dan pergantian lin dihitung sebagai
transit. Yang membedakannya dari perencana rute biasa: tiap opsi keberangkatan
membawa indeks kepadatan stasiun asal pada slot itu (F3 bertemu F4).
"""
from __future__ import annotations

from datetime import timedelta

from flask import Blueprint, request

from lumina.data.network import TIME_SLOTS
from lumina.data.routes import describe_route
from lumina.errors import NotFoundError, ValidationError
from lumina.services import geoai_service
from lumina.utils.api import require_slot, require_station
from lumina.utils.responses import success_response
from lumina.utils.timeutil import to_wib, utcnow
from lumina.utils.validators import get_json_body

trips_bp = Blueprint("trips", __name__, url_prefix="/api/trips")

# Perkiraan waktu tempuh: jarak antar-stasiun KRL rata-rata ditempuh sekitar
# 3 menit termasuk berhenti, dan tiap transit menambah waktu tunggu peron.
MINUTES_PER_STOP = 3
MINUTES_PER_TRANSFER = 6
BASE_FARE = 3000
FARE_STEP_STOPS = 10
FARE_STEP_AMOUNT = 1000


def _fare(stop_count: int) -> int:
    return BASE_FARE + (stop_count // FARE_STEP_STOPS) * FARE_STEP_AMOUNT


def _duration(stop_count: int, transfer_count: int) -> int:
    return max(4, stop_count * MINUTES_PER_STOP + transfer_count * MINUTES_PER_TRANSFER)


def _slot_for_hour(hour: int) -> str:
    """Slot yang berlaku pada satu jam WIB.

    Di luar 06.00–20.00 tidak ada slot tervalidasi survei, jadi perjalanan
    dipetakan ke slot berikutnya yang tersedia (pagi), bukan dipaksa masuk
    slot sore yang jamnya sudah lewat.
    """
    if 6 <= hour < 12:
        return "morning"
    if 12 <= hour < 16:
        return "midday"
    if 16 <= hour < 20:
        return "evening"
    return "morning"


def _transfer_label(count: int) -> str:
    return "Langsung" if count == 0 else f"{count}x transit"


@trips_bp.post("/plan")
def plan_trip():
    body = get_json_body()
    origin = require_station(body.get("origin") or body.get("origin_id"))
    destination = require_station(body.get("destination") or body.get("destination_id"))

    if origin["id"] == destination["id"]:
        raise ValidationError(
            errors={"destination": "Stasiun tujuan harus berbeda dari stasiun asal."}
        )

    route = describe_route(origin["id"], destination["id"])
    if route is None:
        raise NotFoundError(
            f"Tidak ada lintasan kereta dari {origin['name']} ke {destination['name']} "
            "pada jaringan yang terdata."
        )

    now = to_wib(utcnow()).replace(second=0, microsecond=0)
    slot_id = require_slot(body.get("slot") or _slot_for_hour(now.hour))

    stop_count = route["stop_count"]
    transfer_count = len(route["transfers"])
    duration_minutes = _duration(stop_count, transfer_count)
    fare = _fare(stop_count)
    lines = " → ".join(segment["line"] for segment in route["segments"])

    # Satu opsi per slot waktu. Indeks kepadatan hanya punya resolusi per slot,
    # jadi menawarkan beberapa keberangkatan di dalam slot yang sama akan
    # menghasilkan angka keramaian yang identik — rekomendasi "jam lebih
    # lengang" baru bermakna kalau opsinya melintasi slot.
    options = []
    for slot in TIME_SLOTS:
        slot_start = now.replace(
            hour=int(slot["start"][:2]), minute=int(slot["start"][3:])
        )
        # Slot yang sedang berjalan berangkat dari sekarang, bukan dari jam
        # mulai slot yang sudah lewat.
        depart_at = now if slot["id"] == slot_id and now > slot_start else slot_start
        index = geoai_service.density_index(origin, slot["id"])

        options.append({
            "id": f"route-{slot['id']}",
            "line": f"KRL Commuter Line · {lines}",
            "slot_id": slot["id"],
            "slot_label": slot["label"],
            "departure": depart_at.strftime("%H.%M"),
            "arrival": (depart_at + timedelta(minutes=duration_minutes)).strftime("%H.%M"),
            "duration_minutes": duration_minutes,
            "transfer": _transfer_label(transfer_count),
            "fare": fare,
            "crowd_index": index,
            "crowd": geoai_service.crowd_level(index),
            "is_current_slot": slot["id"] == slot_id,
        })

    quietest = min(options, key=lambda item: item["crowd_index"])
    for option in options:
        option["recommended"] = option["id"] == quietest["id"]

    return success_response(
        f"{origin['name']} → {destination['name']} · {stop_count} perhentian.",
        {
            "origin": {
                "id": origin["id"],
                "name": origin["name"],
                "position": origin["position"],
            },
            "destination": {
                "id": destination["id"],
                "name": destination["name"],
                "position": destination["position"],
            },
            "stop_count": stop_count,
            "transfer_count": transfer_count,
            "options": options,
            # Lintasan sebenarnya: seluruh stasiun yang dilewati, ruas per lin,
            # titik transit, dan geometri untuk digambar di peta.
            "path": route["path"],
            "segments": route["segments"],
            "transfers": route["transfers"],
            "geometry": route["geometry"],
            "recommendation": {
                "option_id": quietest["id"],
                "slot_id": quietest["slot_id"],
                "reason": (
                    f"Slot {quietest['slot_label']} memberi indeks keramaian "
                    f"terendah ({quietest['crowd_index']}/100) di {origin['name']}."
                ),
            },
            "current_slot_id": slot_id,
            "reliability": geoai_service.reliability_of(origin),
        },
        meta={
            "scale": "Indeks keramaian relatif 0–100, bukan jumlah penumpang.",
            "time_slots": TIME_SLOTS,
        },
    )


@trips_bp.get("/route")
def route_only():
    """Lintasan saja, tanpa opsi keberangkatan — dipakai layer peta."""
    origin = require_station(request.args.get("origin"))
    destination = require_station(request.args.get("destination"))

    route = describe_route(origin["id"], destination["id"])
    if route is None:
        raise NotFoundError("Kedua stasiun tidak terhubung pada jaringan yang terdata.")

    return success_response(
        f"Lintasan {origin['name']} → {destination['name']}.", route
    )
