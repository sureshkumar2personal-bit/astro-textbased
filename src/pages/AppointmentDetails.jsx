import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, PhoneCall } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './user/appointments/userappointments.css'
import './user/appointments/appointmenthistory.css'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import UserAppointmentDetailsDrawer from '../components/user/UserAppointmentDetailsDrawer.jsx'
import RescheduleModal from './astrologer/appointments/RescheduleModal.jsx'
import HistoryCalendar from './astrologer/appointments/HistoryCalendar.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { ROLES } from '../utils/roleRoutes.js'
import { appointmentStatusBucket, formatDisplayDate, formatTimeRange, fromIsoDate, getAppointmentDisplayStatus, resolveAppointmentWindow, toIsoDate, useNow } from '../utils/appointments.js'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'rescheduled', label: 'Rescheduled' },
]
const CANCELLABLE_STATUSES = ['Booked', 'Confirmed', 'Pending', 'Rescheduled']

function initials(name = '') {
  return String(name).split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AS'
}

function UserAppointmentCard({ appointment, selected, onSelect, onCancel, onReschedule, onViewDetails }) {
  const window = resolveAppointmentWindow(appointment)
  const bucket = appointmentStatusBucket(appointment)
  const statusLabel = getAppointmentDisplayStatus(appointment)
  const durationLabel = appointment.duration ? String(appointment.duration).replace(/\s*min\b/i, ' Minutes') : `${window.endMin - window.startMin} Minutes`

  return (
    <article
      className={`apt-history-item user-appointment-card${selected ? ' is-active' : ''}${bucket === 'cancelled' ? ' is-cancelled' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(appointment.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(appointment.id)
        }
      }}
    >
      <div className="user-appointment-card__top">
        <div className="user-appointment-identity">
          <span className="user-appointment-avatar">{initials(appointment.astrologer)}</span>
          <div>
            <strong>{appointment.astrologer || 'Astrologer'}</strong>
            <span>{appointment.specialization || 'Vedic Astrology'}</span>
          </div>
        </div>
        <StatusBadge label={statusLabel} />
      </div>
      <div className="user-appointment-card__meta">
        <span><PhoneCall size={13} /> {appointment.type || 'Audio Call'}</span>
        <span><CalendarDays size={13} /> {formatDisplayDate(appointment.dateIso, true)}</span>
        <span className="user-appointment-card__time"><Clock3 size={13} /> {formatTimeRange(window.startMin, window.endMin)} · {durationLabel}</span>
      </div>
      <div className="user-appointment-card__footer">
        <span>₹{Number(appointment.price || appointment.amount || 0).toLocaleString('en-IN')} paid</span>
        <span>Booking ID: {appointment.orderId || appointment.id}</span>
      </div>
      <div className="user-appointment-card__actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={(event) => { event.stopPropagation(); onViewDetails(appointment) }}>View Details</button>
        {appointment.status === 'Pending' && <button type="button" className="btn btn-outline btn-sm" onClick={(event) => { event.stopPropagation(); onReschedule(appointment) }}>Reschedule</button>}
        {CANCELLABLE_STATUSES.includes(appointment.status) && <button type="button" className="btn btn-danger btn-sm" onClick={(event) => { event.stopPropagation(); onCancel(appointment) }}>Cancel Appointment</button>}
      </div>
    </article>
  )
}

function AddedCompactAppointmentCard({ appointment, onSelect }) {
  if (!appointment) return null
  const window = resolveAppointmentWindow(appointment)
  const statusLabel = getAppointmentDisplayStatus(appointment)
  const amount = appointment.amount ?? appointment.price ?? 0
  const avatar = appointment.profileImage || appointment.avatar || appointment.astrologerImage

  return (
    <Card
      className="apt-side-panel added-compact-appointment-card"
    >
      <div className="added-compact-appointment-card__top">
        <div className="added-compact-appointment-card__profile">
          {avatar ? <img className="added-compact-appointment-card__avatar" src={avatar} alt={`${appointment.astrologer || 'Astrologer'} profile`} /> : <span className="user-appointment-avatar">{initials(appointment.astrologer)}</span>}
          <div><strong>{appointment.astrologer || 'Astrologer'}</strong><span>{appointment.specialization || 'Vedic Astrology'}</span></div>
        </div>
        <StatusBadge label={statusLabel} />
      </div>
      <div className="added-compact-appointment-card__meta">
        <span><CalendarDays size={13} /><small>Date</small><strong>{formatDisplayDate(appointment.dateIso, true)}</strong></span>
        <span><Clock3 size={13} /><small>Time</small><strong>{formatTimeRange(window.startMin, window.endMin)}</strong></span>
        <span><PhoneCall size={13} /><small>Mode</small><strong>{appointment.type || 'Audio Call'}</strong></span>
        <span><Clock3 size={13} /><small>Duration</small><strong>{appointment.duration || `${window.endMin - window.startMin} Minutes`}</strong></span>
      </div>
      <div className="added-compact-appointment-card__footer">
        <div><small>Amount</small><strong>₹{Number(amount).toLocaleString('en-IN')}</strong></div>
        <div><small>Appointment ID</small><strong>{appointment.orderId || appointment.id}</strong></div>
        <div><small>Status</small><strong>{statusLabel}</strong></div>
      </div>
      <div className="added-compact-appointment-card__actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={(event) => { event.stopPropagation(); onSelect?.(appointment) }}>View Details</button>
      </div>
    </Card>
  )
}

export default function AppointmentDetails() {
  const [searchParams] = useSearchParams()
  const { appointments, actions } = useAppData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const now = useNow(60000)
  const userAppointments = useMemo(() => appointments.filter((appointment) => appointment.userId === currentUser?.id || (currentUser?.role === ROLES.USER && appointment.userId === 'user-demo')), [appointments, currentUser?.id, currentUser?.role])
  const requested = userAppointments.find((appointment) => appointment.id === searchParams.get('id'))
  const first = requested || userAppointments[0]
  const initialDate = first?.dateIso ? fromIsoDate(first.dateIso) : new Date()
  const [rangeStart, setRangeStart] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [selectedId, setSelectedId] = useState(() => first?.id || null)
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [detailsAppointment, setDetailsAppointment] = useState(null)

  const filteredAppointments = useMemo(() => userAppointments.filter((appointment) => {
    const bucket = appointmentStatusBucket(appointment, now)
    if (filter === 'upcoming') return bucket === 'booked' && !appointment.rescheduledFrom && !appointment.rescheduledTo
    if (filter === 'completed') return bucket === 'completed'
    if (filter === 'cancelled') return bucket === 'cancelled'
    if (filter === 'rescheduled') return bucket === 'rescheduled'
    return true
  }), [filter, now, userAppointments])

  const selectedIso = toIsoDate(selectedDate)
  const dayAppointments = filteredAppointments.filter((appointment) => appointment.dateIso === selectedIso)
  const selectedAppointment = dayAppointments.find((appointment) => appointment.id === selectedId) || dayAppointments[0] || null

  useEffect(() => {
    const firstVisible = filteredAppointments[0]
    if (!firstVisible) {
      setSelectedId(null)
      return
    }
    setSelectedId(firstVisible.id)
    if (firstVisible.dateIso) {
      const date = fromIsoDate(firstVisible.dateIso)
      setSelectedDate(date)
      setRangeStart(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }, [filter, filteredAppointments, userAppointments])

  useEffect(() => {
    if (!requested) return
    setDetailsAppointment(requested)
    setSelectedId(requested.id)
    if (requested.dateIso) {
      const date = fromIsoDate(requested.dateIso)
      setSelectedDate(date)
      setRangeStart(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }, [requested])

  const selectDate = (date) => {
    setSelectedDate(date)
    const dateAppointments = filteredAppointments.filter((appointment) => appointment.dateIso === toIsoDate(date))
    setSelectedId(dateAppointments[0]?.id || null)
  }

  const selectAppointment = (id) => {
    const appointment = userAppointments.find((item) => item.id === id)
    setSelectedId(id)
    if (appointment?.dateIso) {
      const date = fromIsoDate(appointment.dateIso)
      setSelectedDate(date)
      setRangeStart(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const viewDetails = (appointment) => {
    selectAppointment(appointment.id)
    setDetailsAppointment(appointment)
  }

  const cancelAppointment = (appointment) => {
    actions.cancelAppointment(appointment.id, appointment)
    setNotice('Appointment cancelled successfully.')
  }

  const closeDetailsDrawer = (appointment) => {
    setDetailsAppointment(null)
  }

  const bookAgain = (appointment) => {
    setDetailsAppointment(null)
    if (!appointment?.astrologerId) return
    navigate(`/user/appointments/book/${encodeURIComponent(appointment.astrologerId)}`)
  }

  return <div className="apt-page user-appointment-history">
    <PageHeader eyebrow="User portal" title="Appointment History" showBack />
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
      <Link className="btn btn-primary appointment-history-recommendation__action" to="/user/appointments/book/acharya-meena">Continue Consultation →</Link>
    </section>
    <div className="apt-history-toolbar"><div className="apt-history-filters"><div className="apt-history-tabs">{FILTERS.map((item) => <button type="button" key={item.key} className={filter === item.key ? 'is-active' : ''} onClick={() => setFilter(item.key)}>{item.label}</button>)}</div></div><div className="apt-history-search"><select className="apt-history-status-filter" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter appointments by status"><option value="all">Filter by status</option>{FILTERS.filter((item) => item.key !== 'all').map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></div></div>
    <div className="apt-main apt-main--history">
      <div className="apt-calendar-col apt-history-calendar-col"><HistoryCalendar appointments={filteredAppointments} rangeStart={rangeStart} onRangeChange={setRangeStart} onSelectDate={selectDate} selectedDate={selectedDate} /></div>
      <aside className="apt-side-col apt-history-day-col">
        <div className="apt-side-head"><span>{selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) : 'Appointments'}</span></div>
        <div className="user-appointment-list">
          {dayAppointments.length ? (
            dayAppointments.map((appointment) => (
              <AddedCompactAppointmentCard key={appointment.id} appointment={appointment} onSelect={viewDetails} />
            ))
          ) : (
            <div className="apt-history-empty apt-history-empty--day"><CalendarDays size={20} /><strong>No appointments this day</strong><span>Select another date to see its appointments.</span></div>
          )}
        </div>
      </aside>
    </div>
    <UserAppointmentDetailsDrawer appointment={detailsAppointment} currentUser={currentUser} onClose={() => closeDetailsDrawer(detailsAppointment)} onBookAgain={bookAgain} />
    {rescheduleTarget && <RescheduleModal appointment={rescheduleTarget} appointments={userAppointments} astrologerId={rescheduleTarget.astrologerId} onClose={() => setRescheduleTarget(null)} />}
    {notice && <SuccessAlert variant="user" message={notice} onDismiss={() => setNotice('')} />}
  </div>
}
