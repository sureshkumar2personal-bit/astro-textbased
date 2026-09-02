import { ArrowLeft, Check, Clock3, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CHAT_PACKAGES, mockAstrologers } from '../data/notificationData.js'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

function remainingSeconds(session) {
  if (!session?.startedAt || !session.totalDuration) return 0
  return Math.max(0, Math.ceil((session.totalDuration * 1000 - (Date.now() - session.startedAt)) / 1000))
}

function formatTimer(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function timeLabel(date) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date)
}

export default function ChatScreen() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const astrologer = mockAstrologers.find(({ id }) => id === searchParams.get('id')) || mockAstrologers[0]
  const freeMode = searchParams.get('mode') === 'free'
  const storageKey = `astro-connect:free-chat:${currentUser?.id || 'guest'}:${astrologer.id}`
  let session = null
  try { session = JSON.parse(localStorage.getItem(storageKey) || 'null') } catch { session = null }
  const startedAt = session?.startedAt
  const totalDuration = session?.totalDuration
  const [remaining, setRemaining] = useState(() => remainingSeconds(session))
  const [expired, setExpired] = useState(() => remainingSeconds(session) === 0)
  const [draft, setDraft] = useState('')
  const [modalPackageId, setModalPackageId] = useState(CHAT_PACKAGES[0].id)
  const [showPackageChooser, setShowPackageChooser] = useState(false)
  const [messages, setMessages] = useState(() => [
    { id: 'welcome', sender: 'astrologer', text: 'Hello! How can I help you today?', time: new Date() },
    { id: 'prompt', sender: 'astrologer', text: 'Please share your question and I will guide you.', time: new Date() },
  ])
  const messageListRef = useRef(null)

  useEffect(() => {
    if (!startedAt || !totalDuration) return undefined
    const tick = () => {
      let currentSession = null
      try { currentSession = JSON.parse(localStorage.getItem(storageKey) || 'null') } catch { /* storage is optional */ }
      const nextRemaining = remainingSeconds(currentSession)
      setRemaining(nextRemaining)
      if (nextRemaining === 0) {
        setExpired(true)
        try { localStorage.setItem(storageKey, JSON.stringify({ ...currentSession, freeUsed: true, freeRemaining: 0 })) } catch { /* storage is optional */ }
      }
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [startedAt, totalDuration, storageKey])

  useEffect(() => {
    if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight
  }, [messages])

  const sendMessage = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || expired) return
    setMessages((current) => [...current, { id: `${Date.now()}-${text}`, sender: 'user', text, time: new Date() }])
    setDraft('')
  }

  const chosenModalPackage = CHAT_PACKAGES.find(({ id }) => id === modalPackageId) || CHAT_PACKAGES[0]
  const showTimer = freeMode

  return (
    <main className="consultation-chat">
      <section className="consultation-chat__shell">
        <header className="consultation-chat__header">
          <button type="button" className="consultation-chat__back" onClick={() => navigate(`${routes.chatBooking}?id=${astrologer.id}`)}><ArrowLeft size={18} aria-hidden="true" /> Back</button>
          <div className="consultation-chat__identity">
            <div className="consultation-chat__avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
            <div><strong>{astrologer.name}</strong><span>{astrologer.specialization}</span><small className={astrologer.availability === 'Online' ? 'consultation-chat__online' : ''}>● {astrologer.availability}</small></div>
          </div>
          {showTimer ? <div className="consultation-chat__timer"><span>{session?.freeUsed ? 'Paid time' : 'Free time'}</span><strong><Clock3 size={15} aria-hidden="true" /> {formatTimer(remaining)} remaining</strong>{!expired && <button type="button" onClick={() => setShowPackageChooser(true)}>Add paid time</button>}</div> : <div className="consultation-chat__timer consultation-chat__timer--paid"><span>Paid Chat</span><strong><Clock3 size={15} aria-hidden="true" /> {formatTimer(remaining)} remaining</strong></div>}
        </header>

        <div ref={messageListRef} className="consultation-chat__messages" aria-live="polite">
          {messages.map((message) => <article key={message.id} className={`consultation-message consultation-message--${message.sender}`}><p>{message.text}</p><time>{timeLabel(message.time)}</time></article>)}
        </div>

        <form className="consultation-chat__composer" onSubmit={sendMessage}>
          <input value={draft} disabled={expired} onChange={(event) => setDraft(event.target.value)} placeholder={expired ? 'Your free chat has ended' : 'Type your message...'} aria-label="Type your message" />
          <button type="submit" className="btn btn-primary" disabled={expired || !draft.trim()}><Send size={16} aria-hidden="true" /> Send</button>
        </form>
      </section>

      {(expired || showPackageChooser) && (
        <div className="consultation-chat__overlay" role="dialog" aria-modal="true" aria-labelledby="free-chat-ended-heading">
          <section className="consultation-chat__ended-modal">
            <span className="consultation-chat__ended-icon"><Clock3 size={22} aria-hidden="true" /></span>
            <h1 id="free-chat-ended-heading">{expired ? 'Chat Session Ended' : 'Continue Chat'}</h1>
            <p>{expired ? `Your available chat time has ended.` : `Add paid time to your current chat with ${astrologer.name}.`}</p>
            <h2>Continue Chat</h2>
            <div className="consultation-chat__continue-packages">
              {CHAT_PACKAGES.map((chatPackage) => <button key={chatPackage.id} type="button" onClick={() => setModalPackageId(chatPackage.id)} className={modalPackageId === chatPackage.id ? 'consultation-chat__continue-package consultation-chat__continue-package--selected' : 'consultation-chat__continue-package'}><span>{chatPackage.duration} Minutes</span><strong>₹{chatPackage.total}</strong>{modalPackageId === chatPackage.id && <Check size={15} aria-hidden="true" />}</button>)}
            </div>
            {showPackageChooser && !expired ? (
              <button type="button" className="btn btn-primary consultation-chat__choose-button" onClick={() => {
                const paidSeconds = chosenModalPackage.duration * 60
                const currentRemaining = remainingSeconds(session)
                localStorage.setItem(storageKey, JSON.stringify({ ...session, startedAt: Date.now(), freeUsed: true, freeRemaining: 0, paidDuration: paidSeconds, totalDuration: currentRemaining + paidSeconds }))
                navigate(`${routes.chat}?id=${astrologer.id}&mode=paid&package=${chosenModalPackage.id}`)
              }}>Add Package & Continue →</button>
            ) : <button type="button" className="btn btn-primary consultation-chat__choose-button" onClick={() => navigate(`${routes.chatBooking}?id=${astrologer.id}&package=${chosenModalPackage.id}`)}>Buy More Chat Time →</button>}
          </section>
        </div>
      )}
    </main>
  )
}
