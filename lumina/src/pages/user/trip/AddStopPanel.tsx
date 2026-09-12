import { Check, Footprints, Info, Plus, Store, X } from 'lucide-react'
import { useApi } from '../../../hooks/useApi'
import { fetchStationPlaces } from '../../../lib/tripsApi'
import type { NearbyPlace } from '../../../lib/tripsApi'

type AddStopPanelProps = {
  stationId: string
  stationName: string
  /** Id tempat yang sudah ditambahkan, supaya tidak bisa ditambah dua kali. */
  addedPlaceIds: string[]
  onAdd: (place: NearbyPlace) => void
  onClose: () => void
}

function AddStopPanel({
  stationId,
  stationName,
  addedPlaceIds,
  onAdd,
  onClose,
}: AddStopPanelProps) {
  const places = useApi(() => fetchStationPlaces(stationId, 10), [stationId])
  const added = new Set(addedPlaceIds)

  return (
    <section className="flex w-full flex-col rounded-[14px] border border-navy-700/50 bg-navy-900/70">
      <header className="flex items-start justify-between gap-3 border-b border-navy-700/40 px-[22px] py-[18px]">
        <div>
          <p className="text-[12px] text-mist-400">Tambah singgah</p>
          <h3 className="mt-0.5 text-[19px] font-semibold text-white">{stationName}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup daftar tempat"
          className="text-mist-400 transition-colors hover:text-white"
        >
          <X className="size-[18px]" strokeWidth={2} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-[22px] py-4">
        {places.loading && (
          <div className="space-y-2.5">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-[72px] animate-pulse rounded-[10px] bg-navy-800/60" />
            ))}
          </div>
        )}

        {places.error && (
          <p className="rounded-lg bg-danger/10 px-3.5 py-3 text-[13px] text-danger-soft">
            {places.error}
          </p>
        )}

        <ul className="flex flex-col gap-2.5">
          {(places.data ?? []).map((place) => {
            const isAdded = added.has(place.id)
            return (
              <li
                key={place.id}
                className="rounded-[10px] border border-navy-700/50 bg-navy-800/40 px-3.5 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[15px] font-medium text-white">
                      <Store className="size-4 shrink-0 text-mist-400" strokeWidth={1.8} />
                      <span className="truncate">{place.name}</span>
                    </p>
                    <p className="mt-1 text-[12px] text-mist-400">
                      {place.category} · {place.spot}
                    </p>
                    <p className="mt-1 flex items-center gap-3 text-[12px] text-mist-200">
                      <span className="flex items-center gap-1.5">
                        <Footprints className="size-3.5 shrink-0" strokeWidth={1.8} />
                        {place.distance_m} m · {place.walk_minutes} mnt jalan
                      </span>
                      <span className="text-mist-400">{place.price_band}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isAdded}
                    onClick={() => onAdd(place)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      isAdded
                        ? 'bg-brand-cyan/15 text-brand-cyan'
                        : 'bg-navy-700 text-white hover:bg-navy-700/70'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="size-3.5" strokeWidth={2.4} />
                        Ditambahkan
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5" strokeWidth={2.4} />
                        Singgah
                      </>
                    )}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Batas klaim: ini bukan direktori usaha terverifikasi. */}
        <p className="mt-4 flex items-start gap-2.5 rounded-lg bg-navy-800/60 px-3.5 py-3 text-[11px] leading-[1.6] text-mist-400">
          <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
          Daftar ini diturunkan dari kategori Properti Go dan sinyal kawasan,
          bukan direktori usaha yang sudah diverifikasi. Nama gerai adalah
          contoh untuk menguji alur singgah.
        </p>
      </div>
    </section>
  )
}

export default AddStopPanel
