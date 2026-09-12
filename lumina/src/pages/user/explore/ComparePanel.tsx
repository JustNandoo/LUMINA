import { useState } from 'react'
import { BarChart3, Plus, X } from 'lucide-react'
import ReliabilityBadge from '../../../components/ui/ReliabilityBadge'
import { crowdTone } from '../../../lib/crowdTone'
import { useApi } from '../../../hooks/useApi'
import { compareStations } from '../../../lib/geoApi'
import type { SlotId, StationSummary } from '../../../lib/geoApi'

type ComparePanelProps = {
  slot: SlotId
  slotLabel: string
  /** Stasiun yang sedang dipilih di peta, bisa ditambahkan ke perbandingan. */
  selected: StationSummary | null
  corridorIds: string[]
  onClose: () => void
}

/**
 * REQ-F2-04: empat stasiun studi kasus dibandingkan pada slot waktu yang sama.
 *
 * Perbandingan dihitung backend lewat /api/stations/compare, bukan disusun
 * dari daftar stasiun yang sudah ada di layar — supaya angkanya berasal dari
 * satu sumber yang sama dengan peta dan panel stasiun.
 */
function ComparePanel({
  slot,
  slotLabel,
  selected,
  corridorIds,
  onClose,
}: ComparePanelProps) {
  const [extraIds, setExtraIds] = useState<string[]>([])
  const ids = [...corridorIds, ...extraIds]

  const comparison = useApi(
    () => compareStations(ids, slot),
    [ids.join(','), slot],
    { enabled: ids.length >= 2 },
  )

  const rows = comparison.data ?? []
  const max = Math.max(...rows.map((row) => row.index ?? 0), 1)
  const canAddSelected =
    selected && !ids.includes(selected.id) && ids.length < 8

  return (
    <section className="flex w-full flex-col overflow-hidden rounded-[14px] border border-mist-400/40 bg-navy-900/95 backdrop-blur-md lg:max-h-[52svh] lg:w-[320px]">
      <header className="flex shrink-0 items-center justify-between border-b border-navy-700/50 px-4 py-3">
        <span className="flex items-center gap-2 text-[14px] font-medium text-white">
          <BarChart3 className="size-4 text-brand-cyan" strokeWidth={1.8} />
          Banding stasiun
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup perbandingan"
          className="text-mist-400 transition-colors hover:text-white"
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      </header>

      <div className="overflow-y-auto px-4 py-3.5">
        <p className="text-[12px] text-mist-400">
          Slot {slotLabel} · indeks relatif 0–100
        </p>

        {comparison.error && (
          <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-[12px] text-danger-soft">
            {comparison.error}
          </p>
        )}

        <ul className="mt-3.5 flex flex-col gap-3">
          {rows.map((row) => {
            const index = row.index ?? 0
            const tone = row.level ? crowdTone[row.level] : crowdTone.low
            const isExtra = extraIds.includes(row.id)

            return (
              <li key={row.id}>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="min-w-0 truncate text-mist-100">{row.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums text-white">{index}</span>
                    {isExtra && (
                      <button
                        type="button"
                        onClick={() =>
                          setExtraIds((current) =>
                            current.filter((id) => id !== row.id),
                          )
                        }
                        aria-label={`Keluarkan ${row.name} dari perbandingan`}
                        className="text-mist-400 transition-colors hover:text-danger"
                      >
                        <X className="size-3" strokeWidth={2.4} />
                      </button>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-800">
                  <div
                    className={`h-full rounded-full ${tone.bar}`}
                    style={{ width: `${(index / max) * 100}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className={`text-[11px] ${tone.text}`}>{tone.label}</span>
                  <ReliabilityBadge level={row.reliability} compact />
                </div>
              </li>
            )
          })}
        </ul>

        {canAddSelected && (
          <button
            type="button"
            onClick={() => setExtraIds((current) => [...current, selected.id])}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-navy-700 py-2 text-[12px] text-mist-200 transition-colors hover:border-brand-cyan/50 hover:text-white"
          >
            <Plus className="size-3.5" strokeWidth={2.4} />
            Tambahkan {selected.name}
          </button>
        )}

        <p className="mt-3 border-t border-navy-700/50 pt-2.5 text-[11px] leading-[1.5] text-mist-400">
          Empat stasiun koridor kalibrasi selalu ikut dibandingkan karena hanya
          di situ indeks divalidasi survei lapangan.
        </p>
      </div>
    </section>
  )
}

export default ComparePanel
