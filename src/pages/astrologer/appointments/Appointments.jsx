import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Eye } from 'lucide-react'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import Card from '../../../components/ui/Card.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import AppointmentCalendar from './AppointmentCalendar.jsx'
import { TemplatePreview } from './AppointmentAvailabilityPanel.jsx'
import AppointmentDetailsDrawer from './AppointmentDetailsDrawer.jsx'
import AppointmentCallScreen from './AppointmentCallScreen.jsx'
import { callTypeMeta } from './meta.jsx'
import {
  getAppointmentPhase,
  resolveAppointmentWindow,
  formatTimeRange,
  useNow,
  toIsoDate,
} from '../../../utils/appointments.js'

const APPOINTMENT_FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'history', label: 'History' },
]

function monthKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function TodayPanel({ appointments, _now, onSelect }) {
  const todayIso = toIsoDate(new Date())
  const todayApps = appointments
    .filter((a) => a.dateIso === todayIso)
    .sort((a, b) => resolveAppointmentWindow(a).startMin - resolveAppointmentWindow(b).startMin)

  if (!todayApps.length) {
    return (
      <Card className="apt-side-panel">
        <div className="apt-side-head">Today's Appointments</div>
        <div className="apt-side-empty">No appointments today</div>
      </Card>
    )
  }

  return (
    <Card className="apt-side-panel">
      <div className="apt-side-head">Today's Appointments</div>
      {todayApps.map((appt) => {
        const meta = callTypeMeta(appt.callType)
        const Icon = meta.icon
        const { startMin, endMin } = resolveAppointmentWindow(appt)
        return (
          <div key={appt.id} className="apt-side-item" onClick={() => onSelect(appt)}>
            <div className="apt-side-time">{formatTimeRange(startMin, endMin)}</div>
            <div className="apt-side-name">
              <Icon size={12} />
              {appt.customerName}
            </div>
            <div className="apt-side-status">
              <StatusBadge label={appt.status} />
            </div>
          </div>
        )
      })}
    </Card>
  )
}

function CallReadyToast({ appointment, onStart }) {
  const meta = callTypeMeta(appointment.callType)
  const Icon = meta.icon
  return (
    <div className="apt-toast" role="alert">
      <div className="apt-toast-icon"><Icon size={18} /></div>
      <div className="apt-toast-content">
        <div className="apt-toast-title">Appointment starting now</div>
        <div className="apt-toast-sub">{appointment.customerName} · {meta.label}</div>
      </div>
      <button type="button" className="btn btn-primary apt-toast-btn" onClick={onStart}>
        Start Call
      </button>
    </div>
  )
}

