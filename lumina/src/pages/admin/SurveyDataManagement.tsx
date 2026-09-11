import { useMemo, useState } from 'react'
import { CircleCheck, Clock4, ImageIcon, SquarePen, X } from 'lucide-react'
import AdminShell from './AdminShell'
import DataTable from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import { AdminPageHeader, RowActions, StatCard } from './AdminPageHeader'
import { surveyPoints } from './adminData'
import type { SurveyPoint } from './adminData'

function StatusBadge({ status }: { status: SurveyPoint['status'] }) {
  const onReview = status === 'On Review'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
        onReview
          ? 'bg-warning-soft text-warning'
          : 'bg-brand-cyan/20 text-brand-cyan'
      }`}
    >
      {onReview ? (
        <Clock4 className="size-3" strokeWidth={2.2} />
      ) : (
        <CircleCheck className="size-3" strokeWidth={2.2} />
      )}
      {status}
    </span>
  )
}

function SurveyDataManagement() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SurveyPoint | null>(surveyPoints[0])
  const [decisions, setDecisions] = useState<Record<number, string>>({})

  const rows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return keyword
      ? surveyPoints.filter((row) =>
          row.station.toLowerCase().includes(keyword),
        )
      : surveyPoints
  }, [search])

  const columns: Column<SurveyPoint>[] = [
    { key: 'no', header: 'No' },
    { key: 'station', header: 'Station' },
    { key: 'time', header: 'Time' },
    { key: 'date', header: 'Day/Date' },
    { key: 'score', header: 'Score' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusBadge
          status={(decisions[row.no] as SurveyPoint['status']) ?? row.status}
        />
      ),
    },
    {
      key: 'action',
      header: 'Aksi',
      render: (row) => <RowActions onEdit={() => setSelected(row)} />,
    },
  ]

  const verified = surveyPoints.filter((row) => row.status === 'Valid').length

  return (
    <AdminShell>
      <AdminPageHeader
        title="Survey Data Management"
        actionLabel="Add Survey Results Data"
        searchPlaceholder="Cari titik survey..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Survey Progress"
          value="100 %"
          accent
          suffix={
            <span className="text-[14px] font-normal text-mist-200">
              | {surveyPoints.length}/{surveyPoints.length} Survey Points
            </span>
          }
        />
        <StatCard
          label="Verified Points"
          value={`${verified}/${surveyPoints.length}`}
          suffix={
            <span className="text-[14px] font-normal text-mist-200">
              Survey Points
            </span>
          }
        />
        <StatCard
          label="Awaiting Verification"
          value={String(surveyPoints.length - verified)}
          suffix={
            <span className="text-[14px] font-normal text-mist-200">
              Survey Points
            </span>
          }
        />
        <StatCard
          label="Number of Stations"
          value="10"
          suffix={
            <span className="text-[14px] font-normal text-mist-200">
              Survey Points
            </span>
          }
        />
      </div>

      <div className="mt-5 flex flex-col gap-5 xl:flex-row">
        <div className="min-w-0 flex-1">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => String(row.no)}
            onRowClick={setSelected}
            highlightRow={(row) => row.no === selected?.no}
          />
          <Pagination
            page={1}
            totalPages={1}
            onChange={() => {}}
            summary={`Showing 1 to ${rows.length} of ${rows.length} Result`}
          />
        </div>

        {selected && (
          <section className="w-full shrink-0 rounded-[10px] border border-navy-700/70 bg-navy-800/40 px-5 py-5 xl:w-[400px]">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2.5 text-[16px] font-semibold text-white">
                <SquarePen className="size-[18px]" strokeWidth={1.8} />
                Population Density Survey Data
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Tutup panel"
                className="text-mist-400 transition-colors hover:text-white"
              >
                <X className="size-[18px]" strokeWidth={2} />
              </button>
            </div>

            {/* Placeholder foto survei — tinggal ganti dengan gambar asli. */}
            <div className="relative mt-5 flex h-[150px] items-end overflow-hidden rounded-lg border border-navy-700 bg-navy-950">
              <ImageIcon
                className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-mist-400/50"
                strokeWidth={1.4}
              />
              <div className="relative w-full bg-navy-950/85 px-3 py-2">
                <p className="text-[10px] text-white">
                  {selected.photoCaption}
                </p>
                <p className="mt-0.5 text-[9px] text-mist-400">
                  LAT: {selected.coordinate.split(', ')[0]} LONG:{' '}
                  {selected.coordinate.split(', ')[1]}{' '}
                  <span className="text-brand-cyan">
                    {selected.pickupTime}:22 WIB
                  </span>
                </p>
              </div>
            </div>

            <dl className="mt-5 rounded-lg border border-navy-700/60 px-4 py-3">
              {[
                { label: 'Station Name', value: selected.stationDetail },
                {
                  label: 'Pickup Time',
                  value: selected.pickupTime,
                  accent: true,
                },
                { label: 'GPS Coordinate', value: selected.coordinate },
                { label: 'H3 Cell Code', value: selected.h3Cell },
                {
                  label: 'Estimated Crowd Size',
                  value: selected.crowdSize,
                  danger: true,
                },
                { label: 'Survey Officer', value: selected.officer },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-4 py-2 text-[12px]"
                >
                  <dt className="text-mist-200">{item.label}</dt>
                  <dd
                    className={`text-right font-medium ${
                      item.danger
                        ? 'text-danger/90'
                        : item.accent
                          ? 'text-brand-cyan'
                          : 'text-white'
                    }`}
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-[12px] text-mist-200">Catatan :</p>
            <blockquote className="mt-2 rounded-lg border border-navy-700/60 bg-navy-950/50 px-4 py-3 text-[11px] leading-[1.7] text-mist-200 italic">
              &ldquo;{selected.note}&rdquo;
            </blockquote>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setDecisions((current) => ({
                    ...current,
                    [selected.no]: 'On Review',
                  }))
                }
                className="flex-1 rounded-lg bg-[#d63a25] py-2.5 text-[14px] font-semibold text-white transition-colors hover:brightness-110"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() =>
                  setDecisions((current) => ({
                    ...current,
                    [selected.no]: 'Valid',
                  }))
                }
                className="flex-1 rounded-lg bg-brand-cyan py-2.5 text-[14px] font-semibold text-navy-900 transition-colors hover:brightness-110"
              >
                Approve
              </button>
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  )
}

export default SurveyDataManagement
