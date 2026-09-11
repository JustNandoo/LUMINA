import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode, RefObject } from 'react'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** 'danger' untuk aksi yang mengakhiri sesi atau menghapus sesuatu. */
  tone?: 'default' | 'danger'
  icon?: ReactNode
  /**
   * Elemen yang menerima fokus lagi setelah dialog ditutup. Perlu dioper
   * eksplisit kalau pemicunya ada di dalam menu yang ikut tertutup — saat
   * dialog dibuka, tombolnya sudah lepas dari DOM sehingga tidak bisa
   * ditebak dari document.activeElement.
   */
  returnFocusTo?: RefObject<HTMLElement | null>
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Dialog konfirmasi. Dirender lewat portal ke <body> supaya tidak terjebak
 * stacking context halaman — di halaman peta, panel Leaflet dan sidebar sudah
 * memakai z-index tinggi.
 */
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  icon,
  returnFocusTo,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  // onCancel biasanya arrow function inline, jadi identitasnya berubah tiap
  // render. Disimpan di ref supaya efek di bawah hanya bergantung pada `open`
  // dan kunci scroll tidak dipasang-lepas berulang.
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel
  const returnFocusRef = useRef(returnFocusTo)
  returnFocusRef.current = returnFocusTo

  useEffect(() => {
    if (!open) return

    // Kembalikan fokus ke pemicu setelah dialog ditutup.
    const previouslyFocused = document.activeElement as HTMLElement | null
    confirmRef.current?.focus()

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancelRef.current()
        return
      }
      if (event.key !== 'Tab') return

      // Kurung fokus di dalam dialog selama terbuka.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      const target = returnFocusRef.current?.current ?? previouslyFocused
      // Menunggu satu frame: pemicu bisa saja baru dipasang ulang setelah
      // dialog dilepas dari pohon render.
      requestAnimationFrame(() => target?.focus?.())
    }
  }, [open])

  if (!open) return null

  const confirmClasses =
    tone === 'danger'
      ? 'bg-danger-soft text-danger hover:bg-white'
      : 'bg-mist-100 text-navy-900 hover:bg-white'

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="animate-auth-in absolute inset-0 bg-navy-950/70 backdrop-blur-sm" />

      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="animate-card-in relative w-full max-w-[420px] rounded-[16px] border border-white/15 bg-navy-800/90 p-6 shadow-2xl backdrop-blur-xl backdrop-saturate-150 sm:p-7"
      >
        {icon && (
          <span
            className={`mb-4 flex size-11 items-center justify-center rounded-full ${
              tone === 'danger'
                ? 'bg-danger-soft/15 text-danger-soft'
                : 'bg-brand-cyan/15 text-brand-cyan'
            }`}
          >
            {icon}
          </span>
        )}

        <h2
          id="confirm-dialog-title"
          className="text-[19px] font-bold text-white"
        >
          {title}
        </h2>

        <div
          id="confirm-dialog-description"
          className="mt-2.5 text-[14px] leading-relaxed text-mist-200"
        >
          {description}
        </div>

        <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-mist-400/50 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-white/10"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-5 py-2.5 text-[14px] font-semibold transition-colors ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmDialog
