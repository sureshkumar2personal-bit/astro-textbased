import { Check, Clock3, MessageCircle, Phone, PhoneOff, Wallet, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { consultationAstrologers } from '../../data/consultationAstrologers.js'
import { getAstrologerPhoto } from '../../data/astrologerPhotos.js'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import ChatBirthDetailsStep from './ChatBirthDetailsStep.jsx'
import ConsultationRatingView from './ConsultationRatingView.jsx'
import {
  createInstantConsultation,
  getConsultationSecondsLeft,
  getConsultationTotalMinutes,
  getInstantConsultations,
  subscribeToInstantConsultations,
  updateInstantConsultation,
  useAstrologerLiveStatus,
} from '../../utils/instantConsultation.js'
import './instantcallmodal.css'

const CALL_DURATIONS = [5, 10, 15, 30]
const CHAT_DURATIONS = [5, 10, 15, 30]
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

/**
 * Pre-accept surface for both instant call and chat: pick a duration, pay, and
 * watch the astrologer ring. Chat collects birth details first. Once accepted,
 * InstantCallProvider swaps this out for FloatingConsultationPanel.
 */
export default function InstantCallModal({ type = 'call', astrologerId, onClose, onEnded }) {
  const { currentUser } = useAuth()
  const { userWallet, actions } = useAppData()
  const navigate = useNavigate()

  const astrologer = useMemo(
    () => consultationAstrologers.find((entry) => entry.id === astrologerId) || consultationAstrologers[0],
    [astrologerId],
  )

  const isCall = type === 'call'
  const durations = isCall ? CALL_DURATIONS : CHAT_DURATIONS
  const rate = Number(astrologer.callRate || 0)
  const chatRate = Number(astrologer.chatRate || 0)

  const [duration, setDuration] = useState(10)
  const [step, setStep] = useState('birth')
  const [birthDetails, setBirthDetails] = useState(null)
  const [request, setRequest] = useState(null)
  const [endedRequest, setEndedRequest] = useState(null)
  const [remaining, setRemaining] = useState(0)
  const [error, setError] = useState('')

  const liveStatus = useAstrologerLiveStatus(astrologer, type)
  const isAstrologerBusy = liveStatus.isLineBusy || (request && getInstantConsultations().some(
    (entry) => entry.id !== request.id && entry.astrologerId === astrologer.id && entry.status === 'accepted'
  ))

  const userId = currentUser?.id || 'guest'
  const balance = Number(userWallet?.balance || 0)
  const unitRate = isCall ? rate : chatRate
  const price = unitRate * duration

  // Tracks whether this popup opened onto an already-running session. Only
  // then does an ended record mean "the session you were in has finished".
  // Opening fresh for an astrologer you have consulted before must start a new
  // booking, not replay the old summary.
  const openedOnLiveSession = useRef(false)

  // Reset per astrologer so reopening the popup always starts clean.
  useEffect(() => {
    setDuration(10)
    setStep('birth')
    setBirthDetails(null)
    setRequest(null)
    setEndedRequest(null)
    setRemaining(0)
    setError('')
    openedOnLiveSession.current = null
  }, [astrologer.id, type, isCall])

  useEffect(() => {
    const refresh = (requests = getInstantConsultations()) => {
      const mine = requests.filter(
        (entry) => entry.userId === userId && entry.astrologerId === astrologer.id && entry.type === type,
      )
      const active = mine.find((entry) => entry.status !== 'ended') || null

      if (openedOnLiveSession.current === null) openedOnLiveSession.current = Boolean(active)

      if (!active && openedOnLiveSession.current) {
        onEnded?.(astrologer.id)
        const latest = mine.find((entry) => entry.status === 'ended')
        if (latest) setEndedRequest(latest)
      }

      setRequest(active)
    }
    refresh()
    return subscribeToInstantConsultations(refresh)
  }, [astrologer.id, type, userId, onEnded])

  useEffect(() => {
    if (request?.status !== 'accepted') return undefined
    const tick = () => setRemaining(getConsultationSecondsLeft(request))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [request])

  // Demo auto-accept: 3 seconds after ringing begins. It never accepts while that astrologer is already in a
  // live consultation: the request stays queued (ringing) so the astrologer's Waiting Users list shows it,
  // and it connects once the astrologer is free (or the astrologer accepts it by hand).
  useEffect(() => {
    if (!request || request.status !== 'ringing') return undefined
    const tryAccept = () => {
      const all = getInstantConsultations()
      const current = all.find((entry) => entry.id === request.id)
      if (!current || current.status !== 'ringing') return
      if (Date.now() - new Date(current.createdAt).getTime() < 3000) return
      const astrologerBusy = all.some((entry) => entry.id !== current.id && entry.astrologerId === current.astrologerId && entry.status === 'accepted')
      if (astrologerBusy) return
      updateInstantConsultation(request.id, {
        status: 'accepted',
        startedAt: new Date().toISOString(),
      })
    }
    const timer = window.setInterval(tryAccept, 500)
    return () => window.clearInterval(timer)
  }, [request?.id, request?.status])

  // After astrologer confirms & connects for chat: navigate to the Gemini live consultation workspace
  useEffect(() => {
    if (request?.status === 'accepted' && !isCall) {
      const timer = window.setTimeout(() => {
        onClose?.()
        navigate(`/user/instantchat/${astrologer.id}`)
      }, 700)
      return () => window.clearTimeout(timer)
    }
  }, [request?.status, isCall, astrologer.id, navigate, onClose])
  const startChat = () => {
    if (balance < price) {
      setError(`You need ${money(price - balance)} more to book this consultation.`)
      return
    }
    actions.debitUserWallet({
      amount: price,
      astrologer: astrologer.name,
      duration,
      service: isCall ? 'Call' : 'Chat',
      transactionId: `astro-connect:${type}:${userId}:${astrologer.id}:${duration}:${Date.now()}`,
    })
    createInstantConsultation({
      type,
      userId,
      userName: currentUser?.name,
      astrologerId: astrologer.id,
      astrologerName: astrologer.name,
      durationMinutes: duration,
      amount: price,
      pricePerMinute: unitRate,
      birthDetails: birthDetails || null,
      userAvatar: currentUser?.avatar || currentUser?.photo || currentUser?.profileImage || '',
      topic: birthDetails?.topic || 'Career',
    })
    setError('')
    setStep('pay')
  }

  // Move from duration to payment. Chat reached this step via birth details,
  // call directly from the duration picker.
  const beginBooking = () => {
    setError('')
    setStep('pay')
  }

  const endCall = () => request && updateInstantConsultation(request.id, { status: 'ended', endedAt: new Date().toISOString() })

  const overlayClick = () => {
    // Don't let a click on the backdrop silently discard a live session.
    if (request && request.status !== 'ended') return
    onClose?.()
  }

  return createPortal(
    <div className="modal-overlay user-modal-overlay instant-call-overlay" onClick={overlayClick}>
      <section
        className="modal-card user-modal-card instant-call-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="instant-call-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="instant-call-modal__header">
          <div className="instant-call-card__avatar">
            {getAstrologerPhoto(astrologer) ? (
              <img src={getAstrologerPhoto(astrologer)} alt={`${astrologer.name} profile`} />
            ) : (
              astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')
            )}
          </div>
          <div className="instant-call-modal__identity">
            <span
              className={`instant-call-status instant-call-status--${
                request?.status === 'accepted'
                  ? 'accepted'
                  : request?.status === 'rejected'
                    ? 'rejected'
                    : (request?.status === 'ringing' && isAstrologerBusy) || (!request && liveStatus.isBusy)
                      ? 'busy'
                      : request?.status || 'idle'
              }`}
            >
              {((request?.status === 'ringing' && isAstrologerBusy) || (!request && liveStatus.isBusy)) ? (
                <PhoneOff size={13} />
              ) : isCall ? (
                <Phone size={13} />
              ) : (
                <MessageCircle size={13} />
              )}
              {request?.status === 'accepted'
                ? 'Connected'
                : request?.status === 'ringing'
                  ? (isAstrologerBusy ? `Line Busy · ${liveStatus.waitLabel || '~wait for 3 mins'}` : 'Ringing…')
                  : request?.status === 'rejected'
                    ? 'Declined'
                    : liveStatus.isBusy
                      ? `Line Busy · ${liveStatus.waitLabel}`
                      : isCall
                        ? astrologer.callStatus
                        : astrologer.chatStatus}
            </span>
            <h2 id="instant-call-heading">{astrologer.name}</h2>
            <p>{astrologer.specialization}</p>
          </div>
          <button type="button" className="icon-btn" aria-label={`Close ${type} popup`} onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="instant-call-modal__body">
          {liveStatus.isBusy && !request && !endedRequest && (
            <div className="instant-call-busy-banner">
              <div className="instant-call-busy-banner__icon">
                <Clock3 size={16} />
              </div>
              <div className="instant-call-busy-banner__text">
                <strong>Line Busy · {liveStatus.waitLabel}</strong>
                <p>{astrologer.name} is currently consulting with another client. You can book now to join the waiting queue.</p>
              </div>
            </div>
          )}
          {!request && !endedRequest && (
            <>
              {step === 'birth' && (
                <ChatBirthDetailsStep
                  type={type}
                  currentUser={currentUser}
                  initial={birthDetails}
                  onBack={() => setStep('select')}
                  onContinue={(details) => {
                    setBirthDetails(details)
                    setStep('select')
                  }}
                />
              )}

              {step === 'select' && (
                <>
                  <section className="instant-call-section">
                    <h3>Choose {isCall ? 'call' : 'chat'} duration</h3>
                    <div className="instant-call-durations">
                      {durations.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`instant-call-duration${duration === value ? ' is-selected' : ''}`}
                          aria-pressed={duration === value}
                          onClick={() => setDuration(value)}
                        >
                          <span>{value} Minutes</span>
                          <strong>{money(unitRate * value)}</strong>
                          {duration === value && <em><Check size={12} /> Selected</em>}
                        </button>
                      ))}
                    </div>
                    <p className="instant-call-rate">{money(unitRate)}/min</p>
                  </section>

                  <button type="button" className="instant-call-primary" onClick={beginBooking}>
                    {isCall ? <Phone size={17} /> : <MessageCircle size={17} />} Continue
                  </button>

                  <button type="button" className="instant-call-secondary" onClick={() => setStep('birth')}>
                    Back to birth details
                  </button>
                </>
              )}

              {step === 'pay' && (
                <section className="instant-call-payment">
                  {birthDetails && (
                    <dl>
                      <div className="is-total"><dt>Birth details</dt><dd className="instant-call-payment__birth">Saved</dd></div>
                      {birthDetails.topic && (
                        <div>
                          <dt>Purpose of {isCall ? 'Call' : 'Chat'}</dt>
                          <dd style={{ color: 'var(--primary, #7c3aed)', fontWeight: 650 }}>{birthDetails.topic}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  <dl>
                    <div><dt>{isCall ? 'Call' : 'Chat'} duration</dt><dd>{duration} Minutes</dd></div>
                    <div><dt>Rate</dt><dd>{money(unitRate)}/min</dd></div>
                    <div className="is-total"><dt>Amount</dt><dd>{money(price)}</dd></div>
                    <div><dt>Wallet balance</dt><dd>{money(balance)}</dd></div>
                  </dl>
                  {error && <p className="instant-call-error">{error}</p>}
                  {balance < price ? (
                    <div className="instant-call-insufficient">
                      <button type="button" className="instant-call-primary" onClick={() => { onClose?.(); navigate('/user/wallet-history') }}>
                        <Wallet size={17} /> Add Money
                      </button>
                      <button type="button" className="instant-call-secondary" onClick={() => setStep('select')}>Cancel</button>
                    </div>
                  ) : (
                    <div className="instant-call-actions">
                      <button type="button" className="instant-call-primary" onClick={startChat}>Pay {money(price)}</button>
                      <button type="button" className="instant-call-secondary" onClick={() => setStep('select')}>Back</button>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {request?.status === 'ringing' && (
            isAstrologerBusy ? (
              <div className="instant-call-waiting instant-call-waiting--queue">
                <div className="instant-call-queue-badge">
                  <PhoneOff size={13} /> Line Busy
                </div>
                <span className="instant-call-pulse instant-call-pulse--busy" />
                <strong className="instant-call-queue-title">You are in queue for {astrologer.name}</strong>
                <div className="instant-call-queue-estimate">
                  <Clock3 size={15} />
                  <span>Estimated wait: <strong>{liveStatus.waitLabel || '~wait for 3 mins'}</strong></span>
                </div>
                <p className="instant-call-queue-hint">
                  {astrologer.name} is currently in consultation with another user. Your call will connect automatically as soon as the line is free!
                </p>
                <button type="button" className="instant-call-secondary" onClick={endCall}>
                  <PhoneOff size={16} /> Cancel Waiting
                </button>
              </div>
            ) : (
              <div className="instant-call-waiting">
                <span className="instant-call-pulse" />
                <strong>Waiting for response…</strong>
                <p>Connecting with {astrologer.name}…</p>
                <button type="button" className="instant-call-secondary" onClick={endCall}>
                  <PhoneOff size={16} /> Cancel Request
                </button>
              </div>
            )
          )}

          {request?.status === 'rejected' && (
            <div className="instant-call-result">
              <PhoneOff size={24} />
              <strong>{isCall ? 'Call declined' : 'Chat declined'}</strong>
              <p>The astrologer is not available right now.</p>
              <button type="button" className="instant-call-secondary" onClick={() => setRequest(null)}>Try Again</button>
            </div>
          )}

          {request?.status === 'accepted' && (
            <div className="instant-call-connected">
              <div className="instant-call-session-meta">
                <span><Clock3 size={15} /> {getConsultationTotalMinutes(request)} min total</span>
                <strong>{formatTime(remaining)}</strong>
              </div>
              <p className="instant-call-handover">
                {isCall
                  ? 'Connected. This call continues in the corner panel.'
                  : 'Connected! Loading your horoscope chart & consultation workspace…'}
              </p>
              {!isCall && (
                <button
                  type="button"
                  className="instant-call-primary"
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    onClose?.()
                    navigate(`/user/instantchat/${astrologer.id}`)
                  }}
                >
                  Enter Chat Room →
                </button>
              )}
            </div>
          )}

          {!request && endedRequest && (
            <ConsultationRatingView
              session={endedRequest}
              astrologer={astrologer}
              onClose={() => {
                setEndedRequest(null)
                setStep('select')
                onClose?.()
              }}
            />
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}