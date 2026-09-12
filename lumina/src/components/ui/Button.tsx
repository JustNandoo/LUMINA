import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'outline' | 'dark' | 'navy' | 'glass' | 'cyan'
type ButtonSize = 'sm' | 'md' | 'lg' | 'block'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-mist-100 text-navy-900 hover:bg-white',
  outline: 'border-mist-400/60 text-white hover:bg-white/10',
  dark: 'border-transparent bg-navy-900 text-white hover:bg-navy-900/70',
  navy: 'border-mist-400/70 bg-navy-800 text-white hover:bg-navy-700',
  glass:
    'border-white/20 bg-white/12 text-white backdrop-blur-md hover:bg-white/20',
  // Aksi utama di dalam aplikasi (lihat TripDetailPanel): cyan pekat di
  // atas navy, teks gelap. Dipakai untuk satu tombol paling penting saja.
  cyan: 'border-transparent bg-brand-cyan text-navy-900 hover:brightness-110',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-5 py-2.5 text-[13px] font-medium',
  md: 'rounded-lg px-5 py-[15px] text-[15px] leading-none font-medium tracking-[0.1em]',
  lg: 'rounded-[10px] px-5 py-[16px] text-[20px] leading-none font-medium tracking-[0.12em]',
  block: 'rounded-[12px] px-5 py-[15px] text-[16px] leading-none font-semibold',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

function Button({
  variant = 'primary',
  size = 'sm',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
