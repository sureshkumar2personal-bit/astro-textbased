import { Clock3, MessageCircle, PhoneOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext.jsx'
import {
  getConsultationSecondsLeft,
  getConsultationTotalMinutes,
  getInstantConsultations,
  subscribeToInstantConsultations,
  updateInstantConsultation,
} from '../../utils/instantConsultation.js'
import './callastrologer.css'

const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

export default function CallAstrologer() {
  const { currentUser } = useAuth()
  const { pathname } = useLocation()
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
  const [requests, setRequests] = useState([])
  const [remaining, setRemaining] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const refresh = (value = getInstantConsultations()) => setRequests(value)
    refresh()
    return subscribeToInstantConsultations(refresh)
  }, [])

  const calls = useMemo(
    () => requests.filter((request) => request.astrologerId === astrologerId && request.type === 'call'),
    [astrologerId, requests],
  )

  // Ringing calls get no floating card: they are answered from the dashboard request queue / Waiting Users list.
  const active = useMemo(() => calls.find((request) => request.status === 'accepted'), [calls])

  // Counts down to zero and stops there. The call is deliberately left open at
  // zero so the user can buy an extension; ending is an explicit action.
  useEffect(() => {
    if (!active) return undefined
    const tick = () => setRemaining(getConsultationSecondsLeft(active))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [active])

  const end = () => active && updateInstantConsultation(active.id, { status: 'ended', endedAt: new Date().toISOString() })

  const sendMessage = () => {
    if (!active || !message.trim()) return
    updateInstantConsultation(active.id, {
      messages: [...(active.messages || []), { id: crypto.randomUUID(), sender: 'astrologer', text: message.trim(), sentAt: new Date().toISOString() }],
    })
    setMessage('')
  }

  // The Dashboard (/astrologer) and the Instant Call Console show the request queue and the live call
  // workspace themselves, so this floating panel would duplicate them there.
  if (pathname === '/astrologer' || pathname.startsWith('/astrologer/consultation/instant-call')) return null
  if (!active) return null

  return (
    <aside className="call-astrologer-panel" aria-live="polite">
      {active && (
        <section className="call-astrologer-active">
          <header>
            <span className="call-astrologer-live"><span /> Live call</span>
            <strong>{formatTime(remaining)}</strong>
          </header>

          <div className="call-astrologer-person">
            <div className="call-astrologer-avatar">{active.userName.slice(0, 2).toUpperCase()}</div>
            <div>
              <h2>{active.userName}</h2>
              <p>Voice consultation · {getConsultationTotalMinutes(active)} min</p>
            </div>
          </div>

          {remaining === 0 && (
            <p className="call-astrologer-timeup">
              <Clock3 size={14} /> Time is up. Waiting for {active.userName} to extend or end the call.
            </p>
          )}

          <div className="call-astrologer-conversation">
            {(active.messages || []).map((entry) => (
              <p key={entry.id} className={`call-astrologer-message call-astrologer-message--${entry.sender}`}>{entry.text}</p>
            ))}
            <small><MessageCircle size={13} /> You can send a message while speaking</small>
          </div>

          <div className="call-astrologer-composer">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Send a message..."
              onKeyDown={(event) => { if (event.key === 'Enter') sendMessage() }}
            />
            <button type="button" onClick={sendMessage}><MessageCircle size={16} /></button>
          </div>

          <button type="button" className="call-astrologer-end" onClick={end}><PhoneOff size={17} /> End Call</button>
        </section>
      )}
    </aside>
  )
}