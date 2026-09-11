import { useState } from 'react'
import { SlidersHorizontal, Sparkles, Store } from 'lucide-react'
import RangeSlider from '../../../components/ui/RangeSlider'
import Toggle from '../../../components/ui/Toggle'

const categories = ['F&B Retail', 'Minimarket', 'Coffee Shop', 'Laundry']

function AnalysisFilterPanel() {
  const [selected, setSelected] = useState<string[]>([])
  const [volume, setVolume] = useState(53)
  const [competition, setCompetition] = useState(98)
  const [aiEnabled, setAiEnabled] = useState(true)

  const toggleCategory = (category: string) =>
    setSelected((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    )

  return (
    <section className="flex w-full flex-col lg:w-[370px] lg:shrink-0 rounded-[14px] border border-navy-700/50 bg-navy-900/70">
      <div className="px-[22px] pt-[26px] pb-[22px]">
        <h2 className="text-[19px] font-semibold text-white">Analysis Filter</h2>
        <p className="mt-1 text-[13px] text-mist-400">
          Adjust the area's potential parameters.
        </p>
      </div>

      <div className="border-t border-navy-700/40 px-[22px] py-[26px]">
        <h3 className="flex items-center gap-2.5 text-[15px] font-medium text-white">
          <Store className="size-[18px] text-mist-100" strokeWidth={1.8} />
          Business Categories
        </h3>

        <div className="mt-[22px] grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className={`rounded-lg border px-3 py-2.5 text-center text-[14px] transition-colors sm:px-[22px] ${
                selected.includes(category)
                  ? 'border-brand-cyan/70 bg-brand-cyan/10 text-white'
                  : 'border-navy-700 text-mist-200 hover:border-navy-700/60 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-[26px] border-t border-navy-700/40 pt-[22px]">
          <h3 className="flex items-center gap-2.5 text-[15px] font-medium text-white">
            <SlidersHorizontal
              className="size-[18px] text-mist-100"
              strokeWidth={1.8}
            />
            Metric Focus
          </h3>

          <p className="mt-[22px] text-[14px] text-mist-200">
            Transaction Volume
          </p>
          <RangeSlider
            className="mt-3.5"
            label="Transaction Volume"
            value={volume}
            onChange={setVolume}
          />

          <p className="mt-[22px] text-[14px] text-mist-200">
            Level of Competition
          </p>
          <RangeSlider
            className="mt-3.5"
            label="Level of Competition"
            value={competition}
            onChange={setCompetition}
          />
        </div>

        <div className="mt-[26px] border-t border-navy-700/40 pt-[22px]">
          <div className="rounded-xl bg-navy-950 px-[18px] py-[18px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2.5 text-[15px] font-medium text-white">
                <Sparkles className="size-[18px] text-mist-100" strokeWidth={1.8} />
                AI Recommendations
              </span>
              <Toggle
                checked={aiEnabled}
                onChange={setAiEnabled}
                label="AI Recommendations"
              />
            </div>
            <p className="mt-3 max-w-[270px] text-[12px] leading-[1.7] text-mist-400">
              The current AI model highlights areas with positive growth
              anomalies over the past 30 days.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-navy-700/40 px-[22px] py-[22px]">
        <button
          type="button"
          className="w-full rounded-[10px] bg-navy-700 py-[13px] text-[15px] font-medium text-white transition-colors hover:bg-navy-700/70"
        >
          Apply Filter
        </button>
      </div>
    </section>
  )
}

export default AnalysisFilterPanel
