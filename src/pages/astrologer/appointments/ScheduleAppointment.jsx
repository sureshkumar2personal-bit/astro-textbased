import { useMemo } from 'react'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import AppointmentAvailabilityPanel from './AppointmentAvailabilityPanel.jsx'

export default function ScheduleAppointment() {
  const { currentUser } = useAuth()
  const { appointments } = useAppData()

  const routes = getRoleRoutes(currentUser?.role)

  const astrologerId =
    currentUser?.id === 'astrologer-demo-alias'
      ? 'astrologer-demo'
      : currentUser?.id

  const myAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.astrologerId === astrologerId,
      ),
    [appointments, astrologerId],
  )

  return (
    <div className="apt-page">
      <PageHeader
        eyebrow="Astrologer Workspace"
        title="Schedule Appointments"
        subtitle="Set your weekly, monthly and daily appointment availability, working hours, breaks, duration and price."
        showBack
        backTo={routes.dashboard}
      />

      <div className="apt-schedule-page">
        <AppointmentAvailabilityPanel
          astrologerId={astrologerId}
          appointments={myAppointments}
        />
      </div>
    </div>
  )
}
