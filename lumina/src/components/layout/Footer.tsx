import { Link } from 'react-router-dom'
import luminaLogo from '../../assets/images/Logo/Lumina_Logo.png'

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Help & FAQ', to: '/help' },
      { label: 'Open the map', to: '/app/explore' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About LUMINA', to: '/about' },
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/signup' },
    ],
  },
]

const sources = [
  'MAPID — Community Maps, Data Mission, MAPS, APPS',
  'OpenStreetMap — POI & transit network',
  'KAI Commuter — Semester I 2025 ridership',
]

function Footer() {
  return (
    <footer className="border-t border-navy-700/50 bg-navy-950">
      <div className="mx-auto max-w-[1180px] px-6 py-14 lg:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3">
              <img src={luminaLogo} alt="Lumina" className="h-8 w-auto" />
              <span className="text-xl font-semibold tracking-wide text-white">
                LUMINA
              </span>
            </Link>
            <p className="mt-4 max-w-[260px] text-[13px] leading-relaxed text-mist-400">
              A GeoAI WebGIS for the KRL network and Indonesian rail stations —
              reading transit areas across space and time so a map can support a
              decision, not just show a place.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-[10px] tracking-[0.18em] text-mist-400 uppercase">
                {column.title}
              </p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-[14px] text-mist-200 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-[10px] tracking-[0.18em] text-mist-400 uppercase">
              Data sources
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {sources.map((source) => (
                <li key={source} className="text-[13px] text-mist-400">
                  {source}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-navy-700/50 pt-6 text-[12px] text-mist-400 lg:flex-row lg:items-center lg:justify-between">
          <p>
            MAPID WebGIS Competition 2026 · Theme “Maps That Think!” · Model
            calibrated on the Manggarai–Tanah Abang–Duri–Sudirman corridor
          </p>
          <p className="text-mist-400/80">
            LUMINA reports relative indices, never absolute passenger counts or
            revenue projections.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
