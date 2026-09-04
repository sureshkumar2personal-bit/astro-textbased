export default function AvailabilityBadge({ status, className = '' }) {
  const normalized = String(status || '').toLowerCase()
  const toneClass =
    normalized === 'available'
      ? 'bg-[color:var(--green-100)] text-[color:var(--green-600)] border-[color:rgba(16,185,129,0.2)]'
      : normalized === 'busy'
        ? 'bg-[color:var(--amber-100)] text-[color:var(--amber-600)] border-[color:rgba(245,158,11,0.18)]'
        : 'bg-[color:var(--neutral-bg)] text-[color:var(--text-secondary)] border-[color:var(--surface-border)]'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}${className ? ` ${className}` : ''}`}>
      <span className={`h-2 w-2 rounded-full ${normalized === 'available' ? 'bg-[color:var(--green-500)]' : normalized === 'busy' ? 'bg-[color:var(--amber-500)]' : 'bg-[color:var(--muted)]'}`} />
      {status}
    </span>
  )
}

