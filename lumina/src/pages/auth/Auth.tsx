import { useLayoutEffect, useRef, useState } from 'react'
import AuthLayout from '../../components/layout/AuthLayout'
import AuthTabs from './AuthTabs'
import type { AuthMode } from './AuthTabs'
import LoginForm from './LoginForm'
import SignUpForm from './SignUpForm'

const copy: Record<AuthMode, { title: string; subtitle: string }> = {
  login: {
    title: 'Welcome Back',
    subtitle: 'Pick up where you left off with LUMINA.',
  },
  signup: {
    title: 'Get Started',
    subtitle: 'Create your LUMINA account to plan smarter trips.',
  },
}

type AuthProps = {
  initialMode?: AuthMode
}

function Auth({ initialMode = 'login' }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const formRef = useRef<HTMLDivElement>(null)
  const [formHeight, setFormHeight] = useState<number>()

  // Tinggi form dikunci ke konten yang sedang aktif supaya pergantiannya bisa
  // dianimasikan. Diukur ulang setelah font siap (tinggi label ikut berubah) dan
  // setiap kali isinya berubah tinggi — misal saat pesan error API muncul.
  useLayoutEffect(() => {
    const element = formRef.current
    if (!element) return

    const measure = () => setFormHeight(element.offsetHeight)
    measure()
    document.fonts.ready.then(measure)

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [mode])

  return (
    <AuthLayout>
      <div className="w-full max-w-[406px]">
        <div key={mode} className="animate-auth-in">
          <h1 className="text-center text-[28px] leading-none font-bold text-white">
            {copy[mode].title}
          </h1>
          <p className="mt-[11px] text-center text-[13px] text-white/65">
            {copy[mode].subtitle}
          </p>
        </div>

        <AuthTabs mode={mode} onChange={setMode} className="mt-[22px]" />

        <div
          className="overflow-hidden transition-[height] duration-300 ease-out"
          style={{ height: formHeight }}
        >
          <div ref={formRef}>
            <div key={mode} className="animate-auth-in">
              {mode === 'login' ? (
                <LoginForm />
              ) : (
                <SignUpForm onSwitchToLogin={() => setMode('login')} />
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}

export default Auth
