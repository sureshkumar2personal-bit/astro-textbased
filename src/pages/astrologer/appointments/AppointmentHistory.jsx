import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, List, Search, X } from 'lucide-react'
import './appointmenthistory.css'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { useToast } from '../../../components/Toast.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import Card from '../../../components/ui/Card.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import HistoryCalendar from './HistoryCalendar.jsx'
import AppointmentDetailsDrawer from './AppointmentDetailsDrawer.jsx'
import AppointmentCallScreen from './AppointmentCallScreen.jsx'
import { callTypeMeta } from './meta.jsx'
import {
  resolveAppointmentWindow,
  formatTimeRange,
  formatDisplayDate,
  toIsoDate,
  isCancelledStatus,
  appointmentStatusBucket,
  isAppointmentUpcoming,
  getAppointmentDisplayStatus,
  APPOINTMENT_STATUS,
} from '../../../utils/appointments.js'

const HISTORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'rescheduled', label: 'Rescheduled' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

const STATUS_OPTIONS = [
  { key: 'all', label: 'All statuses' },
  { key: APPOINTMENT_STATUS.BOOKED, label: 'Booked' },
  { key: 'rescheduled', label: 'Rescheduled' },
  { key: APPOINTMENT_STATUS.COMPLETED, label: 'Completed' },
  { key: APPOINTMENT_STATUS.CANCELLED_BY_ASTROLOGER, label: 'Cancelled by Astrologer' },
  { key: APPOINTMENT_STATUS.CANCELLED_BY_USER, label: 'Cancelled by User' },
  { key: APPOINTMENT_STATUS.NO_SHOW, label: 'No-show' },
  { key: APPOINTMENT_STATUS.AUTO_CANCELLED, label: 'Auto-cancelled' },
]

// Day appointments list shown for the selected date.
function AppointmentInlineDetails({ appointment, consultation }) {
  const meta = callTypeMeta(appointment.callType)
  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  const amount = appointment.amount != null ? `₹${Number(appointment.amount).toLocaleString('en-IN')}` : 'Not available'
  const displayStatus = getAppointmentDisplayStatus(appointment) === APPOINTMENT_STATUS.REFUNDED
    ? 'Refund'
    : getAppointmentDisplayStatus(appointment)

  return (
    <div className="apt-inline-details" role="region" aria-label={`Details for ${appointment.customerName || 'appointment'}`}>
      <div className="apt-inline-details__heading">
        <div>
          <strong>Appointment Details</strong>
          <span>{appointment.customerName || 'Customer'} · {appointment.orderId || appointment.id}</span>
        </div>
        <StatusBadge label={displayStatus || 'Booked'} />
      </div>
      <div className="apt-inline-details__grid">
        <div><small>Date &amp; time</small><strong>{formatDisplayDate(appointment.dateIso, true)} · {formatTimeRange(startMin, endMin)}</strong></div>
        <div><small>Appointment type</small><strong>{meta.label}</strong></div>
        <div><small>Topic</small><strong>{appointment.topic || 'Not available'}</strong></div>
        <div><small>Payment</small><strong>{appointment.paymentStatus || 'Paid'} · {amount}</strong></div>
      </div>
      {appointment.note && <p className="apt-inline-details__note"><small>Note</small>{appointment.note}</p>}
      {consultation?.summary && <p className="apt-inline-details__note"><small>Consultation summary</small>{consultation.summary}</p>}
    </div>
  )
}

