import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeoJSONSource, Map as MapLibreInstance } from 'maplibre-gl'
import MapLibreMap from '../../../components/map/MapLibreMap'
import { bindTooltip, escapeHtml } from '../../../components/map/mapTooltip'
import { labelColors, markerStroke } from '../../../lib/mapidMap'
import type { MapidStyle } from '../../../lib/mapidMap'
import type { HeatPoint } from '../../../lib/businessApi'

const AREA_SOURCE = 'lumina-areas'

function areaCollection(points: HeatPoint[], selectedId: string | null) {
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
        score: point.score,
        risk: point.risk_index,
        reliabilityLabel:
          point.reliability === 'high'
            ? 'tinggi'
            : point.reliability === 'medium'
              ? 'sedang'
              : 'rendah',
        selected: point.id === selectedId,
        label: `${point.name}  ${point.score}`,
      },
    })),
  }
}

type MapCanvasProps = {
  points: HeatPoint[]
  basemap: MapidStyle
  selectedAreaId: string | null
  onReady: (map: MapLibreInstance) => void
  onSelectArea: (areaId: string) => void
}

function MapCanvas({
  points,
  basemap,
  selectedAreaId,
  onReady,
  onSelectArea,
}: MapCanvasProps) {
  const [map, setMap] = useState<MapLibreInstance | null>(null)

  const dataRef = useRef({ points, selectedAreaId, basemap })
  const selectRef = useRef(onSelectArea)
  // Disinkronkan lewat effect, bukan ditulis saat render.
  useEffect(() => {
    dataRef.current = { points, selectedAreaId, basemap }
    selectRef.current = onSelectArea
  })

  const handlersBound = useRef(false)

  const draw = useCallback((instance: MapLibreInstance) => {
    const { points: items, selectedAreaId: selected, basemap: theme } = dataRef.current
    const labels = labelColors(theme)
    const stroke = markerStroke(theme)

    if (!instance.getSource(AREA_SOURCE)) {
      instance.addSource(AREA_SOURCE, {
        type: 'geojson',
        data: areaCollection(items, selected),
      })
    }

    // Heatmap memakai layer bawaan MapLibre, bukan plugin raster: bobotnya
    // langsung dari skor potensi, jadi gradasinya benar-benar mewakili indeks
    // dan bukan sekadar kerapatan titik.
    if (!instance.getLayer('area-heat')) {
      instance.addLayer({
        id: 'area-heat',
        type: 'heatmap',
        source: AREA_SOURCE,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'score'], 0, 0, 100, 1],
          'heatmap-intensity': 1.1,
          'heatmap-radius': 52,
          'heatmap-opacity': 0.55,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(30,64,175,0)',
            0.25, 'rgba(30,64,175,0.55)',
            0.5, 'rgba(93,230,255,0.7)',
            0.75, 'rgba(255,237,213,0.8)',
            1, 'rgba(255,107,74,0.9)',
          ],
        },
      })
    }

    if (!instance.getLayer('area-dots')) {
      instance.addLayer({
        id: 'area-dots',
        type: 'circle',
        source: AREA_SOURCE,
        paint: {
          'circle-radius': ['case', ['get', 'selected'], 11, 7],
          'circle-color': ['case', ['get', 'selected'], '#0a7ea4', '#35d6f5'],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': stroke,
        },
      })
    }

    if (!instance.getLayer('area-labels')) {
      instance.addLayer({
        id: 'area-labels',
        type: 'symbol',
        source: AREA_SOURCE,
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Roboto Medium'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': labels.text,
          'text-halo-color': labels.halo,
          'text-halo-width': 1.6,
        },
      })
    } else {
      instance.setPaintProperty('area-labels', 'text-color', labels.text)
      instance.setPaintProperty('area-labels', 'text-halo-color', labels.halo)
      instance.setPaintProperty('area-dots', 'circle-stroke-color', stroke)
    }

    if (!instance.getLayer('area-hit')) {
      instance.addLayer({
        id: 'area-hit',
        type: 'circle',
        source: AREA_SOURCE,
        paint: { 'circle-radius': 16, 'circle-opacity': 0 },
      })
    }

    if (!handlersBound.current) {
      instance.on('click', 'area-hit', (event) => {
        const id = event.features?.[0]?.properties?.id
        if (typeof id === 'string') selectRef.current(id)
      })
      bindTooltip(instance, 'area-hit', (props) =>
        [
          `<div class="tooltip-title">${escapeHtml(props?.name)}</div>`,
          `<div>Potensi <strong>${escapeHtml(props?.score)}</strong>/100</div>`,
          `<div class="tooltip-meta">Risiko ${escapeHtml(props?.risk)}/100 · keterandalan ${escapeHtml(props?.reliabilityLabel)}</div>`,
        ].join(''),
      )
      handlersBound.current = true
    }
  }, [])

  useEffect(() => {
    if (!map) return
    const source = map.getSource(AREA_SOURCE) as GeoJSONSource | undefined
    source?.setData(areaCollection(points, selectedAreaId))
  }, [map, points, selectedAreaId])

  useEffect(() => {
    if (!map || !selectedAreaId) return
    const area = points.find((item) => item.id === selectedAreaId)
    if (!area) return
    map.easeTo({ center: [area.position[1], area.position[0]], duration: 600 })
  }, [map, selectedAreaId, points])

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

export default MapCanvas
