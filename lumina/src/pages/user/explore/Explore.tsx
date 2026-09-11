import { useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import TopBar from '../../../components/layout/TopBar'
import MapControls from '../../../components/map/MapControls'
import StationAssistantPanel from './StationAssistantPanel'
import StationMap from './StationMap'
import StationPanel from './StationPanel'
import type { TileStyle } from '../../../lib/mapTiles'
import type { Amenity } from './stationData'

function Explore() {
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [tileStyle, setTileStyle] = useState<TileStyle>('dark')
  const [activeAmenity, setActiveAmenity] = useState<Amenity | null>(null)

  return (
    <>
      {/* Mobile: top bar, peta, lalu panel mengalir ke bawah.
          Desktop (lg): peta memenuhi layar, panel melayang di atasnya. */}
      <div className="relative flex min-h-svh flex-col lg:h-svh lg:overflow-hidden">
        <div className="relative px-4 pt-4 sm:px-6 lg:pointer-events-none lg:absolute lg:z-[1100] lg:inset-x-0 lg:top-0 lg:px-[46px] lg:pt-[30px]">
          <div className="animate-rise-in pointer-events-auto">
            <TopBar searchPlaceholder="Search stations or areas..." />
          </div>
        </div>

        <div className="relative mt-4 h-[42vh] w-full shrink-0 overflow-hidden rounded-[14px] lg:absolute lg:inset-0 lg:mt-0 lg:h-full lg:rounded-none">
          <StationMap
            tileStyle={tileStyle}
            onReady={setMap}
            onSelectStation={() => setActiveAmenity(null)}
          />

          {/* Offset desktop = padding kanan (46) + lebar panel (366) + gap (26). */}
          <div className="absolute right-3 bottom-3 z-[1000] lg:right-[438px] lg:bottom-[30px]">
            <MapControls
              map={map}
              onToggleTileStyle={() =>
                setTileStyle((current) =>
                  current === 'dark' ? 'light' : 'dark',
                )
              }
            />
          </div>
        </div>

        <div className="relative flex flex-col gap-4 px-4 py-4 sm:px-6 lg:pointer-events-none lg:absolute lg:z-[1000] lg:inset-0 lg:flex-row lg:justify-end lg:gap-[26px] lg:px-[46px] lg:pt-[114px] lg:pb-[30px]">
          {activeAmenity && (
            <div className="animate-rise-in pointer-events-auto lg:mr-auto">
              <StationAssistantPanel
                amenity={activeAmenity}
                onClose={() => setActiveAmenity(null)}
              />
            </div>
          )}

          <div className="animate-rise-in pointer-events-auto [animation-delay:100ms]">
            <StationPanel
              activeAmenityId={activeAmenity?.id ?? null}
              onSelectAmenity={(amenity) =>
                setActiveAmenity((current) =>
                  current?.id === amenity.id ? null : amenity,
                )
              }
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default Explore
