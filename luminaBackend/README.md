# LUMINA — Backend Auth (Flask)

Backend REST API untuk sistem autentikasi LUMINA sesuai desain UI:
**Sign Up → OTP Verification → Login → Forgot Password → Reset Password**,
lengkap dengan pengiriman kode OTP lewat email ber-template HTML bertema LUMINA.

---

## ✨ Fitur

| Layar di desain | Endpoint | Keterangan |
|---|---|---|
| Sign Up | `POST /api/auth/register` | Buat akun + kirim OTP ke email |
| OTP Verification | `POST /api/auth/verify-otp` | Aktivasi akun, langsung dapat token |
| Kirim Ulang OTP | `POST /api/auth/resend-otp` | Dibatasi cooldown 60 detik |
| Login | `POST /api/auth/login` | Access + refresh token (JWT) |
| Or continue with Google | `POST /api/auth/google` | Verifikasi Google ID token |
| Forgot Password | `POST /api/auth/forgot-password` | Kirim kode **dan** link reset |
| OTP (reset) | `POST /api/auth/verify-reset-otp` | Tukar OTP jadi `reset_token` |
| Reset Password | `POST /api/auth/reset-password` | Password baru + re-enter password |

Plus: `GET/PATCH /api/auth/me`, `POST /api/auth/change-password`,
`POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/logout-all`.

**Keamanan yang sudah dipasang**
- Password di-hash (Werkzeug/scrypt), OTP disimpan sebagai HMAC-SHA256 — tidak pernah plaintext.
- OTP 6 digit dari `secrets`, berlaku 5 menit, maksimal 5 kali percobaan, 1 kode aktif per tujuan.
- Rate limit: cooldown 60 detik antar-kirim + maksimal 5 kode per jam.
- Anti email-enumeration di `forgot-password` (respons selalu sama).
- Token reset sekali pakai (terikat hash password saat itu).
- Rotasi refresh token + blocklist JWT; reset/ganti password otomatis mengeluarkan semua perangkat.

---

## 🚀 Menjalankan

```bash
# 1. dependencies (virtualenv .venv sudah tersedia)
.venv/bin/pip install -r requirements.txt

# 2. konfigurasi — .env sudah dibuat otomatis, tinggal isi SMTP
cp .env.example .env   # kalau .env belum ada

# 3. jalankan
.venv/bin/python app.py
```

Server default di `http://127.0.0.1:5000`.
Di macOS port 5000 sering dipakai AirPlay/ControlCenter — pakai port lain:

```bash
PORT=5050 .venv/bin/python app.py
```

Cek server hidup:

```bash
curl http://127.0.0.1:5050/api/health
```

Uji seluruh alur auth (pakai database sementara, tidak mengubah data asli):

```bash
.venv/bin/python scripts/smoke_test.py
```

---

## 📧 Setup pengiriman email

Selama `MAIL_USERNAME`/`MAIL_PASSWORD` di `.env` masih kosong, **email tidak dikirim**:
kodenya muncul di console dan file HTML-nya tersimpan di `.mail_outbox/` supaya
desainnya tetap bisa dicek. Saat `FLASK_DEBUG=1`, kode OTP juga ikut di response
sebagai `dev_otp_code` agar mudah dites via Postman.

### Gmail (paling gampang)

1. Aktifkan 2-Step Verification di akun Google.
2. Buka <https://myaccount.google.com/apppasswords> → buat **App Password** (16 karakter).
3. Isi `.env`:

```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=1
MAIL_USERNAME=emailkamu@gmail.com
MAIL_PASSWORD=xxxxxxxxxxxxxxxx     # app password, bukan password Gmail
MAIL_SENDER_NAME=LUMINA
MAIL_SENDER_EMAIL=emailkamu@gmail.com
```

Restart server — `GET /api/health` akan menampilkan `"mail": "smtp"`.

> Provider lain: Mailtrap (`sandbox.smtp.mailtrap.io:2525`) untuk testing,
> atau Brevo/SendGrid/Resend untuk production.

