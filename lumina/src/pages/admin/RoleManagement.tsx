import { useMemo, useState } from 'react'
import { User } from 'lucide-react'
import AdminShell from './AdminShell'
import DataTable from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import { AdminPageHeader, RowActions } from './AdminPageHeader'
import { b2bPackages, managedRoles } from './adminData'
import type { ManagedRole } from './adminData'

const columns: Column<ManagedRole>[] = [
  { key: 'no', header: 'No' },
  { key: 'name', header: 'Role Name' },
  {
    key: 'users',
    header: 'User',
    render: (row) => (
      <span className="flex items-center gap-2">
        {row.users}
        <User className="size-4 text-mist-400" strokeWidth={1.8} />
      </span>
    ),
  },
  { key: 'createdAt', header: 'Created At' },
  { key: 'updatedAt', header: 'Update At' },
  { key: 'action', header: 'Action', render: () => <RowActions /> },
]

type RoleListPageProps = {
  title: string
  actionLabel: string
  searchPlaceholder: string
  source: ManagedRole[]
}

/** Halaman Role dan B2B Package memakai struktur tabel yang sama. */
function RoleListPage({
  title,
  actionLabel,
  searchPlaceholder,
  source,
}: RoleListPageProps) {
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return keyword
      ? source.filter((row) => row.name.toLowerCase().includes(keyword))
      : source
  }, [search, source])

  return (
    <AdminShell>
      <AdminPageHeader
        title={title}
        actionLabel={actionLabel}
        searchPlaceholder={searchPlaceholder}
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="mt-5">
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.no} />
        <Pagination
          page={1}
          totalPages={1}
          onChange={() => {}}
          summary={`Showing ${rows.length} of ${rows.length} Result`}
        />
      </div>
    </AdminShell>
  )
}

export function RoleManagement() {
  return (
    <RoleListPage
      title="Lumina Role Management"
      actionLabel="Add Role"
      searchPlaceholder="Search Role Name..."
      source={managedRoles}
    />
  )
}

export function B2BPackageManagement() {
  return (
    <RoleListPage
      title="Lumina B2B Package Management"
      actionLabel="Tambah Paket"
      searchPlaceholder="Cari nama role..."
      source={b2bPackages}
    />
  )
}
