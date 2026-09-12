import {
  Accessibility,
  ArrowUpDown,
  Banknote,
  Church,
  Info,
  MoveVertical,
  ShoppingBasket,
  Sofa,
  TriangleAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import ReliabilityBadge from '../../../components/ui/ReliabilityBadge'
import { crowdTone } from '../../../lib/crowdTone'
import type { SlotId, StationDetail } from '../../../lib/geoApi'

const AMENITY_ICON: Record<string, LucideIcon> = {
  restroom: Accessibility,
  'prayer-room': Church,
  'atm-center': Banknote,
  minimarket: ShoppingBasket,
  'waiting-room': Sofa,
  elevator: MoveVertical,
  escalator: ArrowUpDown,
}

type StationPanelProps = {
  station: StationDetail | null
  loading: boolean
  error: string | null
  slot: SlotId
  activeAmenityId: string | null
  onSelectAmenity: (amenity: { id: string; label: string }) => void
}

function StationPanel({
  station,
  loading,
  error,
  slot,
  activeAmenityId,
  onSelectAmenity,
}: StationPanelProps) {
  const shell =
    'flex w-full flex-col lg:max-h-full lg:w-[366px] lg:shrink-0 lg:overflow-y-auto rounded-[14px] border border-mist-400/40 bg-navy-900/90 px-[22px] py-[20px] backdrop-blur-md'

  if (loading && !station) {
    return (
      <section className={shell}>
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 rounded bg-navy-700/70" />
          <div className="h-7 w-40 rounded bg-navy-700/70" />
          <div className="h-3 w-52 rounded bg-navy-700/60" />
          <div className="mt-6 h-28 rounded bg-navy-800/60" />
          <div className="h-28 rounded bg-navy-800/60" />
        </div>
      </section>
    )
  }

  if (error || !station) {
    return (
      <section className={shell}>
        <p className="flex items-start gap-2.5 rounded-lg bg-danger/10 px-3.5 py-3 text-[13px] text-danger-soft">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          {error ?? 'Data stasiun belum tersedia.'}
        </p>
      </section>
    )
  }

  const profile = station.crowd_profile
  const currentSlot =
    profile.slots.find((item) => item.slot_id === slot) ?? profile.slots[0]
  const tone = crowdTone[currentSlot.level]
  const recommendation = profile.recommendation

  return (
    <section className={shell}>
      <p className="text-[12px] text-mist-400">Station Overview</p>
      <h2 className="mt-1 text-[24px] font-semibold text-white">{station.name}</h2>

      <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
        <p className="text-[13px] text-mist-200">{station.district}</p>
        <span className={`rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${tone.chip}`}>
          {tone.label}
        </span>
      </div>

      <p className="mt-3.5 text-[12px] text-mist-400">
        KRL Commuter Line • Lin {station.line}
        {station.interchange ? ' • Titik interchange' : ''}
      </p>

      <div className="mt-3">
        <ReliabilityBadge level={station.reliability} />
      </div>

      {/* --- Profil jam sibuk (F1) --- */}
      <h3 className="mt-5 text-[19px] font-bold text-white">Profil Jam Sibuk</h3>
      <p className="mt-1 text-[12px] leading-[1.5] text-mist-400">{profile.scale}</p>

      <div className="mt-3.5 flex flex-col gap-3">
        {profile.slots.map((item) => {
          const itemTone = crowdTone[item.level]
          const active = item.slot_id === slot
          return (
            <div key={item.slot_id}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className={active ? 'font-semibold text-white' : 'text-mist-200'}>
                  {item.label}
                </span>
                <span className="tabular-nums text-mist-200">
                  <span className="text-[15px] font-semibold text-white">{item.index}</span>
                  <span className="text-mist-400">/100</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-800">
                <div
                  className={`h-full rounded-full ${itemTone.bar} ${active ? '' : 'opacity-55'}`}
                  style={{ width: `${item.index}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* --- Rekomendasi jam berangkat (F3) --- */}
      <div className="mt-4 rounded-[10px] border border-brand-cyan/30 bg-brand-cyan/5 px-3.5 py-3">
        <p className="text-[12px] font-semibold tracking-wide text-brand-cyan uppercase">
          Saran waktu berangkat
        </p>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-mist-100">
          {recommendation.reason}
        </p>

        {recommendation.drivers.length > 0 && (
          <ul className="mt-2.5 flex flex-col gap-1">
            {recommendation.drivers.map((driver) => (
              <li key={driver.factor} className="text-[12px] text-mist-400">
                <span className="text-mist-200">{driver.factor}</span> — {driver.detail}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* REQ-F3-04: tanpa kalibrasi memadai, indeks disajikan tanpa klaim prediktif. */}
      {!profile.predictive && (
        <p className="mt-3 flex items-start gap-2.5 rounded-lg bg-navy-800/70 px-3.5 py-3 text-[12px] leading-[1.5] text-mist-200">
          <Info className="mt-0.5 size-4 shrink-0 text-mist-400" strokeWidth={1.8} />
          Stasiun ini di luar koridor kalibrasi, jadi angkanya dibaca sebagai
          indeks relatif dari sinyal proksi — bukan prediksi.
        </p>
      )}

      {/* --- Fasilitas (F5) --- */}
      <h3 className="mt-5 text-[19px] font-bold text-white">Fasilitas Stasiun</h3>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {station.amenities.map((amenity) => {
          const Icon = AMENITY_ICON[amenity.id] ?? Sofa
          const active = activeAmenityId === amenity.id
          return (
            <button
              key={amenity.id}
              type="button"
              onClick={() => onSelectAmenity(amenity)}
              className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-3 text-left text-[14px] transition-colors ${
                active
                  ? 'border-brand-cyan bg-brand-cyan/10 text-white'
                  : 'border-transparent bg-navy-800/70 text-mist-200 hover:bg-navy-700/70 hover:text-white'
              }`}
            >
              <Icon className="size-[17px] shrink-0" strokeWidth={1.8} />
              {amenity.label}
            </button>
          )
        })}
      </div>
      <p className="mt-2.5 text-[11px] text-mist-400">
        Sumber: {station.amenities_source}
      </p>
    </section>
  )
}

export default StationPanel
