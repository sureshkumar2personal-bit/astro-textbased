import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'

export default function BookAppointment() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  return <Navigate to={routes.astrologers} replace />
}
