import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

// "/" has no page of its own: logged-in users go to their dashboard, everyone else to the Login page.
export default function RoleSelection() {
  const { currentUser } = useAuth()
  if (currentUser) return <Navigate to={currentUser.role === 'astrologer' ? '/astrologer' : currentUser.role === 'editor' ? '/editor/dashboard' : '/user'} replace />
  return <Navigate to="/login" replace />
}