### Preview desain email

Buka di browser saat server jalan:

```
http://127.0.0.1:5050/dev/emails
```

Template email (`lumina/templates/emails/`):

| File | Dipakai saat |
|---|---|
| `otp_verification.html` | Kode verifikasi setelah Sign Up |
| `otp_reset.html` | Kode + link reset password |
| `welcome.html` | Akun berhasil diverifikasi |
| `password_changed.html` | Notifikasi password berubah |

Semuanya bertema gelap LUMINA (navy `#0E1F38` + aksen cyan `#35D6F5`), layout
tabel dengan inline CSS supaya rapi di Gmail/Outlook/Apple Mail, punya versi
plain-text, dan menampilkan kode OTP dalam 6 kotak digit seperti di UI.

---

## 🔌 Contoh pemakaian API

Semua request/response memakai JSON. Endpoint terproteksi butuh header
`Authorization: Bearer <access_token>`.

### 1. Sign Up

```bash
curl -X POST http://127.0.0.1:5050/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "full_name": "Zaidan Alif",
    "email": "zaidan@gmail.com",
    "password": "lumina123",
    "confirm_password": "lumina123"
  }'
```

```jsonc
// 201 Created
{
  "success": true,
  "message": "Kode OTP sudah dikirim ke za*@gmail.com.",
  "data": {
    "user": { "id": "…", "full_name": "Zaidan Alif", "is_verified": false, … },
    "verification": {
      "email": "zaidan@gmail.com",
      "masked_email": "za*@gmail.com",       // untuk teks di layar OTP
      "purpose": "email_verification",
      "expires_in_seconds": 300,             // untuk countdown "04:18 menit"
      "resend_available_in_seconds": 60,     // untuk tombol "Kirim Ulang OTP"
      "email_delivered": true
    }
  }
}
```

### 2. Verifikasi OTP

```bash
curl -X POST http://127.0.0.1:5050/api/auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"email":"zaidan@gmail.com","otp":"417093"}'
```

Berhasil → `200` berisi `data.user` + `data.tokens` (langsung login).
Salah → `400` dengan `error_code: OTP_INCORRECT` dan `meta.attempts_left`.

### 3. Login

```bash
curl -X POST http://127.0.0.1:5050/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"zaidan@gmail.com","password":"lumina123"}'
```

Kalau akun belum diverifikasi → `403` `ACCOUNT_NOT_VERIFIED`, dan OTP baru
otomatis dikirim. Frontend tinggal membuka modal OTP memakai `meta`.

### 4. Forgot Password

```bash
curl -X POST http://127.0.0.1:5050/api/auth/forgot-password \
  -H 'Content-Type: application/json' -d '{"email":"zaidan@gmail.com"}'
```

Email berisi **kode OTP + tombol/link** `FRONTEND_URL/reset-password?token=…`.
Respons selalu `200` (biar email terdaftar tidak bisa ditebak).

### 5. Reset Password — dua jalur, pilih salah satu

**a. Lewat OTP** (sesuai layar OTP Verification):

```bash
# tukar OTP jadi reset_token
curl -X POST http://127.0.0.1:5050/api/auth/verify-reset-otp \
  -H 'Content-Type: application/json' \
  -d '{"email":"zaidan@gmail.com","otp":"417093"}'

# kirim password baru
curl -X POST http://127.0.0.1:5050/api/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"reset_token":"<dari langkah sebelumnya>",
       "password":"passwordbaru123","confirm_password":"passwordbaru123"}'
```

**b. Lewat link di email** — halaman reset ambil `?token=` dari URL lalu kirim
ke endpoint yang sama. Bisa juga sekali jalan: `{"email", "otp", "password", "confirm_password"}`.

### 6. Google Sign-In

Isi `GOOGLE_CLIENT_ID` di `.env`, lalu kirim credential dari Google Identity Services:

