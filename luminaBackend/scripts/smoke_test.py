"""Smoke test end-to-end seluruh alur auth LUMINA.

Memakai database sementara (tidak menyentuh lumina.db) dan email dimatikan,
jadi aman dijalankan kapan saja:

    python scripts/smoke_test.py
"""
import os, sys, tempfile
from pathlib import Path

DB = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{DB}"
os.environ["FLASK_ENV"] = "development"
os.environ["MAIL_SUPPRESS_SEND"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from lumina import create_app

app = create_app("development")
app.config.update(DEBUG=True, ENABLE_EMAIL_PREVIEW=True)
c = app.test_client()

PASS = FAIL = 0
def check(label, cond, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1; print(f"  \033[92mPASS\033[0m {label}")
    else:
        FAIL += 1; print(f"  \033[91mFAIL\033[0m {label} {extra}")

def post(path, payload=None, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    r = c.post(path, json=payload or {}, headers=headers)
    return r.status_code, r.get_json()

def age_otps(seconds=120):
    """Mundurkan created_at OTP supaya cooldown 60 detik terlewati."""
    from datetime import timedelta
    with app.app_context():
        from lumina.extensions import db as _db
        from lumina.models import OtpCode
        for o in _db.session.query(OtpCode).all():
            o.created_at = o.created_at - timedelta(seconds=seconds)
        _db.session.commit()

def get(path, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    r = c.get(path, headers=headers)
    return r.status_code, r.get_json()

print("\n=== 1. HEALTH ===")
s, b = get("/api/health")
check("health 200", s == 200 and b["status"] == "ok", b)

print("\n=== 2. REGISTER ===")
s, b = post("/api/auth/register", {"full_name": "Zaidan Alif", "email": "zaidan@gmail.com",
                                   "password": "lumina123", "confirm_password": "lumina123"})
check("register 201", s == 201, b)
check("user belum verified", b["data"]["user"]["is_verified"] is False)
check("masked email = za*@gmail.com", b["data"]["verification"]["masked_email"] == "za*@gmail.com",
      b["data"]["verification"]["masked_email"])
otp = b["data"]["verification"].get("dev_otp_code")
check("dapat kode OTP dev", bool(otp and len(otp) == 6), otp)

s, b = post("/api/auth/register", {"full_name": "Zaidan", "email": "zaidan@gmail.com",
                                   "password": "lumina123", "confirm_password": "lumina123"})
check("register ulang (belum verif) -> 200, kode lama tetap dipakai", s == 200, b)
check("tidak spam email saat cooldown", "masih berlaku" in b["message"], b["message"])

print("\n=== 3. VALIDASI INPUT ===")
s, b = post("/api/auth/register", {"full_name": "A", "email": "bukan-email", "password": "123"})
check("validasi 422", s == 422 and "errors" in b, b)
s, b = post("/api/auth/register", {"full_name": "Budi Santoso", "email": "budi@mail.com",
                                   "password": "lumina123", "confirm_password": "beda123"})
check("confirm password beda -> 422", s == 422 and "confirm_password" in b.get("errors", {}), b)

print("\n=== 4. LOGIN SEBELUM VERIFIKASI ===")
s, b = post("/api/auth/login", {"email": "zaidan@gmail.com", "password": "lumina123"})
check("login 403 ACCOUNT_NOT_VERIFIED", s == 403 and b["error_code"] == "ACCOUNT_NOT_VERIFIED", b)

print("\n=== 5. VERIFIKASI OTP ===")
s, b = post("/api/auth/verify-otp", {"email": "zaidan@gmail.com", "otp": "000000"})
check("OTP salah ditolak", s == 400 and b["error_code"] == "OTP_INCORRECT", b)
check("sisa percobaan dilaporkan", b.get("meta", {}).get("attempts_left") == 4, b.get("meta"))
s, b = post("/api/auth/verify-otp", {"email": "zaidan@gmail.com", "otp": otp})
check("OTP benar -> 200", s == 200, b)
check("akun terverifikasi", b["data"]["user"]["is_verified"] is True)
tokens = b["data"]["tokens"]
check("dapat access + refresh token", "access_token" in tokens and "refresh_token" in tokens)
s, b = post("/api/auth/verify-otp", {"email": "zaidan@gmail.com", "otp": otp})
check("OTP tidak bisa dipakai ulang", s == 200 and "sudah terverifikasi" in b["message"], b)

print("\n=== 6. ENDPOINT TERPROTEKSI ===")
s, b = get("/api/auth/me", tokens["access_token"])
check("/me 200", s == 200 and b["data"]["user"]["email"] == "zaidan@gmail.com", b)
s, b = get("/api/auth/me")
check("/me tanpa token -> 401", s == 401, b)
s, b = c.patch("/api/auth/me", json={"full_name": "Zaidan Alif Pratama"},
               headers={"Authorization": f"Bearer {tokens['access_token']}"}).status_code, None
check("PATCH /me 200", s == 200)

print("\n=== 7. LOGIN ===")
s, b = post("/api/auth/login", {"email": "zaidan@gmail.com", "password": "salah123"})
check("password salah -> 401", s == 401 and b["error_code"] == "INVALID_CREDENTIALS", b)
s, b = post("/api/auth/login", {"email": "zaidan@gmail.com", "password": "lumina123"})
check("login sukses", s == 200 and "tokens" in b["data"], b)
tokens = b["data"]["tokens"]

print("\n=== 8. REFRESH TOKEN ===")
s, b = post("/api/auth/refresh", token=tokens["refresh_token"])
check("refresh 200", s == 200, b)
new_tokens = b["data"]["tokens"]
s, b = post("/api/auth/refresh", token=tokens["refresh_token"])
check("refresh token lama dicabut (rotasi)", s == 401, b)
s, b = get("/api/auth/me", new_tokens["access_token"])
check("access token baru valid", s == 200, b)

print("\n=== 9. FORGOT PASSWORD ===")
s, b = post("/api/auth/forgot-password", {"email": "tidakada@mail.com"})
check("email asing tetap 200 (anti enumerasi)", s == 200, b)
s, b = post("/api/auth/forgot-password", {"email": "zaidan@gmail.com"})
check("forgot-password 200", s == 200, b)
reset_otp = b["data"].get("dev_otp_code")
check("dapat kode reset", bool(reset_otp), b["data"])

s, b = post("/api/auth/verify-reset-otp", {"email": "zaidan@gmail.com", "otp": reset_otp})
check("verify-reset-otp 200", s == 200 and "reset_token" in b["data"], b)
reset_token = b["data"]["reset_token"]

s, b = post("/api/auth/reset-password", {"reset_token": reset_token, "password": "barupass123",
                                         "confirm_password": "barupass123"})
check("reset-password 200", s == 200, b)
s, b = post("/api/auth/reset-password", {"reset_token": reset_token, "password": "lagilagi123",
                                         "confirm_password": "lagilagi123"})
check("reset token tidak bisa dipakai 2x", s == 400 and b["error_code"] == "RESET_TOKEN_USED", b)

s, b = get("/api/auth/me", new_tokens["access_token"])
check("semua sesi lama logout setelah reset", s == 401, b)
s, b = post("/api/auth/login", {"email": "zaidan@gmail.com", "password": "lumina123"})
check("password lama tidak berlaku", s == 401, b)
s, b = post("/api/auth/login", {"email": "zaidan@gmail.com", "password": "barupass123"})
check("login dengan password baru", s == 200, b)
tokens = b["data"]["tokens"]

print("\n=== 10. RESET LEWAT EMAIL+OTP LANGSUNG ===")
age_otps()
s, b = post("/api/auth/forgot-password", {"email": "zaidan@gmail.com"})
reset_otp = b["data"].get("dev_otp_code")
check("kirim ulang kode reset", bool(reset_otp), b["data"])
s, b = post("/api/auth/reset-password", {"email": "zaidan@gmail.com", "otp": reset_otp,
                                         "password": "finalpass123", "confirm_password": "finalpass123"})
check("reset via email+otp 200", s == 200, b)
s, b = post("/api/auth/login", {"email": "zaidan@gmail.com", "password": "finalpass123"})
check("login password final", s == 200, b)
tokens = b["data"]["tokens"]

print("\n=== 11. CHANGE PASSWORD & LOGOUT ===")
s, b = post("/api/auth/change-password", {"current_password": "salah", "new_password": "abcd1234",
                                          "confirm_password": "abcd1234"}, token=tokens["access_token"])
check("password lama salah -> 422", s == 422, b)
s, b = post("/api/auth/change-password", {"current_password": "finalpass123", "new_password": "abcd1234",
                                          "confirm_password": "abcd1234"}, token=tokens["access_token"])
check("change-password 200", s == 200, b)
tokens = b["data"]["tokens"]
s, b = get("/api/auth/me", tokens["access_token"])
check("token baru dari change-password valid", s == 200, b)
s, b = post("/api/auth/logout", {"refresh_token": tokens["refresh_token"]}, token=tokens["access_token"])
check("logout 200", s == 200, b)
s, b = get("/api/auth/me", tokens["access_token"])
check("token setelah logout ditolak", s == 401, b)

print("\n=== 12. RATE LIMIT OTP ===")
s, b = post("/api/auth/register", {"full_name": "Rate Test", "email": "rate@mail.com",
                                   "password": "lumina123", "confirm_password": "lumina123"})
check("register user rate-test", s == 201, b)
s, b = post("/api/auth/resend-otp", {"email": "rate@mail.com"})
check("resend terlalu cepat -> 429 cooldown", s == 429 and b["error_code"] == "OTP_COOLDOWN", b)
check("ada retry_after_seconds", b.get("meta", {}).get("retry_after_seconds", 0) > 0, b.get("meta"))

print("\n=== 13. GOOGLE (belum dikonfigurasi) ===")
s, b = post("/api/auth/google", {"id_token": "dummy"})
check("google -> 501 kalau CLIENT_ID kosong", s == 501, b)

print("\n=== 14. RENDER EMAIL ===")
for tpl in ("otp_verification", "otp_reset", "welcome", "password_changed"):
    r = c.get(f"/dev/emails/{tpl}")
    html = r.get_data(as_text=True)
    check(f"template {tpl} render", r.status_code == 200 and "LUMINA" in html, r.status_code)
r = c.get("/dev/emails/otp_verification?code=417093")
html = r.get_data(as_text=True)
check("6 kotak digit OTP ada di email", html.count("lm-otp-cell") >= 7, html.count("lm-otp-cell"))

print(f"\n{'='*50}\n  HASIL: {PASS} pass, {FAIL} fail\n{'='*50}")
sys.exit(1 if FAIL else 0)
