import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, MapPin, Route, TrainFront } from 'lucide-react'
import TopBar from '../../../components/layout/TopBar'
import PlanTripPanel from './PlanTripPanel'
import TripDetailPanel from './TripDetailPanel'
import SavedRoutes from './SavedRoutes'
import { errorMessage, useApi } from '../../../hooks/useApi'
import { useActiveTrip } from '../../../hooks/useActiveTrip'
import { startTrip } from '../../../lib/activeTrip'
import { fetchStations } from '../../../lib/geoApi'
import { deleteSavedRoute, fetchSavedRoutes, planTrip, saveRoute } from '../../../lib/tripsApi'
import type { SavedRoute } from '../../../lib/tripsApi'

/** Ditampilkan sebelum pengguna memilih asal dan tujuan. */
function TripEmptyState({ hasOrigin }: { hasOrigin: boolean }) {
  return (
    <section className="flex min-h-[420px] flex-col items-center justify-center rounded-[14px] border border-dashed border-navy-700 bg-navy-950 px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-cyan/10">
        <Route className="size-7 text-brand-cyan" strokeWidth={1.6} />
      </span>

      <h2 className="mt-5 text-[20px] font-bold text-white">
        {hasOrigin ? 'Tinggal pilih tujuannya' : 'Mau berangkat dari mana?'}
      </h2>
      <p className="mt-2 max-w-[380px] text-[14px] leading-[1.6] text-mist-400">
        {hasOrigin
          ? 'Isi stasiun tujuan di sebelah kiri. Jalur kereta, titik transit, dan slot waktu paling lengang akan langsung dihitung.'
          : 'Ketik stasiun keberangkatan dan tujuan di sebelah kiri. LUMINA mencari jalurnya sendiri, termasuk stasiun yang dilewati dan tempat transitnya.'}
      </p>

      <ul className="mt-6 flex flex-col gap-2 text-[13px] text-mist-200">
        <li className="flex items-center gap-2.5">
          <MapPin className="size-4 shrink-0 text-mist-400" strokeWidth={1.8} />
          Lintasan lengkap beserta stasiun yang dilewati
        </li>
        <li className="flex items-center gap-2.5">
          <TrainFront className="size-4 shrink-0 text-mist-400" strokeWidth={1.8} />
          Indeks kepadatan per slot waktu di stasiun asal
        </li>
      </ul>
    </section>
  )
}

