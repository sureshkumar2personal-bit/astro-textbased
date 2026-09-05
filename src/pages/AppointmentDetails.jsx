import { useMemo, useState } from 'react'
import { CalendarCheck2, CalendarDays, Clock3, Headphones, Search, WalletCards } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import RescheduleModal from './astrologer/appointments/RescheduleModal.jsx'
import HistoryCalendar from './astrologer/appointments/HistoryCalendar.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { appointmentStatusBucket, formatDisplayDate, formatTimeRange, fromIsoDate, isAppointmentUpcoming, resolveAppointmentWindow, toIsoDate } from '../utils/appointments.js'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'rescheduled', label: 'Rescheduled' },
]
const CANCELLABLE_STATUSES = ['Booked', 'Confirmed', 'Rescheduled', 'Pending']

function initials(name = '') {
  return String(name).split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AS'
}

function dateLabel(appointment) {
  return appointment.dateIso ? formatDisplayDate(appointment.dateIso, true) : appointment.date || 'Date not available'
}

function UserAppointmentCard({ appointment, selected, onSelect, onReschedule, onCancel }) {
  const window = resolveAppointmentWindow(appointment)
  const bucket = appointmentStatusBucket(appointment.status)
  const upcoming = isAppointmentUpcoming(appointment)
  const canCancel = CANCELLABLE_STATUSES.includes(appointment.status)
  return (
    <article className={`apt-history-item user-appointment-card${selected ? ' is-active' : ''}${bucket === 'cancelled' ? ' is-cancelled' : ''}`}>
      <div className="user-appointment-card__top">
        <div className="user-appointment-identity"><span className="user-appointment-avatar">{initials(appointment.astrologer)}</span><div><strong>{appointment.astrologer || 'Astrologer'}</strong><span>{appointment.specialization || 'Vedic Astrology'}</span></div></div>
        <StatusBadge label={appointment.status || 'Booked'} />
      </div>
      <div className="user-appointment-card__meta"><span><Headphones size={13} /> {appointment.type || 'Audio Call'}</span><span><CalendarDays size={13} /> {dateLabel(appointment)}</span><span><Clock3 size={13} /> {formatTimeRange(window.startMin, window.endMin)} · {appointment.duration || `${window.endMin - window.startMin} min`}</span></div>
      <div className="user-appointment-card__footer"><span>₹{Number(appointment.price || appointment.amount || 0).toLocaleString('en-IN')} paid</span><span>Appointment ID: {appointment.orderId || appointment.id}</span></div>
      <div className="user-appointment-card__actions"><button type="button" className="btn btn-outline btn-sm" onClick={() => onSelect(appointment.id)}>View Details</button>{upcoming && <button type="button" className="btn btn-outline btn-sm" onClick={() => onReschedule(appointment)}>Reschedule</button>}{canCancel && <button type="button" className="btn btn-danger btn-sm" onClick={() => onCancel(appointment)}>Cancel Appointment</button>}{bucket === 'completed' && <Link to="/user/astrologers" className="btn btn-primary btn-sm">Book Again</Link>}</div>
    </article>
  )
}

function DetailField({ label, value, icon: Icon }) {
  return <div><span>{Icon && <Icon size={13} />} {label}</span><strong>{value || 'Not available'}</strong></div>
}

