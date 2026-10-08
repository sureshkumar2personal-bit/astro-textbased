import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../state/AuthContext.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { getInstantConsultations, subscribeToInstantConsultations } from '../../../utils/instantConsultation.js'
import InstantSessionDrawer from './InstantSessionDrawer.jsx'
import { calculateInstantAmount, getSavedRate } from '../../../utils/consultationPricing.js'

const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
const formatTime = (value) => new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

function describe(session, fallbackRate) {
  const started = Boolean(session.startedAt)
  const status = session.status === 'rejected' ? 'Declined' : started ? 'Completed' : 'Cancelled'
  const rate = session.pricePerMinute ?? fallbackRate
  const amount = status === 'Completed' ? (session.amount ?? calculateInstantAmount(session.durationMinutes, rate)) : 0
  return { status, amount, when: session.startedAt || session.createdAt }
}

export default function ConsultationHistoryTable({ type, title }) {
  const { currentUser } = useAuth()
  const { astrologerServices } = useAppData()
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
  const [sessions, setSessions] = useState(() => getInstantConsultations())
  const [selectedId, setSelectedId] = useState(null)
  useEffect(() => subscribeToInstantConsultations(setSessions), [])

  const fallbackRate = getSavedRate(astrologerId, type) ?? (type === 'chat' ? astrologerServices.chatPricePerMinute : astrologerServices.callPricePerMinute)
  const rows = useMemo(() => sessions
    .filter((item) => item.astrologerId === astrologerId && item.type === type && ['ended', 'rejected'].includes(item.status))
    .map((item) => ({ item, ...describe(item, fallbackRate) }))
    .sort((a, b) => new Date(b.when) - new Date(a.when)), [astrologerId, fallbackRate, sessions, type])

  return (
    <section className="consult-card" aria-label={title}>
      <h2 className="consult-card__title">{title}</h2>
      {rows.length ? (
        <div className="consult-table-wrap">
          <table className="consult-table">
            <thead><tr><th>User</th><th>Date</th><th>Time</th><th>Duration</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map(({ item, status, amount, when }) => (
                <tr key={item.id} className="consult-row" tabIndex={0} onClick={() => setSelectedId(item.id)} onKeyDown={(event) => event.key === 'Enter' && setSelectedId(item.id)}>
                  <td data-label="User"><strong>{item.userName}</strong></td>
                  <td data-label="Date">{formatDate(when)}</td>
                  <td data-label="Time">{formatTime(when)}</td>
                  <td data-label="Duration">{item.durationMinutes} min</td>
                  <td data-label="Amount">{status === 'Completed' ? `₹${amount.toLocaleString('en-IN')}` : '—'}</td>
                  <td data-label="Status"><span className={`consult-status consult-status--${status.toLowerCase()}`}>{status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="consult-empty">No {type === 'chat' ? 'chat' : 'call'} sessions yet.</p>
      )}
      <InstantSessionDrawer session={sessions.find((item) => item.id === selectedId)} sessions={sessions} fallbackRate={fallbackRate} onClose={() => setSelectedId(null)} />
    </section>
  )
}
