import { ChartLine, House, Map } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import luminaLogo from '../../assets/images/Logo/Lumina_Logo.png'

const navItems = [
  { label: 'Home', icon: House, to: '/app/home' },
  { label: 'Explore', icon: Map, to: '/app/explore' },
  { label: 'Business Insights', icon: ChartLine, to: '/app/business-insights' },
]

function Sidebar() {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-[2000] border-t border-navy-700/50 bg-navy-800 lg:static lg:flex lg:w-[107px] lg:shrink-0 lg:flex-col lg:items-center lg:border-t-0 lg:pt-[58px]">
      <NavLink to="/app/home" className="hidden lg:block">
        <img src={luminaLogo} alt="Lumina" className="h-10 w-auto" />
      </NavLink>

      <nav className="flex items-stretch justify-around px-2 py-1.5 lg:mt-[62px] lg:flex-col lg:items-center lg:gap-[38px] lg:px-0 lg:py-0">
        {navItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-center text-[11px] leading-[1.25] transition-colors lg:w-[76px] lg:flex-none lg:gap-2 lg:py-2.5 lg:text-[13px] ${
                isActive
                  ? 'bg-navy-950 text-white'
                  : 'text-mist-400 hover:text-mist-100'
              }`
            }
          >
            <Icon className="size-6 lg:size-7" strokeWidth={1.6} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
