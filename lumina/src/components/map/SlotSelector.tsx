import type { SlotId, TimeSlot } from '../../lib/geoApi'

type SlotSelectorProps = {
  slots: TimeSlot[]
  value: SlotId
  onChange: (slot: SlotId) => void
  className?: string
}

/**
 * Pemilih slot waktu (REQ-F2-02: peta diperbarui mengikuti slot tanpa memuat
 * ulang halaman). Hanya tiga slot tervalidasi survei yang ditawarkan — slot
 * lain tidak punya dasar kalibrasi, jadi tidak disediakan sama sekali.
 */
function SlotSelector({ slots, value, onChange, className = '' }: SlotSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Slot waktu"
      className={`flex gap-1 rounded-[12px] border border-navy-700/60 bg-navy-950/90 p-1 backdrop-blur-md ${className}`}
    >
      {slots.map((slot) => (
        <button
          key={slot.id}
          type="button"
          onClick={() => onChange(slot.id)}
          aria-pressed={value === slot.id}
          className={`rounded-[9px] px-3 py-1.5 text-[12px] font-medium transition-colors ${
            value === slot.id
              ? 'bg-brand-cyan text-navy-900'
              : 'text-mist-200 hover:bg-navy-800 hover:text-white'
          }`}
        >
          {slot.label}
        </button>
      ))}
    </div>
  )
}

export default SlotSelector
