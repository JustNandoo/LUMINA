import { useState } from 'react'
import TopBar from '../../../components/layout/TopBar'
import PlanTripPanel from './PlanTripPanel'
import TripDetailPanel from './TripDetailPanel'
import { useApi } from '../../../hooks/useApi'
import { fetchStations } from '../../../lib/geoApi'
import { planTrip } from '../../../lib/tripsApi'

const DEFAULT_ORIGIN = 'manggarai'
const DEFAULT_DESTINATION = 'sudirman'

function Home() {
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN)
  const [destination, setDestination] = useState(DEFAULT_DESTINATION)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  const stations = useApi(() => fetchStations(), [])
  const trip = useApi(
    () => planTrip({ origin, destination }),
    [origin, destination],
    // Backend menolak asal == tujuan, jadi jangan kirim requestnya sama sekali.
    { enabled: origin !== destination },
  )

  const plan = trip.data?.plan ?? null

  // Pilihan ditentukan saat render, bukan lewat effect: begitu rencana baru
  // datang, id lama tidak lagi cocok dan pilihan jatuh sendiri ke slot yang
  // paling lengang — saran yang memang ingin ditonjolkan halaman ini.
  const selectedRoute =
    plan?.options.find((option) => option.id === selectedRouteId) ??
    plan?.options.find((option) => option.id === plan.recommendation.option_id) ??
    plan?.options[0] ??
    null

  const swap = () => {
    setOrigin(destination)
    setDestination(origin)
  }

  return (
    <div className="px-5 pt-6 pb-10 sm:px-8 lg:px-[52px] lg:pt-[38px] lg:pb-[40px]">
      <div className="animate-rise-in relative z-30">
        <TopBar searchPlaceholder="Search stations or areas..." />
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:mt-[34px] lg:flex-row lg:items-start lg:gap-[26px]">
        <div className="animate-rise-in [animation-delay:80ms]">
          <PlanTripPanel
            stations={stations.data ?? []}
            origin={origin}
            destination={destination}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onSwap={swap}
            options={plan?.options ?? []}
            selectedRouteId={selectedRoute?.id ?? null}
            onSelectRoute={setSelectedRouteId}
            loading={trip.loading || stations.loading}
            error={
              origin === destination
                ? 'Stasiun tujuan harus berbeda dari stasiun asal.'
                : (trip.error ?? stations.error)
            }
          />
        </div>

        <div className="animate-rise-in min-w-0 flex-1 [animation-delay:160ms]">
          {plan && selectedRoute ? (
            <TripDetailPanel
              plan={plan}
              route={selectedRoute}
              onUseSuggestion={() => setSelectedRouteId(plan.recommendation.option_id)}
            />
          ) : (
            <div className="h-[420px] animate-pulse rounded-[14px] border border-navy-700/50 bg-navy-950" />
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
