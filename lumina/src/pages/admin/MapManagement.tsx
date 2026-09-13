import { useState } from 'react'
import { Eye, EyeOff, LocateFixed, Minus, Plus, RefreshCw } from 'lucide-react'
import type { Map as MapLibreInstance } from 'maplibre-gl'
import type { ReactNode } from 'react'
import TopBar from '../../components/layout/TopBar'
import AdminMapCanvas from './AdminMapCanvas'
import AdminStatus from './AdminStatus'
import { useApi, errorMessage } from '../../hooks/useApi'
import {
  fetchMapLayers,
  fetchMapPoints,
  fetchSurveyPoints,
  syncStations,
  updateMapLayer,
  updateMapPoint,
} from '../../lib/adminApi'
import { fetchHeatmap } from '../../lib/businessApi'
import { MAPID_STYLES, MAPID_STYLE_ORDER } from '../../lib/mapidMap'
import type { AdminMapLayer, AdminMapPoint } from '../../lib/adminApi'
import type { MapidStyle } from '../../lib/mapidMap'

const Label = ({ children }: { children: ReactNode }) => (
  <p className="text-[10px] tracking-[0.18em] text-mist-400 uppercase">{children}</p>
)

const statusStyle: Record<string, string> = {
  publik: 'text-brand-cyan',
  draf: 'text-warning-soft',
  internal: 'text-mist-400',
}

