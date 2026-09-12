import { useState } from 'react'
import type { Map as MapLibreInstance } from 'maplibre-gl'
import { Headset } from 'lucide-react'
import TopBar from '../../../components/layout/TopBar'
import MapControls from '../../../components/map/MapControls'
import SlotSelector from '../../../components/map/SlotSelector'
import AssistantPanel from '../../../components/assistant/AssistantPanel'
import StationMap from './StationMap'
import StationPanel from './StationPanel'
import { useApi } from '../../../hooks/useApi'
import { fetchStation, fetchStations, fetchTimeSlots } from '../../../lib/geoApi'
import type { SlotId } from '../../../lib/geoApi'
import type { MapidStyle } from '../../../lib/mapidMap'

const DEFAULT_STATION = 'manggarai'
const DEFAULT_SLOT: SlotId = 'evening'

function Explore() {
  const [map, setMap] = useState<MapLibreInstance | null>(null)
  const [basemap, setBasemap] = useState<MapidStyle>('dark')
  const [slot, setSlot] = useState<SlotId>(DEFAULT_SLOT)
  const [stationId, setStationId] = useState(DEFAULT_STATION)
  const [chatOpen, setChatOpen] = useState(false)

  const slots = useApi(() => fetchTimeSlots(), [])
  const stations = useApi(() => fetchStations({ slot }), [slot])
  const station = useApi(() => fetchStation(stationId), [stationId])

  return (
    <div className="relative flex min-h-svh flex-col lg:h-svh lg:overflow-hidden">
      <div className="relative px-4 pt-4 sm:px-6 lg:pointer-events-none lg:absolute lg:z-[1100] lg:inset-x-0 lg:top-0 lg:px-[46px] lg:pt-[30px]">
        <div className="animate-rise-in pointer-events-auto">
          <TopBar searchPlaceholder="Search stations or areas..." />
        </div>
      </div>

      <div className="relative mt-4 h-[42vh] w-full shrink-0 overflow-hidden rounded-[14px] lg:absolute lg:inset-0 lg:mt-0 lg:h-full lg:rounded-none">
        <StationMap
          stations={stations.data ?? []}
          selectedStationId={stationId}
          basemap={basemap}
          onReady={setMap}
          onSelectStation={(id) => {
            setStationId(id)
            setChatOpen(false)
          }}
        />

        {stations.error && (
          <p className="absolute inset-x-4 top-4 z-[1000] rounded-lg bg-danger/15 px-4 py-3 text-center text-[13px] text-danger-soft backdrop-blur-md lg:inset-x-auto lg:left-1/2 lg:w-[420px] lg:-translate-x-1/2 lg:top-[100px]">
            {stations.error}
          </p>
        )}

        {/* Offset desktop = padding kanan (46) + lebar panel (366) + gap (26). */}
        <div className="absolute right-3 bottom-3 z-[1000] flex flex-col items-end gap-3 lg:right-[438px] lg:bottom-[30px]">
          {slots.data && slots.data.length > 0 && (
            <SlotSelector slots={slots.data} value={slot} onChange={setSlot} />
          )}
          <MapControls map={map} basemap={basemap} onBasemapChange={setBasemap} />
        </div>
      </div>

      <div className="relative flex flex-col gap-4 px-4 py-4 sm:px-6 lg:pointer-events-none lg:absolute lg:z-[1000] lg:inset-0 lg:flex-row lg:justify-end lg:gap-[26px] lg:px-[46px] lg:pt-[114px] lg:pb-[30px]">
        {chatOpen ? (
          <div className="animate-rise-in pointer-events-auto lg:mr-auto">
            <AssistantPanel
              stationId={stationId}
              onClose={() => setChatOpen(false)}
              className="h-[380px] lg:h-[467px] lg:w-[303px]"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="animate-rise-in pointer-events-auto flex items-center gap-2.5 self-start rounded-[12px] border border-mist-400/40 bg-navy-900/90 px-4 py-3 text-[14px] text-mist-100 backdrop-blur-md transition-colors hover:text-white lg:mr-auto lg:self-end"
          >
            <Headset className="size-[17px] text-brand-cyan" strokeWidth={1.8} />
            Tanya Lumina AI
          </button>
        )}

        <div className="animate-rise-in pointer-events-auto [animation-delay:100ms]">
          <StationPanel
            station={station.data}
            loading={station.loading}
            error={station.error}
            slot={slot}
            activeAmenityId={null}
            onSelectAmenity={() => setChatOpen(true)}
          />
        </div>
      </div>
    </div>
  )
}

export default Explore
