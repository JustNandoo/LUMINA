import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import type { ReactNode } from 'react'

type FormAlertTone = 'error' | 'success' | 'info'

const toneClasses: Record<FormAlertTone, string> = {
  error: 'border-danger-soft/25 bg-danger-soft/12 text-danger-soft',
  success: 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan',
  info: 'border-mist-400/25 bg-mist-400/10 text-mist-200',
}

const toneIcons: Record<FormAlertTone, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
}

type FormAlertProps = {
  tone?: FormAlertTone
  children: ReactNode
  className?: string
}

/** Banner pesan di atas/bawah form — dipakai untuk balasan dari API. */
function FormAlert({ tone = 'error', children, className = '' }: FormAlertProps) {
  const Icon = toneIcons[tone]

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-left text-[13px] leading-[1.5] ${toneClasses[tone]} ${className}`}
    >
      <Icon className="mt-px size-4 shrink-0" strokeWidth={1.8} />
      <span className="min-w-0">{children}</span>
    </div>
  )
}

export default FormAlert
