import { useState } from 'react'
import { CalendarDays, ChevronRight, Hash, Languages, NotebookPen, Phone, Shield, UserRound, Wallet, XCircle, AlertCircle } from 'lucide-react'
import { getAppointmentDisplayStatus } from '../../utils/appointments.js'
import { mergeAstrologerNotes } from '../../data/mockAstrologerNotes.js'
import { UserHoroscopeSection, ConsultationNotesContent, mapConsultationForUser } from './UserAppointmentDetailsDrawer.jsx'

function formatBookingDate(appointment) {
  if (appointment.bookingDate) return appointment.bookingDate
  if (appointment.bookedAt) {
    try {
      return new Date(appointment.bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return '—'
    }
  }
  return '—'
}

export default function UserAppointmentExpandedDetails({
  appointment,
  consultation,
  currentUser,
  onBookAgain,
  onUpdatePariharamProgress,
}) {
  const [showNotes, setShowNotes] = useState(true)

  if (!appointment) return null

  const displayStatus = getAppointmentDisplayStatus(appointment)
  const isCompleted = displayStatus === 'Completed'
  const isCancelled = displayStatus === 'Cancelled'
  const isRescheduled = displayStatus === 'Rescheduled'

  const consultationWithFallback = isCompleted ? mergeAstrologerNotes(consultation, appointment) : null
  const mappedConsultation = consultationWithFallback ? mapConsultationForUser(consultationWithFallback, appointment) : null
  const hasSharedNotes = Boolean(mappedConsultation && (
    mappedConsultation.summary ||
    mappedConsultation.instructions.length ||
    mappedConsultation.attachments.length ||
    mappedConsultation.history.length ||
    consultationWithFallback?.atonement
  ))

  const customerName = appointment.customerName || currentUser?.name || 'Priya V.'
  const phone = appointment.customerPhone || currentUser?.phone || 'Not available'
  const topic = appointment.topic || 'General Guidance'
  const language = appointment.language || appointment.lang || 'English'
  const bookingDate = formatBookingDate(appointment)
  const paymentMethod = appointment.paymentMethod || 'Online (UPI / Card)'
  const transactionId = appointment.transactionId || (appointment.orderId ? `TXN-${String(appointment.orderId).replace(/^[#a-z-]+/i, '')}` : '—')

  return (
    <div className="user-appointment-expanded" onClick={(e) => e.stopPropagation()}>
      {/* Non-repeated consultation meta details */}
      <div className="user-appointment-expanded__grid">
        <div className="user-appointment-expanded__item">
          <span className="user-appointment-expanded__label"><Hash size={11} /> Topic</span>
          <strong className="user-appointment-expanded__value">{topic}</strong>
        </div>

        <div className="user-appointment-expanded__item">
          <span className="user-appointment-expanded__label"><Languages size={11} /> Language</span>
          <strong className="user-appointment-expanded__value">{language}</strong>
        </div>

        <div className="user-appointment-expanded__item">
          <span className="user-appointment-expanded__label"><UserRound size={11} /> Customer</span>
          <strong className="user-appointment-expanded__value">{customerName}</strong>
        </div>

        <div className="user-appointment-expanded__item">
          <span className="user-appointment-expanded__label"><Phone size={11} /> Phone</span>
          <strong className="user-appointment-expanded__value">{phone}</strong>
        </div>

        <div className="user-appointment-expanded__item">
          <span className="user-appointment-expanded__label"><CalendarDays size={11} /> Booked On</span>
          <strong className="user-appointment-expanded__value">{bookingDate}</strong>
        </div>

        <div className="user-appointment-expanded__item">
          <span className="user-appointment-expanded__label"><Wallet size={11} /> Payment Mode</span>
          <strong className="user-appointment-expanded__value">{paymentMethod}</strong>
        </div>

        <div className="user-appointment-expanded__item">
          <span className="user-appointment-expanded__label"><Hash size={11} /> Transaction ID</span>
          <strong className="user-appointment-expanded__value" style={{ fontFamily: 'monospace' }}>{transactionId}</strong>
        </div>
      </div>

      {/* Cancellation / Rescheduled alerts if applicable */}
      {isCancelled && (
        <div className="user-appointment-expanded__alert user-appointment-expanded__alert--cancelled">
          <XCircle size={15} />
          <div>
            <strong>Appointment Cancelled</strong>
            <span>{appointment.cancellationReason || appointment.reason || 'This consultation was cancelled. Any refund has been credited.'}</span>
          </div>
        </div>
      )}

      {isRescheduled && (
        <div className="user-appointment-expanded__alert user-appointment-expanded__alert--rescheduled">
          <AlertCircle size={15} />
          <div>
            <strong>Appointment Rescheduled</strong>
            <span>{appointment.rescheduleReason || 'This consultation was updated to a new time slot.'}</span>
          </div>
        </div>
      )}

      {/* Horoscope section */}
      <UserHoroscopeSection appointment={appointment} />

      {/* Astrologer Notes (for Completed consultations) */}
      {isCompleted && (
        <div className="user-appointment-expanded__notes-wrapper">
          <button
            type="button"
            className="apt-user-astrologer-notes-option"
            aria-expanded={showNotes}
            onClick={() => setShowNotes((visible) => !visible)}
          >
            <span className="apt-user-astrologer-notes-option-icon"><NotebookPen size={17} /></span>
            <span className="apt-user-astrologer-notes-option-copy">
              <strong>Astrologer Consultation Notes</strong>
              <small>Notes, remedies and guidance shared by your astrologer</small>
            </span>
            <ChevronRight size={18} className={`apt-user-astrologer-notes-option-arrow${showNotes ? ' is-open' : ''}`} />
          </button>

          {showNotes && (
            <section className="apt-detail-card apt-user-astrologer-notes">
              <div className="apt-private-notes-head">
                <NotebookPen size={15} /> Astrologer Notes
                <span className="apt-private-notes-private"><Shield size={11} /> Only you can see</span>
              </div>
              <div className="apt-user-astrologer-notes-content">
                {hasSharedNotes ? (
                  <ConsultationNotesContent
                    mapped={mappedConsultation}
                    appointmentId={appointment.id}
                    appointment={appointment}
                    currentUser={currentUser}
                    onOpenAtonement={() => {}}
                    onUpdateProgress={onUpdatePariharamProgress ? (pariharamId, dayId, dateIso, dayNumber, completed) => onUpdatePariharamProgress(appointment.id, pariharamId, dayId, dateIso, dayNumber, completed) : undefined}
                  />
                ) : (
                  <p className="apt-user-astrologer-notes-empty">No astrologer notes have been shared for this appointment yet.</p>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Book Again action for completed consultations */}
      {isCompleted && appointment.astrologerId && onBookAgain && (
        <div className="user-appointment-expanded__actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onBookAgain(appointment)}>
            Book Again
          </button>
        </div>
      )}
    </div>
  )
}
