export type Area = {
  id: string
  name: string
  district: string
  position: [number, number]
  score: number
}

export const areas: Area[] = [
  {
    id: 'manggarai',
    name: 'Manggarai',
    district: 'Kecamatan Tebet, Jakarta Selatan',
    position: [-6.2145, 106.8506],
    score: 60,
  },
  {
    id: 'sudirman',
    name: 'Sudirman',
    district: 'Kecamatan Setiabudi, Jakarta Selatan',
    position: [-6.2025, 106.823],
    score: 82,
  },
  {
    id: 'tanah-abang',
    name: 'Tanah Abang',
    district: 'Kecamatan Tanah Abang, Jakarta Pusat',
    position: [-6.1859, 106.8107],
    score: 74,
  },
  {
    id: 'cikini',
    name: 'Cikini',
    district: 'Kecamatan Menteng, Jakarta Pusat',
    position: [-6.1985, 106.841],
    score: 55,
  },
  {
    id: 'duri',
    name: 'Duri',
    district: 'Kecamatan Tambora, Jakarta Barat',
    position: [-6.1625, 106.7968],
    score: 41,
  },
  {
    id: 'tebet',
    name: 'Tebet',
    district: 'Kecamatan Tebet, Jakarta Selatan',
    position: [-6.2264, 106.858],
    score: 67,
  },
]

export const defaultAreaId = 'manggarai'

// PRNG deterministik supaya sebaran titik heatmap selalu sama tiap render.
function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

/**
 * Titik heatmap: [lat, lng, intensitas 0-1]. Tiap area disebar jadi beberapa
 * titik supaya membentuk gradasi, bukan satu titik tajam.
 * Nanti diganti data kepadatan transaksi asli dari backend.
 */
export const heatPoints: [number, number, number][] = areas.flatMap(
  (area, areaIndex) => {
    const random = seededRandom(areaIndex + 1)
    const intensity = area.score / 100
    const cloud: [number, number, number][] = [
      [area.position[0], area.position[1], intensity],
    ]

    for (let i = 0; i < 16; i += 1) {
      const spread = 0.016
      cloud.push([
        area.position[0] + (random() - 0.5) * spread,
        area.position[1] + (random() - 0.5) * spread,
        intensity * (0.35 + random() * 0.5),
      ])
    }

    return cloud
  },
)