function MapManagement() {
  const [map, setMap] = useState<MapLibreInstance | null>(null)
  const [basemap, setBasemap] = useState<MapidStyle>('light')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Draf nama dipasangkan dengan id titiknya. Begitu titik lain dipilih,
  // pasangannya tidak cocok lagi dan nilainya jatuh ke nama asli — tanpa
  // effect yang menyetel ulang state.
  const [nameDraft, setNameDraft] = useState<{ id: string; value: string } | null>(
    null,
  )
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const pointsApi = useApi(() => fetchMapPoints(), [])
  const layersApi = useApi(() => fetchMapLayers(), [])
  const heatmap = useApi(() => fetchHeatmap(), [])
  const survey = useApi(() => fetchSurveyPoints({ status: 'valid' }), [])

  const points = pointsApi.data?.items ?? []
  const layers = layersApi.data ?? []
  const selected = points.find((point) => point.id === selectedId) ?? null

  // Nama titik diedit lokal lalu disimpan sekali saat blur — mengirim PATCH
  // tiap ketikan akan membanjiri server dan membuat kursor melompat saat
  // respons datang.
  const draftName =
    nameDraft && nameDraft.id === selectedId ? nameDraft.value : (selected?.name ?? '')

  const visibility = Object.fromEntries(
    layers.map((layer) => [layer.id, layer.visible]),
  )

  const surveySites = (survey.data?.items ?? [])
    .filter((point): point is typeof point & { position: [number, number] } =>
      Array.isArray(point.position),
    )
    .map((point) => ({ id: point.id, position: point.position }))

  const runAction = async (action: () => Promise<unknown>, reload: () => void) => {
    setActionError(null)
    try {
      await action()
      reload()
    } catch (caught) {
      setActionError(errorMessage(caught))
    }
  }

  const toggleLayer = (layer: AdminMapLayer) =>
    runAction(
      () => updateMapLayer(layer.id, { visible: !layer.visible }),
      layersApi.reload,
    )

  const setLayerStatus = (layer: AdminMapLayer, status: string) =>
    runAction(() => updateMapLayer(layer.id, { status }), layersApi.reload)

  const togglePublished = (point: AdminMapPoint) =>
    runAction(
      () => updateMapPoint(point.id, { published: !point.published }),
      pointsApi.reload,
    )

  const saveName = async () => {
    if (!selected || !draftName.trim() || draftName.trim() === selected.name) return
    setSaving(true)
    await runAction(
      () => updateMapPoint(selected.id, { name: draftName.trim() }),
      pointsApi.reload,
    )
    setSaving(false)
  }

  const published = points.filter((point) => point.published).length
  const fieldClass =
    'mt-1.5 h-9 w-full border border-navy-700 bg-navy-950/60 px-3 font-mono text-[12px] text-white focus:border-mist-400 focus:outline-none'

  return (
    <div className="flex min-h-svh flex-col px-4 pt-5 pb-8 sm:px-8 lg:h-svh lg:px-[42px] lg:pt-[30px] lg:pb-8">
      <div className="animate-rise-in relative z-30">
        <TopBar showSearch={false} />
      </div>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-navy-700/60 pb-4 lg:mt-8">
        <div>
          <Label>Lumina · Konfigurasi Peta</Label>
          <h1 className="mt-1.5 text-[26px] leading-none font-semibold text-white">
            Kelola Peta
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => runAction(syncStations, pointsApi.reload)}
            className="flex items-center gap-2 border border-navy-700 px-4 py-2 text-[12px] text-white transition-colors hover:bg-navy-800"
          >
            <RefreshCw className="size-3.5" strokeWidth={2} />
            Tarik stasiun baru
          </button>
          <select
            value={basemap}
            onChange={(event) => setBasemap(event.target.value as MapidStyle)}
            aria-label="Basemap MAPID"
            className="border border-navy-700 bg-navy-950 px-4 py-2 text-[12px] text-white focus:outline-none"
          >
            {MAPID_STYLE_ORDER.map((style) => (
              <option key={style} value={style}>
                Basemap: {MAPID_STYLES[style].label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <AdminStatus
        loading={pointsApi.loading || layersApi.loading}
        error={pointsApi.error ?? layersApi.error ?? actionError}
        errorCode={pointsApi.errorCode ?? layersApi.errorCode}
        onRetry={() => {
          pointsApi.reload()
          layersApi.reload()
        }}
      />

      <div className="mt-5 flex flex-col gap-5 lg:min-h-0 lg:flex-1 lg:flex-row">
        {/* Kolom kelola */}
        <div className="flex w-full flex-col gap-6 lg:w-[340px] lg:shrink-0 lg:overflow-y-auto">
          <section>
            <Label>Layer peta</Label>
            <ul className="mt-3">
              {layers.map((layer) => (
                <li
                  key={layer.id}
                  className="flex items-start gap-3 border-t border-navy-700/40 py-3 first:border-t-0"
                >
                  <button
                    type="button"
                    onClick={() => toggleLayer(layer)}
                    aria-label={`${layer.visible ? 'Sembunyikan' : 'Tampilkan'} ${layer.label}`}
                    aria-pressed={layer.visible}
                    className={`mt-0.5 transition-colors ${
                      layer.visible ? 'text-brand-cyan' : 'text-mist-400 hover:text-white'
                    }`}
                  >
                    {layer.visible ? (
                      <Eye className="size-4" strokeWidth={1.8} />
                    ) : (
                      <EyeOff className="size-4" strokeWidth={1.8} />
                    )}
                  </button>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-white">{layer.label}</span>
                    <span className="block text-[11px] text-mist-400">
                      {layer.description}
                    </span>
                  </span>

                  <select
                    value={layer.status}
                    onChange={(event) => setLayerStatus(layer, event.target.value)}
                    aria-label={`Status ${layer.label}`}
                    className={`shrink-0 bg-transparent text-[10px] tracking-[0.14em] uppercase focus:outline-none ${
                      statusStyle[layer.status] ?? ''
                    }`}
                  >
                    <option value="publik">publik</option>
                    <option value="draf">draf</option>
                    <option value="internal">internal</option>
                  </select>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex items-baseline justify-between">
              <Label>Titik terdaftar</Label>
              <span className="font-mono text-[11px] text-mist-400 tabular-nums">
                {published}/{points.length} terbit
              </span>
            </div>

            <ul className="mt-3">
              {points.map((point) => (
                <li key={point.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(point.id)}
                    className={`flex w-full items-center gap-3 border-t border-navy-700/40 py-2.5 text-left transition-colors ${
                      selectedId === point.id ? 'bg-navy-800/50' : 'hover:bg-navy-800/30'
                    }`}
                  >
                    <span
                      className={`size-1.5 shrink-0 ${
                        point.published ? 'bg-brand-cyan' : 'bg-mist-400/50'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-white">
                        {point.name}
                      </span>
                      <span className="block font-mono text-[10px] text-mist-400 tabular-nums">
                        {point.position[0].toFixed(4)}, {point.position[1].toFixed(4)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] tracking-[0.14em] text-mist-400 uppercase">
                      {point.kind}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selected && (
            <section className="border-t border-navy-700/60 pt-4">
              <Label>Ubah titik</Label>

              <label className="mt-3 block text-[11px] text-mist-400">
                Nama
                <input
                  value={draftName}
                  onChange={(event) =>
                    setNameDraft({ id: selected.id, value: event.target.value })
                  }
                  onBlur={saveName}
                  className={fieldClass}
                />
              </label>

              <div className="mt-3 grid grid-cols-2 gap-3">
                {(['Latitude', 'Longitude'] as const).map((axis, index) => (
                  <label key={axis} className="block text-[11px] text-mist-400">
                    {axis}
                    <input
                      readOnly
                      value={selected.position[index].toFixed(4)}
                      className={`${fieldClass} opacity-70`}
                    />
                  </label>
                ))}
              </div>

              <label className="mt-4 flex items-center justify-between text-[12px] text-white">
                Terbitkan ke pengguna
                <input
                  type="checkbox"
                  checked={selected.published}
                  onChange={() => togglePublished(selected)}
                  className="size-4 accent-[#5de6ff]"
                />
              </label>

              <button
                type="button"
                onClick={() => setSelectedId(null)}
                disabled={saving}
                className="mt-4 w-full border border-navy-700 py-2 text-[12px] text-mist-200 transition-colors hover:bg-navy-800 hover:text-white disabled:opacity-50"
              >
                {saving ? 'Menyimpan…' : 'Selesai'}
              </button>
            </section>
          )}
        </div>

        {/* Peta */}
        <div className="relative h-[420px] w-full overflow-hidden border border-navy-700/60 lg:h-auto lg:min-w-0 lg:flex-1">
          <AdminMapCanvas
            points={points}
            heatSource={heatmap.data ?? []}
            surveySites={surveySites}
            selected={selected}
            visibility={visibility}
            basemap={basemap}
            onReady={setMap}
            onSelect={(point) => setSelectedId(point.id)}
          />

          <div className="absolute right-3 bottom-3 z-[1000] flex flex-col gap-2">
            {[
              { icon: Plus, label: 'Perbesar peta', action: () => map?.zoomIn() },
              { icon: Minus, label: 'Perkecil peta', action: () => map?.zoomOut() },
              {
                icon: LocateFixed,
                label: selected ? `Fokus ke ${selected.name}` : 'Pilih titik untuk difokuskan',
                action: () =>
                  selected &&
                  map?.flyTo({
                    center: [selected.position[1], selected.position[0]],
                    zoom: 14,
                  }),
              },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={action}
                className="flex size-9 items-center justify-center border border-navy-700/60 bg-navy-800/90 text-mist-100 transition-colors hover:bg-navy-700"
              >
                <Icon className="size-[18px]" strokeWidth={2} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapManagement
