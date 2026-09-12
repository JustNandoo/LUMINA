"""Cek kesiapan pengiriman email LUMINA.

Jalankan setelah mengisi MAIL_USERNAME / MAIL_PASSWORD di .env:

    .venv/bin/python scripts/check_email.py                 # cek login saja
    .venv/bin/python scripts/check_email.py tujuan@mail.com # cek login + kirim email uji

Skrip ini memeriksa berurutan: konfigurasi terbaca, sertifikat TLS, login SMTP,
lalu (opsional) benar-benar mengirim satu email memakai template OTP asli.
Tiap tahap yang gagal langsung menyebut penyebab dan cara memperbaikinya.
"""
from __future__ import annotations

import smtplib
import ssl
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from lumina import create_app  # noqa: E402

OK = "\033[92mOK\033[0m"
GAGAL = "\033[91mGAGAL\033[0m"


def main() -> int:
    recipient = sys.argv[1] if len(sys.argv) > 1 else None
    app = create_app()

    with app.app_context():
        user = app.config["MAIL_USERNAME"] or ""
        password = app.config["MAIL_PASSWORD"] or ""
        server = app.config["MAIL_SERVER"]
        port = app.config["MAIL_PORT"]

        # ---------------------------------------------------------- 1. config
        print("1. Konfigurasi")
        if not user or not password:
            print(f"   {GAGAL} MAIL_USERNAME / MAIL_PASSWORD masih kosong di .env")
            return 1
        if app.config["MAIL_SUPPRESS_SEND"]:
            print(f"   {GAGAL} MAIL_SUPPRESS_SEND=1 — email sengaja tidak dikirim.")
            print("         Set ke 0 di .env kalau mau kirim betulan.")
            return 1

        if "@" not in user:
            # Kesalahan yang paling sering: MAIL_USERNAME diisi nama tampilan
            # ("LUMINA") padahal SMTP memakainya sebagai identitas login dan
            # menuntut alamat email lengkap. Gagalnya muncul sebagai 535, yang
            # terbaca seperti "password salah" — padahal password-nya benar.
            print(f"   {GAGAL} MAIL_USERNAME = {user!r} bukan alamat email")
            print("         Ini identitas login SMTP, bukan nama pengirim.")
            print("         Isi dengan alamat lengkap, mis. nama@gmail.com.")
            print("         Nama tampilan diatur lewat MAIL_SENDER_NAME.")
            return 1

        print(f"   {OK} {user} lewat {server}:{port}")
        if len(password) != 16:
            print(
                f"   \033[93mPERINGATAN\033[0m panjang password {len(password)} karakter; "
                "app password Gmail selalu 16 karakter."
            )

        # ------------------------------------------------------------- 2. TLS
        print("2. Sertifikat & TLS")
        try:
            smtp = smtplib.SMTP(server, port, timeout=25)
            smtp.ehlo()
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
            print(f"   {OK} STARTTLS berhasil, sertifikat tervalidasi")
        except ssl.SSLCertVerificationError as exc:
            print(f"   {GAGAL} sertifikat tidak tervalidasi: {exc}")
            print("         Jalankan: /Applications/Python*/Install\\ Certificates.command")
            return 1
        except OSError as exc:
            print(f"   {GAGAL} tidak bisa menjangkau {server}:{port} — {exc}")
            print("         Cek koneksi internet atau firewall yang memblokir port SMTP.")
            return 1

        # ----------------------------------------------------------- 3. login
        print("3. Login SMTP")
        try:
            smtp.login(user, password)
            print(f"   {OK} kredensial diterima Google")
        except smtplib.SMTPAuthenticationError as exc:
            smtp.quit()
            # 534 dan 535 sama-sama "login ditolak", tapi penyebabnya berlawanan
            # dan obatnya berbeda. Menyamakan keduanya membuat orang membuat app
            # password baru berulang kali padahal yang lama tidak salah apa pun.
            if exc.smtp_code == 534:
                print(f"   {GAGAL} ditolak (534) — akun dikunci sementara oleh Google")
                print("         App password-nya SENDIRI tidak bermasalah; Google")
                print("         menganggap login ini mencurigakan dan minta pemilik")
                print("         akun memastikan lewat browser dulu.")
                print()
                print("         1. Login ke luminageospatialll@gmail.com di browser")
                print("         2. Buka https://accounts.google.com/DisplayUnlockCaptcha")
                print("            lalu tekan Continue")
                print("         3. Jalankan skrip ini lagi dalam 10 menit")
                return 1

            print(f"   {GAGAL} ditolak ({exc.smtp_code}) — app password tidak berlaku")
            print("         Periksa tiga hal di akun Google tersebut:")
            print("         a. Verifikasi 2 langkah AKTIF")
            print("            https://myaccount.google.com/signinoptions/twosv")
            print("         b. Buat app password baru (16 karakter)")
            print("            https://myaccount.google.com/apppasswords")
            print("         c. Password itu milik akun yang sama dengan MAIL_USERNAME")
            return 1

        # ------------------------------------------------------------ 4. kirim
        if not recipient:
            smtp.quit()
            print("\nSiap mengirim. Untuk uji kirim betulan:")
            print("   .venv/bin/python scripts/check_email.py alamat@tujuan.com")
            return 0

        print(f"4. Kirim email uji ke {recipient}")
        smtp.quit()
        try:
            from types import SimpleNamespace

            from lumina.services.mail_service import base_context, send_email
            from lumina.utils.timeutil import fmt_time, seconds_from_now

            expires_at = seconds_from_now(app.config["OTP_TTL_SECONDS"])
            # base_context() dipakai supaya email uji dirender persis seperti
            # email OTP sungguhan — kalau kontekstnya dirakit sendiri di sini,
            # yang diuji bukan lagi tampilan yang diterima pengguna.
            delivered = send_email(
                subject="Uji pengiriman email",
                recipient=recipient,
                template_name="otp_verification",
                context=base_context(
                    user=SimpleNamespace(full_name="Calon Pengguna", email=recipient),
                    code="123456",
                    ttl_minutes=max(1, round(app.config["OTP_TTL_SECONDS"] / 60)),
                    expires_at_local=fmt_time(expires_at),
                    reset_url=None,
                ),
                highlight="123456",
            )
        except Exception as exc:
            print(f"   {GAGAL} {type(exc).__name__}: {exc}")
            return 1

        if delivered:
            print(f"   {OK} email terkirim — cek kotak masuk {recipient}")
            return 0

        print(f"   {GAGAL} tidak terkirim; email dijatuhkan ke .mail_outbox/")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
