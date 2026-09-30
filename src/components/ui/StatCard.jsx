export default function StatCard({ icon: Icon, value, label, tone = 'violet', badge, className = '', onClick }) {
  return (
    <div
      className={`stat-card${className ? ` ${className}` : ''}${onClick ? ' is-clickable' : ''}`}
      onClick={onClick}
      onKeyDown={onClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {Icon && (
        <div className={`stat-icon tone-${tone}`}>
          <Icon size={20} />
        </div>
      )}
      <div className="stat-card-body">
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
      </div>
      {badge}
    </div>
  )
}