export default function AppointmentCalendarTab() {
  const { currentUser } = useAuth()
  const { appointments, actions, astrologerServices, appointmentAvailabilityTemplates } = useAppData()
  const now = useNow(1000)
  const routes = getRoleRoutes(currentUser?.role)

  // Current astrologer id (match Layout logic)
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id

  // Filter appointments for this astrologer
  const myAppointments = useMemo(
    () => appointments.filter((a) => a.astrologerId === astrologerId).sort((a, b) => {
      // Sort by dateIso then start time
      if (a.dateIso !== b.dateIso) return (a.dateIso || '').localeCompare(b.dateIso || '')
      return resolveAppointmentWindow(a).startMin - resolveAppointmentWindow(b).startMin
    }),
    [appointments, astrologerId],
  )

  // Tabs & views
  const [activeTab, setActiveTab] = useState('upcoming')
  const [calendarView, setCalendarView] = useState('day')
  const [rangeStart, setRangeStart] = useState(() => new Date())
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [inProgressAppointment, setInProgressAppointment] = useState(null)
  const [search, setSearch] = useState('')
  const [toastAppointment, setToastAppointment] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const toastShownRef = useRef(new Set())

  // Search filter
  const filteredAppointments = useMemo(
    () =>
      myAppointments.filter((appt) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
          appt.customerName?.toLowerCase().includes(q) ||
          appt.orderId?.toLowerCase().includes(q) ||
          appt.topic?.toLowerCase().includes(q)
        )
      }),
    [myAppointments, search],
  )

  const hasPublishedAvailability = appointmentAvailabilityTemplates.some(
    (template) => template.astrologerId === astrologerId && template.status === 'Published',
  )
  const activeMonthTemplate = appointmentAvailabilityTemplates.find(
    (template) => template.astrologerId === astrologerId && template.status === 'Published' && template.monthKey === monthKeyFromDate(rangeStart),
  )

  const saveDayOverride = (dateIso, override) => {
    const template = appointmentAvailabilityTemplates.find(
      (item) => item.astrologerId === astrologerId && item.status === 'Published' && item.monthKey === dateIso.slice(0, 7),
    )
    if (!template) return
    actions.saveAppointmentAvailabilityTemplate({
      ...template,
      dateOverrides: { ...(template.dateOverrides || {}), [dateIso]: override },
    })
  }

  const clearDayOverride = (dateIso) => {
    const template = appointmentAvailabilityTemplates.find(
      (item) => item.astrologerId === astrologerId && item.status === 'Published' && item.monthKey === dateIso.slice(0, 7),
    )
    if (!template) return
    const dateOverrides = { ...(template.dateOverrides || {}) }
    delete dateOverrides[dateIso]
    actions.saveAppointmentAvailabilityTemplate({ ...template, dateOverrides })
  }

  // Detect newly "live" appointments for toast
  useEffect(() => {
    if (!hasPublishedAvailability) return
    filteredAppointments.forEach((appt) => {
      const phaseResult = getAppointmentPhase(appt, now)
      const phase = typeof phaseResult === 'string' ? phaseResult : phaseResult.phase
      if (phase === 'live' && !toastShownRef.current.has(appt.id) && appt.status !== 'Completed') {
        toastShownRef.current.add(appt.id)
        setToastAppointment(appt)
        // Auto-hide after 10s if not acted
        setTimeout(() => {
          if (toastAppointment?.id === appt.id) setToastAppointment(null)
        }, 10000)
      }
    })
  }, [now, hasPublishedAvailability, filteredAppointments, toastAppointment])

  // Handle start call
  const handleStartCall = (appointment) => {
    setInProgressAppointment(appointment)
    setToastAppointment(null)
  }

  // Handle end call -> complete
  const handleEndCall = (appointment, remedyNotes) => {
    const completedAt = new Date().toISOString()
    actions.setAppointmentStatus(appointment.id, 'Completed', {
      completedAt,
      endedAt: completedAt,
      remedyNotes,
      history: [...(appointment.history || []), 'Remedy notes recorded'],
    })
    setInProgressAppointment(null)
  }

  // Close drawer
  const closeDrawer = () => {
    if (!inProgressAppointment) setSelectedAppointment(null)
  }

  const closePreview = () => setIsPreviewOpen(false)

  // Tabs' filtered lists
  const upcomingApps = filteredAppointments.filter((a) => {
    const p = getAppointmentPhase(a, now)
    const phase = typeof p === 'string' ? p : p.phase
    return phase === 'upcoming' || phase === 'live' || phase === 'pending'
  })
  const completedApps = filteredAppointments.filter((a) => a.status === 'Completed' || (typeof getAppointmentPhase(a, now) === 'object' && getAppointmentPhase(a, now).phase === 'completed' && a.status !== 'Cancelled'))
  const cancelledApps = filteredAppointments.filter((a) => a.status === 'Cancelled')
  const calendarAppointments = activeTab === 'upcoming'
    ? upcomingApps
    : activeTab === 'completed'
    ? completedApps
    : activeTab === 'cancelled'
    ? cancelledApps
    : filteredAppointments

  return (
    <div className={`apt-calendar-page${selectedAppointment ? ' is-drawer-open' : ''}`}>
      {astrologerServices.dndEnabled && (
        <div className="apt-dyaan-banner">
          <Bell size={16} /> <strong>Dyaan Mode: ON</strong> — New bookings are paused. Existing appointments remain active.
        </div>
      )}

      {!hasPublishedAvailability ? (
        <Card className="apt-calendar-locked">
          <div className="apt-calendar-locked__icon">
            <Bell size={20} />
          </div>
          <div>
            <h2>Publish schedule before viewing the calendar</h2>
            <p>
              The appointment calendar becomes active after you publish availability for the month. Use the Schedule tab to create and publish your availability first.
            </p>
            <Link to={routes.appointmentSchedule} className="btn btn-primary">
              Open Schedule
            </Link>
          </div>
        </Card>
      ) : (
        <div className="apt-main">
          <div className="apt-calendar-col">
            <AppointmentCalendar
              appointments={calendarAppointments}
              allAppointments={myAppointments}
              availabilityTemplate={activeMonthTemplate}
              now={now}
              view={calendarView}
              rangeStart={rangeStart}
              statusFilter={activeTab}
              statusOptions={APPOINTMENT_FILTERS}
              search={search}
              onStatusFilterChange={setActiveTab}
              onSearchChange={setSearch}
              onViewChange={setCalendarView}
              onRangeChange={setRangeStart}
              onSelect={setSelectedAppointment}
              onSaveDayOverride={saveDayOverride}
              onClearDayOverride={clearDayOverride}
            />
          </div>
          <aside className="apt-side-col">
            <TodayPanel appointments={calendarAppointments} now={now} onSelect={setSelectedAppointment} />
          </aside>
        </div>
      )}

      {selectedAppointment && (
        <AppointmentDetailsDrawer
          appointment={selectedAppointment}
          now={now}
          inProgress={inProgressAppointment?.id === selectedAppointment.id}
          onClose={closeDrawer}
          onStartCall={handleStartCall}
          onViewDetails={() => {}}
        />
      )}

      {inProgressAppointment && (
        <AppointmentCallScreen appointment={inProgressAppointment} onEnd={handleEndCall} />
      )}

      {toastAppointment && (
        <CallReadyToast appointment={toastAppointment} onStart={() => handleStartCall(toastAppointment)} />
      )}

      <footer className="apt-page-footer">
        <span>Preview the sample appointment template before setting availability.</span>
        <button type="button" className="btn btn-outline apt-slot-preview-btn" onClick={() => setIsPreviewOpen(true)}>
          <Eye size={15} />
          Preview demo
        </button>
      </footer>

      {isPreviewOpen && <TemplatePreview onClose={closePreview} />}

    </div>
  )
}
