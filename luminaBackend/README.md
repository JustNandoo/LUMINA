# LUMINA — Backend (Flask)

Backend REST API LUMINA: autentikasi lengkap **plus** seluruh endpoint fitur
WebGIS-nya — profil kepadatan stasiun, peta indeks per slot waktu, perencanaan
perjalanan, potensi ekonomi kawasan, asisten AI, langganan, dan sisi admin.

Semua endpoint berada di bawah prefix `/api`.

**Batas klaim yang dipegang seluruh endpoint.** Indeks kepadatan adalah indeks
relatif 0–100, bukan jumlah penumpang. Skor potensi adalah indeks komposit
berbobot, bukan proyeksi pendapatan. Setiap angka membawa `reliability`
(`high`/`medium`/`low`), dan di luar koridor kalibrasi Manggarai–Tanah Abang–
Duri–Sudirman keluaran ditandai `predictive: false`.

---

## ✨ Fitur autentikasi

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

## 🗺 Endpoint fitur WebGIS

Semua endpoint di bawah memakai amplop respons yang sama dengan auth.
Tanda 🔒 = butuh access token, 🛡 = butuh akun ber-`role: "admin"`.

### Metadata & rujukan (F8)

| Endpoint | Keterangan |
|---|---|
| `GET /api/meta` | Slot waktu, legenda keterandalan, kategori usaha, sumber data, batas klaim |
| `GET /api/meta/time-slots` | Tiga slot tervalidasi survei |
| `GET /api/meta/reliability` | Arti tiap tingkat keterandalan |
| `GET /api/meta/data-sources` | Sumber data yang dipakai beserta perannya |

### Stasiun & kepadatan (F1–F5)

| Endpoint | Keterangan |
|---|---|
| `GET /api/network` | Lin, titik interchange, koridor kalibrasi |
| `GET /api/stations` | Daftar stasiun · filter `q`, `line`, `calibrated`, `slot`, paginasi |
| `GET /api/stations/<id>` | Detail stasiun + profil kepadatan + fasilitas |
| `GET /api/stations/<id>/crowd` | Profil seluruh slot + rekomendasi jam berangkat + faktor pendorong |
| `GET /api/stations/compare?ids=a,b&slot=` | Bandingkan 2–8 stasiun pada slot yang sama |
| `GET /api/density/cells?slot=` | Sel heatmap kepadatan (opsional `station_id`) |
| `GET /api/density/geojson?slot=` | Sel yang sama dalam FeatureCollection GeoJSON |

### Perencanaan perjalanan

| Endpoint | Keterangan |
|---|---|
| `POST /api/trips/plan` | Body `{origin, destination, slot?}` → satu opsi per slot waktu, lengkap dengan indeks keramaian dan slot terlengang |

### Potensi ekonomi kawasan (F7)

| Endpoint | Keterangan |
|---|---|
| `GET /api/business/categories` | Kategori usaha dari atribut Properti Go |
| `GET /api/business/areas` | Daftar kawasan · filter `q`, `min_score`, `max_risk` |
| `GET /api/business/areas/<id>` | Skor potensi, indeks risiko, sinyal, dan rekomendasi kategori |
| `GET /api/business/areas/<id>/categories?viable=1` | Kategori + bukti permintaan / persaingan / ruang |
| `GET /api/business/heatmap` | Titik potensi untuk layer heat |

### Asisten AI (F6)

| Endpoint | Keterangan |
|---|---|
| `GET /api/assistant/status` | Apakah layanan AI aktif |
| `GET /api/assistant/suggestions` | Pertanyaan pembuka sesuai konteks |
| 🔒 `POST /api/assistant/chat` | Body `{question, station_id?, area_id?, history?}` |
| 🔒 `POST /api/assistant/insight` | Narasi otomatis untuk stasiun/sel terpilih |

Jawaban selalu membawa `mode`: `"model"` bila dijawab Gemini, `"fallback"` bila
layanan AI mati — pada mode fallback jawabannya dirakit langsung dari indeks,
jadi panel AI tidak pernah kosong. Field `grounding` berisi persis angka yang
boleh dirujuk, sehingga frontend bisa menampilkan sumbernya.

