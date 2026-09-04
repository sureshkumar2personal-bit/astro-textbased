import { ArrowLeft, Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { mockAstrologers } from '../data/notificationData.js'
import { consultationAstrologers } from '../data/consultationAstrologers.js'
import { useAuth } from '../state/AuthContext.jsx'

const PACKAGES = [{ minutes: 10, amount: 70 }, { minutes: 15, amount: 150 }]
export const CALL_PURCHASE_KEY = 'astroconnect-call-purchase'

export default function CallBooking() {
  const { astrologerId } = useParams(); const { currentUser } = useAuth(); const navigate = useNavigate(); const [searchParams] = useSearchParams()
  const astrologer = mockAstrologers.find(({ id }) => id === astrologerId) || mockAstrologers[0]
  const consultation = consultationAstrologers.find(({ id }) => id === astrologer.id)
  const [selectedMinutes, setSelectedMinutes] = useState(null)
  const selected = PACKAGES.find(({ minutes }) => minutes === selectedMinutes)
  const returnPath = searchParams.get('from') === 'explore' ? '/user/astrologers' : '/user/call-astrologers'
  const startPayment = () => {
    if (!selected) return
    localStorage.setItem(`${CALL_PURCHASE_KEY}-${currentUser?.id || 'guest'}`, JSON.stringify({ astrologerId: astrologer.id, astrologerName: astrologer.name, specialization: astrologer.specialization, selectedDuration: selected.minutes, selectedAmount: selected.amount, callRatePerMinute: Number(consultation?.callRate || 0), availability: astrologer.availability, returnPath: searchParams.get('from') === 'explore' ? '/user/astrologers' : '/user/call-astrologers', paymentStatus: 'pending' }))
    navigate(`/call-payment/${astrologer.id}`)
  }
  return <main className="chat-booking-page"><button type="button" className="chat-booking-page__back" onClick={() => navigate('/user/call-astrologers')}><ArrowLeft size={16} /> Back to Astrologers</button><section className="chat-booking-page__panel"><header className="chat-booking-page__profile"><div className="chat-booking-page__avatar-wrap"><div className="chat-booking-page__avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><span className="chat-booking-page__status chat-booking-page__status--online" /></div><div><h1>Start Call with {astrologer.name}</h1><p>{astrologer.specialization}</p><span>● {consultation?.callStatus || astrologer.availability}</span></div></header><section className="chat-booking-page__packages"><h2>Choose Your Call Duration</h2><div className="chat-booking-page__package-grid chat-booking-page__package-grid--two">{PACKAGES.map(({ minutes, amount }) => <button key={minutes} type="button" aria-pressed={selectedMinutes === minutes} onClick={() => setSelectedMinutes(minutes)} className={`chat-package ${selectedMinutes === minutes ? 'chat-package--selected' : ''}`}>{selectedMinutes === minutes && <span className="chat-package__check"><Check size={13} /></span>}<span>{minutes} Minutes</span><strong>₹{amount}</strong><em>{selectedMinutes === minutes ? 'Selected' : 'Select'}</em></button>)}</div></section>{selected && <button type="button" className="btn btn-primary chat-booking-page__start-button" onClick={startPayment}>Start Call</button>}</section></main>
}
