import { useNavigate } from 'react-router-dom'
import AppointmentAvailabilityPanel from './AppointmentAvailabilityPanel.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'

export default function AppointmentScheduleTab() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const routes = getRoleRoutes(currentUser?.role)
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id

  return (
    <AppointmentAvailabilityPanel
      astrologerId={astrologerId}
      onPublished={() => {
        navigate(routes.appointmentCalendar, { replace: true })
      }}
    />
  )
}
