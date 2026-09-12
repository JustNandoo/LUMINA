import { ArrowUpDown, Clock, MapPin, TriangleAlert } from 'lucide-react'
import RouteCard from './RouteCard'
import type { StationSummary } from '../../../lib/geoApi'
import type { RouteOption } from '../../../lib/tripsApi'

type PlanTripPanelProps = {
  stations: StationSummary[]
  origin: string
  destination: string
  onOriginChange: (stationId: string) => void
  onDestinationChange: (stationId: string) => void
  onSwap: () => void
  options: RouteOption[]
  selectedRouteId: string | null
  onSelectRoute: (routeId: string) => void
  loading: boolean
  error: string | null
}

/** Kolom kiri: form perjalanan dan daftar rute. */
function PlanTripPanel({
  stations,
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  onSwap,
  options,
  selectedRouteId,
  onSelectRoute,
  loading,
  error,
}: PlanTripPanelProps) {
  const endpoints = [
    {
      key: 'from',
      label: 'Dari',
      value: origin,
      onChange: onOriginChange,
      marker: (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-[3px] border-brand-cyan" />
      ),
    },
    {
      key: 'to',
      label: 'Ke',
      value: destination,
      onChange: onDestinationChange,
      marker: <MapPin className="size-5 shrink-0 text-danger" strokeWidth={2} />,
    },
  ]

  return (
    <section className="w-full lg:w-[520px] lg:shrink-0">
      <div>
        <h1 className="text-[28px] leading-tight font-bold text-white sm:text-[32px]">
          Selamat datang kembali.
        </h1>
        <p className="mt-1.5 text-[16px] text-mist-400">Mau ke mana hari ini?</p>
      </div>

      <h2 className="mt-7 text-[20px] font-bold text-white">Rencanakan perjalanan</h2>

      <div className="relative mt-4 flex flex-col gap-3">
        {endpoints.map((endpoint) => (
          <div
            key={endpoint.key}
            className="rounded-[14px] border border-navy-700/50 bg-navy-950 px-5 py-3.5 sm:px-6"
          >
            <div className="flex items-center gap-4">
              {endpoint.marker}
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`station-${endpoint.key}`}
                  className="text-[13px] text-mist-400"
                >
                  {endpoint.label}
                </label>
                <select
                  id={`station-${endpoint.key}`}
                  value={endpoint.value}
                  onChange={(event) => endpoint.onChange(event.target.value)}
                  className="mt-0.5 w-full truncate bg-transparent pr-10 text-[20px] leading-tight font-semibold text-white focus:outline-none"
                >
                  {stations.map((station) => (
                    <option
                      key={station.id}
                      value={station.id}
                      className="bg-navy-950 text-white"
                    >
                      {station.name} · {station.line}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}

        {/* Tombol tukar melayang tepat di sela dua kartu. */}
        <button
          type="button"
          onClick={onSwap}
          aria-label="Tukar asal dan tujuan"
          className="absolute top-1/2 right-5 z-10 flex size-[38px] -translate-y-1/2 items-center justify-center rounded-full border border-navy-700 bg-navy-800 text-mist-100 transition-colors hover:bg-navy-700 sm:right-6"
        >
          <ArrowUpDown className="size-4" strokeWidth={1.8} />
        </button>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="text-[20px] font-bold text-white">Pilihan keberangkatan</h2>
        <span className="text-[13px] text-mist-400">
          {loading ? 'memuat…' : `${options.length} slot waktu`}
        </span>
      </div>

      <p className="mt-2 flex items-start gap-2 text-[12px] leading-[1.5] text-mist-400">
        <Clock className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
        Kepadatan hanya punya resolusi per slot waktu, jadi pilihannya disusun
        per slot — bukan per menit keberangkatan.
      </p>

      {error && (
        <p className="mt-4 flex items-start gap-2.5 rounded-lg bg-danger/10 px-3.5 py-3 text-[13px] text-danger-soft">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3.5">
        {loading && options.length === 0
          ? [0, 1, 2].map((key) => (
              <div
                key={key}
                className="h-[150px] animate-pulse rounded-[14px] border border-navy-700/50 bg-navy-950"
              />
            ))
          : options.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                selected={route.id === selectedRouteId}
                onSelect={() => onSelectRoute(route.id)}
              />
            ))}
      </div>
    </section>
  )
}

export default PlanTripPanel
