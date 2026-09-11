import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import AdminShell from './AdminShell'
import DataTable from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import { AdminPageHeader, RowActions } from './AdminPageHeader'
import { managedUsers, userRoles } from './adminData'
import type { ManagedUser } from './adminData'

const PAGE_SIZE = 15

const columns: Column<ManagedUser>[] = [
  { key: 'id', header: 'Id' },
  { key: 'username', header: 'Username' },
  { key: 'email', header: 'User Email' },
  { key: 'role', header: 'Role' },
  { key: 'createdAt', header: 'Created At' },
  { key: 'updatedAt', header: 'Update At' },
  { key: 'action', header: 'Action', render: () => <RowActions /> },
]

function UserManagement() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return managedUsers.filter((user) => {
      const matchKeyword =
        !keyword ||
        user.username.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword)
      return matchKeyword && (!role || user.role === role)
    })
  }, [search, role])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)

  return (
    <AdminShell>
      <AdminPageHeader
        title="Lumina User Management"
        searchPlaceholder="Search for a username/company..."
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
              aria-label="Filter Role"
              className="h-[42px] w-full appearance-none rounded-[10px] bg-mist-400/70 pr-10 pl-4 text-[14px] font-medium text-navy-900 focus:outline-none sm:w-[150px]"
            >
              <option value="">Filter Role</option>
              {userRoles.map((item) => (
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

      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row, index) => `${row.id}-${index}`}
        />
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={setPage}
          summary={`Showing ${filtered.length === 0 ? 0 : start + 1} to ${start + rows.length} of ${filtered.length} Result`}
        />
      </div>
    </AdminShell>
  )
}

export default UserManagement
