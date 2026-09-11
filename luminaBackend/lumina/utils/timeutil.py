"""Helper waktu. Semua timestamp disimpan sebagai naive-UTC agar konsisten
di semua database (SQLite tidak menyimpan timezone)."""
from datetime import datetime, timedelta, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def seconds_from_now(seconds: int) -> datetime:
    return utcnow() + timedelta(seconds=seconds)


def seconds_left(moment: datetime | None) -> int:
    """Sisa detik menuju `moment` (0 kalau sudah lewat)."""
    if moment is None:
        return 0
    return max(0, int((moment - utcnow()).total_seconds()))


def iso(moment: datetime | None) -> str | None:
    if moment is None:
        return None
    return moment.replace(tzinfo=timezone.utc).isoformat()


WIB = timezone(timedelta(hours=7))


def to_wib(moment: datetime) -> datetime:
    """Naive-UTC -> waktu Indonesia Barat (UTC+7) untuk ditampilkan di email."""
    return moment.replace(tzinfo=timezone.utc).astimezone(WIB)


def fmt_time(moment: datetime) -> str:
    return to_wib(moment).strftime("%H:%M")


def fmt_datetime(moment: datetime) -> str:
    return to_wib(moment).strftime("%d %B %Y, %H:%M")


def utcnow_s() -> datetime:
    """Naive-UTC dengan presisi detik (JWT `iat` juga hanya presisi detik)."""
    return utcnow().replace(microsecond=0)
