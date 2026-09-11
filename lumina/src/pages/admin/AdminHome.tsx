import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell from './AdminShell'
import { areas } from '../../data/areas'
import { b2bPartners, managedUsers, surveyPoints } from './adminData'
import { ColumnChart, Meter, SegmentBar } from './dashboardVisuals'

const hourLabels = ['06', '08', '10', '12', '14', '16', '18', '20']
const crowdIndex = [38, 92, 54, 47, 51, 78, 96, 44]

const occupancy = [
  { name: 'Manggarai', value: 96 },
  { name: 'Sudirman', value: 88 },
  { name: 'Tanah Abang', value: 74 },
  { name: 'Tebet', value: 63 },
  { name: 'Cikini', value: 55 },
  { name: 'Duri', value: 41 },
]

function statusOf(value: number) {
  if (value >= 85) return { label: 'PADAT', className: 'text-warning-soft' }
  if (value >= 60) return { label: 'SEDANG', className: 'text-mist-200' }
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

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] tracking-[0.18em] text-mist-400 uppercase">
    {children}
  </p>
)

function AdminHome() {
  const now = useClock()
  const peakIndex = crowdIndex.indexOf(Math.max(...crowdIndex))

  const verified = surveyPoints.filter((point) => point.status === 'Valid')
  const pending = surveyPoints.filter((point) => point.status !== 'Valid')

  const topAreas = useMemo(
    () => [...areas].sort((a, b) => b.score - a.score).slice(0, 6),
    [],
  )

  const ledger = [
    { label: 'Pendapatan', value: 'Rp 100.000.000' },
    { label: 'Mitra B2B aktif', value: '35' },
    { label: 'Pengguna terdaftar', value: String(managedUsers.length) },
    { label: 'Panggilan API', value: '84.250' },
    { label: 'Kuota terpakai', value: '68%' },
    { label: 'Paket B2B', value: String(b2bPartners.length > 0 ? 2 : 0) },
  ]

  return (
    <AdminShell>
      {/* Kepala halaman */}
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

      {/* Pernyataan utama + grafik harian */}
      <section className="grid grid-cols-1 gap-8 border-b border-navy-700/60 py-8 lg:grid-cols-[260px_1fr] lg:gap-12">
        <div>
          <Label>Indeks kepadatan puncak</Label>
          <p className="mt-3 font-mono text-[76px] leading-none font-semibold text-white tabular-nums">
            {crowdIndex[peakIndex]}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-mist-200">
            Tercatat pukul{' '}
            <span className="font-mono text-white">
              {hourLabels[peakIndex]}.00
            </span>{' '}
            dari {occupancy.length} stasiun terpantau. Rata-rata harian{' '}
            <span className="font-mono text-white">
              {Math.round(
                crowdIndex.reduce((sum, value) => sum + value, 0) /
                  crowdIndex.length,
              )}
            </span>
            .
          </p>
        </div>

        <div>
          <Label>Sebaran per jam</Label>
          <div className="mt-4">
            <ColumnChart
              values={crowdIndex}
              labels={hourLabels}
              peakIndex={peakIndex}
            />
          </div>
        </div>
      </section>

      {/* Tabel okupansi stasiun */}
      <section className="border-b border-navy-700/60 py-8">
        <div className="flex items-baseline justify-between">
          <Label>Okupansi peron</Label>
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
                <tr
                  key={station.name}
                  className="border-t border-navy-700/40 first:border-t-0"
                >
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
                      tone={station.value >= 85 ? 'alert' : 'neutral'}
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
            {verified.length}
            <span className="text-mist-400">/{surveyPoints.length}</span>
            <span className="ml-2 font-sans text-[13px] text-mist-200">
              titik tervalidasi
            </span>
          </p>

          <div className="mt-3">
            <SegmentBar total={surveyPoints.length} filled={verified.length} />
          </div>

          {pending.length > 0 && (
            <ul className="mt-5">
              {pending.map((point) => (
                <li
                  key={point.no}
                  className="flex items-baseline justify-between gap-4 border-t border-navy-700/40 py-2.5 text-[13px] first:border-t-0"
                >
                  <span className="text-white">{point.station}</span>
                  <span className="font-mono text-[12px] text-mist-400 tabular-nums">
                    {point.time}
                  </span>
                  <span className="text-[10px] tracking-[0.14em] text-warning-soft">
                    MENUNGGU
                  </span>
                </li>
              ))}
            </ul>
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

      {/* Deret angka komersial */}
      <section className="py-8">
        <Label>Ringkasan komersial</Label>
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
