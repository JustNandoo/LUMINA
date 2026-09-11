import { useState } from 'react'
import type { FormEvent } from 'react'
import { Lock, Mail } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FormAlert from '../../components/ui/FormAlert'
import { useAuth } from '../../context/useAuth'
import { ApiError } from '../../lib/api'
import { login, toPendingOtp } from '../../lib/authApi'
import type { VerificationPayload } from '../../lib/authApi'
import { writePendingOtp } from '../../lib/authStorage'
import AuthField from './AuthField'
import GoogleAuthButton from './GoogleAuthButton'

function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { startSession } = useAuth()

  // Pesan dari alur lain (mis. setelah reset password berhasil).
  const flashMessage = (location.state as { message?: string } | null)?.message
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? '/app/home'

  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [alert, setAlert] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (field: 'email' | 'password') => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return

    setAlert(null)
    const errors: Record<string, string> = {}
    if (!form.email.trim()) errors.email = 'Email wajib diisi.'
    if (!form.password) errors.password = 'Password wajib diisi.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setSubmitting(true)

    try {
      const session = await login({
        email: form.email.trim(),
        password: form.password,
      })
      startSession(session)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setAlert('Terjadi kesalahan tak terduga.')
        return
      }

      // Akun belum diverifikasi: backend sudah mengirim OTP baru, tinggal
      // lanjut ke layar verifikasi memakai metadata dari respons.
      if (error.code === 'ACCOUNT_NOT_VERIFIED') {
        writePendingOtp(
          toPendingOtp(error.meta as VerificationPayload, {
            email: form.email.trim(),
            purpose: 'email_verification',
          }),
        )
        navigate('/verify-otp')
        return
      }

      setFieldErrors(error.fieldErrors)
      setAlert(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="pt-[23px]" onSubmit={handleSubmit} noValidate>
      {flashMessage && !alert && (
        <FormAlert tone="success" className="mb-[18px]">
          {flashMessage}
        </FormAlert>
      )}
      {alert && <FormAlert className="mb-[18px]">{alert}</FormAlert>}

      <AuthField
        icon={Mail}
        label="Email"
        type="email"
        placeholder="Enter your email address"
        autoComplete="email"
        value={form.email}
        onChange={(event) => update('email')(event.target.value)}
        disabled={submitting}
        error={fieldErrors.email}
      />

      <AuthField
        className="mt-[27px]"
        icon={Lock}
        label="Password"
        type="password"
        placeholder="Enter your password"
        autoComplete="current-password"
        value={form.password}
        onChange={(event) => update('password')(event.target.value)}
        disabled={submitting}
        error={fieldErrors.password}
      />

      <Link
        to="/forgot-password"
        className="mt-[14px] inline-block text-[12px] text-white/60 underline underline-offset-2 transition-colors hover:text-white"
      >
        Forgot password?
      </Link>

      <Button
        type="submit"
        variant="glass"
        size="block"
        className="mt-[22px] w-full"
        disabled={submitting}
      >
        {submitting ? 'Masuk…' : 'Log In'}
      </Button>

      <GoogleAuthButton label="Or continue with Google" disabled={submitting} />
    </form>
  )
}

export default LoginForm
