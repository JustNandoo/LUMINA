import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'

type AdminFormDialogProps = {
  open: boolean
  title: string
  submitLabel: string
  submitting?: boolean
  error?: string | null
  children: ReactNode
  onSubmit: () => void
  onCancel: () => void
}

/**
 * Modal form untuk CRUD sisi admin. Dirender lewat portal ke <body> supaya
 * tidak terjebak stacking context halaman peta.
 */
function AdminFormDialog({
  open,
  title,
  submitLabel,
  submitting,
  error,
  children,
  onSubmit,
  onCancel,
}: AdminFormDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-navy-950/70 px-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-[440px] rounded-[14px] border border-navy-700 bg-navy-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[19px] font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup"
            className="text-mist-400 transition-colors hover:text-white"
          >
            <X className="size-[18px]" strokeWidth={2} />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">{children}</div>

        {error && (
          <p className="mt-4 rounded-lg bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger-soft">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[10px] border border-navy-700 py-3 text-[14px] font-medium text-mist-100 transition-colors hover:bg-navy-800"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-[10px] bg-brand-cyan py-3 text-[14px] font-semibold text-navy-900 transition-colors hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? 'Menyimpan…' : submitLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

type FieldProps = {
  label: string
  children: ReactNode
  hint?: string
}

export function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] text-mist-200">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-mist-400">{hint}</span>}
    </label>
  )
}

export const fieldClass =
  'h-[42px] rounded-[10px] border border-navy-700 bg-navy-950 px-3.5 text-[14px] text-white placeholder:text-mist-400 focus:border-brand-cyan/60 focus:outline-none'

export default AdminFormDialog
