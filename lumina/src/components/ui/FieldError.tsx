type FieldErrorProps = {
  message?: string
  className?: string
}

/** Pesan validasi di bawah sebuah input. */
function FieldError({ message, className = '' }: FieldErrorProps) {
  if (!message) return null
  return (
    <p className={`mt-2 text-[12px] leading-snug text-danger-soft ${className}`}>
      {message}
    </p>
  )
}

export default FieldError
