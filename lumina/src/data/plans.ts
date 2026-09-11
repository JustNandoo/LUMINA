/**
 * Paket langganan LUMINA. Dipakai bersama oleh halaman publik (/pricing) dan
 * halaman kelola langganan di dalam aplikasi (/app/subscription), supaya nama
 * paket, harga, dan batasannya tidak pernah berbeda di dua tempat.
 *
 * Nama dan harga mengikuti yang sudah dipakai di aplikasi: profil menampilkan
 * paket "Explorer" (Rp 0) dan riwayat pembayaran mencatat "Commercial"
 * (Rp 750.000). Tingkat ketiga mengikuti B2B Partner Management di sisi admin.
 */

export type PlanId = 'explorer' | 'commercial' | 'enterprise'

export type Plan = {
  id: PlanId
  name: string
  badge: string
  audience: string
  price: string
  period: string
  billingNote: string
  summary: string
  /** Hak akses; diacu ke fitur F1–F8 di PRD. */
  features: string[]
  cta: string
  /** Paket yang ditonjolkan di halaman harga. */
  featured?: boolean
}

export const plans: Plan[] = [
  {
    id: 'explorer',
    name: 'Explorer',
    badge: 'Basic',
    audience: 'Commuters, students, and academic research',
    price: 'Rp 0',
    period: '/month',
    billingNote: 'Free forever · no annual commitment',
    summary:
      'The full travel side of LUMINA. Read any station on the network before you step into it.',
    features: [
      'Station busy-hour profile for every station on the network (F1)',
      'Density index map across all three time slots (F2)',
      'Crowd prediction and quieter-slot departure advice (F3)',
      'Route, interchange, and station facility context layers (F4, F5)',
      'Reliability level shown on every number (F8)',
      'Compare up to 2 stations side by side',
      '5 AI assistant questions per day (F6)',
    ],
    cta: 'Start free',
  },
  {
    id: 'commercial',
    name: 'Commercial',
    badge: 'Most chosen',
    audience: 'MSME owners, retail scouts, and location analysts',
    price: 'Rp 750.000',
    period: '/month',
    billingNote: 'Billed monthly · cancel any time',
    summary:
      'Everything in Explorer, plus the economic side: which cell fits which business, and what the risk is.',
    features: [
      'Everything in Explorer',
      'Area economic potential score and risk index per H3 cell (F7)',
      'Category viability check sourced from Properti Go attributes',
      'Compare up to 8 stations on one colour scale',
      'Unlimited assistant questions, with the SHAP factors behind each answer',
      'Export 50 cell reports per month (CSV and GeoJSON)',
      'Saved areas and watchlists with time-slot alerts',
      'Email support within 2 business days',
    ],
    cta: 'Upgrade to Commercial',
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'B2B',
    audience: 'Rail operators, planners, developers, and property groups',
    price: 'Custom',
    period: '',
    billingNote: 'Annual agreement · quoted per corridor',
    summary:
      'LUMINA as infrastructure — indices piped into your own systems, and calibration on your own corridor.',
    features: [
      'Everything in Commercial',
      'Read-only REST API for the density index and potential score',
      'Bulk export with no monthly cap',
      'Corridor-level dashboards for operations and planning teams',
      'Field-survey calibration run on a corridor you nominate',
      'Named contact and onboarding for your team',
    ],
    cta: 'Talk to the team',
  },
]

export const planById = (id: PlanId) => plans.find((plan) => plan.id === id)!

/** Baris tabel perbandingan; urutannya sengaja dari yang paling sering ditanya. */
export const planMatrix: { label: string; values: Record<PlanId, string> }[] = [
  {
    label: 'Stations covered',
    values: {
      explorer: 'Whole KRL network',
      commercial: 'Whole KRL network',
      enterprise: 'Network + nominated corridors',
    },
  },
  {
    label: 'Time slots',
    values: {
      explorer: '3 calibrated slots',
      commercial: '3 calibrated slots',
      enterprise: '3 slots + custom windows',
    },
  },
  {
    label: 'Station comparison',
    values: { explorer: '2 at a time', commercial: '8 at a time', enterprise: 'Unlimited' },
  },
  {
    label: 'Economic potential (F7)',
    values: { explorer: '—', commercial: 'Included', enterprise: 'Included' },
  },
  {
    label: 'AI assistant (F6)',
    values: {
      explorer: '5 questions / day',
      commercial: 'Unlimited',
      enterprise: 'Unlimited + API',
    },
  },
  {
    label: 'Data export',
    values: {
      explorer: '—',
      commercial: '50 cells / month',
      enterprise: 'Bulk, uncapped',
    },
  },
  {
    label: 'API access',
    values: { explorer: '—', commercial: '—', enterprise: 'Read-only REST' },
  },
  {
    label: 'Reliability marker (F8)',
    values: { explorer: 'Always on', commercial: 'Always on', enterprise: 'Always on' },
  },
  {
    label: 'Support',
    values: {
      explorer: 'Community',
      commercial: 'Email · 2 business days',
      enterprise: 'Named contact',
    },
  },
]

export const billingFaqs = [
  {
    question: 'Does a paid plan make the numbers more accurate?',
    answer:
      'No, and this is deliberate. Every plan reads the same index, computed the same way, carrying the same reliability level. A sparse cell stays marked low-reliability on Enterprise exactly as it does on Explorer. What a paid plan buys is reach — more comparisons, the economic layer, export, and API — never more certainty.',
  },
  {
    question: 'Is the free plan a trial?',
    answer:
      'No. Explorer is permanent. The entire travel side of LUMINA — the busy-hour profile, the density map, and departure advice — stays free, because the commuter problem is the one we set out to solve first.',
  },
  {
    question: 'Can I change or cancel my plan?',
    answer:
      'Commercial is billed monthly and can be cancelled at any time; access runs to the end of the period you have paid for. Downgrading returns you to Explorer with your saved areas kept read-only.',
  },
  {
    question: 'What happens to my exports if I downgrade?',
    answer:
      'Files you have already exported are yours to keep. The export function itself switches off, and saved watchlists stop sending slot alerts.',
  },
  {
    question: 'Are prices inclusive of tax?',
    answer:
      'Prices are shown in Indonesian rupiah and exclude VAT. Enterprise agreements are quoted per corridor and per data volume.',
  },
]
