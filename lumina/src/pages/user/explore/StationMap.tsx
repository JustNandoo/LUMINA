import L from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { osmTile } from '../../../lib/mapTiles'
import type { TileStyle } from '../../../lib/mapTiles'
import {
  activeStationId,
  calibrationCorridor,
  stations,
} from './stationData'
import type { LatLng } from './stationData'


const manggarai = stations.find((station) => station.id === activeStationId)!

// Garis rujukan hanya untuk koridor kalibrasi; jaringan penuh akan datang
// dari layer transit OpenStreetMap.
const corridorLine: LatLng[] = calibrationCorridor.map(
  (station) => station.position,
)

function stationIcon(name: string, active: boolean, showLabel: boolean) {
  const diamond = active
    ? 'bg-white border-white'
    : 'bg-navy-900/70 border-mist-200'
  const label = active
    ? 'bg-navy-900 text-white border-white'
    : 'bg-navy-900/80 text-mist-200 border-navy-700'

  return L.divIcon({
    className: '',
    iconSize: [160, 52],
    iconAnchor: [80, 13],
    html: `
      <div class="flex flex-col items-center gap-1.5">
        <span class="size-[18px] rotate-45 border-2 ${diamond}"></span>
        ${
          showLabel
            ? `<span class="whitespace-nowrap border px-1.5 py-[1px] text-[11px] font-semibold tracking-[0.04em] ${label}">${name.toUpperCase()}</span>`
            : ''
        }
      </div>
    `,
  })
}

type StationMapProps = {
  tileStyle: TileStyle
  onReady: (map: LeafletMap) => void
  onSelectStation: (stationId: string) => void
}

function StationMap({ tileStyle, onReady, onSelectStation }: StationMapProps) {
  return (
    // Kelas tema ditaruh di wrapper: className milik MapContainer hanya
    // diterapkan sekali saat peta dibuat, jadi tidak ikut berubah.
    <div className={`size-full ${tileStyle === 'dark' ? 'map-dark' : ''}`}>
      <MapContainer
        ref={(map) => {
          if (map) onReady(map)
        }}
        center={manggarai.position}
        zoom={13}
        zoomControl={false}
        attributionControl={false}
        className="size-full bg-navy-950"
      >
        <TileLayer url={osmTile.url} attribution={osmTile.attribution} />

        <Polyline
          positions={corridorLine}
          pathOptions={{
            color: '#a7b6d0',
            weight: 2,
            opacity: 0.55,
            dashArray: '6 8',
          }}
        />

        {stations.map((station) => (
          <Marker
            key={station.id}
            position={station.position}
            icon={stationIcon(
            station.name,
            station.id === activeStationId,
            Boolean(station.calibrated) || station.id === activeStationId,
          )}
            eventHandlers={{ click: () => onSelectStation(station.id) }}
          />
        ))}
      </MapContainer>
    </div>
  )
}

export default StationMap
