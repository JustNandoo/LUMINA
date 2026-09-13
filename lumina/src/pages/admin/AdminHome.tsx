import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import AdminShell from './AdminShell'
import AdminStatus from './AdminStatus'
import { ColumnChart, Meter, SegmentBar } from './dashboardVisuals'
import { useApi } from '../../hooks/useApi'
import { fetchSummary, fetchSurveyPoints } from '../../lib/adminApi'
import { fetchHeatmap } from '../../lib/businessApi'
import { compareStationProfiles, fetchStations } from '../../lib/geoApi'

function statusOf(value: number) {
  if (value >= 70) return { label: 'PADAT', className: 'text-warning-soft' }
  if (value >= 45) return { label: 'SEDANG', className: 'text-mist-200' }
  return { label: 'LENGANG', className: 'text-mist-400' }
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

const Label = ({ children }: { children: ReactNode }) => (
  <p className="text-[10px] tracking-[0.18em] text-mist-400 uppercase">{children}</p>
)

function AdminHome() {
  const now = useClock()

  const summary = useApi(() => fetchSummary(), [])
  const heatmap = useApi(() => fetchHeatmap(), [])
  const pendingSurvey = useApi(() => fetchSurveyPoints({ status: 'on_review' }), [])
  const stationList = useApi(() => fetchStations(), [])
  const corridor = useApi(
    async () => {
      const stations = await fetchStations({ calibrated: true })
      if (stations.length < 2) return []
      return compareStationProfiles(stations.map((station) => station.id))
    },
    [],
  )

  const profiles = corridor.data ?? []

  // Rata-rata indeks per slot di koridor kalibrasi. Hanya tiga slot yang
  // tervalidasi survei, jadi grafiknya tiga batang — bukan kurva per jam yang
  // resolusinya tidak pernah kami punya.
  const slotAverages = (profiles[0]?.slots ?? []).map((slot, index) => {
    const total = profiles.reduce(
      (sum, profile) => sum + (profile.slots[index]?.index ?? 0),
      0,
    )
    return {
      label: slot.label,
      value: profiles.length ? Math.round(total / profiles.length) : 0,
    }
  })

  const peakIndex = slotAverages.length
    ? slotAverages.reduce(
        (best, item, index) =>
          item.value > slotAverages[best].value ? index : best,
        0,
      )
    : 0
  const peak = slotAverages[peakIndex]

  // Okupansi dibaca pada slot puncak, supaya tabel dan angka besar di atasnya
  // bercerita tentang waktu yang sama.
  const occupancy = profiles
    .map((profile) => ({
      id: profile.station_id,
      name: profile.station_name,
      value: profile.slots[peakIndex]?.index ?? 0,
    }))
    .sort((a, b) => b.value - a.value)

  const topAreas = [...(heatmap.data ?? [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)

  const survey = summary.data?.survey
  const pending = pendingSurvey.data?.items ?? []

  const ledger = [
    { label: 'Pengguna terdaftar', value: String(summary.data?.users.total ?? 0) },
    { label: 'Akun terverifikasi', value: String(summary.data?.users.verified ?? 0) },
    { label: 'Mitra B2B aktif', value: String(summary.data?.partners.active ?? 0) },
    {
      label: 'Langganan Commercial',
      value: String(summary.data?.subscriptions.commercial ?? 0),
    },
    { label: 'Titik peta terbit', value: String(summary.data?.map.published ?? 0) },
    { label: 'Layer peta', value: String(summary.data?.map.layers ?? 0) },
  ]

  return (
    <AdminShell>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-navy-700/60 pb-4">
        <div>
          <Label>Lumina · Operations</Label>
          <h1 className="mt-1.5 text-[26px] leading-none font-semibold text-white">
            Ringkasan Operasional
          </h1>
        </div>
        <p className="font-mono text-[13px] text-mist-400 tabular-nums">
          {now.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          <span className="mx-2 text-navy-700">/</span>
          <span className="text-white">
            {now.toLocaleTimeString('id-ID', { hour12: false })}
          </span>
          <span className="ml-1.5 text-mist-400">WIB</span>
        </p>
      </header>

      <AdminStatus
        loading={summary.loading}
        error={summary.error}
        errorCode={summary.errorCode}
        onRetry={summary.reload}
      />

      {/* Pernyataan utama + sebaran per slot */}
      <section className="grid grid-cols-1 gap-8 border-b border-navy-700/60 py-8 lg:grid-cols-[260px_1fr] lg:gap-12">
        <div>
          <Label>Indeks kepadatan puncak</Label>
          <p className="mt-3 font-mono text-[76px] leading-none font-semibold text-white tabular-nums">
            {peak?.value ?? '—'}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-mist-200">
            Rata-rata slot{' '}
            <span className="font-mono text-white">{peak?.label ?? '—'}</span> di{' '}
            {profiles.length} stasiun koridor kalibrasi. Skala indeks relatif
            0–100, bukan jumlah penumpang.
          </p>
        </div>

        <div>
          <Label>Sebaran per slot waktu</Label>
          <div className="mt-4">
            {slotAverages.length > 0 ? (
              <ColumnChart
                values={slotAverages.map((item) => item.value)}
                labels={slotAverages.map((item) => item.label)}
                peakIndex={peakIndex}
              />
            ) : (
              <p className="text-[13px] text-mist-400">Memuat sebaran…</p>
            )}
          </div>
        </div>
      </section>

      {/* Okupansi stasiun */}
      <section className="border-b border-navy-700/60 py-8">
        <div className="flex items-baseline justify-between">
          <Label>Okupansi koridor · slot {peak?.label ?? ''}</Label>
          <Link
            to="/admin/map"
            className="text-[12px] text-brand-cyan transition-colors hover:text-white"
          >
            Lihat di peta
          </Link>
        </div>

        <table className="mt-4 w-full">
          <tbody>
            {occupancy.map((station) => {
              const status = statusOf(station.value)
              return (
                <tr key={station.id} className="border-t border-navy-700/40 first:border-t-0">
                  <td className="w-[150px] py-2.5 text-[14px] text-white">
                    {station.name}
                  </td>
                  <td className="w-[56px] py-2.5 pr-4 text-right font-mono text-[14px] text-white tabular-nums">
                    {station.value}
                  </td>
                  <td className="py-2.5">
                    <Meter
                      value={station.value}
                      max={100}
                      tone={station.value >= 70 ? 'alert' : 'neutral'}
                    />
                  </td>
                  <td
                    className={`w-[92px] py-2.5 pl-4 text-right text-[10px] tracking-[0.14em] ${status.className}`}
                  >
                    {status.label}
                  </td>
                </tr>
              )
            })}
            {occupancy.length === 0 && (
              <tr>
                <td className="py-4 text-[13px] text-mist-400">Memuat koridor…</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Dua kolom: antrean verifikasi & potensi area */}
      <section className="grid grid-cols-1 gap-8 border-b border-navy-700/60 py-8 lg:grid-cols-2 lg:gap-12 lg:divide-x lg:divide-navy-700/60">
        <div className="lg:pr-12">
          <div className="flex items-baseline justify-between">
            <Label>Antrean verifikasi survei</Label>
            <Link
              to="/admin/survey-data"
              className="text-[12px] text-brand-cyan transition-colors hover:text-white"
            >
              Tinjau
            </Link>
          </div>

          <p className="mt-3 font-mono text-[15px] text-white tabular-nums">
            {survey?.valid ?? 0}
            <span className="text-mist-400">/{survey?.target ?? 84}</span>
            <span className="ml-2 font-sans text-[13px] text-mist-200">
              titik tervalidasi
            </span>
          </p>

          {survey && survey.target > 0 && (
            <div className="mt-3">
              {/* Dibatasi supaya deret blok tetap terbaca pada 84 target. */}
              <SegmentBar
                total={Math.min(survey.target, 28)}
                filled={Math.round(
                  (survey.valid / survey.target) * Math.min(survey.target, 28),
                )}
              />
            </div>
          )}

          {pending.length > 0 ? (
            <ul className="mt-5">
              {pending.slice(0, 6).map((point) => (
                <li
                  key={point.id}
                  className="flex items-baseline justify-between gap-4 border-t border-navy-700/40 py-2.5 text-[13px] first:border-t-0"
                >
                  <span className="text-white">
                    {stationList.data?.find((station) => station.id === point.station_id)
                      ?.name ?? point.station_id}
                  </span>
                  <span className="font-mono text-[12px] text-mist-400 tabular-nums">
                    {point.crowd_label}
                  </span>
                  <span className="text-[10px] tracking-[0.14em] text-warning-soft">
                    MENUNGGU
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-[13px] text-mist-400">
              Tidak ada observasi yang menunggu tinjauan.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <Label>Potensi area tertinggi</Label>
            <Link
              to="/admin/business-potential"
              className="text-[12px] text-brand-cyan transition-colors hover:text-white"
            >
              Buka peta
            </Link>
          </div>

          <ul className="mt-4">
            {topAreas.map((area, index) => (
              <li
                key={area.id}
                className="flex items-center gap-4 border-t border-navy-700/40 py-2.5 first:border-t-0"
              >
                <span className="w-4 font-mono text-[11px] text-mist-400 tabular-nums">
                  {index + 1}
                </span>
                <span className="w-[110px] shrink-0 truncate text-[14px] text-white">
                  {area.name}
                </span>
                <span className="flex-1">
                  <Meter
                    value={area.score}
                    max={100}
                    tone={index === 0 ? 'accent' : 'neutral'}
                  />
                </span>
                <span className="w-[32px] text-right font-mono text-[14px] text-white tabular-nums">
                  {area.score}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Deret angka operasional */}
      <section className="py-8">
        <Label>Ringkasan platform</Label>
        <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 xl:grid-cols-6">
          {ledger.map((item) => (
            <div key={item.label} className="border-t border-navy-700/60 pt-3">
              <dt className="text-[11px] text-mist-400">{item.label}</dt>
              <dd className="mt-1 font-mono text-[19px] font-semibold text-white tabular-nums">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </AdminShell>
  )
}

export default AdminHome
