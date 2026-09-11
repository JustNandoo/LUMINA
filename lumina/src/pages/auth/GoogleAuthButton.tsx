import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormAlert from '../../components/ui/FormAlert'
import { useAuth } from '../../context/useAuth'
import { ApiError } from '../../lib/api'
import { loginWithGoogle } from '../../lib/authApi'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

type CredentialResponse = { credential?: string }

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string
            callback: (response: CredentialResponse) => void
          }): void
          renderButton(parent: HTMLElement, options: Record<string, unknown>): void
        }
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null

/** Muat skrip Google Identity Services sekali saja untuk seluruh aplikasi. */
function loadGoogleScript(): Promise<void> {
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    )
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('gsi')))
      if (window.google?.accounts?.id) resolve()
      return
    }

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('gsi'))
    document.head.appendChild(script)
  }).catch((error) => {
    scriptPromise = null
    throw error
  })

  return scriptPromise
}

type GoogleAuthButtonProps = {
  label: string
  disabled?: boolean
}

/**
 * Tombol "Continue with Google".
 * Otomatis tidak dirender kalau VITE_GOOGLE_CLIENT_ID belum diisi,
 * jadi aman ditinggalkan kosong selama Google Sign-In belum dipakai.
 */
function GoogleAuthButton({ label, disabled = false }: GoogleAuthButtonProps) {
  const navigate = useNavigate()
  const { startSession } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!CLIENT_ID) return
    let active = true

    loadGoogleScript()
      .then(() => {
        if (!active || !containerRef.current || !window.google) return

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response: CredentialResponse) => {
            if (!response.credential) {
              setError('Google tidak mengirimkan kredensial.')
              return
            }
            try {
              const session = await loginWithGoogle(response.credential)
              startSession(session)
              navigate('/app/home', { replace: true })
            } catch (apiError) {
              setError(
                apiError instanceof ApiError
                  ? apiError.message
                  : 'Login dengan Google gagal.',
              )
            }
          },
        })

        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 320,
        })
      })
      .catch(() => {
        if (active) setError('Gagal memuat Google Sign-In.')
      })

    return () => {
      active = false
    }
  }, [navigate, startSession])

  if (!CLIENT_ID) return null

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : undefined}>
      <p className="mt-[18px] text-center text-[12px] text-white/60">{label}</p>
      <div ref={containerRef} className="mt-[10px] flex justify-center" />
      {error && <FormAlert className="mt-[12px]">{error}</FormAlert>}
    </div>
  )
}

export default GoogleAuthButton
