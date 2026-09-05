import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Search, X } from 'lucide-react'
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
import RescheduleModal from './RescheduleModal.jsx'
import { callTypeMeta } from './meta.jsx'
import {
  resolveAppointmentWindow,
  formatTimeRange,
  formatDisplayDate,
  toIsoDate,
  isCancelledStatus,
  appointmentStatusBucket,
  isAppointmentUpcoming,
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

const SUMMARY_BUCKETS = [
  { key: 'total', label: 'Total' },
  { key: 'booked', label: 'Booked' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

function summaryCounts(appointments) {
  const total = appointments.length
  const booked = appointments.filter((appointment) => appointmentStatusBucket(appointment.status) === 'booked').length
  const completed = appointments.filter((appointment) => appointmentStatusBucket(appointment.status) === 'completed').length
  const cancelled = appointments.filter((appointment) => appointmentStatusBucket(appointment.status) === 'cancelled').length
  return { total, booked, completed, cancelled }
}

function DateSummary({ dayAppointments, active, onFilter }) {
  const counts = summaryCounts(dayAppointments)
  const toneByKey = { total: '', booked: 'is-booked', completed: 'is-completed', cancelled: 'is-cancelled' }

  return (
    <div className="apt-history-summary" role="group" aria-label="Day summary filters">
      {SUMMARY_BUCKETS.map((bucket) => (
        <button
          type="button"
          key={bucket.key}
          className={active === bucket.key ? 'is-active' : ''}
          onClick={() => onFilter(bucket.key)}
          aria-pressed={active === bucket.key}
        >
          <strong className={toneByKey[bucket.key]}>{counts[bucket.key]}</strong>
          <span>{bucket.label}</span>
        </button>
      ))}
    </div>
  )
}

// Day appointments list shown for the selected date.
function DayAppointmentsList({ appointments, allHistory = [], onSelect, emptyTitle, emptyHint }) {
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
        const Icon = meta.icon
        const { startMin, endMin } = resolveAppointmentWindow(appointment)
        const isCancelled = isCancelledStatus(appointment.status)
        const isRescheduledOriginal = Boolean(appointment.rescheduledTo)
        const isRescheduleReplacement = Boolean(appointment.rescheduledFrom)
        const rescheduleLabel = isRescheduledOriginal
          ? `Rescheduled → ${linkedLabel(appointment.rescheduledTo) || 'new slot'}`
          : isRescheduleReplacement
            ? `Rescheduled from ${linkedLabel(appointment.rescheduledFrom) || 'original'}`
            : null
        return (
          <button
            type="button"
            key={appointment.id}
            className={`apt-history-item${isCancelled ? ' is-cancelled' : ''}${rescheduleLabel ? ' is-rescheduled' : ''}`}
            onClick={() => onSelect(appointment)}
          >
            <div className="apt-history-item__top">
              <strong>{appointment.customerName || 'Customer'}</strong>
              <StatusBadge label={appointment.status || 'Booked'} />
            </div>
            <div className="apt-history-item__meta">
              <span><Icon size={12} /> {meta.label}</span>
              <span>{formatTimeRange(startMin, endMin)}</span>
            </div>
            <div className="apt-history-item__footer">
              <span>#{appointment.orderId || appointment.id}</span>
              <span>₹{Number(appointment.amount || appointment.price || 0).toLocaleString('en-IN')}</span>
            </div>
            {rescheduleLabel && (
              <div className="apt-history-item__reschedule">{rescheduleLabel}</div>
            )}
          </button>
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
  const [callAppointment, setCallAppointment] = useState(null)
  const selectedAppointment = selectedAppointmentId
    ? appointments.find((appointment) => appointment.id === selectedAppointmentId) || null
    : null
  const [cancelTarget, setCancelTarget] = useState(null)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [dayFilter, setDayFilter] = useState('total')

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

      const bucket = appointmentStatusBucket(appointment.status)
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

  const visibleDayAppointments = useMemo(() => {
    if (dayFilter === 'total') return dayAppointments
    if (dayFilter === 'booked') {
      return dayAppointments.filter((appointment) => appointmentStatusBucket(appointment.status) === 'booked')
    }
    if (dayFilter === 'completed') {
      return dayAppointments.filter((appointment) => appointmentStatusBucket(appointment.status) === 'completed')
    }
    if (dayFilter === 'cancelled') {
      return dayAppointments.filter((appointment) => appointmentStatusBucket(appointment.status) === 'cancelled')
    }
    return dayAppointments
  }, [dayAppointments, dayFilter])

  const openDetails = (appointment) => setSelectedAppointmentId(appointment.id)

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
    actions.saveConsultation(payload)
    success('Consultation saved successfully')
  }

  const savePrivateNotes = (appointmentId, notes) => {
    actions.savePrivateNotes(appointmentId, notes)
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
    <div className={`apt-page${selectedAppointment ? ' is-drawer-open' : ''}`}>
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
        </div>
      </div>

      <div className="apt-main apt-main--history">
        <div className="apt-calendar-col apt-history-calendar-col">
          <HistoryCalendar
            appointments={filteredAppointments}
            rangeStart={rangeStart}
            onRangeChange={setRangeStart}
            onSelectDate={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>

        <aside className="apt-side-col apt-history-day-col">
          <Card className="apt-side-panel">
            <div className="apt-side-head apt-history-day-head">
              <span>{formatDisplayDate(selectedIso, true)}</span>
            </div>
            <DateSummary dayAppointments={dayAppointments} active={dayFilter} onFilter={setDayFilter} />
          </Card>

          <Card className="apt-side-panel">
            <div className="apt-side-head">
              Appointments
            </div>
            <DayAppointmentsList
              appointments={visibleDayAppointments}
              allHistory={myAppointments}
              onSelect={openDetails}
              emptyTitle={dayAppointments.length ? `No ${dayFilter === 'cancelled' ? 'cancelled' : dayFilter} appointments` : 'No appointments this day'}
              emptyHint={dayAppointments.length ? 'Try another category in the summary above.' : 'Select another date to see its appointments.'}
            />
          </Card>
        </aside>
      </div>

      {selectedAppointment && (
        <AppointmentDetailsDrawer
          appointment={selectedAppointment}
          appointments={appointments}
          consultation={selectedConsultation}
          inProgress={false}
          onClose={() => setSelectedAppointmentId(null)}
          onStartCall={startCall}
          onViewProfile={viewProfile}
          onSaveConsultation={saveConsultation}
          onSavePrivateNotes={savePrivateNotes}
          onSavePreCallAnalysis={savePreCallAnalysis}
          onCancel={() => setCancelTarget(selectedAppointment)}
          onReschedule={() => {
            setRescheduleTarget(selectedAppointment)
            setSelectedAppointmentId(null)
          }}
        />
      )}

      {callAppointment && (
        <AppointmentCallScreen
          appointment={callAppointment}
          onEnd={() => setCallAppointment(null)}
          onSaveConsultation={saveConsultation}
          onCompleteCall={completeAppointmentCall}
          onSavePrivateNotes={savePrivateNotes}
          onSavePreCallAnalysis={savePreCallAnalysis}
        />
      )}

      <CancelModal
        open={Boolean(cancelTarget)}
        appointment={cancelTarget}
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleCancel}
      />

      {rescheduleTarget && (
        <RescheduleModal
          appointment={rescheduleTarget}
          appointments={myAppointments}
          astrologerId={astrologerId}
          onClose={() => setRescheduleTarget(null)}
        />
      )}
    </div>
  )
}
