import { useState } from 'react'
import type { Map as MapLibreInstance } from 'maplibre-gl'
import { BarChart3, Headset } from 'lucide-react'
import TopBar from '../../../components/layout/TopBar'
import MapControls from '../../../components/map/MapControls'
import SlotSelector from '../../../components/map/SlotSelector'
import AssistantPanel from '../../../components/assistant/AssistantPanel'
import ComparePanel from './ComparePanel'
import LayerPanel from './LayerPanel'
import StationMap from './StationMap'
import StationPanel from './StationPanel'
import { useApi } from '../../../hooks/useApi'
import {
  fetchDensityCells,
  fetchNetwork,
  fetchStation,
  fetchStations,
  fetchTimeSlots,
} from '../../../lib/geoApi'
import type { SlotId } from '../../../lib/geoApi'
import type { MapLayers } from './StationMap'
import type { MapidStyle } from '../../../lib/mapidMap'

const DEFAULT_STATION = 'manggarai'
const DEFAULT_SLOT: SlotId = 'evening'

function Explore() {
  const [map, setMap] = useState<MapLibreInstance | null>(null)
  const [basemap, setBasemap] = useState<MapidStyle>('light')
  const [slot, setSlot] = useState<SlotId>(DEFAULT_SLOT)
  const [stationId, setStationId] = useState(DEFAULT_STATION)
  const [chatOpen, setChatOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [layers, setLayers] = useState<MapLayers>({
    density: true,
    network: true,
    corridor: true,
    stations: true,
  })

  const slots = useApi(() => fetchTimeSlots(), [])
  const stations = useApi(() => fetchStations({ slot }), [slot])
  const station = useApi(() => fetchStation(stationId), [stationId])
  const network = useApi(() => fetchNetwork(), [])
  // Sel hanya ditarik saat layernya menyala — 300-an titik per slot tidak
  // perlu diambil kalau pengguna mematikan heatmap-nya.
  const cells = useApi(() => fetchDensityCells(slot), [slot], {
    enabled: layers.density,
  })

  const slotLabel = slots.data?.find((item) => item.id === slot)?.label ?? slot
  const corridorIds = (stations.data ?? [])
    .filter((item) => item.calibrated)
    .map((item) => item.id)
  const selectedSummary =
    stations.data?.find((item) => item.id === stationId) ?? null

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
          cells={layers.density ? (cells.data ?? []) : []}
          network={network.data}
          layers={layers}
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
        {/* Satu kolom untuk seluruh panel kiri: layer di atas, banding dan
            chat di bawah. Sebelumnya layer dipasang terpisah di atas peta dan
            tertutup panel banding, sehingga tombolnya tidak bisa diklik. */}
        <div className="flex flex-col gap-3 lg:mr-auto lg:min-h-0 lg:items-start lg:justify-between">
          <div className="pointer-events-auto shrink-0">
            <LayerPanel layers={layers} onChange={setLayers} />
          </div>

          <div className="flex flex-col gap-3 lg:min-h-0 lg:items-start">
          {compareOpen ? (
            <div className="animate-rise-in pointer-events-auto">
              <ComparePanel
                slot={slot}
                slotLabel={slotLabel}
                selected={selectedSummary}
                corridorIds={corridorIds}
                onClose={() => setCompareOpen(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="animate-rise-in pointer-events-auto flex items-center gap-2.5 rounded-[12px] border border-mist-400/40 bg-navy-900/90 px-4 py-3 text-[14px] text-mist-100 backdrop-blur-md transition-colors hover:text-white"
            >
              <BarChart3 className="size-[17px] text-brand-cyan" strokeWidth={1.8} />
              Banding stasiun
            </button>
          )}

          {chatOpen ? (
            <div className="animate-rise-in pointer-events-auto">
              <AssistantPanel
                stationId={stationId}
                onClose={() => setChatOpen(false)}
                className="h-[380px] lg:h-[400px] lg:w-[303px]"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="animate-rise-in pointer-events-auto flex items-center gap-2.5 rounded-[12px] border border-mist-400/40 bg-navy-900/90 px-4 py-3 text-[14px] text-mist-100 backdrop-blur-md transition-colors hover:text-white"
            >
              <Headset className="size-[17px] text-brand-cyan" strokeWidth={1.8} />
              Tanya Lumina AI
            </button>
          )}
          </div>
        </div>

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
