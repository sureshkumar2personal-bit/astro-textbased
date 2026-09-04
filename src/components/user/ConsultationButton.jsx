import { Link } from 'react-router-dom'

export default function ConsultationButton({ label, icon: Icon, to, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) {
  const cls =
    variant === 'secondary'
      ? 'bg-white text-[color:var(--primary)] border border-[color:var(--surface-border)] hover:border-[color:var(--secondary)]'
      : 'bg-[linear-gradient(135deg,var(--primary),var(--primary-light))] text-white shadow-[0_12px_24px_rgba(109,40,217,0.18)] hover:shadow-[0_16px_30px_rgba(109,40,217,0.24)]'

  const content = (
    <>
      {Icon && <Icon size={15} />}
      <span>{label}</span>
    </>
  )

  const baseClass = `inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${cls}${className ? ` ${className}` : ''}`

  if (to) {
    return (
      <Link to={to} className={baseClass}>
        {content}
      </Link>
    )
  }

  return (
    <button type={type} className={baseClass} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  )
}

