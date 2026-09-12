import { useEffect, useState } from 'react'

/**
 * Menunda nilai supaya pencarian tidak menembak API tiap ketikan.
 * Dipakai halaman admin yang pencariannya dijalankan di sisi server.
 */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}
