import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHero, Section, SectionHead } from './marketingUi'
import { faqs } from './content'

const reliability = [
  {
    level: 'High',
    meaning: 'Dense proxy data in the cell, and the slot is covered by field survey.',
    tone: 'text-brand-cyan',
  },
  {
    level: 'Low',
    meaning:
      'Very little data behind the number. The cell is marked, and aggregation may be lifted to a coarser H3 resolution.',
    tone: 'text-warning-soft',
  },
  {
    level: 'Unavailable',
    meaning:
      'No proxy data at all. The cell gets no score — it is never filled with 0, which would read as “quiet”.',
    tone: 'text-mist-400',
  },
]

function Help() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <main>
      <PageHero
        eyebrow="Help"
        title="How to read what LUMINA shows you"
        lead="Every number here is a relative index with a stated confidence. This page explains what each one means, and just as importantly, what it does not."
      />

      <Section className="border-b border-navy-700/50">
        <SectionHead
          eyebrow="Reliability"
          title="Three states, always stated"
          lead="The marker never relies on colour alone — it is written out as well, so it stays readable for everyone."
        />

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
          {reliability.map((item) => (
            <div key={item.level} className="border-t border-navy-700/60 pt-5">
              <p
                className={`text-[11px] tracking-[0.16em] uppercase ${item.tone}`}
              >
                {item.level}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-mist-200">
                {item.meaning}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="border-b border-navy-700/50">
        <SectionHead eyebrow="FAQ" title="Questions worth asking" />

        <ul className="mt-10">
          {faqs.map((faq, index) => {
            const isOpen = open === index
            return (
              <li key={faq.q} className="border-t border-navy-700/50">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className="text-[16px] font-medium text-white lg:text-[17px]">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-mist-400 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    strokeWidth={2}
                  />
                </button>
                {isOpen && (
                  <p className="max-w-[820px] pb-6 text-[14px] leading-relaxed text-mist-200 lg:text-[15px]">
                    {faq.a}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </Section>

      <Section>
        <div className="rounded-2xl border border-navy-700/60 bg-navy-950/60 px-7 py-12 lg:px-14">
          <h2 className="text-[24px] leading-tight font-bold text-white lg:text-[30px]">
            Still unsure about a number?
          </h2>
          <p className="mt-4 max-w-[620px] text-[15px] leading-relaxed text-mist-200">
            Every figure in LUMINA can be traced back to its source from inside
            the interface. If something still looks wrong, that is worth telling
            us — an index that cannot be questioned is not worth trusting.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/features"
              className="rounded-lg bg-mist-100 px-6 py-3 text-[14px] font-semibold text-navy-900 transition-colors hover:bg-white"
            >
              See the data sources
            </Link>
            <Link
              to="/about"
              className="rounded-lg border border-mist-400/60 px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-white/10"
            >
              Read the method
            </Link>
          </div>
        </div>
      </Section>
    </main>
  )
}

export default Help
