import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeoJSONSource, Map as MapLibreInstance } from 'maplibre-gl'
import MapControls from '../../../components/map/MapControls'
import MapLibreMap from '../../../components/map/MapLibreMap'
import { bindTooltip, escapeHtml } from '../../../components/map/mapTooltip'
import { markerStroke, routeColor } from '../../../lib/mapidMap'
import type { MapidStyle } from '../../../lib/mapidMap'
import type { ActiveTrip } from '../../../lib/activeTrip'

const DONE_SOURCE = 'trip-done'
const REMAINING_SOURCE = 'trip-remaining'
const STOP_SOURCE = 'trip-stops'

function lineFeature(coordinates: [number, number][]) {
  return {
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates },
    properties: {},
  }
}

function buildSources(trip: ActiveTrip) {
  const coords = trip.plan.geometry.coordinates
  const cut = Math.min(trip.progressIndex, coords.length - 1)

  // Ruas yang sudah dilewati digambar terpisah supaya progres terlihat di peta,
  // bukan cuma di daftar stasiun.
  const done = coords.slice(0, cut + 1)
  const remaining = coords.slice(cut)

  const stopsByStation = new Map<string, number>()
  for (const stop of trip.stops) {
    stopsByStation.set(stop.stationId, (stopsByStation.get(stop.stationId) ?? 0) + 1)
  }

  const transferIds = new Set(trip.plan.transfers.map((item) => item.station_id))
  const lastIndex = trip.plan.path.length - 1

  const stops = {
    type: 'FeatureCollection' as const,
    features: trip.plan.path.map((station, index) => {
      const role =
        index === 0
          ? 'origin'
          : index === lastIndex
            ? 'destination'
            : transferIds.has(station.id)
              ? 'transfer'
              : 'stop'
      const singgah = stopsByStation.get(station.id) ?? 0

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [station.position[1], station.position[0]],
        },
        properties: {
          name: station.name,
          role,
          passed: index <= trip.progressIndex,
          current: index === trip.progressIndex,
          singgah,
          roleLabel:
            role === 'origin'
              ? 'Stasiun keberangkatan'
              : role === 'destination'
                ? 'Stasiun tujuan'
                : role === 'transfer'
                  ? 'Titik transit'
                  : 'Stasiun yang dilewati',
          statusLabel:
            index < trip.progressIndex
              ? 'Sudah dilewati'
              : index === trip.progressIndex
                ? 'Posisi sekarang'
                : 'Belum dilewati',
        },
      }
    }),
  }

  return {
    done: lineFeature(done.length > 1 ? (done as [number, number][]) : []),
    remaining: lineFeature(remaining as [number, number][]),
    stops,
  }
}

type TripMapProps = {
  trip: ActiveTrip
  className?: string
}

