import L from 'leaflet'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import HeatLayer from '../../../components/map/HeatLayer'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { osmTile } from '../../../lib/mapTiles'
import type { TileStyle } from '../../../lib/mapTiles'
import { areas, heatPoints } from '../../../data/areas'
import type { Area } from '../../../data/areas'

function scoreIcon(area: Area, active: boolean) {
  const tile = active
    ? 'bg-mist-100 border-white'
    : 'bg-navy-900/85 border-mist-400/70'
  const dot = active ? 'bg-navy-900' : 'bg-brand-cyan'
  const label = active
    ? 'bg-navy-900 text-white border-white'
    : 'bg-navy-900/85 text-mist-200 border-navy-700'

  return L.divIcon({
    className: '',
    iconSize: [140, 76],
    iconAnchor: [70, 26],
    html: `
      <div class="flex flex-col items-center gap-1.5">
        <span class="flex size-[42px] items-center justify-center rounded-xl border-2 shadow-lg ${tile}">
          <span class="size-[14px] rounded-full ${dot}"></span>
        </span>
        <span class="whitespace-nowrap rounded-md border px-2 py-[2px] text-[11px] font-semibold ${label}">
          ${area.name} · ${area.score}
        </span>
      </div>
    `,
  })
}

type MapCanvasProps = {
  tileStyle: TileStyle
  selectedAreaId: string
  onReady: (map: LeafletMap) => void
  onSelectArea: (area: Area) => void
}

function MapCanvas({
  tileStyle,
  selectedAreaId,
  onReady,
  onSelectArea,
}: MapCanvasProps) {
  return (
    <div className={`size-full ${tileStyle === 'dark' ? 'map-dark' : ''}`}>
      <MapContainer
        ref={(map) => {
          if (map) onReady(map)
        }}
        center={[-6.2, 106.83]}
        zoom={13}
        zoomControl={false}
        attributionControl={false}
        className="size-full bg-navy-950"
      >
        <TileLayer url={osmTile.url} attribution={osmTile.attribution} />
        <HeatLayer points={heatPoints} radius={34} blur={26} />

        {areas.map((area) => (
          <Marker
            key={area.id}
            position={area.position}
            icon={scoreIcon(area, area.id === selectedAreaId)}
            eventHandlers={{ click: () => onSelectArea(area) }}
          />
        ))}
      </MapContainer>
    </div>
  )
}

export default MapCanvas
