import { RotateCw, ShieldAlert, TriangleAlert } from 'lucide-react'

type AdminStatusProps = {
  loading: boolean
  error: string | null
  errorCode?: string | null
  onRetry?: () => void
}

/**
 * Baris status untuk halaman admin. 403 dari backend dipisahkan dari error
 * biasa karena artinya berbeda: bukan gangguan, tapi akunnya memang bukan admin.
 */
function AdminStatus({ loading, error, errorCode, onRetry }: AdminStatusProps) {
  if (!error) {
    return loading ? (
      <p className="mt-4 text-[13px] text-mist-400">Memuat data…</p>
    ) : null
  }

  const forbidden = errorCode === 'ADMIN_ONLY' || errorCode === 'FORBIDDEN'
  const Icon = forbidden ? ShieldAlert : TriangleAlert

  return (
    <div
      className={`mt-4 flex flex-wrap items-center gap-3 rounded-[10px] px-4 py-3 text-[13px] ${
        forbidden
          ? 'bg-warning-soft/10 text-warning-soft'
          : 'bg-danger/10 text-danger-soft'
      }`}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.8} />
      <span className="flex-1">{error}</span>
      {!forbidden && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-md bg-navy-800 px-3 py-1.5 font-medium text-white transition-colors hover:bg-navy-700"
        >
          <RotateCw className="size-3.5" strokeWidth={2} />
          Coba lagi
        </button>
      )}
    </div>
  )
}

export default AdminStatus
