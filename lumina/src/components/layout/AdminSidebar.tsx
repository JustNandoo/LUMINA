import {
  BadgeDollarSign,
  ChartLine,
  House,
  Map,
  Package,
  UserCog,
  Users,
  Waypoints,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import luminaLogo from '../../assets/images/Logo/Lumina_Logo.png'

const navItems = [
  { label: 'Home', icon: House, to: '/admin' },
  { label: 'Map', icon: Map, to: '/admin/map' },
  { label: 'Business Potential', icon: ChartLine, to: '/admin/business-potential' },
  { label: 'Management User', icon: Users, to: '/admin/users' },
  { label: 'Management Role', icon: UserCog, to: '/admin/roles' },
  { label: 'Management B2B Packages', icon: Package, to: '/admin/b2b-packages' },
  {
    label: 'Management B2B Partners',
    icon: BadgeDollarSign,
    to: '/admin/b2b-partners',
  },
  { label: 'Diagnostics Pipeline', icon: Waypoints, to: '/admin/survey-data' },
]

function AdminSidebar() {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-[2000] border-t border-navy-700/50 bg-navy-800 lg:static lg:flex lg:w-[105px] lg:shrink-0 lg:flex-col lg:items-center lg:overflow-y-auto lg:border-t-0 lg:pt-[34px] lg:pb-6">
      <NavLink to="/admin" className="hidden lg:block">
        <img src={luminaLogo} alt="Lumina" className="h-10 w-auto" />
      </NavLink>

      {/* 8 menu: di mobile bar bawah bisa digeser horizontal */}
      <nav className="flex items-stretch gap-1 overflow-x-auto px-2 py-1.5 lg:mt-8 lg:flex-col lg:gap-4 lg:overflow-visible lg:px-0 lg:py-0">
        {navItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex w-[80px] shrink-0 flex-col items-center gap-1.5 rounded-xl px-1.5 py-2 text-center text-[10px] leading-[1.2] transition-colors lg:w-[78px] lg:text-[11px] ${
                isActive
                  ? 'bg-navy-950 text-white'
                  : 'text-mist-400 hover:text-mist-100'
              }`
            }
          >
            <Icon className="size-[22px] shrink-0" strokeWidth={1.6} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default AdminSidebar
