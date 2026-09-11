export type AuthMode = 'login' | 'signup'

type AuthTabsProps = {
  mode: AuthMode
  onChange: (mode: AuthMode) => void
  className?: string
}

function AuthTabs({ mode, onChange, className = '' }: AuthTabsProps) {
  const tabClass = (active: boolean) =>
    `relative flex-1 rounded-[9px] py-[6px] text-[14px] font-medium tracking-[0.03em] transition-colors ${
      active ? 'text-white' : 'text-white/55 hover:text-white/80'
    }`

  return (
    <div
      className={`relative flex rounded-[12px] border border-white/12 bg-black/20 p-[4px] backdrop-blur-md ${className}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-[4px] left-[4px] w-[calc(50%-4px)] rounded-[9px] border border-white/25 bg-white/20 shadow-[0_2px_10px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out ${
          mode === 'login' ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
      <button
        type="button"
        onClick={() => onChange('signup')}
        className={tabClass(mode === 'signup')}
      >
        Sign Up
      </button>
      <button
        type="button"
        onClick={() => onChange('login')}
        className={tabClass(mode === 'login')}
      >
        Login
      </button>
    </div>
  )
}

export default AuthTabs
