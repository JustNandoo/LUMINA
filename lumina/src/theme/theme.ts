import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

// Nilai warnanya didefinisikan sekali di index.css (@theme), jadi satu perubahan
// di sana langsung ikut ke class Tailwind (bg-navy-900) dan ke object ini.
export const colors = {
  navy900: 'var(--color-navy-900)',
  navy800: 'var(--color-navy-800)',
  navy700: 'var(--color-navy-700)',
  mist400: 'var(--color-mist-400)',
  mist200: 'var(--color-mist-200)',
  mist100: 'var(--color-mist-100)',
  white: '#ffffff',
  brandBlue: 'var(--color-brand-blue)',
  brandCyan: 'var(--color-brand-cyan)',
  danger: 'var(--color-danger)',
  dangerSoft: 'var(--color-danger-soft)',
  warning: 'var(--color-warning)',
  warningSoft: 'var(--color-warning-soft)',
} as const

export type ColorName = keyof typeof colors

export function getColor(name: ColorName): string {
  return colors[name]
}

/**
 * Nilai warna yang sudah jadi (mis. "#5de6ff"). Dipakai untuk API yang tidak
 * bisa menerima var() — misalnya pathOptions Leaflet, yang menulis warna ke
 * atribut presentasi SVG.
 */
export function resolveColor(name: ColorName): string {
  const value = colors[name]
  const custom = value.match(/^var\((--[\w-]+)\)$/)
  if (!custom) return value
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(custom[1])
      .trim() || value
  )
}

export const fontFamily = {
  sans: "'Inter', system-ui, 'Segoe UI', Roboto, sans-serif",
} as const

export const theme = {
  colors,
  fontFamily,
} as const

export default theme
