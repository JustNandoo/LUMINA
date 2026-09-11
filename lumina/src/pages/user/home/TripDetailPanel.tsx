import { Bookmark, MapPin, Navigation } from 'lucide-react'
import MapPanel from './MapPanel'
import { buildStats, buildStops, crowdTone } from './tripData'
import type { RouteOption } from './tripData'

type TripDetailPanelProps = {
  origin: string
  destination: string
  route: RouteOption
  suggestedDeparture: string
  onUseSuggestedTime: () => void
}

/** Kolom kanan: peta rute terpilih dan rinciannya. */
function TripDetailPanel({
  origin,
  destination,
  route,
  suggestedDeparture,
  onUseSuggestedTime,
}: TripDetailPanelProps) {
  const tone = crowdTone[route.crowd]
  const stops = buildStops(origin, destination, route)
  const stats = buildStats(route)

  return (
    <section className="flex w-full flex-col gap-3.5">
      <MapPanel
        originName={origin}
        destinationName={destination}
        suggestedDeparture={suggestedDeparture}
        onUseSuggestedTime={onUseSuggestedTime}
      />

      <div className="rounded-[14px] border border-navy-700/50 bg-navy-950 px-5 py-6 sm:px-7 lg:py-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[13px] text-mist-400">Selected trip details</p>
            <h2 className="mt-1.5 text-[22px] font-bold text-white sm:text-[26px]">
              {origin} <span className="text-mist-400">→</span> {destination}
            </h2>
          </div>
          <span
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium ${tone.chip}`}
          >
            {tone.label} density
          </span>
        </div>

        <ol className="mt-6 flex flex-col gap-5 border-t border-navy-700/40 pt-6">
          {stops.map((stop) => (
            <li
              key={stop.name}
              className="flex items-start justify-between gap-4"
            >
              <div className="flex min-w-0 items-start gap-4">
                {stop.origin ? (
                  <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-[3px] border-brand-cyan" />
                ) : (
                  <MapPin
                    className="mt-0.5 size-5 shrink-0 text-danger"
                    strokeWidth={2}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold text-white">
                    {stop.name}
                  </p>
                  <p className="mt-1 text-[14px] text-mist-400">
                    {stop.detail}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-[18px] font-bold text-white tabular-nums">
                {stop.time}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[12px] border border-navy-700/50 bg-navy-900/60 px-5 py-4"
            >
              <p className="text-[13px] text-mist-400">{stat.label}</p>
              <p className="mt-1.5 text-[18px] font-semibold text-white">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2.5 rounded-[12px] border border-navy-700 bg-navy-900/60 py-[14px] text-[15px] font-medium text-white transition-colors hover:bg-navy-800"
          >
            <Bookmark className="size-[18px]" strokeWidth={1.8} />
            Save route
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2.5 rounded-[12px] bg-brand-cyan py-[14px] text-[15px] font-semibold text-navy-900 transition-colors hover:brightness-110"
          >
            <Navigation className="size-[18px]" strokeWidth={2} />
            Start trip
          </button>
        </div>
      </div>
    </section>
  )
}

export default TripDetailPanel
