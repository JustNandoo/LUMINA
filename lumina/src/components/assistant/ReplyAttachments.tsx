import { useId } from 'react'
import {
  ArrowLeftRight,
  ArrowRight,
  Clock,
  MapPin,
  Route,
  Store,
  TrainFront,
  Wallet,
} from 'lucide-react'
import { formatDuration, formatRupiah } from '../../lib/crowdTone'
import type {
  AssistantAction,
  AssistantAttachments,
  RouteCard,
  RouteStop,
} from '../../lib/assistantApi'

/**
 * Warna garis per lin. Dicocokkan lewat nama, bukan daftar tetap, supaya lin
 * yang belum dikenal tetap tergambar dengan warna aksen aplikasi.
 */
function lineColor(line: string): string {
  const name = line.toLowerCase()
  if (name.includes('bogor')) return '#f87171'
  if (name.includes('cikarang')) return '#60a5fa'
  if (name.includes('rangkas')) return '#4ade80'
  if (name.includes('tangerang')) return '#fbbf24'
  if (name.includes('priok')) return '#f472b6'
  return '#5de6ff'
}

const WIDTH = 264
const HEIGHT = 128
const PADDING = 22

/**
 * Peta mini rute dari koordinat stasiun yang sebenarnya. Sengaja SVG, bukan
 * peta WebGL: satu percakapan bisa memuat banyak kartu, dan browser membatasi
 * jumlah konteks WebGL yang boleh hidup bersamaan.
 */
