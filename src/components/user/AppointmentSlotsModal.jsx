import { createPortal } from 'react-dom'
import { useMemo, useState } from 'react'
import { CalendarCheck2, Check, CheckCircle2, Clock3, LayoutGrid, PhoneCall, Timer, WalletCards, X } from 'lucide-react'
import { buildAppointmentDaySlotModel, formatDate, parseKey } from '../../pages/user/appointments/bookingAstrologerData.js'

const STATUS_LABELS = {
  available: 'Available',
  booked: 'Booked',
  completed: 'Completed',
  closed: 'Closed',
}

const SUMMARY_CARDS = [
  { key: 'duration', label: 'Duration', icon: Timer },
  { key: 'price', label: 'Appointment Price', icon: WalletCards },
  { key: 'available', label: 'Available Slots', icon: LayoutGrid },
  { key: 'status', label: 'Appointment Status', icon: CheckCircle2 },
  { key: 'mode', label: 'Appointment Mode', icon: PhoneCall },
]

function summaryValue(summary, key) {
  if (key === 'price') return `₹${summary.price.toLocaleString('en-IN')}`
  if (key === 'duration') return summary.duration
  if (key === 'status') return summary.status
  if (key === 'mode') return summary.mode
  return String(summary[key] ?? 0)
}

export default function AppointmentSlotsModal({ astrologer, availability, appointments = [], price, dateKey, onClose, onContinue }) {
  const [selectedKey, setSelectedKey] = useState('')

  const model = useMemo(
    () => buildAppointmentDaySlotModel({ availability, dateKey, astrologerId: astrologer.id, appointments, price }),
    [availability, dateKey, astrologer.id, appointments, price],
  )
  const summary = model.summary
  const selectedSlot = model.slots.find((slot) => slot.key === selectedKey) || null

  const continueBooking = () => {
    if (!selectedSlot) return
    onContinue(selectedSlot)
  }

  return createPortal(
    <div className="modal-overlay user-modal-overlay appointment-slots-overlay" onClick={onClose}>
      <div className="appointment-slots-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Appointment slots for ${astrologer.name}`}>
        <div className="appointment-slots-modal__head">
          <div className="appointment-slots-modal__heading">
            <span className="appointment-slots-modal__eyebrow">Appointment Slots</span>
            <strong>{astrologer.name}</strong>
            <p>{parseKey(dateKey).toLocaleDateString('en-US', { weekday: 'long' })}, {formatDate(dateKey)}</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close appointment slots" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="appointment-slots-modal__body">
          <div className="appointment-slots-summary">
            {SUMMARY_CARDS.map(({ key, label, icon: Icon }) => {
              const active = key === 'status'
              return (
                <div className="appointment-slots-summary__card" key={key}>
                  <span className={`appointment-slots-summary__value${active ? ' is-active' : ''}`}>{active && <i className="appointment-slots-summary__dot" aria-hidden="true" />}{summaryValue(summary, key)}</span>
                  <span className="appointment-slots-summary__label"><Icon size={12} aria-hidden="true" />{label}</span>
                </div>
              )
            })}
          </div>

          <div className="appointment-slots-section-head">
            <div>
              <h3>Appointment Slots</h3>
              <p>Select an Available slot to continue booking.</p>
            </div>
            <span className="appointment-slots-status-badge"><i aria-hidden="true" />Available</span>
          </div>

          <div className="appointment-slots-grid">
            {model.slots.map((slot) => {
              const isSelected = slot.key === selectedKey
              return (
                <button
                  type="button"
                  key={slot.key}
                  className={`appointment-slot-card is-${slot.status}${isSelected ? ' is-selected' : ''}`}
                  disabled={!slot.selectable}
                  aria-pressed={isSelected}
                  aria-label={`${slot.timeLabel} to ${slot.endLabel}, ${STATUS_LABELS[slot.status]}`}
                  onClick={() => setSelectedKey(slot.key)}
                >
                  <span className="appointment-slot-card__range"><Clock3 size={13} aria-hidden="true" />{slot.timeLabel} – {slot.endLabel}</span>
                  <span className="appointment-slot-card__status"><i aria-hidden="true" />{isSelected && slot.selectable ? 'Selected' : STATUS_LABELS[slot.status]}</span>
                  {isSelected && <span className="appointment-slot-card__check" aria-hidden="true"><Check size={13} /></span>}
                </button>
              )
            })}
          </div>

          <p className="appointment-slots-hint">{summary.remaining ? `${summary.remaining} of ${summary.total} slots still open on this date.` : 'All slots on this date are booked or closed.'}</p>
        </div>

        <div className="appointment-slots-modal__foot">
          <p className="appointment-slots-modal__meta">
            {selectedSlot ? `Selected slot · ${selectedSlot.timeLabel} – ${selectedSlot.endLabel} · ₹${summary.price.toLocaleString('en-IN')}` : 'Select an Available slot to continue.'}
          </p>
          <button type="button" className="btn btn-primary" disabled={!selectedSlot} onClick={continueBooking}>
            <CalendarCheck2 size={15} aria-hidden="true" />
            Continue with Booking
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}