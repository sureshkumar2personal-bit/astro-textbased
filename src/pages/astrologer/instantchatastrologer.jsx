import { Check, Clock3, Info, MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../state/AuthContext.jsx'
import {
  getConsultationSecondsLeft,
  getConsultationTotalMinutes,
  getInstantConsultations,
  subscribeToInstantConsultations,
  updateInstantConsultation,
} from '../../utils/instantConsultation.js'
import './instantchatastrologer.css'

const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

export default function InstantChatAstrologer() {
  const { currentUser } = useAuth()
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
  const [requests, setRequests] = useState([])
  const [remaining, setRemaining] = useState(0)
  const [message, setMessage] = useState('')
  const [showBirth, setShowBirth] = useState(false)

  useEffect(() => {
    const refresh = (value = getInstantConsultations()) => setRequests(value)
    refresh()
    return subscribeToInstantConsultations(refresh)
  }, [])

  const chats = useMemo(
    () => requests.filter((request) => request.astrologerId === astrologerId && request.type === 'chat'),
    [astrologerId, requests],
  )

  const pending = useMemo(() => chats.find((request) => request.status === 'ringing'), [chats])
  const active = useMemo(() => chats.find((request) => request.status === 'accepted'), [chats])

  // Counts down to zero and stops there, so a paid extension can be bought
  // rather than the chat being force-ended.
  useEffect(() => {
    if (!active) return undefined
    const tick = () => setRemaining(getConsultationSecondsLeft(active))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [active])

  const accept = () => pending && updateInstantConsultation(pending.id, { status: 'accepted', startedAt: new Date().toISOString() })
  const reject = () => pending && updateInstantConsultation(pending.id, { status: 'rejected', rejectedAt: new Date().toISOString() })

  const sendMessage = (event) => {
    event.preventDefault()
    if (!active || !message.trim()) return
    updateInstantConsultation(active.id, {
      messages: [...(active.messages || []), { id: crypto.randomUUID(), sender: 'astrologer', text: message.trim(), sentAt: new Date().toISOString() }],
    })
    setMessage('')
  }

  if (!pending && !active) return null

  return (
    <aside className="instant-chat-astrologer-panel" aria-live="polite">
      {pending && (
        <section className="instant-chat-astrologer-request">
          <div className="instant-chat-astrologer-icon"><MessageCircle size={22} /></div>
          <span>INSTANT CHAT REQUEST</span>
          <h2>{pending.userName}</h2>
          <p>Wants to chat for {getConsultationTotalMinutes(pending)} minutes.</p>
          {pending.birthDetails && (
            <button type="button" className="instant-chat-astrologer-birth-toggle" onClick={() => setShowBirth((value) => !value)}>
              <Info size={14} /> {showBirth ? 'Hide' : 'View'} birth details
            </button>
          )}
          {showBirth && pending.birthDetails && (
            <dl className="instant-chat-astrologer-birth">
              <div><dt>Name</dt><dd>{pending.birthDetails.name || '—'}</dd></div>
              <div><dt>Gender</dt><dd>{pending.birthDetails.gender || '—'}</dd></div>
              <div><dt>Date of birth</dt><dd>{pending.birthDetails.dob || '—'}</dd></div>
              <div><dt>Time of birth</dt><dd>{pending.birthDetails.time || '—'}</dd></div>
              <div><dt>Place of birth</dt><dd>{pending.birthDetails.place || '—'}</dd></div>
            </dl>
          )}
          <div className="instant-chat-astrologer-actions">
            <button type="button" onClick={accept}><Check size={16} /> Accept</button>
            <button type="button" onClick={reject}><X size={16} /> Reject</button>
          </div>
        </section>
      )}

      {active && (
        <section className="instant-chat-astrologer-active">
          <header>
            <div><span className="instant-chat-astrologer-live" /> Chat with <strong>{active.userName}</strong></div>
            <span><Clock3 size={14} /> {formatTime(remaining)}</span>
          </header>

          {active.birthDetails && (
            <button type="button" className="instant-chat-astrologer-birth-toggle" onClick={() => setShowBirth((value) => !value)}>
              <Info size={14} /> {showBirth ? 'Hide' : 'View'} birth details
            </button>
          )}
          {showBirth && active.birthDetails && (
            <dl className="instant-chat-astrologer-birth">
              <div><dt>Name</dt><dd>{active.birthDetails.name || '—'}</dd></div>
              <div><dt>Gender</dt><dd>{active.birthDetails.gender || '—'}</dd></div>
              <div><dt>Date of birth</dt><dd>{active.birthDetails.dob || '—'}</dd></div>
              <div><dt>Time of birth</dt><dd>{active.birthDetails.time || '—'}</dd></div>
              <div><dt>Place of birth</dt><dd>{active.birthDetails.place || '—'}</dd></div>
            </dl>
          )}

          {remaining === 0 && <p className="instant-chat-astrologer-timeup">Time is up. Waiting for {active.userName} to extend or end.</p>}

          <div className="instant-chat-astrologer-messages">
            {(active.messages || []).map((entry) => (
              <p key={entry.id} className={`instant-chat-astrologer-message instant-chat-astrologer-message--${entry.sender}`}>{entry.text}</p>
            ))}
          </div>

          <form onSubmit={sendMessage}>
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Reply to user..." />
            <button type="submit" disabled={!message.trim()}><Send size={16} /></button>
          </form>

          <button
            type="button"
            className="instant-chat-astrologer-end"
            onClick={() => updateInstantConsultation(active.id, { status: 'ended', endedAt: new Date().toISOString() })}
          >
            End Chat
          </button>
        </section>
      )}
    </aside>
  )
}