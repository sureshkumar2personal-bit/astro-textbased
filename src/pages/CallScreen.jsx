import { ArrowLeft, Phone, PhoneOff } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mockAstrologers } from '../data/notificationData.js'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

export default function CallScreen() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const astrologer = mockAstrologers.find(({ id }) => id === params.get('id')) || mockAstrologers[0]

  return (
    <main className="consultation-call">
      <section className="consultation-call__card">
        <button type="button" className="wallet-payment-page__back" onClick={() => navigate(routes.astrologers)}><ArrowLeft size={16} aria-hidden="true" /> Back to Astrologers</button>
        <div className="consultation-call__avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
        <span className="consultation-call__status"><Phone size={15} aria-hidden="true" /> Call ready</span>
        <h1>{astrologer.name}</h1>
        <p>{astrologer.specialization} · Your paid call is ready to start.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate(routes.astrologers)}><Phone size={16} aria-hidden="true" /> End Call</button>
        <button type="button" className="btn btn-outline" onClick={() => navigate(routes.astrologers)}><PhoneOff size={16} aria-hidden="true" /> Leave</button>
      </section>
    </main>
  )
}