export default function AppointmentDetails() {
  const [searchParams] = useSearchParams()
  const { appointments, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const userAppointments = useMemo(() => appointments.filter((appointment) => appointment.userId === currentUser?.id), [appointments, currentUser?.id])
  const requested = userAppointments.find((appointment) => appointment.id === searchParams.get('id'))
  const first = requested || userAppointments[0]
  const initialDate = first?.dateIso ? fromIsoDate(first.dateIso) : new Date()
  const [rangeStart, setRangeStart] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [selectedId, setSelectedId] = useState(() => first?.id || null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [rescheduleTarget, setRescheduleTarget] = useState(null)

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return userAppointments.filter((appointment) => {
      if (query && !`${appointment.astrologer || ''} ${appointment.type || ''} ${appointment.orderId || ''} ${appointment.id || ''}`.toLowerCase().includes(query)) return false
      if (filter === 'upcoming') return isAppointmentUpcoming(appointment)
      if (filter === 'completed') return appointmentStatusBucket(appointment.status) === 'completed'
      if (filter === 'cancelled') return appointmentStatusBucket(appointment.status) === 'cancelled'
      if (filter === 'rescheduled') return Boolean(appointment.rescheduledTo || appointment.rescheduledFrom || appointment.status === 'Rescheduled')
      return true
    })
  }, [filter, search, userAppointments])

  const selectedIso = toIsoDate(selectedDate)
  const dayAppointments = filteredAppointments.filter((appointment) => appointment.dateIso === selectedIso)
  const selectedAppointment = dayAppointments.find((appointment) => appointment.id === selectedId) || dayAppointments[0] || null
  const selectedWindow = selectedAppointment ? resolveAppointmentWindow(selectedAppointment) : null

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

  const cancelAppointment = (appointment) => {
    actions.cancelAppointment(appointment.id, appointment)
    setNotice('Appointment cancelled successfully.')
  }

  return <div className="apt-page user-appointment-history">
    <PageHeader eyebrow="User portal" title="My Appointments" subtitle="View and manage your consultation appointments" showBack backTo={routes.dashboard} />
    <div className="apt-history-toolbar"><div className="apt-history-filters"><div className="apt-history-tabs">{FILTERS.map((item) => <button type="button" key={item.key} className={filter === item.key ? 'is-active' : ''} onClick={() => setFilter(item.key)}>{item.label}</button>)}</div></div><div className="apt-history-search"><div className="apt-calendar-search"><Search size={15} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search appointments..." aria-label="Search appointments" /></div></div></div>
    <div className="apt-main apt-main--history">
      <div className="apt-calendar-col apt-history-calendar-col"><HistoryCalendar appointments={filteredAppointments} rangeStart={rangeStart} onRangeChange={setRangeStart} onSelectDate={selectDate} selectedDate={selectedDate} /></div>
      <aside className="apt-side-col apt-history-day-col">
        <Card className="apt-side-panel"><div className="apt-side-head apt-history-day-head"><span>{formatDisplayDate(selectedIso, true)}</span><span>{dayAppointments.length} appointment{dayAppointments.length === 1 ? '' : 's'}</span></div><div className="user-appointment-list"><>{dayAppointments.length ? dayAppointments.map((appointment) => <UserAppointmentCard key={appointment.id} appointment={appointment} selected={appointment.id === selectedAppointment?.id} onSelect={selectAppointment} onReschedule={setRescheduleTarget} onCancel={cancelAppointment} />) : <div className="apt-history-empty apt-history-empty--day"><CalendarDays size={20} /><strong>No appointments this day</strong><span>Select another date to see your appointments.</span></div>}</></div></Card>
        {selectedAppointment ? <Card className="apt-side-panel apt-history-detail-card"><div className="apt-side-head"><span>Appointment Details</span><StatusBadge label={selectedAppointment.status || 'Booked'} /></div><div className="user-appointment-detail-heading"><span className="user-appointment-avatar user-appointment-avatar--large">{initials(selectedAppointment.astrologer)}</span><div><strong>{selectedAppointment.astrologer || 'Astrologer'}</strong><p>{selectedAppointment.specialization || 'Vedic Astrology'}</p></div></div><div className="apt-history-detail-grid"><DetailField label="Consultation" value={selectedAppointment.type || 'Audio Call'} icon={Headphones} /><DetailField label="Date" value={dateLabel(selectedAppointment)} icon={CalendarDays} /><DetailField label="Time" value={selectedWindow ? formatTimeRange(selectedWindow.startMin, selectedWindow.endMin) : selectedAppointment.time} icon={Clock3} /><DetailField label="Duration" value={selectedAppointment.duration || `${selectedWindow.endMin - selectedWindow.startMin} min`} icon={Clock3} /><DetailField label="Amount paid" value={`₹${Number(selectedAppointment.price || selectedAppointment.amount || 0).toLocaleString('en-IN')}`} icon={WalletCards} /><DetailField label="Appointment ID" value={selectedAppointment.orderId || selectedAppointment.id} icon={CalendarCheck2} /></div><div className="user-appointment-actions">{CANCELLABLE_STATUSES.includes(selectedAppointment.status) && <button type="button" className="btn btn-danger" onClick={() => cancelAppointment(selectedAppointment)}>Cancel Appointment</button>}{appointmentStatusBucket(selectedAppointment.status) === 'completed' && <Link to={routes.astrologers} className="btn btn-primary">Book Again</Link>}</div></Card> : <Card className="apt-history-empty apt-history-empty--detail"><CalendarDays size={24} /><strong>No appointment selected</strong><span>Select a date with an appointment to view its details.</span></Card>}
      </aside>
    </div>
    {rescheduleTarget && <RescheduleModal appointment={rescheduleTarget} appointments={userAppointments} astrologerId={rescheduleTarget.astrologerId} onClose={() => setRescheduleTarget(null)} />}
    {notice && <SuccessAlert variant="user" message={notice} onDismiss={() => setNotice('')} />}
  </div>
}
