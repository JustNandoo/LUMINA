/**
 * Asisten AI (F6).
 *
 * `mode` menentukan cara UI menandai jawaban: "model" = dijawab Gemini,
 * "fallback" = layanan AI mati dan jawaban dirakit langsung dari indeks.
 * Panel chat tidak boleh menyembunyikan bedanya — pengguna berhak tahu.
 */
import { apiRequest } from './api'

/**
 * "scope" = pertanyaan di luar lingkup LUMINA ditolak sebelum sampai ke model,
 * jadi tidak diberi label "dirakit dari indeks" seperti mode fallback.
 */
export type AssistantMode = 'model' | 'fallback' | 'scope'

export type RouteStop = {
  id: string
  name: string
  /** [lintang, bujur] */
  position: [number, number]
  role: 'origin' | 'destination' | 'transfer' | 'pass'
}

/** Rute yang dibahas jawaban — digambar sebagai peta mini di panel chat. */
export type RouteCard = {
  origin: { id: string; name: string }
  destination: { id: string; name: string }
  segments: { line: string; points: [number, number][] }[]
  stops: RouteStop[]
  stop_count: number
  transfer_count: number
  estimated_minutes: number
  estimated_fare_rupiah: number
}

/**
 * Tombol di bawah jawaban. Dirakit backend dari data sistem, bukan dari teks
 * model, jadi selalu menunjuk stasiun yang benar-benar ada.
 */
export type AssistantAction =
  | { type: 'plan_trip'; label: string; origin_id: string; destination_id: string }
  | { type: 'open_station'; label: string; station_id: string }
  | { type: 'open_area'; label: string; station_id: string }

export type AssistantAttachments = {
  route: RouteCard | null
  actions: AssistantAction[]
}

export type AssistantReply = {
  question?: string
  answer: string
  mode: AssistantMode
  model: string | null
  grounding: Record<string, unknown>
  attachments?: AssistantAttachments
  note?: string
  usage?: {
    input_tokens: number
    output_tokens: number
    thinking_tokens: number | null
    cached_input_tokens: number | null
  }
}

export type AssistantStatus = {
  enabled: boolean
  model: string
  fallback_note: string
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

export async function fetchAssistantStatus() {
  const result = await apiRequest<AssistantStatus>('/api/assistant/status')
  return result.data
}

export async function fetchSuggestions(params: {
  stationId?: string
  areaId?: string
} = {}) {
  const query = new URLSearchParams()
  if (params.stationId) query.set('station_id', params.stationId)
  if (params.areaId) query.set('area_id', params.areaId)

  const result = await apiRequest<string[]>(`/api/assistant/suggestions?${query}`)
  return result.data
}

export async function askAssistant(input: {
  question: string
  stationId?: string
  areaId?: string
  history?: ChatTurn[]
}) {
  const result = await apiRequest<AssistantReply>('/api/assistant/chat', {
    method: 'POST',
    auth: true,
    body: {
      question: input.question,
      station_id: input.stationId,
      area_id: input.areaId,
      history: input.history,
    },
  })
  return result.data
}

export async function fetchInsight(params: { stationId?: string; areaId?: string }) {
  const result = await apiRequest<AssistantReply>('/api/assistant/insight', {
    method: 'POST',
    auth: true,
    body: { station_id: params.stationId, area_id: params.areaId },
  })
  return result.data
}
