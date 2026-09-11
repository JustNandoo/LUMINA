/**
 * Pemetaan 1:1 ke endpoint /api/auth pada backend LUMINA.
 * Komponen memanggil fungsi di sini, bukan `fetch` langsung.
 */
import { apiRequest } from './api'
import type { OtpPurpose, PendingOtp } from './authStorage'

// ------------------------------------------------------------------ tipe
export type AuthUser = {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  provider: 'email' | 'google' | string
  is_verified: boolean
  is_active: boolean
  has_password: boolean
  created_at: string | null
  last_login_at: string | null
}

export type AuthTokens = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export type VerificationPayload = {
  email?: string
  masked_email?: string
  purpose?: OtpPurpose
  expires_at?: string
  expires_in_seconds?: number
  resend_available_in_seconds?: number
  retry_after_seconds?: number
  email_delivered?: boolean
  dev_otp_code?: string
}

export type Session = { user: AuthUser; tokens: AuthTokens }

// ------------------------------------------------------------- normalisasi
function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** Ubah payload verifikasi dari backend menjadi state layar OTP. */
export function toPendingOtp(
  raw: VerificationPayload | undefined,
  fallback: { email: string; purpose: OtpPurpose },
): PendingOtp {
  const now = Date.now()
  const payload = raw ?? {}

  const parsedExpiry = payload.expires_at ? Date.parse(payload.expires_at) : NaN
  const expiresAt = Number.isNaN(parsedExpiry)
    ? now + (toNumber(payload.expires_in_seconds) ?? 300) * 1000
    : parsedExpiry

  // Saat kena cooldown, backend mengirim retry_after_seconds — itu yang dipakai.
  const resendIn =
    toNumber(payload.retry_after_seconds) ??
    toNumber(payload.resend_available_in_seconds) ??
    60

  return {
    email: payload.email ?? fallback.email,
    maskedEmail: payload.masked_email ?? fallback.email,
    purpose: payload.purpose ?? fallback.purpose,
    expiresAt,
    resendAvailableAt: now + resendIn * 1000,
    devCode: payload.dev_otp_code,
    emailDelivered: payload.email_delivered,
  }
}

// -------------------------------------------------------------- pendaftaran
export async function register(input: {
  full_name: string
  email: string
  password: string
  confirm_password: string
}) {
  const result = await apiRequest<{
    user: AuthUser
    verification: VerificationPayload
  }>('/api/auth/register', { method: 'POST', body: input })

  return {
    message: result.message,
    user: result.data.user,
    pending: toPendingOtp(result.data.verification, {
      email: input.email,
      purpose: 'email_verification',
    }),
  }
}

export async function verifyEmailOtp(input: { email: string; otp: string }) {
  const result = await apiRequest<Session>('/api/auth/verify-otp', {
    method: 'POST',
    body: input,
  })
  return { message: result.message, ...result.data }
}

export async function resendOtp(input: { email: string; purpose: OtpPurpose }) {
  const result = await apiRequest<VerificationPayload>('/api/auth/resend-otp', {
    method: 'POST',
    body: input,
  })
  return {
    message: result.message,
    pending: toPendingOtp(result.data, input),
  }
}

// --------------------------------------------------------------------- masuk
export async function login(input: { email: string; password: string }) {
  const result = await apiRequest<Session>('/api/auth/login', {
    method: 'POST',
    body: input,
  })
  return { message: result.message, ...result.data }
}

export async function loginWithGoogle(idToken: string) {
  const result = await apiRequest<Session & { is_new_user: boolean }>(
    '/api/auth/google',
    { method: 'POST', body: { id_token: idToken } },
  )
  return { message: result.message, ...result.data }
}

// ---------------------------------------------------------- lupa password
export async function forgotPassword(email: string) {
  const result = await apiRequest<VerificationPayload>(
    '/api/auth/forgot-password',
    { method: 'POST', body: { email } },
  )
  return {
    message: result.message,
    pending: toPendingOtp(result.data, { email, purpose: 'password_reset' }),
  }
}

export async function verifyResetOtp(input: { email: string; otp: string }) {
  const result = await apiRequest<{
    reset_token: string
    expires_in_seconds: number
    reset_url: string
  }>('/api/auth/verify-reset-otp', { method: 'POST', body: input })
  return { message: result.message, resetToken: result.data.reset_token }
}

export async function resetPassword(input: {
  reset_token: string
  password: string
  confirm_password: string
}) {
  const result = await apiRequest<{ user: AuthUser }>('/api/auth/reset-password', {
    method: 'POST',
    body: input,
  })
  return { message: result.message, user: result.data.user }
}

// --------------------------------------------------------------- sesi aktif
export async function fetchMe() {
  const result = await apiRequest<{ user: AuthUser }>('/api/auth/me', { auth: true })
  return result.data.user
}

export async function updateMe(input: { full_name?: string; avatar_url?: string | null }) {
  const result = await apiRequest<{ user: AuthUser }>('/api/auth/me', {
    method: 'PATCH',
    auth: true,
    body: input,
  })
  return { message: result.message, user: result.data.user }
}

export async function changePassword(input: {
  current_password?: string
  new_password: string
  confirm_password: string
}) {
  const result = await apiRequest<Session>('/api/auth/change-password', {
    method: 'POST',
    auth: true,
    body: input,
  })
  return { message: result.message, ...result.data }
}

export async function logout(refreshToken?: string) {
  await apiRequest('/api/auth/logout', {
    method: 'POST',
    auth: true,
    body: refreshToken ? { refresh_token: refreshToken } : {},
  })
}
