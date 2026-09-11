import { useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import AnalysisFilterPanel from './AnalysisFilterPanel'
import AreaDetailPanel from './AreaDetailPanel'
import AssistantChatPanel from './AssistantChatPanel'
import MapCanvas from './MapCanvas'
import MapControls from '../../../components/map/MapControls'
import { areas, defaultAreaId } from '../../../data/areas'
import type { TileStyle } from '../../../lib/mapTiles'
import TopBar from '../../../components/layout/TopBar'

function BusinessPotential() {
  const [chatOpen, setChatOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(true)
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [tileStyle, setTileStyle] = useState<TileStyle>('dark')
  const [selectedArea, setSelectedArea] = useState(
    () => areas.find((item) => item.id === defaultAreaId)!,
  )

  return (
    <>
      <div className="flex flex-col px-4 pt-5 pb-6 sm:px-8 lg:h-svh lg:px-[52px] lg:pt-[38px] lg:pb-[30px]">
        <div className="animate-rise-in relative z-30">
          <TopBar />
        </div>

        <div className="mt-6 flex flex-col gap-5 lg:mt-[36px] lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-[26px]">
          <div className="animate-rise-in [animation-delay:100ms]">
            <AnalysisFilterPanel />
          </div>

          <div className="relative order-last h-[300px] min-w-0 overflow-hidden rounded-[14px] lg:order-none lg:h-auto lg:flex-1 lg:overflow-visible lg:rounded-none">
            <MapCanvas
              tileStyle={tileStyle}
              selectedAreaId={selectedArea.id}
              onReady={setMap}
              onSelectArea={(area) => {
                setSelectedArea(area)
                setDetailOpen(true)
              }}
            />

            <div className="absolute right-3 bottom-3 z-[1000] lg:right-4 lg:bottom-4">
              <MapControls
                map={map}
                onToggleTileStyle={() =>
                  setTileStyle((current) =>
                    current === 'dark' ? 'light' : 'dark',
                  )
                }
              />
            </div>

            {chatOpen && (
              <div className="animate-rise-in absolute inset-x-3 top-3 lg:inset-x-auto lg:top-0 lg:right-0">
                <AssistantChatPanel onClose={() => setChatOpen(false)} />
              </div>
            )}
          </div>

          {detailOpen && (
            <div className="animate-rise-in [animation-delay:200ms]">
              <AreaDetailPanel
                area={selectedArea}
                onClose={() => setDetailOpen(false)}
                onOpenChat={() => setChatOpen(true)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default BusinessPotential
