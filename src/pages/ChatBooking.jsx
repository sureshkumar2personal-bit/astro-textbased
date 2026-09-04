import { ArrowLeft, Check } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { mockAstrologers } from '../data/notificationData.js'
import { consultationAstrologers } from '../data/consultationAstrologers.js'
import { useAuth } from '../state/AuthContext.jsx'

const DURATIONS = [
  { minutes: 10, amount: 70 },
  { minutes: 15, amount: 150 },
]
const PURCHASE_KEY = 'astroconnect-chat-purchase'
const BIRTH_DETAILS_KEY = 'astroconnect-user-birth-details'

function readBirthDetails() {
  try { return JSON.parse(localStorage.getItem(BIRTH_DETAILS_KEY) || 'null') } catch { return null }
}

export default function ChatBooking() {
  const { astrologerId } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const astrologer = mockAstrologers.find(({ id }) => id === astrologerId) || mockAstrologers[0]
  const consultationAstrologer = consultationAstrologers.find(({ id }) => id === astrologer.id)
  const [selectedMinutes, setSelectedMinutes] = useState(null)
  const selectedPackage = DURATIONS.find(({ minutes }) => minutes === selectedMinutes)

  const startPayment = () => {
    if (!selectedPackage) return
    const purchase = {
      astrologerId: astrologer.id,
      astrologerName: astrologer.name,
      specialization: astrologer.specialization,
      profileImage: astrologer.profileImage,
      availability: astrologer.availability,
      chatRatePerMinute: Number(consultationAstrologer?.chatRate || 0),
      selectedDuration: selectedPackage.minutes,
      selectedAmount: selectedPackage.amount,
      birthDetails: location.state?.birthDetails || readBirthDetails(),
      paymentStatus: 'pending',
      returnPath: searchParams.get('from') === 'explore' ? '/user/astrologers' : '/user/chat-astrologers',
    }
    localStorage.setItem(`${PURCHASE_KEY}-${currentUser?.id || 'guest'}`, JSON.stringify(purchase))
    navigate('/payment-information')
  }

  return <main className="chat-booking-page">
    <button type="button" className="chat-booking-page__back" onClick={() => navigate('/user/chat-astrologers')}><ArrowLeft size={16} /> Back to Astrologers</button>
    <section className="chat-booking-page__panel">
      <header className="chat-booking-page__profile"><div className="chat-booking-page__avatar-wrap"><div className="chat-booking-page__avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><span className="chat-booking-page__status chat-booking-page__status--online" /></div><div><h1>Start Chat with {astrologer.name}</h1><p>{astrologer.specialization}</p><span>● {consultationAstrologer?.chatStatus || astrologer.availability}</span></div></header>
      <section className="chat-booking-page__packages"><h2>Choose Your Chat Duration</h2><div className="chat-booking-page__package-grid chat-booking-page__package-grid--two">{DURATIONS.map(({ minutes, amount }) => <button key={minutes} type="button" aria-pressed={selectedMinutes === minutes} onClick={() => setSelectedMinutes(minutes)} className={`chat-package ${selectedMinutes === minutes ? 'chat-package--selected' : ''}`}>{selectedMinutes === minutes && <span className="chat-package__check"><Check size={13} /></span>}<span>{minutes} Minutes</span><strong>₹{amount}</strong><em>{selectedMinutes === minutes ? 'Selected' : 'Select'}</em></button>)}</div></section>
      {selectedPackage && <button type="button" className="btn btn-primary chat-booking-page__start-button" onClick={startPayment}>Start Chat</button>}
    </section>
  </main>
}

export { PURCHASE_KEY }
