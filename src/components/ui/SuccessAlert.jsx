import { createPortal } from 'react-dom'
import { CheckCircle2 } from 'lucide-react'

export default function SuccessAlert({ message, onDismiss }) {
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
