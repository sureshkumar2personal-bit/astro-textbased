import { Check, Clock3, MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../state/AuthContext.jsx'
import { getInstantConsultations, subscribeToInstantConsultations, updateInstantConsultation } from '../../utils/instantConsultation.js'
import './instantchatastrologer.css'

const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

export default function InstantChatAstrologer() {
  const { currentUser } = useAuth(); const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
  const [requests, setRequests] = useState([]); const [message, setMessage] = useState(''); const [remaining, setRemaining] = useState(0)
  useEffect(() => { const refresh = (value = getInstantConsultations()) => setRequests(value); refresh(); return subscribeToInstantConsultations(refresh) }, [])
  const pending = useMemo(() => requests.find((request) => request.astrologerId === astrologerId && request.type === 'chat' && request.status === 'ringing'), [astrologerId, requests])
  const active = useMemo(() => requests.find((request) => request.astrologerId === astrologerId && request.type === 'chat' && request.status === 'accepted'), [astrologerId, requests])
  useEffect(() => { if (!active) return undefined; const tick = () => { const next = Math.max(0, Math.ceil(((new Date(active.startedAt).getTime() + active.durationMinutes * 60000) - Date.now()) / 1000)); setRemaining(next); if (next === 0) updateInstantConsultation(active.id, { status: 'ended', endedAt: new Date().toISOString() }) }; tick(); const timer = window.setInterval(tick, 1000); return () => window.clearInterval(timer) }, [active])
  const accept = () => pending && updateInstantConsultation(pending.id, { status: 'accepted', startedAt: new Date().toISOString() })
  const reject = () => pending && updateInstantConsultation(pending.id, { status: 'rejected', rejectedAt: new Date().toISOString() })
  const sendMessage = () => { if (!active || !message.trim()) return; updateInstantConsultation(active.id, { messages: [...(active.messages || []), { id: crypto.randomUUID(), sender: 'astrologer', text: message.trim(), sentAt: new Date().toISOString() }] }); setMessage('') }
  if (!pending && !active) return null
  return <aside className="instant-chat-astrologer-panel" aria-live="polite">{pending && <section className="instant-chat-astrologer-request"><div className="instant-chat-astrologer-icon"><MessageCircle size={22} /></div><span>INSTANT CHAT REQUEST</span><h2>{pending.userName}</h2><p>Wants to chat for {pending.durationMinutes} minutes.</p><div className="instant-chat-astrologer-actions"><button type="button" onClick={accept}><Check size={16} /> Accept</button><button type="button" onClick={reject}><X size={16} /> Reject</button></div></section>}{active && <section className="instant-chat-astrologer-active"><header><div><span className="instant-chat-astrologer-live" /> Chat with <strong>{active.userName}</strong></div><span><Clock3 size={14} /> {formatTime(remaining)}</span></header><div className="instant-chat-astrologer-messages">{(active.messages || []).map((entry) => <p key={entry.id} className={`instant-chat-astrologer-message instant-chat-astrologer-message--${entry.sender}`}>{entry.text}</p>)}</div><form onSubmit={(event) => { event.preventDefault(); sendMessage() }}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Reply to user..." /><button type="submit" disabled={!message.trim()}><Send size={16} /></button></form><button type="button" className="instant-chat-astrologer-end" onClick={() => updateInstantConsultation(active.id, { status: 'ended', endedAt: new Date().toISOString() })}>End Chat</button></section>}{!pending && !active && <div className="instant-chat-astrologer-empty"><MessageCircle size={24} /><strong>No instant chats</strong><span>Incoming requests will appear here on every astrologer page.</span></div>}</aside>
}
