type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[42px] shrink-0 rounded-full transition-colors ${
        checked ? 'bg-navy-700' : 'bg-navy-950'
      }`}
    >
      <span
        className={`absolute top-[3px] size-4 rounded-full transition-all ${
          checked ? 'left-[23px] bg-white' : 'left-[3px] bg-mist-400'
        }`}
      />
    </button>
  )
}

export default Toggle
