import type { ReactNode } from 'react'

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.18em] text-brand-cyan uppercase">
      {children}
    </p>
  )
}

type SectionProps = {
  children: ReactNode
  className?: string
}

export function Section({ children, className = '' }: SectionProps) {
  return (
    <section className={`px-6 py-16 lg:px-10 lg:py-24 ${className}`}>
      <div className="mx-auto max-w-[1180px]">{children}</div>
    </section>
  )
}

type SectionHeadProps = {
  eyebrow: string
  title: string
  lead?: string
}

export function SectionHead({ eyebrow, title, lead }: SectionHeadProps) {
  return (
    <div className="max-w-[720px]">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-[28px] leading-tight font-bold text-white lg:text-[38px]">
        {title}
      </h2>
      {lead && (
        <p className="mt-4 text-[15px] leading-relaxed text-mist-200 lg:text-[17px]">
          {lead}
        </p>
      )}
    </div>
  )
}

/** Kepala halaman untuk Features / About / Help — memberi ruang bagi navbar. */
export function PageHero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string
  title: string
  lead: string
}) {
  return (
    <section className="border-b border-navy-700/50 px-6 pt-[120px] pb-14 lg:px-10 lg:pt-[190px] lg:pb-20">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-[760px] animate-rise-in">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-3 text-[34px] leading-tight font-bold text-white lg:text-[52px]">
            {title}
          </h1>
          <p className="mt-5 text-[16px] leading-relaxed text-mist-200 lg:text-[18px]">
            {lead}
          </p>
        </div>
      </div>
    </section>
  )
}
