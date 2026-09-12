/**
 * Hook pengambilan data seragam untuk seluruh halaman.
 *
 * Menjaga tiga hal yang gampang salah kalau ditulis ulang di tiap halaman:
 * respons yang datang terlambat tidak menimpa hasil request yang lebih baru,
 * state tidak di-set setelah komponen dilepas, dan pesan error selalu berasal
 * dari `ApiError` sehingga teksnya sama dengan yang dikirim backend.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../lib/api'

export type ApiState<T> = {
  data: T | null
  loading: boolean
  error: string | null
  /** Kode error backend, mis. "ADMIN_ONLY" — berguna untuk membedakan 403. */
  errorCode: string | null
  reload: () => void
}

type InternalState<T> = {
  data: T | null
  loading: boolean
  error: string | null
  errorCode: string | null
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Terjadi kesalahan yang tidak terduga.'
}

export function errorCodeOf(error: unknown): string | null {
  return error instanceof ApiError ? error.code : null
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: { enabled?: boolean } = {},
): ApiState<T> {
  const enabled = options.enabled ?? true

  const [state, setState] = useState<InternalState<T>>({
    data: null,
    loading: enabled,
    error: null,
    errorCode: null,
  })
  const [nonce, setNonce] = useState(0)

  // Setiap request punya nomor urut; hanya yang terbaru boleh menulis state.
  const latest = useRef(0)
  const mounted = useRef(true)

  // Pemanggil membuat fungsi baru tiap render, jadi `fetcher` tidak bisa jadi
  // dependency — yang menentukan kapan request diulang adalah `deps`.
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const depsKey = JSON.stringify(deps)

  useEffect(() => {
    if (!enabled) return

    const ticket = ++latest.current
    const write = (patch: Partial<InternalState<T>>) => {
      if (!mounted.current || ticket !== latest.current) return
      setState((current) => ({ ...current, ...patch }))
    }

    // Mengambil data memang menyetel state dari dalam effect: status "loading"
    // menggambarkan request yang sedang berjalan, bukan hasil perhitungan atas
    // props/state, jadi tidak bisa diturunkan saat render.
    write({ loading: true, error: null, errorCode: null })

    fetcherRef
      .current()
      .then((data) => write({ data, loading: false }))
      .catch((caught) =>
        write({
          loading: false,
          error: errorMessage(caught),
          errorCode: errorCodeOf(caught),
        }),
      )
  }, [enabled, depsKey, nonce])

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  return {
    data: state.data,
    // Saat request dimatikan, tidak ada yang sedang dimuat.
    loading: enabled && state.loading,
    error: state.error,
    errorCode: state.errorCode,
    reload,
  }
}
