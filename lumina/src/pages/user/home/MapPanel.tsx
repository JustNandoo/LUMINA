import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Lightbulb, X } from 'lucide-react'
import type { Map as MapLibreInstance, GeoJSONSource } from 'maplibre-gl'
import MapControls from '../../../components/map/MapControls'
import MapLibreMap from '../../../components/map/MapLibreMap'
import { bindTooltip, escapeHtml } from '../../../components/map/mapTooltip'
import { markerStroke, routeColor } from '../../../lib/mapidMap'
import type { MapidStyle } from '../../../lib/mapidMap'
import type { TripPlan } from '../../../lib/tripsApi'

const ROUTE_SOURCE = 'lumina-route'
const STOP_SOURCE = 'lumina-route-stops'

type MapPanelProps = {
  plan: TripPlan
  suggestionText: string | null
  /** true bila slot yang disarankan sudah menjadi pilihan saat ini. */
  suggestionInUse: boolean
  onUseSuggestion: () => void
}

/** Titik-titik stasiun sepanjang lintasan, ditandai perannya masing-masing. */
function stopFeatures(plan: TripPlan) {
  const transferIds = new Set(plan.transfers.map((item) => item.station_id))
  const lastIndex = plan.path.length - 1

  // Lin yang dipakai untuk tiba di tiap stasiun, supaya tooltip bisa
  // menyebutkan lin-nya dan bukan hanya nama stasiun.
  const lineOf = new Map<string, string>()
  for (const segment of plan.segments) {
    for (const station of segment.stations) lineOf.set(station.id, segment.line)
  }

  return plan.path.map((station, index) => {
    const role =
      index === 0
        ? 'origin'
        : index === lastIndex
          ? 'destination'
          : transferIds.has(station.id)
            ? 'transfer'
            : 'stop'

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [station.position[1], station.position[0]],
      },
      properties: {
        name: station.name,
        role,
        line: lineOf.get(station.id) ?? '',
        order: index,
        total: lastIndex,
        roleLabel:
          role === 'origin'
            ? 'Stasiun keberangkatan'
            : role === 'destination'
              ? 'Stasiun tujuan'
              : role === 'transfer'
                ? 'Titik transit — ganti lin di sini'
                : 'Dilewati tanpa berhenti pindah lin',
      },
    }
  })
}

