import { ArrowRight, Check, Minus } from 'lucide-react'
import { Link } from 'react-router-dom'
import Hero from './sections/Hero'
import { Eyebrow, Section, SectionHead } from './marketingUi'
import {
  audiences,
  platformStats,
  features,
  guardrails,
  method,
  problems,
  stationLoad,
} from './content'

function Landing() {
  return (
    <main>
      <Hero />

      {/* Angka koridor */}
      <Section className="border-b border-navy-700/50">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
          {platformStats.map((stat) => (
            <div key={stat.label} className="border-t border-navy-700/60 pt-4">
              <p className="font-mono text-[30px] leading-none font-semibold text-white tabular-nums lg:text-[38px]">
                {stat.value}
              </p>
              <p className="mt-2.5 text-[14px] text-white">{stat.label}</p>
              <p className="mt-1 text-[12px] text-mist-400">{stat.note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Masalah */}
      <Section className="border-b border-navy-700/50">
        <SectionHead
          eyebrow="The problem"
          title="Station areas are still read with static metrics"
          lead="Two problems grow from one root cause, and they repeat at every busy station on the network — from the interchanges of Jakarta to regional stops across Indonesia."
        />

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {problems.map((problem) => (
            <div key={problem.id} className="border-t border-navy-700/60 pt-6">
              <p className="font-mono text-[11px] tracking-[0.1em] text-mist-400">
                {problem.id}
              </p>
              <h3 className="mt-3 text-[20px] font-semibold text-white">
                {problem.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-mist-200">
                {problem.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-end gap-x-12 gap-y-6 border-t border-navy-700/60 pt-6">
          <p className="max-w-[250px] text-[13px] text-mist-400">
            Daily passenger movements on the calibration corridor
            <span className="mt-1 block text-[11px]">
              KAI Commuter, Semester I 2025 — where the model is validated
            </span>
          </p>
          {stationLoad.map((station) => (
            <p key={station.name} className="font-mono text-[13px] text-white">
              <span className="text-mist-400">{station.name}</span>{' '}
              <span className="tabular-nums">{station.value}</span>
            </p>
          ))}
        </div>
      </Section>

      {/* Metode */}
      <Section className="border-b border-navy-700/50">
        <SectionHead
          eyebrow="How it works"
          title="Our difference isn’t the map. It’s the signal — and how we treat uncertainty."
          lead="Crowding is not an attribute on any dataset in the MAPID ecosystem. So LUMINA derives it, calibrates it against the field, and refuses to ship it unless it beats a baseline."
        />

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12">
          {method.map((item) => (
            <div key={item.step} className="border-t border-navy-700/60 pt-6">
              <p className="font-mono text-[12px] text-brand-cyan tabular-nums">
                {item.step}
              </p>
              <h3 className="mt-3 text-[19px] font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-mist-200">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Dua sisi */}
      <Section className="border-b border-navy-700/50">
        <SectionHead
          eyebrow="One engine, two sides"
          title="The same signal answers two different questions"
          lead="A single GeoAI analysis engine serves both the commuter and the business owner — without duplicating the system underneath."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {audiences.map((audience) => (
            <div
              key={audience.persona}
              className="rounded-2xl border border-navy-700/60 bg-navy-950/50 p-7 lg:p-9"
            >
              <Eyebrow>{audience.persona}</Eyebrow>
              <h3 className="mt-3 text-[22px] font-semibold text-white">
                {audience.title}
              </h3>
              <ul className="mt-6 flex flex-col gap-3.5">
                {audience.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-brand-cyan"
                      strokeWidth={2.4}
                    />
                    <span className="text-[14px] leading-relaxed text-mist-200">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Fitur ringkas */}
      <Section className="border-b border-navy-700/50">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            eyebrow="Capabilities"
            title="Eight features, one decision-support surface"
          />
          <Link
            to="/features"
            className="flex items-center gap-2 text-[14px] text-brand-cyan transition-colors hover:text-white"
          >
            See every feature in detail
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <li key={feature.id} className="border-t border-navy-700/60 pt-4">
              <p className="flex items-baseline gap-2 font-mono text-[12px]">
                <span className="text-brand-cyan">{feature.id}</span>
                <span className="text-mist-400">{feature.priority}</span>
              </p>
              <h3 className="mt-2.5 text-[16px] font-semibold text-white">
                {feature.name}
              </h3>
            </li>
          ))}
        </ul>
      </Section>

      {/* Batas klaim */}
      <Section className="border-b border-navy-700/50">
        <SectionHead
          eyebrow="Epistemic honesty"
          title="What LUMINA will never claim"
          lead="Keeping the output honest is a product goal in its own right, not a disclaimer. These are hard guardrails in the system, not wording choices."
        />

        <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
          {guardrails.map((rule) => (
            <div key={rule.title} className="flex gap-4">
              <Minus
                className="mt-1 size-4 shrink-0 text-warning-soft"
                strokeWidth={3}
              />
              <div>
                <h3 className="text-[16px] font-semibold text-white">
                  {rule.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-mist-200">
                  {rule.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 border-t border-navy-700/60 pt-6 text-[14px] text-mist-200">
          Every number on screen carries its reliability level, and its source
          can be traced from the interface.{' '}
          <Link
            to="/help"
            className="text-brand-cyan transition-colors hover:text-white"
          >
            Read how we handle uncertainty →
          </Link>
        </p>
      </Section>

      {/* Ajakan */}
      <Section>
        <div className="rounded-2xl border border-navy-700/60 bg-navy-950/60 px-7 py-12 text-center lg:px-16 lg:py-16">
          <Eyebrow>Open access</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-[620px] text-[26px] leading-tight font-bold text-white lg:text-[34px]">
            Read the station before you step into it
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-relaxed text-mist-200">
            The map, the density index and the area scores are free to use on the
            base tier — no spreadsheet, no GIS background required.
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

export default Landing
