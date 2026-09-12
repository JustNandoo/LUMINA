import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { StationSummary } from '../../lib/geoApi'

type StationComboboxProps = {
  label: string
  marker: ReactNode
  stations: StationSummary[]
  value: string
  onChange: (stationId: string) => void
  /** Stasiun yang tidak boleh dipilih di sini (mis. sudah jadi asal). */
  excludeId?: string
  placeholder?: string
}

/**
 * Pemilih stasiun dengan cara diketik.
 *
 * Sebelumnya memakai <select> yang menampilkan "Jayakarta · Bogor" — nama
 * stasiun dan nama lin dipisah titik. Itu terbaca seolah tujuannya dua kota.
 * Di sini nama stasiun berdiri sendiri sebagai teks utama, dan lin hanya
 * keterangan kecil di bawahnya.
 */
function StationCombobox({
  label,
  marker,
  stations,
  value,
  onChange,
  excludeId,
  placeholder = 'Ketik nama stasiun…',
}: StationComboboxProps) {
  const inputId = useId()
  const listId = `${inputId}-list`
  const wrapper = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = stations.find((station) => station.id === value) ?? null

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  // Indeks sorotan dipasangkan dengan kata kunci yang berlaku saat itu, jadi
  // mengetik ulang otomatis mengembalikannya ke hasil teratas tanpa effect.
  const [highlight, setHighlight] = useState({ key: '', index: 0 })

  // Saat tertutup, kotak menampilkan stasiun terpilih; saat dibuka, isinya
  // jadi milik pengguna sepenuhnya supaya bisa langsung diketik ulang.
  const display = open ? query : (selected?.name ?? '')

  const matches = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const pool = stations.filter((station) => station.id !== excludeId)
    if (!keyword) return pool.slice(0, 60)
    // Yang namanya diawali kata kunci didahulukan — "Duri" harus muncul di
    // atas "Duren Kalibata" saat mengetik "dur".
    const starts = pool.filter((s) => s.name.toLowerCase().startsWith(keyword))
    const contains = pool.filter(
      (s) =>
        !s.name.toLowerCase().startsWith(keyword) &&
        (s.name.toLowerCase().includes(keyword) ||
          s.line.toLowerCase().includes(keyword)),
    )
    return [...starts, ...contains].slice(0, 60)
  }, [stations, query, excludeId])

  const active =
    highlight.key === query
      ? Math.min(highlight.index, Math.max(matches.length - 1, 0))
      : 0
  const setActive = (index: number) => setHighlight({ key: query, index })

  // Klik di luar menutup daftar tanpa mengubah pilihan.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const commit = (station: StationSummary) => {
    onChange(station.id)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) return setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((active + step + matches.length) % Math.max(matches.length, 1))
      return
    }
    if (event.key === 'Enter' && open && matches[active]) {
      event.preventDefault()
      commit(matches[active])
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div
      ref={wrapper}
      className="relative rounded-[14px] border border-navy-700/50 bg-navy-950 px-5 py-3.5 transition-colors focus-within:border-brand-cyan/60 sm:px-6"
    >
      <div className="flex items-center gap-4">
        {marker}
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="block text-[13px] text-mist-400">
            {label}
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            value={display}
            placeholder={placeholder}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              setOpen(true)
              setQuery('')
            }}
            onKeyDown={onKeyDown}
            className="mt-0.5 w-full truncate bg-transparent pr-6 text-[20px] leading-tight font-semibold text-white placeholder:text-[17px] placeholder:font-normal placeholder:text-mist-400 focus:outline-none"
          />
          {!open && selected && (
            <p className="mt-0.5 text-[12px] text-mist-400">Lin {selected.line}</p>
          )}
        </div>

        {open && (
          <button
            type="button"
            aria-label="Batal"
            onClick={() => {
              setOpen(false)
              setQuery('')
            }}
            className="shrink-0 text-mist-400 transition-colors hover:text-white"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[280px] overflow-y-auto rounded-[12px] border border-navy-700 bg-navy-900 py-1.5 shadow-2xl"
        >
          {matches.length === 0 ? (
            <li className="px-4 py-3 text-[13px] text-mist-400">
              Tidak ada stasiun yang cocok dengan “{query}”.
            </li>
          ) : (
            matches.map((station, index) => (
              <li key={station.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={station.id === value}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => commit(station)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                    index === active ? 'bg-navy-800' : ''
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-white">
                      {station.name}
                    </span>
                    <span className="block text-[11px] text-mist-400">
                      Lin {station.line}
                      {station.interchange ? ' · titik transit' : ''}
                    </span>
                  </span>
                  {station.id === value && (
                    <Check className="size-4 shrink-0 text-brand-cyan" strokeWidth={2.4} />
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default StationCombobox
