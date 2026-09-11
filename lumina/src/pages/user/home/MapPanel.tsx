import { useEffect, useState } from 'react'
import L from 'leaflet'
import { ArrowRight, Lightbulb } from 'lucide-react'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import MapControls from '../../../components/map/MapControls'
import { osmTile } from '../../../lib/mapTiles'
import { resolveColor } from '../../../theme/theme'
import type { TileStyle } from '../../../lib/mapTiles'
import { stationPoint } from './tripData'

/** Penanda asal: cincin cyan, sama dengan titik "From" di form perjalanan. */
const originIcon = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<span class="block size-[18px] rounded-full border-[4px] border-brand-cyan bg-navy-950"></span>',
})

/** Penanda tujuan: titik merah, sama dengan pin "To". */
const destinationIcon = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<span class="block size-[18px] rounded-full border-[4px] border-danger bg-navy-950"></span>',
})

/** Sisi atas dilebihkan supaya penanda tidak tertutup banner rekomendasi. */
const fitPadding = {
  paddingTopLeft: [56, 96] as [number, number],
  paddingBottomRight: [56, 56] as [number, number],
}

type MapPanelProps = {
  originName: string
  destinationName: string
  suggestedDeparture: string
  onUseSuggestedTime: () => void
}

function MapPanel({
  originName,
  destinationName,
  suggestedDeparture,
  onUseSuggestedTime,
}: MapPanelProps) {
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [tileStyle, setTileStyle] = useState<TileStyle>('dark')
  const origin = stationPoint(originName)
  const destination = stationPoint(destinationName)

  // Peta dibuat sekali; saat asal/tujuan bertukar, bingkainya disetel ulang.
  useEffect(() => {
    map?.fitBounds([origin.position, destination.position], fitPadding)
  }, [map, origin.position, destination.position])

  return (
    <div className="overflow-hidden rounded-[14px] border border-navy-700/50 bg-navy-950">
      <div className="relative h-[220px] sm:h-[260px]">
        {/* Kelas tema ditaruh di wrapper: className milik MapContainer hanya
            diterapkan sekali saat peta dibuat. */}
        <div className={`size-full ${tileStyle === 'dark' ? 'map-dark' : ''}`}>
          <MapContainer
            ref={(instance) => {
              if (instance) setMap(instance)
            }}
            bounds={[origin.position, destination.position]}
            boundsOptions={fitPadding}
            zoomControl={false}
            attributionControl={false}
            scrollWheelZoom={false}
            className="size-full bg-navy-950"
          >
            <TileLayer url={osmTile.url} attribution={osmTile.attribution} />

            <Polyline
              positions={[origin.position, destination.position]}
              pathOptions={{
                color: resolveColor('brandCyan'),
                weight: 3,
                opacity: 0.9,
              }}
            />

            <Marker position={origin.position} icon={originIcon} />
            <Marker position={destination.position} icon={destinationIcon} />
          </MapContainer>
        </div>

        <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex items-start gap-3 rounded-[12px] border border-white/10 bg-navy-950/85 px-4 py-3 backdrop-blur-md sm:inset-x-4 sm:top-4 sm:gap-3.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-cyan/15">
            <Lightbulb className="size-4 text-brand-cyan" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-snug text-white sm:text-[14px]">
              Recommended departure: {suggestedDeparture} for a less crowded
              trip.
            </p>
            <button
              type="button"
              onClick={onUseSuggestedTime}
              className="pointer-events-auto mt-1.5 flex items-center gap-1.5 text-[13px] text-mist-400 transition-colors hover:text-mist-100"
            >
              Use this time
              <ArrowRight className="size-3.5" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="absolute right-3 bottom-3 z-[1000]">
          <MapControls
            map={map}
            onToggleTileStyle={() =>
              setTileStyle((current) => (current === 'dark' ? 'light' : 'dark'))
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-navy-700/40 px-5 py-[14px]">
        <span className="flex items-center gap-2.5 text-[14px] text-white">
          <span className="size-2.5 rounded-full bg-brand-cyan" />
          {origin.name}
          <span className="text-mist-400">→</span>
          <span className="size-2.5 rounded-full bg-danger" />
          {destination.name}
        </span>
        <span className="flex items-center gap-2 text-[13px] text-mist-400">
          <span className="size-1.5 rounded-full bg-brand-cyan" />
          Live tracking active
        </span>
      </div>
    </div>
  )
}

export default MapPanel
