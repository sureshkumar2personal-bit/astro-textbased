import { ArrowLeft, Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CHAT_PACKAGES, mockAstrologers } from '../data/notificationData.js'
import { useAuth } from '../state/AuthContext.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
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
  const { actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const astrologer = mockAstrologers.find(({ id }) => id === searchParams.get('id')) || mockAstrologers[0]
  const storageKey = `astro-connect:free-chat:${currentUser?.id || 'guest'}:${astrologer.id}`
  const initialPackage = CHAT_PACKAGES.some(({ id }) => id === searchParams.get('package')) ? searchParams.get('package') : null
  const [selectedPackageId, setSelectedPackageId] = useState(initialPackage)
  const freeChatSession = getFreeChatSession(storageKey)
  const selectedPackage = CHAT_PACKAGES.find(({ id }) => id === selectedPackageId)
  const freeChatAvailable = !freeChatSession
  const freeChatInProgress = freeChatSession && !freeChatSession.freeUsed
  const freeRemaining = freeChatSession ? Math.max(0, Math.ceil((FREE_CHAT_DURATION_MS - (Date.now() - freeChatSession.startedAt)) / 1000)) : 120

  const startFreeChat = () => {
    if (!freeChatInProgress) {
      localStorage.setItem(storageKey, JSON.stringify({ startedAt: Date.now(), freeUsed: false, freeRemaining: 120, paidDuration: 0, totalDuration: 120 }))
      actions.createIncomingRequest({
        type: 'chat',
        userId: currentUser?.id,
        userName: currentUser?.name,
        userUsername: currentUser?.id,
        astrologerId: astrologer.id,
      })
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

        <section className="chat-booking-page__packages" aria-labelledby="chat-packages-heading">
          <h2 id="chat-packages-heading">Choose Your Chat Duration</h2>
          <div className="chat-booking-page__package-grid">
            {CHAT_PACKAGES.map((chatPackage) => {
              const selected = chatPackage.id === selectedPackageId
              return (
                <button key={chatPackage.id} type="button" aria-pressed={selected} onClick={() => setSelectedPackageId(chatPackage.id)} className={`chat-package ${selected ? 'chat-package--selected' : ''}`}>
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

        {selectedPackage && <><button type="button" className="btn btn-primary chat-booking-page__start-button" onClick={() => navigate(`${routes.chatWalletPayment}?id=${astrologer.id}&package=${selectedPackage.id}`)}>Start Chat →</button><p className="chat-booking-page__note">You will be connected with the astrologer after your payment is confirmed.</p></>}
      </section>
    </main>
  )
}
