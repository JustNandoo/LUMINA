import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
  page: number
  totalPages: number
  onChange: (page: number) => void
  summary: string
}

/** Menghasilkan nomor halaman dengan "..." bila jumlahnya banyak. */
function pageList(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }
  const pages: (number | 'gap')[] = [1, 2, 3, 4, 5]
  if (page > 5 && page < totalPages) pages.push('gap', page)
  pages.push('gap', totalPages)
  return pages
}

function Pagination({ page, totalPages, onChange, summary }: PaginationProps) {
  const boxClass =
    'flex size-7 items-center justify-center rounded-md border border-mist-400/60 text-[11px] transition-colors disabled:opacity-40'

  return (
    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] font-semibold text-white">{summary}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-label="Halaman sebelumnya"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className={`${boxClass} text-white hover:bg-navy-700`}
        >
          <ChevronLeft className="size-3.5" strokeWidth={2.5} />
        </button>

        {pageList(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <span
              key={`gap-${index}`}
              className="px-1 text-[11px] text-mist-400"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`${boxClass} ${
                item === page
                  ? 'bg-mist-100 font-bold text-navy-900'
                  : 'text-white hover:bg-navy-700'
              }`}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          aria-label="Halaman berikutnya"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className={`${boxClass} text-white hover:bg-navy-700`}
        >
          <ChevronRight className="size-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

export default Pagination
