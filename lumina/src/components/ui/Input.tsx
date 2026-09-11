import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'
import FieldError from './FieldError'

type InputVariant = 'default' | 'pill'

const variantClasses: Record<InputVariant, string> = {
  default: 'h-[53px] rounded-[10px] bg-transparent',
  pill: 'h-[51px] rounded-full bg-navy-800',
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  icon?: LucideIcon
  label: string
  type?: 'text' | 'email' | 'password'
  variant?: InputVariant
  /** Pesan validasi dari API atau pengecekan lokal. */
  error?: string
}

function Input({
  icon: Icon,
  label,
  type = 'text',
  variant = 'default',
  className = '',
  error,
  ...props
}: InputProps) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={className}>
      <div className="mb-[15px] flex items-center gap-2.5 pl-[18px]">
        {Icon && <Icon className="size-5 text-white" strokeWidth={1.5} />}
        <span className="text-[14px] font-medium tracking-[0.1em] text-white">
          {label}
        </span>
      </div>

      <div className="relative">
        <input
          type={isPassword && !revealed ? 'password' : 'text'}
          aria-invalid={error ? true : undefined}
          className={`w-full border px-14 text-center text-[15px] tracking-[0.05em] text-white transition-colors placeholder:text-mist-400 focus:outline-none disabled:opacity-60 ${
            error
              ? 'border-danger/80 focus:border-danger'
              : 'border-mist-400/70 focus:border-mist-100'
          } ${variantClasses[variant]}`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="absolute top-1/2 right-[31px] -translate-y-1/2 text-mist-100 transition-colors hover:text-white"
          >
            {revealed ? (
              <EyeOff className="size-[22px]" strokeWidth={1.5} />
            ) : (
              <Eye className="size-[22px]" strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>

      <FieldError message={error} className="text-center" />
    </div>
  )
}

export default Input
