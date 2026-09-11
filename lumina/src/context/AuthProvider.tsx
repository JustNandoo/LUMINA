import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, SESSION_EXPIRED_EVENT } from '../lib/api'
import { fetchMe, logout } from '../lib/authApi'
import type { AuthTokens, AuthUser } from '../lib/authApi'
import {
  clearPendingOtp,
  clearResetToken,
  clearTokens,
  readStoredUser,
  readTokens,
  writeStoredUser,
  writeTokens,
} from '../lib/authStorage'
import { AuthContext } from './authContext'
import type { AuthStatus } from './authContext'

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [status, setStatus] = useState<AuthStatus>(() =>
    readTokens().accessToken ? 'loading' : 'guest',
  )

  // Saat aplikasi dibuka, token yang tersimpan divalidasi ulang ke /me.
  // Tanpa token, status awalnya sudah 'guest' — tidak perlu diubah lagi.
  useEffect(() => {
    if (!readTokens().accessToken) return

    let active = true
    fetchMe()
      .then((freshUser) => {
        if (!active) return
        setUser(freshUser)
        writeStoredUser(freshUser)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (!active) return
        // Backend mati bukan berarti sesi tidak sah — pakai profil cache dulu.
        if (error instanceof ApiError && error.isNetworkError && readStoredUser()) {
          setStatus('authenticated')
          return
        }
        clearTokens()
        setUser(null)
        setStatus('guest')
      })

    return () => {
      active = false
    }
  }, [])

  // Dipicu klien API ketika refresh token ikut ditolak.
  useEffect(() => {
    const handleExpired = () => {
      clearTokens()
      setUser(null)
      setStatus('guest')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [])

  const startSession = useCallback(
    ({ user: nextUser, tokens }: { user: AuthUser; tokens: AuthTokens }) => {
      writeTokens(tokens)
      writeStoredUser(nextUser)
      clearPendingOtp()
      clearResetToken()
      setUser(nextUser)
      setStatus('authenticated')
    },
    [],
  )

  const endSession = useCallback(async (notifyServer = true) => {
    if (notifyServer && readTokens().accessToken) {
      try {
        await logout(readTokens().refreshToken)
      } catch {
        // Logout server gagal (offline / token mati) - sesi lokal tetap dihapus.
      }
    }
    clearTokens()
    clearPendingOtp()
    clearResetToken()
    setUser(null)
    setStatus('guest')
  }, [])

  const applyUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser)
    writeStoredUser(nextUser)
  }, [])

  const refreshUser = useCallback(async () => {
    const freshUser = await fetchMe()
    setUser(freshUser)
    writeStoredUser(freshUser)
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      startSession,
      endSession,
      applyUser,
      refreshUser,
    }),
    [user, status, startSession, endSession, applyUser, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
