import { useEffect } from 'react'
import L from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet'
import HeatLayer from '../../components/map/HeatLayer'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { osmTile } from '../../lib/mapTiles'
import type { TileStyle } from '../../lib/mapTiles'
import { heatPoints } from '../../data/areas'
import type { MapPoint } from './mapAdminData'
import { surveySites } from './mapAdminData'

function FlyTo({ point }: { point: MapPoint | null }) {
  const map = useMap()
  useEffect(() => {
    if (point) map.flyTo(point.position, 15, { duration: 0.6 })
  }, [map, point])
  return null
}

function pointIcon(point: MapPoint, selected: boolean) {
  const box = selected
    ? 'bg-mist-100 border-white'
    : point.published
      ? 'bg-navy-900 border-brand-cyan'
      : 'bg-navy-900 border-mist-400/60'
  const dot = selected
    ? 'bg-navy-900'
    : point.published
      ? 'bg-brand-cyan'
      : 'bg-mist-400/70'

  return L.divIcon({
    className: '',
    iconSize: [150, 46],
    iconAnchor: [75, 14],
    html: `
      <div class="flex flex-col items-center gap-1">
        <span class="flex size-[26px] items-center justify-center border-2 ${box}">
          <span class="size-[8px] ${dot}"></span>
        </span>
        <span class="whitespace-nowrap bg-navy-950/85 px-1.5 text-[10px] font-semibold tracking-[0.06em] text-white uppercase">
          ${point.name}
        </span>
      </div>
    `,
  })
}

export type LayerVisibility = Record<string, boolean>

type AdminMapCanvasProps = {
  points: MapPoint[]
  selected: MapPoint | null
  visibility: LayerVisibility
  tileStyle: TileStyle
  onReady: (map: LeafletMap) => void
  onSelect: (point: MapPoint) => void
}

function AdminMapCanvas({
  points,
  selected,
  visibility,
  tileStyle,
  onReady,
  onSelect,
}: AdminMapCanvasProps) {
  const route = points
    .filter((point) => point.published)
    .map((point) => point.position)

  return (
    <div className={`size-full ${tileStyle === 'dark' ? 'map-dark' : ''}`}>
      <MapContainer
        ref={(map) => {
          if (map) onReady(map)
        }}
        center={[-6.2, 106.83]}
        zoom={12}
        zoomControl={false}
        attributionControl={false}
        className="size-full bg-navy-950"
      >
        <TileLayer url={osmTile.url} attribution={osmTile.attribution} />
        <FlyTo point={selected} />

        {visibility.heatmap && <HeatLayer points={heatPoints} />}

        {visibility.routes && route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: '#a7b6d0',
              weight: 2,
              opacity: 0.6,
              dashArray: '6 8',
            }}
          />
        )}

        {visibility.survey &&
          surveySites.map((site) => (
            <CircleMarker
              key={site.id}
              center={site.position}
              radius={7}
              pathOptions={{
                color: '#ffedd5',
                weight: 2,
                fillColor: '#ffedd5',
                fillOpacity: 0.35,
              }}
            />
          ))}

        {visibility.stations &&
          points.map((point) => (
            <Marker
              key={point.id}
              position={point.position}
              icon={pointIcon(point, point.id === selected?.id)}
              eventHandlers={{ click: () => onSelect(point) }}
            />
          ))}
      </MapContainer>
    </div>
  )
}

export default AdminMapCanvas
