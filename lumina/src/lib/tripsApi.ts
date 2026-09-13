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

export type NearbyPlace = {
  id: string
  name: string
  category_id: string
  category: string
  spot: string
  distance_m: number
  walk_minutes: number
  price_band: string
  station_id: string
  station_name: string
  reliability: Reliability
  source: string
}

/** Tempat usaha di sekitar satu stasiun, untuk fitur singgah. */
export async function fetchStationPlaces(stationId: string, limit = 8) {
  const result = await apiRequest<NearbyPlace[]>(
    `/api/stations/${stationId}/places?limit=${limit}`,
  )
  return result.data
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

// ------------------------------------------------------------ rute tersimpan
export type SavedRoute = {
  id: string
  origin_id: string
  origin_name: string
  destination_id: string
  destination_name: string
  slot_id: SlotId | null
  slot_label: string | null
  created_at: string | null
  updated_at: string | null
}

export async function fetchSavedRoutes() {
  const result = await apiRequest<SavedRoute[]>('/api/trips/saved', { auth: true })
  return result.data
}

/** Menyimpan pasangan stasiun; menyimpan ulang rute yang sama memperbarui slotnya. */
export async function saveRoute(input: {
  originId: string
  destinationId: string
  slotId?: SlotId
}) {
  const result = await apiRequest<SavedRoute>('/api/trips/saved', {
    method: 'POST',
    auth: true,
    body: {
      origin_id: input.originId,
      destination_id: input.destinationId,
      slot_id: input.slotId,
    },
  })
  return result.data
}

export async function deleteSavedRoute(id: string) {
  await apiRequest(`/api/trips/saved/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    auth: true,
  })
}
