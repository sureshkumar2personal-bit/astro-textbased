const STATUS_TONES = {
  pending: 'badge-amber',
  'in progress': 'badge-violet',
  answered: 'badge-green',
  active: 'badge-green',
  resolved: 'badge-green',
  closed: 'badge-gray',
  disputed: 'badge-red',
  open: 'badge-red',
  'in review': 'badge-violet',
}

export default function StatusBadge({ label, className = '' }) {
  const clean = label.replace(/^[^\w]+/, '').trim()
  const tone = STATUS_TONES[clean.toLowerCase()] || 'badge-violet'
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
        tone === 'badge-amber' ? 'bg-[color:var(--warning-bg)] text-[color:var(--amber-600)]' : '',
        tone === 'badge-blue' ? 'bg-[color:var(--sky-bg)] text-[color:var(--sky-600)]' : '',
        tone === 'badge-green' ? 'bg-[color:var(--success-bg)] text-[color:var(--green-600)]' : '',
        tone === 'badge-red' ? 'bg-[color:var(--danger-bg)] text-[color:var(--red-600)]' : '',
        tone === 'badge-gray' ? 'bg-[color:var(--neutral-bg)] text-[color:var(--muted)]' : '',
        tone === 'badge-violet' ? 'bg-[color:var(--primary-bg)] text-[color:var(--primary)]' : '',
        className,
      ].join(' ')}
    >
      <span className="h-[7px] w-[7px] rounded-full bg-current" />
      {clean}
    </span>
  )
}
