import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreGl } from 'maplibre-gl'
import type { ErrorEvent, Map as MapLibreInstance } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { TriangleAlert } from 'lucide-react'
import {
  DEFAULT_ZOOM,
  JAKARTA_CENTER,
  mapidKeyConfigured,
  mapidStyleUrl,
} from '../../lib/mapidMap'
import type { MapidStyle } from '../../lib/mapidMap'

type MapLibreMapProps = {
  basemap: MapidStyle
  center?: [number, number]
  zoom?: number
  interactive?: boolean
  className?: string
  /**
   * Dipanggil saat style siap — pada pemuatan pertama DAN setiap kali basemap
   * diganti. Mengganti style menghapus seluruh source/layer buatan sendiri,
   * jadi di sinilah tempat menggambarnya ulang.
   */
  onStyleReady?: (map: MapLibreInstance) => void
  /** Dipanggil sekali dengan instance peta, untuk kontrol zoom dari luar. */
  onReady?: (map: MapLibreInstance) => void
}

function MapLibreMap({
  basemap,
  center = JAKARTA_CENTER,
  zoom = DEFAULT_ZOOM,
  interactive = true,
  className = '',
  onStyleReady,
  onReady,
}: MapLibreMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreInstance | null>(null)
  const [failed, setFailed] = useState(false)

  // Callback disimpan di ref supaya peta tidak dibuat ulang hanya karena
  // pemanggil membuat fungsi baru pada tiap render.
  const styleReadyRef = useRef(onStyleReady)
  const readyRef = useRef(onReady)
  useEffect(() => {
    styleReadyRef.current = onStyleReady
    readyRef.current = onReady
  })

  // Peta dibuat sekali seumur komponen.
  useEffect(() => {
    if (!container.current || mapRef.current || !mapidKeyConfigured) return

    const map = new MapLibreGl({
      container: container.current,
      style: mapidStyleUrl(basemap),
      center,
      zoom,
      interactive,
      attributionControl: false,
    })
    mapRef.current = map

    map.on('error', (event: ErrorEvent) => {
      // Basemap gagal dimuat (key salah / jaringan) — jangan biarkan peta
      // tampil sebagai kotak kosong tanpa penjelasan.
      if (event.error?.message?.toLowerCase().includes('style')) setFailed(true)
    })

    // `style.load` menyala saat style siap menerima layer — termasuk setiap
    // kali basemap diganti lewat setStyle, jadi layer buatan sendiri otomatis
    // digambar ulang. Jangan pakai `styledata` + isStyleLoaded(): style MAPID
    // merujuk sprite di host eksternal, sehingga isStyleLoaded() bisa lama
    // sekali bernilai false dan layer tidak pernah terpasang.
    map.on('style.load', () => styleReadyRef.current?.(map))

    map.once('load', () => readyRef.current?.(map))

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ganti basemap tanpa membuat ulang peta, supaya posisi & zoom tetap.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setStyle(mapidStyleUrl(basemap))
  }, [basemap])

  if (!mapidKeyConfigured) {
    return (
      <div
        className={`flex items-center justify-center bg-navy-950 p-6 ${className}`}
      >
        <p className="flex max-w-[320px] items-start gap-2.5 text-[13px] leading-[1.5] text-warning-soft">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          Basemap MAPID belum aktif. Isi <code>VITE_MAPID_KEY</code> di file{' '}
          <code>.env</code>, lalu jalankan ulang dev server.
        </p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={container} className="size-full" />
      {failed && (
        <p className="absolute inset-x-4 top-4 z-10 rounded-lg bg-danger/15 px-4 py-3 text-center text-[13px] text-danger-soft backdrop-blur-md">
          Basemap MAPID gagal dimuat. Periksa VITE_MAPID_KEY dan koneksi.
        </p>
      )}
    </div>
  )
}

export default MapLibreMap
