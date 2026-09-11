import { useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'

type OtpInputProps = {
  /** Kode saat ini, mis. "4170" (boleh lebih pendek dari `length`). */
  value: string
  onChange: (value: string) => void
  /** Dipanggil sekali saat seluruh digit terisi. */
  onComplete?: (value: string) => void
  length?: number
  disabled?: boolean
  hasError?: boolean
  className?: string
}

function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  hasError = false,
  className = '',
}: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, index) => value[index] ?? '')

  const emit = (next: string) => {
    onChange(next)
    if (next.length === length) onComplete?.(next)
  }

  const handleChange = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, '')
    if (!typed) return

    // Ketik satu digit, atau tempel beberapa digit sekaligus dari posisi ini.
    const next = (
      value.slice(0, index) +
      typed +
      value.slice(index + typed.length)
    ).slice(0, length)

    emit(next)
    const focusTarget = Math.min(index + typed.length, length - 1)
    inputs.current[focusTarget]?.focus()
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (digits[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1))
        return
      }
      if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index))
        inputs.current[index - 1]?.focus()
      }
      return
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      inputs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '')
    if (!pasted) return
    event.preventDefault()
    const next = pasted.slice(0, length)
    emit(next)
    inputs.current[Math.min(next.length, length - 1)]?.focus()
  }

  return (
    <div className={`flex gap-[6px] ${className}`}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element
          }}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          disabled={disabled}
          autoFocus={index === 0}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={hasError || undefined}
          className={`h-[52px] min-w-0 flex-1 rounded-lg border bg-navy-900/40 text-center text-[18px] font-medium text-white transition-colors focus:outline-none disabled:opacity-50 ${
            hasError
              ? 'border-danger/70 focus:border-danger'
              : 'border-navy-700 focus:border-brand-cyan'
          }`}
        />
      ))}
    </div>
  )
}

export default OtpInput
