import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Map as MapLibreInstance } from 'maplibre-gl'
import AnalysisFilterPanel from './AnalysisFilterPanel'
import AreaDetailPanel from './AreaDetailPanel'
import AssistantPanel from '../../../components/assistant/AssistantPanel'
import MapCanvas from './MapCanvas'
import MapControls from '../../../components/map/MapControls'
import TopBar from '../../../components/layout/TopBar'
import { useApi } from '../../../hooks/useApi'
import {
  fetchArea,
  fetchBusinessCategories,
  fetchHeatmap,
} from '../../../lib/businessApi'
import type { AreaFilters } from './AnalysisFilterPanel'
import type { MapidStyle } from '../../../lib/mapidMap'

const DEFAULT_AREA = 'manggarai'

function BusinessPotential() {
  const [chatOpen, setChatOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(true)
  const [map, setMap] = useState<MapLibreInstance | null>(null)
  const [basemap, setBasemap] = useState<MapidStyle>('light')
  // Lumina AI di halaman lain membuka kawasan lewat ?area=<id>.
  const [searchParams] = useSearchParams()
  const [areaId, setAreaId] = useState<string>(() => searchParams.get('area') || DEFAULT_AREA)
  const [filters, setFilters] = useState<AreaFilters>({
    minScore: 0,
    maxRisk: 100,
    categories: [],
  })

  const catalog = useApi(() => fetchBusinessCategories(), [])
  const heatmap = useApi(() => fetchHeatmap(), [])

  // Filter ambang diterapkan di klien supaya menggeser slider terasa langsung;
  // daftar kawasannya kecil, jadi tidak perlu bolak-balik ke server.
  const visiblePoints = (heatmap.data ?? []).filter(
    (point) =>
      point.score >= filters.minScore && point.risk_index <= filters.maxRisk,
  )

  // Kalau kawasan terpilih tersaring keluar, panel detail jatuh ke kawasan
  // pertama yang masih lolos. Ditentukan saat render, bukan lewat effect,
  // supaya tidak ada render berantai setiap slider digeser.
  const visibleAreaId =
    visiblePoints.some((point) => point.id === areaId)
      ? areaId
      : (visiblePoints[0]?.id ?? areaId)

  const area = useApi(() => fetchArea(visibleAreaId), [visibleAreaId])

  // Dipakai searchbar dan Lumina AI. Kawasan yang sedang tersaring keluar tetap
  // harus bisa dibuka: ambangnya dikembalikan supaya pilihan itu benar-benar
  // tampil, bukan diam-diam diganti kawasan lain oleh fallback di atas.
  const focusArea = (id: string) => {
    const point = heatmap.data?.find((entry) => entry.id === id)
    if (point && (point.score < filters.minScore || point.risk_index > filters.maxRisk)) {
      setFilters((current) => ({ ...current, minScore: 0, maxRisk: 100 }))
    }
    setAreaId(id)
    setDetailOpen(true)
  }

  return (
    <div className="flex flex-col px-4 pt-5 pb-6 sm:px-8 lg:h-svh lg:px-[52px] lg:pt-[38px] lg:pb-[30px]">
      <div className="animate-rise-in relative z-30">
        <TopBar
          searchPlaceholder="Search stations or areas..."
          onSelectStation={(item) => focusArea(item.id)}
        />
      </div>

      <div className="mt-6 flex flex-col gap-5 lg:mt-[36px] lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-[26px]">
        <div className="animate-rise-in [animation-delay:100ms] lg:min-h-0 lg:overflow-y-auto">
          <AnalysisFilterPanel
            catalog={catalog.data ?? []}
            filters={filters}
            onChange={setFilters}
            areaCategories={area.data?.categories ?? []}
            resultCount={visiblePoints.length}
            loading={heatmap.loading}
          />
        </div>

        <div className="relative order-last h-[300px] min-w-0 overflow-hidden rounded-[14px] lg:order-none lg:h-auto lg:flex-1 lg:overflow-visible lg:rounded-none">
          <MapCanvas
            points={visiblePoints}
            basemap={basemap}
            selectedAreaId={visibleAreaId}
            onReady={setMap}
            onSelectArea={(id) => {
              setAreaId(id)
              setDetailOpen(true)
            }}
          />

          {heatmap.error && (
            <p className="absolute inset-x-4 top-4 z-[1000] rounded-lg bg-danger/15 px-4 py-3 text-center text-[13px] text-danger-soft backdrop-blur-md">
              {heatmap.error}
            </p>
          )}

          <div className="absolute right-3 bottom-3 z-[1000]">
            <MapControls map={map} basemap={basemap} onBasemapChange={setBasemap} />
          </div>

          {/* Di HP kotak peta hanya 300px dan memotong isinya, sehingga chat
              setinggi 420px kehilangan judul dan tombol tutupnya. Di sana chat
              melayang di atas bar navigasi bawah; di laptop tetap di pojok peta. */}
          {chatOpen && (
            <div className="animate-rise-in fixed inset-x-3 bottom-[84px] z-[2100] lg:absolute lg:inset-x-auto lg:bottom-3 lg:left-3 lg:z-[1000] lg:w-[303px]">
              <AssistantPanel
                areaId={visibleAreaId}
                onClose={() => setChatOpen(false)}
                onOpenArea={(id) => {
                  focusArea(id)
                  setChatOpen(false)
                }}
                className="h-[min(420px,calc(100svh-120px))] lg:h-[420px]"
              />
            </div>
          )}
        </div>

        {detailOpen && (
          <div className="animate-rise-in [animation-delay:160ms] lg:min-h-0">
            <AreaDetailPanel
              area={area.data}
              loading={area.loading}
              error={area.error}
              onClose={() => setDetailOpen(false)}
              onOpenChat={() => setChatOpen(true)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default BusinessPotential
