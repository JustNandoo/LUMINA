import { useCallback, useEffect, useState } from 'react'
import { ACTIVE_TRIP_EVENT, readActiveTrip } from '../lib/activeTrip'
import type { ActiveTrip } from '../lib/activeTrip'

/**
 * Perjalanan aktif, ikut berubah saat diperbarui dari mana pun.
 *
 * Mendengarkan dua sumber: event internal (perubahan dari tab ini) dan event
 * `storage` bawaan browser (perubahan dari tab lain) — supaya perjalanan yang
 * diakhiri di satu tab tidak tertinggal hidup di tab lainnya.
 */
export function useActiveTrip() {
  const [trip, setTrip] = useState<ActiveTrip | null>(() => readActiveTrip())

  const sync = useCallback(() => setTrip(readActiveTrip()), [])

  useEffect(() => {
    window.addEventListener(ACTIVE_TRIP_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(ACTIVE_TRIP_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [sync])

  return trip
}
