import { useState } from 'react'
import { Headset, ImageIcon, Send, X } from 'lucide-react'
import { amenitySpots } from './stationData'
import type { Amenity } from './stationData'

type StationAssistantPanelProps = {
  amenity: Amenity | null
  onClose: () => void
}

function StationAssistantPanel({
  amenity,
  onClose,
}: StationAssistantPanelProps) {
  const [draft, setDraft] = useState('')
  const [questions, setQuestions] = useState<string[]>([])

  const spots = amenity ? amenitySpots(amenity) : []

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setQuestions((current) => [...current, text])
    setDraft('')
  }

  return (
    <section className="flex h-[380px] w-full flex-col lg:h-[467px] lg:w-[303px] rounded-[14px] border border-mist-400/40 bg-navy-900/90 backdrop-blur-md">
      <header className="flex items-center justify-between border-b border-navy-700/50 px-4 py-3.5">
        <span className="flex items-center gap-2 text-[15px] font-medium text-white">
          <Headset className="size-[17px] text-mist-100" strokeWidth={1.8} />
          Lumina AI
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup chat"
          className="text-mist-400 transition-colors hover:text-white"
        >
          <X className="size-[17px]" strokeWidth={2} />
        </button>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3.5">
        {amenity && (
          <>
            <p className="rounded-lg bg-navy-800/80 px-3.5 py-2.5 text-[13px] leading-[1.5] text-white">
              I found {spots.length} {amenity.label.toLowerCase()} locations at
              Manggarai Station.
            </p>

            {spots.map((spot) => (
              <article
                key={spot.name}
                className="flex gap-2.5 rounded-lg border border-navy-700/60 bg-navy-800/60 p-2"
              >
                {/* Placeholder foto — tinggal ganti dengan gambar asli. */}
                <span className="flex size-[52px] shrink-0 items-center justify-center rounded-md bg-navy-950 text-mist-400">
                  <ImageIcon className="size-5" strokeWidth={1.6} />
                </span>
                <div className="min-w-0 flex-1">
                  {spot.nearest && (
                    <span className="text-[8px] font-bold tracking-wide text-brand-cyan">
                      Nearest
                    </span>
                  )}
                  <p className="truncate text-[11px] font-semibold text-white">
                    {spot.name}
                  </p>
                  <p className="truncate text-[9px] text-mist-400">
                    {spot.detail}
                  </p>
                  <p className="text-[9px] text-mist-400">
                    {spot.distance} • Public Access
                  </p>
                </div>
              </article>
            ))}
          </>
        )}

        {questions.map((question, index) => (
          <p
            key={index}
            className="ml-auto max-w-[230px] rounded-lg bg-navy-700/70 px-3.5 py-2.5 text-[13px] text-white"
          >
            {question}
          </p>
        ))}

        {!amenity && questions.length === 0 && (
          <p className="pt-20 text-center text-[13px] text-mist-400">
            Pilih fasilitas stasiun atau tanyakan apa pun tentang stasiun ini.
          </p>
        )}
      </div>

      <div className="px-3.5 pb-3.5">
        <div className="flex items-center gap-2 rounded-lg bg-navy-800/80 py-2.5 pr-2.5 pl-3.5">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && send()}
            placeholder="Ask about this station..."
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-mist-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            aria-label="Kirim pesan"
            className="text-brand-cyan transition-colors hover:text-white"
          >
            <Send className="size-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </section>
  )
}

export default StationAssistantPanel
