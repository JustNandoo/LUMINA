import { useState } from 'react'
import { Eye, EyeOff, LocateFixed, Minus, Plus } from 'lucide-react'
import type { Map as LeafletMap } from 'leaflet'
import TopBar from '../../components/layout/TopBar'
import AdminMapCanvas from './AdminMapCanvas'
import { initialLayers, initialPoints } from './mapAdminData'
import type { LayerStatus, MapLayer, MapPoint } from './mapAdminData'
import type { TileStyle } from '../../lib/mapTiles'

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] tracking-[0.18em] text-mist-400 uppercase">
    {children}
  </p>
)

const statusStyle: Record<LayerStatus, string> = {
  publik: 'text-brand-cyan',
  draf: 'text-warning-soft',
  internal: 'text-mist-400',
}

function MapManagement() {
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [tileStyle, setTileStyle] = useState<TileStyle>('dark')
  const [layers, setLayers] = useState<MapLayer[]>(initialLayers)
  const [points, setPoints] = useState<MapPoint[]>(initialPoints)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [defaultView, setDefaultView] = useState('-6.2000, 106.8300 · z12')

  const selected = points.find((point) => point.id === selectedId) ?? null
  const visibility = Object.fromEntries(
    layers.map((layer) => [layer.id, layer.visible]),
  )

  const toggleLayer = (id: string) =>
    setLayers((current) =>
      current.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer,
      ),
    )

  const setLayerStatus = (id: string, status: LayerStatus) =>
    setLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, status } : layer)),
    )

  const updatePoint = (id: string, patch: Partial<MapPoint>) =>
    setPoints((current) =>
      current.map((point) =>
        point.id === id ? { ...point, ...patch } : point,
      ),
    )

  const saveDefaultView = () => {
    if (!map) return
    const center = map.getCenter()
    setDefaultView(
      `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)} · z${map.getZoom()}`,
    )
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
          <span className="font-mono text-[12px] text-mist-400">
            Tampilan awal: <span className="text-white">{defaultView}</span>
          </span>
          <button
            type="button"
            onClick={saveDefaultView}
            className="border border-navy-700 px-4 py-2 text-[12px] text-white transition-colors hover:bg-navy-800"
          >
            Simpan tampilan saat ini
          </button>
          <button
            type="button"
            onClick={() =>
              setTileStyle((current) =>
                current === 'dark' ? 'light' : 'dark',
              )
            }
            className="border border-navy-700 px-4 py-2 text-[12px] text-white transition-colors hover:bg-navy-800"
          >
            Basemap: {tileStyle === 'dark' ? 'Gelap' : 'Terang'}
          </button>
        </div>
      </header>

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
                    onClick={() => toggleLayer(layer.id)}
                    aria-label={`${layer.visible ? 'Sembunyikan' : 'Tampilkan'} ${layer.label}`}
                    aria-pressed={layer.visible}
                    className={`mt-0.5 transition-colors ${
                      layer.visible
                        ? 'text-brand-cyan'
                        : 'text-mist-400 hover:text-white'
                    }`}
                  >
                    {layer.visible ? (
                      <Eye className="size-4" strokeWidth={1.8} />
                    ) : (
                      <EyeOff className="size-4" strokeWidth={1.8} />
                    )}
                  </button>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-white">
                      {layer.label}
                    </span>
                    <span className="block text-[11px] text-mist-400">
                      {layer.description}
                    </span>
                  </span>

                  <select
                    value={layer.status}
                    onChange={(event) =>
                      setLayerStatus(
                        layer.id,
                        event.target.value as LayerStatus,
                      )
                    }
                    aria-label={`Status ${layer.label}`}
                    className={`shrink-0 bg-transparent text-[10px] tracking-[0.14em] uppercase focus:outline-none ${statusStyle[layer.status]}`}
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
                      selectedId === point.id
                        ? 'bg-navy-800/50'
                        : 'hover:bg-navy-800/30'
                    }`}
                  >
                    <span
                      className={`size-1.5 shrink-0 ${point.published ? 'bg-brand-cyan' : 'bg-mist-400/50'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-white">
                        {point.name}
                      </span>
                      <span className="block font-mono text-[10px] text-mist-400 tabular-nums">
                        {point.position[0].toFixed(4)},{' '}
                        {point.position[1].toFixed(4)}
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
                  value={selected.name}
                  onChange={(event) =>
                    updatePoint(selected.id, { name: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>

              <div className="mt-3 grid grid-cols-2 gap-3">
                {(['lat', 'lng'] as const).map((axis, index) => (
                  <label key={axis} className="block text-[11px] text-mist-400">
                    {axis === 'lat' ? 'Latitude' : 'Longitude'}
                    <input
                      type="number"
                      step="0.0001"
                      value={selected.position[index]}
                      onChange={(event) => {
                        const next: [number, number] = [...selected.position]
                        next[index] = Number(event.target.value)
                        updatePoint(selected.id, { position: next })
                      }}
                      className={fieldClass}
                    />
                  </label>
                ))}
              </div>

              <label className="mt-4 flex items-center justify-between text-[12px] text-white">
                Terbitkan ke pengguna
                <input
                  type="checkbox"
                  checked={selected.published}
                  onChange={(event) =>
                    updatePoint(selected.id, { published: event.target.checked })
                  }
                  className="size-4 accent-[#5de6ff]"
                />
              </label>

              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="mt-4 w-full border border-navy-700 py-2 text-[12px] text-mist-200 transition-colors hover:bg-navy-800 hover:text-white"
              >
                Selesai
              </button>
            </section>
          )}
        </div>

        {/* Peta */}
        <div className="relative h-[420px] w-full overflow-hidden border border-navy-700/60 lg:h-auto lg:min-w-0 lg:flex-1">
          <AdminMapCanvas
            points={points}
            selected={selected}
            visibility={visibility}
            tileStyle={tileStyle}
            onReady={setMap}
            onSelect={(point) => setSelectedId(point.id)}
          />

          <div className="absolute right-3 bottom-3 z-[1000] flex flex-col gap-2">
            {[
              { icon: Plus, label: 'Perbesar peta', action: () => map?.zoomIn() },
              {
                icon: Minus,
                label: 'Perkecil peta',
                action: () => map?.zoomOut(),
              },
              {
                icon: LocateFixed,
                label: 'Lokasi saya',
                action: () => map?.locate({ setView: true, maxZoom: 15 }),
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
