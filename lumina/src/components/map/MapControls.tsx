import { Layers, LocateFixed, Minus, Plus } from 'lucide-react'
import type { Map as LeafletMap } from 'leaflet'

type MapControlsProps = {
  map: LeafletMap | null
  onToggleTileStyle: () => void
}

function MapControls({ map, onToggleTileStyle }: MapControlsProps) {
  const controls = [
    { icon: Plus, label: 'Zoom in', action: () => map?.zoomIn() },
    { icon: Minus, label: 'Zoom out', action: () => map?.zoomOut() },
    {
      icon: LocateFixed,
      label: 'My location',
      action: () => map?.locate({ setView: true, maxZoom: 15 }),
    },
    { icon: Layers, label: 'Switch map layer', action: onToggleTileStyle },
  ]

  return (
    <div className="flex flex-col gap-2 lg:gap-3">
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
    </div>
  )
}

export default MapControls
