# Lumina

Frontend project built with Vite, React, TypeScript, and Tailwind CSS.

## Structure

```
src/
  assets/images/   Static images
  components/      Reusable UI components (ui/ + layout/)
  context/         AuthProvider — sesi login global
  data/            Mock data untuk peta & dashboard
  lib/             API client, endpoint auth, penyimpanan token
  pages/           Route-level page components
  routes/          Definisi route + guard
  theme/           Token warna & font
```

## Getting started

```bash
npm install
cp .env.example .env     # arahkan ke backend
npm run dev
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run ESLint
- `npm run preview` — preview the production build

---

## Autentikasi

Halaman auth terhubung ke backend Flask (`luminaBackend`). Jalankan backend lebih
dulu, lalu sesuaikan `.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:5050
VITE_GOOGLE_CLIENT_ID=
```

> Backend dijalankan dengan `PORT=5050 .venv/bin/python app.py` (di macOS port
> 5000 dipakai AirPlay). Pastikan `CORS_ORIGINS` di `.env` backend memuat
> `http://localhost:5173`.
>
> Vite hanya membaca `.env` saat start — restart `npm run dev` setelah mengubahnya.

### Alur

| Layar | Endpoint | Lanjut ke |
|---|---|---|
| Sign Up | `POST /api/auth/register` | `/verify-otp` |
| OTP Verification | `POST /api/auth/verify-otp` | `/app/home` (auto login) |
| Kirim Ulang OTP | `POST /api/auth/resend-otp` | — |
| Login | `POST /api/auth/login` | `/app/home`, atau `/verify-otp` kalau belum diverifikasi |
| Continue with Google | `POST /api/auth/google` | `/app/home` |
| Forgot Password | `POST /api/auth/forgot-password` | `/verify-otp` |
| OTP reset | `POST /api/auth/verify-reset-otp` | `/reset-password` |
| Reset Password | `POST /api/auth/reset-password` | `/login` |
| Profile → Save | `PATCH /api/auth/me` | — |
| Update Password | `POST /api/auth/change-password` | — |
| Sign out | `POST /api/auth/logout` | `/login` |

Halaman `/reset-password` menerima token dari dua sumber: query `?token=` (link di
email) atau `sessionStorage` (hasil verifikasi OTP).

### Berkas penting

| Berkas | Isi |
|---|---|
| `src/lib/api.ts` | `fetch` wrapper, kelas `ApiError`, auto-refresh token |
| `src/lib/authApi.ts` | Fungsi per endpoint + tipe `AuthUser` / `AuthTokens` |
| `src/lib/authStorage.ts` | Token (localStorage), state alur OTP (sessionStorage) |
| `src/context/AuthProvider.tsx` | Sesi global; validasi token ke `/me` saat aplikasi dibuka |
| `src/context/useAuth.ts` | Hook `useAuth()` |
| `src/routes/RouteGuards.tsx` | `ProtectedRoute` & `GuestRoute` |

### Penanganan token

- Access & refresh token disimpan di `localStorage` (`lumina.access_token`,
  `lumina.refresh_token`), profil di `lumina.user`.
- Saat access token kedaluwarsa, `api.ts` otomatis memanggil `/api/auth/refresh`
  lalu mengulang request. Beberapa request paralel hanya memicu **satu** refresh.
- Kalau refresh ikut gagal, sesi dibersihkan dan pengguna diarahkan ke `/login`.
- Ganti password membuat backend mencabut semua sesi lama dan mengirim token baru
  — token itu langsung disimpan supaya perangkat ini tidak ikut logout.

### Menangani error

Semua kegagalan menjadi `ApiError`:

```ts
try {
  await login({ email, password })
} catch (error) {
  if (error instanceof ApiError) {
    error.code               // mis. 'ACCOUNT_NOT_VERIFIED'
    error.fieldError('email') // pesan validasi per field
    error.meta               // mis. { retry_after_seconds: 42 }
  }
}
```

### Google Sign-In

Tombolnya otomatis disembunyikan kalau `VITE_GOOGLE_CLIENT_ID` kosong. Untuk
mengaktifkan: buat OAuth Client ID (tipe *Web application*) di Google Cloud
Console, tambahkan `http://localhost:5173` sebagai authorized JavaScript origin,
lalu isi client ID yang sama di `.env` frontend dan `GOOGLE_CLIENT_ID` di backend.

### Mode dev tanpa SMTP

Kalau backend belum dikonfigurasi SMTP, kode OTP ikut dikirim di response dan
ditampilkan sebagai banner "Mode dev" di layar OTP supaya alurnya tetap bisa
dites. Banner ini hilang sendiri begitu backend mengirim email sungguhan.

### Belum tersambung

- **Delete Account** di halaman Profile — backend belum punya endpointnya.
- **/admin** baru dijaga "harus login"; backend belum punya kolom role.
