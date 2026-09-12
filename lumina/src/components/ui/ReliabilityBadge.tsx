import { ShieldCheck, ShieldQuestion, ShieldAlert } from 'lucide-react'
import type { Reliability } from '../../lib/geoApi'

/**
 * Penanda tingkat keterandalan (F8 REQ-F8-02: setiap keluaran angka menampilkan
 * tingkat keterandalannya).
 *
 * Keterandalan rendah sengaja tidak memakai warna bahaya — angkanya bukan
 * "buruk", melainkan belum cukup ditopang data. Warnanya juga tidak pernah
 * berdiri sendiri: labelnya selalu ikut tertulis.
 */
const TONE: Record<
  Reliability,
  { label: string; chip: string; Icon: typeof ShieldCheck }
> = {
  high: {
    label: 'Keterandalan tinggi',
    chip: 'bg-brand-cyan/15 text-brand-cyan',
    Icon: ShieldCheck,
  },
  medium: {
    label: 'Keterandalan sedang',
    chip: 'bg-warning-soft/15 text-warning-soft',
    Icon: ShieldQuestion,
  },
  low: {
    label: 'Keterandalan rendah',
    chip: 'bg-navy-700/70 text-mist-200',
    Icon: ShieldAlert,
  },
}

type ReliabilityBadgeProps = {
  level: Reliability
  /** Ringkas = hanya kata tingkatnya, dipakai di dalam tabel dan kartu sempit. */
  compact?: boolean
  className?: string
}

function ReliabilityBadge({ level, compact, className = '' }: ReliabilityBadgeProps) {
  const tone = TONE[level] ?? TONE.low
  const { Icon } = tone

  return (
    <span
      title={tone.label}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold ${tone.chip} ${className}`}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2} />
      {compact ? tone.label.replace('Keterandalan ', '') : tone.label}
    </span>
  )
}

export default ReliabilityBadge
