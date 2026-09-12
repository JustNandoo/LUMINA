import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeoJSONSource, Map as MapLibreInstance } from 'maplibre-gl'
import MapLibreMap from '../../../components/map/MapLibreMap'
import { bindTooltip, escapeHtml } from '../../../components/map/mapTooltip'
import { labelColors, markerStroke } from '../../../lib/mapidMap'
import type { MapidStyle } from '../../../lib/mapidMap'
import type { DensityCell, NetworkPayload, StationSummary } from '../../../lib/geoApi'

const STATION_SOURCE = 'lumina-stations'
const CORRIDOR_SOURCE = 'lumina-corridor'
const CELL_SOURCE = 'lumina-cells'
const NETWORK_SOURCE = 'lumina-network'

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
        line: station.line,
        reliabilityLabel:
          station.reliability === 'high'
            ? 'tinggi'
            : station.reliability === 'medium'
              ? 'sedang'
              : 'rendah',
        levelLabel:
          station.level === 'high'
            ? 'Padat'
            : station.level === 'moderate'
              ? 'Sedang'
              : station.level === 'low'
                ? 'Lengang'
                : '',
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

function cellCollection(cells: DensityCell[]) {
  return {
    type: 'FeatureCollection' as const,
    features: cells.map((cell) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [cell.position[1], cell.position[0]],
      },
      properties: { index: cell.index, reliability: cell.reliability },
    })),
  }
}

/** Garis tiap lin, dari urutan stasiun yang dikirim backend. */
function networkLines(
  network: NetworkPayload | null,
  stations: StationSummary[],
) {
  if (!network) return { type: 'FeatureCollection' as const, features: [] }
  const byId = new Map(stations.map((station) => [station.id, station]))

  return {
    type: 'FeatureCollection' as const,
    features: network.lines
      .map((line) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: line.stations
            .map((id) => byId.get(id))
            .filter((item): item is StationSummary => Boolean(item))
            .map((item) => [item.position[1], item.position[0]]),
        },
        properties: { line: line.name },
      }))
      .filter((feature) => feature.geometry.coordinates.length > 1),
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

export type MapLayers = {
  density: boolean
  network: boolean
  corridor: boolean
  stations: boolean
}

type StationMapProps = {
  stations: StationSummary[]
  cells: DensityCell[]
  network: NetworkPayload | null
  layers: MapLayers
  selectedStationId: string | null
  basemap: MapidStyle
  onReady: (map: MapLibreInstance) => void
  onSelectStation: (stationId: string) => void
}

