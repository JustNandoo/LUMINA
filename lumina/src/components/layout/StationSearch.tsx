import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Search, TrainFront, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { crowdTone } from '../../lib/crowdTone'
import { fetchStations } from '../../lib/geoApi'
import type { StationSummary } from '../../lib/geoApi'
import { searchStations } from '../../lib/stationSearch'

type StationSearchProps = {
  placeholder: string
  /** Daftar yang sudah dimuat halaman. Kosongkan agar komponen memuatnya sendiri. */
  stations?: StationSummary[]
  loading?: boolean
  /** Tanpa ini, memilih hasil membuka Explore pada stasiun tersebut. */
  onSelect?: (station: StationSummary) => void
}

function StationSearch({ placeholder, stations, loading = false, onSelect }: StationSearchProps) {
  const navigate = useNavigate()
  const listId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetched = useApi(() => fetchStations(), [], { enabled: stations === undefined })
  // Dibungkus useMemo: tanpa ini `?? []` membuat array baru setiap render dan
  // hasil pencarian di bawah dihitung ulang terus-menerus.
  const pool = useMemo(() => stations ?? fetched.data ?? [], [stations, fetched.data])
  const isLoading = stations === undefined ? fetched.loading : loading

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  // Sorotan dipasangkan dengan kata kunci saat itu, jadi mengetik ulang
  // otomatis kembali ke hasil teratas tanpa perlu effect.
  const [highlight, setHighlight] = useState({ key: '', index: 0 })

  const matches = useMemo(() => searchStations(pool, query), [pool, query])
  const active =
    highlight.key === query ? Math.min(highlight.index, Math.max(matches.length - 1, 0)) : 0
  const setActive = (index: number) => setHighlight({ key: query, index })

  const showList = open && query.trim().length > 0
  const onlyFuzzy = matches.length > 0 && matches.every((match) => match.fuzzy)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const commit = (station: StationSummary) => {
    if (onSelect) onSelect(station)
    else navigate(`/app/explore?station=${encodeURIComponent(station.id)}`)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      if (matches.length === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((active + step + matches.length) % matches.length)
      return
    }
    if (event.key === 'Enter' && matches[active]) {
      event.preventDefault()
      commit(matches[active].station)
      return
    }
    if (event.key === 'Escape') {
      if (query) setQuery('')
      else inputRef.current?.blur()
      setOpen(false)
    }
  }

  return (
    <div ref={wrapper} className="relative w-full max-w-[358px] min-w-0">
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-mist-400"
        strokeWidth={1.8}
      />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label="Cari stasiun atau kawasan"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && matches[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-[34px] w-full rounded-[10px] bg-navy-950/70 pr-9 pl-11 text-[14px] text-white transition-colors placeholder:text-mist-400 focus:ring-1 focus:ring-mist-400/50 focus:outline-none"
      />
      {query && (
        <button
          type="button"
          aria-label="Hapus pencarian"
          onClick={() => {
            setQuery('')
            inputRef.current?.focus()
          }}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-mist-400 transition-colors hover:text-white"
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      )}

      {showList && (
        <div className="animate-auth-in absolute inset-x-0 top-[calc(100%+6px)] z-50 min-w-[300px] overflow-hidden rounded-[12px] border border-navy-700 bg-navy-900 shadow-2xl">
          {isLoading && pool.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-mist-400">Memuat daftar stasiun…</p>
          ) : matches.length === 0 ? (
            <div className="px-4 py-3">
              <p className="text-[13px] text-white">
                Tidak ada stasiun atau kawasan yang cocok dengan “{query.trim()}”.
              </p>
              <p className="mt-1 text-[12px] text-mist-400">
                Coba nama stasiun, kecamatan, atau lin — misalnya “Tebet” atau “Bogor”.
              </p>
            </div>
          ) : (
            <>
              {onlyFuzzy && (
                <p className="px-4 pt-2.5 pb-1 text-[11px] font-medium tracking-[0.08em] text-mist-400">
                  MUNGKIN MAKSUD KAMU
                </p>
              )}
              <ul id={listId} role="listbox" className="max-h-[320px] overflow-y-auto py-1.5">
                {matches.map((match, index) => {
                  const { station } = match
                  const tone = station.level ? crowdTone[station.level] : null
                  return (
                    <li
                      key={station.id}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={index === active}
                      onPointerEnter={() => setActive(index)}
                      // pointerdown supaya pilihan terjadi sebelum input kehilangan fokus.
                      onPointerDown={(event) => {
                        event.preventDefault()
                        commit(station)
                      }}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors ${
                        index === active ? 'bg-navy-800' : ''
                      }`}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10">
                        <TrainFront className="size-3.5 text-brand-cyan" strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-white">
                          {station.name}
                        </span>
                        <span className="block truncate text-[11px] text-mist-400">
                          Lin {station.line} · {station.district}
                        </span>
                      </span>
                      {tone && station.index !== undefined && (
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${tone.chip}`}>
                          {tone.label} {station.index}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default StationSearch
