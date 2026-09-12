import { useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import AdminShell from './AdminShell'
import AdminStatus from './AdminStatus'
import AdminFormDialog, { Field, fieldClass } from './AdminFormDialog'
import DataTable from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { AdminPageHeader, RowActions, StatCard } from './AdminPageHeader'
import { useApi, errorMessage } from '../../hooks/useApi'
import {
  createSurveyPoint,
  deleteSurveyPoint,
  fetchSummary,
  fetchSurveyPoints,
  updateSurveyPoint,
} from '../../lib/adminApi'
import { fetchStations, fetchTimeSlots } from '../../lib/geoApi'
import type { SurveyPoint } from '../../lib/adminApi'

const STATUSES = [
  { id: 'on_review', label: 'Menunggu tinjauan' },
  { id: 'valid', label: 'Valid' },
  { id: 'rejected', label: 'Ditolak' },
]

const STATUS_TONE: Record<string, string> = {
  on_review: 'bg-warning-soft/15 text-warning-soft',
  valid: 'bg-brand-cyan/15 text-brand-cyan',
  rejected: 'bg-danger/20 text-danger-soft',
}

type Draft = {
  station_id: string
  slot_id: string
  crowd_score: string
  station_detail: string
  officer: string
  note: string
}

const EMPTY_DRAFT: Draft = {
  station_id: '',
  slot_id: '',
  crowd_score: '3',
  station_detail: '',
  officer: '',
  note: '',
}

function SurveyDataManagement() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pending, setPending] = useState<SurveyPoint | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const points = useApi(() => fetchSurveyPoints({ status, page }), [status, page])
  const summary = useApi(() => fetchSummary(), [])
  const stations = useApi(() => fetchStations(), [])
  const slots = useApi(() => fetchTimeSlots(), [])

  const stationName = (id: string) =>
    stations.data?.find((station) => station.id === id)?.name ?? id

  // Pencarian di sisi klien: backend memfilter per stasiun/status, sementara
  // kolom yang ingin dicari petugas biasanya nama stasiun atau nama surveyor.
  const keyword = search.trim().toLowerCase()
  const rows = (points.data?.items ?? []).filter(
    (row) =>
      !keyword ||
      stationName(row.station_id).toLowerCase().includes(keyword) ||
      (row.officer ?? '').toLowerCase().includes(keyword),
  )
  const meta = points.data?.meta

  const setStatusOf = async (row: SurveyPoint, next: string) => {
    setActionError(null)
    try {
      await updateSurveyPoint(row.id, { status: next })
      points.reload()
      summary.reload()
    } catch (caught) {
      setActionError(errorMessage(caught))
    }
  }

  const submit = async () => {
    setSubmitting(true)
    setFormError(null)
    try {
      await createSurveyPoint({
        station_id: draft.station_id,
        slot_id: draft.slot_id,
        crowd_score: Number(draft.crowd_score),
        station_detail: draft.station_detail || undefined,
        officer: draft.officer || undefined,
        note: draft.note || undefined,
      })
      setCreating(false)
      points.reload()
      summary.reload()
    } catch (caught) {
      setFormError(errorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!pending) return
    setActionError(null)
    try {
      await deleteSurveyPoint(pending.id)
      setPending(null)
      points.reload()
      summary.reload()
    } catch (caught) {
      setPending(null)
      setActionError(errorMessage(caught))
    }
  }

  const columns: Column<SurveyPoint>[] = [
    { key: 'station_id', header: 'Stasiun', render: (row) => stationName(row.station_id) },
    {
      key: 'slot_id',
      header: 'Slot waktu',
      render: (row) =>
        slots.data?.find((slot) => slot.id === row.slot_id)?.label ?? row.slot_id,
    },
    {
      key: 'observed_at',
      header: 'Waktu observasi',
      render: (row) =>
        new Date(row.observed_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
    { key: 'crowd_label', header: 'Skor kepadatan' },
    { key: 'officer', header: 'Petugas', render: (row) => row.officer ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            STATUS_TONE[row.status] ?? 'bg-navy-700/70 text-mist-200'
          }`}
        >
          {STATUSES.find((item) => item.id === row.status)?.label ?? row.status}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Aksi',
      render: (row) => (
        <span className="flex items-center gap-3">
          {row.status !== 'valid' && (
            <button
              type="button"
              aria-label="Tandai valid"
              onClick={() => setStatusOf(row, 'valid')}
              className="text-brand-cyan transition-colors hover:text-white"
            >
              <Check className="size-[17px]" strokeWidth={2.2} />
            </button>
          )}
          {row.status !== 'rejected' && (
            <button
              type="button"
              aria-label="Tolak"
              onClick={() => setStatusOf(row, 'rejected')}
              className="text-warning-soft transition-colors hover:text-white"
            >
              <X className="size-[17px]" strokeWidth={2.2} />
            </button>
          )}
          <RowActions onDelete={() => setPending(row)} />
        </span>
      ),
    },
  ]

  const survey = summary.data?.survey
  const start = meta ? (meta.page - 1) * meta.per_page : 0

  return (
    <AdminShell>
      <AdminPageHeader
        title="Data Survei Kalibrasi"
        searchPlaceholder="Cari stasiun atau petugas…"
        searchValue={search}
        onSearchChange={setSearch}
        actionLabel="Catat Observasi"
        onAction={() => {
          setDraft({
            ...EMPTY_DRAFT,
            station_id: stations.data?.[0]?.id ?? '',
            slot_id: slots.data?.[0]?.id ?? '',
          })
          setFormError(null)
          setCreating(true)
        }}
        extra={
          <div className="relative shrink-0">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              aria-label="Filter status"
              className="h-[42px] w-full appearance-none rounded-[10px] bg-mist-400/70 pr-10 pl-4 text-[14px] font-medium text-navy-900 focus:outline-none sm:w-[180px]"
            >
              <option value="">Semua status</option>
              {STATUSES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-navy-900"
              strokeWidth={2.5}
            />
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total observasi" value={`${survey?.total ?? 0} titik`} />
        <StatCard
          label="Sudah divalidasi"
          value={`${survey?.valid ?? 0} titik`}
          accent
        />
        <StatCard
          label="Target kalibrasi"
          value={`${survey?.target ?? 84} titik`}
          suffix={
            <span className="text-[13px] font-normal text-mist-400">
              {survey?.progress_percent ?? 0}%
            </span>
          }
        />
      </div>

      <AdminStatus
        loading={points.loading}
        error={points.error ?? actionError}
        errorCode={points.errorCode}
        onRetry={points.reload}
      />

      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage={
            points.loading ? 'Memuat…' : 'Belum ada observasi lapangan tercatat.'
          }
        />
        {meta && meta.total > 0 && (
          <Pagination
            page={meta.page}
            totalPages={meta.last_page}
            onChange={setPage}
            summary={`Menampilkan ${start + 1}–${start + rows.length} dari ${meta.total} titik`}
          />
        )}
      </div>

      <AdminFormDialog
        open={creating}
        title="Catat Observasi Lapangan"
        submitLabel="Simpan"
        submitting={submitting}
        error={formError}
        onSubmit={submit}
        onCancel={() => setCreating(false)}
      >
        <Field label="Stasiun">
          <select
            className={fieldClass}
            value={draft.station_id}
            onChange={(event) => setDraft({ ...draft, station_id: event.target.value })}
            required
          >
            {(stations.data ?? []).map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Slot waktu">
          <select
            className={fieldClass}
            value={draft.slot_id}
            onChange={(event) => setDraft({ ...draft, slot_id: event.target.value })}
            required
          >
            {(slots.data ?? []).map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Skor kepadatan" hint="Skala pengamatan lapangan 1–5.">
          <input
            type="number"
            min={1}
            max={5}
            className={fieldClass}
            value={draft.crowd_score}
            onChange={(event) => setDraft({ ...draft, crowd_score: event.target.value })}
            required
          />
        </Field>
        <Field label="Detail lokasi" hint="Mis. Peron 3 jalur timur.">
          <input
            className={fieldClass}
            value={draft.station_detail}
            onChange={(event) =>
              setDraft({ ...draft, station_detail: event.target.value })
            }
          />
        </Field>
        <Field label="Petugas">
          <input
            className={fieldClass}
            value={draft.officer}
            onChange={(event) => setDraft({ ...draft, officer: event.target.value })}
          />
        </Field>
        <Field label="Catatan">
          <textarea
            rows={3}
            className={`${fieldClass} h-auto py-2.5`}
            value={draft.note}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
          />
        </Field>
      </AdminFormDialog>

      <ConfirmDialog
        open={pending !== null}
        title="Hapus observasi?"
        description="Titik observasi ini akan dihapus permanen dari data kalibrasi."
        confirmLabel="Hapus"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </AdminShell>
  )
}

export default SurveyDataManagement