function Home() {
  const navigate = useNavigate()
  const activeTrip = useActiveTrip()

  // Sengaja kosong saat pertama masuk: perjalanan adalah milik pengguna, dan
  // menebakkan tujuan membuat halaman terlihat seolah sudah memutuskan
  // sesuatu yang belum pernah diminta.
  // Pengecualiannya tombol "Rencanakan di Home" dari Lumina AI, yang membawa
  // ?origin=&destination= — rutenya langsung dihitung tanpa perlu diketik ulang.
  const [searchParams, setSearchParams] = useSearchParams()
  const [origin, setOrigin] = useState(() => searchParams.get('origin') ?? '')
  const [destination, setDestination] = useState(() => searchParams.get('destination') ?? '')

  // Parameternya dibersihkan dari URL begitu dibaca, supaya refresh tidak
  // mengembalikan rute dari chat setelah pengguna menggantinya sendiri.
  useEffect(() => {
    if (searchParams.has('origin') || searchParams.has('destination')) {
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  const ready = Boolean(origin) && Boolean(destination) && origin !== destination

  const stations = useApi(() => fetchStations(), [])
  const trip = useApi(
    () => planTrip({ origin, destination }),
    [origin, destination],
    // Jangan menembak API sebelum kedua stasiun dipilih; backend juga menolak
    // asal yang sama dengan tujuan.
    { enabled: ready },
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

  // ---------------------------------------------------------- rute tersimpan
  const savedApi = useApi(() => fetchSavedRoutes(), [])
  // Setelah pengguna menyimpan atau menghapus, daftar lokal menjadi sumber
  // kebenaran: tombol dan daftar langsung berubah tanpa menunggu muat ulang.
  const [savedOverride, setSavedOverride] = useState<SavedRoute[] | null>(null)
  const savedRoutes = savedOverride ?? savedApi.data ?? []
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const savedEntry = plan
    ? (savedRoutes.find(
        (item) =>
          item.origin_id === plan.origin.id && item.destination_id === plan.destination.id,
      ) ?? null)
    : null

  const removeSaved = async (route: SavedRoute) => {
    setSaveError(null)
    try {
      await deleteSavedRoute(route.id)
      setSavedOverride((current) =>
        (current ?? savedApi.data ?? []).filter((item) => item.id !== route.id),
      )
    } catch (caught) {
      setSaveError(errorMessage(caught))
    }
  }

  const toggleSave = async () => {
    if (!plan || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      if (savedEntry) {
        await deleteSavedRoute(savedEntry.id)
        setSavedOverride((current) =>
          (current ?? savedApi.data ?? []).filter((item) => item.id !== savedEntry.id),
        )
      } else {
        const created = await saveRoute({
          originId: plan.origin.id,
          destinationId: plan.destination.id,
          slotId: selectedRoute?.slot_id,
        })
        setSavedOverride((current) => [
          created,
          ...(current ?? savedApi.data ?? []).filter((item) => item.id !== created.id),
        ])
      }
    } catch (caught) {
      setSaveError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  const openSaved = (route: SavedRoute) => {
    setOrigin(route.origin_id)
    setDestination(route.destination_id)
    setSelectedRouteId(route.slot_id ? `route-${route.slot_id}` : null)
  }

  const start = () => {
    if (!plan || !selectedRoute) return
    startTrip(plan, selectedRoute)
    navigate('/app/trip')
  }

  return (
    <div className="px-5 pt-6 pb-10 sm:px-8 lg:px-[52px] lg:pt-[38px] lg:pb-[40px]">
      <div className="animate-rise-in relative z-30">
        <TopBar
          searchPlaceholder="Search stations or areas..."
          stations={stations.data ?? []}
          searchLoading={stations.loading}
        />
      </div>

      {/* Perjalanan yang sedang berjalan tidak boleh hilang begitu saja saat
          pengguna kembali ke beranda. */}
      {activeTrip && (
        <Link
          to="/app/trip"
          className="animate-rise-in mt-5 flex items-center justify-between gap-4 rounded-[14px] border border-brand-cyan/40 bg-brand-cyan/10 px-5 py-4 transition-colors hover:bg-brand-cyan/15"
        >
          <span className="flex min-w-0 items-center gap-3">
            <TrainFront className="size-5 shrink-0 text-brand-cyan" strokeWidth={1.8} />
            <span className="min-w-0">
              <span className="block text-[14px] font-medium text-white">
                {activeTrip.plan.origin.name} → {activeTrip.plan.destination.name}
              </span>
              <span className="block text-[12px] text-mist-200">
                {activeTrip.status === 'running' ? 'Sedang berjalan' : 'Dijeda'} ·
                perhentian {activeTrip.progressIndex} dari{' '}
                {activeTrip.plan.path.length - 1}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-brand-cyan">
            Buka
            <ArrowRight className="size-4" strokeWidth={2} />
          </span>
        </Link>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:mt-[34px] lg:flex-row lg:items-start lg:gap-[26px]">
        <div className="animate-rise-in [animation-delay:80ms]">
          <PlanTripPanel
            stations={stations.data ?? []}
            origin={origin}
            destination={destination}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onSwap={swap}
            plan={plan}
            selectedRouteId={selectedRoute?.id ?? null}
            onSelectRoute={setSelectedRouteId}
            savedRoutes={
              <SavedRoutes
                routes={savedRoutes}
                activeKey={plan ? `${plan.origin.id}->${plan.destination.id}` : null}
                onOpen={openSaved}
                onRemove={removeSaved}
              />
            }
            loading={trip.loading || stations.loading}
            error={
              origin && destination && origin === destination
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
              onStartTrip={start}
              saved={Boolean(savedEntry)}
              saving={saving}
              saveError={saveError}
              onToggleSave={toggleSave}
            />
          ) : ready ? (
            <div className="h-[420px] animate-pulse rounded-[14px] border border-navy-700/50 bg-navy-950" />
          ) : (
            <TripEmptyState hasOrigin={Boolean(origin)} />
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
