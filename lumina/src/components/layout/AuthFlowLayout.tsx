import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
// TODO: ganti ke gambar interior kereta begitu file-nya tersedia.
import verifyBg from '../../assets/images/verif_image/auth_image.png'
import luminaLogo from '../../assets/images/Logo/Lumina_Logo.png'

type AuthFlowLayoutProps = {
  children: ReactNode
  /**
   * Sembunyikan logo di pojok saat halamannya memasang logo sendiri di dalam
   * kartu. Dua logo dalam satu layar terbaca sebagai kelalaian, bukan penegasan
   * merek.
   */
  showBrand?: boolean
}

function AuthFlowLayout({ children, showBrand = true }: AuthFlowLayoutProps) {
  return (
    <div
      className="relative flex min-h-svh items-center justify-center bg-navy-900 bg-cover bg-center bg-no-repeat px-5 py-24 lg:px-0 lg:py-0"
      style={{ backgroundImage: `url(${verifyBg})` }}
    >
      {showBrand && (
        <Link
          to="/"
          className="absolute top-6 left-6 flex items-center gap-3 lg:top-[45px] lg:left-[55px] lg:gap-5"
        >
          <img src={luminaLogo} alt="Lumina" className="h-9 w-auto" />
          <span className="text-lg font-semibold tracking-wide text-white lg:text-2xl">
            LUMINA
          </span>
        </Link>
      )}

      {children}
    </div>
  )
}

export default AuthFlowLayout