function RouteThumbnail({ card }: { card: RouteCard }) {
  const gridId = useId()
  const lats = card.stops.map((stop) => stop.position[0])
  const lngs = card.stops.map((stop) => stop.position[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  // Bujur dipersempit sesuai lintang supaya bentuk rute tidak gepeng.
  const squash = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
  const spanX = Math.max((maxLng - minLng) * squash, 0.004)
  const spanY = Math.max(maxLat - minLat, 0.004)
  const scale = Math.min((WIDTH - PADDING * 2) / spanX, (HEIGHT - PADDING * 2) / spanY)
  const offsetX = (WIDTH - spanX * scale) / 2
  const offsetY = (HEIGHT - spanY * scale) / 2

  const project = ([lat, lng]: [number, number]) => ({
    x: offsetX + (lng - minLng) * squash * scale,
    y: offsetY + (maxLat - lat) * scale,
  })

  const labels = placeLabels(
    card.stops
      .filter((stop) => stop.role !== 'pass')
      .map((stop) => ({ stop, ...project(stop.position) })),
  )

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`Peta mini rute ${card.origin.name} ke ${card.destination.name}`}
    >
      <defs>
        <pattern id={gridId} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="#1e2f4f" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width={WIDTH} height={HEIGHT} rx="10" fill="#0a1730" />
      <rect width={WIDTH} height={HEIGHT} rx="10" fill={`url(#${gridId})`} />

      {card.segments.map((segment, index) => (
        <polyline
          key={`${segment.line}-${index}`}
          points={segment.points
            .map((point) => {
              const { x, y } = project(point)
              return `${x.toFixed(1)},${y.toFixed(1)}`
            })
            .join(' ')}
          fill="none"
          stroke={lineColor(segment.line)}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {card.stops
        .filter((stop) => stop.role === 'pass')
        .map((stop) => {
          const { x, y } = project(stop.position)
          return <circle key={stop.id} cx={x} cy={y} r="1.8" fill="#d9dee7" />
        })}

      {labels.map((label) => (
        <StopMarker key={label.stop.id} {...label} />
      ))}
    </svg>
  )
}

type PlacedLabel = {
  stop: RouteStop
  x: number
  y: number
  alignEnd: boolean
  labelY: number
}

const LABEL_HEIGHT = 11
const CHAR_WIDTH = 5.4

/**
 * Menempatkan label asal, transit, dan tujuan tanpa saling menimpa. Stasiun
 * yang berdekatan — Tanah Abang dan Manggarai hanya berjarak dua stasiun —
 * akan saling tumpuk kalau tiap label diletakkan tanpa melihat tetangganya.
 * Setiap label mencoba sisi alaminya, lalu sisi seberang, lalu bergeser turun.
 */
function placeLabels(points: { stop: RouteStop; x: number; y: number }[]): PlacedLabel[] {
  const placed: (PlacedLabel & { left: number; right: number })[] = []
  const ordered = [...points].sort(
    (a, b) => Number(b.stop.role !== 'transfer') - Number(a.stop.role !== 'transfer'),
  )

  for (const point of ordered) {
    const width = point.stop.name.length * CHAR_WIDTH
    const naturalEnd = point.x > WIDTH / 2
    const baseY = point.y < 16 ? point.y + 14 : point.y - 8

    const box = (alignEnd: boolean, labelY: number) => {
      const left = alignEnd ? point.x - 7 - width : point.x + 7
      return { left, right: left + width, labelY }
    }
    const collides = (candidate: { left: number; right: number; labelY: number }) =>
      placed.some(
        (other) =>
          candidate.left < other.right + 3 &&
          other.left < candidate.right + 3 &&
          Math.abs(candidate.labelY - other.labelY) < LABEL_HEIGHT,
      ) ||
      // Jangan menimpa penanda titik lain.
      points.some(
        (other) =>
          other.stop.id !== point.stop.id &&
          other.x > candidate.left - 5 &&
          other.x < candidate.right + 5 &&
          other.y > candidate.labelY - LABEL_HEIGHT &&
          other.y < candidate.labelY + 4,
      )

    const attempts = [
      { alignEnd: naturalEnd, labelY: baseY },
      { alignEnd: !naturalEnd, labelY: baseY },
      { alignEnd: naturalEnd, labelY: point.y + 14 },
      { alignEnd: !naturalEnd, labelY: point.y + 14 },
    ]
    const chosen =
      attempts.find((attempt) => !collides(box(attempt.alignEnd, attempt.labelY))) ?? attempts[0]
    const chosenBox = box(chosen.alignEnd, chosen.labelY)

    // Label yang keluar dari kotak ditarik masuk lewat perataan sisi.
    let alignEnd = chosen.alignEnd
    if (chosenBox.left < 4) alignEnd = false
    if (chosenBox.right > WIDTH - 4) alignEnd = true
    const finalBox = box(alignEnd, Math.min(Math.max(chosen.labelY, 11), HEIGHT - 4))

    placed.push({ ...point, alignEnd, labelY: finalBox.labelY, left: finalBox.left, right: finalBox.right })
  }

  return placed.map(({ stop, x, y, alignEnd, labelY }) => ({ stop, x, y, alignEnd, labelY }))
}

function StopMarker({ stop, x, y, alignEnd, labelY }: PlacedLabel) {
  const fill =
    stop.role === 'origin' ? '#5de6ff' : stop.role === 'destination' ? '#f87171' : '#0a1730'

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={stop.role === 'transfer' ? 3.6 : 4.6}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={stop.role === 'transfer' ? 2 : 1.5}
      />
      <text
        x={alignEnd ? x - 7 : x + 7}
        y={labelY}
        textAnchor={alignEnd ? 'end' : 'start'}
        fontSize="9.5"
        fontWeight={stop.role === 'transfer' ? 500 : 700}
        fill="#ffffff"
        stroke="#0a1730"
        strokeWidth="3"
        paintOrder="stroke"
      >
        {stop.name}
      </text>
    </g>
  )
}

function RouteSummary({ card }: { card: RouteCard }) {
  const lines = [...new Set(card.segments.map((segment) => segment.line))]
  const transfers = card.stops.filter((stop) => stop.role === 'transfer')

  return (
    <div className="overflow-hidden rounded-lg border border-navy-700/60 bg-navy-900/70">
      <RouteThumbnail card={card} />
      <div className="space-y-2 px-3 py-2.5">
        <p className="text-[12px] font-semibold text-white">
          {card.origin.name} <span className="text-mist-400">→</span> {card.destination.name}
        </p>
        <div className="flex flex-wrap gap-1.5 text-[11px] text-mist-100">
          <span className="inline-flex items-center gap-1 rounded-md bg-navy-800 px-2 py-0.5">
            <Clock className="size-3 text-brand-cyan" strokeWidth={2} />
            {formatDuration(card.estimated_minutes)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-navy-800 px-2 py-0.5">
            <Wallet className="size-3 text-brand-cyan" strokeWidth={2} />
            {formatRupiah(card.estimated_fare_rupiah)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-navy-800 px-2 py-0.5">
            <TrainFront className="size-3 text-brand-cyan" strokeWidth={2} />
            {card.stop_count} stasiun
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-navy-800 px-2 py-0.5">
            <ArrowLeftRight className="size-3 text-brand-cyan" strokeWidth={2} />
            {card.transfer_count === 0
              ? 'Tanpa transit'
              : `Transit di ${transfers.map((stop) => stop.name).join(', ')}`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-mist-400">
          {lines.map((line) => (
            <span key={line} className="inline-flex items-center gap-1">
              <span className="h-[3px] w-3 rounded-full" style={{ background: lineColor(line) }} />
              Lin {line}
            </span>
          ))}
          <span className="ml-auto italic">estimasi LUMINA</span>
        </div>
      </div>
    </div>
  )
}

const ACTION_ICONS = {
  plan_trip: Route,
  open_station: MapPin,
  open_area: Store,
} as const

type ReplyAttachmentsProps = {
  attachments: AssistantAttachments
  onAction: (action: AssistantAction) => void
}

/** Kartu rute dan tombol aksi di bawah jawaban Lumina AI. */
function ReplyAttachments({ attachments, onAction }: ReplyAttachmentsProps) {
  const { route, actions } = attachments
  if (!route && actions.length === 0) return null

  const [primary, ...secondary] = actions

  return (
    <div className="mt-2 space-y-2">
      {route && <RouteSummary card={route} />}

      {primary && (
        <div className="flex flex-col gap-1.5">
          {primary.type === 'plan_trip' ? (
            <button
              type="button"
              onClick={() => onAction(primary)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-cyan px-3 py-2 text-[12px] font-semibold text-navy-900 transition hover:brightness-110"
            >
              <Route className="size-3.5" strokeWidth={2.2} />
              {primary.label}
              <ArrowRight className="size-3.5" strokeWidth={2.2} />
            </button>
          ) : (
            <ActionButton action={primary} onAction={onAction} />
          )}
          {secondary.map((action) => (
            <ActionButton
              key={`${action.type}-${'station_id' in action ? action.station_id : ''}`}
              action={action}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ActionButton({
  action,
  onAction,
}: {
  action: AssistantAction
  onAction: (action: AssistantAction) => void
}) {
  const Icon = ACTION_ICONS[action.type]
  return (
    <button
      type="button"
      onClick={() => onAction(action)}
      className="flex w-full items-center gap-2 rounded-lg border border-navy-700/70 bg-navy-800/50 px-3 py-2 text-left text-[12px] text-mist-100 transition-colors hover:border-brand-cyan/50 hover:text-white"
    >
      <Icon className="size-3.5 shrink-0 text-brand-cyan" strokeWidth={2} />
      <span className="min-w-0 flex-1 truncate">{action.label}</span>
      <ArrowRight className="size-3.5 shrink-0 text-mist-400" strokeWidth={2} />
    </button>
  )
}

export default ReplyAttachments
