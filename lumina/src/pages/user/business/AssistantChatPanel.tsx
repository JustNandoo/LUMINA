import { useState } from 'react'
import { Headset, Send, X } from 'lucide-react'
import luminaLogo from '../../../assets/images/Logo/Lumina_Logo.png'

type ChatMessage = {
  id: number
  text: string
}

type AssistantChatPanelProps = {
  onClose: () => void
}

function AssistantChatPanel({ onClose }: AssistantChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [processing, setProcessing] = useState(false)

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setMessages((current) => [...current, { id: Date.now(), text }])
    setDraft('')
    setProcessing(true)
  }

  return (
    <section className="flex h-[380px] w-full flex-col lg:h-[572px] lg:w-[370px] rounded-[14px] border border-navy-700/50 bg-navy-900/85 backdrop-blur-md">
      <header className="flex items-center justify-between border-b border-navy-700/40 px-[22px] py-[18px]">
        <span className="flex items-center gap-2.5 text-[17px] font-medium text-white">
          <Headset className="size-[19px] text-mist-100" strokeWidth={1.8} />
          Lumina AI
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup chat"
          className="text-mist-400 transition-colors hover:text-white"
        >
          <X className="size-[19px]" strokeWidth={2} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-[18px] py-[18px]">
        {messages.length === 0 && !processing ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <img src={luminaLogo} alt="" className="h-12 w-auto" />
            <p className="mt-5 text-[19px] font-medium text-white">
              Halo, Lumina
            </p>
            <p className="mt-2 text-[13px] text-mist-400">
              Send your first message to start a chat with the AI
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <p
                key={message.id}
                className="ml-auto max-w-[300px] rounded-[10px] bg-navy-700/70 px-4 py-3 text-[14px] leading-[1.55] text-white"
              >
                {message.text}
              </p>
            ))}
            {processing && (
              <p className="mr-auto max-w-[300px] rounded-[10px] bg-navy-800/80 px-4 py-3 text-[14px] text-mist-200">
                Memproses jawaban...
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-[18px] pb-[18px]">
        <div className="flex items-center gap-2 rounded-[10px] bg-navy-800/80 py-3 pr-3 pl-4">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && send()}
            placeholder="Ketik disini..."
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-mist-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            aria-label="Kirim pesan"
            className="text-brand-cyan transition-colors hover:text-white"
          >
            <Send className="size-[18px]" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </section>
  )
}

export default AssistantChatPanel
