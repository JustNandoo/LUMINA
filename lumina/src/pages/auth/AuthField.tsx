import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'
import FieldError from '../../components/ui/FieldError'

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  icon: LucideIcon
  label: string
  type?: 'text' | 'email' | 'password'
  /** Pesan validasi dari API atau pengecekan lokal. */
  error?: string
}

function AuthField({
  icon: Icon,
  label,
  type = 'text',
  className = '',
  error,
  ...props
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={className}>
      <div className="mb-[10px] flex items-center gap-2 pl-[15px]">
        <Icon className="size-[15px] text-white/65" strokeWidth={1.6} />
        <span className="text-[13px] font-medium text-white">{label}</span>
      </div>

      <div className="relative">
        <input
          type={isPassword && !revealed ? 'password' : 'text'}
          aria-invalid={error ? true : undefined}
          className={`h-[45px] w-full rounded-[12px] border bg-white/6 pr-12 pl-[30px] text-[13px] text-white backdrop-blur-md transition-colors placeholder:text-white/45 focus:bg-white/10 focus:outline-none disabled:opacity-60 ${
            error
              ? 'border-danger/70 focus:border-danger'
              : 'border-white/12 focus:border-white/35'
          }`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="absolute top-1/2 right-[22px] -translate-y-1/2 text-white/60 transition-colors hover:text-white"
          >
            {revealed ? (
              <Eye className="size-[15px]" strokeWidth={1.6} />
            ) : (
              <EyeOff className="size-[15px]" strokeWidth={1.6} />
            )}
          </button>
        )}
      </div>

      <FieldError message={error} className="pl-[15px]" />
    </div>
  )
}

export default AuthField
