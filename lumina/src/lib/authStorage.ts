/**
 * Penyimpanan sesi di browser.
 *
 * - token & profil  -> localStorage (bertahan setelah tab ditutup)
 * - state alur OTP  -> sessionStorage (hilang saat tab ditutup, tapi tahan refresh)
 *
 * Semua akses dibungkus try/catch karena storage bisa dilarang
 * (mode private / setting browser) dan melempar error saat diakses.
 */
import type { AuthTokens, AuthUser } from './authApi'

const ACCESS_TOKEN_KEY = 'lumina.access_token'
const REFRESH_TOKEN_KEY = 'lumina.refresh_token'
const USER_KEY = 'lumina.user'
const PENDING_OTP_KEY = 'lumina.pending_otp'
const RESET_TOKEN_KEY = 'lumina.reset_token'

function read(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function write(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value)
  } catch {
    /* storage tidak tersedia - abaikan */
  }
}

function remove(storage: Storage, key: string) {
  try {
    storage.removeItem(key)
  } catch {
    /* storage tidak tersedia - abaikan */
  }
}

// ----------------------------------------------------------------- token
export function readTokens() {
  return {
    accessToken: read(localStorage, ACCESS_TOKEN_KEY) ?? undefined,
    refreshToken: read(localStorage, REFRESH_TOKEN_KEY) ?? undefined,
  }
}

export function writeTokens(tokens: Pick<AuthTokens, 'access_token' | 'refresh_token'>) {
  write(localStorage, ACCESS_TOKEN_KEY, tokens.access_token)
  if (tokens.refresh_token) write(localStorage, REFRESH_TOKEN_KEY, tokens.refresh_token)
}

export function clearTokens() {
  remove(localStorage, ACCESS_TOKEN_KEY)
  remove(localStorage, REFRESH_TOKEN_KEY)
  remove(localStorage, USER_KEY)
}

// ------------------------------------------------------------------ user
export function readStoredUser(): AuthUser | null {
  const raw = read(localStorage, USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function writeStoredUser(user: AuthUser) {
  write(localStorage, USER_KEY, JSON.stringify(user))
}

// ------------------------------------------------- alur OTP yang tertunda
export type OtpPurpose = 'email_verification' | 'password_reset'

export type PendingOtp = {
  email: string
  maskedEmail: string
  purpose: OtpPurpose
  /** epoch ms saat kode kedaluwarsa */
  expiresAt: number
  /** epoch ms saat tombol "Kirim Ulang OTP" bisa ditekan lagi */
  resendAvailableAt: number
  /** hanya terisi saat backend berjalan mode dev (SMTP belum diisi) */
  devCode?: string
  /** false kalau backend tidak benar-benar mengirim email */
  emailDelivered?: boolean
}

export function readPendingOtp(): PendingOtp | null {
  const raw = read(sessionStorage, PENDING_OTP_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PendingOtp
  } catch {
    return null
  }
}

export function writePendingOtp(pending: PendingOtp) {
  write(sessionStorage, PENDING_OTP_KEY, JSON.stringify(pending))
}

export function clearPendingOtp() {
  remove(sessionStorage, PENDING_OTP_KEY)
}

// --------------------------------------------- token reset password (OTP)
export function readResetToken(): string | null {
  return read(sessionStorage, RESET_TOKEN_KEY)
}

export function writeResetToken(token: string) {
  write(sessionStorage, RESET_TOKEN_KEY, token)
}

export function clearResetToken() {
  remove(sessionStorage, RESET_TOKEN_KEY)
}
