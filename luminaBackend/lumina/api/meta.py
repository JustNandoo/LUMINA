"""Metadata rujukan: slot waktu, tingkat keterandalan, dan sumber data.

F8 REQ-F8-03 meminta sumber dan metadata data dapat ditelusuri dari antarmuka,
jadi legenda keterandalan dan daftar sumber dilayani sebagai data, bukan
ditulis ulang sebagai teks statis di frontend.
"""
from __future__ import annotations

from flask import Blueprint

from lumina.data.network import DATA_SOURCES, TIME_SLOTS
from lumina.services import geoai_service
from lumina.utils.responses import success_response

meta_bp = Blueprint("meta", __name__, url_prefix="/api/meta")


@meta_bp.get("")
def meta():
    return success_response("Metadata rujukan LUMINA.", geoai_service.meta_payload())


@meta_bp.get("/time-slots")
def time_slots():
    return success_response("Slot waktu tervalidasi survei.", TIME_SLOTS)


@meta_bp.get("/reliability")
def reliability():
    return success_response("Legenda tingkat keterandalan.", geoai_service.reliability_legend())


@meta_bp.get("/data-sources")
def data_sources():
    return success_response("Sumber data yang dipakai LUMINA.", DATA_SOURCES)
