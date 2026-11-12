import { createPortal } from 'react-dom'
import { useMemo, useState } from 'react'
import { AlertCircle, CalendarCheck2, Check, CheckCircle2, Clock3, LayoutGrid, PhoneCall, Timer, WalletCards, X } from 'lucide-react'
import { buildAppointmentDaySlotModel, formatDate, normalizeAppointmentDate, parseKey } from '../../pages/user/appointments/bookingAstrologerData.js'

const STATUS_LABELS = {
  available: 'Available',
  booked: 'Booked',
  completed: 'Completed',
  closed: 'Closed',
}

const MAX_SLOTS_PER_DAY = 4

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

export default function AppointmentSlotsModal({
  astrologer,
  availability,
  appointments = [],
  price,
  durationMinutes,
  bufferMinutes,
  dateKey,
  currentUser,
  onClose,
  onContinue,
}) {
  const [selectedKeys, setSelectedKeys] = useState([])
  const [notice, setNotice] = useState('')

  // Calculate existing active bookings by this user on this day
  const existingBookedTodayCount = useMemo(() => {
    const uid = currentUser?.id || 'user-demo'
    return appointments.filter((item) => {
      const isUser = item.userId === uid || (currentUser?.role === 'user' && item.userId === 'user-demo')
      const matchesDate = normalizeAppointmentDate(item.date, item.dateIso) === dateKey
      const isNotCancelled = item.status !== 'Cancelled'
      return isUser && matchesDate && isNotCancelled
    }).length
  }, [appointments, currentUser, dateKey])

  const maxAllowedToday = Math.max(0, MAX_SLOTS_PER_DAY - existingBookedTodayCount)
  const isDailyLimitReachedAlready = existingBookedTodayCount >= MAX_SLOTS_PER_DAY

  const model = useMemo(
    () => buildAppointmentDaySlotModel({ availability, dateKey, astrologerId: astrologer.id, appointments, price, durationMinutes, bufferMinutes }),
    [availability, dateKey, astrologer.id, appointments, price, durationMinutes, bufferMinutes],
  )
  const summary = model.summary
  const slotPrice = Number(summary.price || price || 0)

  const selectedSlots = useMemo(
    () => model.slots.filter((slot) => selectedKeys.includes(slot.key)),
    [model.slots, selectedKeys],
  )
  const totalPrice = selectedSlots.length * slotPrice

  const toggleSlot = (slot) => {
    if (!slot.selectable) return
    if (isDailyLimitReachedAlready) {
      setNotice(`You have already booked the maximum limit of ${MAX_SLOTS_PER_DAY} slots for this day.`)
      return
    }

    const isAlreadySelected = selectedKeys.includes(slot.key)
    if (isAlreadySelected) {
      setSelectedKeys((prev) => prev.filter((k) => k !== slot.key))
      setNotice('')
    } else {
      if (selectedKeys.length >= maxAllowedToday) {
        setNotice(
          existingBookedTodayCount > 0
            ? `Daily limit reached: Maximum ${MAX_SLOTS_PER_DAY} slots can be booked per day. You already have ${existingBookedTodayCount} appointment${existingBookedTodayCount > 1 ? 's' : ''} on this date.`
            : `Daily limit reached: You can book a maximum of ${MAX_SLOTS_PER_DAY} slots per day. Deselect a slot to choose a different time.`,
        )
        return
      }
      setNotice('')
      setSelectedKeys((prev) => [...prev, slot.key])
    }
  }

  const continueBooking = () => {
    if (!selectedSlots.length) return
    onContinue(selectedSlots)
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

          {/* Daily Booking Policy & Slot Selection Limit Banner */}
          <div
            className={`appointment-slots-limit-banner${
              isDailyLimitReachedAlready
                ? ' is-blocked'
                : selectedSlots.length >= maxAllowedToday && maxAllowedToday > 0
                ? ' is-limit-reached'
                : ''
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="appointment-slots-limit-banner__left">
              <span className="appointment-slots-limit-banner__icon" aria-hidden="true">
                {isDailyLimitReachedAlready ? (
                  <AlertCircle size={16} />
                ) : selectedSlots.length >= maxAllowedToday && maxAllowedToday > 0 ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <CalendarCheck2 size={16} />
                )}
              </span>
              <div>
                <div className="appointment-slots-limit-banner__title">
                  <strong>Daily Booking Policy: Maximum 4 Slots per Day</strong>
                  <span className="appointment-slots-limit-banner__pill">
                    {selectedSlots.length} of {maxAllowedToday} Selected
                  </span>
                </div>
                <p className="appointment-slots-limit-banner__text">
                  {isDailyLimitReachedAlready
                    ? `You have already booked the maximum of ${MAX_SLOTS_PER_DAY} slots for this date (${formatDate(dateKey)}). Additional bookings on this day are not allowed.`
                    : existingBookedTodayCount > 0
                    ? `You have ${existingBookedTodayCount} existing appointment${existingBookedTodayCount > 1 ? 's' : ''} on this day. You can select up to ${maxAllowedToday} more slot${maxAllowedToday > 1 ? 's' : ''} (Maximum ${MAX_SLOTS_PER_DAY} slots per day).`
                    : selectedSlots.length >= MAX_SLOTS_PER_DAY
                    ? `Maximum daily limit of ${MAX_SLOTS_PER_DAY} slots reached. Click a selected slot to deselect if you wish to change times.`
                    : `You can book a maximum of ${MAX_SLOTS_PER_DAY} slots per day. Click available slots to select or deselect.`}
                </p>
              </div>
            </div>

            <div
              className="appointment-slots-limit-banner__slots-indicators"
              aria-label={`Slot selection tracker: ${selectedSlots.length} of ${MAX_SLOTS_PER_DAY} slots selected`}
            >
              {Array.from({ length: MAX_SLOTS_PER_DAY }).map((_, index) => {
                const isBookedPreviously = index < existingBookedTodayCount
                const isCurrentSelected =
                  index >= existingBookedTodayCount &&
                  index < existingBookedTodayCount + selectedSlots.length
                return (
                  <span
                    key={index}
                    className={`appointment-slots-limit-dot${
                      isBookedPreviously
                        ? ' is-booked'
                        : isCurrentSelected
                        ? ' is-selected'
                        : ''
                    }`}
                    title={
                      isBookedPreviously
                        ? `Slot ${index + 1}: Already booked`
                        : isCurrentSelected
                        ? `Slot ${index + 1}: Selected`
                        : `Slot ${index + 1}: Available`
                    }
                  />
                )
              })}
            </div>
          </div>

          {/* Warning notice when limit reached and user attempts to click another slot */}
          {notice && (
            <div className="appointment-slots-alert-notice" role="alert">
              <AlertCircle size={15} aria-hidden="true" />
              <span>{notice}</span>
            </div>
          )}

          <div className="appointment-slots-section-head">
            <div>
              <h3>Appointment Slots</h3>
            </div>
            <span className="appointment-slots-status-badge"><i aria-hidden="true" />{summary.remaining} Available</span>
          </div>

          <div className="appointment-slots-grid">
            {model.slots.map((slot) => {
              const selectedIndex = selectedKeys.indexOf(slot.key)
              const isSelected = selectedIndex !== -1
              const isBlockedByDailyLimit = !isSelected && (selectedKeys.length >= maxAllowedToday || isDailyLimitReachedAlready)
              const canSelect = slot.selectable && !isDailyLimitReachedAlready

              return (
                <button
                  type="button"
                  key={slot.key}
                  className={`appointment-slot-card is-${slot.status}${isSelected ? ' is-selected' : ''}${isBlockedByDailyLimit ? ' is-limit-blocked' : ''}`}
                  disabled={!canSelect}
                  aria-pressed={isSelected}
                  aria-label={`${slot.timeLabel} to ${slot.endLabel}, ${isSelected ? `Selected slot ${selectedIndex + 1}` : STATUS_LABELS[slot.status]}`}
                  onClick={() => toggleSlot(slot)}
                >
                  <span className="appointment-slot-card__range"><Clock3 size={13} aria-hidden="true" />{slot.timeLabel} – {slot.endLabel}</span>
                  <span className="appointment-slot-card__status"><i aria-hidden="true" />{isSelected ? `Selected (#${selectedIndex + 1})` : STATUS_LABELS[slot.status]}</span>
                  {isSelected && <span className="appointment-slot-card__check" aria-hidden="true"><Check size={13} /></span>}
                  {isSelected && selectedSlots.length > 1 && (
                    <span className="appointment-slot-card__order" aria-hidden="true">
                      #{selectedIndex + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <p className="appointment-slots-hint">
            {summary.remaining ? `${summary.remaining} of ${summary.total} slots still open on this date. Maximum 4 slots per day.` : 'All slots on this date are booked or closed.'}
          </p>
        </div>

        <div className="appointment-slots-modal__foot">
          <div className="appointment-slots-modal__meta-group">
            {selectedSlots.length > 0 ? (
              <p className="appointment-slots-modal__meta">
                <strong>Selected {selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''}</strong>
                <span> · </span>
                <span>₹{totalPrice.toLocaleString('en-IN')}{selectedSlots.length > 1 ? ` (${selectedSlots.length} × ₹${slotPrice.toLocaleString('en-IN')})` : ''}</span>
                <span> · </span>
                <span className="appointment-slots-modal__meta-limit">Max 4 slots/day</span>
              </p>
            ) : (
              <p className="appointment-slots-modal__meta">
                {isDailyLimitReachedAlready
                  ? 'Daily booking limit reached (4/4 slots booked)'
                  : `Select up to ${maxAllowedToday} slot${maxAllowedToday > 1 ? 's' : ''} on this day · Maximum 4 slots per day`}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedSlots.length}
            onClick={continueBooking}
          >
            <CalendarCheck2 size={15} aria-hidden="true" />
            Continue with Booking {selectedSlots.length > 0 ? `(${selectedSlots.length} Slot${selectedSlots.length > 1 ? 's' : ''})` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
