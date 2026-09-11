import { stations } from '../../data/stations'
import type { LatLng } from '../../data/stations'

export type MapPoint = {
  id: string
  name: string
  position: LatLng
  kind: 'Stasiun' | 'Halte'
  published: boolean
}

/**
 * Titik yang tampil di peta pengguna. Admin bisa mengubah/menerbitkannya.
 * Sumbernya satu: dataset stasiun. Beberapa titik sengaja belum terbit supaya
 * alur publikasi di halaman admin ada contohnya.
 */
const unpublished = new Set(['tebet', 'cakung', 'batuceper'])

export const initialPoints: MapPoint[] = stations.map((station) => ({
  id: station.id,
  name: station.name,
  position: station.position,
  kind: 'Stasiun' as const,
  published: !unpublished.has(station.id),
}))

export type LayerStatus = 'publik' | 'draf' | 'internal'

export type MapLayer = {
  id: string
  label: string
  description: string
  visible: boolean
  status: LayerStatus
}

export const initialLayers: MapLayer[] = [
  {
    id: 'stations',
    label: 'Titik stasiun',
    description: 'Penanda stasiun dan halte',
    visible: true,
    status: 'publik',
  },
  {
    id: 'heatmap',
    label: 'Heatmap potensi',
    description: 'Kepadatan potensi usaha',
    visible: true,
    status: 'publik',
  },
  {
    id: 'routes',
    label: 'Jalur antar titik',
    description: 'Garis penghubung antar stasiun terbit',
    visible: false,
    status: 'draf',
  },
  {
    id: 'survey',
    label: 'Titik survei',
    description: 'Lokasi pengambilan data lapangan',
    visible: false,
    status: 'internal',
  },
]

export const surveySites: { id: string; position: LatLng }[] = [
  { id: 'srv-1', position: [-6.2098, 106.8501] },
  { id: 'srv-2', position: [-6.1625, 106.7968] },
  { id: 'srv-3', position: [-6.2031, 106.8244] },
  { id: 'srv-4', position: [-6.1872, 106.8121] },
]
