/**
 * Endpoint potensi ekonomi kawasan (F7).
 *
 * `potential_score` adalah indeks komposit berbobot, bukan proyeksi pendapatan
 * — `revenue_projection` selalu null dan itu disengaja.
 */
import { apiRequest } from './api'
import type { Reliability } from './geoApi'

export type Signal = { score: number; source: string }

export type AreaPotential = {
  station_id: string
  name: string
  district: string
  position: [number, number]
  potential_score: number
  risk_index: number
  risk_level: 'low' | 'medium' | 'high'
  signals: {
    demand: Signal
    competition: Signal
    space_availability: Signal
  }
  formula: string
  reliability: Reliability
  method: string
  revenue_projection: null
  revenue_note: string
}

export type CategoryRecommendation = {
  category_id: string
  label: string
  source: string
  viable: boolean
  conditions: {
    demand_high: boolean
    competition_low: boolean
    space_available: boolean
  }
  evidence: {
    demand: Signal
    competition: Signal
    space_availability: Signal
  }
  reliability: Reliability
}

export type AreaDetail = AreaPotential & {
  categories: CategoryRecommendation[]
  viable_count: number
  condition_note: string
}

export type HeatPoint = {
  id: string
  name: string
  position: [number, number]
  score: number
  risk_index: number
  reliability: Reliability
}

export async function fetchAreas(params: {
  q?: string
  minScore?: number
  maxRisk?: number
} = {}) {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.minScore !== undefined) query.set('min_score', String(params.minScore))
  if (params.maxRisk !== undefined) query.set('max_risk', String(params.maxRisk))
  query.set('per_page', '100')

  const result = await apiRequest<AreaPotential[]>(`/api/business/areas?${query}`)
  return result.data
}

export async function fetchArea(areaId: string) {
  const result = await apiRequest<AreaDetail>(`/api/business/areas/${areaId}`)
  return result.data
}

export async function fetchAreaCategories(areaId: string, onlyViable = false) {
  const query = onlyViable ? '?viable=1' : ''
  const result = await apiRequest<CategoryRecommendation[]>(
    `/api/business/areas/${areaId}/categories${query}`,
  )
  return result.data
}

export async function fetchBusinessCategories() {
  const result = await apiRequest<{ id: string; label: string; source: string }[]>(
    '/api/business/categories',
  )
  return result.data
}

export async function fetchHeatmap() {
  const result = await apiRequest<HeatPoint[]>('/api/business/heatmap')
  return result.data
}
