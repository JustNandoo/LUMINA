import type { ReactNode } from 'react'
import TopBar from '../../components/layout/TopBar'

/** Kerangka isi halaman admin: top bar + padding. */
function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pt-5 pb-8 sm:px-8 lg:px-[42px] lg:pt-[30px] lg:pb-10">
      <div className="animate-rise-in relative z-30">
        <TopBar showSearch={false} />
      </div>
      <div className="animate-rise-in mt-6 lg:mt-8 [animation-delay:100ms]">
        {children}
      </div>
    </div>
  )
}

export default AdminShell
