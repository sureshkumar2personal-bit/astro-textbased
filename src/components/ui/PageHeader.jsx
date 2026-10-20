import BackButton from '../BackButton.jsx'

export default function PageHeader({ eyebrow, title, subtitle, showBack = false, backTo, backIcon, backLabel, backOnClick, actions, className = '' }) {
  const isGenericPortalEyebrow = ['User portal', 'USER PORTAL', 'Astrologer', 'Astrologer portal', 'ASTROLOGER PORTAL', 'Astrologer workspace', 'Astrologer Workspace'].includes(eyebrow)
  const showEyebrow = eyebrow && (!isGenericPortalEyebrow || title === 'Ask a Question' || title === 'Edit Question')
  return (
    <div className={`page-header-row${className ? ` ${className}` : ''}`}>
      <div>
        {showEyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="muted" style={{ marginTop: 8, maxWidth: 640 }}>{subtitle}</p>}
      </div>
      <div className="page-header-actions">
        {actions}
        {showBack && <BackButton to={backTo} label={backLabel} icon={backIcon} onBack={backOnClick} />}
      </div>
    </div>
  )
}
