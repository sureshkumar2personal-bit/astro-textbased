import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, Download, Eye, FileText, Hash, Languages, Phone, PhoneCall, Timer, UserRound, Wallet, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import RescheduleModal from './astrologer/appointments/RescheduleModal.jsx'
import HistoryCalendar from './astrologer/appointments/HistoryCalendar.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes, ROLES } from '../utils/roleRoutes.js'
import { appointmentStatusBucket, formatDisplayDate, formatTimeRange, fromIsoDate, resolveAppointmentWindow, toIsoDate } from '../utils/appointments.js'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
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
  const bucket = appointmentStatusBucket(appointment.status)
  const statusLabel = appointment.status === 'Confirmed' ? 'Booked' : appointment.status || 'Booked'
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
        <span>Appointment ID: {appointment.orderId || appointment.id}</span>
      </div>
      <div className="user-appointment-card__actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={(event) => { event.stopPropagation(); onViewDetails(appointment) }}>View Details</button>
        {appointment.status === 'Pending' && <button type="button" className="btn btn-outline btn-sm" onClick={(event) => { event.stopPropagation(); onReschedule(appointment) }}>Reschedule</button>}
        {CANCELLABLE_STATUSES.includes(appointment.status) && <button type="button" className="btn btn-danger btn-sm" onClick={(event) => { event.stopPropagation(); onCancel(appointment) }}>Cancel Appointment</button>}
      </div>
    </article>
  )
}

function UserDetailRow({ icon: Icon, label, value }) {
  return (
    <div className="apt-detail-row">
      <span className="apt-detail-label"><Icon size={14} /> {label}</span>
      <span className="apt-detail-value">{value == null || value === '' ? 'Not available' : value}</span>
    </div>
  )
}

