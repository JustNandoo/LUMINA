/** Perencanaan perjalanan — satu opsi per slot waktu, di atas lintasan nyata. */
import { apiRequest } from './api'
import type { CrowdLevel, Reliability, SlotId, TimeSlot } from './geoApi'

export type RouteOption = {
  id: string
  line: string
  slot_id: SlotId
  slot_label: string
  departure: string
  arrival: string
  duration_minutes: number
  transfer: string
  fare: number
  crowd_index: number
  crowd: CrowdLevel
  is_current_slot: boolean
  recommended: boolean
}

export type PathStation = {
  id: string
  name: string
  position: [number, number]
  interchange: boolean
}

export type RouteSegment = {
  line: string
  from: { id: string; name: string }
  to: { id: string; name: string }
  stop_count: number
  stations: { id: string; name: string; position: [number, number] }[]
}

export type Transfer = {
  station_id: string
  station_name: string
  from_line: string
  to_line: string
}

export type RouteGeometry = {
  type: 'LineString'
  /** Urutan [lng, lat] mengikuti GeoJSON. */
  coordinates: [number, number][]
}

export type TripPlan = {
  origin: { id: string; name: string; position: [number, number] }
  destination: { id: string; name: string; position: [number, number] }
  stop_count: number
  transfer_count: number
  options: RouteOption[]
  /** Seluruh stasiun yang dilewati, berurutan. */
  path: PathStation[]
  /** Lintasan dipecah per lin; pergantian lin = satu transit. */
  segments: RouteSegment[]
  transfers: Transfer[]
  geometry: RouteGeometry
  recommendation: { option_id: string; slot_id: SlotId; reason: string }
  current_slot_id: SlotId
  reliability: Reliability
}

export async function planTrip(input: {
  origin: string
  destination: string
  slot?: SlotId
}) {
  const result = await apiRequest<TripPlan>('/api/trips/plan', {
    method: 'POST',
    body: input,
  })
  return { plan: result.data, timeSlots: (result.meta?.time_slots ?? []) as TimeSlot[] }
}

/** Lintasan saja, tanpa opsi keberangkatan. */
export async function fetchRoute(origin: string, destination: string) {
  const query = new URLSearchParams({ origin, destination })
  const result = await apiRequest<{
    path: PathStation[]
    segments: RouteSegment[]
    transfers: Transfer[]
    stop_count: number
    geometry: RouteGeometry
  }>(`/api/trips/route?${query}`)
  return result.data
}
