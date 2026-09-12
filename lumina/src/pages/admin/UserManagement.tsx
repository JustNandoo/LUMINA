import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import AdminShell from './AdminShell'
import AdminStatus from './AdminStatus'
import DataTable from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { AdminPageHeader, RowActions } from './AdminPageHeader'
import { useApi, errorMessage } from '../../hooks/useApi'
import { useDebounced } from '../../hooks/useDebounced'
import { deleteUser, fetchUsers, updateUser } from '../../lib/adminApi'
import { useAuth } from '../../context/useAuth'
import type { AuthUser } from '../../lib/authApi'

const ROLES = ['user', 'admin', 'partner']

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function UserManagement() {
  const { user: currentUser } = useAuth()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<AuthUser | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const debouncedSearch = useDebounced(search)
  const users = useApi(
    () => fetchUsers({ q: debouncedSearch, role, page }),
    [debouncedSearch, role, page],
  )

  const rows = users.data?.items ?? []
  const meta = users.data?.meta

  const changeRole = async (user: AuthUser, nextRole: string) => {
    setActionError(null)
    try {
      await updateUser(user.id, { role: nextRole })
      users.reload()
    } catch (caught) {
      setActionError(errorMessage(caught))
    }
  }

  const confirmDelete = async () => {
    if (!pending) return
    setActionError(null)
    try {
      await deleteUser(pending.id)
      setPending(null)
      users.reload()
    } catch (caught) {
      setPending(null)
      setActionError(errorMessage(caught))
    }
  }

  const columns: Column<AuthUser>[] = [
    {
      key: 'full_name',
      header: 'Nama',
      render: (row) => (
        <span>
          {row.full_name}
          {row.id === currentUser?.id && (
            <span className="ml-2 rounded bg-brand-cyan/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-cyan">
              KAMU
            </span>
          )}
        </span>
      ),
    },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <select
          value={row.role ?? 'user'}
          onChange={(event) => changeRole(row, event.target.value)}
          // Backend menolak admin melepas role-nya sendiri; kunci juga di UI
          // supaya tidak terlihat seperti aksi yang tersedia.
          disabled={row.id === currentUser?.id}
          aria-label={`Role ${row.full_name}`}
          className="rounded-md bg-navy-800 px-2.5 py-1 text-[12px] font-semibold text-white focus:outline-none disabled:opacity-50"
        >
          {ROLES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'is_verified',
      header: 'Status',
      render: (row) => (
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            row.is_verified
              ? 'bg-brand-cyan/15 text-brand-cyan'
              : 'bg-warning-soft/15 text-warning-soft'
          }`}
        >
          {row.is_verified ? 'Terverifikasi' : 'Belum verifikasi'}
        </span>
      ),
    },
    { key: 'created_at', header: 'Dibuat', render: (row) => formatDate(row.created_at) },
    {
      key: 'last_login_at',
      header: 'Login terakhir',
      render: (row) => formatDate(row.last_login_at),
    },
    {
      key: 'action',
      header: 'Aksi',
      render: (row) => (
        <RowActions
          onDelete={row.id === currentUser?.id ? undefined : () => setPending(row)}
        />
      ),
    },
  ]

  const start = meta ? (meta.page - 1) * meta.per_page : 0

  return (
    <AdminShell>
      <AdminPageHeader
        title="Manajemen Pengguna"
        searchPlaceholder="Cari nama atau email…"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        extra={
          <div className="relative shrink-0">
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value)
                setPage(1)
              }}
              aria-label="Filter role"
              className="h-[42px] w-full appearance-none rounded-[10px] bg-mist-400/70 pr-10 pl-4 text-[14px] font-medium text-navy-900 focus:outline-none sm:w-[150px]"
            >
              <option value="">Semua role</option>
              {ROLES.map((item) => (
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

      <AdminStatus
        loading={users.loading}
        error={users.error ?? actionError}
        errorCode={users.errorCode}
        onRetry={users.reload}
      />

      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage={users.loading ? 'Memuat…' : 'Belum ada pengguna.'}
        />
        {meta && meta.total > 0 && (
          <Pagination
            page={meta.page}
            totalPages={meta.last_page}
            onChange={setPage}
            summary={`Menampilkan ${start + 1}–${start + rows.length} dari ${meta.total} pengguna`}
          />
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title="Hapus pengguna?"
        description={
          <>
            Akun <strong className="text-white">{pending?.email}</strong> akan
            dihapus permanen beserta langganannya. Tindakan ini tidak bisa
            dibatalkan.
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

export default UserManagement
