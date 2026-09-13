/**
 * Pencarian stasiun untuk searchbar di TopBar.
 *
 * Mencocokkan nama stasiun, kecamatan/kota ("areas"), dan lin. Salah ketik
 * tetap ditemukan lewat jarak edit — pengguna mengetik "manngarai" berharap
 * melihat Manggarai, bukan pesan "tidak ada hasil".
 */
import type { StationSummary } from './geoApi'

export type StationMatch = {
  station: StationSummary
  score: number
  /** Bagian yang cocok dengan kata kunci. */
  field: 'name' | 'district' | 'line'
  /** true bila hanya cocok lewat toleransi salah ketik. */
  fuzzy: boolean
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Jarak Damerau–Levenshtein (optimal string alignment): huruf tertukar
 * seperti "mangagrai" dihitung satu kesalahan, bukan dua. Berhenti lebih awal
 * begitu jaraknya pasti melewati `max`.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1

  let prevPrev: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)

  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(prev[j] + 1, current[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1)
      }
      current[j] = value
      rowMin = Math.min(rowMin, value)
    }
    if (rowMin > max) return max + 1
    prevPrev = prev
    prev = current
  }
  return prev[b.length]
}

/** Kata kunci pendek tidak diberi toleransi — "bo" bisa cocok dengan apa saja. */
function typoBudget(length: number): number {
  if (length >= 8) return 2
  if (length >= 4) return 1
  return 0
}

export function searchStations(
  stations: StationSummary[],
  query: string,
  limit = 8,
): StationMatch[] {
  const keyword = normalize(query)
  if (!keyword) return []
  const budget = typoBudget(keyword.replace(/ /g, '').length)

  const results: StationMatch[] = []

  for (const station of stations) {
    const name = normalize(station.name)
    const words = name.split(' ')
    const district = normalize(station.district)
    const line = normalize(station.line)

    let best: Omit<StationMatch, 'station'> | null = null
    const consider = (score: number, field: StationMatch['field'], fuzzy: boolean) => {
      if (!best || score > best.score) best = { score, field, fuzzy }
    }

    if (name === keyword) consider(100, 'name', false)
    else if (name.startsWith(keyword)) consider(90, 'name', false)
    else if (words.some((word) => word.startsWith(keyword))) consider(80, 'name', false)
    else if (name.includes(keyword)) consider(70, 'name', false)

    if (budget > 0) {
      // Dibandingkan dengan nama utuh, tiap kata, dan awalan sepanjang kata
      // kunci — yang terakhir menangkap salah ketik saat nama belum selesai
      // diketik ("manng" untuk Manggarai).
      const distance = Math.min(
        editDistance(keyword, name, budget),
        editDistance(keyword, name.slice(0, keyword.length), budget),
        ...words.map((word) => editDistance(keyword, word, budget)),
      )
      if (distance <= budget) consider(65 - distance * 5, 'name', true)
    }

    // Kecamatan dan lin baru dicocokkan mulai tiga huruf; lebih pendek dari
    // itu hampir semua stasiun ikut cocok.
    if (keyword.length >= 3) {
      if (district.includes(keyword)) consider(50, 'district', false)
      if (line.includes(keyword) || `lin ${line}`.includes(keyword)) consider(45, 'line', false)
    }

    if (best) results.push({ station, ...(best as Omit<StationMatch, 'station'>) })
  }

  return results
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.station.interchange) - Number(a.station.interchange) ||
        a.station.name.localeCompare(b.station.name, 'id'),
    )
    .slice(0, limit)
}
