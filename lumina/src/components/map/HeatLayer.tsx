import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet.heat'
import { useMap } from 'react-leaflet'

type HeatLayerProps = {
  points: [number, number, number][]
  radius?: number
  blur?: number
}

/**
 * leaflet.heat menggambar ke canvas saat ditambahkan. Kalau kontainer peta
 * masih bertinggi 0 (layout belum selesai), getImageData melempar IndexSizeError.
 * Karena itu penambahan layer ditunda sampai kontainer punya ukuran.
 */
function HeatLayer({ points, radius = 32, blur = 24 }: HeatLayerProps) {
  const map = useMap()

  useEffect(() => {
    let layer: L.Layer | null = null
    let timer: number | undefined
    let attempts = 0

    const addWhenSized = () => {
      const container = map.getContainer()
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        map.invalidateSize()
        layer = L.heatLayer(points, {
          radius,
          blur,
          maxZoom: 15,
          minOpacity: 0.28,
          gradient: {
            0.2: '#1e40af',
            0.45: '#5de6ff',
            0.7: '#ffedd5',
            1: '#ff6b4a',
          },
        }).addTo(map)
        return
      }
      // batasi percobaan supaya tidak berputar selamanya
      if (attempts < 40) {
        attempts += 1
        timer = window.setTimeout(addWhenSized, 50)
      }
    }

    addWhenSized()

    return () => {
      window.clearTimeout(timer)
      layer?.remove()
    }
  }, [map, points, radius, blur])

  return null
}

export default HeatLayer
