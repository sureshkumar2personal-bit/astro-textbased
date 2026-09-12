const STATUS_TONES = {
  booked: 'badge-appointment-upcoming',
  confirmed: 'badge-appointment-upcoming',
  completed: 'badge-appointment-completed',
  rescheduled: 'badge-appointment-rescheduled',
  refunded: 'badge-appointment-refunded',
  'cancelled': 'badge-appointment-cancelled',
  pending: 'badge-amber',
  analysed: 'badge-blue',
  'in progress': 'badge-violet',
  answered: 'badge-green',
  active: 'badge-green',
  resolved: 'badge-green',
  closed: 'badge-gray',
  disputed: 'badge-red',
  open: 'badge-red',
  'in review': 'badge-violet',
  'cancelled by astrologer': 'badge-red',
  'cancelled by user': 'badge-red',
  'no-show': 'badge-gray',
  'auto-cancelled': 'badge-red',
}

const STATUS_TONES_STARTS_WITH = [
  { prefix: 'cancelled by', tone: 'badge-red' },
  { prefix: 'no-show', tone: 'badge-gray' },
  { prefix: 'auto-cancelled', tone: 'badge-red' },
]

function toneFor(label) {
  const clean = String(label).replace(/^[^\w]+/, '').trim().toLowerCase()
  if (STATUS_TONES[clean]) return STATUS_TONES[clean]
  for (const entry of STATUS_TONES_STARTS_WITH) {
    if (clean.startsWith(entry.prefix)) return entry.tone
  }
  return STATUS_TONES[clean] || 'badge-violet'
}

function appointmentToneFor(label) {
  const clean = String(label).replace(/^[^\w]+/, '').trim().toLowerCase()
  if (clean === 'booked' || clean === 'confirmed' || clean === 'pending' || clean === 'upcoming') return 'badge-appointment-upcoming'
  if (clean === 'completed') return 'badge-appointment-completed'
  if (clean === 'rescheduled') return 'badge-appointment-rescheduled'
  if (clean === 'refunded') return 'badge-appointment-refunded'
  if (clean === 'cancelled' || clean.startsWith('cancelled by') || clean === 'auto-cancelled') return 'badge-appointment-cancelled'
  return null
}

export default function StatusBadge({ label, className = '' }) {
  const clean = String(label).replace(/^[^\w]+/, '').trim() || 'Not available'
  const appointmentTone = appointmentToneFor(clean)
  const tone = appointmentTone || toneFor(clean)
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
        tone === 'badge-appointment-upcoming' ? 'border border-[#F59E0B] bg-[#FFFBEB] text-[color:var(--ink)]' : '',
        tone === 'badge-appointment-completed' ? 'border border-[#10B981] bg-[#ECFDF5] text-[color:var(--ink)]' : '',
        tone === 'badge-appointment-cancelled' ? 'border border-[#EF4444] bg-[#FEF2F2] text-[color:var(--ink)]' : '',
        tone === 'badge-appointment-rescheduled' ? 'border border-[#F97316] bg-[#FFF7ED] text-[color:var(--ink)]' : '',
        tone === 'badge-appointment-refunded' ? 'border border-[#94A3B8] bg-[#F8FAFC] text-[color:var(--ink)]' : '',
        tone === 'badge-amber' ? 'bg-[color:var(--warning-bg)] text-[color:var(--amber-600)]' : '',
        tone === 'badge-blue' ? 'bg-[color:var(--sky-bg)] text-[color:var(--sky-600)]' : '',
        tone === 'badge-green' ? 'bg-[color:var(--success-bg)] text-[color:var(--green-600)]' : '',
        tone === 'badge-red' ? 'bg-[color:var(--danger-bg)] text-[color:var(--red-600)]' : '',
        tone === 'badge-gray' ? 'bg-[color:var(--neutral-bg)] text-[color:var(--muted)]' : '',
        tone === 'badge-violet' ? 'bg-[color:var(--primary-bg)] text-[color:var(--primary)]' : '',
        className,
      ].join(' ')}
    >
      <span className={[
        'h-[7px] w-[7px] rounded-full',
        tone === 'badge-appointment-upcoming' ? 'bg-[#F59E0B]' : '',
        tone === 'badge-appointment-completed' ? 'bg-[#10B981]' : '',
        tone === 'badge-appointment-cancelled' ? 'bg-[#EF4444]' : '',
        tone === 'badge-appointment-rescheduled' ? 'bg-[#F97316]' : '',
        tone === 'badge-appointment-refunded' ? 'bg-[#94A3B8]' : '',
        !appointmentTone ? 'bg-current' : '',
      ].join(' ')} />
      {clean}
    </span>
  )
}
