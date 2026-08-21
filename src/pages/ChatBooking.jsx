import { ArrowLeft, Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CHAT_PACKAGES, mockAstrologers } from '../data/notificationData.js'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

const FREE_CHAT_DURATION_MS = 2 * 60 * 1000

function formatCount(count) {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}K` : String(count)
}

function experienceYears(experience) {
  return String(experience).match(/\d+/)?.[0] || experience
}

function getFreeChatSession(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null')
    if (!stored) return null
    if (!stored.freeUsed && Date.now() - stored.startedAt >= FREE_CHAT_DURATION_MS) {
      const ended = { ...stored, freeUsed: true, freeRemaining: 0 }
      localStorage.setItem(key, JSON.stringify(ended))
      return ended
    }
    return stored
  } catch {
    return null
  }
}

export default function ChatBooking() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const astrologer = mockAstrologers.find(({ id }) => id === searchParams.get('id')) || mockAstrologers[0]
  const storageKey = `astro-connect:free-chat:${currentUser?.id || 'guest'}:${astrologer.id}`
  const initialPackage = CHAT_PACKAGES.some(({ id }) => id === searchParams.get('package')) ? searchParams.get('package') : null
  const [selectedPackageId, setSelectedPackageId] = useState(initialPackage)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const freeChatSession = getFreeChatSession(storageKey)
  const selectedPackage = CHAT_PACKAGES.find(({ id }) => id === selectedPackageId)
  const freeChatAvailable = !freeChatSession
  const freeChatInProgress = freeChatSession && !freeChatSession.freeUsed
  const freeRemaining = freeChatSession ? Math.max(0, Math.ceil((FREE_CHAT_DURATION_MS - (Date.now() - freeChatSession.startedAt)) / 1000)) : 120
  const totalMinutes = selectedPackage ? selectedPackage.duration + (freeChatAvailable ? 2 : freeChatInProgress ? Math.ceil(freeRemaining / 60) : 0) : null

  const startFreeChat = () => {
    if (!freeChatInProgress) {
      localStorage.setItem(storageKey, JSON.stringify({ startedAt: Date.now(), freeUsed: false, freeRemaining: 120, paidDuration: 0, totalDuration: 120 }))
    }
    navigate(`${routes.chat}?id=${astrologer.id}&mode=free`)
  }

  return (
    <main className="chat-booking-page">
      <button type="button" className="chat-booking-page__back" onClick={() => navigate(routes.astrologers)}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Astrologers
      </button>

      <section className="chat-booking-page__panel">
        <header className="chat-booking-page__profile">
          <div className="chat-booking-page__avatar-wrap">
            <div className="chat-booking-page__avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
            <span className={`chat-booking-page__status ${astrologer.availability === 'Online' ? 'chat-booking-page__status--online' : ''}`} />
          </div>
          <div>
            <h1>Chat with {astrologer.name}</h1>
            <p>{astrologer.specialization}</p>
            <span>Ex {experienceYears(astrologer.experience)} · <strong>{formatCount(astrologer.followers)} Followers</strong></span>
          </div>
        </header>

        {freeChatAvailable && (
          <section className="free-chat-offer" aria-labelledby="free-chat-heading">
            <div>
              <span className="free-chat-offer__eyebrow">2 Minutes Free</span>
              <h2 id="free-chat-heading">Try a free chat with this astrologer</h2>
              <p>Start your consultation with 2 free minutes.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={startFreeChat}>Start Free Chat →</button>
          </section>
        )}

        {freeChatInProgress && (
          <section className="free-chat-offer free-chat-offer--in-progress">
            <div>
              <span className="free-chat-offer__eyebrow">Free Chat In Progress</span>
              <h2>Continue your free chat</h2>
              <p>Your two-minute free chat is already underway.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={startFreeChat}>Resume Free Chat →</button>
          </section>
        )}

        {freeChatSession?.used && <p className="chat-booking-page__used-note">Free 2-minute chat used. Choose a package to continue chatting.</p>}

        <section className="chat-booking-page__packages" aria-labelledby="chat-packages-heading">
          <h2 id="chat-packages-heading">Chat Packages</h2>
          <div className="chat-booking-page__package-grid">
            {CHAT_PACKAGES.map((chatPackage) => {
              const selected = chatPackage.id === selectedPackageId
              return (
                <button key={chatPackage.id} type="button" aria-pressed={selected} onClick={() => { setSelectedPackageId(chatPackage.id); setShowConfirmation(false) }} className={`chat-package ${selected ? 'chat-package--selected' : ''}`}>
                  {selected && <span className="chat-package__check"><Check size={13} aria-hidden="true" /></span>}
                  <span>{chatPackage.duration} Minutes</span>
                  <strong>₹{chatPackage.total}</strong>
                  <small>₹{chatPackage.rate}/min</small>
                  <em>{selected ? 'Selected' : 'Select'}</em>
                </button>
              )
            })}
          </div>
        </section>

        {selectedPackage && (
          <section className="chat-booking-page__summary" aria-labelledby="chat-summary-heading">
            <h2 id="chat-summary-heading">Chat Summary</h2>
            <dl>
              <div><dt>Astrologer</dt><dd>{astrologer.name}</dd></div>
              <div><dt>Free Time</dt><dd>{freeChatAvailable ? '2 Minutes' : freeChatInProgress ? `${Math.ceil(freeRemaining / 60)} Minutes remaining` : 'Used'}</dd></div>
              <div><dt>Paid Package</dt><dd>{selectedPackage.duration} Minutes</dd></div>
              <div><dt>Total Chat</dt><dd>{totalMinutes} Minutes</dd></div>
              <div><dt>Rate</dt><dd>₹{selectedPackage.rate}/min</dd></div>
              <div className="chat-booking-page__total"><dt>Amount</dt><dd>₹{selectedPackage.total}</dd></div>
            </dl>
            {showConfirmation ? (
              <div className="chat-booking-page__confirmation">
                <p>Confirm your ₹{selectedPackage.total} chat package with {astrologer.name}.</p>
                <button type="button" className="btn btn-primary" onClick={() => navigate(`${routes.chatWalletPayment}?id=${astrologer.id}&package=${selectedPackage.id}`)}>Start Chat →</button>
              </div>
            ) : (
              <button type="button" className="btn btn-primary chat-booking-page__start-button" onClick={() => setShowConfirmation(true)}>Start Chat →</button>
            )}
          </section>
        )}
      </section>
    </main>
  )
}
