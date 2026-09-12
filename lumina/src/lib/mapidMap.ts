/**
 * Basemap MAPID (MAPID MAPS) untuk seluruh peta LUMINA.
 *
 * Style-nya berformat MapLibre/Mapbox GL v8 dengan vector tile, jadi peta
 * digambar oleh MapLibre GL — bukan Leaflet. Ini juga yang diminta PRD §9:
 * "React + MapLibre GL di atas basemap MAPID MAPS".
 *
 * MAPID menyediakan varian gelap dan terang sendiri, sehingga pergantian tema
 * peta dilakukan dengan menukar style — bukan menimpa tile dengan filter CSS
 * seperti pada implementasi Leaflet sebelumnya. Bedanya penting: MapLibre
 * menggambar basemap dan garis rute pada satu canvas, jadi filter CSS akan
 * ikut membalik warna rute.
 */

const KEY = import.meta.env.VITE_MAPID_KEY ?? ''

export const MAPID_STYLES = {
  dark: { id: 'dark', label: 'Gelap' },
  street: { id: 'street-2d-building', label: 'Jalan' },
  light: { id: 'light', label: 'Terang' },
  satellite: { id: 'satellite', label: 'Satelit' },
} as const

export type MapidStyle = keyof typeof MAPID_STYLES

/** Urutan tombol pada pemilih basemap. */
export const MAPID_STYLE_ORDER: MapidStyle[] = [
  'dark',
  'street',
  'light',
  'satellite',
]

export function mapidStyleUrl(style: MapidStyle = 'dark'): string {
  const entry = MAPID_STYLES[style] ?? MAPID_STYLES.dark
  return `https://basemap.mapid.io/styles/${entry.id}/style.json?key=${KEY}`
}

/** Peta tidak bisa digambar kalau key basemap belum diisi di .env. */
export const mapidKeyConfigured = KEY.length > 0

/** Warna garis rute per tema, supaya kontras di basemap gelap maupun terang. */
export function routeColor(style: MapidStyle): string {
  return style === 'light' || style === 'street' ? '#0a7ea4' : '#35d6f5'
}

export const JAKARTA_CENTER: [number, number] = [106.8272, -6.2]
export const DEFAULT_ZOOM = 11
