import { Clock3, MessageCircle, Phone, PhoneOff, Plus, Send, Volume2, Wallet, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { consultationAstrologers } from '../../data/consultationAstrologers.js'
import { useAppData } from '../../state/AppDataContext.jsx'
import {
  addConsultationMinutes,
  getConsultationSecondsLeft,
  getConsultationTotalMinutes,
  getInstantConsultation,
  subscribeToInstantConsultations,
  updateInstantConsultation,
} from '../../utils/instantConsultation.js'
import './floatingconsultationpanel.css'

const DURATIONS = [5, 10, 15, 30]
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

/**
 * Post-accept surface for the user, mirroring the floating panel the astrologer
 * gets on their side. Attached by InstantCallProvider the moment a session is
 * accepted, so it follows the user across pages.
 */
export default function FloatingConsultationPanel({ session, onDismiss, onEnded }) {
  const { userWallet, actions } = useAppData()
  const navigate = useNavigate()

  const isCall = session.type === 'call'
  const astrologer = useMemo(
    () => consultationAstrologers.find((entry) => entry.id === session.astrologerId) || consultationAstrologers[0],
    [session.astrologerId],
  )

  const [request, setRequest] = useState(() => getInstantConsultation(session.id) || session)
  const [remaining, setRemaining] = useState(0)
  const [speaker, setSpeaker] = useState(false)
  const [draft, setDraft] = useState('')
  const [extensionOpen, setExtensionOpen] = useState(false)
  const [extensionDuration, setExtensionDuration] = useState(10)
  const [error, setError] = useState('')

  const userId = session.userId
  const unitRate = Number(isCall ? astrologer.callRate : astrologer.chatRate || 0)
  const balance = Number(userWallet?.balance || 0)
  const extensionPrice = unitRate * extensionDuration

  // Subscribe so messages from the astrologer, extensions, and status changes
  // land live in the panel.
  useEffect(() => {
    const refresh = () => setRequest(getInstantConsultation(session.id) || null)
    refresh()
    return subscribeToInstantConsultations(refresh)
  }, [session.id])

  useEffect(() => {
    if (request?.status !== 'accepted') return undefined
    const tick = () => setRemaining(getConsultationSecondsLeft(request))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [request])

  const end = () => request && updateInstantConsultation(request.id, { status: 'ended', endedAt: new Date().toISOString() })

  const send = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || request?.status !== 'accepted') return
    updateInstantConsultation(request.id, {
      messages: [...(request.messages || []), { id: crypto.randomUUID(), sender: 'user', text, sentAt: new Date().toISOString() }],
    })
    setDraft('')
  }

  const buyExtension = () => {
    if (!request) return
    if (balance < extensionPrice) {
      setError(`You need ${money(extensionPrice - balance)} more to extend.`)
      return
    }
    actions.debitUserWallet({
      amount: extensionPrice,
      astrologer: astrologer.name,
      duration: extensionDuration,
      service: isCall ? 'Call Extension' : 'Chat Extension',
      transactionId: `astro-connect:${session.type}-extension:${userId}:${request.id}:${extensionDuration}:${Date.now()}`,
    })
    updateInstantConsultation(request.id, { extensionAmount: extensionPrice })
    addConsultationMinutes(request.id, extensionDuration)
    setError('')
    setExtensionOpen(false)
  }

  const ringing = request?.status === 'ringing'
  const timeUp = request?.status === 'accepted' && remaining === 0

  return createPortal(
    <aside className="floating-consult-panel" aria-live="polite">
      <section className={`floating-consult-card${ringing ? ' is-ringing' : ''}${timeUp ? ' is-timeup' : ''}`}>
        <button
          type="button"
          className="floating-consult-card__dismiss"
          onClick={() => (ringing ? onEnded?.(request.id) : onDismiss?.(request.id))}
          aria-label={ringing ? 'Cancel request' : 'Hide panel'}
          title={ringing ? 'Cancel request' : 'Hide panel'}
        >
          <X size={14} />
        </button>

        {ringing && (
          <div className="floating-consult-request">
            <div className="floating-consult-icon">{isCall ? <Phone size={22} /> : <MessageCircle size={22} />}</div>
            <span className="floating-consult-badge">{isCall ? 'INSTANT CALL' : 'INSTANT CHAT'}</span>
            <h2>Ringing {astrologer.name}</h2>
            <p><Clock3 size={14} /> {getConsultationTotalMinutes(request)} min booked</p>
            <div className="floating-consult-actions">
              <button type="button" className="floating-consult-accept" onClick={() => end()}>
                <PhoneOff size={17} /> Cancel Request
              </button>
            </div>
          </div>
        )}

        {request?.status === 'accepted' && (
          <div className="floating-consult-active">
            <header>
              <span className="floating-consult-live"><span /> Live {isCall ? 'call' : 'chat'}</span>
              <strong>{formatTime(remaining)}</strong>
            </header>

            <div className="floating-consult-person">
              <div className="floating-consult-avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
              <div>
                <h2>{astrologer.name}</h2>
                <p>{isCall ? 'Voice' : 'Text'} consultation · {getConsultationTotalMinutes(request)} min</p>
              </div>
            </div>

            {timeUp && !extensionOpen && (
              <div className="floating-consult-timeup">
                <Clock3 size={14} />
                <span>Time is up. Extend to keep going.</span>
              </div>
            )}

            {extensionOpen ? (
              <div className="floating-consult-extension">
                <strong>Extend {isCall ? 'call' : 'chat'}</strong>
                <div className="floating-consult-durations">
                  {DURATIONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={extensionDuration === value ? 'is-selected' : ''}
                      onClick={() => setExtensionDuration(value)}
                    >
                      {value}m<small>{money(unitRate * value)}</small>
                    </button>
                  ))}
                </div>
                {error && <p className="floating-consult-error">{error}</p>}
                {balance < extensionPrice ? (
                  <button type="button" className="floating-consult-addmoney" onClick={() => navigate('/user/wallet-history')}>
                    <Wallet size={15} /> Add {money(extensionPrice - balance)} to wallet
                  </button>
                ) : (
                  <button type="button" className="floating-consult-extend" onClick={buyExtension}>
                    <Plus size={15} /> Extend &amp; Pay {money(extensionPrice)}
                  </button>
                )}
                <button type="button" className="floating-consult-cancel" onClick={() => setExtensionOpen(false)}>Cancel</button>
              </div>
            ) : (
              <>
                <div className="floating-consult-conversation">
                  {(request.messages || []).map((message) => (
                    <p key={message.id} className={`floating-consult-message floating-consult-message--${message.sender}`}>{message.text}</p>
                  ))}
                  {!isCall && !(request.messages || []).length && <small className="floating-consult-hint">Say hello to begin.</small>}
                  {isCall && <small><MessageCircle size={13} /> You can send a message while speaking</small>}
                </div>

                <form className="floating-consult-composer" onSubmit={send}>
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={isCall ? 'Send a message...' : 'Write a message...'}
                  />
                  <button type="submit" disabled={!draft.trim()}><Send size={16} /></button>
                </form>

                {isCall && !timeUp && (
                  <button
                    type="button"
                    className={`floating-consult-speaker${speaker ? ' is-active' : ''}`}
                    onClick={() => setSpeaker((value) => !value)}
                  >
                    <Volume2 size={16} /> {speaker ? 'Speaker on' : 'Speaker'}
                  </button>
                )}

                <button type="button" className="floating-consult-extend-link" onClick={() => setExtensionOpen(true)}>
                  <Plus size={15} /> Extend
                </button>

                <button type="button" className="floating-consult-end" onClick={end}>
                  <PhoneOff size={17} /> End {isCall ? 'Call' : 'Chat'}
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </aside>,
    document.body,
  )
}