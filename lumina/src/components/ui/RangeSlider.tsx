type RangeSliderProps = {
  value: number
  onChange: (value: number) => void
  label: string
  className?: string
}

function RangeSlider({ value, onChange, label, className = '' }: RangeSliderProps) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      aria-label={label}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{
        background: `linear-gradient(to right, var(--color-mist-100) ${value}%, var(--color-navy-700) ${value}%)`,
      }}
      className={`h-[5px] w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-[15px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-mist-100 [&::-moz-range-thumb]:size-[15px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-mist-100 ${className}`}
    />
  )
}

export default RangeSlider
