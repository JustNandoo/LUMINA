# Deploy LUMINA ke Vercel (satu project)

Halaman dan API berjalan di **satu domain**:

```
https://<nama-project>.vercel.app/            → halaman (folder lumina/)
https://<nama-project>.vercel.app/api/...     → backend Flask (folder luminaBackend/)
```

Pembagiannya diatur oleh `vercel.json` di root repo (fitur Vercel Services).
Karena satu domain, **tidak perlu mengatur CORS** dan frontend memanggil API
secara relatif. Lumina-AI tidak ikut di-deploy — aplikasi tidak memanggilnya.

---

## 1. Import repo

1. Login ke [vercel.com](https://vercel.com) dengan akun GitHub **JustNandoo**.
2. **Add New → Project →** pilih repo **LUMINA**.
3. **Root Directory: biarkan di root repo (`./`).** Jangan diubah ke `lumina`
   atau `luminaBackend` — `vercel.json` di root yang membagi keduanya.
4. Beri nama project. Nama ini menjadi alamat: `<nama>.vercel.app`.
5. **Jangan tekan Deploy dulu** — isi database dan environment variables di
   langkah 2 dan 3. (Kalau terlanjur, tidak apa-apa: deploy pertama akan gagal
   dengan pesan `SECRET_KEY belum diisi`, dan cukup di-redeploy setelahnya.)

## 2. Buat database (Neon Postgres)

1. Di project: **Storage → Create Database → Neon**.
2. Pilih region **Singapore** (terdekat dengan Indonesia).
3. **Connect** ke project ini untuk semua environment.

`DATABASE_URL` terisi otomatis. Tabel dan data rujukan awal (peran, paket B2B,
titik peta) dibuat sendiri oleh backend saat pertama kali berjalan.

## 3. Environment variables

**Settings → Environment Variables.** Buat dua nilai acak untuk secret dengan
perintah ini (jalankan dua kali, satu untuk tiap secret):

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Wajib

| Nama | Isi |
|---|---|
| `SECRET_KEY` | nilai acak dari perintah di atas |
| `JWT_SECRET_KEY` | nilai acak lain (jangan sama dengan `SECRET_KEY`) |
| `MAIL_SERVER` | `smtp.gmail.com` |
| `MAIL_PORT` | `587` |
| `MAIL_USE_TLS` | `1` |
| `MAIL_USE_SSL` | `0` |
| `MAIL_USERNAME` | alamat Gmail pengirim (lengkap, dengan `@gmail.com`) |
| `MAIL_PASSWORD` | app password Gmail 16 karakter |
| `MAIL_SENDER_NAME` | `LUMINA` |
| `MAIL_SENDER_EMAIL` | alamat Gmail yang sama dengan `MAIL_USERNAME` |
| `GEMINI_API_KEY` | key dari Google AI Studio |
| `VITE_MAPID_KEY` | key basemap MAPID |

### Opsional

| Nama | Isi |
|---|---|
| `GOOGLE_CLIENT_ID` dan `VITE_GOOGLE_CLIENT_ID` | untuk tombol *Continue with Google* (keduanya bernilai sama) |
| `AI_MODEL` | bawaan `gemini-3.8-flash` |

### Jangan diisi

| Nama | Alasan |
|---|---|
| `VITE_API_BASE_URL` | frontend otomatis memakai `/api` di domain yang sama |
| `FLASK_ENV` | backend otomatis memilih mode production di Vercel |
| `FRONTEND_URL` | otomatis memakai domain produksi project |
| `DATABASE_URL` | sudah diisi oleh integrasi Neon |
| `MAIL_SUPPRESS_SEND` | kalau diisi `1`, email tidak pernah terkirim |

> Nilai `VITE_*` dibaca saat build. Setiap kali mengubahnya, lakukan **Redeploy**.

## 4. Region fungsi

**Settings → Functions → Function Region → Singapore (`sin1`).**
Bawaannya di Amerika; Singapura jauh lebih cepat untuk pengguna Indonesia dan
berdekatan dengan database.

## 5. Deploy dan cek

Tekan **Deploy** (atau **Deployments → Redeploy**). Setelah selesai, buka:

```
https://<nama-project>.vercel.app/api/health
```

Yang diharapkan:

```json
{ "database": "connected", "mail": "smtp", "status": "ok" }
```

Lalu buka halaman utamanya, daftar akun, dan pastikan kode OTP masuk ke inbox.

## 6. Buat akun admin

Vercel tidak punya terminal, jadi dilakukan sekali dari laptop:

1. Daftar akun lewat halaman production dan verifikasi OTP-nya.
2. Salin `DATABASE_URL` dari **Settings → Environment Variables** (tombol mata).
3. Jalankan dari laptop:

```bash
cd /Users/alif/PENS/Eksternal/LUMINA/luminaBackend && .venv/bin/python -m pip install -r requirements.txt && DATABASE_URL="tempel-database-url-di-sini" .venv/bin/flask --app app make-admin emailkamu@gmail.com
```

Login ulang — akun itu sekarang masuk ke `/admin`.

---

## Kalau ada masalah

| Gejala | Penyebab & perbaikan |
|---|---|
| Deploy gagal: `SECRET_KEY belum diisi` | Isi `SECRET_KEY` dan `JWT_SECRET_KEY`, lalu Redeploy |
| `/api/health` menampilkan `"database": "error"` | Database Neon belum di-connect ke project (langkah 2) |
| `"mail": "dev-console"` | `MAIL_USERNAME` / `MAIL_PASSWORD` belum diisi |
| Peta kosong | `VITE_MAPID_KEY` belum diisi, atau belum Redeploy setelah mengisinya |
| Chat AI selalu "dirakit dari indeks" | `GEMINI_API_KEY` belum diisi atau kuota free tier habis |
| Error apa pun di API | **Deployments → pilih deploy → Logs** memuat pesan lengkapnya |

## Nanti saat punya domain

**Settings → Domains → Add**, arahkan DNS sesuai petunjuk Vercel. Halaman, API,
dan link reset password di email ikut pindah ke domain itu — tidak ada yang
perlu diubah di kode. (Kalau Google Sign-In dipakai, tambahkan domain barunya di
*Authorized JavaScript origins* Google Cloud Console.)

## Development di laptop tetap sama

```bash
cd /Users/alif/PENS/Eksternal/LUMINA/luminaBackend && PORT=5050 .venv/bin/python app.py
```

```bash
cd /Users/alif/PENS/Eksternal/LUMINA/lumina && npm run dev
```
