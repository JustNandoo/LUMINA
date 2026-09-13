import { Eye, EyeOff, Info, Layers2, X } from 'lucide-react'
import { useState } from 'react'
import { useApi } from '../../../hooks/useApi'
import { fetchMeta } from '../../../lib/geoApi'
import type { MapLayers } from './StationMap'

const LAYER_LABELS: { key: keyof MapLayers; label: string; hint: string }[] = [
  {
    key: 'density',
    label: 'Indeks kepadatan',
    hint: 'Heatmap per sel pada slot waktu terpilih',
  },
  { key: 'network', label: 'Jaringan lin', hint: 'Jalur seluruh lin KRL' },
  {
    key: 'corridor',
    label: 'Koridor kalibrasi',
    hint: 'Manggarai–Tanah Abang–Duri–Sudirman',
  },
  { key: 'stations', label: 'Titik stasiun', hint: 'Penanda dan label stasiun' },
]

type LayerPanelProps = {
  layers: MapLayers
  /** Layer yang diterbitkan admin; yang tidak terbit tidak ditawarkan. */
  available?: MapLayers
  onChange: (layers: MapLayers) => void
}

/**
 * Kontrol layer peta sekaligus jendela metadata.
 *
 * Menjawab REQ-F2-03 (layer dapat diaktifkan/dinonaktifkan) dan REQ-F8-03
 * (sumber serta metadata data dapat ditelusuri dari antarmuka) — keduanya
 * berada di satu tempat karena pertanyaannya sama: "yang saya lihat ini
 * sebenarnya apa, dan datangnya dari mana".
 */
function LayerPanel({ layers, available, onChange }: LayerPanelProps) {
  const [open, setOpen] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const meta = useApi(() => fetchMeta(), [], { enabled: showSources })

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 rounded-[12px] border border-mist-400/40 bg-navy-900/90 px-4 py-2.5 text-[13px] text-mist-100 backdrop-blur-md transition-colors hover:text-white"
      >
        <Layers2 className="size-4 text-brand-cyan" strokeWidth={1.8} />
        Layer peta
      </button>
    )
  }

  return (
    <section className="flex w-[268px] flex-col overflow-hidden rounded-[14px] border border-mist-400/40 bg-navy-900/95 backdrop-blur-md lg:max-h-[42svh]">
      <header className="flex shrink-0 items-center justify-between border-b border-navy-700/50 px-4 py-3">
        <span className="flex items-center gap-2 text-[14px] font-medium text-white">
          <Layers2 className="size-4 text-brand-cyan" strokeWidth={1.8} />
          Layer peta
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Tutup panel layer"
          className="text-mist-400 transition-colors hover:text-white"
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      </header>

      <ul className="shrink-0 px-2 py-2">
        {LAYER_LABELS.filter((item) => !available || available[item.key]).map((item) => {
          const active = layers[item.key]
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onChange({ ...layers, [item.key]: !active })}
                aria-pressed={active}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-navy-800"
              >
                {active ? (
                  <Eye className="mt-0.5 size-4 shrink-0 text-brand-cyan" strokeWidth={1.8} />
                ) : (
                  <EyeOff className="mt-0.5 size-4 shrink-0 text-mist-400" strokeWidth={1.8} />
                )}
                <span className="min-w-0">
                  <span
                    className={`block text-[13px] ${active ? 'text-white' : 'text-mist-400'}`}
                  >
                    {item.label}
                  </span>
                  <span className="block text-[11px] text-mist-400">{item.hint}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="min-h-0 overflow-y-auto border-t border-navy-700/50 px-2 py-2">
        <button
          type="button"
          onClick={() => setShowSources((value) => !value)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-mist-200 transition-colors hover:bg-navy-800 hover:text-white"
        >
          <Info className="size-4 shrink-0 text-mist-400" strokeWidth={1.8} />
          Sumber &amp; keterandalan data
        </button>

        {showSources && (
          <div className="max-h-[240px] overflow-y-auto px-2.5 pb-2">
            {meta.loading && (
              <p className="py-2 text-[12px] text-mist-400">Memuat metadata…</p>
            )}
            {meta.data && (
              <>
                <p className="pt-1 text-[10px] tracking-[0.14em] text-mist-400 uppercase">
                  Sumber data
                </p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {meta.data.data_sources.map((source) => (
                    <li key={source.id} className="text-[11px] leading-[1.5]">
                      <span className="text-mist-100">{source.name}</span>
                      <span className="block text-mist-400">{source.role}</span>
                    </li>
                  ))}
                </ul>

                <p className="pt-3 text-[10px] tracking-[0.14em] text-mist-400 uppercase">
                  Tingkat keterandalan
                </p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {meta.data.reliability_levels.map((level) => (
                    <li key={level.level} className="text-[11px] leading-[1.5]">
                      <span className="text-mist-100">{level.label}</span>
                      <span className="block text-mist-400">{level.meaning}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-3 border-t border-navy-700/50 pt-2 text-[11px] leading-[1.55] text-mist-400">
                  {meta.data.claim_boundary.density}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default LayerPanel
