import { Popup } from 'maplibre-gl'
import type { Map as MapLibreInstance, MapGeoJSONFeature } from 'maplibre-gl'

/**
 * Tooltip yang mengikuti kursor di atas sebuah layer peta.
 *
 * Dibuat satu Popup per peta lalu dipindah-pindah, bukan dibuat-hapus tiap
 * gerakan mouse — membuat elemen baru pada setiap `mousemove` membuat peta
 * tersendat saat kursor menyapu banyak titik sekaligus.
 */
const popups = new WeakMap<MapLibreInstance, Popup>()

function popupFor(map: MapLibreInstance): Popup {
  let popup = popups.get(map)
  if (!popup) {
    popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      className: 'lumina-map-tooltip',
      maxWidth: '260px',
    })
    popups.set(map, popup)
  }
  return popup
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Pasang tooltip pada satu layer. `render` menerima properti fitur dan
 * mengembalikan HTML isi tooltip — pakai `escapeHtml` untuk tiap nilai yang
 * berasal dari data.
 */
export function bindTooltip(
  map: MapLibreInstance,
  layerId: string,
  render: (properties: MapGeoJSONFeature['properties']) => string,
) {
  const popup = popupFor(map)

  map.on('mousemove', layerId, (event) => {
    const feature = event.features?.[0]
    if (!feature) return

    map.getCanvas().style.cursor = 'pointer'
    popup.setLngLat(event.lngLat).setHTML(render(feature.properties)).addTo(map)
  })

  map.on('mouseleave', layerId, () => {
    map.getCanvas().style.cursor = ''
    popup.remove()
  })
}
