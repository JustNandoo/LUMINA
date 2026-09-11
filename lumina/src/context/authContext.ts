import { createContext } from 'react'
import type { AuthTokens, AuthUser } from '../lib/authApi'

export type AuthStatus = 'loading' | 'authenticated' | 'guest'

export type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  isAuthenticated: boolean
  /** Simpan token + profil setelah login/verifikasi berhasil. */
  startSession: (session: { user: AuthUser; tokens: AuthTokens }) => void
  /** Hapus sesi lokal; `notifyServer` juga memanggil /logout. */
  endSession: (notifyServer?: boolean) => Promise<void>
  /** Perbarui profil di context (mis. setelah PATCH /me). */
  applyUser: (user: AuthUser) => void
  /** Ambil ulang profil dari server. */
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
