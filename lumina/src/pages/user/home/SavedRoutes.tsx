import { Bookmark, X } from 'lucide-react'
import type { SavedRoute } from '../../../lib/tripsApi'

type SavedRoutesProps = {
  routes: SavedRoute[]
  /** `origin->destination` rute yang sedang dibuka, untuk ditandai. */
  activeKey: string | null
  onOpen: (route: SavedRoute) => void
  onRemove: (route: SavedRoute) => void
}

/** Daftar rute tersimpan di bawah form — satu klik membuka rutenya lagi. */
function SavedRoutes({ routes, activeKey, onOpen, onRemove }: SavedRoutesProps) {
  if (routes.length === 0) return null

  return (
    <div className="mt-5">
      <p className="flex items-center gap-2 text-[13px] text-mist-400">
        <Bookmark className="size-3.5 text-brand-cyan" strokeWidth={2} />
        Rute tersimpan
        <span className="text-mist-400/70">· {routes.length}</span>
      </p>
      <ul className="mt-2.5 flex flex-col gap-2">
        {routes.map((route) => {
          const active = activeKey === `${route.origin_id}->${route.destination_id}`
          return (
            <li
              key={route.id}
              className={`flex items-center rounded-[12px] border transition-colors ${
                active
                  ? 'border-brand-cyan/60 bg-brand-cyan/10'
                  : 'border-navy-700/60 bg-navy-950 hover:border-navy-700'
              }`}
            >
              <button
                type="button"
                onClick={() => onOpen(route)}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-white">
                  {route.origin_name} <span className="text-mist-400">→</span>{' '}
                  {route.destination_name}
                </span>
                {route.slot_label && (
                  <span className="shrink-0 rounded-md bg-navy-800 px-2 py-0.5 text-[11px] text-mist-200">
                    {route.slot_label}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onRemove(route)}
                aria-label={`Hapus rute ${route.origin_name} ke ${route.destination_name}`}
                className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-mist-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default SavedRoutes
