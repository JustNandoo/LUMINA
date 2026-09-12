/** Paket langganan dan langganan milik akun. */
import { apiRequest } from './api'

export type PlanId = 'explorer' | 'commercial' | 'enterprise'

export type Plan = {
  id: PlanId
  name: string
  badge: string
  audience: string
  price_amount: number | null
  price_label: string
  period: string
  billing_note: string
  summary: string
  features: string[]
  limits: {
    station_compare: number | null
    assistant_per_day: number | null
    export_per_month: number | null
  }
  cta: string
  featured: boolean
}

export type Subscription = {
  id: string
  plan_id: PlanId
  plan_name: string
  status: 'active' | 'cancelled' | string
  started_at: string | null
  renews_at: string | null
  cancelled_at: string | null
  plan?: Plan
  limits?: Plan['limits']
}

export type Invoice = {
  id: string
  plan_id: PlanId
  amount: number
  currency: string
  status: string
  issued_at: string
}

export async function fetchPlans() {
  const result = await apiRequest<Plan[]>('/api/plans')
  return result.data
}

export async function fetchSubscription() {
  const result = await apiRequest<Subscription>('/api/subscription', { auth: true })
  return result.data
}

export async function changePlan(planId: PlanId) {
  const result = await apiRequest<Subscription>('/api/subscription/change', {
    method: 'POST',
    auth: true,
    body: { plan_id: planId },
  })
  return result.data
}

export async function cancelSubscription() {
  const result = await apiRequest<Subscription>('/api/subscription/cancel', {
    method: 'POST',
    auth: true,
  })
  return result.data
}

export async function fetchInvoices() {
  const result = await apiRequest<Invoice[]>('/api/subscription/invoices', { auth: true })
  return result.data
}
