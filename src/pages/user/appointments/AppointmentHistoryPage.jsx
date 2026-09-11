import { useMemo, useState } from 'react'
import { CalendarDays, Clock3, PhoneCall, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { consultationAstrologers } from '../../../data/consultationAstrologers.js'
import { mockAstrologers } from '../../../data/notificationData.js'
import { formatDisplayDate, formatTimeRange, isCancelledStatus, resolveAppointmentWindow } from '../../../utils/appointments.js'
import './appointmenthistory.css'

const FILTERS = [
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'rescheduled', label: 'Rescheduled' },
]

function appointmentDateTime(appointment) {
  if (!appointment?.dateIso) return 0
  const { startMin } = resolveAppointmentWindow(appointment)
  const date = new Date(`${appointment.dateIso}T00:00:00`)
  date.setMinutes(Number.isFinite(startMin) ? startMin : 0)
  return date.getTime()
}

function historyCategory(appointment, now) {
  if (appointment.rescheduledTo || appointment.rescheduledFrom || appointment.status === 'Rescheduled') return 'rescheduled'
  if (isCancelledStatus(appointment.status)) return 'cancelled'
  // A completed/confirmed/booked record is historical only after its actual
  // appointment time. Cancelled and rescheduled records are retained above
  // even when their original scheduled time was in the future.
  if (appointmentDateTime(appointment) < now) return 'completed'
  return null
}

function statusLabel(category) {
  if (category === 'cancelled') return 'Cancelled'
  if (category === 'rescheduled') return 'Rescheduled'
  return 'Completed'
}

function profileFor(appointment) {
  const profile = consultationAstrologers.find((item) => item.id === appointment.astrologerId)
  const source = mockAstrologers.find((item) => item.id === appointment.astrologerId)
  return {
    image: profile?.profileImage || appointment.profileImage || '',
    specialization: appointment.specialization || source?.specialization || profile?.specialization || 'Vedic Astrology',
  }
}

function initials(name = '') {
  return String(name).split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AS'
}

function HistoryCard({ appointment, category, appointments, onDetails }) {
  const window = resolveAppointmentWindow(appointment)
  const profile = profileFor(appointment)
  const original = appointment.rescheduledFrom ? appointments.find((item) => item.id === appointment.rescheduledFrom) : null
  const replacement = appointment.rescheduledTo ? appointments.find((item) => item.id === appointment.rescheduledTo) : null
  const rescheduledAppointment = replacement || appointment
  const replacementWindow = resolveAppointmentWindow(rescheduledAppointment)
  const rescheduleTarget = appointment.rescheduledFrom ? appointment : replacement
  const originalAppointment = appointment.rescheduledFrom ? original : appointment
  const hasRescheduleInfo = category === 'rescheduled' && (original || replacement || appointment.rescheduledFrom || appointment.rescheduledTo)

  return (
    <article className={`appointment-history-card appointment-history-card--${category}`}>
      <div className="appointment-history-card__top">
        <div className="appointment-history-card__identity">
          {profile.image ? <img src={profile.image} alt={`${appointment.astrologer || 'Astrologer'} profile`} /> : <span>{initials(appointment.astrologer)}</span>}
          <div><h2>{appointment.astrologer || 'Astrologer'}</h2><p>{profile.specialization}</p></div>
        </div>
        <span className="appointment-history-status">{statusLabel(category)}</span>
      </div>

      <div className="appointment-history-card__details">
        <div><CalendarDays size={15} /><span><small>Date</small><strong>{formatDisplayDate(appointment.dateIso, true)}</strong></span></div>
        <div><Clock3 size={15} /><span><small>Time</small><strong>{formatTimeRange(window.startMin, window.endMin)}</strong></span></div>
        <div><PhoneCall size={15} /><span><small>Mode</small><strong>{appointment.type || 'Audio Call'}</strong></span></div>
        <div><Clock3 size={15} /><span><small>Duration</small><strong>{appointment.duration || `${window.endMin - window.startMin} min`}</strong></span></div>
        <div><span><small>Amount</small><strong>₹{Number(appointment.amount || appointment.price || 0).toLocaleString('en-IN')}</strong></span></div>
      </div>

      {hasRescheduleInfo && (
        <div className="appointment-history-reschedule">
          <span><RefreshCw size={14} /> Reschedule information</span>
          <p>Original: {originalAppointment?.dateIso ? formatDisplayDate(originalAppointment.dateIso, true) : formatDisplayDate(appointment.dateIso, true)} · {originalAppointment ? formatTimeRange(resolveAppointmentWindow(originalAppointment).startMin, resolveAppointmentWindow(originalAppointment).endMin) : formatTimeRange(window.startMin, window.endMin)}</p>
          <p>Rescheduled to: {rescheduleTarget?.dateIso ? formatDisplayDate(rescheduleTarget.dateIso, true) : formatDisplayDate(rescheduledAppointment.dateIso, true)} · {formatTimeRange(replacementWindow.startMin, replacementWindow.endMin)}</p>
        </div>
      )}

      {category === 'cancelled' && appointment.cancellationReason && <p className="appointment-history-cancellation">Cancellation: {appointment.cancellationReason}</p>}

      <div className="appointment-history-card__footer"><span>{appointment.orderId ? `Appointment ID: ${appointment.orderId}` : ''}</span><button type="button" className="btn btn-outline btn-sm" onClick={() => onDetails(appointment.id)}>View Details</button></div>
    </article>
  )
}

export default function AppointmentHistoryPage() {
  const { currentUser } = useAuth()
  const { appointments } = useAppData()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('completed')
  const now = Date.now()
  const userId = currentUser?.id

  const history = useMemo(() => appointments
    .filter((appointment) => appointment.userId === userId || (currentUser?.role === 'user' && appointment.userId === 'user-demo'))
    .map((appointment) => ({ appointment, category: historyCategory(appointment, now) }))
    .filter((entry) => entry.category)
    .sort((a, b) => appointmentDateTime(b.appointment) - appointmentDateTime(a.appointment)), [appointments, currentUser?.role, now, userId])

  const visible = history.filter((entry) => entry.category === filter)

  return (
    <div className="appointment-history-page">
      <PageHeader title="Appointment History" subtitle="View your previous appointments, consultation details, and appointment status." />
      <div className="appointment-history-filters" role="tablist" aria-label="Appointment history status filters">
        {FILTERS.map((item) => <button key={item.key} type="button" role="tab" aria-selected={filter === item.key} className={filter === item.key ? 'is-active' : ''} onClick={() => setFilter(item.key)}>{item.label}</button>)}
      </div>
      {visible.length ? <div className="appointment-history-list">{visible.map(({ appointment, category }) => <HistoryCard key={appointment.id} appointment={appointment} category={category} appointments={appointments} onDetails={(id) => navigate(`/user/appointment-details?id=${encodeURIComponent(id)}`)} />)}</div> : <div className="appointment-history-empty"><CalendarDays size={22} /><strong>No {filter} appointments</strong><p>Past appointment records will appear here.</p></div>}
    </div>
  )
}
