import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { mockAstrologers } from '../../../data/notificationData.js'
import {
  APPOINTMENT_CONFIG,
  BOOKING_WINDOW_END,
  CONSULTATION_PACKAGE,
  CONSULTATION_TYPE,
  buildCalendarAvailability,
  getBookingOverride,
  gridOpenSlotCount,
  keyFor,
  parseKey,
} from './bookingAstrologerData.js'
import AppointmentBookingModal from '../../../components/user/AppointmentBookingModal.jsx'
import AppointmentSlotsModal from '../../../components/user/AppointmentSlotsModal.jsx'
import ConsultationSummaryDrawer from '../../../components/user/ConsultationSummaryDrawer.jsx'
import UserAppointmentDetailsDrawer from '../../../components/user/UserAppointmentDetailsDrawer.jsx'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { availabilitySnapshotForDate, publishedAvailabilityMap } from '../../../utils/appointments.js'
import './bookappointmentslots.css'

function daysFor(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
}

function initials(name = '') {
  return String(name).split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function ratingScore(rating) {
  return String(rating || '0').split('/')[0].trim() || '0'
}

export default function BookAppointmentSlots() {
  const { astrologerId } = useParams()
  const { currentUser } = useAuth()
  const { appointments, consultations, userWallet, actions, appointmentAvailabilityTemplates } = useAppData()
  const location = useLocation()
  const navigate = useNavigate()

  const astrologer = useMemo(() => mockAstrologers.find((item) => item.id === astrologerId), [astrologerId])

  const todayDate = new Date()
  const today = keyFor(todayDate)
  const bookingOverride = getBookingOverride(astrologer)
  const astrologerPrice = bookingOverride.price
  const routes = getRoleRoutes(currentUser?.role)

  // Prefer the astrologer's own published availability (weekly schedule,
  // date overrides, duration/buffer) over the static demo fallback, so
  // updates the astrologer publishes are reflected here immediately. Mirrors
  // the same pattern already used on the astrologer's public profile page.
  const hasScheduleTemplates = appointmentAvailabilityTemplates.some(
    (template) => template.astrologerId === astrologer?.id && (template.weeklySchedule || template.dateOverrides || template.publishedWeeklySchedule || template.publishedDateOverrides),
  )
  const calendarAvailability = useMemo(() => {
    if (!astrologer) return {}
    if (hasScheduleTemplates) {
      return publishedAvailabilityMap({ templates: appointmentAvailabilityTemplates, astrologerId: astrologer.id, appointments, includeSaved: true })
    }
    return buildCalendarAvailability(astrologer)
  }, [astrologer, hasScheduleTemplates, appointmentAvailabilityTemplates, appointments])

  const [month, setMonth] = useState(() => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState('')
  const [slotsDate, setSlotsDate] = useState('')
  // The astrologer's real published duration/buffer/price for the day whose
  // slots are currently open, so the slot grid and its summary cards match
  // exactly what was published instead of the generic demo defaults.
  const slotsSnapshot = useMemo(() => {
    if (!slotsDate || !astrologer || !hasScheduleTemplates) return null
    return availabilitySnapshotForDate({
      templates: appointmentAvailabilityTemplates.filter((template) => template.astrologerId === astrologer.id),
      date: slotsDate,
    })
  }, [slotsDate, astrologer, hasScheduleTemplates, appointmentAvailabilityTemplates])
  const slotsPrice = slotsSnapshot?.appointmentPrice ?? astrologerPrice
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingSlot, setBookingSlot] = useState(null)
  const [bookingDetails, setBookingDetails] = useState(null)
  const [detailsAppointment, setDetailsAppointment] = useState(null)
  const editDate = location.state?.initialDate || ''
  const detailAppointmentId = location.state?.appointmentId || ''
  const openAppointmentDetails = Boolean(location.state?.openAppointmentDetails)

  useEffect(() => {
    if (!editDate) return
    setMonth(new Date(parseKey(editDate).getFullYear(), parseKey(editDate).getMonth(), 1))
    setSelectedDate(editDate)
    setSlotsDate('')
  }, [editDate])

  useEffect(() => {
    if (!openAppointmentDetails || !detailAppointmentId) return
    const appointment = appointments.find((item) => item.id === detailAppointmentId)
    if (appointment) setDetailsAppointment(appointment)
  }, [appointments, detailAppointmentId, openAppointmentDetails])

  if (!astrologer) return <Navigate to="/user/appointments/book" replace />

  const dateInfo = (dayKey) => {
    if (dayKey < today || dayKey > BOOKING_WINDOW_END) return { available: false, count: 0 }
    const count = hasScheduleTemplates
      ? (calendarAvailability[dayKey] || []).length
      : gridOpenSlotCount({ availability: calendarAvailability, dateKey: dayKey, astrologerId: astrologer.id, appointments })
    return { available: count > 0, count }
  }

  const currentMonthFirst = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  const windowEndMonthFirst = new Date(parseKey(BOOKING_WINDOW_END).getFullYear(), parseKey(BOOKING_WINDOW_END).getMonth(), 1)
  const days = daysFor(month)
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const changeMonth = (offset) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const selectDate = (dayKey) => {
    const info = dateInfo(dayKey)
    if (!info.available) return
    setSelectedDate(dayKey)
    setSlotsDate(dayKey)
  }

  const continueSlots = (slot) => {
    setBookingSlot({
      key: slot.key,
      date: slot.date,
      time: slot.time,
      timeLabel: slot.timeLabel,
      endLabel: slot.endLabel,
      duration: slotsSnapshot?.appointmentDuration ? `${slotsSnapshot.appointmentDuration} Minutes` : APPOINTMENT_CONFIG.durationLabel,
      type: CONSULTATION_TYPE,
      package: CONSULTATION_PACKAGE,
      price: slotsPrice,
    })
    setSlotsDate('')
    setSummaryOpen(true)
  }

  const proceedToPayment = (details) => {
    setBookingDetails(details)
    setSummaryOpen(false)
    setBookingOpen(true)
  }

  return (
    <div className="book-slots-page">
      <button type="button" className="book-slots-back" onClick={() => navigate(-1)}><span aria-hidden="true">←</span> Back</button>
      <PageHeader
        eyebrow="USER PORTAL"
        title="Book an Appointment"
        subtitle="Pick an available date, review its open slots and pay from your wallet."
      />

      <section className="book-slots-astrologer">
        <div className="book-slots-astrologer__main">
          <div className="book-slots-avatar-wrap">
            <div className="book-slots-avatar" aria-hidden="true">{initials(astrologer.name)}</div>
            <span className="book-slots-availability-dot" title="Available now" />
          </div>
          <div className="book-slots-astrologer__copy">
            <h2>{astrologer.name}</h2>
            <p>{astrologer.specialization}</p>
            <div className="book-slots-astrologer__meta">
              <span className="book-slots-rating" aria-label={`Rated ${ratingScore(astrologer.rating)} out of 5`}>
                <Star size={13} aria-hidden="true" />
                <strong>{ratingScore(astrologer.rating)}</strong>
                <em> / 5</em>
              </span>
              <span className="book-slots-available">
                <i aria-hidden="true" />
                {bookingOverride.availableSlots.toLocaleString('en-IN')} slots available
              </span>
            </div>
          </div>
        </div>
        <div className="book-slots-astrologer__aside">
          <span className="book-slots-price-badge">From ₹{astrologerPrice}</span>
          <button type="button" className="btn btn-outline book-slots-change" onClick={() => navigate('/user/appointments/book')}>Change</button>
        </div>
      </section>

      <section className="book-slots-select-head">
        <h2 className="section-title">Select Date</h2>
        <p className="book-slots-section-support">Start from the current month and move forward through {astrologer.name}&apos;s published availability.</p>
      </section>

      <section className="book-slots-calendar">
        <div className="book-slots-calendar__header">
          <button type="button" className="book-slots-calendar__nav" aria-label="Previous month" disabled={month <= currentMonthFirst} onClick={() => changeMonth(-1)}><ChevronLeft size={17} /></button>
          <strong>{monthLabel}</strong>
          <button type="button" className="book-slots-calendar__nav" aria-label="Next month" disabled={month >= windowEndMonthFirst} onClick={() => changeMonth(1)}><ChevronRight size={17} /></button>
        </div>

        <div className="book-slots-calendar__weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
        </div>

        <div className="book-slots-calendar__days">
          {days.map((day) => {
            const dayKey = keyFor(day)
            const outsideMonth = day.getMonth() !== month.getMonth()
            const info = dateInfo(dayKey)
            const isSelected = selectedDate === dayKey
            if (outsideMonth) {
              return <span key={dayKey} className="book-slots-day is-outside" aria-hidden="true"><b>{day.getDate()}</b></span>
            }
            if (!info.available) {
              return <span key={dayKey} className="book-slots-day is-closed" aria-disabled="true"><b>{day.getDate()}</b><small>Closed</small></span>
            }
            return (
              <button type="button" key={dayKey} className={`book-slots-day is-available${isSelected ? ' is-selected' : ''}`} onClick={() => selectDate(dayKey)} aria-label={`${day.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}, ${info.count} slot${info.count === 1 ? '' : 's'} available`}>
                <b>{day.getDate()}</b>
                <small>{isSelected ? 'Selected' : `${info.count} slot${info.count === 1 ? '' : 's'}`}</small>
              </button>
            )
          })}
        </div>

        <div className="book-slots-calendar__legend" aria-label="Calendar status legend">
          <span><i className="is-available" />Available</span>
          <span><i className="is-selected" />Selected</span>
          <span><i className="is-closed" />Closed</span>
        </div>
      </section>

      <div className="book-slots-info">
        <p>Select a date to open its published appointment slots, then continue to payment.</p>
        <p>Slots, buffers and prices come from each astrologer&apos;s published availability.</p>
      </div>

      {slotsDate && (
        <AppointmentSlotsModal
          astrologer={astrologer}
          availability={calendarAvailability}
          appointments={appointments}
          price={slotsPrice}
          durationMinutes={slotsSnapshot?.appointmentDuration}
          bufferMinutes={slotsSnapshot?.appointmentBuffer}
          dateKey={slotsDate}
          onClose={() => setSlotsDate('')}
          onContinue={continueSlots}
        />
      )}

      {summaryOpen && bookingSlot && (
        <ConsultationSummaryDrawer
          astrologer={astrologer}
          slot={bookingSlot}
          walletBalance={userWallet?.balance}
          user={currentUser}
          onClose={() => setSummaryOpen(false)}
          onProceed={proceedToPayment}
        />
      )}

      {bookingOpen && bookingSlot && (
        <AppointmentBookingModal
          astrologer={astrologer}
          availability={calendarAvailability}
          appointments={appointments}
          userWallet={userWallet}
          userId={currentUser?.id}
          userName={currentUser?.name}
          actions={actions}
          routes={routes}
          initialDate={bookingSlot.date}
          initialSelectedSlots={[bookingSlot]}
          pricePerSlot={astrologerPrice}
          slotDuration={bookingSlot.duration}
          initialStep="review"
          initialDetails={bookingDetails}
          publishedAvailability={hasScheduleTemplates}
          onEditAppointment={() => {
            setBookingOpen(false)
            navigate(`/user/appointments/book/${astrologer.id}`, { state: { initialDate: bookingSlot.date } })
          }}
          onClose={() => setBookingOpen(false)}
        />
      )}

      <UserAppointmentDetailsDrawer
        appointment={detailsAppointment}
        consultation={detailsAppointment ? consultations.find((item) => item.appointmentId === detailsAppointment.id && (item.sent || item.sentToUser || item.completedAt)) : null}
        currentUser={currentUser}
        onClose={() => {
          setDetailsAppointment(null)
          navigate(location.pathname, { replace: true, state: { initialDate: editDate } })
        }}
        onUpdatePariharamProgress={(appointmentId, pariharamId, dayId, date, dayNumber, completed) => actions.savePariharamProgress(appointmentId, pariharamId, dayId, date, dayNumber, completed)}
      />
    </div>
  )
}
