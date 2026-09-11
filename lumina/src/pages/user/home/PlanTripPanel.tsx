import {
  ArrowUpDown,
  Calendar,
  Clock,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react'
import RouteCard from './RouteCard'
import { routeOptions } from './tripData'

const filters = ['Fastest', 'Less crowded', 'Fewer transfers']

type PlanTripPanelProps = {
  origin: string
  destination: string
  departureTime: string
  activeFilter: string
  onFilterChange: (filter: string) => void
  selectedRouteId: string
  onSelectRoute: (routeId: string) => void
  onSwap: () => void
}

/** Kolom kiri: form perjalanan dan daftar rute. */
function PlanTripPanel({
  origin,
  destination,
  departureTime,
  activeFilter,
  onFilterChange,
  selectedRouteId,
  onSelectRoute,
  onSwap,
}: PlanTripPanelProps) {
  const endpoints = [
    {
      key: 'from',
      label: 'From',
      value: origin,
      marker: (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-[3px] border-brand-cyan" />
      ),
    },
    {
      key: 'to',
      label: 'To',
      value: destination,
      marker: (
        <MapPin className="size-5 shrink-0 text-danger" strokeWidth={2} />
      ),
    },
  ]

  return (
    <section className="w-full lg:w-[520px] lg:shrink-0">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-bold text-white sm:text-[32px]">
            Welcome back.
          </h1>
          <p className="mt-1.5 text-[16px] text-mist-400">
            Where are you headed today?
          </p>
        </div>
      </div>

      <div className="mt-7 flex items-center justify-between gap-4">
        <h2 className="text-[20px] font-bold text-white">Plan your trip</h2>
        <button
          type="button"
          aria-label="Trip preferences"
          className="flex size-9 items-center justify-center rounded-[10px] border border-navy-700/60 bg-navy-950 text-mist-200 transition-colors hover:bg-navy-800 hover:text-white"
        >
          <SlidersHorizontal className="size-[18px]" strokeWidth={1.7} />
        </button>
      </div>

      <div className="relative mt-4 flex flex-col gap-3">
        {endpoints.map((endpoint) => (
          <div
            key={endpoint.key}
            className="rounded-[14px] border border-navy-700/50 bg-navy-950 px-5 py-3.5 sm:px-6"
          >
            <div className="flex items-center gap-4">
              {endpoint.marker}
              <div className="min-w-0">
                <p className="text-[13px] text-mist-400">{endpoint.label}</p>
                <p className="mt-0.5 truncate text-[20px] leading-tight font-semibold text-white">
                  {endpoint.value}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Tombol tukar melayang tepat di sela dua kartu. */}
        <button
          type="button"
          onClick={onSwap}
          aria-label="Swap origin and destination"
          className="absolute top-1/2 right-5 z-10 flex size-[38px] -translate-y-1/2 items-center justify-center rounded-full border border-navy-700 bg-navy-800 text-mist-100 transition-colors hover:bg-navy-700 sm:right-6"
        >
          <ArrowUpDown className="size-4" strokeWidth={1.8} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { icon: Clock, label: 'Departure time', value: departureTime },
          { icon: Calendar, label: 'Date', value: 'Today' },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-3.5 rounded-[14px] border border-navy-700/50 bg-navy-950 px-5 py-3"
          >
            <Icon className="size-5 shrink-0 text-mist-400" strokeWidth={1.6} />
            <div className="min-w-0">
              <p className="text-[13px] text-mist-400">{label}</p>
              <p className="mt-0.5 text-[17px] leading-tight font-semibold text-white tabular-nums">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="text-[20px] font-bold text-white">Route options</h2>
        <span className="text-[13px] text-mist-400">
          {routeOptions.length} alternatives found
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => onFilterChange(filter)}
            aria-pressed={activeFilter === filter}
            className={`rounded-full px-[18px] py-2 text-[14px] font-medium transition-colors ${
              activeFilter === filter
                ? 'bg-brand-cyan text-navy-900'
                : 'bg-navy-950 text-mist-200 hover:bg-navy-800'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3.5">
        {routeOptions.map((route) => (
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
