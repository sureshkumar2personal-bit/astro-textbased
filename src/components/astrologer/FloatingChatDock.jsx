import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Maximize2, Send } from 'lucide-react'
import { appendConsultationMessage, getConsultationSecondsLeft, getInstantConsultations, subscribeToInstantConsultations } from '../../utils/instantConsultation.js'
import './floatingChatDock.css'

const VISIBLE_MESSAGES = 6
const clock = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
const initials = (name) => String(name || '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

/** Reads the same shared store as the full chat page, so both views always show the same session and messages. */
function useAcceptedChat(astrologerId) {
  const read = () => getInstantConsultations()
    .filter((item) => item.astrologerId === astrologerId && item.type === 'chat' && item.status === 'accepted')
    .sort((a, b) => new Date(b.startedAt || b.createdAt) - new Date(a.startedAt || a.createdAt))[0] || null
  const [state, setState] = useState(() => ({ chat: read(), tick: 0 }))
  useEffect(() => {
    const refresh = () => setState((current) => ({ chat: read(), tick: current.tick + 1 }))
    refresh()
    const unsubscribe = subscribeToInstantConsultations(refresh)
    const timer = window.setInterval(refresh, 1000)
    return () => { unsubscribe(); window.clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [astrologerId])
  return state.chat
}

/** Compact bottom-right chat for the accepted Instant Chat (Minimize on the full page leaves it running here). */
export default function FloatingChatDock({ astrologerId }) {
  const chat = useAcceptedChat(astrologerId)
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const listRef = useRef(null)
  const count = chat?.messages?.length || 0
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [chat?.id, count])
  if (!chat) return null

  const expand = () => navigate(`/astrologer/instant-chat/${encodeURIComponent(chat.id)}`)
  const send = (event) => {
    event.preventDefault()
    const value = draft.trim()
    if (!value) return
    appendConsultationMessage(chat.id, 'astrologer', value) // same single write path as the full page
    setDraft('')
  }
  const messages = (chat.messages || []).slice(-VISIBLE_MESSAGES)

  return (
    <aside className="fcd" aria-label={`Chat with ${chat.userName}`}>
      <header className="fcd__head" role="button" tabIndex={0} onClick={expand} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); expand() } }} title="Open full chat">
        <span className="fcd__avatar">{initials(chat.userName)}<i aria-hidden="true" /></span>
        <span className="fcd__who"><strong>{chat.userName}</strong><small>Online · {clock(getConsultationSecondsLeft(chat))} left</small></span>
        <Maximize2 size={16} aria-hidden="true" />
      </header>
      <div className="fcd__messages" ref={listRef} onClick={expand}>
        {messages.length ? messages.map((message) => (
          <p key={message.id} className={`fcd__msg fcd__msg--${message.sender === 'astrologer' ? 'out' : 'in'}`}>{message.text}</p>
        )) : <p className="fcd__empty">No messages yet. Say hello to {chat.userName}.</p>}
      </div>
      <form className="fcd__composer" onSubmit={send}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message…" aria-label={`Message ${chat.userName}`} />
        <button type="submit" aria-label="Send message" disabled={!draft.trim()}><Send size={16} /></button>
      </form>
    </aside>
  )
}