### Langganan

| Endpoint | Keterangan |
|---|---|
| `GET /api/plans` · `GET /api/plans/<id>` | Paket Explorer / Commercial / Enterprise |
| 🔒 `GET /api/subscription` | Paket aktif + batasannya |
| 🔒 `POST /api/subscription/change` | Body `{plan_id}` |
| 🔒 `POST /api/subscription/cancel` | Batalkan langganan berbayar |
| 🔒 `GET /api/subscription/invoices` | Riwayat pembayaran |

### Sisi admin

| Endpoint | Keterangan |
|---|---|
| 🛡 `GET /api/admin/summary` | Ringkasan dasbor |
| 🛡 `GET/PATCH/DELETE /api/admin/users[/<id>]` | Kelola pengguna & role |
| 🛡 `GET/POST/PATCH/DELETE /api/admin/roles[/<id>]` | Kelola peran |
| 🛡 `GET/POST/PATCH/DELETE /api/admin/b2b-packages[/<id>]` | Kelola paket B2B |
| 🛡 `GET/POST/PATCH/DELETE /api/admin/b2b-partners[/<id>]` | Kelola mitra B2B |
| 🛡 `GET/POST/PATCH/DELETE /api/admin/survey-points[/<id>]` | Data survei kalibrasi |
| 🛡 `GET /api/admin/map/points` · `PATCH /api/admin/map/points/<id>` | Titik peta & status terbit |
| 🛡 `GET /api/admin/map/layers` · `PATCH /api/admin/map/layers/<id>` | Layer peta |
| 🛡 `POST /api/admin/map/sync-stations` | Tarik stasiun baru dari dataset jaringan |

Admin tidak bisa melepas role admin miliknya sendiri atau menghapus akunnya
sendiri, supaya sisi admin tidak pernah terkunci total.

---

## 🤖 Mengaktifkan asisten AI

Endpoint asisten berjalan tanpa konfigurasi apa pun — tanpa API key ia menjawab
dengan narasi deterministik dari indeks. Untuk mengaktifkan jawaban Gemini:

```bash
# .env
GEMINI_API_KEY=...                # gratis di https://aistudio.google.com/apikey
AI_MODEL=gemini-3.8-flash
AI_THINKING_LEVEL=low             # minimal | low | medium | high
```

Cek dengan `GET /api/assistant/status` — `enabled` akan menjadi `true`.

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
    ├── seeds.py               # data rujukan awal sisi admin
    ├── auth/routes.py         # semua endpoint auth
    ├── api/                   # endpoint fitur: meta, geo, trips,
    │                          #   business, assistant, billing, admin
    ├── data/                  # dataset rujukan: jaringan stasiun, paket
    ├── models/                # user, otp, token, admin, subscription
    ├── services/              # otp, email, token, google,
    │                          #   geoai_service, assistant_service
    ├── utils/                 # validator, security, response, waktu, api
    └── templates/emails/      # desain email HTML + plain-text
```

`services/geoai_service.py` adalah satu-satunya tempat indeks dihitung. Selama
keluaran Spatial XGBoost pada repo `Lumina-AI` belum terhubung, indeks
diturunkan dari sinyal proksi struktural secara deterministik dan ditandai
`method: "proxy-derived"`. Kontrak fungsinya sengaja dibuat tidak berubah,
sehingga penyambungan model nanti cukup mengganti isi fungsinya.

---

## 🛠 Perintah CLI

```bash
export FLASK_APP=app.py
.venv/bin/flask init-db                    # buat tabel
.venv/bin/flask reset-db                   # hapus & buat ulang (hati-hati)
.venv/bin/flask seed-reference             # isi peran, paket B2B, titik & layer peta
.venv/bin/flask make-admin zaidan@gmail.com    # jadikan akun sebagai admin
.venv/bin/flask verify-user zaidan@gmail.com   # bypass OTP saat development
.venv/bin/flask purge-tokens               # bersihkan token kedaluwarsa
```

`seed-reference` aman dijalankan berulang — baris yang sudah ada tidak ditimpa.

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
