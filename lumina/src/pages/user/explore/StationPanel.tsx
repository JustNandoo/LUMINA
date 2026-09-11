import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  amenities,
  nearbyCategories,
  nearbyPlaces,
  type Amenity,
  type NearbyCategory,
} from './stationData'

type StationPanelProps = {
  activeAmenityId: string | null
  onSelectAmenity: (amenity: Amenity) => void
}

function StationPanel({ activeAmenityId, onSelectAmenity }: StationPanelProps) {
  const [category, setCategory] = useState<NearbyCategory>('All')

  const places =
    category === 'All'
      ? nearbyPlaces
      : nearbyPlaces.filter((place) => place.category === category)

  return (
    <section className="flex w-full flex-col lg:max-h-full lg:w-[366px] lg:shrink-0 lg:overflow-y-auto rounded-[14px] border border-mist-400/40 bg-navy-900/90 px-[22px] py-[20px] backdrop-blur-md">
      <p className="text-[12px] text-mist-400">Station Overview</p>
      <h2 className="mt-1 text-[24px] font-semibold text-white">Manggarai</h2>
      <div className="mt-0.5 flex items-center gap-3">
        <p className="text-[13px] text-mist-200">Tebet, South Jakarta</p>
        <span className="rounded-md bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-warning">
          Medium
        </span>
      </div>
      <p className="mt-3.5 text-[12px] text-mist-400">
        KRL Commuter Line • Major Transit Station
      </p>

      <h3 className="mt-4 text-[19px] font-bold text-white">
        Station Amenities
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {amenities.map((amenity) => {
          const Icon = amenity.icon
          const active = activeAmenityId === amenity.id
          return (
            <button
              key={amenity.id}
              type="button"
              onClick={() => onSelectAmenity(amenity)}
              className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-3 text-left text-[14px] transition-colors ${
                amenity.wide ? 'col-span-2' : ''
              } ${
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

      <h3 className="mt-5 text-[19px] font-bold text-white">Nearby Places</h3>
      <p className="mt-1 text-[13px] leading-[1.5] text-mist-400">
        Explore places within walking distance of Manggarai Station.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {nearbyCategories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${
              category === item
                ? 'bg-brand-cyan font-medium text-navy-900'
                : 'bg-navy-800/70 text-mist-200 hover:bg-navy-700'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {places.length === 0 ? (
          <p className="rounded-lg bg-navy-800/50 px-4 py-5 text-center text-[13px] text-mist-400">
            Belum ada tempat pada kategori ini.
          </p>
        ) : (
          places.map((place) => (
            <button
              key={place.name}
              type="button"
              className="flex items-center gap-3.5 rounded-lg bg-navy-800/70 px-3.5 py-3 text-left transition-colors hover:bg-navy-700/70"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy-950/70 text-[13px] text-mist-100">
                {place.type.slice(0, 1)}
              </span>
              <span className="flex-1">
                <span className="block text-[16px] text-white">
                  {place.name}
                </span>
                <span className="block text-[13px] text-mist-400">
                  {place.type} • {place.distance}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-mist-400"
                strokeWidth={2}
              />
            </button>
          ))
        )}
      </div>
    </section>
  )
}

export default StationPanel
