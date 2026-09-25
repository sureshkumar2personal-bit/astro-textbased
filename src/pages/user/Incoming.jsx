import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PhoneCall, PhoneOff, Mic, MicOff, Star, Check } from 'lucide-react'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import './Incoming.css'

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Incoming() {
  const { appointmentId: paramId } = useParams()
  const [searchParams] = useSearchParams()
  const appointmentId = paramId || searchParams.get('appointmentId')
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { appointments, appointmentCalls, actions } = useAppData()

  const [muted, setMuted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [hoverRating, setHoverRating] = useState(0)

  const relevantCalls = useMemo(() => appointmentCalls.filter((c) => c.userId === currentUser?.id || (currentUser?.role === 'user' && c.userId === 'user-demo')), [appointmentCalls, currentUser?.id, currentUser?.role])

  const call = useMemo(() => {
    if (appointmentId) return appointmentCalls.find((c) => c.appointmentId === appointmentId) || null
    return relevantCalls.find((c) => c.status === 'ringing') || relevantCalls.find((c) => c.status === 'missed') || relevantCalls.find((c) => c.status === 'accepted') || relevantCalls[0] || null
  }, [appointmentCalls, appointmentId, relevantCalls])

  const appointment = useMemo(() => {
    if (!call) return null
    return appointments.find((a) => a.id === call.appointmentId) || null
  }, [appointments, call])

  const status = call?.status || 'idle'

  useEffect(() => {
    if (status !== 'accepted') return undefined
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [status])

  useEffect(() => {
    if (call?.status === 'accepted') setSeconds(0)
  }, [call?.status, call?.id])

  const handleAccept = () => {
    if (!call) return
    actions.acceptAppointmentCall(call.id)
  }
  const handleDecline = () => {
    if (!call) return
    actions.declineAppointmentCall(call.id)
  }
  const handleEnd = () => {
    if (!call) return
    actions.endAppointmentCall(call.id, { durationSeconds: seconds })
    // also complete appointment via existing flow if needed
    if (appointment && appointment.status === 'Booked') actions.completeAppointmentCall(appointment.id, { callDurationSeconds: seconds })
  }
  const handleSubmitRating = () => {
    if (!call || !rating) return
    actions.rateAppointmentCall(call.id, rating, feedback)
  }

  if (!call) {
    return (
      <div className="user-incoming-page">
        <PageHeader eyebrow="User portal" title="Incoming Call" subtitle="No incoming call at the moment." showBack />
        <Card className="user-incoming-empty">
          <PhoneCall size={28} />
          <strong>No incoming call</strong>
          <p>When your astrologer starts your scheduled appointment, you’ll see the call here.</p>
          <Link className="btn btn-outline" to="/user/appointments/my">Back to Appointment History</Link>
        </Card>
      </div>
    )
  }

  const isRinging = status === 'ringing'
  const isAccepted = status === 'accepted'
  const isEnded = status === 'ended' || status === 'declined'
  const isMissed = status === 'missed'
  const alreadyRated = Boolean(call.rating)

  return (
    <div className="user-incoming-page">
      <PageHeader eyebrow="User portal" title="Incoming Call" subtitle={appointment ? `${appointment.astrologer} · ${appointment.time} · ${appointment.date}` : 'Appointment call'} showBack />

      {isRinging && (
        <Card className="user-incoming-card user-incoming-card--ringing">
          <div className="user-incoming-avatar">{(call.astrologerName || 'A').slice(0,2).toUpperCase()}</div>
          <h2>{call.astrologerName || appointment?.astrologer || 'Your Astrologer'} is calling…</h2>
          <p>{appointment ? `${appointment.type || 'Audio Call'} · Booking ${appointment.orderId || appointment.id}` : `Incoming appointment call`}</p>
          <span className="user-incoming-pulse" />
          <div className="user-incoming-actions">
            <button type="button" className="btn btn-primary user-incoming-accept" onClick={handleAccept}><PhoneCall size={16} /> Accept</button>
            <button type="button" className="btn btn-outline user-incoming-decline" onClick={handleDecline}><PhoneOff size={16} /> Decline</button>
          </div>
          <small className="muted">LocalStorage sync — open astrologer and user in two tabs to test mutual</small>
        </Card>
      )}

      {isAccepted && (
        <Card className="user-incoming-card user-incoming-card--connected">
          <div className="user-incoming-connected-head">
            <span className="user-incoming-live-dot" /> Connected · {formatDuration(seconds)}
          </div>
          <div className="user-incoming-avatar user-incoming-avatar--small">{(call.astrologerName || 'A').slice(0,2).toUpperCase()}</div>
          <h2>{call.astrologerName || appointment?.astrologer}</h2>
          <p>{appointment?.topic || 'Appointment call in progress'}</p>
          <div className="user-incoming-call-controls">
            <button type="button" className={`user-incoming-mute ${muted ? 'is-active' : ''}`} onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? <MicOff size={18} /> : <Mic size={18} />} <span>{muted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button type="button" className="user-incoming-end" onClick={handleEnd}><PhoneOff size={18} /> <span>End Call</span></button>
          </div>
        </Card>
      )}

      {isEnded && !alreadyRated && (
        <Card className="user-incoming-card user-incoming-card--ended">
          <PhoneOff size={32} />
          <h2>Call Ended</h2>
          <p>Duration {formatDuration(call.durationSeconds || seconds)} · How was your consultation?</p>
          <div className="user-incoming-ratings">
            <div className="user-incoming-stars">
              {[1,2,3,4,5].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`user-incoming-star ${ (hoverRating || rating) >= s ? 'is-active' : ''}`}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                  aria-label={`Rate ${s} stars`}
                >
                  <Star size={26} fill={(hoverRating || rating) >= s ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <label className="user-incoming-feedback">
              <span>Optional feedback</span>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Share your experience (optional)..." rows={3} />
            </label>
            <button type="button" className="btn btn-primary" disabled={!rating} onClick={handleSubmitRating}><Check size={14} /> Submit Rating</button>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/user/appointments/my')}>Skip</button>
        </Card>
      )}

      {isEnded && alreadyRated && (
        <Card className="user-incoming-card user-incoming-card--rated">
          <Check size={28} />
          <h2>Thank you!</h2>
          <p>You rated {call.rating} ★ {call.feedback ? `· "${call.feedback.slice(0,80)}"` : ''}</p>
          <div className="user-incoming-rated-actions">
            <Link className="btn btn-outline" to="/user/appointments/my">Back to Appointment History</Link>
            {appointment && <Link className="btn btn-primary" to={`/user/atonements?appointmentId=${appointment.id}`}>🪔 View Pariharam</Link>}
          </div>
        </Card>
      )}

      {call.status === 'declined' && (
        <Card className="user-incoming-card">
          <PhoneOff size={28} />
          <h2>Call Declined</h2>
          <Link className="btn btn-outline" to="/user/appointments/my">Back</Link>
        </Card>
      )}

      {isMissed && (
        <Card className="user-incoming-card user-incoming-card--missed">
          <PhoneOff size={28} />
          <h2>Missed Call</h2>
          <p>You missed a call from {call.astrologerName || appointment?.astrologer || 'your astrologer'} · {appointment?.time || ''}</p>
          <small className="muted">Check notifications for details</small>
          <div className="user-incoming-rated-actions">
            <Link className="btn btn-outline" to="/user/appointments/my">Back to History</Link>
            <Link className="btn btn-primary" to={`/user/appointments/my`}>Call Back</Link>
          </div>
        </Card>
      )}
    </div>
  )
}
