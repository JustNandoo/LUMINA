import { SlidersHorizontal, Store } from 'lucide-react'
import RangeSlider from '../../../components/ui/RangeSlider'
import type { CategoryRecommendation } from '../../../lib/businessApi'

export type AreaFilters = {
  minScore: number
  maxRisk: number
  categories: string[]
}

type AnalysisFilterPanelProps = {
  catalog: { id: string; label: string }[]
  filters: AreaFilters
  onChange: (filters: AreaFilters) => void
  /** Kategori pada kawasan terpilih — dipakai menandai mana yang berpeluang. */
  areaCategories: CategoryRecommendation[]
  resultCount: number
  loading: boolean
}

function AnalysisFilterPanel({
  catalog,
  filters,
  onChange,
  areaCategories,
  resultCount,
  loading,
}: AnalysisFilterPanelProps) {
  const toggleCategory = (categoryId: string) =>
    onChange({
      ...filters,
      categories: filters.categories.includes(categoryId)
        ? filters.categories.filter((item) => item !== categoryId)
        : [...filters.categories, categoryId],
    })

  const viableIds = new Set(
    areaCategories.filter((item) => item.viable).map((item) => item.category_id),
  )

  return (
    <section className="flex w-full flex-col lg:w-[370px] lg:shrink-0 rounded-[14px] border border-navy-700/50 bg-navy-900/70">
      <div className="px-[22px] pt-[26px] pb-[22px]">
        <h2 className="text-[19px] font-semibold text-white">Filter Analisis</h2>
        <p className="mt-1 text-[13px] text-mist-400">
          Atur parameter potensi kawasan.
        </p>
      </div>

      <div className="border-t border-navy-700/40 px-[22px] py-[26px]">
        <h3 className="flex items-center gap-2.5 text-[15px] font-medium text-white">
          <Store className="size-[18px] text-mist-100" strokeWidth={1.8} />
          Kategori Usaha
        </h3>
        <p className="mt-2 text-[12px] text-mist-400">
          Kategori bersumber dari atribut Properti Go. Bertanda titik cyan =
          berpeluang di kawasan yang sedang dipilih.
        </p>

        <div className="mt-[18px] grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          {catalog.map((category) => {
            const selected = filters.categories.includes(category.id)
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                aria-pressed={selected}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-center text-[14px] transition-colors sm:px-[18px] ${
                  selected
                    ? 'border-brand-cyan/70 bg-brand-cyan/10 text-white'
                    : 'border-navy-700 text-mist-200 hover:border-navy-700/60 hover:text-white'
                }`}
              >
                {viableIds.has(category.id) && (
                  <span
                    title="Berpeluang di kawasan ini"
                    className="size-1.5 shrink-0 rounded-full bg-brand-cyan"
                  />
                )}
                {category.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-navy-700/40 px-[22px] py-[26px]">
        <h3 className="flex items-center gap-2.5 text-[15px] font-medium text-white">
          <SlidersHorizontal className="size-[18px] text-mist-100" strokeWidth={1.8} />
          Ambang Indeks
        </h3>

        <p className="mt-[22px] flex items-baseline justify-between text-[14px] text-mist-200">
          Skor potensi minimum
          <span className="tabular-nums text-white">{filters.minScore}</span>
        </p>
        <RangeSlider
          className="mt-3.5"
          label="Skor potensi minimum"
          value={filters.minScore}
          onChange={(value) => onChange({ ...filters, minScore: value })}
        />

        <p className="mt-[22px] flex items-baseline justify-between text-[14px] text-mist-200">
          Indeks risiko maksimum
          <span className="tabular-nums text-white">{filters.maxRisk}</span>
        </p>
        <RangeSlider
          className="mt-3.5"
          label="Indeks risiko maksimum"
          value={filters.maxRisk}
          onChange={(value) => onChange({ ...filters, maxRisk: value })}
        />
      </div>

      <div className="mt-auto border-t border-navy-700/40 px-[22px] py-[22px]">
        <p className="text-center text-[13px] text-mist-400">
          {loading ? 'Memuat kawasan…' : `${resultCount} kawasan memenuhi filter`}
        </p>
      </div>
    </section>
  )
}

export default AnalysisFilterPanel
