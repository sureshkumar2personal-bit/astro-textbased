import { useMemo, useState } from 'react'
import { CalendarDays, Clock3, PhoneCall, RefreshCw, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { consultationAstrologers } from '../../../data/consultationAstrologers.js'
import { mockAstrologers } from '../../../data/notificationData.js'
import { appointmentStatusBucket, formatDisplayDate, formatTimeRange, getAppointmentDisplayStatus, resolveAppointmentWindow } from '../../../utils/appointments.js'
import './appointmenthistory.css'

const FILTERS = [
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'rescheduled', label: 'Rescheduled' },
]

const STATUS_FILTERS = [{ key: 'all', label: 'All' }, ...FILTERS]

const DATE_FILTERS = [
  { key: 'all', label: 'All Time' },
  { key: '30-days', label: 'Last 30 Days' },
  { key: '3-months', label: 'Last 3 Months' },
  { key: '6-months', label: 'Last 6 Months' },
  { key: 'this-year', label: 'This Year' },
  { key: 'custom', label: 'Custom Date' },
]

function appointmentDateTime(appointment) {
  if (!appointment?.dateIso) return 0
  const { startMin } = resolveAppointmentWindow(appointment)
  const date = new Date(`${appointment.dateIso}T00:00:00`)
  date.setMinutes(Number.isFinite(startMin) ? startMin : 0)
  return date.getTime()
}

function historyCategory(appointment, now) {
  const bucket = appointmentStatusBucket(appointment, now)
  if (bucket === 'rescheduled') return 'rescheduled'
  if (bucket === 'cancelled') return 'cancelled'
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

function HistoryCard({ appointment, category, appointments, onDetails, onBookAgain }) {
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
        <span className="appointment-history-status">{getAppointmentDisplayStatus(appointment)}</span>
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

      <div className="appointment-history-card__footer">
        <span>{appointment.orderId ? `Appointment ID: ${appointment.orderId}` : ''}</span>
        <div className="appointment-history-card__actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onDetails(appointment.id)}>View Details</button>
          {category === 'completed' && appointment.astrologerId && <button type="button" className="btn btn-primary btn-sm" onClick={() => onBookAgain(appointment.astrologerId)}>Book Again</button>}
        </div>
      </div>
    </article>
  )
}

export default function AppointmentHistoryPage() {
  const { currentUser } = useAuth()
  const { appointments } = useAppData()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const now = Date.now()
  const userId = currentUser?.id

  const history = useMemo(() => appointments
    .filter((appointment) => appointment.userId === userId || (currentUser?.role === 'user' && appointment.userId === 'user-demo'))
    .map((appointment) => ({ appointment, category: historyCategory(appointment, now) }))
    .filter((entry) => entry.category)
    .sort((a, b) => appointmentDateTime(b.appointment) - appointmentDateTime(a.appointment)), [appointments, currentUser?.role, now, userId])

  const dateFilteredHistory = useMemo(() => {
    const today = new Date(now)
    today.setHours(23, 59, 59, 999)
    let start = null
    let end = dateFilter === 'all' ? null : today

    if (dateFilter === '30-days' || dateFilter === '3-months' || dateFilter === '6-months') {
      start = new Date(today)
      if (dateFilter === '30-days') start.setDate(start.getDate() - 30)
      if (dateFilter === '3-months') start.setMonth(start.getMonth() - 3)
      if (dateFilter === '6-months') start.setMonth(start.getMonth() - 6)
      start.setHours(0, 0, 0, 0)
    } else if (dateFilter === 'this-year') {
      start = new Date(today.getFullYear(), 0, 1)
    } else if (dateFilter === 'custom') {
      start = customStart ? new Date(`${customStart}T00:00:00`) : null
      end = customEnd ? new Date(`${customEnd}T23:59:59.999`) : today
    }

    return history.filter(({ appointment }) => {
      const timestamp = appointmentDateTime(appointment)
      return (!start || timestamp >= start.getTime()) && (!end || timestamp <= end.getTime())
    })
  }, [customEnd, customStart, dateFilter, history, now])

  const statistics = [
    { label: 'Total Appointments', value: dateFilteredHistory.length },
    ...FILTERS.map(({ key, label }) => ({ label, value: dateFilteredHistory.filter((entry) => entry.category === key).length })),
  ]
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visible = dateFilteredHistory
    .filter((entry) => filter === 'all' || entry.category === filter)
    .filter(({ appointment }) => !normalizedSearch || [appointment.astrologer, appointment.orderId, appointment.id].some((value) => String(value || '').toLowerCase().includes(normalizedSearch)))

  return (
    <div className="appointment-history-page">
      <PageHeader title="Appointment History" subtitle="View your previous appointments, consultation details, and appointment status." />
      <section className="appointment-history-statistics" aria-label="Appointment statistics">
        {statistics.map(({ label, value }) => <div className="appointment-history-statistic" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </section>
      <section className="appointment-history-recommendation" aria-label="Continue your journey">
        <div className="appointment-history-recommendation__ornament" aria-hidden="true">✦</div>
        <div className="appointment-history-recommendation__copy">
          <span>CONTINUE YOUR JOURNEY</span>
          <p>Your last consultation was about Career.</p>
          <small>Explore another consultation with</small>
        </div>
        <div className="appointment-history-recommendation__astrologer">
          <strong>Acharya Meena</strong>
          <span>Vedic Astrology</span>
        </div>
        <button type="button" className="btn btn-primary appointment-history-recommendation__action" onClick={() => navigate('/user/appointments/book/acharya-meena')}>Continue Consultation →</button>
      </section>
      <div className="appointment-history-tools">
        <label className="appointment-history-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search appointments</span>
          <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by astrologer or appointment ID" />
        </label>
        <label className="appointment-history-date-filter">
          <span>Date Filter</span>
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Date Filter">
            {DATE_FILTERS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
      </div>
      {dateFilter === 'custom' && <div className="appointment-history-custom-dates">
        <label>From <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label>
        <label>To <input type="date" value={customEnd} min={customStart || undefined} onChange={(event) => setCustomEnd(event.target.value)} /></label>
      </div>}
      <div className="appointment-history-filters" role="tablist" aria-label="Appointment history status filters">
        {STATUS_FILTERS.map((item) => <button key={item.key} type="button" role="tab" aria-selected={filter === item.key} className={filter === item.key ? 'is-active' : ''} onClick={() => setFilter(item.key)}>{item.label}</button>)}
      </div>
      {visible.length ? <div className="appointment-history-list">{visible.map(({ appointment, category }) => <HistoryCard key={appointment.id} appointment={appointment} category={category} appointments={appointments} onDetails={(id) => navigate(`/user/appointment-details?id=${encodeURIComponent(id)}`)} onBookAgain={(astrologerId) => navigate(`/user/appointments/book/${encodeURIComponent(astrologerId)}`)} />)}</div> : <div className="appointment-history-empty"><CalendarDays size={22} /><strong>{filter === 'all' ? 'No appointments' : `No ${filter} appointments`}</strong><p>Past appointment records will appear here.</p></div>}
    </div>
  )
}