```bash
curl -X POST http://127.0.0.1:5050/api/auth/google \
  -H 'Content-Type: application/json' -d '{"id_token":"<google credential>"}'
```

### 7. Refresh & Logout

```bash
curl -X POST http://127.0.0.1:5050/api/auth/refresh  -H 'Authorization: Bearer <refresh_token>'
curl -X POST http://127.0.0.1:5050/api/auth/logout   -H 'Authorization: Bearer <access_token>' \
     -H 'Content-Type: application/json' -d '{"refresh_token":"<refresh_token>"}'
```

---

## 📦 Format respons

Sukses:

```json
{ "success": true, "message": "…", "data": { … }, "meta": { … } }
```

Gagal:

```json
{ "success": false, "message": "…", "error_code": "OTP_EXPIRED",
  "errors": { "email": "Format email tidak valid." } }
```

Kode error yang perlu ditangani frontend:

| `error_code` | HTTP | Aksi di UI |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Tampilkan pesan per field dari `errors` |
| `EMAIL_ALREADY_REGISTERED` | 409 | Arahkan ke tab Login |
| `INVALID_CREDENTIALS` | 401 | "Email atau password salah" |
| `ACCOUNT_NOT_VERIFIED` | 403 | Buka modal OTP Verification |
| `OTP_INCORRECT` | 400 | Tampilkan sisa percobaan (`meta.attempts_left`) |
| `OTP_EXPIRED` / `OTP_NOT_FOUND` | 400 | Tawarkan "Kirim Ulang OTP" |
| `OTP_LOCKED` | 429 | Wajib minta kode baru |
| `OTP_COOLDOWN` | 429 | Nonaktifkan tombol resend selama `meta.retry_after_seconds` |
| `RESET_TOKEN_INVALID` / `RESET_TOKEN_USED` | 400 | Kembali ke Forgot Password |
| `TOKEN_EXPIRED` / `TOKEN_REVOKED` | 401 | Coba `/refresh`, kalau gagal login ulang |

---

## 🗂 Struktur project

```
luminaBackend/
├── app.py                     # entry point
├── config.py                  # konfigurasi per environment
├── requirements.txt
├── .env / .env.example
├── scripts/smoke_test.py      # uji end-to-end seluruh alur auth
└── lumina/
    ├── __init__.py            # application factory, JWT callbacks, CLI
    ├── extensions.py          # db, migrate, jwt, mail, cors
    ├── errors.py              # ApiError + handler global
    ├── auth/routes.py         # semua endpoint auth
    ├── models/                # user, otp_codes, token_blocklist
    ├── services/              # otp, email, token, google
    ├── utils/                 # validator, security, response, waktu
    └── templates/emails/      # desain email HTML + plain-text
```

---

## 🛠 Perintah CLI

```bash
export FLASK_APP=app.py
.venv/bin/flask init-db                    # buat tabel
.venv/bin/flask reset-db                   # hapus & buat ulang (hati-hati)
.venv/bin/flask verify-user zaidan@gmail.com   # bypass OTP saat development
.venv/bin/flask purge-tokens               # bersihkan token kedaluwarsa
```

---

## 🚢 Catatan production

1. Ganti `SECRET_KEY` & `JWT_SECRET_KEY` dengan nilai acak baru.
2. `FLASK_ENV=production`, `FLASK_DEBUG=0` (menonaktifkan `dev_otp_code` & `/dev/emails`).
3. Pindah ke PostgreSQL lewat `DATABASE_URL`, lalu pakai migrasi:
   ```bash
   .venv/bin/flask db init && .venv/bin/flask db migrate -m "init" && .venv/bin/flask db upgrade
   ```
4. Isi `CORS_ORIGINS` dengan domain frontend yang sebenarnya.
5. Jalankan di belakang gunicorn: `gunicorn -w 4 "app:app"`.
6. Pakai layanan email khusus (Brevo/SendGrid/Resend) supaya email tidak masuk spam,
   dan set `MAIL_ASYNC=1` agar request tidak menunggu SMTP.
