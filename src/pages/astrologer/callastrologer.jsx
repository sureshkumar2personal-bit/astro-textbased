import { Check, Clock3, MessageCircle, Phone, PhoneOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

  const pending = useMemo(() => calls.find((request) => request.status === 'ringing'), [calls])
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

  const accept = () => pending && updateInstantConsultation(pending.id, { status: 'accepted', startedAt: new Date().toISOString() })
  const reject = () => pending && updateInstantConsultation(pending.id, { status: 'rejected', rejectedAt: new Date().toISOString() })
  const end = () => active && updateInstantConsultation(active.id, { status: 'ended', endedAt: new Date().toISOString() })

  const sendMessage = () => {
    if (!active || !message.trim()) return
    updateInstantConsultation(active.id, {
      messages: [...(active.messages || []), { id: crypto.randomUUID(), sender: 'astrologer', text: message.trim(), sentAt: new Date().toISOString() }],
    })
    setMessage('')
  }

  if (!pending && !active) return null

  return (
    <aside className="call-astrologer-panel" aria-live="polite">
      {pending && (
        <section className="call-astrologer-request">
          <div className="call-astrologer-icon"><Phone size={22} /></div>
          <span className="call-astrologer-badge">INSTANT CALL</span>
          <h2>{pending.userName} is calling</h2>
          <p><Clock3 size={14} /> {getConsultationTotalMinutes(pending)} min booked</p>
          <div className="call-astrologer-actions">
            <button type="button" className="call-astrologer-accept" onClick={accept}><Check size={17} /> Accept</button>
            <button type="button" className="call-astrologer-reject" onClick={reject}><PhoneOff size={17} /> Reject</button>
          </div>
        </section>
      )}

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