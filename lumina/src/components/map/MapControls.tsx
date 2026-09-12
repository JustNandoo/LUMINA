import { useState } from 'react'
import { Layers, LocateFixed, Minus, Plus } from 'lucide-react'
import type { Map as MapLibreInstance } from 'maplibre-gl'
import { MAPID_STYLES, MAPID_STYLE_ORDER } from '../../lib/mapidMap'
import type { MapidStyle } from '../../lib/mapidMap'

type MapControlsProps = {
  map: MapLibreInstance | null
  basemap: MapidStyle
  onBasemapChange: (style: MapidStyle) => void
}

function MapControls({ map, basemap, onBasemapChange }: MapControlsProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const locate = () => {
    if (!map || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) =>
        map.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 15,
        }),
      // Izin lokasi ditolak bukan kondisi error aplikasi — cukup diamkan.
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const controls = [
    { icon: Plus, label: 'Perbesar peta', action: () => map?.zoomIn() },
    { icon: Minus, label: 'Perkecil peta', action: () => map?.zoomOut() },
    { icon: LocateFixed, label: 'Lokasi saya', action: locate },
    {
      icon: Layers,
      label: 'Ganti basemap',
      action: () => setPickerOpen((open) => !open),
    },
  ]

  return (
    <div className="relative flex flex-col gap-2 lg:gap-3">
      {controls.map(({ icon: Icon, label, action }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          onClick={action}
          className="flex size-9 items-center justify-center rounded-[10px] border border-navy-700/60 bg-navy-800/90 text-mist-100 backdrop-blur-sm transition-colors hover:bg-navy-700"
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </button>
      ))}

      {pickerOpen && (
        <div className="absolute right-[46px] bottom-0 flex w-[132px] flex-col gap-1 rounded-[10px] border border-navy-700/60 bg-navy-900/95 p-1.5 backdrop-blur-md">
          <p className="px-2 pt-1 pb-0.5 text-[10px] tracking-[0.14em] text-mist-400 uppercase">
            Basemap MAPID
          </p>
          {MAPID_STYLE_ORDER.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => {
                onBasemapChange(style)
                setPickerOpen(false)
              }}
              aria-pressed={basemap === style}
              className={`rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                basemap === style
                  ? 'bg-brand-cyan text-navy-900 font-medium'
                  : 'text-mist-200 hover:bg-navy-800 hover:text-white'
              }`}
            >
              {MAPID_STYLES[style].label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default MapControls
