export default function StatCard({ icon: Icon, value, label, tone = 'violet', badge, className = '' }) {
  return (
    <div className={`stat-card${className ? ` ${className}` : ''}`}>
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
