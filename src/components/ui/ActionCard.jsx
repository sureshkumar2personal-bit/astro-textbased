import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ActionCard({ icon: Icon, title, description, to, onClick, className = '' }) {
  const content = (
    <>
      {Icon && (
        <div className="action-card-icon">
          <Icon size={20} />
        </div>
      )}
      <div className="action-card-body">
        <div className="action-card-title">{title}</div>
        {description && <div className="action-card-desc">{description}</div>}
      </div>
      <ArrowRight size={18} className="action-card-arrow" />
    </>
  )

  const cls = `action-card${className ? ` ${className}` : ''}`

  if (to) {
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className={cls} onClick={onClick}>
      {content}
    </button>
  )
}
