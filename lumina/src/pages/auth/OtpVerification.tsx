import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthFlowLayout from '../../components/layout/AuthFlowLayout'
import Button from '../../components/ui/Button'
import FormAlert from '../../components/ui/FormAlert'
import { useAuth } from '../../context/useAuth'
import { ApiError } from '../../lib/api'
import { resendOtp, verifyEmailOtp, verifyResetOtp } from '../../lib/authApi'
import {
  clearPendingOtp,
  readPendingOtp,
  writePendingOtp,
  writeResetToken,
} from '../../lib/authStorage'
import type { PendingOtp } from '../../lib/authStorage'
import OtpInput from './OtpInput'

const OTP_LENGTH = 6

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Sisa detik menuju sebuah epoch-ms, dihitung ulang dari jam sistem. */
function secondsUntil(timestamp: number) {
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000))
}

function OtpVerification() {
  const navigate = useNavigate()
  const { startSession } = useAuth()

  // Dibawa dari layar Sign Up / Login / Forgot Password lewat sessionStorage,
  // jadi state-nya bertahan kalau halaman ini di-refresh.
  const [pending, setPending] = useState<PendingOtp | null>(() => readPendingOtp())
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const lastAttempt = useRef('')

  // Tidak ada alur yang sedang berjalan -> kembali ke login.
  useEffect(() => {
    if (!pending) navigate('/login', { replace: true })
  }, [pending, navigate])

  // Satu timer untuk countdown kode dan countdown tombol kirim ulang.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const secondsLeft = pending ? secondsUntil(pending.expiresAt) : 0
  const resendIn = pending ? secondsUntil(pending.resendAvailableAt) : 0
  const expired = secondsLeft === 0
  void now // pemicu render tiap detik

  const handleVerify = useCallback(
    async (submittedCode: string) => {
      if (!pending || submitting) return
      if (submittedCode.length !== OTP_LENGTH) {
        setError(`Masukkan ${OTP_LENGTH} digit kode OTP.`)
        return
      }

      setError(null)
      setNotice(null)
      setSubmitting(true)

      try {
        if (pending.purpose === 'password_reset') {
          const { resetToken } = await verifyResetOtp({
            email: pending.email,
            otp: submittedCode,
          })
          // Halaman Reset Password memakai token ini.
          writeResetToken(resetToken)
          clearPendingOtp()
          navigate('/reset-password', { replace: true })
          return
        }

        const session = await verifyEmailOtp({
          email: pending.email,
          otp: submittedCode,
        })
        clearPendingOtp()
        startSession(session)
        navigate('/app/home', { replace: true })
      } catch (apiError) {
        if (apiError instanceof ApiError) {
          setError(apiError.fieldError('otp', 'code') ?? apiError.message)
        } else {
          setError('Terjadi kesalahan tak terduga.')
        }
        setCode('')
      } finally {
        setSubmitting(false)
      }
    },
    [pending, submitting, navigate, startSession],
  )

  const handleResend = async () => {
    if (!pending || resending || resendIn > 0) return

    setError(null)
    setNotice(null)
    setResending(true)
    try {
      const { message, pending: refreshed } = await resendOtp({
        email: pending.email,
        purpose: pending.purpose,
      })
      writePendingOtp(refreshed)
      setPending(refreshed)
      setCode('')
      lastAttempt.current = ''
      setNotice(message)
    } catch (apiError) {
      if (apiError instanceof ApiError) {
        // Kena cooldown: pakai sisa waktu dari server untuk mengunci tombol.
        const retryAfter = apiError.meta.retry_after_seconds
        if (typeof retryAfter === 'number') {
          const refreshed = {
            ...pending,
            resendAvailableAt: Date.now() + retryAfter * 1000,
          }
          writePendingOtp(refreshed)
          setPending(refreshed)
        }
        setError(apiError.message)
      } else {
        setError('Gagal mengirim ulang kode.')
      }
    } finally {
      setResending(false)
    }
  }

  if (!pending) return null

  const isReset = pending.purpose === 'password_reset'

  return (
    <AuthFlowLayout>
      <div className="mt-[38px] w-full max-w-[380px] rounded-xl bg-navy-900/65 px-5 py-7 backdrop-blur-sm sm:px-8 sm:py-9">
        <h1 className="text-[17px] font-medium text-white">OTP Verification</h1>

        <p className="mt-[9px] text-[15px] leading-[1.75] text-mist-200">
          Masukkan kode OTP yang telah kami kirimkan
          <br />
          ke email kamu{' '}
          <span className="text-brand-cyan">{pending.maskedEmail}</span>
        </p>

        {pending.emailDelivered === false && pending.devCode && (
          <FormAlert tone="info" className="mt-4">
            Mode dev — SMTP belum diaktifkan. Kode kamu:{' '}
            <span className="font-semibold tracking-[0.2em] text-white">
              {pending.devCode}
            </span>
          </FormAlert>
        )}

        <p className="mt-[25px] text-[14px] tracking-[0.1em] text-mist-400">
          SECURITY TOKEN CODE
        </p>

        <OtpInput
          className="mt-[9px]"
          value={code}
          onChange={(next) => {
            setCode(next)
            if (error) setError(null)
          }}
          onComplete={(next) => {
            // Cegah pengiriman ganda untuk kode yang sama.
            if (next === lastAttempt.current) return
            lastAttempt.current = next
            void handleVerify(next)
          }}
          disabled={submitting || expired}
          hasError={Boolean(error)}
        />

        <div className="mt-[13px] flex items-center justify-between text-[14px]">
          <span className="flex items-center gap-1.5 text-mist-400">
            <Clock className="size-3.5" strokeWidth={1.5} />
            {expired ? 'Kode kedaluwarsa' : 'Kode berlaku selama'}
          </span>
          {!expired && (
            <span className="font-medium text-brand-cyan">
              {formatCountdown(secondsLeft)} menit
            </span>
          )}
        </div>

        {error && <FormAlert className="mt-4">{error}</FormAlert>}
        {notice && !error && (
          <FormAlert tone="success" className="mt-4">
            {notice}
          </FormAlert>
        )}

        <Button
          variant="navy"
          size="md"
          className="mt-[24px] inline-flex w-full items-center justify-center gap-2.5"
          disabled={submitting || expired || code.length !== OTP_LENGTH}
          onClick={() => void handleVerify(code)}
        >
          {submitting ? 'MEMERIKSA…' : 'VERIFY OTP'}
          {!submitting && <ArrowRight className="size-[18px]" strokeWidth={2} />}
        </Button>

        <p className="mt-[33px] text-center text-[15px] text-mist-200">
          Belum menerima kode?{' '}
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resending || resendIn > 0}
            className="text-brand-cyan transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-mist-400 disabled:hover:text-mist-400"
          >
            {resendIn > 0
              ? `Kirim Ulang OTP (${resendIn}s)`
              : resending
                ? 'Mengirim…'
                : 'Kirim Ulang OTP'}
          </button>
        </p>

        <hr className="mt-[14px] border-mist-400/20" />

        <Link
          to={isReset ? '/forgot-password' : '/login'}
          onClick={() => clearPendingOtp()}
          className="mt-[9px] flex items-center justify-center gap-2 text-[15px] text-mist-400 transition-colors hover:text-mist-100"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} />
          {isReset ? 'Ganti Email' : 'Back to Login'}
        </Link>
      </div>
    </AuthFlowLayout>
  )
}

export default OtpVerification
