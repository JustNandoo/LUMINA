import { useEffect, useMemo, useRef, useState } from 'react'
import { Headset, Send, Sparkles, X } from 'lucide-react'
import { useApi, errorMessage } from '../../hooks/useApi'
import {
  askAssistant,
  fetchAssistantStatus,
  fetchSuggestions,
} from '../../lib/assistantApi'
import type { AssistantMode, ChatTurn } from '../../lib/assistantApi'

type Message = ChatTurn & {
  /** Hanya pada balasan asisten. */
  mode?: AssistantMode
  note?: string
}

type AssistantPanelProps = {
  /** Salah satu diisi — menentukan angka mana yang boleh dirujuk asisten. */
  stationId?: string
  areaId?: string
  /** Kalimat pembuka dari sistem, mis. ringkasan stasiun terpilih. */
  onClose: () => void
  className?: string
}

function AssistantPanel({
  stationId,
  areaId,
  onClose,
  className = '',
}: AssistantPanelProps) {
  // Percakapan disimpan bersama fokusnya. Ganti stasiun/kawasan = percakapan
  // baru, dan itu dihitung saat render supaya tidak perlu effect yang
  // mengosongkan state (yang memicu render berantai).
  const focusKey = `${stationId ?? ''}|${areaId ?? ''}`
  const [thread, setThread] = useState<{ key: string; messages: Message[] }>({
    key: focusKey,
    messages: [],
  })
  const messages = useMemo(
    () => (thread.key === focusKey ? thread.messages : []),
    [thread, focusKey],
  )

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const status = useApi(() => fetchAssistantStatus(), [])
  const suggestions = useApi(
    () => fetchSuggestions({ stationId, areaId }),
    [stationId, areaId],
  )

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, sending])

  const send = async (question: string) => {
    const text = question.trim()
    if (!text || sending) return

    const history = messages.map(({ role, content }) => ({ role, content }))
    setThread({
      key: focusKey,
      messages: [...messages, { role: 'user', content: text }],
    })
    setDraft('')
    setSending(true)
    setError(null)

    try {
      const reply = await askAssistant({ question: text, stationId, areaId, history })
      setThread((current) => ({
        key: focusKey,
        messages: [
          ...current.messages,
          {
            role: 'assistant',
            content: reply.answer,
            mode: reply.mode,
            note: reply.note,
          },
        ],
      }))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSending(false)
    }
  }

  const showSuggestions = messages.length === 0 && !sending

  return (
    <section
      className={`flex w-full flex-col rounded-[14px] border border-mist-400/40 bg-navy-900/90 backdrop-blur-md ${className}`}
    >
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

      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3.5">
        {/* Saat layanan AI mati, katakan terus terang — bukan disembunyikan. */}
        {status.data && !status.data.enabled && (
          <p className="rounded-lg bg-navy-800/70 px-3.5 py-2.5 text-[12px] leading-[1.5] text-mist-200">
            {status.data.fallback_note}
          </p>
        )}

        {showSuggestions && (
          <>
            <p className="rounded-lg bg-navy-800/80 px-3.5 py-2.5 text-[13px] leading-[1.5] text-white">
              Tanyakan apa saja tentang lokasi ini. Saya hanya menjawab dari
              indeks yang ada di sistem.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              {(suggestions.data ?? []).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => send(item)}
                  className="flex items-start gap-2 rounded-lg border border-navy-700/60 bg-navy-800/50 px-3 py-2.5 text-left text-[12px] text-mist-100 transition-colors hover:border-brand-cyan/50 hover:text-white"
                >
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-cyan" strokeWidth={1.8} />
                  {item}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((message, index) =>
          message.role === 'user' ? (
            <p
              key={index}
              className="ml-auto max-w-[85%] rounded-lg bg-navy-700/70 px-3.5 py-2.5 text-[13px] text-white"
            >
              {message.content}
            </p>
          ) : (
            <div key={index} className="max-w-[92%]">
              <p className="rounded-lg bg-navy-800/80 px-3.5 py-2.5 text-[13px] leading-[1.55] text-white">
                {message.content}
              </p>
              {message.mode === 'fallback' && (
                <p className="mt-1 px-1 text-[10px] text-mist-400">
                  Dirakit langsung dari indeks
                  {message.note ? ` · ${message.note}` : ''}
                </p>
              )}
            </div>
          ),
        )}

        {sending && (
          <p className="max-w-[92%] rounded-lg bg-navy-800/60 px-3.5 py-2.5 text-[13px] text-mist-400">
            Membaca indeks…
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-[12px] text-danger-soft">
            {error}
          </p>
        )}
      </div>

      <div className="px-3.5 pb-3.5">
        <div className="flex items-center gap-2 rounded-lg bg-navy-800/80 py-2.5 pr-2.5 pl-3.5">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && send(draft)}
            disabled={sending}
            placeholder="Tanya tentang lokasi ini…"
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-mist-400 focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => send(draft)}
            disabled={sending || !draft.trim()}
            aria-label="Kirim pesan"
            className="text-brand-cyan transition-colors hover:text-white disabled:opacity-40"
          >
            <Send className="size-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </section>
  )
}

export default AssistantPanel
