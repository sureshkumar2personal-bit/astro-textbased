import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, Check, ChevronLeft, ChevronRight, CircleAlert, Clock3, Copy, PhoneCall, Sparkles, WalletCards, X } from 'lucide-react'

const PRICE = 499
const TYPE = 'Audio Call'

function keyFor(date) {
  const value = new Date(date)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function parseKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(value) {
  return parseKey(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(value) {
  const [clock, meridiem] = value.split(' ')
  const [hours, minutes] = clock.split(':').map(Number)
  const end = new Date(2026, 0, 1, (hours % 12) + (meridiem === 'PM' ? 12 : 0), minutes + 30)
  return `${value} – ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}

function daysFor(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
}

function weekFor(value) {
  const date = value ? parseKey(value) : new Date()
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
  return Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
}

export default function AppointmentBookingModal({ astrologer, availability = {}, appointments = [], userWallet, actions, routes, onClose }) {
  const navigate = useNavigate()
  const today = keyFor(new Date())
  const firstDate = useMemo(() => Object.keys(availability).filter((date) => date >= today).sort()[0] || '', [availability, today])
  const [step, setStep] = useState('form')
  const [view, setView] = useState('month')
  const [month, setMonth] = useState(() => firstDate ? new Date(parseKey(firstDate).getFullYear(), parseKey(firstDate).getMonth(), 1) : new Date(2026, 7, 1))
  const [date, setDate] = useState(firstDate)
  const [time, setTime] = useState('')
  const [details, setDetails] = useState({ question: '', dob: '', birthTime: '', birthPlace: '', rashi: '', nakshatra: '' })
  const [paymentMethod, setPaymentMethod] = useState('Wallet')
  const [appointmentId, setAppointmentId] = useState(null)
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const selected = date && time ? [{ key: `${date}|${time}`, date, time, duration: '30 Minutes', type: TYPE, package: '30 Min Consultation', price: PRICE }] : []
  const booked = useMemo(() => new Set(appointments.filter((item) => item.astrologerId === astrologer.id).map((item) => `${item.date}|${item.time}`)), [appointments, astrologer.id])
  const days = daysFor(month)
  const amount = selected.reduce((sum, item) => sum + item.price, 0)
  const balance = Number(userWallet?.balance || 0)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  const chooseSlot = (nextDate, nextTime) => {
    const slotKey = `${nextDate}|${nextTime}`
    if (booked.has(slotKey)) return
    setDate(nextDate)
    setTime(time === nextTime && date === nextDate ? '' : nextTime)
  }

  const pay = () => {
    if (!selected.length || paymentMethod !== 'Wallet' || balance < amount) return
    const group = `#BOOK-${date.replaceAll('-', '')}-001`
    const id = actions.bookAppointment({ astrologerId: astrologer.id, astrologerName: astrologer.name, type: TYPE, date: formatDate(date), time, price: PRICE, duration: '30 Minutes', package: '30 Min Consultation', bookingGroup: group, bookingSequence: 1, questionDetails: details.question ? details : null })
    actions.debitUserWallet({ amount, astrologer: astrologer.name, duration: '1 appointment', service: 'Appointment', transactionId: `appointment-${group}` })
    setAppointmentId(id)
    setStep('success')
  }

  return createPortal(
    <div className="modal-overlay user-modal-overlay" onClick={onClose}>
      <div className={`modal-card user-modal-card appointment-booking-modal appointment-booking-modal--${step}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-card__header user-modal-card__header appointment-booking-modal__header flex items-start justify-between gap-4">
          <div className="appointment-booking-heading"><div className="appointment-booking-avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><div className="section-title" style={{ marginBottom: 3 }}>{step === 'success' ? 'Appointment Confirmed' : 'Book Appointment'}</div><strong>{astrologer.name}</strong><span>{astrologer.specialization} · {TYPE}</span></div></div>
          <button type="button" className="icon-btn" aria-label="Close booking popup" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-card__content user-modal-card__content">
          {step === 'form' && <>
            <div className="appointment-view-tabs">{['day', 'week', 'month', 'year'].map((name) => <button type="button" key={name} className={view === name ? 'is-active' : ''} onClick={() => setView(name)}>{name[0].toUpperCase() + name.slice(1)}</button>)}</div>
            <div className="availability-calendar appointment-calendar-extended">
              <div className="availability-calendar__header"><button type="button" className="icon-btn" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button><strong>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><div className="appointment-calendar-nav"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setMonth(new Date(2026, 7, 1))}>Today</button><button type="button" className="icon-btn" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button></div></div>
              {view === 'month' && <><div className="availability-calendar__weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div><div className="availability-calendar__days appointment-month-days">{days.map((day) => { const dayKey = keyFor(day); const available = Boolean(availability[dayKey]?.length) && dayKey >= today; return <button type="button" key={dayKey} className={`${available ? 'is-available' : ''}${date === dayKey ? ' is-selected' : ''}${day.getMonth() !== month.getMonth() ? ' is-outside' : ''}`} disabled={!available} onClick={() => { setDate(dayKey); setTime(''); setView('day') }}><b>{day.getDate()}</b>{available && <small>● {availability[dayKey].length} slots</small>}</button> })}</div></>}
              {view === 'year' && <div className="appointment-year-grid">{Array.from({ length: 12 }, (_, index) => { const selectedMonth = new Date(month.getFullYear(), index, 1); const count = Object.entries(availability).filter(([key]) => key.startsWith(`${month.getFullYear()}-${String(index + 1).padStart(2, '0')}`)).reduce((sum, [, slots]) => sum + slots.length, 0); return <button type="button" key={index} onClick={() => { setMonth(selectedMonth); setView('month') }}><strong>{selectedMonth.toLocaleDateString('en-US', { month: 'short' })}</strong><span>{count ? `${count} slots` : 'No availability'}</span></button> })}</div>}
              {view === 'week' && <div className="appointment-week-grid"><div className="appointment-week-header"><span>Time</span>{weekFor(date).map((day) => <strong key={keyFor(day)}>{day.toLocaleDateString('en-US', { weekday: 'short' })}<small>{day.getDate()}</small></strong>)}</div>{[...new Set(weekFor(date).flatMap((day) => availability[keyFor(day)] || []))].map((slot) => <div className="appointment-week-row" key={slot}><span>{slot}</span>{weekFor(date).map((day) => { const dayKey = keyFor(day); const available = (availability[dayKey] || []).includes(slot) && dayKey >= today; return available ? <button type="button" key={dayKey} className={`appointment-slot-button ${date === dayKey && time === slot ? 'is-selected' : ''}`} onClick={() => chooseSlot(dayKey, slot)}><span>{date === dayKey && time === slot && <Check size={13} />} {slot}</span></button> : <span className="appointment-week-unavailable" key={dayKey}>—</span> })}</div>)}</div>}
              {view === 'day' && <div className="appointment-timeline"><div className="appointment-booking-section-label">Day timeline {date && <span className="muted">· {formatDate(date)}</span>}</div>{date && availability[date]?.length ? availability[date].map((slot) => { const isBooked = booked.has(`${date}|${slot}`); return <button type="button" key={slot} className={`appointment-slot-button ${time === slot ? 'is-selected' : ''}`} disabled={isBooked} onClick={() => chooseSlot(date, slot)}><span>{time === slot && <Check size={13} />} {slot}</span><small>{isBooked ? 'Booked' : `Available · 30 Minutes · ₹${PRICE}`}</small></button> }) : <p className="availability-empty">Select an available date first.</p>}</div>}
            </div>
            {view !== 'day' && view !== 'year' && <><div className="appointment-booking-section-label">Available Time Slots {date && <span className="muted">· {formatDate(date)}</span>}</div><div className="availability-slots">{date && availability[date]?.length ? <div>{availability[date].map((slot) => { const isBooked = booked.has(`${date}|${slot}`); return <button type="button" key={slot} className={time === slot ? 'is-selected' : ''} disabled={isBooked} onClick={() => chooseSlot(date, slot)}><span>{time === slot && <Check size={13} />} {formatTime(slot)}</span><small>{isBooked ? 'Booked' : `30 Minutes · ${TYPE} · ₹${PRICE}`}</small></button> })}</div> : <p className="availability-empty">Select an available date to see time slots.</p>}</div></>}
            <div className="appointment-selected-panel">{selected.length ? <div className="appointment-selected-row"><Check size={14} /><span><b>{formatDate(date)} · {time}</b><small>30 min · Audio Call · ₹{PRICE}</small></span></div> : <div className="appointment-selected-empty"><strong>No slot selected.</strong><span>Choose an available time slot to continue.</span></div>}</div>
            {notice && <div className="appointment-booking-notice" role="status"><CircleAlert size={15} /> {notice}</div>}
          </>}
          {step === 'details' && <div className="appointment-details-form"><div><div className="appointment-booking-section-label">Consultation Details</div><p className="muted">Would you like to submit your question and horoscope details before the appointment?</p></div><label>Question description<textarea className="text-input" rows="3" value={details.question} onChange={(event) => setDetails({ ...details, question: event.target.value })} placeholder="Share what you would like guidance on (optional)" /></label><div className="appointment-form-divider">Horoscope Details <span>Optional</span></div><div className="appointment-form-grid"><label>Date of Birth<input className="text-input" type="date" value={details.dob} onChange={(event) => setDetails({ ...details, dob: event.target.value })} /></label><label>Time of Birth<input className="text-input" type="time" value={details.birthTime} onChange={(event) => setDetails({ ...details, birthTime: event.target.value })} /></label><label>Place of Birth<input className="text-input" value={details.birthPlace} onChange={(event) => setDetails({ ...details, birthPlace: event.target.value })} /></label></div></div>}
          {step === 'review' && <div className="appointment-review"><div className="appointment-booking-section-label">Selected Appointment</div><div className="appointment-review-slot"><span>01</span><div><strong>{formatDate(date)}</strong><small>{formatTime(time)}</small><small>30 Minutes · Audio Consultation</small></div><b>₹{PRICE}</b></div></div>}
          {step === 'payment' && <div className="appointment-payment-step"><div className="appointment-payment-title">Pay with Wallet</div><div className="appointment-wallet-card"><div className="appointment-wallet-balance"><div><WalletCards size={16} /><span>Wallet Balance</span></div><strong>₹{balance.toLocaleString('en-IN')}</strong></div><div className="appointment-wallet-divider" /><div className="appointment-wallet-line"><span>Appointment Amount</span><strong>₹{amount.toLocaleString('en-IN')}</strong></div><div className={`appointment-wallet-status ${balance >= amount ? 'is-sufficient' : 'is-insufficient'}`}>{balance >= amount ? <><Check size={14} /> Sufficient wallet balance</> : <><CircleAlert size={14} /> Insufficient wallet balance</>}</div></div>{balance < amount && <button type="button" className="btn btn-outline appointment-add-money" onClick={() => navigate(routes.walletHistory)}>Add Money to Wallet</button>}<p className="appointment-charge-note">You will be charged ₹{amount.toLocaleString('en-IN')} from your wallet.</p></div>}
          {step === 'success' && <div className="appointment-booking-success"><div className="appointment-success-heading"><div className="appointment-success-mark"><Check size={21} /></div><div className="appointment-success-title"><Sparkles size={14} /><h3>Appointment Confirmed!</h3><Sparkles size={14} /></div><p>Your appointment with {astrologer.name} has been confirmed.</p></div><div className="appointment-success-details"><strong>Appointment Details</strong><div className="appointment-success-detail-list"><div className="appointment-success-detail-entry"><div className="appointment-success-detail-column"><CalendarPlus size={17} className="appointment-detail-icon" /><small>Date &amp; Time</small><b>{formatDate(date)}</b><b className="appointment-detail-time">{formatTime(time)}</b></div><div className="appointment-success-detail-column"><PhoneCall size={17} className="appointment-detail-icon" /><small>Consultation Type</small><span className="appointment-consultation-pill">{TYPE}</span></div><div className="appointment-success-detail-column"><Clock3 size={17} className="appointment-detail-icon" /><small>Duration</small><b>30 Minutes</b></div><div className="appointment-success-detail-column appointment-detail-booking-id"><small>Booking ID</small><span>{`#BOOK-${date.replaceAll('-', '')}-001`}<button type="button" aria-label="Copy booking ID" onClick={() => { navigator.clipboard?.writeText(`#BOOK-${date.replaceAll('-', '')}-001`); setCopied(true) }}><Copy size={13} /></button>{copied && <em>Copied</em>}</span></div></div></div></div><div className="appointment-paid-card"><div><WalletCards size={17} /><span>Amount Paid</span><strong>₹{PRICE}</strong></div><span className="appointment-paid-badge"><Check size={13} /> Paid &amp; Confirmed</span></div></div>}
        </div>
        <div className="modal-card__footer user-modal-card__footer appointment-booking-modal__footer">
          {step !== 'success' && <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>}
          {step === 'form' && <><button className="btn btn-outline" type="button" disabled={!selected.length} onClick={() => setStep('details')}>Add Details</button><button className="btn btn-primary" type="button" disabled={!selected.length} onClick={() => setStep('review')}>Review Appointment</button></>}
          {step === 'details' && <button className="btn btn-primary" type="button" onClick={() => setStep('review')}>Save Details</button>}
          {step === 'review' && <><button className="btn btn-outline" type="button" onClick={() => setStep('form')}>Edit Appointment</button><button className="btn btn-primary" type="button" onClick={() => setStep('payment')}>Proceed to Payment</button></>}
          {step === 'payment' && <button className="btn btn-primary" type="button" disabled={paymentMethod !== 'Wallet' || balance < amount} onClick={pay}>Confirm &amp; Pay ₹{amount}</button>}
          {step === 'success' && <><button className="btn btn-primary" type="button" onClick={() => { onClose(); navigate(`${routes.appointmentDetails}?id=${appointmentId}`) }}><CalendarPlus size={15} /> View Appointment</button><button className="btn btn-outline" type="button" onClick={onClose}>Done</button></>}
        </div>
      </div>
    </div>,
    document.body,
  )
}
