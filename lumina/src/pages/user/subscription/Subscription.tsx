import { useState } from 'react'
import {
  ArrowUpRight,
  Check,
  CreditCard,
  Download,
  Info,
  ShieldCheck,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../../../components/layout/TopBar'
import { planById, plans } from '../../../data/plans'
import type { PlanId } from '../../../data/plans'

/**
 * Pemakaian kuota bulan berjalan. Nilainya masih contoh — nanti diisi dari
 * endpoint kuota di backend, bentuk datanya sudah disiapkan seperti ini.
 */
const usage = [
  { label: 'Assistant questions today', used: 3, limit: 5, unit: '' },
  { label: 'Stations compared', used: 2, limit: 2, unit: '' },
  { label: 'Cell reports exported', used: 0, limit: 0, unit: 'this month' },
  { label: 'Saved areas', used: 0, limit: 0, unit: '' },
]

const invoices = [
  { id: 'INV-2026-0205', date: '05-02-2026', plan: 'Commercial', amount: 'Rp 750.000', status: 'Paid' },
  { id: 'INV-2025-0118', date: '18-01-2025', plan: 'Commercial', amount: 'Rp 750.000', status: 'Paid' },
  { id: 'INV-2024-0115', date: '15-01-2024', plan: 'Commercial', amount: 'Rp 750.000', status: 'Paid' },
  { id: 'INV-2023-1015', date: '15-10-2023', plan: 'Commercial', amount: 'Rp 750.000', status: 'Paid' },
  { id: 'INV-2023-0617', date: '17-06-2023', plan: 'Commercial', amount: 'Rp 750.000', status: 'Paid' },
]

function UsageMeter({ used, limit }: { used: number; limit: number }) {
  // limit 0 berarti fitur belum termasuk paket — batangnya sengaja kosong.
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0
  const atCap = limit > 0 && used >= limit

  return (
    <span className="mt-3 block h-[6px] w-full rounded-full bg-navy-700/60">
      <span
        className={`block h-full rounded-full ${atCap ? 'bg-warning-soft' : 'bg-brand-cyan'}`}
        style={{ width: `${ratio * 100}%` }}
      />
    </span>
  )
}

function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-[14px] border border-navy-700/50 bg-navy-800/40 px-5 py-6 sm:px-7 lg:py-7 ${className}`}
    >
      {children}
    </section>
  )
}

function Subscription() {
  const [currentPlanId, setCurrentPlanId] = useState<PlanId>('explorer')
  const [pendingPlanId, setPendingPlanId] = useState<PlanId | null>(null)
  const [changed, setChanged] = useState(false)

  const currentPlan = planById(currentPlanId)
  const pendingPlan = pendingPlanId ? planById(pendingPlanId) : null

  return (
    <div className="px-5 pt-6 pb-10 sm:px-8 lg:px-[52px] lg:pt-[38px] lg:pb-[40px]">
      <div className="animate-rise-in relative z-30">
        <TopBar showSearch={false} />
      </div>

      <div className="animate-rise-in mt-6 [animation-delay:80ms] lg:mt-[34px]">
        <h1 className="text-[24px] font-bold text-white lg:text-[28px]">
          Subscription
        </h1>
        <p className="mt-1.5 text-[14px] text-mist-200">
          Your plan, what you have used this month, and every invoice on record.
        </p>
      </div>

      {changed && (
        <div className="animate-rise-in mt-5 flex items-start gap-3 rounded-[12px] border border-brand-cyan/40 bg-brand-cyan/10 px-5 py-4">
          <Check className="mt-0.5 size-4 shrink-0 text-brand-cyan" strokeWidth={2.6} />
          <p className="text-[14px] leading-relaxed text-mist-100">
            Plan set to <span className="font-semibold text-white">{currentPlan.name}</span>.
            Billing is not switched on during the competition period, so nothing
            has been charged.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:gap-[26px]">
        {/* Kolom kiri — paket berjalan dan pemakaian */}
        <div className="animate-rise-in flex flex-1 flex-col gap-6 [animation-delay:140ms]">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-bold text-white">Current plan</h2>
              <span className="rounded-full bg-brand-cyan/15 px-3 py-1 text-[11px] font-semibold text-brand-cyan">
                Active
              </span>
            </div>

            <div className="mt-5 rounded-[10px] border border-navy-700 bg-navy-950/50 px-5 py-6 sm:px-7">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[24px] font-bold text-white sm:text-[28px]">
                  {currentPlan.name}
                </h3>
                <span className="shrink-0 rounded-full bg-mist-400 px-4 py-1 text-[11px] font-semibold text-navy-900">
                  {currentPlan.badge}
                </span>
              </div>

              <p className="mt-2 text-[14px] text-mist-200">
                {currentPlan.audience}
              </p>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <p className="flex items-baseline gap-1.5 text-white">
                  <span className="text-[34px] leading-none font-bold tabular-nums sm:text-[42px]">
                    {currentPlan.price}
                  </span>
                  {currentPlan.period && (
                    <span className="text-[20px] font-normal text-mist-200">
                      {currentPlan.period}
                    </span>
                  )}
                </p>
                <span className="pb-1 text-[13px] text-mist-400">
                  {currentPlan.billingNote}
                </span>
              </div>
            </div>

            <ul className="mt-6 flex flex-col gap-2.5">
              {currentPlan.features.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <Check
                    className="mt-[3px] size-4 shrink-0 text-brand-cyan"
                    strokeWidth={2.4}
                  />
                  <span className="text-[14px] leading-relaxed text-mist-200">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-bold text-white">
                Usage this period
              </h2>
              <span className="text-[12px] text-mist-400">
                Resets 1 October 2026
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
              {usage.map((item) => (
                <div key={item.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13px] text-mist-200">{item.label}</p>
                    <p className="font-mono text-[13px] text-white tabular-nums">
                      {item.limit > 0 ? `${item.used} / ${item.limit}` : 'Not included'}
                    </p>
                  </div>
                  <UsageMeter used={item.used} limit={item.limit} />
                  {item.unit && (
                    <p className="mt-1.5 text-[11px] text-mist-400">{item.unit}</p>
                  )}
                </div>
              ))}
            </div>

            <p className="mt-6 flex items-start gap-2.5 border-t border-navy-700/60 pt-5 text-[13px] leading-relaxed text-mist-400">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-mist-400" strokeWidth={1.8} />
              Quotas limit how much you can pull out of LUMINA, never how the
              index is computed. Reliability levels are identical on every plan.
            </p>
          </Panel>

          <Panel>
            <h2 className="text-[18px] font-bold text-white">Payment method</h2>

            <div className="mt-5 flex flex-col gap-4 rounded-[10px] border border-dashed border-navy-700 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <CreditCard className="size-6 shrink-0 text-mist-400" strokeWidth={1.6} />
                <div>
                  <p className="text-[14px] font-semibold text-white">
                    No payment method on file
                  </p>
                  <p className="mt-0.5 text-[13px] text-mist-400">
                    Explorer does not need one. Add a method when you move to
                    Commercial.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-mist-400/60 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
              >
                Add method
              </button>
            </div>
          </Panel>
        </div>

        {/* Kolom kanan — ganti paket dan riwayat tagihan */}
        <div className="animate-rise-in flex w-full flex-col gap-6 [animation-delay:200ms] lg:w-[430px] lg:shrink-0">
          <Panel>
            <h2 className="text-[18px] font-bold text-white">Change plan</h2>
            <p className="mt-1.5 text-[13px] text-mist-400">
              Compare everything side by side on the{' '}
              <Link
                to="/pricing"
                className="text-brand-cyan transition-colors hover:text-white"
              >
                pricing page
              </Link>
              .
            </p>

            <div className="mt-5 flex flex-col gap-3">
              {plans.map((plan) => {
                const isCurrent = plan.id === currentPlanId
                return (
                  <div
                    key={plan.id}
                    className={`rounded-[10px] border px-4 py-4 transition-colors ${
                      isCurrent
                        ? 'border-brand-cyan/50 bg-brand-cyan/5'
                        : 'border-navy-700 bg-navy-950/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold text-white">
                          {plan.name}
                        </p>
                        <p className="mt-0.5 text-[12px] text-mist-400">
                          {plan.price}
                          {plan.period} · {plan.badge}
                        </p>
                      </div>

                      {isCurrent ? (
                        <span className="shrink-0 rounded-full border border-brand-cyan/40 px-3 py-1 text-[11px] font-semibold text-brand-cyan">
                          Current
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPendingPlanId(plan.id)
                            setChanged(false)
                          }}
                          className="shrink-0 rounded-lg bg-navy-700 px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-navy-700/70"
                        >
                          {plan.id === 'enterprise' ? 'Enquire' : 'Select'}
                        </button>
                      )}
                    </div>

                    <p className="mt-2.5 text-[13px] leading-relaxed text-mist-200">
                      {plan.summary}
                    </p>
                  </div>
                )
              })}
            </div>

            {pendingPlan && (
              <div className="animate-rise-in mt-5 rounded-[10px] border border-navy-700 bg-navy-950/60 px-5 py-5">
                <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-mist-200">
                  <Info className="mt-0.5 size-4 shrink-0 text-brand-cyan" strokeWidth={2} />
                  <span>
                    Switching to{' '}
                    <span className="font-semibold text-white">
                      {pendingPlan.name}
                    </span>{' '}
                    ({pendingPlan.price}
                    {pendingPlan.period}). Billing is not switched on during the
                    MAPID WebGIS Competition 2026 period — confirming only
                    changes what your account can reach, and no payment is taken.
                  </span>
                </p>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPlanId(pendingPlan.id)
                      setPendingPlanId(null)
                      setChanged(true)
                    }}
                    className="rounded-lg bg-mist-100 px-5 py-2.5 text-[13px] font-semibold text-navy-900 transition-colors hover:bg-white"
                  >
                    Confirm change
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingPlanId(null)}
                    className="rounded-lg border border-mist-400/60 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-bold text-white">
                Billing history
              </h2>
              <button
                type="button"
                className="flex items-center gap-1.5 text-[13px] font-medium text-white transition-colors hover:text-mist-200"
              >
                <Download className="size-4" strokeWidth={1.8} />
                Export
              </button>
            </div>

            <div className="mt-5 overflow-x-auto rounded-lg border border-navy-700">
              <table className="w-full min-w-[380px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-navy-700">
                    {['Date', 'Plan', 'Amount', 'Status'].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-2.5 text-[13px] font-bold text-white"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-navy-700 last:border-b-0"
                    >
                      <td className="px-4 py-2.5 text-[13px] font-semibold text-white">
                        {invoice.date}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-mist-200">
                        {invoice.plan}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-mist-200 tabular-nums">
                        {invoice.amount}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-brand-cyan">
                        {invoice.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-[12px] text-mist-400">
              Invoices are kept for 24 months. Need one re-issued?{' '}
              <Link
                to="/help"
                className="text-brand-cyan transition-colors hover:text-white"
              >
                Contact support
              </Link>
              .
            </p>
          </Panel>

          <Panel>
            <h2 className="text-[16px] font-bold text-white">
              Running a corridor, not a shop?
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-mist-200">
              Enterprise adds a read-only API, uncapped export, and field-survey
              calibration on a corridor you nominate.
            </p>
            <Link
              to="/pricing"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-cyan transition-colors hover:text-white"
            >
              See what Enterprise includes
              <ArrowUpRight className="size-4" strokeWidth={2} />
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  )
}

export default Subscription
