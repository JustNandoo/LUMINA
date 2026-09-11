import { useState } from 'react'
import type { FormEvent } from 'react'
import { Lock, Mail, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FormAlert from '../../components/ui/FormAlert'
import { ApiError } from '../../lib/api'
import { register } from '../../lib/authApi'
import { writePendingOtp } from '../../lib/authStorage'
import AuthField from './AuthField'
import GoogleAuthButton from './GoogleAuthButton'

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  confirm_password: '',
}

type SignUpFormProps = {
  onSwitchToLogin?: () => void
}

function SignUpForm({ onSwitchToLogin }: SignUpFormProps) {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [alert, setAlert] = useState<{ message: string; showLoginLink: boolean } | null>(
    null,
  )
  const [submitting, setSubmitting] = useState(false)

  const update = (field: keyof typeof emptyForm) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  /** Cek murah di sisi klien; aturan lengkap tetap milik backend. */
  const validate = () => {
    const errors: Record<string, string> = {}
    if (!form.full_name.trim()) errors.full_name = 'Nama lengkap wajib diisi.'
    if (!form.email.trim()) errors.email = 'Email wajib diisi.'
    if (!form.password) errors.password = 'Password wajib diisi.'
    else if (form.password.length < 8)
      errors.password = 'Password minimal 8 karakter.'
    if (!form.confirm_password)
      errors.confirm_password = 'Konfirmasi password wajib diisi.'
    else if (form.confirm_password !== form.password)
      errors.confirm_password = 'Konfirmasi password tidak sama.'
    return errors
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return

    setAlert(null)
    const localErrors = validate()
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      return
    }
    setFieldErrors({})
    setSubmitting(true)

    try {
      const { pending } = await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
      })
      // Layar OTP membaca state ini (bertahan walau halaman di-refresh).
      writePendingOtp(pending)
      navigate('/verify-otp')
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors)
        setAlert({
          message: error.message,
          showLoginLink:
            error.code === 'EMAIL_ALREADY_REGISTERED' ||
            error.code === 'GOOGLE_ACCOUNT_EXISTS',
        })
      } else {
        setAlert({ message: 'Terjadi kesalahan tak terduga.', showLoginLink: false })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="pt-[23px]" onSubmit={handleSubmit} noValidate>
      {alert && (
        <FormAlert className="mb-[18px]">
          {alert.message}
          {alert.showLoginLink && onSwitchToLogin && (
            <>
              {' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-semibold underline underline-offset-2"
              >
                Masuk di sini
              </button>
            </>
          )}
        </FormAlert>
      )}

      <AuthField
        icon={User}
        label="Full Name"
        placeholder="Enter your full name"
        autoComplete="name"
        value={form.full_name}
        onChange={(event) => update('full_name')(event.target.value)}
        disabled={submitting}
        error={fieldErrors.full_name}
      />

      <AuthField
        className="mt-[27px]"
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
        placeholder="Create a password"
        autoComplete="new-password"
        value={form.password}
        onChange={(event) => update('password')(event.target.value)}
        disabled={submitting}
        error={fieldErrors.password}
      />

      <AuthField
        className="mt-[27px]"
        icon={Lock}
        label="Confirm Password"
        type="password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        value={form.confirm_password}
        onChange={(event) => update('confirm_password')(event.target.value)}
        disabled={submitting}
        error={fieldErrors.confirm_password}
      />

      <Button
        type="submit"
        variant="glass"
        size="block"
        className="mt-[28px] w-full"
        disabled={submitting}
      >
        {submitting ? 'Mengirim kode…' : 'Create Account'}
      </Button>

      <GoogleAuthButton label="Or sign up with Google" disabled={submitting} />
    </form>
  )
}

export default SignUpForm
