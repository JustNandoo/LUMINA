import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import FormAlert from '../../../components/ui/FormAlert'
import { useAuth } from '../../../context/useAuth'
import { ApiError } from '../../../lib/api'
import { changePassword, updateMe } from '../../../lib/authApi'

type SettingsCardProps = {
  title: string
  description: ReactNode
  children: ReactNode
}

function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <section className="rounded-[14px] border border-navy-700/50 bg-navy-900/70 px-5 py-6 sm:px-[30px] lg:py-[30px]">
      <h2 className="text-[20px] font-bold text-white">{title}</h2>
      <p className="mt-1.5 text-[14px] leading-[1.55] text-mist-200">
        {description}
      </p>
      {children}
    </section>
  )
}

type FieldProps = {
  label: string
  type?: 'text' | 'email' | 'password'
  value: string
  onChange?: (value: string) => void
  error?: string
  hint?: string
  disabled?: boolean
  readOnly?: boolean
  autoComplete?: string
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  disabled = false,
  readOnly = false,
  autoComplete,
}: FieldProps) {
  return (
    <div className="mt-[22px]">
      <label className="block text-[15px] font-medium text-white">
        {label}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          className={`mt-2.5 h-[42px] w-full rounded-lg border bg-transparent px-4 text-[14px] text-white transition-colors focus:outline-none disabled:opacity-60 read-only:text-mist-400 ${
            error
              ? 'border-danger/70 focus:border-danger'
              : 'border-navy-700 focus:border-mist-400'
          }`}
        />
      </label>
      {error && <p className="mt-1.5 text-[13px] text-danger-soft">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-[13px] text-mist-400">{hint}</p>}
    </div>
  )
}

function SaveButton({ pending, label = 'Save' }: { pending: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-[26px] w-full max-w-[125px] rounded-lg bg-navy-700 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-navy-700/70 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Saving…' : label}
    </button>
  )
}

function AccountSettingsColumn() {
  const { user, applyUser, startSession } = useAuth()

  // --- Profil -------------------------------------------------------------
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [syncedName, setSyncedName] = useState(user?.full_name ?? '')
  const [profileState, setProfileState] = useState<{
    error?: string
    fieldError?: string
    success?: string
    pending: boolean
  }>({ pending: false })

  // Profil dimuat setelah render pertama (AuthProvider memanggil /me), jadi
  // isian disamakan saat nilainya benar-benar berubah — bukan lewat effect.
  if (user && user.full_name !== syncedName) {
    setSyncedName(user.full_name)
    setFullName(user.full_name)
  }

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (profileState.pending) return

    if (!fullName.trim()) {
      setProfileState({ pending: false, fieldError: 'Nama wajib diisi.' })
      return
    }
    setProfileState({ pending: true })
    try {
      const { message, user: updated } = await updateMe({ full_name: fullName.trim() })
      applyUser(updated)
      setProfileState({ pending: false, success: message })
    } catch (error) {
      setProfileState({
        pending: false,
        error: error instanceof ApiError ? error.message : 'Gagal menyimpan profil.',
        fieldError:
          error instanceof ApiError ? error.fieldError('full_name') : undefined,
      })
    }
  }

  // --- Password -----------------------------------------------------------
  const emptyPasswordForm = {
    current_password: '',
    new_password: '',
    confirm_password: '',
  }
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)
  const [passwordState, setPasswordState] = useState<{
    error?: string
    fieldErrors: Record<string, string>
    success?: string
    pending: boolean
  }>({ pending: false, fieldErrors: {} })

  const updatePasswordField =
    (field: keyof typeof emptyPasswordForm) => (value: string) => {
      setPasswordForm((current) => ({ ...current, [field]: value }))
    }

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (passwordState.pending) return

    const errors: Record<string, string> = {}
    if (user?.has_password && !passwordForm.current_password)
      errors.current_password = 'Password lama wajib diisi.'
    if (!passwordForm.new_password)
      errors.new_password = 'Password baru wajib diisi.'
    else if (passwordForm.new_password.length < 8)
      errors.new_password = 'Password minimal 8 karakter.'
    if (passwordForm.confirm_password !== passwordForm.new_password)
      errors.confirm_password = 'Konfirmasi password tidak sama.'
    if (Object.keys(errors).length > 0) {
      setPasswordState({ pending: false, fieldErrors: errors })
      return
    }

    setPasswordState({ pending: true, fieldErrors: {} })
    try {
      const result = await changePassword({
        current_password: user?.has_password
          ? passwordForm.current_password
          : undefined,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      })
      // Ganti password mencabut semua sesi lama; backend mengirim token baru
      // untuk perangkat ini — harus disimpan supaya tidak ikut logout.
      startSession(result)
      setPasswordForm(emptyPasswordForm)
      setPasswordState({ pending: false, fieldErrors: {}, success: result.message })
    } catch (error) {
      setPasswordState({
        pending: false,
        fieldErrors: error instanceof ApiError ? error.fieldErrors : {},
        error:
          error instanceof ApiError ? error.message : 'Gagal memperbarui password.',
      })
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-[30px]">
      <form onSubmit={handleProfileSubmit} noValidate>
        <SettingsCard
          title="Profile Information"
          description="Update your account's profile information and email address"
        >
          {profileState.error && (
            <FormAlert className="mt-[22px]">{profileState.error}</FormAlert>
          )}
          {profileState.success && (
            <FormAlert tone="success" className="mt-[22px]">
              {profileState.success}
            </FormAlert>
          )}

          <Field
            label="Name"
            value={fullName}
            onChange={setFullName}
            autoComplete="name"
            disabled={profileState.pending}
            error={profileState.fieldError}
          />
          <Field
            label="Email"
            type="email"
            value={user?.email ?? ''}
            readOnly
            hint="Email tidak bisa diubah karena terikat verifikasi akun."
          />
          <SaveButton pending={profileState.pending} />
        </SettingsCard>
      </form>

      <form onSubmit={handlePasswordSubmit} noValidate>
        <SettingsCard
          title="Update Password"
          description="Ensure your account is using a long, random password to stay secure"
        >
          {passwordState.error && (
            <FormAlert className="mt-[22px]">{passwordState.error}</FormAlert>
          )}
          {passwordState.success && (
            <FormAlert tone="success" className="mt-[22px]">
              {passwordState.success}
            </FormAlert>
          )}

          {user?.has_password ? (
            <Field
              label="Current Password"
              type="password"
              autoComplete="current-password"
              value={passwordForm.current_password}
              onChange={updatePasswordField('current_password')}
              disabled={passwordState.pending}
              error={passwordState.fieldErrors.current_password}
            />
          ) : (
            <FormAlert tone="info" className="mt-[22px]">
              Akunmu masuk lewat Google dan belum punya password. Buat password di
              bawah ini kalau ingin bisa login manual.
            </FormAlert>
          )}

          <Field
            label="New Password"
            type="password"
            autoComplete="new-password"
            value={passwordForm.new_password}
            onChange={updatePasswordField('new_password')}
            disabled={passwordState.pending}
            error={passwordState.fieldErrors.new_password}
          />
          <Field
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            value={passwordForm.confirm_password}
            onChange={updatePasswordField('confirm_password')}
            disabled={passwordState.pending}
            error={passwordState.fieldErrors.confirm_password}
          />
          <SaveButton pending={passwordState.pending} />
        </SettingsCard>
      </form>

      <SettingsCard
        title="Delete Account"
        description={
          <>
            Once your account is deleted, all of its resources and data will be
            permanently deleted. Before deleting your account, please download
            any data or information that you wish to retain
          </>
        }
      >
        {/* TODO: backend belum punya endpoint hapus akun. */}
        <button
          type="button"
          className="mt-[26px] rounded-lg bg-warning px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-warning/80"
        >
          Delete Account
        </button>
      </SettingsCard>
    </div>
  )
}

export default AccountSettingsColumn
