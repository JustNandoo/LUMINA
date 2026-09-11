import { Link, NavLink, useNavigate } from 'react-router-dom'
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

  return (
    <header className="flex items-center justify-between rounded-xl bg-navy-800 px-4 py-3 sm:px-6 lg:px-12 lg:py-[21px]">
      <Link to="/" className="flex items-center gap-3">
        <img src={luminaLogo} alt="Lumina" className="h-9 w-auto" />
        <span className="text-lg font-semibold tracking-wide text-white sm:text-2xl">
          LUMINA
        </span>
      </Link>

      <nav className="hidden lg:block">
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

      <div className="flex items-center gap-4 lg:gap-8">
        <Link
          to="/login"
          className="text-[15px] font-medium text-white transition-colors hover:text-mist-200"
        >
          Sign In
        </Link>
        <Button variant="dark" onClick={() => navigate('/signup')}>
          Sign Up
        </Button>
      </div>
    </header>
  )
}

export default Navbar
