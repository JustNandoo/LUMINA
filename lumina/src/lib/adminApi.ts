/** Endpoint sisi admin. Semuanya butuh akun ber-role admin (403 kalau bukan). */
import { apiRequest } from './api'
import type { AuthUser } from './authApi'

export type Paginated<T> = {
  items: T[]
  meta: { page: number; per_page: number; total: number; last_page: number }
}

export type AdminSummary = {
  users: { total: number; verified: number; admins: number }
  partners: { total: number; active: number }
  subscriptions: Record<string, number>
  survey: { total: number; valid: number; target: number; progress_percent: number }
  map: { points: number; published: number; layers: number }
}

export type ManagedRole = {
  id: string
  name: string
  description: string | null
  user_count: number
  created_at: string
  updated_at: string
}

export type B2BPackage = {
  id: string
  name: string
  description: string | null
  price: number
  export_quota: number
  is_active: boolean
  partner_count: number
  created_at: string
  updated_at: string
}

export type B2BPartner = {
  id: string
  company: string
  email: string
  package_id: string | null
  package_name: string | null
  export_quota: number
  export_used: number
  status: string
  created_at: string
  updated_at: string
}

export type SurveyPoint = {
  id: string
  station_id: string
  station_detail: string | null
  slot_id: string
  observed_at: string
  crowd_score: number
  crowd_label: string
  position: [number, number] | null
  cell_id: string | null
  officer: string | null
  note: string | null
  photo_url: string | null
  status: 'on_review' | 'valid' | 'rejected'
  created_at: string
  updated_at: string
}

export type AdminMapPoint = {
  id: string
  name: string
  position: [number, number]
  kind: string
  published: boolean
}

export type AdminMapLayer = {
  id: string
  label: string
  description: string | null
  visible: boolean
  status: 'publik' | 'draf' | 'internal'
}

function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

async function listRequest<T>(path: string): Promise<Paginated<T>> {
  const result = await apiRequest<T[]>(path, { auth: true })
  return {
    items: result.data,
    meta: (result.meta ?? {
      page: 1,
      per_page: result.data.length,
      total: result.data.length,
      last_page: 1,
    }) as Paginated<T>['meta'],
  }
}

// ---------------------------------------------------------------- ringkasan
export async function fetchSummary() {
  const result = await apiRequest<AdminSummary>('/api/admin/summary', { auth: true })
  return result.data
}

// ----------------------------------------------------------------- pengguna
export function fetchUsers(params: {
  q?: string
  role?: string
  page?: number
  perPage?: number
} = {}) {
  return listRequest<AuthUser>(
    `/api/admin/users${query({
      q: params.q,
      role: params.role,
      page: params.page,
      per_page: params.perPage,
    })}`,
  )
}

export async function updateUser(
  userId: string,
  body: Partial<{ role: string; is_active: boolean; full_name: string; email: string }>,
) {
  const result = await apiRequest<AuthUser>(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    auth: true,
    body,
  })
  return result.data
}

export async function deleteUser(userId: string) {
  await apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE', auth: true })
}

// -------------------------------------------------------------------- peran
export function fetchRoles(params: { page?: number } = {}) {
  return listRequest<ManagedRole>(`/api/admin/roles${query({ page: params.page })}`)
}

export async function createRole(body: { name: string; description?: string }) {
  const result = await apiRequest<ManagedRole>('/api/admin/roles', {
    method: 'POST',
    auth: true,
    body,
  })
  return result.data
}

export async function updateRole(
  roleId: string,
  body: Partial<{ name: string; description: string }>,
) {
  const result = await apiRequest<ManagedRole>(`/api/admin/roles/${roleId}`, {
    method: 'PATCH',
    auth: true,
    body,
  })
  return result.data
}

export async function deleteRole(roleId: string) {
  await apiRequest(`/api/admin/roles/${roleId}`, { method: 'DELETE', auth: true })
}

// --------------------------------------------------------------- paket B2B
export function fetchPackages(params: { page?: number } = {}) {
  return listRequest<B2BPackage>(`/api/admin/b2b-packages${query({ page: params.page })}`)
}

