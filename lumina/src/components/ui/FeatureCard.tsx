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
      className={`flex h-full items-center gap-5 rounded-xl border border-navy-700/70 bg-navy-900/55 px-5 py-[30px] backdrop-blur-[2px] ${className}`}
    >
      <div className="flex size-[72px] shrink-0 items-center justify-center rounded-xl border border-navy-700 bg-navy-800/60">
        <Icon className="size-9 text-mist-100" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="text-[18px] leading-tight font-bold text-white">
          {title}
        </h3>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-mist-400">
          {description}
        </p>
      </div>
    </article>
  )
}

export default FeatureCard
