/**
 * Klien HTTP untuk backend LUMINA (Flask).
 *
 * Backend selalu membalas amplop yang sama:
 *   sukses -> { success: true,  message, data?, meta? }
 *   gagal  -> { success: false, message, error_code, errors?, meta? }
 *
 * Semua kegagalan dinormalkan menjadi `ApiError` supaya komponen cukup
 * membaca `error.code` dan `error.fieldErrors`.
 */
import { clearTokens, readTokens, writeTokens } from './authStorage'

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5050'
).replace(/\/+$/, '')

export const SESSION_EXPIRED_EVENT = 'lumina:session-expired'

export type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
  meta?: Record<string, unknown>
}

type ErrorPayload = {
  message?: string
  error_code?: string
  errors?: Record<string, string>
  meta?: Record<string, unknown>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Record<string, string>
  readonly meta: Record<string, unknown>

  constructor(
    message: string,
    options: {
      status?: number
      code?: string
      fieldErrors?: Record<string, string>
      meta?: Record<string, unknown>
    } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status ?? 0
    this.code = options.code ?? 'UNKNOWN_ERROR'
    this.fieldErrors = options.fieldErrors ?? {}
    this.meta = options.meta ?? {}
  }

  /** Pesan error untuk satu field form, kalau ada. */
  fieldError(...names: string[]): string | undefined {
    for (const name of names) {
      if (this.fieldErrors[name]) return this.fieldErrors[name]
    }
    return undefined
  }

  get isNetworkError() {
    return this.status === 0
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Sertakan access token dari storage. */
  auth?: boolean
  /** Token eksplisit (dipakai untuk /refresh dan /logout). */
  token?: string
  signal?: AbortSignal
}

async function rawRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const { method = 'GET', body, auth = false, token, signal } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const bearer = token ?? (auth ? readTokens().accessToken : undefined)
  if (bearer) headers.Authorization = `Bearer ${bearer}`

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      'Tidak bisa terhubung ke server LUMINA. Pastikan backend sudah berjalan.',
      { code: 'NETWORK_ERROR' },
    )
  }

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const error = (payload ?? {}) as ErrorPayload
    throw new ApiError(error.message ?? `Terjadi kesalahan (${response.status}).`, {
      status: response.status,
      code: error.error_code ?? 'HTTP_ERROR',
      fieldErrors: error.errors,
      meta: error.meta,
    })
  }

  return (payload ?? { success: true, message: '', data: undefined }) as ApiEnvelope<T>
}

// --- Refresh token: hanya satu permintaan yang jalan meski dipanggil paralel ---
let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const { refreshToken } = readTokens()
      if (!refreshToken) return null
      try {
        const result = await rawRequest<{
          tokens: { access_token: string; refresh_token: string }
        }>('/api/auth/refresh', { method: 'POST', token: refreshToken })
        writeTokens(result.data.tokens)
        return result.data.tokens.access_token
      } catch {
        clearTokens()
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
        return null
      }
    })().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

const RETRYABLE = new Set(['TOKEN_EXPIRED', 'TOKEN_REVOKED'])

/**
 * Request ke API. Kalau access token kedaluwarsa, token otomatis diperbarui
 * lewat /refresh lalu request diulang satu kali.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  try {
    return await rawRequest<T>(path, options)
  } catch (error) {
    const retryable =
      error instanceof ApiError &&
      options.auth &&
      !options.token &&
      error.status === 401 &&
      RETRYABLE.has(error.code)

    if (!retryable) throw error

    const freshToken = await refreshAccessToken()
    if (!freshToken) throw error
    return rawRequest<T>(path, { ...options, token: freshToken })
  }
}

export const apiBaseUrl = BASE_URL
