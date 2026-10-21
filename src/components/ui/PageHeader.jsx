import { useEffect } from 'react'
import BackButton from '../BackButton.jsx'
import { useGlobalHeaderActions } from '../../contexts/GlobalHeaderActionsContext.jsx'

export default function PageHeader({ eyebrow, title, subtitle, showBack = false, backTo, backIcon, backLabel, backOnClick, actions, className = '' }) {
  const global = useGlobalHeaderActions()
  const isGenericPortalEyebrow = ['User portal', 'USER PORTAL', 'Astrologer', 'Astrologer portal', 'ASTROLOGER PORTAL', 'Astrologer workspace', 'Astrologer Workspace'].includes(eyebrow)
  const showEyebrow = eyebrow && (!isGenericPortalEyebrow || title === 'Ask a Question' || title === 'Edit Question')

  useEffect(() => {
    if (global?.setHasPageHeader) {
      global.setHasPageHeader(true)
      return () => global.setHasPageHeader(false)
    }
  }, [global])

  return (
    <>
      {showBack && (
        <div className="page-header-back">
          <BackButton to={backTo} label={backLabel} icon={backIcon} onBack={backOnClick} />
        </div>
      )}
      <div className={`page-header-row${className ? ` ${className}` : ''}`}>
        <div className="page-header-title">
          {showEyebrow && <div className="page-eyebrow">{eyebrow}</div>}
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="muted" style={{ marginTop: 8, maxWidth: 640 }}>{subtitle}</p>}
        </div>
        <div className="page-header-actions">
          {actions}
          {global?.actions}
        </div>
      </div>
    </>
  )
}