function MapPanel({ plan, suggestionText, suggestionInUse, onUseSuggestion }: MapPanelProps) {
  // Banner saran menutupi sebagian peta, jadi bisa ditutup. Penutupan diingat
  // per rute: mengganti asal atau tujuan memunculkan saran untuk rute baru.
  const routeKey = `${plan.origin.id}->${plan.destination.id}`
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)
  const showSuggestion = Boolean(suggestionText) && dismissedKey !== routeKey
  const [map, setMap] = useState<MapLibreInstance | null>(null)
  const [basemap, setBasemap] = useState<MapidStyle>('light')
  // Disinkronkan lewat effect, bukan ditulis saat render: menulis ref
  // selama render membuat hasilnya tidak bisa diandalkan pada mode konkuren.
  const planRef = useRef(plan)
  useEffect(() => {
    planRef.current = plan
  })

  /** Gambar lintasan. Dipanggil ulang tiap basemap berganti (style reset). */
  const drawRoute = useCallback(
    (instance: MapLibreInstance) => {
      const current = planRef.current
      const line = {
        type: 'Feature' as const,
        geometry: current.geometry,
        properties: {},
      }
      const stops = {
        type: 'FeatureCollection' as const,
        features: stopFeatures(current),
      }

      if (!instance.getSource(ROUTE_SOURCE)) {
        instance.addSource(ROUTE_SOURCE, { type: 'geojson', data: line })
      }
      if (!instance.getSource(STOP_SOURCE)) {
        instance.addSource(STOP_SOURCE, { type: 'geojson', data: stops })
      }

      const color = routeColor(basemap)
      const stroke = markerStroke(basemap)

      if (!instance.getLayer('route-casing')) {
        instance.addLayer({
          id: 'route-casing',
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': stroke,
            'line-width': 8,
            'line-opacity': 0.85,
          },
        })
      }
      if (!instance.getLayer('route-line')) {
        instance.addLayer({
          id: 'route-line',
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': color, 'line-width': 4 },
        })
      } else {
        instance.setPaintProperty('route-line', 'line-color', color)
      }

      // Stasiun antara digambar kecil; asal, tujuan, dan titik transit
      // dibesarkan supaya terbaca tanpa perlu label.
      if (!instance.getLayer('route-stops')) {
        instance.addLayer({
          id: 'route-stops',
          type: 'circle',
          source: STOP_SOURCE,
          paint: {
            'circle-radius': [
              'match',
              ['get', 'role'],
              'origin', 7,
              'destination', 7,
              'transfer', 5.5,
              3.5,
            ],
            'circle-color': [
              'match',
              ['get', 'role'],
              'origin', '#35d6f5',
              'destination', '#f56b6b',
              'transfer', '#f5c451',
              '#ffffff',
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': stroke,
          },
        })
      } else {
        instance.setPaintProperty('route-stops', 'circle-stroke-color', stroke)
        instance.setPaintProperty('route-casing', 'line-color', stroke)
      }

      // Lapisan tak terlihat dengan radius lebih besar: titik stasiun antara
      // digambar kecil, dan mengarahkan kursor tepat ke lingkaran 3,5px itu
      // hampir mustahil.
      if (!instance.getLayer('route-stops-hit')) {
        instance.addLayer({
          id: 'route-stops-hit',
          type: 'circle',
          source: STOP_SOURCE,
          paint: { 'circle-radius': 12, 'circle-opacity': 0 },
        })
        bindTooltip(instance, 'route-stops-hit', (props) =>
          [
            `<div class="tooltip-title">${escapeHtml(props?.name)}</div>`,
            `<div class="tooltip-meta">${escapeHtml(props?.roleLabel)}</div>`,
            props?.line
              ? `<div class="tooltip-meta">Lin ${escapeHtml(props?.line)} · perhentian ke-${escapeHtml(props?.order)} dari ${escapeHtml(props?.total)}</div>`
              : '',
          ].join(''),
        )
      }
    },
    [basemap],
  )

  // Rute berganti (asal/tujuan diubah): perbarui data sumber, lalu bingkai ulang.
  useEffect(() => {
    if (!map) return

    const routeSource = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined
    const stopSource = map.getSource(STOP_SOURCE) as GeoJSONSource | undefined
    if (routeSource) {
      routeSource.setData({
        type: 'Feature',
        geometry: plan.geometry,
        properties: {},
      })
    }
    if (stopSource) {
      stopSource.setData({
        type: 'FeatureCollection',
        features: stopFeatures(plan),
      })
    }

    const coordinates = plan.geometry.coordinates
    if (coordinates.length < 2) return

    const lngs = coordinates.map((item) => item[0])
    const lats = coordinates.map((item) => item[1])
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: { top: 90, bottom: 50, left: 50, right: 50 }, duration: 600 },
    )
  }, [map, plan])

  return (
    <div className="overflow-hidden rounded-[14px] border border-navy-700/50 bg-navy-950">
      <div className="relative h-[220px] sm:h-[260px]">
        <MapLibreMap
          basemap={basemap}
          zoom={11}
          className="size-full"
          onReady={setMap}
          onStyleReady={drawRoute}
        />

        {showSuggestion && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start gap-3 rounded-[12px] border border-white/10 bg-navy-950/85 py-3 pr-11 pl-4 backdrop-blur-md sm:inset-x-4 sm:top-4 sm:gap-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-cyan/15">
              <Lightbulb className="size-4 text-brand-cyan" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug text-white sm:text-[14px]">
                {suggestionText}
              </p>
              {/* Tanpa penanda ini, menekan "Pakai slot ini" pada slot yang sudah
                  terpilih terlihat seperti tombol yang tidak berfungsi. */}
              {suggestionInUse ? (
                <span className="mt-1.5 flex items-center gap-1.5 text-[13px] text-brand-cyan">
                  <Check className="size-3.5" strokeWidth={2.2} />
                  Slot ini sedang dipakai
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onUseSuggestion}
                  className="pointer-events-auto mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-brand-cyan transition-colors hover:text-white"
                >
                  Pakai slot ini
                  <ArrowRight className="size-3.5" strokeWidth={1.8} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDismissedKey(routeKey)}
              aria-label="Tutup saran slot"
              className="pointer-events-auto absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full text-mist-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          </div>
        )}

        <div className="absolute right-3 bottom-3 z-10">
          <MapControls map={map} basemap={basemap} onBasemapChange={setBasemap} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-navy-700/40 px-5 py-[14px]">
        <span className="flex items-center gap-2.5 text-[14px] text-white">
          <span className="size-2.5 rounded-full bg-brand-cyan" />
          {plan.origin.name}
          <span className="text-mist-400">→</span>
          <span className="size-2.5 rounded-full bg-danger" />
          {plan.destination.name}
        </span>
        <span className="text-[13px] text-mist-400">
          {plan.stop_count} perhentian
          {plan.transfer_count > 0 && ` · ${plan.transfer_count}x transit`}
        </span>
      </div>
    </div>
  )
}

export default MapPanel