export async function createPackage(body: {
  name: string
  description?: string
  price?: number
  export_quota?: number
}) {
  const result = await apiRequest<B2BPackage>('/api/admin/b2b-packages', {
    method: 'POST',
    auth: true,
    body,
  })
  return result.data
}

export async function updatePackage(packageId: string, body: Partial<B2BPackage>) {
  const result = await apiRequest<B2BPackage>(`/api/admin/b2b-packages/${packageId}`, {
    method: 'PATCH',
    auth: true,
    body,
  })
  return result.data
}

export async function deletePackage(packageId: string) {
  await apiRequest(`/api/admin/b2b-packages/${packageId}`, { method: 'DELETE', auth: true })
}

// --------------------------------------------------------------- mitra B2B
export function fetchPartners(params: {
  q?: string
  status?: string
  page?: number
} = {}) {
  return listRequest<B2BPartner>(
    `/api/admin/b2b-partners${query({
      q: params.q,
      status: params.status,
      page: params.page,
    })}`,
  )
}

export async function createPartner(body: {
  company: string
  email: string
  package_id?: string | null
  export_quota?: number
  status?: string
}) {
  const result = await apiRequest<B2BPartner>('/api/admin/b2b-partners', {
    method: 'POST',
    auth: true,
    body,
  })
  return result.data
}

export async function updatePartner(partnerId: string, body: Partial<B2BPartner>) {
  const result = await apiRequest<B2BPartner>(`/api/admin/b2b-partners/${partnerId}`, {
    method: 'PATCH',
    auth: true,
    body,
  })
  return result.data
}

export async function deletePartner(partnerId: string) {
  await apiRequest(`/api/admin/b2b-partners/${partnerId}`, { method: 'DELETE', auth: true })
}

// ------------------------------------------------------------- data survei
export function fetchSurveyPoints(params: {
  stationId?: string
  status?: string
  page?: number
} = {}) {
  return listRequest<SurveyPoint>(
    `/api/admin/survey-points${query({
      station_id: params.stationId,
      status: params.status,
      page: params.page,
    })}`,
  )
}

export async function createSurveyPoint(body: {
  station_id: string
  slot_id: string
  crowd_score: number
  station_detail?: string
  officer?: string
  note?: string
  latitude?: number
  longitude?: number
}) {
  const result = await apiRequest<SurveyPoint>('/api/admin/survey-points', {
    method: 'POST',
    auth: true,
    body,
  })
  return result.data
}

export async function updateSurveyPoint(
  pointId: string,
  body: Partial<{ status: string; crowd_score: number; note: string; officer: string }>,
) {
  const result = await apiRequest<SurveyPoint>(`/api/admin/survey-points/${pointId}`, {
    method: 'PATCH',
    auth: true,
    body,
  })
  return result.data
}

export async function deleteSurveyPoint(pointId: string) {
  await apiRequest(`/api/admin/survey-points/${pointId}`, { method: 'DELETE', auth: true })
}

// ----------------------------------------------------------------- peta
export function fetchMapPoints(params: { published?: boolean; page?: number } = {}) {
  return listRequest<AdminMapPoint>(
    `/api/admin/map/points${query({
      published: params.published,
      page: params.page,
      per_page: 100,
    })}`,
  )
}

export async function updateMapPoint(
  pointId: string,
  body: Partial<{ name: string; published: boolean; kind: string }>,
) {
  const result = await apiRequest<AdminMapPoint>(`/api/admin/map/points/${pointId}`, {
    method: 'PATCH',
    auth: true,
    body,
  })
  return result.data
}

export async function fetchMapLayers() {
  const result = await apiRequest<AdminMapLayer[]>('/api/admin/map/layers', { auth: true })
  return result.data
}

export async function updateMapLayer(
  layerId: string,
  body: Partial<{ label: string; visible: boolean; status: string }>,
) {
  const result = await apiRequest<AdminMapLayer>(`/api/admin/map/layers/${layerId}`, {
    method: 'PATCH',
    auth: true,
    body,
  })
  return result.data
}

export async function syncStations() {
  const result = await apiRequest<{ created: number; total: number }>(
    '/api/admin/map/sync-stations',
    { method: 'POST', auth: true },
  )
  return result.data
}
