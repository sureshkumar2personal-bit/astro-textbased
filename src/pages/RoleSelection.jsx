import { Shield, Sparkles, UserRound } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { useAuth } from '../state/AuthContext.jsx'

export default function RoleSelection() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  if (currentUser) return <Navigate to={currentUser.role === 'astrologer' ? '/astrologer' : '/user'} replace />
  return <main className="role-selection-page"><ThemeToggle className="role-selection-theme" /><div className="role-selection-card"><div className="role-selection-brand"><span><Sparkles size={21} /></span><div><strong>Astro Connect</strong><small>Personalized astrology guidance</small></div></div><div className="role-selection-copy"><div className="page-eyebrow">Welcome</div><h1>Continue as</h1><p>Choose the portal that matches your account.</p></div><div className="role-selection-options"><button type="button" onClick={() => navigate('/login/user')}><span className="role-selection-icon"><UserRound size={25} /></span><span><strong>User Login</strong><small>Explore astrologers, ask questions, and manage consultations.</small></span><b>→</b></button><button type="button" onClick={() => navigate('/login/astrologer')}><span className="role-selection-icon"><Shield size={25} /></span><span><strong>Astrologer Login</strong><small>Manage your profile, clients, questions, and services.</small></span><b>→</b></button></div></div></main>
}
