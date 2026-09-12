import { useState } from 'react'
import {
  ArrowUpRight,
  Check,
  CreditCard,
  Info,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../../../components/layout/TopBar'
import { useApi, errorMessage } from '../../../hooks/useApi'
import { changePlan, fetchInvoices, fetchPlans, fetchSubscription } from '../../../lib/billingApi'
import type { Plan, PlanId } from '../../../lib/billingApi'

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

/** "Tanpa batas" dan "tidak termasuk" dua hal berbeda — jangan disamakan. */
function limitLabel(value: number | null | undefined, unit: string): string {
  if (value === null) return 'Tanpa batas'
  if (!value) return 'Tidak termasuk'
  return `${value} ${unit}`
}

function formatRupiah(amount: number) {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function Subscription() {
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null)
  const [changedTo, setChangedTo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const plans = useApi(() => fetchPlans(), [])
  const subscription = useApi(() => fetchSubscription(), [])
  const invoices = useApi(() => fetchInvoices(), [])

  const currentPlanId = subscription.data?.plan_id
  const currentPlan =
    subscription.data?.plan ??
    plans.data?.find((plan) => plan.id === currentPlanId) ??
    null

  const confirmChange = async () => {
    if (!pendingPlan) return
    setSubmitting(true)
    setActionError(null)
    try {
      await changePlan(pendingPlan.id as PlanId)
      setChangedTo(pendingPlan.name)
      setPendingPlan(null)
      subscription.reload()
      invoices.reload()
    } catch (caught) {
      setActionError(errorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  const limits = currentPlan?.limits
  const entitlements = [
    {
      label: 'Perbandingan stasiun',
      value: limitLabel(limits?.station_compare, 'stasiun sekaligus'),
    },
    {
      label: 'Pertanyaan asisten AI',
      value: limitLabel(limits?.assistant_per_day, 'per hari'),
    },
    {
      label: 'Ekspor laporan sel',
      value: limitLabel(limits?.export_per_month, 'per bulan'),
    },
  ]

  return (
    <div className="px-5 pt-6 pb-10 sm:px-8 lg:px-[52px] lg:pt-[38px] lg:pb-[40px]">
      <div className="animate-rise-in relative z-30">
        <TopBar showSearch={false} />
      </div>

      <div className="animate-rise-in mt-6 [animation-delay:80ms] lg:mt-[34px]">
        <h1 className="text-[24px] font-bold text-white lg:text-[28px]">Langganan</h1>
        <p className="mt-1.5 text-[14px] text-mist-200">
          Paketmu, apa saja yang termasuk, dan seluruh riwayat tagihannya.
        </p>
      </div>

      {changedTo && (
        <div className="animate-rise-in mt-5 flex items-start gap-3 rounded-[12px] border border-brand-cyan/40 bg-brand-cyan/10 px-5 py-4">
          <Check className="mt-0.5 size-4 shrink-0 text-brand-cyan" strokeWidth={2.6} />
          <p className="text-[14px] leading-relaxed text-mist-100">
            Paket diubah ke <span className="font-semibold text-white">{changedTo}</span>.
            Penagihan belum diaktifkan pada periode kompetisi, jadi tidak ada
            pembayaran yang diproses.
          </p>
        </div>
      )}

      {(subscription.error || actionError) && (
        <div className="mt-5 flex items-start gap-3 rounded-[12px] bg-danger/10 px-5 py-4 text-[14px] text-danger-soft">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          {subscription.error ?? actionError}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:gap-[26px]">
        {/* Kolom kiri — paket berjalan dan hak akses */}
        <div className="animate-rise-in flex flex-1 flex-col gap-6 [animation-delay:140ms]">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-bold text-white">Paket berjalan</h2>
              {subscription.data && (
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    subscription.data.status === 'active'
                      ? 'bg-brand-cyan/15 text-brand-cyan'
                      : 'bg-warning-soft/15 text-warning-soft'
                  }`}
                >
                  {subscription.data.status === 'active' ? 'Aktif' : subscription.data.status}
                </span>
              )}
            </div>

            {!currentPlan ? (
              <div className="mt-5 h-[200px] animate-pulse rounded-[10px] bg-navy-950/50" />
            ) : (
              <>
                <div className="mt-5 rounded-[10px] border border-navy-700 bg-navy-950/50 px-5 py-6 sm:px-7">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[24px] font-bold text-white sm:text-[28px]">
                      {currentPlan.name}
                    </h3>
                    <span className="shrink-0 rounded-full bg-mist-400 px-4 py-1 text-[11px] font-semibold text-navy-900">
                      {currentPlan.badge}
                    </span>
                  </div>

                  <p className="mt-2 text-[14px] text-mist-200">{currentPlan.audience}</p>

                  <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <p className="flex items-baseline gap-1.5 text-white">
                      <span className="text-[34px] leading-none font-bold tabular-nums sm:text-[42px]">
                        {currentPlan.price_label}
                      </span>
                      {currentPlan.period && (
                        <span className="text-[20px] font-normal text-mist-200">
                          {currentPlan.period}
                        </span>
                      )}
                    </p>
                    <span className="pb-1 text-[13px] text-mist-400">
                      {currentPlan.billing_note}
                    </span>
                  </div>

                  {subscription.data?.renews_at && (
                    <p className="mt-3 text-[12px] text-mist-400">
                      Perpanjangan berikutnya {formatDate(subscription.data.renews_at)}
                    </p>
                  )}
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
              </>
            )}
          </Panel>

          <Panel>
            <h2 className="text-[18px] font-bold text-white">Batas paketmu</h2>
            <p className="mt-1.5 text-[13px] text-mist-400">
              Pemakaian berjalan belum dicatat pada MVP ini, jadi yang
              ditampilkan adalah batas yang berlaku — bukan angka pemakaian.
            </p>

            <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
              {entitlements.map((item) => (
                <div key={item.label}>
                  <dt className="text-[13px] text-mist-200">{item.label}</dt>
                  <dd className="mt-1.5 text-[16px] font-semibold text-white">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 flex items-start gap-2.5 border-t border-navy-700/60 pt-5 text-[13px] leading-relaxed text-mist-400">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-mist-400" strokeWidth={1.8} />
              Kuota membatasi seberapa banyak yang bisa kamu tarik dari LUMINA,
              bukan cara indeksnya dihitung. Tingkat keterandalan sama persis di
              semua paket.
            </p>
          </Panel>

          <Panel>
            <h2 className="text-[18px] font-bold text-white">Metode pembayaran</h2>

            <div className="mt-5 flex flex-col gap-4 rounded-[10px] border border-dashed border-navy-700 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <CreditCard className="size-6 shrink-0 text-mist-400" strokeWidth={1.6} />
                <div>
                  <p className="text-[14px] font-semibold text-white">
                    Belum ada metode pembayaran
                  </p>
                  <p className="mt-0.5 text-[13px] text-mist-400">
                    Penagihan belum diaktifkan selama periode kompetisi.
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Kolom kanan — ganti paket dan riwayat tagihan */}
        <div className="animate-rise-in flex w-full flex-col gap-6 [animation-delay:200ms] lg:w-[430px] lg:shrink-0">
          <Panel>
            <h2 className="text-[18px] font-bold text-white">Ganti paket</h2>
            <p className="mt-1.5 text-[13px] text-mist-400">
              Bandingkan semuanya berdampingan di{' '}
              <Link to="/pricing" className="text-brand-cyan transition-colors hover:text-white">
                halaman harga
              </Link>
              .
            </p>

            <div className="mt-5 flex flex-col gap-3">
              {(plans.data ?? []).map((plan) => {
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
                        <p className="text-[15px] font-semibold text-white">{plan.name}</p>
                        <p className="mt-0.5 text-[12px] text-mist-400">
                          {plan.price_label}
                          {plan.period} · {plan.badge}
                        </p>
                      </div>

                      {isCurrent ? (
                        <span className="shrink-0 rounded-full border border-brand-cyan/40 px-3 py-1 text-[11px] font-semibold text-brand-cyan">
                          Aktif
                        </span>
                      ) : plan.price_amount === null ? (
                        <Link
                          to="/help"
                          className="shrink-0 rounded-lg bg-navy-700 px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-navy-700/70"
                        >
                          Hubungi tim
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPendingPlan(plan)
                            setChangedTo(null)
                          }}
                          className="shrink-0 rounded-lg bg-navy-700 px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-navy-700/70"
                        >
                          Pilih
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
                    Beralih ke{' '}
                    <span className="font-semibold text-white">{pendingPlan.name}</span> (
                    {pendingPlan.price_label}
                    {pendingPlan.period}). Penagihan belum diaktifkan selama
                    periode MAPID WebGIS Competition 2026 — konfirmasi hanya
                    mengubah apa yang bisa diakses akunmu, tanpa pembayaran.
                  </span>
                </p>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={confirmChange}
                    disabled={submitting}
                    className="rounded-lg bg-mist-100 px-5 py-2.5 text-[13px] font-semibold text-navy-900 transition-colors hover:bg-white disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan…' : 'Konfirmasi perubahan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingPlan(null)}
                    className="rounded-lg border border-mist-400/60 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </Panel>

          <Panel>
            <h2 className="text-[18px] font-bold text-white">Riwayat tagihan</h2>

            <div className="mt-5 overflow-x-auto rounded-lg border border-navy-700">
              <table className="w-full min-w-[380px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-navy-700">
                    {['Tanggal', 'Paket', 'Jumlah', 'Status'].map((heading) => (
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
                  {(invoices.data ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-[13px] text-mist-400"
                      >
                        {invoices.loading ? 'Memuat…' : 'Belum ada riwayat tagihan.'}
                      </td>
                    </tr>
                  ) : (
                    (invoices.data ?? []).map((invoice) => (
                      <tr key={invoice.id} className="border-b border-navy-700 last:border-b-0">
                        <td className="px-4 py-2.5 text-[13px] font-semibold text-white">
                          {formatDate(invoice.issued_at)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-mist-200">
                          {invoice.plan_id}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-mist-200 tabular-nums">
                          {formatRupiah(invoice.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-brand-cyan">
                          {invoice.status}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-[12px] text-mist-400">
              Baris tagihan mencatat perubahan paket; tidak ada pembayaran yang
              diproses pada MVP ini.
            </p>
          </Panel>

          <Panel>
            <h2 className="text-[16px] font-bold text-white">
              Mengelola koridor, bukan satu gerai?
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-mist-200">
              Enterprise menambahkan REST API read-only, ekspor tanpa batas, dan
              kalibrasi survei lapangan pada koridor yang kamu tentukan.
            </p>
            <Link
              to="/pricing"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-cyan transition-colors hover:text-white"
            >
              Lihat isi Enterprise
              <ArrowUpRight className="size-4" strokeWidth={2} />
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  )
}

export default Subscription
