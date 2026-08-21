import { createPortal } from 'react-dom'
import { CheckCircle2, X } from 'lucide-react'

export default function SuccessAlert({ message, onDismiss, variant = 'legacy', actionLabel, onAction }) {
  if (variant === 'user') {
    return createPortal(
      <div className="modal-overlay user-modal-overlay" onClick={onDismiss}>
        <div
          className="modal-card user-modal-card"
          style={{ width: 'min(420px, calc(100vw - 32px))' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="user-modal-card__header flex items-center justify-between gap-4">
            <div className="section-title" style={{ marginBottom: 0 }}>Success</div>
            <button type="button" className="icon-btn" aria-label="Close success popup" onClick={onDismiss}>
              <X size={16} />
            </button>
          </div>
          <div className="user-modal-card__content">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <span className="stat-icon tone-green" style={{ width: 48, height: 48, borderRadius: 999 }}>
                <CheckCircle2 size={26} />
              </span>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{message}</div>
            </div>
          </div>
          <div className="user-modal-card__footer">
            {actionLabel && onAction ? (
              <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={onAction}>
                {actionLabel}
              </button>
            ) : (
              <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={onDismiss}>
                Okay
              </button>
            )}
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div className="modal-overlay" onClick={onDismiss}>
      <div
        className="modal-card"
        style={{ width: 'min(360px, 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', padding: 'var(--space-4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="stat-icon tone-green" style={{ width: 48, height: 48, borderRadius: 999 }}>
          <CheckCircle2 size={26} />
        </span>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{message}</div>
        <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={onDismiss}>
          Okay
        </button>
      </div>
    </div>,
    document.body,
  )
}
