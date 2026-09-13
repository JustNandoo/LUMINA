import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import AdminShell from './AdminShell'
import AdminStatus from './AdminStatus'
import AdminFormDialog, { Field, fieldClass } from './AdminFormDialog'
import DataTable from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { AdminPageHeader, RowActions, StatCard } from './AdminPageHeader'
import { useApi, errorMessage } from '../../hooks/useApi'
import { useDebounced } from '../../hooks/useDebounced'
import {
  createPartner,
  deletePartner,
  fetchPackages,
  fetchPartners,
  fetchSummary,
  updatePartner,
} from '../../lib/adminApi'
import type { B2BPartner } from '../../lib/adminApi'

const STATUSES = ['active', 'trial', 'suspended']

const STATUS_TONE: Record<string, string> = {
  active: 'bg-brand-cyan/15 text-brand-cyan',
  trial: 'bg-warning-soft/15 text-warning-soft',
  suspended: 'bg-danger/20 text-danger-soft',
}

type Draft = {
  company: string
  email: string
  package_id: string
  export_quota: string
  status: string
}

const EMPTY_DRAFT: Draft = {
  company: '',
  email: '',
  package_id: '',
  export_quota: '0',
  status: 'active',
}

function B2BPartnerManagement() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<B2BPartner | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pending, setPending] = useState<B2BPartner | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const debouncedSearch = useDebounced(search)
  const partners = useApi(
    () => fetchPartners({ q: debouncedSearch, status, page }),
    [debouncedSearch, status, page],
  )
  const summary = useApi(() => fetchSummary(), [])
  const packages = useApi(() => fetchPackages(), [])

  const rows = partners.data?.items ?? []
  const meta = partners.data?.meta

  const openCreate = () => {
    setDraft(EMPTY_DRAFT)
    setFormError(null)
    setCreating(true)
  }

  const openEdit = (row: B2BPartner) => {
    setDraft({
      company: row.company,
      email: row.email,
      package_id: row.package_id ?? '',
      export_quota: String(row.export_quota),
      status: row.status,
    })
    setFormError(null)
    setEditing(row)
  }

  const submit = async () => {
    setSubmitting(true)
    setFormError(null)
    const body = {
      company: draft.company,
      email: draft.email,
      package_id: draft.package_id || null,
      export_quota: Number(draft.export_quota) || 0,
      status: draft.status,
    }
    try {
      if (editing) await updatePartner(editing.id, body)
      else await createPartner(body)
      setEditing(null)
      setCreating(false)
      partners.reload()
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
      await deletePartner(pending.id)
      setPending(null)
      partners.reload()
      summary.reload()
    } catch (caught) {
      setPending(null)
      setActionError(errorMessage(caught))
    }
  }

  const columns: Column<B2BPartner>[] = [
    { key: 'company', header: 'Nama/Perusahaan' },
    { key: 'email', header: 'Email' },
    {
      key: 'package_name',
      header: 'Paket',
      render: (row) => row.package_name ?? '—',
    },
    {
      key: 'quota',
      header: 'Kuota ekspor',
      render: (row) => `${row.export_used} / ${row.export_quota}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            STATUS_TONE[row.status] ?? 'bg-navy-700/70 text-mist-200'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Aksi',
      render: (row) => (
        <RowActions onEdit={() => openEdit(row)} onDelete={() => setPending(row)} />
      ),
    },
  ]

  const stats = [
    {
      label: 'Total mitra B2B',
      value: `${summary.data?.partners.total ?? 0} mitra`,
    },
    {
      label: 'Mitra aktif',
      value: `${summary.data?.partners.active ?? 0} mitra`,
      accent: true,
    },
    {
      label: 'Total pengguna LUMINA',
      value: `${summary.data?.users.total ?? 0} pengguna`,
    },
    {
      label: 'Langganan Commercial',
      value: `${summary.data?.subscriptions.commercial ?? 0} akun`,
    },
  ]

  const start = meta ? (meta.page - 1) * meta.per_page : 0

  return (
    <AdminShell>
      <AdminPageHeader
        title="Manajemen Mitra B2B"
        searchPlaceholder="Cari perusahaan atau email…"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        actionLabel="Tambah Mitra"
        onAction={openCreate}
        extra={
          <div className="relative shrink-0">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              aria-label="Filter status"
              className="h-[42px] w-full appearance-none rounded-[10px] bg-mist-400/70 pr-10 pl-4 text-[14px] font-medium text-navy-900 focus:outline-none sm:w-[150px]"
            >
              <option value="">Semua status</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            accent={stat.accent}
          />
        ))}
      </div>

      <AdminStatus
        loading={partners.loading}
        error={partners.error ?? actionError}
        errorCode={partners.errorCode}
        onRetry={partners.reload}
      />

      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage={partners.loading ? 'Memuat…' : 'Belum ada mitra B2B.'}
        />
        {meta && meta.total > 0 && (
          <Pagination
            page={meta.page}
            totalPages={meta.last_page}
            onChange={setPage}
            summary={`Menampilkan ${start + 1}–${start + rows.length} dari ${meta.total} mitra`}
          />
        )}
      </div>

      <AdminFormDialog
        open={creating || editing !== null}
        title={editing ? `Ubah ${editing.company}` : 'Tambah Mitra B2B'}
        submitLabel={editing ? 'Simpan' : 'Tambah'}
        submitting={submitting}
        error={formError}
        onSubmit={submit}
        onCancel={() => {
          setCreating(false)
          setEditing(null)
        }}
      >
        <Field label="Nama perusahaan">
          <input
            className={fieldClass}
            value={draft.company}
            onChange={(event) => setDraft({ ...draft, company: event.target.value })}
            required
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className={fieldClass}
            value={draft.email}
            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            required
          />
        </Field>
        <Field label="Paket">
          <select
            className={fieldClass}
            value={draft.package_id}
            onChange={(event) => {
              // Kuota ekspor mengikuti paket yang dipilih; admin masih bisa menyesuaikannya.
              const chosen = packages.data?.items.find((item) => item.id === event.target.value)
              setDraft({
                ...draft,
                package_id: event.target.value,
                export_quota: chosen ? String(chosen.export_quota) : draft.export_quota,
              })
            }}
          >
            <option value="">Tanpa paket</option>
            {(packages.data?.items ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kuota ekspor per bulan">
          <input
            type="number"
            min={0}
            className={fieldClass}
            value={draft.export_quota}
            onChange={(event) =>
              setDraft({ ...draft, export_quota: event.target.value })
            }
          />
        </Field>
        <Field label="Status">
          <select
            className={fieldClass}
            value={draft.status}
            onChange={(event) => setDraft({ ...draft, status: event.target.value })}
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
      </AdminFormDialog>

      <ConfirmDialog
        open={pending !== null}
        title="Hapus mitra?"
        description={
          <>
            <strong className="text-white">{pending?.company}</strong> akan
            dihapus permanen dari daftar mitra.
          </>
        }
        confirmLabel="Hapus"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </AdminShell>
  )
}

export default B2BPartnerManagement
