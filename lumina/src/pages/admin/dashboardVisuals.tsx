type ColumnChartProps = {
  values: number[]
  labels: string[]
  peakIndex: number
}

/** Batang vertikal datar — tanpa gradien, tanpa glow. */
export function ColumnChart({ values, labels, peakIndex }: ColumnChartProps) {
  const max = Math.max(...values)

  return (
    <div>
      <div className="flex h-[150px] items-end gap-[6px]">
        {values.map((value, index) => (
          <div
            key={labels[index]}
            className="flex flex-1 flex-col justify-end"
            style={{ height: '100%' }}
          >
            <span
              className={
                index === peakIndex ? 'bg-brand-cyan' : 'bg-mist-400/35'
              }
              style={{ height: `${(value / max) * 100}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-[6px] border-t border-navy-700/60 pt-2">
        {labels.map((label, index) => (
          <span
            key={label}
            className={`flex-1 text-center font-mono text-[10px] tabular-nums ${
              index === peakIndex ? 'text-brand-cyan' : 'text-mist-400'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

type MeterProps = {
  value: number
  max: number
  tone?: 'neutral' | 'accent' | 'alert'
}

/** Bar tipis persegi — dipakai di tabel okupansi dan daftar area. */
export function Meter({ value, max, tone = 'neutral' }: MeterProps) {
  const fill =
    tone === 'accent'
      ? 'bg-brand-cyan'
      : tone === 'alert'
        ? 'bg-warning-soft'
        : 'bg-mist-400/60'

  return (
    <span className="block h-[6px] w-full bg-navy-700/50">
      <span
        className={`block h-full ${fill}`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </span>
  )
}

/** Deret blok: tiap blok = satu titik survei. Lebih terbaca dari donat. */
export function SegmentBar({ total, filled }: { total: number; filled: number }) {
  return (
    <span className="flex gap-1.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-8 flex-1 ${
            index < filled ? 'bg-brand-cyan' : 'bg-warning-soft/70'
          }`}
        />
      ))}
    </span>
  )
}
