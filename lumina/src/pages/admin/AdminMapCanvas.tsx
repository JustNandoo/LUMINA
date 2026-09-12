import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeoJSONSource, Map as MapLibreInstance } from 'maplibre-gl'
import MapLibreMap from '../../components/map/MapLibreMap'
import { bindTooltip, escapeHtml } from '../../components/map/mapTooltip'
import { labelColors, markerStroke } from '../../lib/mapidMap'
import type { MapidStyle } from '../../lib/mapidMap'
import type { AdminMapPoint } from '../../lib/adminApi'
import type { HeatPoint } from '../../lib/businessApi'

const POINT_SOURCE = 'admin-points'
const HEAT_SOURCE = 'admin-heat'
const SURVEY_SOURCE = 'admin-survey'
const ROUTE_SOURCE = 'admin-route'

export type LayerVisibility = Record<string, boolean>

function pointCollection(points: AdminMapPoint[], selectedId: string | null) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((point) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [point.position[1], point.position[0]],
      },
      properties: {
        id: point.id,
        name: point.name,
        published: point.published,
        selected: point.id === selectedId,
      },
    })),
  }
}

function heatCollection(points: HeatPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((point) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [point.position[1], point.position[0]],
      },
      properties: { score: point.score },
    })),
  }
}

function surveyCollection(sites: { id: string; position: [number, number] }[]) {
  return {
    type: 'FeatureCollection' as const,
    features: sites.map((site) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [site.position[1], site.position[0]],
      },
      properties: { id: site.id },
    })),
  }
}

function routeLine(points: AdminMapPoint[]) {
  const published = points.filter((point) => point.published)
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: published.map((point) => [point.position[1], point.position[0]]),
    },
    properties: {},
  }
}

type AdminMapCanvasProps = {
  points: AdminMapPoint[]
  heatSource: HeatPoint[]
  surveySites: { id: string; position: [number, number] }[]
  selected: AdminMapPoint | null
  visibility: LayerVisibility
  basemap: MapidStyle
  onReady: (map: MapLibreInstance) => void
  onSelect: (point: AdminMapPoint) => void
}

