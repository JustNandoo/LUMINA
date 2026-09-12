import type { CrowdLevel } from './geoApi'

/**
 * Satu skala warna kepadatan untuk seluruh aplikasi: peta, kartu rute, panel
 * stasiun, dan detail kawasan. Warnanya tidak pernah berdiri sendiri — setiap
 * pemakaian wajib menampilkan `label` atau angkanya juga.
 */
export const crowdTone: Record<
  CrowdLevel,
  { label: string; text: string; dot: string; chip: string; bar: string }
> = {
  low: {
    label: 'Lengang',
    text: 'text-brand-cyan',
    dot: 'bg-brand-cyan',
    chip: 'bg-brand-cyan/15 text-brand-cyan',
    bar: 'bg-brand-cyan',
  },
  moderate: {
    label: 'Sedang',
    text: 'text-warning-soft',
    dot: 'bg-warning-soft',
    chip: 'bg-warning-soft/15 text-warning-soft',
    bar: 'bg-warning-soft',
  },
  // Titik dan latar memakai danger penuh supaya sinyalnya terbaca; teksnya
  // pakai danger-soft agar kontrasnya tetap aman di atas navy.
  high: {
    label: 'Padat',
    text: 'text-danger-soft',
    dot: 'bg-danger',
    chip: 'bg-danger/20 text-danger-soft',
    bar: 'bg-danger',
  },
}

/** Rupiah tanpa desimal, mis. 3000 -> "Rp 3.000". */
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} jam ${rest} menit` : `${hours} jam`
}
