"""Langganan pengguna dan riwayat pembayarannya.

Paket (Explorer / Commercial / Enterprise) sendiri bersifat statis dan tinggal
di `lumina/data/plans.py`; tabel ini hanya mencatat paket mana yang sedang
dipakai satu akun. Penagihan sungguhan berada di luar cakupan MVP kompetisi
(PRD §8 Out of Scope), jadi perubahan paket dicatat tanpa memproses pembayaran.
"""
from __future__ import annotations

import uuid

from lumina.extensions import db
from lumina.utils.timeutil import iso, utcnow


def _uuid() -> str:
    return str(uuid.uuid4())


class Subscription(db.Model):
    __tablename__ = "subscriptions"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id"), unique=True, nullable=False, index=True
    )
    plan_id = db.Column(db.String(30), nullable=False, default="explorer")
    status = db.Column(db.String(20), nullable=False, default="active")
    started_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    renews_at = db.Column(db.DateTime, nullable=True)
    cancelled_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    invoices = db.relationship(
        "Invoice", back_populates="subscription", cascade="all, delete-orphan",
        lazy="dynamic", order_by="Invoice.issued_at.desc()",
    )

    @classmethod
    def for_user(cls, user_id: str) -> "Subscription":
        """Ambil langganan akun; buat sebagai Explorer bila belum ada."""
        record = db.session.execute(
            db.select(cls).filter_by(user_id=user_id)
        ).scalar_one_or_none()
        if record is None:
            record = cls(user_id=user_id, plan_id="explorer")
            db.session.add(record)
            db.session.commit()
        return record

    def to_dict(self) -> dict:
        from lumina.data.plans import plan_by_id

        plan = plan_by_id(self.plan_id)
        return {
            "id": self.id,
            "plan_id": self.plan_id,
            "plan_name": plan["name"] if plan else self.plan_id,
            "status": self.status,
            "started_at": iso(self.started_at),
            "renews_at": iso(self.renews_at),
            "cancelled_at": iso(self.cancelled_at),
        }


class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    subscription_id = db.Column(
        db.String(36), db.ForeignKey("subscriptions.id"), nullable=False, index=True
    )
    plan_id = db.Column(db.String(30), nullable=False)
    amount = db.Column(db.Integer, nullable=False, default=0)
    currency = db.Column(db.String(8), nullable=False, default="IDR")
    status = db.Column(db.String(20), nullable=False, default="paid")
    issued_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    subscription = db.relationship("Subscription", back_populates="invoices")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "plan_id": self.plan_id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "issued_at": iso(self.issued_at),
        }