function UserHoroscopeSection({ appointment }) {
  const horoscope = appointment.horoscope
  if (!horoscope) {
    return (
      <section className="apt-detail-card apt-horoscope-section">
        <div className="apt-detail-row">
          <span className="apt-detail-label"><FileText size={14} /> Horoscope</span>
          <span className="apt-detail-value apt-horoscope-empty">Horoscope not uploaded yet</span>
        </div>
      </section>
    )
  }

  const uploadedDate = horoscope.uploadedAt
    ? new Date(horoscope.uploadedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  return (
    <section className="apt-detail-card apt-horoscope-section">
      <div className="apt-detail-row">
        <span className="apt-detail-label"><FileText size={14} /> Horoscope</span>
        <span className="apt-detail-value apt-horoscope-file">{horoscope.name || 'Uploaded horoscope'}</span>
      </div>
      <div className="apt-detail-row"><span className="apt-detail-label">Type</span><span className="apt-detail-value">{horoscope.type}</span></div>
      <div className="apt-detail-row"><span className="apt-detail-label">Size</span><span className="apt-detail-value">{horoscope.size || `${horoscope.sizeBytes || 0} KB`}</span></div>
      <div className="apt-detail-row"><span className="apt-detail-label">Uploaded</span><span className="apt-detail-value">{uploadedDate || 'Not available'}</span></div>
      <div className="apt-horoscope-actions">
        {horoscope.dataUrl && <a className="btn btn-outline" href={horoscope.dataUrl} target="_blank" rel="noreferrer"><Eye size={14} /> View</a>}
        {horoscope.dataUrl && <a className="btn btn-outline" href={horoscope.dataUrl} download={horoscope.name || 'horoscope'} rel="noreferrer"><Download size={14} /> Download</a>}
      </div>
    </section>
  )
}

function UserAppointmentDetailsDrawer({ appointment, currentUser, onClose }) {
  if (!appointment) return null
  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  const status = appointment.status || 'Booked'
  const customerName = appointment.customerName || currentUser?.name || 'Not available'
  const astrologerName = appointment.astrologer || customerName
  const paymentStatus = appointment.paymentStatus || (appointment.status?.toLowerCase().includes('cancel') ? appointment.refundStatus || 'Refunded' : 'Paid')
  const amount = appointment.amount ?? appointment.price
  const bookingDate = appointment.bookingDate || (appointment.bookedAt ? new Date(appointment.bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '')
  const notes = appointment.privateNotes || appointment.notes

  return createPortal(
    <div className="apt-drawer-overlay" onClick={onClose}>
      <aside className="apt-drawer" role="dialog" aria-modal="true" aria-labelledby="user-apt-drawer-title" onClick={(event) => event.stopPropagation()}>
        <header className="apt-drawer-head">
          <div className="apt-drawer-head-copy">
            <h2 id="user-apt-drawer-title">Appointment Details</h2>
            <StatusBadge label={status} className="apt-drawer-status" />
          </div>
          <button type="button" className="icon-btn" aria-label="Close appointment details" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="apt-drawer-body">
          <div className="apt-customer">
            <span className="user-appointment-avatar user-appointment-avatar--large">{initials(customerName)}</span>
            <div className="apt-customer-copy">
              <div className="apt-customer-name">
                {appointment.astrologerId ? <Link className="apt-customer-name--link" to={`/user/astrologer/${appointment.astrologerId}`}>{astrologerName}</Link> : astrologerName}
              </div>
              <div className="apt-customer-order">Appointment ID: {appointment.orderId || appointment.id}</div>
            </div>
          </div>

          <section className="apt-drawer-summary">
            <div className="apt-drawer-summary-time">{formatTimeRange(startMin, endMin)}</div>
            <div className="apt-drawer-summary-calltype"><PhoneCall size={14} /> {appointment.type || 'Audio Call'}</div>
          </section>

          <section className="apt-detail-card">
            <UserDetailRow icon={UserRound} label="Customer" value={customerName} />
            <UserDetailRow icon={Phone} label="Phone" value={appointment.customerPhone || currentUser?.phone} />
            <UserDetailRow icon={Languages} label="Language" value={appointment.language || appointment.lang} />
            <UserDetailRow icon={Hash} label="Topic" value={appointment.topic} />
          </section>

          <section className="apt-detail-card">
            <UserDetailRow icon={CalendarDays} label="Date" value={formatDisplayDate(appointment.dateIso, true)} />
            <UserDetailRow icon={Clock3} label="Time" value={formatTimeRange(startMin, endMin)} />
            <UserDetailRow icon={PhoneCall} label="Appointment Type" value={appointment.type || 'Audio Call'} />
            <UserDetailRow icon={Timer} label="Duration" value={appointment.duration || `${endMin - startMin} Minutes`} />
          </section>

          <section className="apt-detail-card">
            <UserDetailRow icon={Wallet} label="Payment" value={paymentStatus} />
            <UserDetailRow icon={Wallet} label="Amount" value={amount == null ? '' : `₹${Number(amount).toLocaleString('en-IN')}`} />
            <UserDetailRow icon={Wallet} label="Payment Method" value={appointment.paymentMethod} />
            <UserDetailRow icon={Hash} label="Transaction ID" value={appointment.transactionId} />
          </section>

          <section className="apt-detail-card">
            <UserDetailRow icon={CalendarDays} label="Booking Date" value={bookingDate} />
            <UserDetailRow icon={Wallet} label="Current Status" value={status} />
          </section>

          <UserHoroscopeSection appointment={appointment} />

          <section className="apt-detail-card apt-detail-card--notes apt-user-astrologer-notes">
            <div className="apt-private-notes-head"><span>Astrologer Notes</span><span className="apt-private-notes-private">Only you can see</span></div>
            <div className="apt-user-astrologer-notes-content" aria-readonly="true">{notes || 'No astrologer notes are available for this appointment.'}</div>
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  )
}

function AddedCompactAppointmentCard({ appointment, onSelect }) {
  if (!appointment) return null
  const window = resolveAppointmentWindow(appointment)
  const statusLabel = appointment.status === 'Confirmed' ? 'Booked' : appointment.status || 'Booked'

  return (
    <Card
      className={`apt-side-panel added-compact-appointment-card${onSelect ? ' is-clickable' : ''}`}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(appointment) : undefined}
      onKeyDown={onSelect ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(appointment) } } : undefined}
    >
      <div className="added-compact-appointment-card__top">
        <div className="added-compact-appointment-card__profile">
          <span className="user-appointment-avatar">{initials(appointment.astrologer)}</span>
          <div><strong>{appointment.astrologer || 'Astrologer'}</strong><span>{appointment.specialization || 'Vedic Astrology'}</span></div>
        </div>
        <StatusBadge label={statusLabel} />
      </div>
      <div className="added-compact-appointment-card__meta">
        <span><PhoneCall size={13} /> {appointment.type || 'Audio Call'}</span>
        <strong><Clock3 size={13} /> {formatTimeRange(window.startMin, window.endMin)}</strong>
      </div>
      <div className="added-compact-appointment-card__footer">
        <span>Appointment ID: {appointment.orderId || appointment.id}</span>
        <strong>₹{Number(appointment.price || appointment.amount || 0).toLocaleString('en-IN')}</strong>
      </div>
    </Card>
  )
}

export default function AppointmentDetails() {
  const [searchParams] = useSearchParams()
  const { appointments, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
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
    if (filter === 'pending') return appointment.status === 'Pending' || (appointmentStatusBucket(appointment.status) === 'booked' && !appointment.rescheduledFrom && !appointment.rescheduledTo)
    if (filter === 'completed') return appointmentStatusBucket(appointment.status) === 'completed'
    if (filter === 'cancelled') return appointmentStatusBucket(appointment.status) === 'cancelled'
    if (filter === 'rescheduled') return Boolean(appointment.rescheduledTo || appointment.rescheduledFrom || appointment.status === 'Rescheduled')
    return true
  }), [filter, userAppointments])

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

  return <div className="apt-page user-appointment-history">
    <PageHeader eyebrow="User portal" title="My Appointments" subtitle="View and manage your consultation appointments" showBack backTo={routes.dashboard} />
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
    <UserAppointmentDetailsDrawer appointment={detailsAppointment} currentUser={currentUser} onClose={() => setDetailsAppointment(null)} />
    {rescheduleTarget && <RescheduleModal appointment={rescheduleTarget} appointments={userAppointments} astrologerId={rescheduleTarget.astrologerId} onClose={() => setRescheduleTarget(null)} />}
    {notice && <SuccessAlert variant="user" message={notice} onDismiss={() => setNotice('')} />}
  </div>
}
