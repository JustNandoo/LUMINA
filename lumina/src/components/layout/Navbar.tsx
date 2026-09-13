import { useEffect, useId, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import luminaLogo from '../../assets/images/Logo/Lumina_Logo.png'
import Button from '../ui/Button'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'About Us', to: '/about' },
  { label: 'Feature', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Help', to: '/help' },
]

function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const headerRef = useRef<HTMLElement>(null)
  const menuId = useId()

  // Status terbuka diikat ke halaman tempat menu dibuka. Begitu pengguna pindah
  // halaman lewat salah satu link, menu tertutup sendiri tanpa effect tambahan.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname

  useEffect(() => {
    if (!open) return
    const close = () => setOpenOn(null)
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close()
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <header
      ref={headerRef}
      className="relative flex items-center justify-between rounded-xl bg-navy-800 px-4 py-3 sm:px-6 lg:px-12 lg:py-[21px]"
    >
      <Link to="/" className="flex items-center gap-3">
        <img src={luminaLogo} alt="Lumina" className="h-9 w-auto" />
        <span className="text-lg font-semibold tracking-wide text-white sm:text-2xl">
          LUMINA
        </span>
      </Link>

      <nav className="hidden lg:block" aria-label="Navigasi utama">
        <ul className="flex items-center gap-12 text-[15px] text-mist-200">
          {navLinks.map((link) => (
            <li key={link.label}>
              <NavLink
                to={link.to}
                end
                className={({ isActive }) =>
                  `transition-colors hover:text-white ${isActive ? 'text-white' : ''}`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-2.5 sm:gap-4 lg:gap-8">
        <Link
          to="/login"
          className="hidden text-[15px] font-medium text-white transition-colors hover:text-mist-200 sm:inline lg:inline"
        >
          Sign In
        </Link>
        <Button variant="dark" onClick={() => navigate('/signup')}>
          Sign Up
        </Button>

        {/* Di bawah lebar laptop menu navigasi tidak muat sebaris, jadi
            dipindah ke balik tombol burger — bukan disembunyikan tanpa pengganti. */}
        <button
          type="button"
          onClick={() => setOpenOn(open ? null : pathname)}
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
          aria-controls={menuId}
          className="flex size-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 lg:hidden"
        >
          {open ? <X className="size-6" strokeWidth={2} /> : <Menu className="size-6" strokeWidth={2} />}
        </button>
      </div>

      {open && (
        <div
          id={menuId}
          className="animate-auth-in absolute inset-x-0 top-[calc(100%+8px)] rounded-xl border border-navy-700/60 bg-navy-800 p-2 shadow-2xl lg:hidden"
        >
          <nav aria-label="Navigasi utama">
            <ul className="flex flex-col">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <NavLink
                    to={link.to}
                    end
                    className={({ isActive }) =>
                      `block rounded-lg px-4 py-3 text-[15px] transition-colors ${
                        isActive
                          ? 'bg-navy-950 font-medium text-white'
                          : 'text-mist-200 hover:bg-navy-700/60 hover:text-white'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-2 border-t border-navy-700/60 px-2 pt-3 pb-1 sm:hidden">
            <Link
              to="/login"
              className="block rounded-lg border border-mist-400/40 px-4 py-2.5 text-center text-[15px] font-medium text-white transition-colors hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar
