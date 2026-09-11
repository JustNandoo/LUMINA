import { Building2, ChartLine, MapPin, ScanSearch, Store, X } from 'lucide-react'
import type { Area } from '../../../data/areas'

const spaces = [
  {
    title: 'Kiosks & Micro Stalls',
    badge: 'For Rent',
    detail: 'Exclusive Stalls at the East Entrance of Manggarai Station',
    size: '18 m²',
  },
  {
    title: 'Retail Lots',
    badge: 'For Rent',
    detail: 'Ground floor unit near the south concourse',
    size: '24 m²',
  },
]

type AreaDetailPanelProps = {
  area: Area
  onClose: () => void
  onOpenChat: () => void
}

function AreaDetailPanel({ area, onClose, onOpenChat }: AreaDetailPanelProps) {
  return (
    <section className="flex w-full flex-col lg:w-[368px] lg:shrink-0 rounded-[14px] border border-navy-700/50 bg-navy-900/70">
      <div className="px-[22px] pt-[18px] pb-[14px]">
        <div className="flex items-start justify-between">
          <h2 className="text-[24px] font-semibold text-white">{area.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail area"
            className="text-mist-400 transition-colors hover:text-white"
          >
            <X className="size-[19px]" strokeWidth={2} />
          </button>
        </div>
        <p className="mt-1 text-[14px] text-mist-400">{area.district}</p>
      </div>

      <div className="border-t border-navy-700/40 px-[22px] py-[16px]">
        <div className="flex gap-3">
          <div className="flex-1 rounded-[10px] bg-navy-800/70 px-4 py-3.5">
            <p className="flex items-center gap-2 text-[13px] text-mist-200">
              <ChartLine className="size-4 text-mist-100" strokeWidth={1.8} />
              Potential Score
            </p>
            <p className="mt-2.5 text-[38px] leading-none font-bold text-white">
              {area.score}
              <span className="ml-1 text-[19px] font-normal text-mist-400">
                / 100
              </span>
            </p>
          </div>

          <div className="flex w-[150px] flex-col gap-3 sm:w-[160px]">
            {['Risk Index', 'Reliability'].map((label) => (
              <div
                key={label}
                className="flex flex-1 items-center justify-between rounded-[10px] bg-navy-800/70 px-3.5 py-3"
              >
                <span className="text-[13px] text-mist-200">{label}</span>
                <span className="rounded-md bg-warning-soft px-2.5 py-1 text-[11px] font-semibold text-warning">
                  Medium
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-navy-700/40 px-[22px] py-[16px]">
        <h3 className="flex items-center gap-2.5 text-[15px] font-medium text-white">
          <ScanSearch className="size-[18px] text-mist-100" strokeWidth={1.8} />
          Demand Analysis
        </h3>

        <div className="mt-[18px] flex items-end justify-between">
          <p className="text-[14px] font-medium text-white">
            Estimated Expenditure Density
          </p>
          <span className="text-[12px] text-mist-400">Rp 3 M/month</span>
        </div>

        <div className="mt-3 h-[5px] w-full rounded-full bg-navy-700">
          <div className="relative h-full w-[53%] rounded-full bg-mist-100">
            <span className="absolute top-1/2 -right-[7px] size-[14px] -translate-y-1/2 rounded-full bg-mist-100" />
          </div>
        </div>

        <p className="mt-3 text-[11px] text-mist-400 italic">
          Sources of estimates : StrukGo
        </p>

        <div className="mt-[18px] grid grid-cols-2 gap-3">
          {[
            { label: 'Dominant Price Range', value: 'Rp 20.000 - Rp 50.000' },
            { label: 'Peak Transaction Hours', value: '16.30 - 19.30 WIB' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[13px] font-medium text-white">{item.label}</p>
              <p className="mt-2 inline-block rounded-md bg-navy-800/80 px-3 py-1.5 text-[12px] text-mist-200">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-navy-700/40 px-[22px] py-[16px]">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2.5 text-[15px] font-medium text-white">
            <Store className="size-[18px] text-mist-100" strokeWidth={1.8} />
            Competitive Analysis
          </h3>
          <span className="rounded-md bg-danger-soft px-2.5 py-1 text-[11px] font-semibold text-danger">
            High
          </span>
        </div>
        <p className="mt-3.5 text-[13px] leading-[1.7] text-mist-400">
          Kerapatan gerai sejenis dalam radius 500m sangat tinggi, didominasi
          oleh F&B.
        </p>
      </div>

      <div className="border-t border-navy-700/40 px-[22px] py-[16px]">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2.5 text-[15px] font-medium text-white">
            <MapPin className="size-[18px] text-mist-100" strokeWidth={1.8} />
            Analysis of Space Availability
          </h3>
          <button
            type="button"
            className="text-[12px] text-mist-400 italic transition-colors hover:text-mist-100"
          >
            See All
          </button>
        </div>

        <div className="-mr-[22px] mt-[18px] flex gap-3 overflow-x-auto pr-[22px] pb-1">
          {spaces.map((space) => (
            <article
              key={space.title}
              className="flex w-[252px] shrink-0 items-start gap-3 rounded-[10px] border border-mist-400/40 bg-navy-950/60 px-3 py-3"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy-800">
                <Building2 className="size-[22px] text-mist-100" strokeWidth={1.6} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[12px] font-semibold text-white">
                    {space.title}
                  </p>
                  <span className="shrink-0 rounded bg-brand-cyan/20 px-1.5 py-0.5 text-[9px] font-semibold text-brand-cyan">
                    {space.badge}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-[1.5] text-mist-400">
                  {space.detail}
                </p>
                <p className="mt-1 text-right text-[10px] text-mist-200">
                  {space.size}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-[22px] flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onOpenChat}
            className="flex-1 rounded-[10px] bg-navy-800/80 py-3 text-[13px] text-white transition-colors hover:bg-navy-700"
          >
            Open Assistant Chat
          </button>
          <button
            type="button"
            className="flex-1 rounded-[10px] bg-navy-700 py-3 text-[13px] text-white transition-colors hover:bg-navy-700/70"
          >
            Download Analysis Results
          </button>
        </div>
      </div>
    </section>
  )
}

export default AreaDetailPanel