function DayAppointmentsList({ appointments, allHistory = [], onSelect, emptyTitle, emptyHint, showDate = false, inline = false, expandedId = null, onToggle }) {
  if (!appointments.length) {
    return (
      <div className="apt-history-empty apt-history-empty--day">
        <CalendarDays size={20} />
        <strong>{emptyTitle || 'No appointments this day'}</strong>
        <span>{emptyHint || 'Select another date to see its appointments.'}</span>
      </div>
    )
  }

  const linkedLabel = (id) => {
    const linked = allHistory.find((item) => item.id === id)
    if (!linked) return null
    const dateText = linked.dateIso ? formatDisplayDate(linked.dateIso) : (linked.date || '')
    return `${dateText}${linked.time ? ` · ${linked.time}` : ''}`
  }

  return (
    <div className="apt-history-list">
      {appointments.map((appointment) => {
        const meta = callTypeMeta(appointment.callType)
        const { startMin, endMin } = resolveAppointmentWindow(appointment)
        const isCancelled = isCancelledStatus(appointment.status)
        const isRescheduledOriginal = Boolean(appointment.rescheduledTo)
        const isRescheduleReplacement = Boolean(appointment.rescheduledFrom)
        // Mirrors the exact same logic the top status filter tabs use (see
        // `filteredAppointments` above), so a card's status pill always
        // matches whichever filter surfaced it — e.g. an appointment shown
        // under "Rescheduled" always reads "Rescheduled" here too, even if
        // its own `status` field is still "Booked" (a rescheduled slot's
        // replacement keeps a normal Booked status but carries
        // `rescheduledFrom`).
        const displayStatus = getAppointmentDisplayStatus(appointment) === APPOINTMENT_STATUS.REFUNDED
          ? 'Refund'
          : getAppointmentDisplayStatus(appointment)
        const rescheduleLabel = isRescheduledOriginal
          ? `Rescheduled → ${linkedLabel(appointment.rescheduledTo) || 'new slot'}`
          : isRescheduleReplacement
            ? `Rescheduled from ${linkedLabel(appointment.rescheduledFrom) || 'original'}`
            : null
        const customerName = appointment.customerName || 'Customer'
        const hasAnalysis = Boolean(String(appointment.preCallAnalysis || '').trim())
        const avatarInitials = customerName.split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AS'
        const toggle = () => (inline ? onToggle(appointment) : onSelect(appointment))
        return (
          <div className={`apt-history-row${inline ? ' is-inline' : ''}`} key={appointment.id}>
            <article
              className={`apt-history-item${isCancelled ? ' is-cancelled' : ''}${rescheduleLabel ? ' is-rescheduled' : ''}`}
              role="button"
              tabIndex={0}
              onClick={toggle}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggle()
                }
              }}
            >
            <div className="apt-history-item__time">
              <strong>{formatTimeRange(startMin, endMin).split(' – ')[0]}</strong>
              <span>{formatTimeRange(startMin, endMin).split(' – ')[1] || ''}</span>
            </div>
            <span className="apt-history-item__avatar">{avatarInitials}</span>
            <div className="apt-history-item__identity">
              <strong>{customerName}</strong>
              <span>{meta.label}{appointment.topic ? ` · ${appointment.topic}` : ''}</span>
              {showDate && <small className="apt-history-item__date">{formatDisplayDate(appointment.dateIso, true)}</small>}
              <small>Order {String(appointment.orderId || appointment.id).startsWith('#') ? (appointment.orderId || appointment.id) : `#${appointment.orderId || appointment.id}`}</small>
            </div>
            <StatusBadge label={displayStatus} />
            <button type="button" className="apt-history-item__view" onClick={(event) => { event.stopPropagation(); toggle() }}>{inline && expandedId === appointment.id ? 'Hide' : 'View'}</button>
            {rescheduleLabel && (
              <div className="apt-history-item__reschedule">{rescheduleLabel}</div>
            )}
            {hasAnalysis && <span className="apt-history-item__analysis is-saved">✓ Analysis Saved</span>}
            </article>
            {inline && expandedId === appointment.id && <AppointmentInlineDetails appointment={appointment} consultation={null} />}
          </div>
        )
      })}
    </div>
  )
}

