import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StatusBadge from '../../../components/StatusBadge.jsx'
import Card from '../../../components/ui/Card.jsx'
import Section from '../../../components/ui/Section.jsx'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import SuccessAlert from '../../../components/ui/SuccessAlert.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'

const CANCELLABLE_STATUSES = ['Confirmed', 'Rescheduled']

export default function AppointmentDetails() {
  const [searchParams] = useSearchParams()
  const { appointments, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const appointmentId = searchParams.get('id') || appointments[0].id
  const appointment = useMemo(
    () => appointments.find((item) => item.id === appointmentId) || appointments[0],
    [appointmentId, appointments],
  )
  const [cancelled, setCancelled] = useState(false)

  const handleCancel = () => {
    actions.cancelAppointment(appointment.id, {
      astrologer: appointment.astrologer,
      type: appointment.type,
      date: appointment.date,
      time: appointment.time,
    })
    setCancelled(true)
  }

  return (
    <div>
      <PageHeader eyebrow="User portal" title="Appointment Details" showBack backTo={routes.dashboard} />

      <Card className="section" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{appointment.type}</div>
          <div className="muted">with {appointment.astrologer}</div>
        </div>
        <StatusBadge label={appointment.status} />
      </Card>

      <Section title="Schedule">
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <div className="field-label-top">Date</div>
              <div className="text-input" style={{ background: 'var(--violet-50)', fontWeight: 700 }}>{appointment.date}</div>
            </div>
            <div>
              <div className="field-label-top">Time</div>
              <div className="text-input" style={{ background: 'var(--violet-50)', fontWeight: 700 }}>{appointment.time}</div>
            </div>
            <div>
              <div className="field-label-top">Consultation Type</div>
              <div className="text-input" style={{ background: 'var(--violet-50)', fontWeight: 700 }}>{appointment.type}</div>
            </div>
          </div>
        </Card>
      </Section>

      <div className="section" style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Link to={`${routes.astrologerProfile}?id=${appointment.astrologerId}`} className="btn btn-outline">
          View Astrologer
        </Link>
        {CANCELLABLE_STATUSES.includes(appointment.status) && (
          <button type="button" className="btn btn-danger" onClick={handleCancel}>
            Cancel Appointment
          </button>
        )}
        <Link to={routes.dashboard} className="btn btn-primary">Back to Dashboard</Link>
      </div>

      {cancelled && (
        <SuccessAlert variant="user" message="Appointment cancelled successfully." onDismiss={() => setCancelled(false)} />
      )}
    </div>
  )
}
