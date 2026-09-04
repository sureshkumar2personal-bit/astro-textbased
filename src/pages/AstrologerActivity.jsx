import { useMemo } from 'react'
import { Activity, CalendarDays, Clock3, Headphones, MessageCircle, PhoneCall } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { formatDisplayDate, formatTimeRange, resolveAppointmentWindow } from '../utils/appointments.js'
import { formatRemedyHour } from '../utils/remedyNotes.js'

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function sessionIcon(type) {
  return type === 'Chat' ? MessageCircle : Headphones
}

export default function AstrologerActivity() {
  const { currentUser } = useAuth()
  const { appointments, consultationHistory } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id

  const activity = useMemo(() => {
    const appointmentItems = appointments
      .filter((appointment) => appointment.astrologerId === astrologerId)
      .map((appointment) => {
        const { startMin, endMin } = resolveAppointmentWindow(appointment)
        const occurredAt = appointment.completedAt || appointment.endedAt || appointment.updatedAt || appointment.raisedAt || appointment.dateIso || new Date().toISOString()
        return {
          id: `appointment-${appointment.id}`,
          kind: 'appointment',
          title: `${appointment.customerName || 'Customer'} · ${appointment.type || 'Appointment'}`,
          summary: appointment.remedyNotes?.summary || appointment.topic || 'Appointment activity',
          status: appointment.status || 'Pending',
          occurredAt,
          meta: appointment.dateIso
            ? `${formatDisplayDate(appointment.dateIso, true)} · ${formatTimeRange(startMin, endMin)}`
            : formatDateTime(occurredAt),
          icon: appointment.type === 'Audio Call' ? PhoneCall : appointment.callType === 'Text' ? MessageCircle : CalendarDays,
          route: routes.appointmentHistory,
          extra: appointment.remedyNotes
            ? `${appointment.remedyNotes.day || 'Day not set'} · ${formatRemedyHour(appointment.remedyNotes.hour) || appointment.remedyNotes.hour || 'Hour not set'}`
            : null,
        }
      })

    const consultationItems = consultationHistory
      .filter((session) => session.astrologerId === astrologerId)
      .map((session) => ({
        id: `consultation-${session.id}`,
        kind: 'consultation',
        title: `${session.customerName || 'Customer'} · ${session.type}`,
        summary: session.messages?.at(-1)?.text || `${session.durationMinutes} minute consultation completed.`,
        status: session.status,
        occurredAt: session.startedAt,
        meta: `${formatDateTime(session.startedAt)} · ${session.durationMinutes} min`,
        icon: sessionIcon(session.type),
        route: routes.consultationHistory,
      }))

    return [...appointmentItems, ...consultationItems].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
  }, [appointments, astrologerId, consultationHistory, routes.appointmentHistory, routes.consultationHistory])

  const stats = useMemo(() => ({
    total: activity.length,
    appointments: activity.filter((item) => item.kind === 'appointment').length,
    consultations: activity.filter((item) => item.kind === 'consultation').length,
    completed: appointments.filter((appointment) => appointment.astrologerId === astrologerId && appointment.status === 'Completed').length,
  }), [activity, appointments, astrologerId])

  return (
    <div>
      <PageHeader
        eyebrow="Astrologer workspace"
        title="My Activity"
        subtitle="Recent appointment completions, consultation sessions, and remedy notes in one place."
      />

      <Section>
        <div className="stat-grid">
          <Card className="stat-card">
            <div className="stat-icon tone-violet"><Activity size={19} /></div>
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Activity</div>
            </div>
          </Card>
          <Card className="stat-card">
            <div className="stat-icon tone-sky"><CalendarDays size={19} /></div>
            <div>
              <div className="stat-value">{stats.appointments}</div>
              <div className="stat-label">Appointments</div>
            </div>
          </Card>
          <Card className="stat-card">
            <div className="stat-icon tone-green"><Headphones size={19} /></div>
            <div>
              <div className="stat-value">{stats.consultations}</div>
              <div className="stat-label">Consultations</div>
            </div>
          </Card>
          <Card className="stat-card">
            <div className="stat-icon tone-gold"><Clock3 size={19} /></div>
            <div>
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Recent Activity">
        <Card>
          <div className="activity-list">
            {activity.length ? activity.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.id} className="activity-row astrologer-activity-row">
                  <div className="flex items-start gap-3">
                    <div className="stat-icon tone-violet" style={{ width: 36, height: 36 }}>
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="activity-id">{item.title}</div>
                      <div className="activity-meta">{item.meta}</div>
                      <div className="activity-meta">{item.summary}</div>
                      {item.extra && <div className="activity-meta">{item.extra}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge label={item.status} />
                    <div className="activity-meta" style={{ marginTop: 6 }}>{formatDateTime(item.occurredAt)}</div>
                  </div>
                </div>
              )
            }) : (
              <div className="empty-state">
                <Activity size={18} />
                <h3>No activity yet</h3>
                <p>Your appointment completions and consultations will appear here.</p>
              </div>
            )}
          </div>
        </Card>
      </Section>
    </div>
  )
}