// Astrologer cancellation confirmation modal — no date/time selection.
function CancelModal({ open, appointment, onCancel, onConfirm }) {
  if (!open || !appointment) return null
  return (
    <div className="apt-drawer-overlay apt-cancel-overlay" onClick={onCancel}>
      <div className="apt-cancel-modal" role="dialog" aria-modal="true" aria-labelledby="apt-cancel-title" onClick={(event) => event.stopPropagation()}>
        <header className="apt-cancel-modal__head">
          <div>
            <h2 id="apt-cancel-title">Cancel Appointment</h2>
            <p>Cancel the appointment with {appointment.customerName}.</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onCancel}><X size={18} /></button>
        </header>
        <div className="apt-cancel-modal__body">
          <div className="apt-cancel-modal__copy">
            <div><span>Date</span><strong>{formatDisplayDate(appointment.dateIso, true)}</strong></div>
            <div><span>Time</span><strong>{formatTimeRange(resolveAppointmentWindow(appointment).startMin, resolveAppointmentWindow(appointment).endMin)}</strong></div>
            <p>
              The original appointment will be preserved in history as
              <strong> Cancelled by Astrologer</strong>. The original date, time and booking details remain available,
              and the user may receive a refund or reschedule (no second payment).
            </p>
          </div>
        </div>
        <footer className="apt-cancel-modal__foot">
          <button type="button" className="btn btn-outline" onClick={onCancel}>Keep Appointment</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}><X size={15} /> Cancel Appointment</button>
        </footer>
      </div>
    </div>
  )
}

