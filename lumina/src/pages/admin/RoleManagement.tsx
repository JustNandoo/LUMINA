import { useState } from 'react'
import { User } from 'lucide-react'
import AdminShell from './AdminShell'
import AdminStatus from './AdminStatus'
import AdminFormDialog, { Field, fieldClass } from './AdminFormDialog'
import DataTable from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { AdminPageHeader, RowActions } from './AdminPageHeader'
import { useApi, errorMessage } from '../../hooks/useApi'
import {
  createPackage,
  createRole,
  deletePackage,
  deleteRole,
  fetchPackages,
  fetchRoles,
  updatePackage,
  updateRole,
} from '../../lib/adminApi'
import type { B2BPackage, ManagedRole, Paginated } from '../../lib/adminApi'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Data yang ditulis form — sama bentuknya untuk role maupun paket. */
type Draft = { name: string; description: string; price: string; quota: string }

const EMPTY_DRAFT: Draft = { name: '', description: '', price: '0', quota: '0' }

type Row = ManagedRole | B2BPackage

type RoleListPageProps = {
  title: string
  actionLabel: string
  searchPlaceholder: string
  /** Paket B2B punya kolom harga dan kuota; role tidak. */
  withPricing: boolean
  load: (params: { page?: number }) => Promise<Paginated<Row>>
  create: (draft: Draft) => Promise<unknown>
  update: (id: string, draft: Draft) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
}

/** Halaman Role dan B2B Package memakai struktur tabel yang sama. */
function RoleListPage({
  title,
  actionLabel,
  searchPlaceholder,
  withPricing,
  load,
  create,
  update,
  remove,
}: RoleListPageProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Row | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pending, setPending] = useState<Row | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const list = useApi(() => load({ page }), [page])

  // Daftarnya pendek, jadi pencarian cukup di sisi klien.
  const keyword = search.trim().toLowerCase()
  const rows = (list.data?.items ?? []).filter(
    (row) => !keyword || row.name.toLowerCase().includes(keyword),
  )
  const meta = list.data?.meta

  const openCreate = () => {
    setDraft(EMPTY_DRAFT)
    setFormError(null)
    setCreating(true)
  }

  const openEdit = (row: Row) => {
    setDraft({
      name: row.name,
      description: row.description ?? '',
      price: String((row as B2BPackage).price ?? 0),
      quota: String((row as B2BPackage).export_quota ?? 0),
    })
    setFormError(null)
    setEditing(row)
  }

  const submit = async () => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) await update(editing.id, draft)
      else await create(draft)
      setEditing(null)
      setCreating(false)
      list.reload()
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
      await remove(pending.id)
      setPending(null)
      list.reload()
    } catch (caught) {
      setPending(null)
      setActionError(errorMessage(caught))
    }
  }

  const columns: Column<Row>[] = [
    { key: 'name', header: 'Nama' },
    {
      key: 'description',
      header: 'Deskripsi',
      render: (row) => (
        <span className="font-normal text-mist-200">{row.description ?? '—'}</span>
      ),
    },
    {
      key: 'count',
      header: withPricing ? 'Mitra' : 'Pengguna',
      render: (row) => (
        <span className="flex items-center gap-2">
          {withPricing
            ? (row as B2BPackage).partner_count
            : (row as ManagedRole).user_count}
          <User className="size-4 text-mist-400" strokeWidth={1.8} />
        </span>
      ),
    },
    ...(withPricing
      ? [
          {
            key: 'price',
            header: 'Harga',
            render: (row: Row) =>
              `Rp ${((row as B2BPackage).price ?? 0).toLocaleString('id-ID')}`,
          },
          {
            key: 'export_quota',
            header: 'Kuota ekspor',
            render: (row: Row) => String((row as B2BPackage).export_quota ?? 0),
          },
        ]
      : []),
    { key: 'created_at', header: 'Dibuat', render: (row) => formatDate(row.created_at) },
    {
      key: 'action',
      header: 'Aksi',
      render: (row) => (
        <RowActions onEdit={() => openEdit(row)} onDelete={() => setPending(row)} />
      ),
    },
  ]

  const start = meta ? (meta.page - 1) * meta.per_page : 0

  return (
    <AdminShell>
      <AdminPageHeader
        title={title}
        searchPlaceholder={searchPlaceholder}
        searchValue={search}
        onSearchChange={setSearch}
        actionLabel={actionLabel}
        onAction={openCreate}
      />

      <AdminStatus
        loading={list.loading}
        error={list.error ?? actionError}
        errorCode={list.errorCode}
        onRetry={list.reload}
      />

      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage={list.loading ? 'Memuat…' : 'Belum ada data.'}
        />
        {meta && meta.total > 0 && (
          <Pagination
            page={meta.page}
            totalPages={meta.last_page}
            onChange={setPage}
            summary={`Menampilkan ${start + 1}–${start + rows.length} dari ${meta.total}`}
          />
        )}
      </div>

      <AdminFormDialog
        open={creating || editing !== null}
        title={editing ? `Ubah ${editing.name}` : actionLabel}
        submitLabel={editing ? 'Simpan' : 'Tambah'}
        submitting={submitting}
        error={formError}
        onSubmit={submit}
        onCancel={() => {
          setCreating(false)
          setEditing(null)
        }}
      >
        <Field label="Nama">
          <input
            className={fieldClass}
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            required
          />
        </Field>
        <Field label="Deskripsi">
          <input
            className={fieldClass}
            value={draft.description}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
          />
        </Field>
        {withPricing && (
          <>
            <Field label="Harga (Rp)">
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={draft.price}
                onChange={(event) => setDraft({ ...draft, price: event.target.value })}
              />
            </Field>
            <Field label="Kuota ekspor per bulan">
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={draft.quota}
                onChange={(event) => setDraft({ ...draft, quota: event.target.value })}
              />
            </Field>
          </>
        )}
      </AdminFormDialog>

      <ConfirmDialog
        open={pending !== null}
        title="Hapus data?"
        description={
          <>
            <strong className="text-white">{pending?.name}</strong> akan dihapus
            permanen.
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

export function RoleManagement() {
  return (
    <RoleListPage
      title="Manajemen Role"
      actionLabel="Tambah Role"
      searchPlaceholder="Cari nama role…"
      withPricing={false}
      load={(params) => fetchRoles(params)}
      create={(draft) =>
        createRole({ name: draft.name, description: draft.description })
      }
      update={(id, draft) =>
        updateRole(id, { name: draft.name, description: draft.description })
      }
      remove={deleteRole}
    />
  )
}

export function B2BPackageManagement() {
  return (
    <RoleListPage
      title="Manajemen Paket B2B"
      actionLabel="Tambah Paket"
      searchPlaceholder="Cari nama paket…"
      withPricing
      load={(params) => fetchPackages(params)}
      create={(draft) =>
        createPackage({
          name: draft.name,
          description: draft.description,
          price: Number(draft.price) || 0,
          export_quota: Number(draft.quota) || 0,
        })
      }
      update={(id, draft) =>
        updatePackage(id, {
          name: draft.name,
          description: draft.description,
          price: Number(draft.price) || 0,
          export_quota: Number(draft.quota) || 0,
        })
      }
      remove={deletePackage}
    />
  )
}

export default RoleManagement
