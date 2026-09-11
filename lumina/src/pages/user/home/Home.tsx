import { useState } from 'react'
import TopBar from '../../../components/layout/TopBar'
import PlanTripPanel from './PlanTripPanel'
import TripDetailPanel from './TripDetailPanel'
import { routeOptions } from './tripData'

// Mulai dari keberangkatan yang padat, supaya saran "Use this time" di peta
// benar-benar memindahkan pilihan ke slot yang lebih lengang.
const initialRoute =
  routeOptions.find((route) => !route.recommended) ?? routeOptions[0]

function Home() {
  const [origin, setOrigin] = useState('Manggarai')
  const [destination, setDestination] = useState('Sudirman')
  const [departureTime, setDepartureTime] = useState(
    `${initialRoute.departure} WIB`,
  )
  const [activeFilter, setActiveFilter] = useState('Fastest')
  const [selectedRouteId, setSelectedRouteId] = useState(initialRoute.id)

  const selectedRoute =
    routeOptions.find((route) => route.id === selectedRouteId) ??
    routeOptions[0]
  const recommendedRoute =
    routeOptions.find((route) => route.recommended) ?? routeOptions[0]

  return (
    <div className="px-5 pt-6 pb-10 sm:px-8 lg:px-[52px] lg:pt-[38px] lg:pb-[40px]">
      <div className="animate-rise-in relative z-30">
        <TopBar searchPlaceholder="Search stations or areas..." />
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:mt-[34px] lg:flex-row lg:items-start lg:gap-[26px]">
        <div className="animate-rise-in [animation-delay:80ms]">
          <PlanTripPanel
            origin={origin}
            destination={destination}
            departureTime={departureTime}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
            onSwap={() => {
              setOrigin(destination)
              setDestination(origin)
            }}
          />
        </div>

        <div className="animate-rise-in min-w-0 flex-1 [animation-delay:160ms]">
          <TripDetailPanel
            origin={origin}
            destination={destination}
            route={selectedRoute}
            suggestedDeparture={recommendedRoute.departure}
            onUseSuggestedTime={() => {
              setSelectedRouteId(recommendedRoute.id)
              setDepartureTime(`${recommendedRoute.departure} WIB`)
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default Home
