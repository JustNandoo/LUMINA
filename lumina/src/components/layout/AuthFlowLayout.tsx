import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
// TODO: ganti ke gambar interior kereta begitu file-nya tersedia.
import verifyBg from '../../assets/images/verif_image/auth_image.png'
import luminaLogo from '../../assets/images/Logo/Lumina_Logo.png'

type AuthFlowLayoutProps = {
  children: ReactNode
}

function AuthFlowLayout({ children }: AuthFlowLayoutProps) {
  return (
    <div
      className="relative flex min-h-svh items-center justify-center bg-navy-900 bg-cover bg-center bg-no-repeat px-5 py-24 lg:px-0 lg:py-0"
      style={{ backgroundImage: `url(${verifyBg})` }}
    >
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-3 lg:top-[45px] lg:left-[55px] lg:gap-5"
      >
        <img src={luminaLogo} alt="Lumina" className="h-9 w-auto" />
        <span className="text-lg font-semibold tracking-wide text-white lg:text-2xl">
          LUMINA
        </span>
      </Link>

      {children}
    </div>
  )
}

export default AuthFlowLayout
