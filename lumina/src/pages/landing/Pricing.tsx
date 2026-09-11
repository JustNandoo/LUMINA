import { useState } from 'react'
import { Check, ChevronDown, Minus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Eyebrow, PageHero, Section, SectionHead } from './marketingUi'
import { billingFaqs, planMatrix, plans } from '../../data/plans'
import type { PlanId } from '../../data/plans'

/** Tujuan tombol utama tiap paket. Enterprise diarahkan ke halaman bantuan. */
const ctaTarget: Record<PlanId, string> = {
  explorer: '/signup',
  commercial: '/signup',
  enterprise: '/help',
}

function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <main>
      <PageHero
        eyebrow="Pricing"
        title="The travel side is free. The economic side is where we charge."
        lead="Reading a station before you step into it should not cost anything — so it never will. What we price is the analysis layer built on top of it: where a business fits, what the risk is, and how to pull that out of LUMINA and into your own work."
      />

      {/* Kartu paket */}
      <Section className="border-b border-navy-700/50">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-7">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`animate-rise-in flex flex-col rounded-2xl border p-7 lg:p-8 ${
                plan.featured
                  ? 'border-brand-cyan/50 bg-navy-800/50'
                  : 'border-navy-700/60 bg-navy-950/50'
              }`}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[24px] font-bold text-white">{plan.name}</h2>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                    plan.featured
                      ? 'bg-brand-cyan text-navy-950'
                      : 'bg-navy-700 text-mist-200'
                  }`}
                >
                  {plan.badge}
                </span>
              </div>

              <p className="mt-2 text-[13px] text-mist-400">{plan.audience}</p>

              <p className="mt-7 flex items-baseline gap-1.5 text-white">
                <span className="text-[38px] leading-none font-bold tabular-nums">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-[18px] font-normal text-mist-200">
                    {plan.period}
                  </span>
                )}
              </p>
              <p className="mt-2 text-[12px] text-mist-400">
                {plan.billingNote}
              </p>

              <p className="mt-6 border-t border-navy-700/60 pt-6 text-[14px] leading-relaxed text-mist-200">
                {plan.summary}
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <Check
                      className="mt-[3px] size-4 shrink-0 text-brand-cyan"
                      strokeWidth={2.4}
                    />
                    <span className="text-[14px] leading-relaxed text-mist-200">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to={ctaTarget[plan.id]}
                className={`mt-8 rounded-lg px-5 py-3 text-center text-[14px] font-semibold transition-colors ${
                  plan.featured
                    ? 'bg-mist-100 text-navy-900 hover:bg-white'
                    : 'border border-mist-400/60 text-white hover:bg-white/10'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[13px] text-mist-400">
          Billing is not switched on during the MAPID WebGIS Competition 2026
          period — the plans above describe the intended commercial model, and
          every feature currently on the platform is open to try.
        </p>
      </Section>

      {/* Perbandingan rinci */}
      <Section className="border-b border-navy-700/50">
        <SectionHead
          eyebrow="Side by side"
          title="What changes between plans"
          lead="The spatial unit, the temporal unit and the method are identical on every row. Only reach changes."
        />

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-navy-700">
                <th className="w-[240px] py-4 pr-6 text-[11px] tracking-[0.16em] text-mist-400 uppercase">
                  Capability
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    className="py-4 pr-6 text-[15px] font-semibold text-white"
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planMatrix.map((row) => (
                <tr key={row.label} className="border-b border-navy-700/50">
                  <td className="py-4 pr-6 text-[14px] text-mist-200">
                    {row.label}
                  </td>
                  {plans.map((plan) => {
                    const value = row.values[plan.id]
                    return (
                      <td
                        key={plan.id}
                        className={`py-4 pr-6 text-[14px] ${
                          value === '—' ? 'text-mist-400' : 'text-white'
                        }`}
                      >
                        {value}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Batas klaim — pagar yang sama seperti di landing */}
      <Section className="border-b border-navy-700/50">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <Eyebrow>The line we hold</Eyebrow>
            <h2 className="mt-3 text-[28px] leading-tight font-bold text-white lg:text-[34px]">
              No tier buys more certainty
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-mist-200">
              A paid plan widens what you can do with the indices. It never
              changes how an index is computed, and it never raises the
              confidence attached to one. Selling certainty we do not have would
              break the one guarantee the whole platform rests on.
            </p>
            <Link
              to="/help"
              className="mt-5 inline-block text-[14px] text-brand-cyan transition-colors hover:text-white"
            >
              How we handle uncertainty →
            </Link>
          </div>

          <ul className="flex flex-col gap-5">
            {[
              'Sparse cells stay marked low-reliability on every plan, including Enterprise.',
              'No plan unlocks absolute passenger counts — the density index is relative, 0–100, for everyone.',
              'No plan unlocks revenue projections. There is no revenue label in the data to learn from.',
              'A cell with no proxy data is labelled “data unavailable” on every plan. It is never scored 0.',
            ].map((rule) => (
              <li key={rule} className="flex gap-4">
                <Minus
                  className="mt-1 size-4 shrink-0 text-warning-soft"
                  strokeWidth={3}
                />
                <span className="text-[14px] leading-relaxed text-mist-200">
                  {rule}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Tanya jawab tagihan */}
      <Section className="border-b border-navy-700/50">
        <SectionHead eyebrow="Billing" title="Questions we get asked first" />

        <ul className="mt-10 flex flex-col">
          {billingFaqs.map((faq, index) => {
            const isOpen = openFaq === index
            return (
              <li key={faq.question} className="border-t border-navy-700/50">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start justify-between gap-6 py-5 text-left"
                >
                  <span className="text-[16px] font-semibold text-white">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`mt-0.5 size-5 shrink-0 text-mist-400 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    strokeWidth={2}
                  />
                </button>
                {isOpen && (
                  <p className="max-w-[820px] pb-6 text-[14px] leading-relaxed text-mist-200">
                    {faq.answer}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </Section>

      <Section>
        <div className="rounded-2xl border border-navy-700/60 bg-navy-950/60 px-7 py-12 text-center lg:px-16 lg:py-16">
          <Eyebrow>Start on Explorer</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-[620px] text-[26px] leading-tight font-bold text-white lg:text-[34px]">
            Try the map first, decide about a plan later
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-relaxed text-mist-200">
            Nothing on Explorer expires, and upgrading takes a click from inside
            your account. No card is needed to begin.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup"
              className="rounded-lg bg-mist-100 px-6 py-3 text-[14px] font-semibold text-navy-900 transition-colors hover:bg-white"
            >
              Create a free account
            </Link>
            <Link
              to="/app/explore"
              className="rounded-lg border border-mist-400/60 px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-white/10"
            >
              Open the map
            </Link>
          </div>
        </div>
      </Section>
    </main>
  )
}

export default Pricing
