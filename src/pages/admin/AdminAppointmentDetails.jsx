import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import {
  findAdminAppointment,
  getAppointmentAstrologerName,
  getAppointmentDate,
  getAppointmentTime,
  getAppointmentUserName,
} from '../../utils/adminAppointments.js'

// Admin -> Appointment details.
//
// Read-only. Cancelling, rescheduling, completing, refunding and starting the
// call all happen in their own modules; none of that behaviour is touched here.
function DetailField({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value || 'Not available'}</div>
    </div>
  )
}

export default function AdminAppointmentDetails() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const { appointments } = useAppData()

  const appointment = useMemo(() => findAdminAppointment(appointments, appointmentId), [appointments, appointmentId])

  if (!appointment) {
    return <Navigate to={`${routes.base}/appointments`} replace />
  }

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title={appointment.id || 'Appointment'}
        subtitle={appointment.orderId ? `Order ${appointment.orderId}` : undefined}
        actions={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`${routes.base}/appointments`)}
          >
            Back to Appointments
          </button>
        }
      />

      <Section title="Appointment" icon={CalendarDays} className="!mt-4">
        <Card>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 18,
            }}
          >
            <DetailField label="User" value={getAppointmentUserName(appointment)} />
            <DetailField label="Astrologer" value={getAppointmentAstrologerName(appointment) || appointment.astrologerId} />
            <DetailField label="Date" value={formatDisplayDate(getAppointmentDate(appointment))} />
            <DetailField label="Time" value={getAppointmentTime(appointment)} />
            <DetailField
              label="Status"
              value={appointment.status ? <StatusBadge label={appointment.status} /> : null}
            />
            <DetailField
              label="Amount"
              value={appointment.amount != null && appointment.amount !== '' ? String(appointment.amount) : null}
            />
            <DetailField label="Type" value={appointment.type} />
            <DetailField label="Topic" value={appointment.topic} />
            <DetailField label="Duration" value={appointment.duration} />
            <DetailField label="Language" value={appointment.language} />
            <DetailField label="Payment status" value={appointment.paymentStatus} />
          </div>
        </Card>
      </Section>
    </div>
  )
}
