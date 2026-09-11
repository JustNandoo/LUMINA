import { Link } from 'react-router-dom'
import { PageHero, Section, SectionHead } from './marketingUi'
import { dataSources, features } from './content'

const units = [
  {
    label: 'Spatial unit',
    value: 'H3 · resolution 9',
    note: 'Hexagonal cells of roughly 0,10 km². Every signal is aggregated into these cells so space can be compared consistently.',
  },
  {
    label: 'Temporal unit',
    value: '3 time slots',
    note: '06.00–09.00, 12.00–15.00 and 16.00–19.00 — the slots validated by field survey. Anything outside them is marked as uncalibrated.',
  },
  {
    label: 'Main outputs',
    value: '3 indices',
    note: 'A 0–100 density index per station per slot, a location potential score, and a risk index. Each carries a reliability level.',
  },
]

const scope = [
  { tier: 'Core of the MVP', items: 'F1, F2, F3, F7, F8' },
  { tier: 'Included as context layers', items: 'F4, F5' },
  { tier: 'Included as an explanation panel', items: 'F6' },
]

function Features() {
  return (
    <main>
      <PageHero
        eyebrow="Features"
        title="Everything LUMINA can read, and the limits it keeps"
        lead="Eight features sit on one analysis engine. Five of them form the core of the MVP; the rest ship as context layers and an explanation panel."
      />

      <Section className="border-b border-navy-700/50">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
          {units.map((unit) => (
            <div key={unit.label} className="border-t border-navy-700/60 pt-5">
              <p className="text-[10px] tracking-[0.18em] text-mist-400 uppercase">
                {unit.label}
              </p>
              <p className="mt-3 font-mono text-[24px] font-semibold text-white">
                {unit.value}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-mist-200">
                {unit.note}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="border-b border-navy-700/50">
        <SectionHead
          eyebrow="The eight"
          title="Feature by feature"
          lead="P0 marks a requirement that must ship; P1 marks one that should."
        />

        <ul className="mt-12 flex flex-col">
          {features.map((feature) => (
            <li
              key={feature.id}
              className="grid grid-cols-1 gap-4 border-t border-navy-700/50 py-7 lg:grid-cols-[120px_280px_1fr] lg:gap-10"
            >
              <p className="flex items-baseline gap-3 font-mono text-[13px]">
                <span className="text-brand-cyan">{feature.id}</span>
                <span className="text-mist-400">{feature.priority}</span>
              </p>
              <h3 className="text-[18px] leading-snug font-semibold text-white">
                {feature.name}
              </h3>
              <p className="text-[14px] leading-relaxed text-mist-200">
                {feature.body}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="border-b border-navy-700/50">
        <SectionHead eyebrow="MVP scope" title="What ships first, and why" />

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {scope.map((item) => (
            <div key={item.tier} className="border-t border-navy-700/60 pt-5">
              <p className="font-mono text-[16px] text-white">{item.items}</p>
              <p className="mt-2 text-[13px] text-mist-400">{item.tier}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-[760px] text-[14px] leading-relaxed text-mist-200">
          Outside the MVP: SaaS billing, promotional commissions, expansion to
          other Jabodetabek interchanges, native mobile apps, and real-time
          integration with operator systems. Those are post-competition
          direction, not quiet omissions.
        </p>
      </Section>

      <Section>
        <SectionHead
          eyebrow="Data behind it"
          title="Where every number comes from"
          lead="LUMINA is built only on datasets available through the MAPID ecosystem and open sources, each cited with its role."
        />

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <tbody>
              {dataSources.map((source) => (
                <tr
                  key={source.name}
                  className="border-t border-navy-700/50 align-top"
                >
                  <td className="w-[260px] py-4 pr-6 text-[14px] font-semibold text-white">
                    {source.name}
                  </td>
                  <td className="py-4 pr-6 text-[14px] leading-relaxed text-mist-200">
                    {source.role}
                  </td>
                  <td className="w-[140px] py-4 text-[11px] tracking-[0.1em] text-mist-400 uppercase">
                    {source.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-10 text-[14px] text-mist-200">
          Curious how the indices are derived and validated?{' '}
          <Link
            to="/help"
            className="text-brand-cyan transition-colors hover:text-white"
          >
            Read the FAQ →
          </Link>
        </p>
      </Section>
    </main>
  )
}

export default Features
