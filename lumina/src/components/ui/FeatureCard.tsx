import type { LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'

type FeatureCardProps = {
  icon: LucideIcon
  title: string
  description: string
  className?: string
  style?: CSSProperties
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  className = '',
  style,
}: FeatureCardProps) {
  return (
    <article
      style={style}
      className={`flex h-full items-center gap-5 rounded-2xl border border-white/15 bg-white/[0.07] px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_24px_48px_-24px_rgba(4,10,30,0.7)] backdrop-blur-xl backdrop-saturate-150 lg:py-[30px] ${className}`}
    >
      <div className="flex size-[64px] shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] lg:size-[72px]">
        <Icon className="size-9 text-mist-100" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="text-[18px] leading-tight font-bold text-white">
          {title}
        </h3>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-mist-200">
          {description}
        </p>
      </div>
    </article>
  )
}

export default FeatureCard
