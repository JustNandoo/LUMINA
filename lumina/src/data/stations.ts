export type LatLng = [number, number]

export type Station = {
  id: string
  name: string
  position: LatLng
  line: string
  /**
   * true = stasiun pada koridor kalibrasi (Manggarai–Tanah Abang–Duri–Sudirman)
   * tempat model divalidasi dengan 84 observasi lapangan, sehingga indeksnya
   * berketerandalan tertinggi. Stasiun lain tetap dibaca dari sinyal proksi.
   */
  calibrated?: boolean
}

/**
 * Benih jaringan KRL Commuter Line Jabodetabek. LUMINA dirancang untuk jaringan
 * kereta nasional — daftar ini subset awal untuk pengembangan, dan koordinatnya
 * perkiraan. Ganti dengan dataset resmi (OSM / MAPID) sebelum rilis.
 */
export const stations: Station[] = [
  // Koridor kalibrasi
  { id: 'manggarai', name: 'Manggarai', position: [-6.2145, 106.8506], line: 'Interchange', calibrated: true },
  { id: 'tanah-abang', name: 'Tanah Abang', position: [-6.1859, 106.8107], line: 'Interchange', calibrated: true },
  { id: 'duri', name: 'Duri', position: [-6.1625, 106.7968], line: 'Interchange', calibrated: true },
  { id: 'sudirman', name: 'Sudirman', position: [-6.2025, 106.823], line: 'Interchange', calibrated: true },

  // Lin Bogor — utara
  { id: 'jakarta-kota', name: 'Jakarta Kota', position: [-6.1376, 106.814], line: 'Bogor' },
  { id: 'jayakarta', name: 'Jayakarta', position: [-6.1417, 106.8186], line: 'Bogor' },
  { id: 'mangga-besar', name: 'Mangga Besar', position: [-6.1489, 106.8236], line: 'Bogor' },
  { id: 'sawah-besar', name: 'Sawah Besar', position: [-6.1608, 106.8253], line: 'Bogor' },
  { id: 'juanda', name: 'Juanda', position: [-6.1665, 106.8305], line: 'Bogor' },
  { id: 'gondangdia', name: 'Gondangdia', position: [-6.1861, 106.8317], line: 'Bogor' },
  { id: 'cikini', name: 'Cikini', position: [-6.1985, 106.841], line: 'Bogor' },

  // Lin Bogor — selatan
  { id: 'tebet', name: 'Tebet', position: [-6.2264, 106.858], line: 'Bogor' },
  { id: 'cawang', name: 'Cawang', position: [-6.2422, 106.8664], line: 'Bogor' },
  { id: 'duren-kalibata', name: 'Duren Kalibata', position: [-6.2562, 106.8548], line: 'Bogor' },
  { id: 'pasar-minggu', name: 'Pasar Minggu', position: [-6.2841, 106.8443], line: 'Bogor' },
  { id: 'tanjung-barat', name: 'Tanjung Barat', position: [-6.3073, 106.836], line: 'Bogor' },
  { id: 'lenteng-agung', name: 'Lenteng Agung', position: [-6.3303, 106.834], line: 'Bogor' },
  { id: 'universitas-indonesia', name: 'Universitas Indonesia', position: [-6.361, 106.832], line: 'Bogor' },
  { id: 'pondok-cina', name: 'Pondok Cina', position: [-6.369, 106.832], line: 'Bogor' },
  { id: 'depok-baru', name: 'Depok Baru', position: [-6.3915, 106.8188], line: 'Bogor' },
  { id: 'citayam', name: 'Citayam', position: [-6.44, 106.8036], line: 'Bogor' },
  { id: 'bojonggede', name: 'Bojonggede', position: [-6.477, 106.795], line: 'Bogor' },
  { id: 'bogor', name: 'Bogor', position: [-6.595, 106.79], line: 'Bogor' },

  // Lin Rangkasbitung
  { id: 'palmerah', name: 'Palmerah', position: [-6.2074, 106.797], line: 'Rangkasbitung' },
  { id: 'kebayoran', name: 'Kebayoran', position: [-6.2426, 106.7834], line: 'Rangkasbitung' },
  { id: 'pondok-ranji', name: 'Pondok Ranji', position: [-6.2788, 106.7444], line: 'Rangkasbitung' },
  { id: 'sudimara', name: 'Sudimara', position: [-6.2935, 106.7122], line: 'Rangkasbitung' },
  { id: 'rawa-buntu', name: 'Rawa Buntu', position: [-6.3155, 106.6742], line: 'Rangkasbitung' },
  { id: 'serpong', name: 'Serpong', position: [-6.3182, 106.6628], line: 'Rangkasbitung' },

  // Lin Tangerang
  { id: 'grogol', name: 'Grogol', position: [-6.1655, 106.79], line: 'Tangerang' },
  { id: 'pesing', name: 'Pesing', position: [-6.165, 106.769], line: 'Tangerang' },
  { id: 'kalideres', name: 'Kalideres', position: [-6.159, 106.702], line: 'Tangerang' },
  { id: 'batuceper', name: 'Batuceper', position: [-6.184, 106.642], line: 'Tangerang' },
  { id: 'tangerang', name: 'Tangerang', position: [-6.177, 106.63], line: 'Tangerang' },

  // Lin Cikarang
  { id: 'jatinegara', name: 'Jatinegara', position: [-6.215, 106.87], line: 'Cikarang' },
  { id: 'klender', name: 'Klender', position: [-6.213, 106.898], line: 'Cikarang' },
  { id: 'buaran', name: 'Buaran', position: [-6.22, 106.928], line: 'Cikarang' },
  { id: 'cakung', name: 'Cakung', position: [-6.221, 106.952], line: 'Cikarang' },
  { id: 'kranji', name: 'Kranji', position: [-6.221, 106.98], line: 'Cikarang' },
  { id: 'bekasi', name: 'Bekasi', position: [-6.236, 107.0], line: 'Cikarang' },
  { id: 'cikarang', name: 'Cikarang', position: [-6.255, 107.15], line: 'Cikarang' },

  // Lin Tanjung Priok
  { id: 'kampung-bandan', name: 'Kampung Bandan', position: [-6.135, 106.821], line: 'Tanjung Priok' },
  { id: 'ancol', name: 'Ancol', position: [-6.126, 106.843], line: 'Tanjung Priok' },
  { id: 'tanjung-priok', name: 'Tanjung Priok', position: [-6.105, 106.88], line: 'Tanjung Priok' },
]

export const activeStationId = 'manggarai'

/** Koridor tempat model dikalibrasi — dipakai untuk menggambar garis rujukan. */
export const calibrationCorridor = stations.filter((s) => s.calibrated)
