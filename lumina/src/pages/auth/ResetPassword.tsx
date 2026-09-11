import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthFlowLayout from '../../components/layout/AuthFlowLayout'
import Button from '../../components/ui/Button'
import FormAlert from '../../components/ui/FormAlert'
import Input from '../../components/ui/Input'
import { ApiError } from '../../lib/api'
import { resetPassword } from '../../lib/authApi'
import { clearResetToken, readResetToken } from '../../lib/authStorage'

function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Dua jalur masuk ke halaman ini:
  //   1. link dari email  -> /reset-password?token=...
  //   2. setelah OTP      -> token tersimpan di sessionStorage
  const [token] = useState(() => searchParams.get('token') ?? readResetToken() ?? '')

  const [form, setForm] = useState({ password: '', confirm_password: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [alert, setAlert] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      navigate('/forgot-password', { replace: true })
    }
  }, [token, navigate])

  const update = (field: 'password' | 'confirm_password') => (value: string) => {
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
    if (!form.password) errors.password = 'Password baru wajib diisi.'
    else if (form.password.length < 8)
      errors.password = 'Password minimal 8 karakter.'
    if (!form.confirm_password)
      errors.confirm_password = 'Ulangi password barumu.'
    else if (form.confirm_password !== form.password)
      errors.confirm_password = 'Konfirmasi password tidak sama.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setSubmitting(true)

    try {
      const { message } = await resetPassword({
        reset_token: token,
        password: form.password,
        confirm_password: form.confirm_password,
      })
      clearResetToken()
      navigate('/login', { replace: true, state: { message } })
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors)
        setAlert(error.message)
      } else {
        setAlert('Terjadi kesalahan tak terduga.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Token invalid/kedaluwarsa: arahkan pengguna mengulang dari awal.
  const tokenRejected =
    alert !== null &&
    Object.keys(fieldErrors).length === 0 &&
    /token|kedaluwarsa/i.test(alert)

  if (!token) return null

  return (
    <AuthFlowLayout>
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-[560px] text-center">
        <h1 className="text-[34px] sm:text-[46px] lg:text-[60px] leading-none font-bold text-white">
          Reset Password
        </h1>

        <p className="mx-auto mt-[27px] max-w-[430px] text-[15px] sm:text-[17px] lg:text-[20px] leading-snug lg:leading-none tracking-[0.08em] lg:tracking-[0.11em] text-white">
          Masukkan password baru untuk akun LUMINA kamu.
        </p>

        {alert && (
          <FormAlert className="mx-auto mt-8 max-w-[438px]">
            {alert}
            {tokenRejected && (
              <>
                {' '}
                <Link
                  to="/forgot-password"
                  className="font-semibold underline underline-offset-2"
                >
                  Minta kode baru
                </Link>
              </>
            )}
          </FormAlert>
        )}

        <Input
          className="mx-auto mt-10 w-full max-w-[438px] lg:mt-[52px]"
          variant="pill"
          icon={Lock}
          label="NEW PASSWORD"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => update('password')(event.target.value)}
          disabled={submitting}
          error={fieldErrors.password}
        />

        <Input
          className="mx-auto mt-8 w-full max-w-[438px] lg:mt-[37px]"
          variant="pill"
          label="RE-ENTER PASSWORD"
          type="password"
          autoComplete="new-password"
          value={form.confirm_password}
          onChange={(event) => update('confirm_password')(event.target.value)}
          disabled={submitting}
          error={fieldErrors.confirm_password}
        />

        <Button
          type="submit"
          variant="navy"
          size="lg"
          className="mt-8 w-full max-w-[230px] lg:mt-[36px]"
          disabled={submitting}
        >
          {submitting ? 'MENYIMPAN…' : 'SEND'}
        </Button>
      </form>
    </AuthFlowLayout>
  )
}

export default ResetPassword
