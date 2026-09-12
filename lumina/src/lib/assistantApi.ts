/**
 * Asisten AI (F6).
 *
 * `mode` menentukan cara UI menandai jawaban: "model" = dijawab Claude,
 * "fallback" = layanan AI mati dan jawaban dirakit langsung dari indeks.
 * Panel chat tidak boleh menyembunyikan bedanya — pengguna berhak tahu.
 */
import { apiRequest } from './api'

export type AssistantMode = 'model' | 'fallback'

export type AssistantReply = {
  question?: string
  answer: string
  mode: AssistantMode
  model: string | null
  grounding: Record<string, unknown>
  note?: string
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number | null
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
