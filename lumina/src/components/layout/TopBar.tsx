import { useEffect, useRef, useState } from 'react'
import { ChevronDown, CreditCard, LogOut, Search, User } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useAuth } from '../../context/useAuth'

type TopBarProps = {
  showSearch?: boolean
  searchPlaceholder?: string
}

function TopBar({
  showSearch = true,
  searchPlaceholder = 'Search a station or area...',
}: TopBarProps) {
  const navigate = useNavigate()
  const { user, endSession } = useAuth()
  // Sisi aktif ditentukan dari URL, jadi tidak perlu dioper lewat props.
  const isAdmin = useLocation().pathname.startsWith('/admin')
  const userLabel = user?.full_name ?? (isAdmin ? 'Admin Lumina' : 'User Lumina')
  const [open, setOpen] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  return (
    <header className="flex items-center justify-between gap-3 rounded-[14px] bg-navy-800/70 px-4 py-2.5 sm:px-[30px] lg:py-[10px]">
      {showSearch ? (
        <div className="relative w-full max-w-[358px] min-w-0">
          <Search
            className="absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-mist-400"
            strokeWidth={1.8}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="h-[34px] w-full rounded-[10px] bg-navy-950/70 pr-4 pl-11 text-[14px] text-white transition-colors placeholder:text-mist-400 focus:ring-1 focus:ring-mist-400/50 focus:outline-none"
          />
        </div>
      ) : (
        <span />
      )}

      <div ref={menuRef} className="relative shrink-0">
        <button
          ref={menuTriggerRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex shrink-0 items-center gap-2 rounded-[10px] bg-navy-700/60 px-3.5 py-1.5 text-[14px] whitespace-nowrap text-white transition-colors hover:bg-navy-700 sm:px-4"
        >
          {userLabel}
          <ChevronDown
            className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
        </button>

        {open && (
          <div
            role="menu"
            className="animate-auth-in absolute top-[calc(100%+8px)] right-0 z-20 w-[180px] overflow-hidden rounded-[10px] border border-navy-700/60 bg-navy-800 py-1.5 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                navigate(isAdmin ? '/admin' : '/app/profile')
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-white transition-colors hover:bg-navy-700"
            >
              <User className="size-4" strokeWidth={1.8} />
              Profile
            </button>
            {!isAdmin && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  navigate('/app/subscription')
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-white transition-colors hover:bg-navy-700"
              >
                <CreditCard className="size-4" strokeWidth={1.8} />
                Subscription
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                setConfirmSignOut(true)
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-mist-200 transition-colors hover:bg-navy-700 hover:text-white"
            >
              <LogOut className="size-4" strokeWidth={1.8} />
              Sign out
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        tone="danger"
        icon={<LogOut className="size-5" strokeWidth={1.8} />}
        title="Sign out of LUMINA?"
        description={
          <>
            You are signed in as{' '}
            <span className="font-semibold text-white">{userLabel}</span>.{' '}
            {isAdmin
              ? 'Nothing in the console is lost — you will just need to sign in again to manage it.'
              : 'Saved areas and watchlists stay on your account — you will just need to sign in again to reach them.'}
          </>
        }
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        returnFocusTo={menuTriggerRef}
        onConfirm={async () => {
          if (signingOut) return
          setSigningOut(true)
          // Mencabut token di server, lalu membersihkan sesi lokal.
          await endSession()
          setConfirmSignOut(false)
          setSigningOut(false)
          navigate('/login', { replace: true })
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </header>
  )
}

export default TopBar
