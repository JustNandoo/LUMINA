import { Bookmark, MapPin, Navigation, Repeat, TrainFront } from 'lucide-react'
import MapPanel from './MapPanel'
import ReliabilityBadge from '../../../components/ui/ReliabilityBadge'
import { crowdTone, formatDuration, formatRupiah } from '../../../lib/crowdTone'
import type { RouteOption, TripPlan } from '../../../lib/tripsApi'

type TripDetailPanelProps = {
  plan: TripPlan
  route: RouteOption
  onUseSuggestion: () => void
}

/** Kolom kanan: peta lintasan terpilih dan rinciannya. */
function TripDetailPanel({ plan, route, onUseSuggestion }: TripDetailPanelProps) {
  const tone = crowdTone[route.crowd]

  const stats = [
    { label: 'Durasi', value: formatDuration(route.duration_minutes) },
    { label: 'Perhentian', value: `${plan.stop_count} stasiun` },
    { label: 'Perkiraan tarif', value: formatRupiah(route.fare) },
  ]

  return (
    <section className="flex w-full flex-col gap-3.5">
      <MapPanel
        plan={plan}
        suggestionText={plan.recommendation.reason}
        onUseSuggestion={onUseSuggestion}
      />

      <div className="rounded-[14px] border border-navy-700/50 bg-navy-950 px-5 py-6 sm:px-7 lg:py-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[13px] text-mist-400">Rincian perjalanan terpilih</p>
            <h2 className="mt-1.5 text-[22px] font-bold text-white sm:text-[26px]">
              {plan.origin.name} <span className="text-mist-400">→</span>{' '}
              {plan.destination.name}
            </h2>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium ${tone.chip}`}>
              {tone.label} · {route.crowd_index}/100
            </span>
            <ReliabilityBadge level={plan.reliability} compact />
          </div>
        </div>

        <p className="mt-2 text-[12px] text-mist-400">
          Indeks kepadatan relatif pada slot {route.slot_label} di{' '}
          {plan.origin.name}, bukan jumlah penumpang.
        </p>

        {/* Ruas perjalanan: tiap pergantian lin adalah satu transit nyata. */}
        <ol className="mt-6 flex flex-col border-t border-navy-700/40 pt-6">
          {plan.segments.map((segment, index) => (
            <li key={`${segment.line}-${segment.from.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  {index === 0 ? (
                    <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-[3px] border-brand-cyan" />
                  ) : (
                    <Repeat
                      className="mt-0.5 size-5 shrink-0 text-warning-soft"
                      strokeWidth={2}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold text-white">
                      {segment.from.name}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-[14px] text-mist-400">
                      <TrainFront className="size-4 shrink-0" strokeWidth={1.6} />
                      Lin {segment.line} · {segment.stop_count} perhentian
                    </p>
                  </div>
                </div>
                {index === 0 && (
                  <span className="shrink-0 text-[18px] font-bold text-white tabular-nums">
                    {route.departure} WIB
                  </span>
                )}
              </div>

              {/* Stasiun antara ditampilkan ringkas supaya lintasannya terbaca. */}
              {segment.stations.length > 2 && (
                <p className="mt-2 ml-9 border-l border-navy-700/50 py-2 pl-4 text-[12px] leading-[1.6] text-mist-400">
                  {segment.stations
                    .slice(1, -1)
                    .map((station) => station.name)
                    .join(' · ')}
                </p>
              )}
            </li>
          ))}

          <li className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <MapPin className="mt-0.5 size-5 shrink-0 text-danger" strokeWidth={2} />
              <div className="min-w-0">
                <p className="text-[17px] font-semibold text-white">
                  {plan.destination.name}
                </p>
                <p className="mt-1 text-[14px] text-mist-400">Stasiun tujuan</p>
              </div>
            </div>
            <span className="shrink-0 text-[18px] font-bold text-white tabular-nums">
              {route.arrival} WIB
            </span>
          </li>
        </ol>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[12px] border border-navy-700/50 bg-navy-900/60 px-5 py-4"
            >
              <p className="text-[13px] text-mist-400">{stat.label}</p>
              <p className="mt-1.5 text-[18px] font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2.5 rounded-[12px] border border-navy-700 bg-navy-900/60 py-[14px] text-[15px] font-medium text-white transition-colors hover:bg-navy-800"
          >
            <Bookmark className="size-[18px]" strokeWidth={1.8} />
            Simpan rute
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2.5 rounded-[12px] bg-brand-cyan py-[14px] text-[15px] font-semibold text-navy-900 transition-colors hover:brightness-110"
          >
            <Navigation className="size-[18px]" strokeWidth={2} />
            Mulai perjalanan
          </button>
        </div>
      </div>
    </section>
  )
}

export default TripDetailPanel