function StationMap({
  stations,
  cells,
  network,
  layers,
  selectedStationId,
  basemap,
  onReady,
  onSelectStation,
}: StationMapProps) {
  const [map, setMap] = useState<MapLibreInstance | null>(null)

  // Data terbaru disimpan di ref supaya penggambaran ulang setelah basemap
  // berganti tidak memakai data basi dari closure lama.
  const dataRef = useRef({ stations, cells, network, selectedStationId, basemap })
  const selectRef = useRef(onSelectStation)
  // Disinkronkan lewat effect, bukan ditulis saat render.
  useEffect(() => {
    dataRef.current = { stations, cells, network, selectedStationId, basemap }
    selectRef.current = onSelectStation
  })

  // Handler klik cukup dipasang sekali; `draw` dipanggil lagi tiap basemap
  // berganti, dan MapLibre tidak menghapus listener saat style ditukar.
  const handlersBound = useRef(false)

  const draw = useCallback((instance: MapLibreInstance) => {
    const {
      stations: items,
      cells: cellItems,
      network: net,
      selectedStationId: selected,
      basemap: theme,
    } = dataRef.current
    const labels = labelColors(theme)
    const stroke = markerStroke(theme)

    if (!instance.getSource(CELL_SOURCE)) {
      instance.addSource(CELL_SOURCE, {
        type: 'geojson',
        data: cellCollection(cellItems),
      })
    }
    if (!instance.getSource(NETWORK_SOURCE)) {
      instance.addSource(NETWORK_SOURCE, {
        type: 'geojson',
        data: networkLines(net, items),
      })
    }
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

    // REQ-F2-01: heatmap indeks kepadatan per sel di atas basemap MAPID.
    // Bobotnya indeks itu sendiri, jadi gradasinya mewakili kepadatan — bukan
    // sekadar berapa banyak sel yang menumpuk di satu tempat.
    if (!instance.getLayer('density-heat')) {
      instance.addLayer({
        id: 'density-heat',
        type: 'heatmap',
        source: CELL_SOURCE,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'index'], 0, 0, 100, 1],
          'heatmap-intensity': 1,
          'heatmap-radius': 34,
          'heatmap-opacity': 0.6,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(53,214,245,0)',
            0.3, 'rgba(53,214,245,0.5)',
            0.6, 'rgba(245,196,81,0.65)',
            1, 'rgba(245,107,107,0.8)',
          ],
        },
      })
    }

    // REQ-F4-01: jaringan lin sebagai layer konteks.
    if (!instance.getLayer('network-lines')) {
      instance.addLayer({
        id: 'network-lines',
        type: 'line',
        source: NETWORK_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#5b6b87', 'line-width': 2.5, 'line-opacity': 0.65 },
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
          'circle-stroke-color': stroke,
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
          'text-color': labels.text,
          'text-halo-color': labels.halo,
          'text-halo-width': 1.6,
        },
      })
    } else {
      instance.setPaintProperty('station-labels', 'text-color', labels.text)
      instance.setPaintProperty('station-labels', 'text-halo-color', labels.halo)
      instance.setPaintProperty('station-dots', 'circle-stroke-color', stroke)
    }

    // Titik stasiun digambar 6px; mengarahkan kursor setepat itu menyulitkan.
    // Lapisan tak terlihat ini yang menangkap hover dan klik.
    if (!instance.getLayer('station-hit')) {
      instance.addLayer({
        id: 'station-hit',
        type: 'circle',
        source: STATION_SOURCE,
        paint: { 'circle-radius': 14, 'circle-opacity': 0 },
      })
    }

    if (!handlersBound.current) {
      instance.on('click', 'station-hit', (event) => {
        const id = event.features?.[0]?.properties?.id
        if (typeof id === 'string') selectRef.current(id)
      })
      bindTooltip(instance, 'station-hit', (props) => {
        const index = props?.index
        const crowd =
          index === null || index === undefined
            ? ''
            : `<div>Kepadatan <strong>${escapeHtml(index)}</strong>/100 · ${escapeHtml(props?.levelLabel)}</div>`
        return [
          `<div class="tooltip-title">${escapeHtml(props?.name)}</div>`,
          `<div class="tooltip-meta">Lin ${escapeHtml(props?.line)}</div>`,
          crowd,
          `<div class="tooltip-meta">Keterandalan ${escapeHtml(props?.reliabilityLabel)}</div>`,
        ].join('')
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
    const cellSource = map.getSource(CELL_SOURCE) as GeoJSONSource | undefined
    cellSource?.setData(cellCollection(cells))
    const networkSource = map.getSource(NETWORK_SOURCE) as GeoJSONSource | undefined
    networkSource?.setData(networkLines(network, stations))
  }, [map, stations, selectedStationId, cells, network])

  // Nyala-matikan layer dari panel di peta.
  useEffect(() => {
    if (!map) return
    const mapping: [string, boolean][] = [
      ['density-heat', layers.density],
      ['network-lines', layers.network],
      ['corridor-line', layers.corridor],
      ['station-dots', layers.stations],
      ['station-labels', layers.stations],
      ['station-hit', layers.stations],
    ]
    for (const [id, visible] of mapping) {
      if (!map.getLayer(id)) continue
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
    }
  }, [map, layers])

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
