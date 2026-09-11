import type { ReactNode } from 'react'
import authImage from '../../assets/images/verif_image/auth_image.png'

type AuthLayoutProps = {
  children: ReactNode
}

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-navy-900 p-4 sm:p-8 lg:p-12">
      {/* Backdrop berlapis: kaca butuh sesuatu di belakangnya untuk dibiaskan,
          kalau cuma warna rata efek blur-nya tidak kelihatan. */}
      <img
        src={authImage}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full scale-125 object-cover opacity-50 blur-[64px]"
      />
      <div className="absolute inset-0 bg-navy-900/45" />
      <div className="pointer-events-none absolute top-[-12%] left-[-8%] size-[560px] rounded-full bg-brand-blue/45 blur-[130px]" />
      <div className="pointer-events-none absolute right-[-6%] bottom-[-14%] size-[600px] rounded-full bg-brand-cyan/20 blur-[140px]" />

      <div className="relative flex w-full max-w-[1080px] animate-card-in flex-col gap-7 lg:h-[672px] lg:flex-row rounded-[28px] border border-white/15 bg-gradient-to-br from-white/14 via-white/6 to-white/12 p-[18px] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.65)] backdrop-blur-2xl backdrop-saturate-150">
        <span className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]" />

        <img
          src={authImage}
          alt=""
          className="hidden h-full w-[510px] rounded-[20px] border border-white/10 object-cover lg:block"
        />

        <div className="flex flex-1 items-center justify-center py-4 lg:py-0">
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
