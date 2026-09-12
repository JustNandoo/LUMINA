import {
  Check,
  ChartLine,
  Info,
  MessageSquare,
  ScanSearch,
  Store,
  TriangleAlert,
  X,
} from 'lucide-react'
import ReliabilityBadge from '../../../components/ui/ReliabilityBadge'
import type { AreaDetail, CategoryRecommendation } from '../../../lib/businessApi'

const RISK_TONE: Record<string, string> = {
  low: 'bg-brand-cyan/15 text-brand-cyan',
  medium: 'bg-warning-soft/15 text-warning-soft',
  high: 'bg-danger/20 text-danger-soft',
}

const RISK_LABEL: Record<string, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
}

const CONDITION_LABEL: Record<string, string> = {
  demand_high: 'Permintaan tinggi',
  competition_low: 'Pesaing sedikit',
  space_available: 'Ruang tersedia',
}

function CategoryRow({ category }: { category: CategoryRecommendation }) {
  return (
    <li
      className={`rounded-[10px] border px-3.5 py-3 ${
        category.viable
          ? 'border-brand-cyan/40 bg-brand-cyan/5'
          : 'border-navy-700/50 bg-navy-800/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[15px] font-medium text-white">{category.label}</span>
        <span
          className={`shrink-0 rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${
            category.viable
              ? 'bg-brand-cyan/20 text-brand-cyan'
              : 'bg-navy-700/70 text-mist-400'
          }`}
        >
          {category.viable ? 'Berpeluang' : 'Belum memenuhi'}
        </span>
      </div>

      {/* REQ-F7-03: tiga syarat harus terpenuhi bersamaan, jadi ketiganya
          ditampilkan apa adanya — termasuk yang gagal. */}
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {Object.entries(category.conditions).map(([key, met]) => (
          <li
            key={key}
            className={`flex items-center gap-1.5 text-[12px] ${
              met ? 'text-mist-100' : 'text-mist-400'
            }`}
          >
            {met ? (
              <Check className="size-3.5 shrink-0 text-brand-cyan" strokeWidth={2.4} />
            ) : (
              <X className="size-3.5 shrink-0 text-mist-400" strokeWidth={2.4} />
            )}
            {CONDITION_LABEL[key] ?? key}
          </li>
        ))}
      </ul>

      {/* REQ-F7-04: setiap rekomendasi menyajikan buktinya. */}
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-navy-700/40 pt-2.5">
        {[
          { label: 'Permintaan', signal: category.evidence.demand },
          { label: 'Persaingan', signal: category.evidence.competition },
          { label: 'Ruang', signal: category.evidence.space_availability },
        ].map((item) => (
          <div key={item.label} title={item.signal.source}>
            <dt className="text-[11px] text-mist-400">{item.label}</dt>
            <dd className="mt-0.5 text-[15px] font-semibold text-white tabular-nums">
              {item.signal.score}
              <span className="text-[11px] font-normal text-mist-400">/100</span>
            </dd>
          </div>
        ))}
      </dl>
    </li>
  )
}

type AreaDetailPanelProps = {
  area: AreaDetail | null
  loading: boolean
  error: string | null
  onClose: () => void
  onOpenChat: () => void
}

function AreaDetailPanel({
  area,
  loading,
  error,
  onClose,
  onOpenChat,
}: AreaDetailPanelProps) {
  const shell =
    'flex w-full flex-col lg:w-[368px] lg:shrink-0 lg:overflow-y-auto rounded-[14px] border border-navy-700/50 bg-navy-900/70'

  if (loading && !area) {
    return (
      <section className={shell}>
        <div className="animate-pulse space-y-3 p-[22px]">
          <div className="h-7 w-40 rounded bg-navy-700/70" />
          <div className="h-3 w-52 rounded bg-navy-700/60" />
          <div className="mt-6 h-24 rounded bg-navy-800/60" />
          <div className="h-40 rounded bg-navy-800/60" />
        </div>
      </section>
    )
  }

  if (error || !area) {
    return (
      <section className={shell}>
        <p className="m-[22px] flex items-start gap-2.5 rounded-lg bg-danger/10 px-3.5 py-3 text-[13px] text-danger-soft">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          {error ?? 'Data kawasan belum tersedia.'}
        </p>
      </section>
    )
  }

  return (
    <section className={shell}>
      <div className="px-[22px] pt-[18px] pb-[14px]">
        <div className="flex items-start justify-between">
          <h2 className="text-[24px] font-semibold text-white">{area.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail area"
            className="text-mist-400 transition-colors hover:text-white"
          >
            <X className="size-[19px]" strokeWidth={2} />
          </button>
        </div>
        <p className="mt-1 text-[14px] text-mist-400">{area.district}</p>
      </div>

      {/* --- Skor utama --- */}
      <div className="border-t border-navy-700/40 px-[22px] py-[16px]">
        <div className="flex gap-3">
          <div className="flex-1 rounded-[10px] bg-navy-800/70 px-4 py-3.5">
            <p className="flex items-center gap-2 text-[13px] text-mist-200">
              <ChartLine className="size-4 text-mist-100" strokeWidth={1.8} />
              Skor Potensi
            </p>
            <p className="mt-2.5 text-[38px] leading-none font-bold text-white tabular-nums">
              {area.potential_score}
              <span className="ml-1 text-[19px] font-normal text-mist-400">/ 100</span>
            </p>
          </div>

          <div className="flex w-[150px] flex-col gap-3 sm:w-[160px]">
            <div className="flex flex-1 items-center justify-between rounded-[10px] bg-navy-800/70 px-3.5 py-3">
              <span className="text-[13px] text-mist-200">Risiko</span>
              <span
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                  RISK_TONE[area.risk_level] ?? RISK_TONE.medium
                }`}
              >
                {RISK_LABEL[area.risk_level] ?? area.risk_level} · {area.risk_index}
              </span>
            </div>
            <div className="flex flex-1 items-center rounded-[10px] bg-navy-800/70 px-3.5 py-3">
              <ReliabilityBadge level={area.reliability} compact />
            </div>
          </div>
        </div>

        <p className="mt-2.5 text-[11px] leading-[1.6] text-mist-400">
          {area.formula}
        </p>
      </div>

      {/* --- Sinyal penyusun --- */}
      <div className="border-t border-navy-700/40 px-[22px] py-[16px]">
        <h3 className="flex items-center gap-2.5 text-[15px] font-medium text-white">
          <ScanSearch className="size-[18px] text-mist-100" strokeWidth={1.8} />
          Sinyal Penyusun
        </h3>

        <div className="mt-4 flex flex-col gap-3.5">
          {[
            { label: 'Permintaan', signal: area.signals.demand },
            { label: 'Persaingan', signal: area.signals.competition },
            { label: 'Ketersediaan ruang', signal: area.signals.space_availability },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="text-mist-200">{item.label}</span>
                <span className="tabular-nums text-white">{item.signal.score}/100</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-800">
                <div
                  className="h-full rounded-full bg-brand-cyan/70"
                  style={{ width: `${item.signal.score}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-mist-400">{item.signal.source}</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- Kategori usaha --- */}
      <div className="border-t border-navy-700/40 px-[22px] py-[16px]">
        <h3 className="flex items-center gap-2.5 text-[15px] font-medium text-white">
          <Store className="size-[18px] text-mist-100" strokeWidth={1.8} />
          Kategori Usaha
          <span className="text-[13px] font-normal text-mist-400">
            {area.viable_count} berpeluang
          </span>
        </h3>
        <p className="mt-2 text-[12px] leading-[1.5] text-mist-400">
          {area.condition_note}
        </p>

        <ul className="mt-3.5 flex flex-col gap-2.5">
          {area.categories.map((category) => (
            <CategoryRow key={category.category_id} category={category} />
          ))}
        </ul>
      </div>

      {/* REQ-F7-05: tidak ada proyeksi pendapatan, dan alasannya dinyatakan. */}
      <div className="border-t border-navy-700/40 px-[22px] py-[16px]">
        <p className="flex items-start gap-2.5 rounded-lg bg-navy-800/70 px-3.5 py-3 text-[12px] leading-[1.55] text-mist-200">
          <Info className="mt-0.5 size-4 shrink-0 text-mist-400" strokeWidth={1.8} />
          {area.revenue_note}
        </p>

        <button
          type="button"
          onClick={onOpenChat}
          className="mt-3.5 flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-navy-700 bg-navy-950 py-3 text-[14px] font-medium text-white transition-colors hover:bg-navy-800"
        >
          <MessageSquare className="size-[17px] text-brand-cyan" strokeWidth={1.8} />
          Tanya Lumina AI soal kawasan ini
        </button>
      </div>
    </section>
  )
}

export default AreaDetailPanel
