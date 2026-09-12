import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { homePathFor, ROLE_CODE } from '../lib/authApi'

/** Ditampilkan selama token yang tersimpan divalidasi ke /api/auth/me. */
function SessionSplash() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-navy-900">
      <div className="flex flex-col items-center gap-4">
        <span className="size-9 animate-spin rounded-full border-2 border-mist-400/30 border-t-brand-cyan" />
        <p className="text-[14px] tracking-[0.1em] text-mist-400">MEMUAT SESI…</p>
      </div>
    </div>
  )
}

/** Hanya untuk pengguna yang sudah login. */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <SessionSplash />
  if (status === 'guest') {
    // `from` dipakai supaya setelah login pengguna kembali ke halaman tujuan.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <Outlet />
}

/**
 * Hanya untuk akun ber-role admin.
 *
 * Guard ini kenyamanan navigasi, bukan pengaman: seluruh endpoint /api/admin
 * menolak non-admin dengan 403, dan itulah batas yang sebenarnya mengikat.
 */
export function AdminRoute() {
  const { status, user } = useAuth()

  if (status === 'loading') return <SessionSplash />
  if (status === 'guest') return <Navigate to="/login" replace />
  if (user?.role_code !== ROLE_CODE.admin) return <Navigate to={homePathFor(user)} replace />
  return <Outlet />
}

/** Hanya untuk tamu — pengguna yang sudah login dilempar ke beranda aplikasi. */
export function GuestRoute() {
  const { status, user } = useAuth()

  if (status === 'loading') return <SessionSplash />
  // Yang sudah login diarahkan ke halaman sesuai perannya, bukan selalu ke
  // beranda aplikasi — admin langsung mendarat di panel admin.
  if (status === 'authenticated') return <Navigate to={homePathFor(user)} replace />
  return <Outlet />
}
