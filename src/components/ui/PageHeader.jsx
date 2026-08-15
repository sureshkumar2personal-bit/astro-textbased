import BackButton from '../BackButton.jsx'

export default function PageHeader({ eyebrow, title, subtitle, showBack = false, backTo, backIcon, actions, className = '' }) {
  return (
    <div className={`page-header-row${className ? ` ${className}` : ''}`}>
      <div>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="muted" style={{ marginTop: 8, maxWidth: 640 }}>{subtitle}</p>}
      </div>
      <div className="page-header-actions">
        {actions}
        {showBack && <BackButton to={backTo} icon={backIcon} />}
      </div>
    </div>
  )
}
