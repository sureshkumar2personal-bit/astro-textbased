import { MessageCircle, Phone, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { consultationAstrologers } from '../../data/consultationAstrologers.js'
import { useInstantCall } from '../../state/InstantCallContext.jsx'
import { getConsultationSecondsLeft } from '../../utils/instantConsultation.js'

const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

/**
 * Header chip for a session whose floating panel was dismissed. It keeps ticking
 * while the session runs, so the panel can be brought back from anywhere.
 */
export default function ActiveCallIndicator() {
  const { active, isChipHidden, openInstantCall, openInstantChat, hideChip } = useInstantCall()
  const [remaining, setRemaining] = useState(0)

  const session = active

  useEffect(() => {
    if (session?.status !== 'accepted') return undefined
    const tick = () => setRemaining(getConsultationSecondsLeft(session))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [session])

  if (!session || isChipHidden) return null

  const isCall = session.type === 'call'
  const astrologer = consultationAstrologers.find((entry) => entry.id === session.astrologerId) || consultationAstrologers[0]
  const ringing = session.status === 'ringing'
  const timeUp = !ringing && remaining === 0

  const reopen = () => (isCall ? openInstantCall(session.astrologerId) : openInstantChat(session.astrologerId))

  return (
    <div className={`active-call-chip${ringing ? ' is-ringing' : ''}${timeUp ? ' is-timeup' : ''}`}>
      <button
        type="button"
        className="active-call-chip__reopen"
        onClick={reopen}
        aria-label={`Return to your ${isCall ? 'call' : 'chat'} with ${astrologer.name}`}
        title={`Return to your ${isCall ? 'call' : 'chat'} with ${astrologer.name}`}
      >
        <span className="active-call-chip__pulse">{isCall ? <Phone size={13} /> : <MessageCircle size={13} />}</span>
        <span className="active-call-chip__text">
          <strong>{ringing ? 'Ringing…' : timeUp ? 'Time up' : formatTime(remaining)}</strong>
          <small>{astrologer.name}</small>
        </span>
      </button>
      <button
        type="button"
        className="active-call-chip__close"
        onClick={() => hideChip(session.id)}
        aria-label="Hide indicator"
        title="Hide indicator"
      >
        <X size={13} />
      </button>
    </div>
  )
}