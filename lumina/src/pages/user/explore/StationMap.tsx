import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeoJSONSource, Map as MapLibreInstance } from 'maplibre-gl'
import MapLibreMap from '../../../components/map/MapLibreMap'
import type { MapidStyle } from '../../../lib/mapidMap'
import type { StationSummary } from '../../../lib/geoApi'

const STATION_SOURCE = 'lumina-stations'
const CORRIDOR_SOURCE = 'lumina-corridor'

// Skala warna yang sama dengan indikator kepadatan di seluruh aplikasi.
const LEVEL_COLOR: Record<string, string> = {
  low: '#35d6f5',
  moderate: '#f5c451',
  high: '#f56b6b',
}

function stationCollection(stations: StationSummary[], selectedId: string | null) {
  return {
    type: 'FeatureCollection' as const,
    features: stations.map((station) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [station.position[1], station.position[0]],
      },
      properties: {
        id: station.id,
        name: station.name,
        index: station.index ?? null,
        color: station.level ? LEVEL_COLOR[station.level] : '#a7b6d0',
        selected: station.id === selectedId,
        // Label hanya untuk stasiun koridor kalibrasi dan yang sedang dipilih,
        // supaya peta tidak penuh teks pada zoom rendah.
        label:
          station.calibrated || station.id === selectedId
            ? station.index === undefined
              ? station.name
              : `${station.name}  ${station.index}`
            : '',
      },
    })),
  }
}

function corridorLine(stations: StationSummary[]) {
  const corridor = stations.filter((station) => station.calibrated)
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: corridor.map((station) => [
        station.position[1],
        station.position[0],
      ]),
    },
    properties: {},
  }
}

type StationMapProps = {
  stations: StationSummary[]
  selectedStationId: string | null
  basemap: MapidStyle
  onReady: (map: MapLibreInstance) => void
  onSelectStation: (stationId: string) => void
}

function StationMap({
  stations,
  selectedStationId,
  basemap,
  onReady,
  onSelectStation,
}: StationMapProps) {
  const [map, setMap] = useState<MapLibreInstance | null>(null)

  // Data terbaru disimpan di ref supaya penggambaran ulang setelah basemap
  // berganti tidak memakai data basi dari closure lama.
  const dataRef = useRef({ stations, selectedStationId })
  const selectRef = useRef(onSelectStation)
  // Disinkronkan lewat effect, bukan ditulis saat render.
  useEffect(() => {
    dataRef.current = { stations, selectedStationId }
    selectRef.current = onSelectStation
  })

  // Handler klik cukup dipasang sekali; `draw` dipanggil lagi tiap basemap
  // berganti, dan MapLibre tidak menghapus listener saat style ditukar.
  const handlersBound = useRef(false)

  const draw = useCallback((instance: MapLibreInstance) => {
    const { stations: items, selectedStationId: selected } = dataRef.current

    if (!instance.getSource(CORRIDOR_SOURCE)) {
      instance.addSource(CORRIDOR_SOURCE, {
        type: 'geojson',
        data: corridorLine(items),
      })
    }
    if (!instance.getSource(STATION_SOURCE)) {
      instance.addSource(STATION_SOURCE, {
        type: 'geojson',
        data: stationCollection(items, selected),
      })
    }

    if (!instance.getLayer('corridor-line')) {
      instance.addLayer({
        id: 'corridor-line',
        type: 'line',
        source: CORRIDOR_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#a7b6d0',
          'line-width': 2,
          'line-opacity': 0.55,
          'line-dasharray': [2, 2],
        },
      })
    }

    if (!instance.getLayer('station-dots')) {
      instance.addLayer({
        id: 'station-dots',
        type: 'circle',
        source: STATION_SOURCE,
        paint: {
          'circle-radius': ['case', ['get', 'selected'], 9, 6],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['case', ['get', 'selected'], 1, 0.85],
          'circle-stroke-width': ['case', ['get', 'selected'], 3, 1.5],
          'circle-stroke-color': ['case', ['get', 'selected'], '#ffffff', '#0b1a2e'],
        },
      })
    }

    if (!instance.getLayer('station-labels')) {
      instance.addLayer({
        id: 'station-labels',
        type: 'symbol',
        source: STATION_SOURCE,
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Roboto Medium'],
          'text-size': 11,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#0b1a2e',
          'text-halo-width': 1.6,
        },
      })
    }

    if (!handlersBound.current) {
      instance.on('click', 'station-dots', (event) => {
        const id = event.features?.[0]?.properties?.id
        if (typeof id === 'string') selectRef.current(id)
      })
      instance.on('mouseenter', 'station-dots', () => {
        instance.getCanvas().style.cursor = 'pointer'
      })
      instance.on('mouseleave', 'station-dots', () => {
        instance.getCanvas().style.cursor = ''
      })
      handlersBound.current = true
    }
  }, [])

  // Data berubah (slot waktu diganti / stasiun lain dipilih).
  useEffect(() => {
    if (!map) return
    const source = map.getSource(STATION_SOURCE) as GeoJSONSource | undefined
    source?.setData(stationCollection(stations, selectedStationId))
    const corridor = map.getSource(CORRIDOR_SOURCE) as GeoJSONSource | undefined
    corridor?.setData(corridorLine(stations))
  }, [map, stations, selectedStationId])

  // Ikuti stasiun yang dipilih dari panel/daftar, bukan hanya dari klik peta.
  useEffect(() => {
    if (!map || !selectedStationId) return
    const station = stations.find((item) => item.id === selectedStationId)
    if (!station) return
    map.easeTo({
      center: [station.position[1], station.position[0]],
      duration: 600,
    })
  }, [map, selectedStationId, stations])

  return (
    <MapLibreMap
      basemap={basemap}
      zoom={12}
      className="size-full"
      onReady={(instance) => {
        setMap(instance)
        onReady(instance)
      }}
      onStyleReady={draw}
    />
  )
}

export default StationMap
