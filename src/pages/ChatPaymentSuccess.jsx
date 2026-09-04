import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { mockAstrologers } from '../data/notificationData.js'
import { useAuth } from '../state/AuthContext.jsx'
import { PURCHASE_KEY } from './ChatBooking.jsx'

export default function ChatPaymentSuccess() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const storageKey = `${PURCHASE_KEY}-${currentUser?.id || 'guest'}`
  let purchase = null
  try { purchase = JSON.parse(localStorage.getItem(storageKey) || 'null') } catch { purchase = null }
  const astrologer = mockAstrologers.find(({ id }) => id === purchase?.astrologerId) || mockAstrologers[0]

  const continueToChat = () => {
    if (!purchase || purchase.paymentStatus !== 'successful') return
    const startTime = Date.now()
    const session = { id: purchase.transactionId, astrologerId: purchase.astrologerId, astrologerName: purchase.astrologerName, ratePerMinute: Number(purchase.chatRatePerMinute || 0), selectedDuration: purchase.selectedDuration, totalAmount: purchase.selectedAmount, birthDetails: purchase.birthDetails || null, returnPath: purchase.returnPath || '/user/chat-astrologers', startTime, endTime: startTime + purchase.selectedDuration * 60 * 1000, status: 'active', messages: [] }
    localStorage.setItem(`astroconnect-app-data-chat-session-${currentUser?.id || 'guest'}`, JSON.stringify(session))
    navigate(`/chat/${purchase.astrologerId}?sessionId=${session.id}`)
  }

  return <main className="wallet-payment-page payment-success-page"><section className="wallet-success-card payment-success-card"><span className="wallet-success-card__icon"><Check size={25} /></span><h1>Payment Successful</h1><p>Your payment of ₹{purchase?.selectedAmount || 0} was successful.</p><section className="payment-success-card__astrologer"><div className="wallet-payment-page__avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>Chat with: {astrologer.name}</strong><span>Duration: {purchase?.selectedDuration || 0} Minutes</span></div></section><button type="button" className="btn btn-primary" onClick={continueToChat}>Continue to Chat</button></section></main>
}
