import { ArrowUpDown, Clock, MapPin, Route, TriangleAlert } from 'lucide-react'
import RouteCard from './RouteCard'
import StationCombobox from '../../../components/ui/StationCombobox'
import type { StationSummary } from '../../../lib/geoApi'
import type { RouteOption, TripPlan } from '../../../lib/tripsApi'

type PlanTripPanelProps = {
  stations: StationSummary[]
  origin: string
  destination: string
  onOriginChange: (stationId: string) => void
  onDestinationChange: (stationId: string) => void
  onSwap: () => void
  plan: TripPlan | null
  selectedRouteId: string | null
  onSelectRoute: (routeId: string) => void
  loading: boolean
  error: string | null
}

/** Kolom kiri: form perjalanan dan daftar keberangkatan. */
function PlanTripPanel({
  stations,
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  onSwap,
  plan,
  selectedRouteId,
  onSelectRoute,
  loading,
  error,
}: PlanTripPanelProps) {
  const options = plan?.options ?? []

  return (
    <section className="w-full lg:w-[440px] lg:shrink-0 xl:w-[520px]">
      <div>
        <h1 className="text-[28px] leading-tight font-bold text-white sm:text-[32px]">
          Selamat datang kembali.
        </h1>
        <p className="mt-1.5 text-[16px] text-mist-400">Mau ke mana hari ini?</p>
      </div>

      {/* --- Form asal & tujuan --- */}
      <div className="mt-7">
        <h2 className="text-[20px] font-bold text-white">Rencanakan perjalanan</h2>
        <p className="mt-1 text-[13px] text-mist-400">
          Ketik nama stasiun. Jalurnya dicari otomatis, termasuk titik transitnya.
        </p>
      </div>

      <div className="relative mt-4 flex flex-col gap-3">
        <StationCombobox
          label="Dari"
          placeholder="Stasiun keberangkatan…"
          marker={
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-[3px] border-brand-cyan" />
          }
          stations={stations}
          value={origin}
          onChange={onOriginChange}
          excludeId={destination}
        />

        <StationCombobox
          label="Ke"
          placeholder="Stasiun tujuan…"
          marker={<MapPin className="size-5 shrink-0 text-danger" strokeWidth={2} />}
          stations={stations}
          value={destination}
          onChange={onDestinationChange}
          excludeId={origin}
        />

        {/* Tombol tukar melayang tepat di sela dua kartu. */}
        <button
          type="button"
          onClick={onSwap}
          aria-label="Tukar asal dan tujuan"
          className="absolute top-1/2 right-5 z-20 flex size-[38px] -translate-y-1/2 items-center justify-center rounded-full border border-navy-700 bg-navy-800 text-mist-100 transition-colors hover:bg-navy-700 sm:right-6"
        >
          <ArrowUpDown className="size-4" strokeWidth={1.8} />
        </button>
      </div>

      {error && (
        <p className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-danger/10 px-4 py-3 text-[13px] text-danger-soft">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          {error}
        </p>
      )}

      {/* --- Ringkasan jalur yang ditemukan --- */}
      {plan && !error && (
        <div className="mt-4 rounded-[14px] border border-navy-700/50 bg-navy-950 px-5 py-4">
          <p className="flex items-center gap-2.5 text-[13px] text-mist-400">
            <Route className="size-4 shrink-0 text-brand-cyan" strokeWidth={1.8} />
            Jalur ditemukan
          </p>
          <p className="mt-2 text-[15px] leading-[1.6] text-white">
            {plan.stop_count} perhentian
            {plan.transfer_count === 0
              ? ' · langsung tanpa transit'
              : ` · ${plan.transfer_count}x transit di ${plan.transfers
                  .map((item) => item.station_name)
                  .join(' dan ')}`}
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.6] text-mist-400">
            Lewat lin{' '}
            {plan.segments.map((segment) => segment.line).join(' → ')}
          </p>
        </div>
      )}

      {/* --- Opsi keberangkatan --- */}
      {/* Sebelum kedua stasiun dipilih tidak ada yang bisa dihitung, jadi
          bagian ini diganti petunjuk singkat daripada daftar kosong. */}
      {!plan && !loading ? (
        <p className="mt-7 flex items-start gap-2.5 rounded-[14px] border border-dashed border-navy-700 px-5 py-4 text-[13px] leading-[1.6] text-mist-400">
          <Clock className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          Pilihan keberangkatan muncul setelah stasiun asal dan tujuan diisi.
        </p>
      ) : (
        <>
          <div className="mt-7 flex items-center justify-between gap-4">
            <h2 className="text-[20px] font-bold text-white">
              Pilihan keberangkatan
            </h2>
            <span className="text-[13px] text-mist-400">
              {loading ? 'memuat…' : `${options.length} slot waktu`}
            </span>
          </div>

          <p className="mt-2 flex items-start gap-2 text-[12px] leading-[1.5] text-mist-400">
            <Clock className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
            Kepadatan hanya punya resolusi per slot waktu, jadi pilihannya
            disusun per slot — bukan per menit keberangkatan.
          </p>

          <div className="mt-4 flex flex-col gap-3.5">
            {loading && options.length === 0
              ? [0, 1, 2].map((key) => (
                  <div
                    key={key}
                    className="h-[150px] animate-pulse rounded-[14px] border border-navy-700/50 bg-navy-950"
                  />
                ))
              : options.map((route: RouteOption) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    selected={route.id === selectedRouteId}
                    onSelect={() => onSelectRoute(route.id)}
                  />
                ))}
          </div>
        </>
      )}
    </section>
  )
}

export default PlanTripPanel
