import { useMemo, useState } from 'react'
import { ChevronDown, Copy, RefreshCw, SquarePen, X } from 'lucide-react'
import AdminShell from './AdminShell'
import DataTable from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import { AdminPageHeader, StatCard } from './AdminPageHeader'
import { b2bPartners } from './adminData'
import type { B2BPartner } from './adminData'

const PAGE_SIZE = 15

const stats = [
  { label: 'Total Revenue', value: 'Rp 100.000,00' },
  { label: 'Total Active B2B Partners', value: '35 Partner', accent: true },
  { label: 'Total Lumina Users', value: '1.200 Users' },
  { label: 'Total API Consumption', value: '84.250' },
]

function B2BPartnerManagement() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [panelOpen, setPanelOpen] = useState(true)
  const [apiKey, setApiKey] = useState('lmn_live_8f21c4a9')

  const columns: Column<B2BPartner>[] = [
    { key: 'company', header: 'Name/Company' },
    { key: 'email', header: 'Email' },
    { key: 'packet', header: 'Packet' },
    { key: 'quota', header: 'Export Quota' },
    { key: 'status', header: 'Status' },
    {
      key: 'action',
      header: 'Action',
      render: () => (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="text-[13px] font-semibold text-white transition-colors hover:text-brand-cyan"
        >
          Aksi
        </button>
      ),
    },
  ]

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return keyword
      ? b2bPartners.filter((row) =>
          row.company.toLowerCase().includes(keyword),
        )
      : b2bPartners
  }, [search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)

  const fieldClass =
    'mt-2 h-[42px] w-full rounded-lg border border-navy-700 bg-navy-950/60 px-4 text-[13px] text-white transition-colors placeholder:text-mist-400 focus:border-mist-400 focus:outline-none'

  return (
    <AdminShell>
      <AdminPageHeader
        title="Manajemen Mitra B2B Lumina"
        searchPlaceholder="Cari nama pengguna/perusahaan..."
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-5 xl:flex-row">
        <div className="min-w-0 flex-1">
          <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
            summary={`Showing ${filtered.length === 0 ? 0 : start + 1} to ${start + rows.length} of ${filtered.length} Result`}
          />
        </div>

        {panelOpen && (
          <section className="w-full shrink-0 rounded-[10px] border border-navy-700/70 bg-navy-800/40 px-5 py-5 xl:w-[400px]">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2.5 text-[16px] font-semibold text-white">
                <SquarePen className="size-[18px]" strokeWidth={1.8} />
                B2B Partner Management
              </h2>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Tutup panel"
                className="text-mist-400 transition-colors hover:text-white"
              >
                <X className="size-[18px]" strokeWidth={2} />
              </button>
            </div>

            <div className="mt-6">
              <label className="block text-[13px] text-mist-200">
                Users/Organizations
                <input className={fieldClass} placeholder="......." />
              </label>
            </div>

            <div className="mt-4">
              <label className="block text-[13px] text-mist-200">
                User/Organization Email
                <input
                  type="email"
                  className={fieldClass}
                  placeholder="......."
                />
              </label>
            </div>

            <div className="mt-4">
              <label className="block text-[13px] text-mist-200">
                Change Plan/Subscription
                <span className="relative mt-2 block">
                  <select
                    className={`${fieldClass} mt-0 appearance-none pr-10`}
                    defaultValue=""
                  >
                    <option value="">.......</option>
                    <option value="explorer">Eksplorer</option>
                    <option value="commercial">Commercial</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-mist-400"
                    strokeWidth={2}
                  />
                </span>
              </label>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-mist-200">API KEY</span>
                <button
                  type="button"
                  onClick={() =>
                    setApiKey(
                      `lmn_live_${Math.random().toString(16).slice(2, 10)}`,
                    )
                  }
                  className="flex items-center gap-1.5 text-[12px] text-brand-cyan transition-colors hover:text-white"
                >
                  <RefreshCw className="size-3.5" strokeWidth={2} />
                  Regenerate
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={apiKey}
                  className={`${fieldClass} mt-0 flex-1`}
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(apiKey)}
                  className="h-[42px] shrink-0 rounded-lg bg-navy-700 px-4 text-[13px] text-white transition-colors hover:bg-navy-700/70"
                >
                  <span className="flex items-center gap-1.5">
                    <Copy className="size-3.5" strokeWidth={2} />
                    Copy
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="rounded-lg bg-navy-700/70 px-6 py-2.5 text-[14px] text-white transition-colors hover:bg-navy-700"
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-mist-400/80 px-6 py-2.5 text-[14px] font-medium text-navy-900 transition-colors hover:bg-mist-100"
              >
                Save Changes
              </button>
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  )
}

export default B2BPartnerManagement
