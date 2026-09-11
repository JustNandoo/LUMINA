import { TrainFront } from 'lucide-react'
import { crowdTone } from './tripData'
import type { RouteOption } from './tripData'

type RouteCardProps = {
  route: RouteOption
  selected: boolean
  onSelect: () => void
}

function RouteCard({ route, selected, onSelect }: RouteCardProps) {
  const tone = crowdTone[route.crowd]

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative w-full rounded-[14px] border bg-navy-950 px-5 pt-5 pb-4 text-left transition-colors ${
        selected
          ? 'border-brand-cyan/70'
          : 'border-navy-700/60 hover:border-navy-700'
      }`}
    >
      {route.recommended && (
        <span className="absolute -top-[11px] right-6 rounded-md bg-brand-cyan px-3 py-1 text-[11px] font-bold tracking-[0.06em] text-navy-900">
          RECOMMENDED
        </span>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <TrainFront className="size-[22px] text-mist-400" strokeWidth={1.6} />
          <span className="text-[17px] font-semibold text-white">
            {route.line}
          </span>
        </span>
        <span className="shrink-0 text-[19px] font-bold text-white">
          {route.duration}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[17px] font-semibold text-white tabular-nums">
          {route.departure} <span className="text-mist-400">→</span>{' '}
          {route.arrival}
        </span>
        <span className="shrink-0 rounded-md bg-navy-800 px-3 py-1 text-[12px] text-mist-200">
          {route.transfer}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-navy-700/40 pt-3">
        <span className="flex items-center gap-2 text-[13px] text-mist-400">
          <span className={`size-2 rounded-full ${tone.dot}`} />
          Crowd level:{' '}
          <span className={`font-medium ${tone.text}`}>{tone.label}</span>
        </span>
        <span className="text-[14px] text-mist-200 tabular-nums">
          {route.fare}
        </span>
      </div>
    </button>
  )
}

export default RouteCard
