import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'

/** Cangkang sisi admin. Halaman tabel memakai <AdminShell>; halaman peta
    mengatur tata letaknya sendiri agar bisa penuh layar. */
function AdminLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-navy-900 lg:flex-row">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden pb-[76px] lg:pb-0">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