export default function AppointmentHistory() {
  const { currentUser } = useAuth()
  const { appointments, consultations, actions } = useAppData()
  const { success } = useToast()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id

  const [rangeStart, setRangeStart] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null)
  const [expandedAppointmentId, setExpandedAppointmentId] = useState(null)
  const [callAppointment, setCallAppointment] = useState(null)
  const selectedAppointment = selectedAppointmentId
    ? appointments.find((appointment) => appointment.id === selectedAppointmentId) || null
    : null
  const [cancelTarget, setCancelTarget] = useState(null)
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [displayView, setDisplayView] = useState('list')
  const [listRangeView, setListRangeView] = useState('month')

  // Keep the selected day inside the visible calendar month. The calendar's
  // prev/next arrows move the month without touching the selected date, so this
  // re-anchors the day panel to the newly visible month (clamping to its last
  // day). The month/year picker and Today already set the selected date itself.
  useEffect(() => {
    const year = rangeStart.getFullYear()
    const month = rangeStart.getMonth()
    const selectedInMonth = selectedDate.getFullYear() === year && selectedDate.getMonth() === month
    if (selectedInMonth) return
    const lastDay = new Date(year, month + 1, 0).getDate()
    setSelectedDate(new Date(year, month, Math.min(selectedDate.getDate(), lastDay)))
  }, [rangeStart, selectedDate])

  const myAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.astrologerId === astrologerId)
        .sort((a, b) => {
          if (a.dateIso !== b.dateIso) return (a.dateIso || '').localeCompare(b.dateIso || '')
          return resolveAppointmentWindow(a).startMin - resolveAppointmentWindow(b).startMin
        }),
    [appointments, astrologerId],
  )

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return myAppointments.filter((appointment) => {
      const matchesSearch = !query || (
        appointment.customerName?.toLowerCase().includes(query) ||
        appointment.orderId?.toLowerCase().includes(query) ||
        appointment.topic?.toLowerCase().includes(query)
      )
      if (!matchesSearch) return false

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'rescheduled'
          ? Boolean(appointment.rescheduledTo || appointment.rescheduledFrom)
          : appointment.status === statusFilter)
      if (!matchesStatus) return false

      const bucket = appointmentStatusBucket(appointment)
      if (filter === 'upcoming') return isAppointmentUpcoming(appointment, new Date())
      if (filter === 'completed') return bucket === 'completed'
      if (filter === 'cancelled') return bucket === 'cancelled'
      if (filter === 'rescheduled') return Boolean(appointment.rescheduledTo || appointment.rescheduledFrom)
      return true
    })
  }, [myAppointments, filter, statusFilter, search])

  const selectedIso = selectedDate ? toIsoDate(selectedDate) : null
  const dayAppointments = useMemo(
    () =>
      filteredAppointments
        .filter((appointment) => appointment.dateIso === selectedIso)
        .sort((a, b) => resolveAppointmentWindow(a).startMin - resolveAppointmentWindow(b).startMin),
    [filteredAppointments, selectedIso],
  )

  const listAppointments = useMemo(() => {
    if (listRangeView === 'day') {
      const dayIso = toIsoDate(selectedDate)
      return filteredAppointments.filter((appointment) => appointment.dateIso === dayIso)
    }

    if (listRangeView === 'week') {
      const weekStart = new Date(rangeStart)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      return filteredAppointments.filter((appointment) => {
        const date = new Date(`${appointment.dateIso}T00:00:00`)
        return date >= weekStart && date < weekEnd
      })
    }

    return filteredAppointments.filter((appointment) => {
      const date = new Date(`${appointment.dateIso}T00:00:00`)
      return date.getFullYear() === rangeStart.getFullYear() && date.getMonth() === rangeStart.getMonth()
    })
  }, [filteredAppointments, listRangeView, rangeStart, selectedDate])

  const shiftListRange = (direction) => {
    if (listRangeView === 'day') {
      const next = new Date(selectedDate)
      next.setDate(next.getDate() + direction)
      setSelectedDate(next)
      setRangeStart(next)
      return
    }

    if (listRangeView === 'week') {
      setRangeStart((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + direction * 7))
      return
    }

    setRangeStart((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1))
  }

  const listRangeLabel = listRangeView === 'day'
    ? formatDisplayDate(toIsoDate(selectedDate), true)
    : listRangeView === 'week'
      ? `Week of ${formatDisplayDate(toIsoDate(new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() - rangeStart.getDay())), true)}`
      : rangeStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const openDetails = (appointment) => {
    setSelectedAppointmentId(appointment.id)
    actions.viewAppointment(appointment.id)
  }

  const toggleInlineDetails = (appointment) => {
    setExpandedAppointmentId((current) => current === appointment.id ? null : appointment.id)
    actions.viewAppointment(appointment.id)
  }

  const viewProfile = (userId) => {
    if (!userId) return
    navigate(`/astrologer/audience/follower/${userId}`)
  }

  const startCall = (appointment) => {
    setCallAppointment(appointment)
    setSelectedAppointmentId(null)
  }

  const selectedConsultation = selectedAppointment
    ? consultations.find((consultation) => consultation.appointmentId === selectedAppointment.id)
    : null

  const saveConsultation = (payload) => {
    const record = actions.saveConsultation(payload)
    success('Consultation saved successfully')
    return record
  }

  const savePrivateCallNotes = (appointmentId, notes) => {
    actions.savePrivateCallNotes(appointmentId, notes)
    success('Notes saved successfully')
  }

  const savePreCallAnalysis = (appointmentId, analysis) => {
    actions.savePreCallAnalysis(appointmentId, analysis)
    success('Pre-call analysis saved successfully')
  }

  const completeAppointmentCall = (appointmentId, meta) => {
    actions.completeAppointmentCall(appointmentId, meta)
    success('Appointment completed successfully')
  }

  const handleCancel = () => {
    if (!cancelTarget) return
    actions.cancelAppointmentByAstrologer(cancelTarget.id)
    success('Appointment cancelled')
    setCancelTarget(null)
    setSelectedAppointmentId(null)
  }

  const updateFilter = (key) => {
    setFilter(key)
    const params = new URLSearchParams(searchParams)
    if (key === 'all') params.delete('filter')
    else params.set('filter', key)
    navigate(`/astrologer/appointments/history?${params.toString()}`, { replace: true })
  }

  const updateStatusFilter = (key) => {
    setStatusFilter(key)
    const params = new URLSearchParams(searchParams)
    if (key === 'all') params.delete('status')
    else params.set('status', key)
    navigate(`/astrologer/appointments/history?${params.toString()}`, { replace: true })
  }

  const handleSearch = (value) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams)
    if (value) params.set('search', value)
    else params.delete('search')
    navigate(`/astrologer/appointments/history?${params.toString()}`, { replace: true })
  }

  return (
    <div className={`apt-page astro-appointment-history${selectedAppointment ? ' is-drawer-open' : ''}`}>
      <div className="apt-history-toolbar">
        <div className="apt-history-filters">
          <div className="apt-history-tabs">
            {HISTORY_FILTERS.map((tab) => (
              <button
                type="button"
                key={tab.key}
                className={filter === tab.key ? 'is-active' : ''}
                onClick={() => updateFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            className="apt-view-dropdown apt-history-status-filter"
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => updateStatusFilter(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </div>
        <div className="apt-history-search">
          <div className="apt-calendar-search">
            <Search size={15} />
            <input
              type="search"
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Search by user name, order or topic..."
              aria-label="Search appointments"
            />
          </div>
          <div className="apt-display-toggle" role="group" aria-label="Appointment display">
            <button
              type="button"
              className={displayView === 'calendar' ? 'is-active' : ''}
              aria-pressed={displayView === 'calendar'}
              onClick={() => setDisplayView('calendar')}
            >
              <CalendarDays size={15} />
              Calendar
            </button>
            <button
              type="button"
              className={displayView === 'list' ? 'is-active' : ''}
              aria-pressed={displayView === 'list'}
              onClick={() => setDisplayView('list')}
            >
              <List size={15} />
              List
            </button>
          </div>
        </div>
      </div>

      <div className={`apt-main apt-main--history${displayView === 'list' ? ' apt-main--list' : ''}`}>
        <div className="apt-calendar-col apt-history-calendar-col">
          {displayView === 'list' ? (
            <div className="apt-history-list-view" aria-label="Appointments list">
              <div className="apt-list-view-toolbar">
                <div className="apt-list-view-modes" role="tablist" aria-label="List date range">
                  {['month', 'week', 'day'].map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      role="tab"
                      aria-selected={listRangeView === mode}
                      className={listRangeView === mode ? 'is-active' : ''}
                      onClick={() => setListRangeView(mode)}
                    >
                      {mode[0].toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="apt-list-view-date-nav">
                  <button type="button" className="icon-btn" aria-label={`Previous ${listRangeView}`} onClick={() => shiftListRange(-1)}>
                    <ChevronLeft size={17} />
                  </button>
                  <strong>{listRangeLabel}</strong>
                  <button type="button" className="icon-btn" aria-label={`Next ${listRangeView}`} onClick={() => shiftListRange(1)}>
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
              <DayAppointmentsList
                appointments={listAppointments}
                allHistory={myAppointments}
                onSelect={openDetails}
                emptyTitle="No appointments match your filters"
                emptyHint="Try changing the status filter or search term."
                showDate
                inline
                expandedId={expandedAppointmentId}
                onToggle={toggleInlineDetails}
              />
            </div>
          ) : (
            <HistoryCalendar
              appointments={filteredAppointments}
              rangeStart={rangeStart}
              onRangeChange={setRangeStart}
              onSelectDate={setSelectedDate}
              selectedDate={selectedDate}
              showMonthArrows
            />
          )}
        </div>

        {displayView === 'calendar' && (
          <aside className="apt-side-col apt-history-day-col">
            <Card className="apt-side-panel">
              <div className="apt-side-head apt-history-day-head">
                <span>Appointments on {formatDisplayDate(selectedIso, true)}</span>
              </div>
              <DayAppointmentsList
                appointments={dayAppointments}
                allHistory={myAppointments}
                onSelect={openDetails}
                emptyTitle="No appointments this day"
                emptyHint="Select another date to see its appointments."
                inline
                expandedId={expandedAppointmentId}
                onToggle={toggleInlineDetails}
              />
            </Card>
          </aside>
        )}
      </div>

      {selectedAppointment && displayView === 'calendar' && (
        <AppointmentDetailsDrawer
          key={selectedAppointment.id}
          appointment={selectedAppointment}
          appointments={appointments}
          consultation={selectedConsultation}
          inProgress={false}
          onClose={() => setSelectedAppointmentId(null)}
          onStartCall={startCall}
          onViewProfile={viewProfile}
          onSaveConsultation={saveConsultation}
          onSavePrivateCallNotes={savePrivateCallNotes}
          onSavePreCallAnalysis={savePreCallAnalysis}
          onCancel={() => setCancelTarget(selectedAppointment)}
        />
      )}

      {callAppointment && (
        <AppointmentCallScreen
          appointment={callAppointment}
          consultation={consultations.find((c) => c.appointmentId === callAppointment.id)}
          onEnd={() => setCallAppointment(null)}
          onSaveConsultation={saveConsultation}
          onCompleteCall={completeAppointmentCall}
          onSavePrivateCallNotes={savePrivateCallNotes}
          onSavePreCallAnalysis={savePreCallAnalysis}
        />
      )}

      <CancelModal
        open={Boolean(cancelTarget)}
        appointment={cancelTarget}
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleCancel}
      />
    </div>
  )
}
