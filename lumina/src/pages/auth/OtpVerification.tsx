import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Mail, RotateCw, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import luminaLogo from '../../assets/images/Logo/Lumina_Logo.png'
import AuthFlowLayout from '../../components/layout/AuthFlowLayout'
import Button from '../../components/ui/Button'
import FormAlert from '../../components/ui/FormAlert'
import { useAuth } from '../../context/useAuth'
import { ApiError } from '../../lib/api'
import { resendOtp, verifyEmailOtp, verifyResetOtp, homePathFor } from '../../lib/authApi'
import {
  clearPendingOtp,
  readPendingOtp,
  writePendingOtp,
  writeResetToken,
} from '../../lib/authStorage'
import type { PendingOtp } from '../../lib/authStorage'
import OtpInput from './OtpInput'

const OTP_LENGTH = 6
/** Di bawah ini sisa waktu ditandai merah, bukan cyan. */
const URGENT_SECONDS = 30

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
        navigate(homePathFor(session.user), { replace: true })
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
  const urgent = !expired && secondsLeft <= URGENT_SECONDS
  // Sisa waktu sebagai pecahan dari masa berlaku penuh. ttlSeconds bisa belum
  // ada pada sesi lama yang tersimpan sebelum field ini diperkenalkan.
  const ttl = pending.ttlSeconds || 300
  const remaining = Math.min(1, Math.max(0, secondsLeft / ttl))

  return (
    <AuthFlowLayout showBrand={false}>
      <div className="animate-card-in w-full max-w-[440px] rounded-[22px] border border-navy-700/50 bg-navy-950/92 p-6 backdrop-blur-md sm:p-8">
        {/* ------------------------------------------------ kepala + merek */}
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-[14px] border border-brand-cyan/25 bg-brand-cyan/10">
            <img src={luminaLogo} alt="" className="h-6 w-auto" />
          </span>
          <span className="text-[15px] font-semibold tracking-[0.16em] text-white">
            LUMINA
          </span>
        </Link>

        <h1 className="mt-6 text-[26px] leading-tight font-bold text-white sm:text-[28px]">
          {isReset ? 'Konfirmasi reset password' : 'Verifikasi email kamu'}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-mist-400">
          Kami mengirim kode {OTP_LENGTH} digit ke alamat di bawah ini.
        </p>

        {/* Alamat tujuan dibuat sebagai kartu tersendiri: ini satu-satunya
            petunjuk ke mana kode dikirim, jadi tidak boleh larut jadi teks
            biasa di tengah paragraf. */}
        <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-navy-700/50 bg-navy-900/60 px-4 py-3">
          <Mail className="size-[18px] shrink-0 text-brand-cyan" strokeWidth={1.8} />
          <span className="min-w-0 truncate text-[15px] font-semibold text-white">
            {pending.maskedEmail}
          </span>
        </div>

        {pending.emailDelivered === false && pending.devCode && (
          <FormAlert tone="info" className="mt-4">
            Mode dev — SMTP belum diaktifkan. Kode kamu:{' '}
            <span className="font-semibold tracking-[0.2em] text-white">
              {pending.devCode}
            </span>
          </FormAlert>
        )}

        {/* ------------------------------------------------------ isian kode */}
        <div className="mt-7 flex items-baseline justify-between gap-3">
          <label className="text-[13px] font-medium tracking-[0.12em] text-mist-400">
            KODE VERIFIKASI
          </label>
          {/* Mengikuti skala warna aplikasi di lib/crowdTone: keadaan mendesak
              memakai chip danger dengan teks danger-soft, bukan teks merah
              telanjang yang di atas navy justru terbaca putih. */}
          <span
            className={`text-[13px] font-semibold tabular-nums ${
              expired || urgent
                ? 'rounded-md bg-danger/20 px-2 py-0.5 text-danger-soft'
                : 'text-brand-cyan'
            }`}
          >
            {expired ? 'Kedaluwarsa' : formatCountdown(secondsLeft)}
          </span>
        </div>

        <OtpInput
          className="mt-3"
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

        {/* Bar sisa waktu: menyusut seiring countdown, jadi kondisi "hampir
            habis" terbaca tanpa harus membaca angkanya. */}
        <div
          className="mt-3 h-[3px] overflow-hidden rounded-full bg-navy-800"
          role="presentation"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
              urgent || expired ? 'bg-danger' : 'bg-brand-cyan/70'
            }`}
            style={{ width: `${remaining * 100}%` }}
          />
        </div>

        {error && <FormAlert className="mt-4">{error}</FormAlert>}
        {notice && !error && (
          <FormAlert tone="success" className="mt-4">
            {notice}
          </FormAlert>
        )}

        {/* ------------------------------------------------------- aksi utama */}
        {/* Cyan 60% masih terbaca seperti tombol aktif, jadi keadaan mati dibuat
            benar-benar padam: navy datar, teks redup. Tombol yang tampak bisa
            ditekan padahal tidak, akan ditekan juga. */}
        <Button
          variant="cyan"
          size="block"
          className="mt-6 inline-flex w-full items-center justify-center gap-2.5 disabled:bg-navy-800 disabled:text-mist-400 disabled:opacity-100"
          disabled={submitting || expired || code.length !== OTP_LENGTH}
          onClick={() => void handleVerify(code)}
        >
          {submitting ? (
            'Memeriksa…'
          ) : (
            <>
              <ShieldCheck className="size-[18px]" strokeWidth={2.2} />
              Verifikasi
              <ArrowRight className="size-[18px]" strokeWidth={2.2} />
            </>
          )}
        </Button>

        {/* ------------------------------------------------------ kirim ulang */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[14px]">
          <span className="text-mist-400">
            {expired ? 'Kode sudah tidak berlaku.' : 'Belum menerima kode?'}
          </span>
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resending || resendIn > 0}
            className="inline-flex items-center gap-1.5 font-semibold text-brand-cyan transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-mist-400 disabled:hover:text-mist-400"
          >
            <RotateCw
              className={`size-[15px] ${resending ? 'animate-spin' : ''}`}
              strokeWidth={2}
            />
            {resending
              ? 'Mengirim…'
              : resendIn > 0
                ? `Kirim ulang (${resendIn}s)`
                : 'Kirim ulang'}
          </button>
        </div>

        <div className="mt-6 border-t border-navy-700/40 pt-4">
          <Link
            to={isReset ? '/forgot-password' : '/login'}
            onClick={() => clearPendingOtp()}
            className="flex items-center justify-center gap-2 text-[14px] text-mist-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" strokeWidth={1.8} />
            {isReset ? 'Ganti email' : 'Kembali ke login'}
          </Link>
        </div>
      </div>
    </AuthFlowLayout>
  )
}

export default OtpVerification
