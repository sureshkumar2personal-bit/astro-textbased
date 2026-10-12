import { Check, Clock3, Phone, PhoneOff, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { consultationAstrologers } from '../../data/consultationAstrologers.js'
import { useAuth } from '../../state/AuthContext.jsx'
import { calculateInstantAmount, getInstantRate } from '../../utils/consultationPricing.js'
import { createInstantConsultation, getInstantConsultations, subscribeToInstantConsultations, updateInstantConsultation } from '../../utils/instantConsultation.js'
import './instantcalluser.css'

const durations = [5, 10, 15, 30]
const timeLeft = (request) => Math.max(0, Math.ceil(((request?.startedAt ? new Date(request.startedAt).getTime() : 0) + (request?.durationMinutes || 0) * 60000 - Date.now()) / 1000))
const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

export default function InstantCallUser() {
  const { astrologerId } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const astrologer = useMemo(() => consultationAstrologers.find((entry) => entry.id === astrologerId) || consultationAstrologers[0], [astrologerId])
  const [duration, setDuration] = useState(10)
  const rate = getInstantRate(astrologer.id, 'call')
  const [request, setRequest] = useState(null)
  const [remaining, setRemaining] = useState(0)
  const [speaker, setSpeaker] = useState(false)

  useEffect(() => {
    const refresh = (requests = getInstantConsultations()) => setRequest(requests.find((entry) => entry.userId === currentUser?.id && entry.astrologerId === astrologer.id && entry.type === 'call' && entry.status !== 'ended') || null)
    refresh()
    return subscribeToInstantConsultations(refresh)
  }, [astrologer.id, currentUser?.id])

  useEffect(() => {
    if (request?.status !== 'accepted') return undefined
    const tick = () => {
      const next = timeLeft(request)
      setRemaining(next)
      if (next === 0) updateInstantConsultation(request.id, { status: 'ended', endedAt: new Date().toISOString() })
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [request])

  const startCall = () => setRequest(createInstantConsultation({ type: 'call', userId: currentUser?.id || 'guest', userName: currentUser?.name, astrologerId: astrologer.id, astrologerName: astrologer.name, durationMinutes: duration, pricePerMinute: rate, userPhone: currentUser?.phone, language: currentUser?.languages?.[0], topic: currentUser?.astrologerPreferences?.topics?.[0] }))
  const endCall = () => request && updateInstantConsultation(request.id, { status: 'ended', endedAt: new Date().toISOString() })

  return <main className="instant-call-user-page">
    <section className="instant-call-user-card">
      <div className="instant-call-user-avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
      <span className={`instant-call-user-status instant-call-user-status--${request?.status || 'idle'}`}><Phone size={14} /> {request?.status === 'accepted' ? 'Connected' : request?.status === 'ringing' ? 'Calling…' : request?.status === 'rejected' ? 'Call declined' : 'Available now'}</span>
      <h1>{astrologer.name}</h1><p>{astrologer.specialization}</p>
      {!request && <><label className="instant-call-user-label" htmlFor="instant-call-duration">Choose duration</label><select id="instant-call-duration" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{durations.map((value) => <option key={value} value={value}>{value} minutes</option>)}</select><p className="instant-call-user-rate">₹{rate}/min · Total ₹{calculateInstantAmount(duration, rate)}</p><button type="button" className="instant-call-user-primary" onClick={startCall}><Phone size={17} /> Start Instant Call</button></>}
      {request?.status === 'ringing' && <div className="instant-call-user-waiting"><span className="instant-call-user-pulse" /><strong>Waiting for {astrologer.name}</strong><p>They will see your name and can accept or reject the call.</p><button type="button" className="instant-call-user-secondary" onClick={endCall}><PhoneOff size={16} /> Cancel Request</button></div>}
      {request?.status === 'rejected' && <div className="instant-call-user-result"><PhoneOff size={24} /><strong>Call rejected</strong><p>The astrologer is not available right now.</p><button type="button" className="instant-call-user-secondary" onClick={() => setRequest(null)}>Try Again</button></div>}
      {request?.status === 'accepted' && <div className="instant-call-user-connected"><div className="instant-call-user-session-meta"><span><Clock3 size={15} /> Duration: {request.durationMinutes} min</span><strong>{formatTime(remaining)}</strong></div><p>Voice conversation with {astrologer.name}</p><div className="instant-call-user-controls"><button type="button" className={speaker ? 'is-active' : ''} onClick={() => setSpeaker((value) => !value)}><Volume2 size={17} /> Speaker</button><button type="button" className="instant-call-user-end" onClick={endCall}><PhoneOff size={17} /> End Call</button></div></div>}
      {request?.status === 'ended' && <div className="instant-call-user-result"><Check size={24} /><strong>Call ended</strong><p>Thanks for using instant consultation.</p><button type="button" className="instant-call-user-primary" onClick={() => navigate('/user/call-astrologers')}>Back to Astrologers</button></div>}
    </section>
  </main>
}
