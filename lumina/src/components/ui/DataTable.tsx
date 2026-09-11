import type { ReactNode } from 'react'

export type Column<T> = {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  highlightRow?: (row: T) => boolean
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

function DataTable<T>({
  columns,
  rows,
  rowKey,
  highlightRow,
  onRowClick,
  emptyMessage = 'Tidak ada data.',
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-navy-700/70">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="bg-navy-800/80">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-[13px] font-bold whitespace-nowrap text-white ${column.className ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-[13px] text-mist-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={() => onRowClick?.(row)}
                className={`border-t border-navy-700/60 transition-colors ${
                  highlightRow?.(row) ? 'bg-navy-700/40' : ''
                } ${onRowClick ? 'cursor-pointer hover:bg-navy-800/60' : ''}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 text-[13px] font-semibold whitespace-nowrap text-white ${column.className ?? ''}`}
                  >
                    {column.render
                      ? column.render(row)
                      : String((row as Record<string, unknown>)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
