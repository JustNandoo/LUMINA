import { PageHero, Section, SectionHead } from './marketingUi'
import { stack, stationLoad, team } from './content'

const pipeline = [
  {
    stage: 'Sources',
    body: 'MAPID API — Community Maps activity, Data Mission (Struk Go, Menu Go, Properti Go). OpenStreetMap for POI and the transit network. MAPID APPS for 84 field observations.',
  },
  {
    stage: 'ETL',
    body: 'Python with GeoPandas, Shapely and H3: cleaning, spatial join onto the H3 resolution-9 grid, then feature engineering aggregated across two dimensions — per cell × per time slot.',
  },
  {
    stage: 'Store',
    body: 'PostgreSQL + PostGIS holding spatial-temporal tables: activity intensity, purchasing power, price preference, space availability, plus spatial neighbourhood variables.',
  },
  {
    stage: 'Two paths',
    body: 'Path 1 trains a Spatial XGBoost model on survey labels to produce the density index. Path 2 computes a weighted composite index for the location potential score and risk index. They are deliberately separate.',
  },
  {
    stage: 'Explanation',
    body: 'A language model behind an API turns SHAP values and index output into narrative. It is isolated as a non-critical dependency by design.',
  },
]

function About() {
  return (
    <main>
      <PageHero
        eyebrow="About"
        title="A map that supports a decision, not one that only shows a place"
        lead="LUMINA reads the pulse of transit areas across space and time — built for the KRL Commuter Line network and extending to rail stations across Indonesia — and turns it into two answers: when to leave, and what business fits which cell."
      />

      <Section className="border-b border-navy-700/50">
        <SectionHead
          eyebrow="Where the model is proven"
          title="Validated on one of the hardest corridors in the country"
          lead="Manggarai, Tanah Abang, Duri and Sudirman carry more than 340 thousand passenger movements a day between them — dense, heavily transferred through, and hard to read. A method that holds here holds elsewhere, which is why this corridor is the research subject. It is where LUMINA is calibrated, not where LUMINA stops."
        />

        <div className="mt-10 flex flex-wrap gap-x-14 gap-y-6 border-t border-navy-700/60 pt-6">
          {stationLoad.map((station) => (
            <div key={station.name}>
              <p className="font-mono text-[22px] font-semibold text-white tabular-nums">
                {station.value}
              </p>
              <p className="mt-1 text-[13px] text-mist-400">{station.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="border-b border-navy-700/50">
        <SectionHead
          eyebrow="Architecture"
          title="From raw signal to an answer you can question"
          lead="The separation between the model path and the index path is intentional. MAPID records consumer spending, not outlet revenue — so there is no revenue label to learn from, and the potential score is built as a transparent formula instead."
        />

        <ol className="mt-12 flex flex-col">
          {pipeline.map((item, index) => (
            <li
              key={item.stage}
              className="grid grid-cols-1 gap-3 border-t border-navy-700/50 py-6 lg:grid-cols-[80px_200px_1fr] lg:gap-10"
            >
              <span className="font-mono text-[12px] text-brand-cyan tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-[17px] font-semibold text-white">
                {item.stage}
              </h3>
              <p className="text-[14px] leading-relaxed text-mist-200">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="border-b border-navy-700/50">
        <SectionHead
          eyebrow="Built open"
          title="Every component is open source"
          lead="Maintainability was a requirement, not an afterthought. The whole stack can be inspected, rebuilt and audited."
        />

        <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
          {stack.map((item) => (
            <div key={item.layer} className="border-t border-navy-700/60 pt-4">
              <p className="text-[13px] text-mist-400">{item.layer}</p>
              <p className="mt-1.5 text-[15px] text-white">{item.tools}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead
          eyebrow="The team"
          title="Tim LUMINA"
          lead="Five people across product, data and design, built for MAPID WebGIS Competition 2026 under the theme “Maps That Think!”."
        />

        <ul className="mt-10 flex flex-col">
          {team.map((member) => (
            <li
              key={member.name}
              className="grid grid-cols-1 gap-2 border-t border-navy-700/50 py-5 lg:grid-cols-[280px_240px_1fr] lg:gap-10"
            >
              <p className="text-[16px] font-semibold text-white">
                {member.name}
              </p>
              <p className="text-[14px] text-brand-cyan">{member.role}</p>
              <p className="text-[14px] text-mist-200">{member.scope}</p>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  )
}

export default About
