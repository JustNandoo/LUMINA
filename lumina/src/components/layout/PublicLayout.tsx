import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Navbar from './Navbar'

/**
 * Cangkang halaman publik. Navbar melayang di atas konten supaya hero landing
 * tetap terlihat penuh di belakangnya; halaman lain memberi padding atas sendiri.
 */
function PublicLayout() {
  return (
    <div className="relative min-h-svh bg-navy-900">
      <div className="absolute inset-x-0 top-0 z-50 px-4 pt-4 sm:px-8 sm:pt-8 lg:px-11 lg:pt-11">
        <div className="animate-drop-in">
          <Navbar />
        </div>
      </div>

      <Outlet />
      <Footer />
    </div>
  )
}

export default PublicLayout
