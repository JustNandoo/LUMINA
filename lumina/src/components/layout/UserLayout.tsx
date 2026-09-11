import { Outlet } from 'react-router-dom'
import UserSidebar from './UserSidebar'

/** Cangkang sisi pengguna. Halaman di dalamnya mengatur padding sendiri. */
function UserLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-navy-900 lg:flex-row">
      <UserSidebar />
      <main className="flex-1 overflow-x-hidden pb-[72px] lg:pb-0">
        <Outlet />
      </main>
    </div>
  )
}

export default UserLayout
