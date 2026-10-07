import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { useSafeBack } from '../utils/useSafeBack.js'

export default function BackButton({ to, label = 'Back', icon: Icon = ArrowLeft, onBack }) {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  // Without an explicit `to` the best known parent is the role dashboard, which
  // is also what these buttons are labelled with.
  const goBack = useSafeBack(to || getRoleRoutes(currentUser?.role).dashboard)

  return (
    <button
      className="inline-flex items-center gap-2 rounded-[12px] border border-[color:var(--line)] bg-transparent px-4 py-2 text-sm font-semibold text-[color:var(--body)] transition duration-200 hover:-translate-y-0.5 hover:bg-[rgba(143,77,255,0.08)] hover:text-[color:var(--violet-700)]"
      onClick={() => (onBack ? onBack() : to ? navigate(to) : goBack())}
    >
      <Icon size={16} />
      {label}
    </button>
  )
}