function TripMap({ trip, className = '' }: TripMapProps) {
  const [map, setMap] = useState<MapLibreInstance | null>(null)
  const [basemap, setBasemap] = useState<MapidStyle>('light')

  const tripRef = useRef(trip)
  const themeRef = useRef(basemap)
  useEffect(() => {
    tripRef.current = trip
    themeRef.current = basemap
  })

  const draw = useCallback((instance: MapLibreInstance) => {
    const data = buildSources(tripRef.current)
    const theme = themeRef.current
    const active = routeColor(theme)
    const stroke = markerStroke(theme)

    const add = (id: string, value: object) => {
      if (!instance.getSource(id)) {
        instance.addSource(id, { type: 'geojson', data: value as never })
      }
    }
    add(REMAINING_SOURCE, data.remaining)
    add(DONE_SOURCE, data.done)
    add(STOP_SOURCE, data.stops)

    if (!instance.getLayer('trip-remaining-line')) {
      instance.addLayer({
        id: 'trip-remaining-line',
        type: 'line',
        source: REMAINING_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#8b9bb4', 'line-width': 4, 'line-dasharray': [1.5, 1.5] },
      })
    }

    if (!instance.getLayer('trip-done-line')) {
      instance.addLayer({
        id: 'trip-done-line',
        type: 'line',
        source: DONE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': active, 'line-width': 5 },
      })
    } else {
      instance.setPaintProperty('trip-done-line', 'line-color', active)
    }

    if (!instance.getLayer('trip-stop-dots')) {
      instance.addLayer({
        id: 'trip-stop-dots',
        type: 'circle',
        source: STOP_SOURCE,
        paint: {
          'circle-radius': [
            'case',
            ['get', 'current'], 9,
            ['match', ['get', 'role'], 'origin', 7, 'destination', 7, 'transfer', 6, 4],
          ],
          'circle-color': [
            'case',
            ['get', 'current'], '#ffffff',
            ['get', 'passed'], active,
            ['match', ['get', 'role'], 'destination', '#f56b6b', 'transfer', '#f5c451', '#8b9bb4'],
          ],
          'circle-stroke-width': ['case', ['get', 'current'], 4, 2],
          'circle-stroke-color': ['case', ['get', 'current'], active, stroke],
        },
      })
    } else {
      instance.setPaintProperty('trip-stop-dots', 'circle-stroke-color', [
        'case',
        ['get', 'current'],
        active,
        stroke,
      ])
    }

    // Penanda kecil untuk stasiun yang punya singgahan.
    if (!instance.getLayer('trip-stop-badge')) {
      instance.addLayer({
        id: 'trip-stop-badge',
        type: 'symbol',
        source: STOP_SOURCE,
        filter: ['>', ['get', 'singgah'], 0],
        layout: {
          'text-field': ['concat', '🛍 ', ['get', 'singgah']],
          'text-font': ['Roboto Medium'],
          'text-size': 11,
          'text-offset': [0, -1.5],
          'text-anchor': 'bottom',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#0b1a2e',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
      })
    }

    if (!instance.getLayer('trip-stop-hit')) {
      instance.addLayer({
        id: 'trip-stop-hit',
        type: 'circle',
        source: STOP_SOURCE,
        paint: { 'circle-radius': 14, 'circle-opacity': 0 },
      })
      bindTooltip(instance, 'trip-stop-hit', (props) =>
        [
          `<div class="tooltip-title">${escapeHtml(props?.name)}</div>`,
          `<div class="tooltip-meta">${escapeHtml(props?.roleLabel)} · ${escapeHtml(props?.statusLabel)}</div>`,
          Number(props?.singgah) > 0
            ? `<div>${escapeHtml(props?.singgah)} singgahan di sini</div>`
            : '',
        ].join(''),
      )
    }
  }, [])

  // Perbarui data saat progres, singgahan, atau rutenya berubah.
  useEffect(() => {
    if (!map) return
    const data = buildSources(trip)
    const set = (id: string, value: object) => {
      const source = map.getSource(id) as GeoJSONSource | undefined
      source?.setData(value as never)
    }
    set(REMAINING_SOURCE, data.remaining)
    set(DONE_SOURCE, data.done)
    set(STOP_SOURCE, data.stops)
  }, [map, trip])

  // Ikuti posisi sekarang supaya peta tidak perlu digeser manual.
  useEffect(() => {
    if (!map) return
    const station = trip.plan.path[trip.progressIndex]
    if (!station) return
    map.easeTo({
      center: [station.position[1], station.position[0]],
      zoom: Math.max(map.getZoom(), 12),
      duration: 800,
    })
  }, [map, trip.progressIndex, trip.plan.path])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <MapLibreMap
        basemap={basemap}
        zoom={12}
        className="size-full"
        onReady={setMap}
        onStyleReady={draw}
      />
      <div className="absolute right-3 bottom-3 z-10">
        <MapControls map={map} basemap={basemap} onBasemapChange={setBasemap} />
      </div>
    </div>
  )
}

export default TripMap
