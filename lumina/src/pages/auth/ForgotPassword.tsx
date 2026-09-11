import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthFlowLayout from '../../components/layout/AuthFlowLayout'
import Button from '../../components/ui/Button'
import FormAlert from '../../components/ui/FormAlert'
import Input from '../../components/ui/Input'
import { ApiError } from '../../lib/api'
import { forgotPassword } from '../../lib/authApi'
import { writePendingOtp } from '../../lib/authStorage'

function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [alert, setAlert] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return

    setAlert(null)
    if (!email.trim()) {
      setFieldError('Email wajib diisi.')
      return
    }
    setFieldError(undefined)
    setSubmitting(true)

    try {
      const { pending } = await forgotPassword(email.trim())
      // Backend selalu membalas sukses (agar email terdaftar tidak bisa ditebak),
      // jadi alurnya selalu lanjut ke layar OTP.
      writePendingOtp(pending)
      navigate('/verify-otp')
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldError(error.fieldError('email'))
        setAlert(error.message)
      } else {
        setAlert('Terjadi kesalahan tak terduga.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFlowLayout>
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-[560px] text-center">
        <h1 className="text-[34px] sm:text-[46px] lg:text-[60px] leading-none font-bold text-white">
          Forgot Password?
        </h1>

        <p className="mx-auto mt-[27px] max-w-[470px] text-[15px] sm:text-[17px] lg:text-[20px] leading-snug lg:leading-none tracking-[0.08em] lg:tracking-[0.11em] text-white">
          Masukkan email akunmu, kami akan mengirimkan link untuk reset
          password.
        </p>

        {alert && (
          <FormAlert className="mx-auto mt-8 max-w-[438px]">{alert}</FormAlert>
        )}

        <Input
          className="mx-auto mt-10 w-full max-w-[438px] lg:mt-[52px]"
          variant="pill"
          icon={Mail}
          label="EMAIL"
          type="email"
          placeholder="yourname@gmail.com"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (fieldError) setFieldError(undefined)
          }}
          disabled={submitting}
          error={fieldError}
        />

        <Button
          type="submit"
          variant="navy"
          size="lg"
          className="mt-10 w-full max-w-[230px] lg:mt-[56px]"
          disabled={submitting}
        >
          {submitting ? 'MENGIRIM…' : 'SEND'}
        </Button>

        <Link
          to="/login"
          className="mt-[17px] flex items-center justify-center gap-2.5 text-[16px] lg:text-[19px] text-white transition-colors hover:text-mist-200"
        >
          <ArrowLeft className="size-5" strokeWidth={1.5} />
          Back to Login
        </Link>
      </form>
    </AuthFlowLayout>
  )
}

export default ForgotPassword
