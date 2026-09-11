"""Bentuk response JSON yang seragam untuk seluruh API."""
from flask import jsonify


def success_response(message: str, data=None, status: int = 200, meta=None):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    if meta:
        payload["meta"] = meta
    return jsonify(payload), status


def error_response(
    message: str,
    status: int = 400,
    error_code: str = "BAD_REQUEST",
    errors=None,
    meta=None,
):
    payload = {"success": False, "message": message, "error_code": error_code}
    if errors:
        payload["errors"] = errors
    if meta:
        payload["meta"] = meta
    return jsonify(payload), status
