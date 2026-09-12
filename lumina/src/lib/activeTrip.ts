/**
 * Perjalanan yang sedang berlangsung.
 *
 * Disimpan di localStorage, bukan di server. Alasannya: perjalanan ini milik
 * satu perangkat dan satu sesi — menutup tab lalu membukanya lagi harus
 * mengembalikan keadaan yang sama, tetapi tidak ada yang perlu dibagikan
 * antar-perangkat. Begitu ada kebutuhan riwayat perjalanan lintas perangkat,
 * pindahkan ke tabel di backend; bentuk datanya sudah disiapkan seperti itu.
 */
import type { NearbyPlace, RouteOption, TripPlan } from './tripsApi'

const STORAGE_KEY = 'lumina:active-trip'

export type TripStatus = 'running' | 'paused' | 'finished'

export type TripStop = {
  /** Stasiun tempat singgah ini menempel. */
  stationId: string
  place: NearbyPlace
  addedAt: string
  done: boolean
}

export type ActiveTrip = {
  plan: TripPlan
  route: RouteOption
  status: TripStatus
  startedAt: string
  /** Stasiun ke berapa pada `plan.path` yang sudah dilewati. */
  progressIndex: number
  stops: TripStop[]
}

export const ACTIVE_TRIP_EVENT = 'lumina:active-trip-changed'

function notify() {
  window.dispatchEvent(new Event(ACTIVE_TRIP_EVENT))
}

export function readActiveTrip(): ActiveTrip | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ActiveTrip
    // Data lama dari versi sebelumnya bisa saja tidak lengkap; perlakukan
    // sebagai tidak ada daripada membuat halaman perjalanan crash.
    if (!parsed?.plan?.path || !parsed?.route) return null
    return parsed
  } catch {
    return null
  }
}

function write(trip: ActiveTrip | null) {
  try {
    if (trip === null) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trip))
  } catch {
    // Penyimpanan penuh atau diblokir — perjalanan tetap jalan di memori,
    // hanya tidak bertahan setelah halaman dimuat ulang.
  }
  notify()
}

export function startTrip(plan: TripPlan, route: RouteOption): ActiveTrip {
  const trip: ActiveTrip = {
    plan,
    route,
    status: 'running',
    startedAt: new Date().toISOString(),
    progressIndex: 0,
    stops: [],
  }
  write(trip)
  return trip
}

export function updateTrip(patch: Partial<ActiveTrip>): ActiveTrip | null {
  const current = readActiveTrip()
  if (!current) return null
  const next = { ...current, ...patch }
  write(next)
  return next
}

export function endTrip() {
  write(null)
}

export function addStop(stationId: string, place: NearbyPlace): ActiveTrip | null {
  const current = readActiveTrip()
  if (!current) return null
  // Satu tempat cukup ditambahkan sekali.
  if (current.stops.some((stop) => stop.place.id === place.id)) return current

  return updateTrip({
    stops: [
      ...current.stops,
      { stationId, place, addedAt: new Date().toISOString(), done: false },
    ],
  })
}

export function removeStop(placeId: string): ActiveTrip | null {
  const current = readActiveTrip()
  if (!current) return null
  return updateTrip({
    stops: current.stops.filter((stop) => stop.place.id !== placeId),
  })
}

export function toggleStopDone(placeId: string): ActiveTrip | null {
  const current = readActiveTrip()
  if (!current) return null
  return updateTrip({
    stops: current.stops.map((stop) =>
      stop.place.id === placeId ? { ...stop, done: !stop.done } : stop,
    ),
  })
}

/** Maju ke stasiun berikutnya; berhenti di stasiun terakhir. */
export function advance(): ActiveTrip | null {
  const current = readActiveTrip()
  if (!current) return null
  const last = current.plan.path.length - 1
  return updateTrip({ progressIndex: Math.min(current.progressIndex + 1, last) })
}

export function rewind(): ActiveTrip | null {
  const current = readActiveTrip()
  if (!current) return null
  return updateTrip({ progressIndex: Math.max(current.progressIndex - 1, 0) })
}
