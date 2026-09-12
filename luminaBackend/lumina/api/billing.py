"""Paket langganan dan langganan milik akun.

Penagihan sungguhan (payment gateway, manajemen langganan berjenjang) berada di
luar cakupan MVP kompetisi — PRD §8 menyatakannya sebagai arah pasca-kompetisi.
Karena itu perubahan paket dicatat sebagai perubahan status, dan invoice hanya
merekam jejaknya tanpa memproses pembayaran.
"""
from __future__ import annotations

from datetime import timedelta

from flask import Blueprint
from flask_jwt_extended import current_user, jwt_required

from lumina.data.plans import PLANS, plan_by_id
from lumina.errors import NotFoundError, ValidationError
from lumina.extensions import db
from lumina.models import Invoice, Subscription
from lumina.utils.responses import success_response
from lumina.utils.timeutil import utcnow
from lumina.utils.validators import get_json_body

billing_bp = Blueprint("billing", __name__, url_prefix="/api")


@billing_bp.get("/plans")
def list_plans():
    return success_response(f"{len(PLANS)} paket langganan.", PLANS)


@billing_bp.get("/plans/<plan_id>")
def plan_detail(plan_id: str):
    plan = plan_by_id(plan_id)
    if plan is None:
        raise NotFoundError(f"Paket '{plan_id}' tidak ditemukan.")
    return success_response(f"Paket {plan['name']}.", plan)


@billing_bp.get("/subscription")
@jwt_required()
def current_subscription():
    record = Subscription.for_user(current_user.id)
    plan = plan_by_id(record.plan_id)
    return success_response(
        "Langganan aktif.",
        {**record.to_dict(), "plan": plan, "limits": plan["limits"] if plan else {}},
    )


@billing_bp.post("/subscription/change")
@jwt_required()
def change_plan():
    body = get_json_body()
    plan_id = (body.get("plan_id") or "").strip().lower()
    plan = plan_by_id(plan_id)

    if plan is None:
        raise ValidationError(errors={"plan_id": "Paket tidak dikenal."})
    if plan["price_amount"] is None:
        raise ValidationError(
            errors={"plan_id": "Paket Enterprise dikuotasi per koridor. Hubungi tim LUMINA."},
        )

    record = Subscription.for_user(current_user.id)
    if record.plan_id == plan_id and record.status == "active":
        return success_response("Kamu sudah memakai paket ini.", record.to_dict())

    record.plan_id = plan_id
    record.status = "active"
    record.cancelled_at = None
    record.started_at = utcnow()
    record.renews_at = utcnow() + timedelta(days=30) if plan["price_amount"] else None

    if plan["price_amount"]:
        db.session.add(Invoice(
            subscription_id=record.id,
            plan_id=plan_id,
            amount=plan["price_amount"],
            status="recorded",
        ))

    db.session.commit()
    return success_response(
        f"Paket berubah ke {plan['name']}.",
        {**record.to_dict(), "plan": plan},
        meta={"billing": "Pembayaran belum diproses pada MVP ini."},
    )


@billing_bp.post("/subscription/cancel")
@jwt_required()
def cancel_plan():
    record = Subscription.for_user(current_user.id)
    if record.plan_id == "explorer":
        raise ValidationError(
            errors={"plan_id": "Paket Explorer gratis dan tidak perlu dibatalkan."}
        )

    record.status = "cancelled"
    record.cancelled_at = utcnow()
    db.session.commit()

    return success_response(
        "Langganan dibatalkan. Akses berjalan sampai akhir periode berjalan.",
        record.to_dict(),
    )


@billing_bp.get("/subscription/invoices")
@jwt_required()
def list_invoices():
    record = Subscription.for_user(current_user.id)
    invoices = record.invoices.all()
    return success_response(
        f"{len(invoices)} riwayat pembayaran.",
        [invoice.to_dict() for invoice in invoices],
    )
