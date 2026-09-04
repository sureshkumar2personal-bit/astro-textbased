import { ArrowLeft, Clock3, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { mockAstrologers } from '../data/notificationData.js'
import { useAuth } from '../state/AuthContext.jsx'
import { useAppData } from '../state/AppDataContext.jsx'

const sessionKeyFor = (userId) => `astroconnect-app-data-chat-session-${userId || 'guest'}`

function readSession(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}

function formatTimer(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function messageTime(value) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export default function ChatScreen() {
  const { currentUser } = useAuth()
  const { userWallet } = useAppData()
  const navigate = useNavigate()
  const { astrologerId } = useParams()
  const [searchParams] = useSearchParams()
  const selectedId = astrologerId || searchParams.get('id')
  const astrologer = useMemo(() => mockAstrologers.find(({ id }) => id === selectedId) || mockAstrologers[0], [selectedId])
  const storageKey = sessionKeyFor(currentUser?.id)
  const [session, setSession] = useState(() => readSession(storageKey))
  const [draft, setDraft] = useState('')
  const [remaining, setRemaining] = useState(0)
  const [ended, setEnded] = useState(() => readSession(storageKey)?.status === 'completed')
  const [messages, setMessages] = useState(() => readSession(storageKey)?.messages || [])
  const messageListRef = useRef(null)

  const persistSession = (next) => {
    setSession(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* storage is optional */ }
  }

  useEffect(() => {
    if (!session || session.astrologerId !== astrologer.id || session.status !== 'active') return
    const updateTimer = () => {
      const endTime = Number(session.endTime) || 0
      const next = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      setRemaining(next)
      if (next === 0 && session.status === 'active') {
        persistSession({ ...session, status: 'completed', completedAt: Date.now() })
        setEnded(true)
        navigate(session.returnPath || '/user/chat-astrologers')
      }
    }
    updateTimer()
    const timer = window.setInterval(updateTimer, 1000)
    return () => window.clearInterval(timer)
  }, [session, astrologer.id])

  useEffect(() => {
    if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight
  }, [messages])

  const active = Boolean(session && session.astrologerId === astrologer.id && session.status === 'active' && !ended)
  const rate = Number(session?.ratePerMinute || 0)
  const duration = Number(session?.selectedDuration || 0)

  const endSession = () => {
    if (!session) return
    persistSession({ ...session, status: 'completed', completedAt: Date.now(), messages })
    setRemaining(0)
    setEnded(true)
    navigate(session.returnPath || '/user/chat-astrologers')
  }

  const sendMessage = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !active) return
    const nextMessages = [...messages, { id: `${Date.now()}-${text}`, sender: 'user', text, time: new Date().toISOString() }]
    setMessages(nextMessages)
    persistSession({ ...session, messages: nextMessages })
    setDraft('')
  }

  const backToAstrologers = () => navigate(session?.returnPath || '/user/chat-astrologers')
  const buyMoreTime = () => navigate(`/chat-booking/${astrologer.id}`)

  if (!session || session.astrologerId !== astrologer.id) {
    return <main className="consultation-chat"><section className="consultation-chat__ended-modal"><h1>Chat Session Unavailable</h1><p>Choose a duration and confirm payment before starting a chat.</p><button type="button" className="btn btn-primary consultation-chat__choose-button" onClick={buyMoreTime}>Book Chat Time</button></section></main>
  }

  return (
    <main className="consultation-chat">
      <section className="consultation-chat__shell">
        <header className="consultation-chat__header">
          <button type="button" className="consultation-chat__back" onClick={backToAstrologers}><ArrowLeft size={18} aria-hidden="true" /> Back</button>
          <div className="consultation-chat__identity">
            <div className="consultation-chat__avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
            <div><strong>{astrologer.name}</strong><span>{astrologer.specialization}</span><small className={astrologer.availability === 'Online' ? 'consultation-chat__online' : ''}>● {astrologer.availability}</small></div>
          </div>
          <div className="consultation-chat__timer consultation-chat__timer--paid"><span>Chat Duration: {duration}:00</span><strong><Clock3 size={15} aria-hidden="true" /> Remaining Time: {formatTimer(remaining)}</strong>{active && <button type="button" onClick={endSession}>End chat</button>}</div>
          <span className="consultation-chat__wallet-balance">₹{rate}/min · Wallet: ₹{Number(userWallet?.balance || 0).toLocaleString('en-IN')}</span>
        </header>

        <div ref={messageListRef} className="consultation-chat__messages" aria-live="polite">
          {messages.map((message) => <article key={message.id} className={`consultation-message consultation-message--${message.sender}`}><p>{message.text}</p><time>{messageTime(message.time)}</time></article>)}
          {!messages.length && <p className="consultation-chat__empty">Start your conversation with {astrologer.name}.</p>}
        </div>

        <div className="consultation-chat__charge-note">Chat charges: ₹{rate}/min</div>
        <form className="consultation-chat__composer" onSubmit={sendMessage}>
          <input value={draft} disabled={!active} onChange={(event) => setDraft(event.target.value)} placeholder={active ? 'Type a message...' : 'This chat session has ended'} aria-label="Type your message" />
          <button type="submit" className="btn btn-primary" disabled={!active || !draft.trim()}><Send size={16} aria-hidden="true" /> Send</button>
        </form>
      </section>

      {ended && <div className="consultation-chat__overlay" role="dialog" aria-modal="true" aria-labelledby="chat-ended-heading"><section className="consultation-chat__ended-modal"><span className="consultation-chat__ended-icon"><Clock3 size={22} aria-hidden="true" /></span><h1 id="chat-ended-heading">Chat Session Ended</h1><p>Your paid chat time has ended.</p><dl className="consultation-chat__summary"><div><dt>Session Duration</dt><dd>{duration} Minutes</dd></div><div><dt>Chat Rate</dt><dd>₹{rate}/min</dd></div><div><dt>Amount Paid</dt><dd>₹{Number(session.totalAmount || 0).toLocaleString('en-IN')}</dd></div><div><dt>Opening Wallet Balance</dt><dd>₹{Number(session.openingWalletBalance || 0).toLocaleString('en-IN')}</dd></div><div><dt>Remaining Wallet Balance</dt><dd>₹{Number(userWallet?.balance || 0).toLocaleString('en-IN')}</dd></div></dl><div className="consultation-chat__ended-actions"><button type="button" className="btn btn-secondary" onClick={backToAstrologers}>Back to Astrologers</button><button type="button" className="btn btn-primary" onClick={buyMoreTime}>Buy More Chat Time</button></div></section></div>}
    </main>
  )
}
