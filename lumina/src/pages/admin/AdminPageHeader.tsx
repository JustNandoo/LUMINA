import { Plus, Search } from 'lucide-react'
import { Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

type AdminPageHeaderProps = {
  title: string
  searchPlaceholder: string
  searchValue: string
  onSearchChange: (value: string) => void
  actionLabel?: string
  onAction?: () => void
  extra?: ReactNode
}

export function AdminPageHeader({
  title,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  actionLabel,
  onAction,
  extra,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <h1 className="text-[26px] font-bold text-white lg:text-[32px]">
        {title}
      </h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:w-[580px]">
        {extra}

        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="flex shrink-0 items-center justify-center gap-2 rounded-[10px] bg-mist-400/80 px-5 py-2.5 text-[14px] font-medium text-navy-900 transition-colors hover:bg-mist-100"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            {actionLabel}
          </button>
        )}

        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-mist-400"
            strokeWidth={2}
          />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-[42px] w-full rounded-[10px] bg-navy-800/70 pr-4 pl-11 text-[14px] text-white transition-colors placeholder:text-mist-400 focus:ring-1 focus:ring-mist-400/50 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

type RowActionsProps = {
  onEdit?: () => void
  onDelete?: () => void
}

export function RowActions({ onEdit, onDelete }: RowActionsProps) {
  // Tombol tanpa aksi tidak ditampilkan: ikon yang tidak bisa diklik terlihat
  // seperti fitur rusak.
  return (
    <span className="flex items-center gap-3">
      {onEdit && (
        <button
          type="button"
          aria-label="Ubah data"
          onClick={onEdit}
          className="text-[#4a8fe7] transition-colors hover:text-white"
        >
          <Pencil className="size-[17px]" strokeWidth={1.8} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          aria-label="Hapus data"
          onClick={onDelete}
          className="text-danger/80 transition-colors hover:text-danger"
        >
          <Trash2 className="size-[17px]" strokeWidth={1.8} />
        </button>
      )}
    </span>
  )
}

type StatCardProps = {
  label: string
  value: string
  accent?: boolean
  suffix?: ReactNode
}

export function StatCard({ label, value, accent, suffix }: StatCardProps) {
  return (
    <div className="rounded-[10px] border border-navy-700/60 bg-navy-800/50 px-5 py-4">
      <p className="text-[13px] text-mist-200">{label}</p>
      <p
        className={`mt-1.5 flex items-center gap-3 text-[24px] font-bold ${
          accent ? 'text-brand-cyan' : 'text-white'
        }`}
      >
        {value}
        {suffix}
      </p>
    </div>
  )
}
