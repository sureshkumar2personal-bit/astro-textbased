import { createPortal } from 'react-dom'
import ConsultationRatingView from './ConsultationRatingView.jsx'

export default function ConsultationRatingModal({ session, astrologer, onClose, onSubmitted }) {
  if (!session) return null

  return createPortal(
    <div
      className="modal-overlay user-modal-overlay consultation-rating-overlay"
      style={{
        zIndex: 12000,
        display: 'grid',
        placeItems: 'center',
        padding: '16px',
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Rate your astrologer consultation"
    >
      <ConsultationRatingView
        session={session}
        astrologer={astrologer}
        onClose={onClose}
        onSubmitted={onSubmitted}
        isModal
      />
    </div>,
    document.body,
  )
}
