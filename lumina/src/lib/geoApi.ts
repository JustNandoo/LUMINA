/**
 * Pemetaan ke endpoint geo backend: metadata, jaringan, stasiun, kepadatan.
 *
 * Catatan pembacaan angka: `index` selalu indeks relatif 0–100, bukan jumlah
 * penumpang, dan `reliability` wajib ikut ditampilkan di UI — itu prinsip F8
 * yang dipegang seluruh aplikasi.
 */
import { apiRequest } from './api'

export type SlotId = 'morning' | 'midday' | 'evening'
export type Reliability = 'high' | 'medium' | 'low'
export type CrowdLevel = 'low' | 'moderate' | 'high'

export type TimeSlot = {
  id: SlotId
  label: string
  start: string
  end: string
}

export type ReliabilityLevel = {
  level: Reliability
  label: string
  meaning: string
}

export type DataSource = { id: string; name: string; role: string }

export type MetaPayload = {
  time_slots: TimeSlot[]
  slot_ids: SlotId[]
  reliability_levels: ReliabilityLevel[]
  business_categories: { id: string; label: string; source: string }[]
  data_sources: DataSource[]
  claim_boundary: { density: string; economy: string; method: string }
}

export type StationSummary = {
  id: string
  name: string
  position: [number, number]
  line: string
  district: string
  calibrated: boolean
  interchange: boolean
  reliability: Reliability
  /** Hanya terisi kalau request menyertakan ?slot= */
  slot_id?: SlotId
  index?: number
  level?: CrowdLevel
}

export type SlotReading = {
  slot_id: SlotId
  label: string
  index: number
  level: CrowdLevel
}

export type Driver = { factor: string; detail: string; contribution: number }

export type CrowdProfile = {
  station_id: string
  station_name: string
  scale: string
  slots: SlotReading[]
  busiest_slot: SlotReading
  recommendation: {
    slot_id: SlotId
    label: string
    index: number
    reason: string
    drivers: Driver[]
  }
  reliability: Reliability
  /** false = indeks proksi tanpa klaim prediktif (REQ-F3-04). */
  predictive: boolean
  method: string
}

export type Amenity = {
  id: string
  label: string
  available: boolean
  spot: string | null
  hours: string | null
  count: number
  reliability: Reliability
  source: string
}

export type StationDetail = StationSummary & {
  crowd_profile: CrowdProfile
  amenities: Amenity[]
  amenities_source: string
}

export type DensityCell = {
  cell_id: string
  station_id: string
  position: [number, number]
  index: number
  reliability: Reliability
}

export type NetworkPayload = {
  lines: { name: string; stations: string[] }[]
  interchanges: StationSummary[]
  calibration_corridor: StationSummary[]
  source: string
}

// ---------------------------------------------------------------- metadata
export async function fetchMeta() {
  const result = await apiRequest<MetaPayload>('/api/meta')
  return result.data
}

export async function fetchTimeSlots() {
  const result = await apiRequest<TimeSlot[]>('/api/meta/time-slots')
  return result.data
}

// ---------------------------------------------------------------- jaringan
export async function fetchNetwork() {
  const result = await apiRequest<NetworkPayload>('/api/network')
  return result.data
}

/** Pengaturan layer dari Kelola Peta admin. */
export type PublicMapLayer = {
  id: string
  label: string
  status: string
  /** Layer berstatus publik — hanya ini yang ditawarkan ke pengguna. */
  available: boolean
  /** Menyala bawaan saat peta dibuka. */
  visible: boolean
}

export async function fetchPublicMapLayers() {
  const result = await apiRequest<PublicMapLayer[]>('/api/map/layers')
  return result.data
}

// ---------------------------------------------------------------- stasiun
export async function fetchStations(params: {
  q?: string
  line?: string
  calibrated?: boolean
  slot?: SlotId
  perPage?: number
} = {}) {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.line) query.set('line', params.line)
  if (params.calibrated !== undefined) query.set('calibrated', String(params.calibrated))
  if (params.slot) query.set('slot', params.slot)
  query.set('per_page', String(params.perPage ?? 100))

  const result = await apiRequest<StationSummary[]>(`/api/stations?${query}`)
  return result.data
}

export async function fetchStation(stationId: string) {
  const result = await apiRequest<StationDetail>(`/api/stations/${stationId}`)
  return result.data
}

/** Perbandingan pada satu slot: tiap stasiun jadi satu angka indeks. */
export async function compareStations(ids: string[], slot: SlotId) {
  const query = new URLSearchParams({ ids: ids.join(','), slot })
  const result = await apiRequest<StationSummary[]>(`/api/stations/compare?${query}`)
  return result.data
}

/** Perbandingan tanpa slot: backend mengembalikan profil lengkap tiap stasiun. */
export async function compareStationProfiles(ids: string[]) {
  const query = new URLSearchParams({ ids: ids.join(',') })
  const result = await apiRequest<CrowdProfile[]>(`/api/stations/compare?${query}`)
  return result.data
}

// -------------------------------------------------------------- kepadatan
export async function fetchDensityCells(slot: SlotId, stationId?: string) {
  const query = new URLSearchParams({ slot })
  if (stationId) query.set('station_id', stationId)
  const result = await apiRequest<DensityCell[]>(`/api/density/cells?${query}`)
  return result.data
}
