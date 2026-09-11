import { stations } from '../../../data/stations'
import type { LatLng } from '../../../data/stations'

export type CrowdLevel = 'low' | 'moderate' | 'high'

/**
 * Skala kepadatan memakai token palet yang sama dengan indikator keterandalan
 * di halaman Help: cyan untuk aman, warning untuk hati-hati, danger untuk
 * padat. Warnanya tidak pernah berdiri sendiri — selalu disertai teks.
 */
export const crowdTone: Record<
  CrowdLevel,
  { label: string; text: string; dot: string; chip: string }
> = {
  low: {
    label: 'Low',
    text: 'text-brand-cyan',
    dot: 'bg-brand-cyan',
    chip: 'bg-brand-cyan/15 text-brand-cyan',
  },
  moderate: {
    label: 'Moderate',
    text: 'text-warning-soft',
    dot: 'bg-warning-soft',
    chip: 'bg-warning-soft/15 text-warning-soft',
  },
  // Titik dan latar memakai danger penuh supaya sinyalnya terbaca; teksnya
  // pakai danger-soft agar kontrasnya tetap aman di atas navy.
  high: {
    label: 'High',
    text: 'text-danger-soft',
    dot: 'bg-danger',
    chip: 'bg-danger/20 text-danger-soft',
  },
}

export type RouteOption = {
  id: string
  line: string
  duration: string
  departure: string
  arrival: string
  transfer: string
  crowd: CrowdLevel
  fare: string
  recommended?: boolean
}

export const routeOptions: RouteOption[] = [
  {
    id: 'route-0940',
    line: 'KRL Commuter Line',
    duration: '12 minutes',
    departure: '09.40',
    arrival: '09.52',
    transfer: 'Direct',
    crowd: 'low',
    fare: 'Rp 3.000',
    recommended: true,
  },
  {
    id: 'route-0920',
    line: 'KRL Commuter Line',
    duration: '12 minutes',
    departure: '09.20',
    arrival: '09.32',
    transfer: 'Direct',
    crowd: 'high',
    fare: 'Rp 3.000',
  },
]

/** Catatan peron/pintu per stasiun; dipakai apa pun arah perjalanannya. */
const stopNotes: Record<string, { boarding: string; alighting: string }> = {
  Manggarai: {
    boarding: 'Platform 3 · enter through the main gate',
    alighting: 'Exit toward Jalan Manggarai Utara',
  },
  Sudirman: {
    boarding: 'Platform 1 · enter from the Dukuh Atas side',
    alighting: 'Exit toward Dukuh Atas',
  },
}

export type TripStop = {
  name: string
  detail: string
  time: string
  origin: boolean
}

/** Pemberhentian mengikuti arah dan rute yang sedang dipilih. */
export function buildStops(
  origin: string,
  destination: string,
  route: RouteOption,
): TripStop[] {
  return [
    {
      name: `${origin} Station`,
      detail: stopNotes[origin]?.boarding ?? 'Boarding point',
      time: `${route.departure} WIB`,
      origin: true,
    },
    {
      name: `${destination} Station`,
      detail: stopNotes[destination]?.alighting ?? 'Alighting point',
      time: `${route.arrival} WIB`,
      origin: false,
    },
  ]
}

export function buildStats(route: RouteOption) {
  return [
    { label: 'Duration', value: route.duration },
    { label: 'Transfers', value: route.transfer },
    { label: 'Estimated fare', value: route.fare },
  ]
}

/** Titik peta untuk rute terpilih, diambil dari dataset stasiun yang sama. */
export function stationPoint(name: string): { name: string; position: LatLng } {
  const station = stations.find(
    (item) => item.name.toLowerCase() === name.toLowerCase(),
  )
  if (!station) throw new Error(`Stasiun "${name}" tidak ada di dataset`)
  return { name: station.name, position: station.position }
}
