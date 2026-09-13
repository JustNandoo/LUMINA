"""F6 — Asisten AI percakapan.

Endpoint ini tidak pernah membalas error ketika layanan model bahasa mati:
REQ-F6-04 mensyaratkan peta dan seluruh skor tetap dapat diakses, jadi
kegagalan API turun menjadi narasi deterministik dan tetap dibalas 200 dengan
penanda `mode: "fallback"` supaya frontend bisa menampilkannya apa adanya.
"""
from __future__ import annotations

from flask import Blueprint, current_app, request
from flask_jwt_extended import jwt_required

from lumina.errors import ValidationError
from lumina.services import assistant_service
from lumina.utils.responses import success_response
from lumina.utils.validators import get_json_body

assistant_bp = Blueprint("assistant", __name__, url_prefix="/api/assistant")

MAX_QUESTION_LENGTH = 500


@assistant_bp.get("/status")
def status():
    """Dipakai frontend untuk memutuskan apakah panel AI ditampilkan penuh."""
    return success_response(
        "Status layanan asisten.",
        {
            "enabled": bool(current_app.config.get("GEMINI_API_KEY")),
            "model": current_app.config["AI_MODEL"],
            "fallback_note": (
                "Saat layanan AI mati, jawaban tetap tersedia dalam bentuk "
                "narasi yang dirakit langsung dari indeks."
            ),
        },
    )


@assistant_bp.get("/suggestions")
def suggestions():
    return success_response(
        "Pertanyaan pembuka.",
        assistant_service.suggestions(
            station_id=request.args.get("station_id"),
            area_id=request.args.get("area_id"),
        ),
    )


@assistant_bp.post("/chat")
@jwt_required()
def chat():
    body = get_json_body()
    question = " ".join(str(body.get("question") or body.get("message") or "").split())

    if not question:
        raise ValidationError(errors={"question": "Pertanyaan wajib diisi."})
    if len(question) > MAX_QUESTION_LENGTH:
        raise ValidationError(
            errors={"question": f"Pertanyaan maksimal {MAX_QUESTION_LENGTH} karakter."}
        )

    history = body.get("history")
    if history is not None and not isinstance(history, list):
        raise ValidationError(errors={"history": "History harus berupa array."})

    result = assistant_service.ask(
        question,
        station_id=body.get("station_id"),
        area_id=body.get("area_id"),
        history=history,
    )

    return success_response(
        "Jawaban asisten.",
        {"question": question, **result},
        meta={"mode": result["mode"]},
    )


@assistant_bp.post("/insight")
@jwt_required()
def insight():
    """REQ-F6-01: narasi ringkas saat pengguna memilih stasiun atau sel."""
    body = get_json_body()
    station_id = body.get("station_id")
    area_id = body.get("area_id")

    if not station_id and not area_id:
        raise ValidationError(
            errors={"station_id": "Isi station_id atau area_id yang ingin dijelaskan."}
        )

    result = assistant_service.insight(station_id=station_id, area_id=area_id)
    return success_response("Narasi insight.", result, meta={"mode": result["mode"]})