function AdminMapCanvas({
  points,
  heatSource,
  surveySites,
  selected,
  visibility,
  basemap,
  onReady,
  onSelect,
}: AdminMapCanvasProps) {
  const [map, setMap] = useState<MapLibreInstance | null>(null)

  const dataRef = useRef({ points, heatSource, surveySites, selected, basemap })
  const selectRef = useRef(onSelect)
  // Disinkronkan lewat effect, bukan ditulis saat render.
  useEffect(() => {
    dataRef.current = { points, heatSource, surveySites, selected, basemap }
    selectRef.current = onSelect
  })

  const handlersBound = useRef(false)

  const draw = useCallback((instance: MapLibreInstance) => {
    const current = dataRef.current
    const labels = labelColors(current.basemap)
    const stroke = markerStroke(current.basemap)

    const sources: [string, object][] = [
      [HEAT_SOURCE, heatCollection(current.heatSource)],
      [ROUTE_SOURCE, routeLine(current.points)],
      [SURVEY_SOURCE, surveyCollection(current.surveySites)],
      [POINT_SOURCE, pointCollection(current.points, current.selected?.id ?? null)],
    ]
    for (const [id, data] of sources) {
      if (!instance.getSource(id)) {
        instance.addSource(id, { type: 'geojson', data: data as never })
      }
    }

    if (!instance.getLayer('admin-heat-layer')) {
      instance.addLayer({
        id: 'admin-heat-layer',
        type: 'heatmap',
        source: HEAT_SOURCE,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'score'], 0, 0, 100, 1],
          'heatmap-radius': 48,
          'heatmap-opacity': 0.5,
        },
      })
    }

    if (!instance.getLayer('admin-route-layer')) {
      instance.addLayer({
        id: 'admin-route-layer',
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#a7b6d0',
          'line-width': 2,
          'line-opacity': 0.6,
          'line-dasharray': [2, 2],
        },
      })
    }

    if (!instance.getLayer('admin-survey-layer')) {
      instance.addLayer({
        id: 'admin-survey-layer',
        type: 'circle',
        source: SURVEY_SOURCE,
        paint: {
          'circle-radius': 7,
          'circle-color': 'rgba(255,237,213,0.35)',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffedd5',
        },
      })
    }

    if (!instance.getLayer('admin-point-layer')) {
      instance.addLayer({
        id: 'admin-point-layer',
        type: 'circle',
        source: POINT_SOURCE,
        paint: {
          'circle-radius': ['case', ['get', 'selected'], 9, 5.5],
          // Titik yang belum terbit sengaja dibedakan warnanya, karena itulah
          // keputusan yang sedang dikelola admin di halaman ini.
          'circle-color': [
            'case',
            ['get', 'selected'], '#ffffff',
            ['get', 'published'], '#35d6f5',
            '#8b9bb4',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': stroke,
        },
      })
    }

    if (!instance.getLayer('admin-point-labels')) {
      instance.addLayer({
        id: 'admin-point-labels',
        type: 'symbol',
        source: POINT_SOURCE,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Roboto Medium'],
          'text-size': 10,
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': labels.text,
          'text-halo-color': labels.halo,
          'text-halo-width': 1.5,
        },
      })
    } else {
      instance.setPaintProperty('admin-point-labels', 'text-color', labels.text)
      instance.setPaintProperty('admin-point-labels', 'text-halo-color', labels.halo)
      instance.setPaintProperty('admin-point-layer', 'circle-stroke-color', stroke)
    }

    if (!instance.getLayer('admin-point-hit')) {
      instance.addLayer({
        id: 'admin-point-hit',
        type: 'circle',
        source: POINT_SOURCE,
        paint: { 'circle-radius': 14, 'circle-opacity': 0 },
      })
    }

    if (!handlersBound.current) {
      instance.on('click', 'admin-point-hit', (event) => {
        const id = event.features?.[0]?.properties?.id
        const point = dataRef.current.points.find((item) => item.id === id)
        if (point) selectRef.current(point)
      })
      bindTooltip(instance, 'admin-point-hit', (props) =>
        [
          `<div class="tooltip-title">${escapeHtml(props?.name)}</div>`,
          `<div class="tooltip-meta">${props?.published ? 'Terbit ke pengguna' : 'Belum terbit'}</div>`,
        ].join(''),
      )
      handlersBound.current = true
    }
  }, [])

  // Perbarui data tiap sumbernya berubah.
  useEffect(() => {
    if (!map) return
    const update = (id: string, data: object) => {
      const source = map.getSource(id) as GeoJSONSource | undefined
      source?.setData(data as never)
    }
    update(POINT_SOURCE, pointCollection(points, selected?.id ?? null))
    update(HEAT_SOURCE, heatCollection(heatSource))
    update(SURVEY_SOURCE, surveyCollection(surveySites))
    update(ROUTE_SOURCE, routeLine(points))
  }, [map, points, heatSource, surveySites, selected])

  // Layer dinyalakan/dimatikan dari panel kelola di sebelah kiri.
  // Jangan dijaga dengan isStyleLoaded(): style MAPID merujuk sprite di host
  // eksternal sehingga nilainya bisa lama sekali false. Keberadaan tiap layer
  // dicek satu per satu di dalam perulangan, dan itu sudah cukup.
  useEffect(() => {
    if (!map) return
    const mapping: [string, string][] = [
      ['admin-heat-layer', 'heatmap'],
      ['admin-route-layer', 'routes'],
      ['admin-survey-layer', 'survey'],
      ['admin-point-layer', 'stations'],
      ['admin-point-hit', 'stations'],
      ['admin-point-labels', 'stations'],
    ]
    for (const [layerId, key] of mapping) {
      if (!map.getLayer(layerId)) continue
      map.setLayoutProperty(
        layerId,
        'visibility',
        visibility[key] ? 'visible' : 'none',
      )
    }
  }, [map, visibility])

  useEffect(() => {
    if (!map || !selected) return
    map.flyTo({
      center: [selected.position[1], selected.position[0]],
      zoom: 14,
      duration: 700,
    })
  }, [map, selected])

  return (
    <MapLibreMap
      basemap={basemap}
      zoom={10.5}
      className="size-full"
      onReady={(instance) => {
        setMap(instance)
        onReady(instance)
      }}
      onStyleReady={draw}
    />
  )
}

export default AdminMapCanvas
