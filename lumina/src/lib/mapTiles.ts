// OpenStreetMap standar: gratis, tanpa API key. Tampilan gelap dibuat lewat
// CSS filter di .map-dark (lihat index.css), bukan tile khusus.
// Ganti url di sini kalau nanti pindah ke MapID.
export const osmTile = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
} as const

export type TileStyle = 'dark' | 'light'
