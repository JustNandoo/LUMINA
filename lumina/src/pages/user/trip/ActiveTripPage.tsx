import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  CircleStop,
  Flag,
  MapPin,
  Pause,
  Play,
  Plus,
  Repeat,
  Store,
  Trash2,
  TrainFront,
  Undo2,
} from 'lucide-react'
import TopBar from '../../../components/layout/TopBar'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'
import AddStopPanel from './AddStopPanel'
import TripMap from './TripMap'
import { useActiveTrip } from '../../../hooks/useActiveTrip'
import {
  addStop,
  advance,
  endTrip,
  removeStop,
  rewind,
  toggleStopDone,
  updateTrip,
} from '../../../lib/activeTrip'
import { formatRupiah } from '../../../lib/crowdTone'
import type { NearbyPlace } from '../../../lib/tripsApi'

/** Lama perjalanan berjalan, dihitung ulang tiap detik. */
function useElapsed(startedAt: string, running: boolean) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [running])

  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function EmptyState() {
  return (
    <div className="px-5 pt-6 pb-10 sm:px-8 lg:px-[52px] lg:pt-[38px]">
      <div className="animate-rise-in relative z-30">
        <TopBar showSearch={false} />
      </div>
      <div className="animate-rise-in mt-10 flex flex-col items-center rounded-[14px] border border-navy-700/50 bg-navy-950 px-6 py-16 text-center">
        <TrainFront className="size-10 text-mist-400" strokeWidth={1.4} />
        <h1 className="mt-4 text-[22px] font-bold text-white">
          Belum ada perjalanan berjalan
        </h1>
        <p className="mt-2 max-w-[420px] text-[14px] leading-[1.6] text-mist-400">
          Susun rute di beranda lalu tekan “Mulai perjalanan” untuk membuka
          panduan langkah demi langkah beserta tempat singgah di tiap stasiun.
        </p>
        <Link
          to="/app/home"
          className="mt-6 flex items-center gap-2.5 rounded-[12px] bg-brand-cyan px-6 py-3 text-[15px] font-semibold text-navy-900 transition-colors hover:brightness-110"
        >
          <ArrowLeft className="size-[18px]" strokeWidth={2} />
          Rencanakan perjalanan
        </Link>
      </div>
    </div>
  )
}

function ActiveTripPage() {
  const trip = useActiveTrip()
  const navigate = useNavigate()
  const [stopPickerFor, setStopPickerFor] = useState<string | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)

  const elapsed = useElapsed(trip?.startedAt ?? new Date().toISOString(), trip?.status === 'running')

  if (!trip) return <EmptyState />

  const { plan, route, progressIndex, status, stops } = trip
  const path = plan.path
  const isLast = progressIndex >= path.length - 1
  const pickerStation = path.find((station) => station.id === stopPickerFor) ?? null

  const transferIds = new Set(plan.transfers.map((item) => item.station_id))
  const lineOf = new Map<string, string>()
  for (const segment of plan.segments) {
    for (const station of segment.stations) lineOf.set(station.id, segment.line)
  }

  const stopsAt = (stationId: string) =>
    stops.filter((stop) => stop.stationId === stationId)

  const finish = () => {
    endTrip()
    navigate('/app/home')
  }

  return (
    <div className="px-5 pt-6 pb-10 sm:px-8 lg:px-[52px] lg:pt-[38px] lg:pb-[40px]">
      <div className="animate-rise-in relative z-30">
        <TopBar showSearch={false} />
      </div>

      {/* --- Kepala: status & kendali --- */}
      <div className="animate-rise-in mt-6 flex flex-col gap-4 rounded-[14px] border border-navy-700/50 bg-navy-950 px-5 py-5 sm:px-7 lg:mt-[34px] lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2.5 text-[13px] text-mist-400">
            <span
              className={`size-2 shrink-0 rounded-full ${
                status === 'running' ? 'animate-pulse bg-brand-cyan' : 'bg-warning-soft'
              }`}
            />
            {status === 'running' ? 'Perjalanan berjalan' : 'Perjalanan dijeda'}
            <span className="text-mist-400">·</span>
            <span className="tabular-nums text-mist-200">{elapsed}</span>
          </p>
          <h1 className="mt-1.5 truncate text-[22px] font-bold text-white sm:text-[26px]">
            {plan.origin.name} <span className="text-mist-400">→</span>{' '}
            {plan.destination.name}
          </h1>
          <p className="mt-1 text-[13px] text-mist-400">
            Perhentian {progressIndex} dari {path.length - 1} · {route.slot_label} ·{' '}
            {formatRupiah(route.fare)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() =>
              updateTrip({ status: status === 'running' ? 'paused' : 'running' })
            }
            className="flex items-center gap-2 rounded-[12px] border border-navy-700 bg-navy-900/60 px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-navy-800"
          >
            {status === 'running' ? (
              <>
                <Pause className="size-[17px]" strokeWidth={2} />
                Jeda
              </>
            ) : (
              <>
                <Play className="size-[17px]" strokeWidth={2} />
                Lanjutkan
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setConfirmEnd(true)}
            className="flex items-center gap-2 rounded-[12px] border border-danger/40 bg-danger/10 px-5 py-3 text-[14px] font-medium text-danger-soft transition-colors hover:bg-danger/20"
          >
            <CircleStop className="size-[17px]" strokeWidth={2} />
            Akhiri
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:gap-[26px]">
        {/* --- Daftar stasiun & progres --- */}
        <section className="w-full lg:w-[430px] lg:shrink-0 xl:w-[480px]">
          <div className="rounded-[14px] border border-navy-700/50 bg-navy-950 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-bold text-white">Urutan stasiun</h2>
              <span className="text-[12px] text-mist-400">
                {path.length} stasiun
              </span>
            </div>

            <ol className="mt-4 flex flex-col">
              {path.map((station, index) => {
                const passed = index < progressIndex
                const isCurrent = index === progressIndex
                const stationStops = stopsAt(station.id)

                return (
                  <li
                    key={station.id}
                    className={`relative border-l-2 pb-4 pl-5 last:pb-0 ${
                      passed || isCurrent ? 'border-brand-cyan' : 'border-navy-700'
                    }`}
                  >
                    {/* Bulatan penanda posisi pada garis waktu. */}
                    <span
                      className={`absolute -left-[7px] top-1 size-3 rounded-full border-2 ${
                        isCurrent
                          ? 'border-brand-cyan bg-white'
                          : passed
                            ? 'border-brand-cyan bg-brand-cyan'
                            : 'border-navy-700 bg-navy-950'
                      }`}
                    />

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={`text-[15px] ${
                            isCurrent
                              ? 'font-semibold text-white'
                              : passed
                                ? 'text-mist-200'
                                : 'text-mist-400'
                          }`}
                        >
                          {station.name}
                          {index === 0 && ' · berangkat'}
                          {index === path.length - 1 && ' · tujuan'}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-mist-400">
                          {transferIds.has(station.id) ? (
                            <>
                              <Repeat className="size-3 shrink-0 text-warning-soft" strokeWidth={2} />
                              Transit ke Lin {lineOf.get(station.id)}
                            </>
                          ) : (
                            <>Lin {lineOf.get(station.id) ?? '—'}</>
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setStopPickerFor(
                            stopPickerFor === station.id ? null : station.id,
                          )
                        }
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-navy-700 px-2.5 py-1 text-[11px] text-mist-200 transition-colors hover:border-brand-cyan/50 hover:text-white"
                      >
                        <Plus className="size-3" strokeWidth={2.4} />
                        Singgah
                      </button>
                    </div>

                    {stationStops.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {stationStops.map((stop) => (
                          <li
                            key={stop.place.id}
                            className="flex items-center gap-2 rounded-lg bg-navy-800/60 px-2.5 py-1.5"
                          >
                            <button
                              type="button"
                              onClick={() => toggleStopDone(stop.place.id)}
                              aria-label={
                                stop.done ? 'Tandai belum mampir' : 'Tandai sudah mampir'
                              }
                              className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                stop.done
                                  ? 'border-brand-cyan bg-brand-cyan text-navy-900'
                                  : 'border-mist-400/60 text-transparent hover:border-brand-cyan'
                              }`}
                            >
                              <Check className="size-3" strokeWidth={3} />
                            </button>
                            <span
                              className={`min-w-0 flex-1 truncate text-[12px] ${
                                stop.done ? 'text-mist-400 line-through' : 'text-mist-100'
                              }`}
                            >
                              {stop.place.name}
                              <span className="text-mist-400">
                                {' '}
                                · {stop.place.walk_minutes} mnt
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeStop(stop.place.id)}
                              aria-label={`Hapus singgah ${stop.place.name}`}
                              className="shrink-0 text-mist-400 transition-colors hover:text-danger"
                            >
                              <Trash2 className="size-3.5" strokeWidth={1.8} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ol>

            {/* --- Kendali maju-mundur perhentian --- */}
            <div className="mt-5 flex flex-col gap-2.5 border-t border-navy-700/40 pt-5 sm:flex-row">
              <button
                type="button"
                onClick={() => rewind()}
                disabled={progressIndex === 0}
                className="flex items-center justify-center gap-2 rounded-[12px] border border-navy-700 px-4 py-3 text-[14px] font-medium text-mist-200 transition-colors hover:bg-navy-800 hover:text-white disabled:opacity-40"
              >
                <Undo2 className="size-[16px]" strokeWidth={1.8} />
                Mundur
              </button>

              {isLast ? (
                <button
                  type="button"
                  onClick={() => setConfirmEnd(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-brand-cyan py-3 text-[14px] font-semibold text-navy-900 transition-colors hover:brightness-110"
                >
                  <Flag className="size-[17px]" strokeWidth={2} />
                  Selesaikan perjalanan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => advance()}
                  disabled={status !== 'running'}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-brand-cyan py-3 text-[14px] font-semibold text-navy-900 transition-colors hover:brightness-110 disabled:opacity-40"
                >
                  <MapPin className="size-[17px]" strokeWidth={2} />
                  Sampai di {path[progressIndex + 1]?.name}
                </button>
              )}
            </div>

            {status !== 'running' && (
              <p className="mt-3 text-center text-[12px] text-warning-soft">
                Perjalanan dijeda — lanjutkan dulu untuk menandai perhentian.
              </p>
            )}
          </div>
        </section>

        {/* --- Peta & daftar tempat --- */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <TripMap
            trip={trip}
            className="h-[300px] rounded-[14px] border border-navy-700/50 sm:h-[360px]"
          />

          {pickerStation ? (
            <AddStopPanel
              stationId={pickerStation.id}
              stationName={pickerStation.name}
              addedPlaceIds={stops.map((stop) => stop.place.id)}
              onAdd={(place: NearbyPlace) => addStop(pickerStation.id, place)}
              onClose={() => setStopPickerFor(null)}
            />
          ) : (
            <section className="rounded-[14px] border border-navy-700/50 bg-navy-950 px-5 py-5 sm:px-7">
              <h2 className="flex items-center gap-2.5 text-[17px] font-bold text-white">
                <Store className="size-[18px] text-mist-100" strokeWidth={1.8} />
                Singgahan
                <span className="text-[13px] font-normal text-mist-400">
                  {stops.length} tempat
                </span>
              </h2>

              {stops.length === 0 ? (
                <p className="mt-3 text-[13px] leading-[1.6] text-mist-400">
                  Belum ada singgahan. Tekan “Singgah” pada stasiun mana pun di
                  daftar untuk melihat UMKM dan toko di sekitarnya.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2.5">
                  {stops.map((stop) => (
                    <li
                      key={stop.place.id}
                      className="flex items-start justify-between gap-3 rounded-[10px] border border-navy-700/50 bg-navy-800/40 px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <p
                          className={`text-[14px] ${
                            stop.done ? 'text-mist-400 line-through' : 'text-white'
                          }`}
                        >
                          {stop.place.name}
                        </p>
                        <p className="mt-0.5 text-[12px] text-mist-400">
                          {stop.place.category} · {stop.place.station_name} ·{' '}
                          {stop.place.distance_m} m
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleStopDone(stop.place.id)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          stop.done
                            ? 'bg-brand-cyan/15 text-brand-cyan'
                            : 'bg-navy-700 text-white hover:bg-navy-700/70'
                        }`}
                      >
                        {stop.done ? 'Sudah mampir' : 'Tandai mampir'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmEnd}
        title="Akhiri perjalanan?"
        description={
          <>
            Progres perhentian dan {stops.length} singgahan pada perjalanan{' '}
            <strong className="text-white">
              {plan.origin.name} → {plan.destination.name}
            </strong>{' '}
            akan dihapus.
          </>
        }
        confirmLabel="Akhiri"
        tone="danger"
        onConfirm={finish}
        onCancel={() => setConfirmEnd(false)}
      />
    </div>
  )
}

export default ActiveTripPage
