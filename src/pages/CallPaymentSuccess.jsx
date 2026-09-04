import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { mockAstrologers } from '../data/notificationData.js'
import { useAuth } from '../state/AuthContext.jsx'
import { CALL_PURCHASE_KEY } from './CallBooking.jsx'

export default function CallPaymentSuccess() {
  const { currentUser } = useAuth(); const navigate = useNavigate(); let purchase = null
  try { purchase = JSON.parse(localStorage.getItem(`${CALL_PURCHASE_KEY}-${currentUser?.id || 'guest'}`) || 'null') } catch { purchase = null }
  const astrologer = mockAstrologers.find(({ id }) => id === purchase?.astrologerId) || mockAstrologers[0]
  const continueToCall = () => { if (!purchase || purchase.paymentStatus !== 'successful') return; const startTime = Date.now(); localStorage.setItem(`astroconnect-app-data-call-session-${currentUser?.id || 'guest'}`, JSON.stringify({ id: purchase.transactionId, astrologerId: purchase.astrologerId, astrologerName: purchase.astrologerName, selectedDuration: purchase.selectedDuration, totalAmount: purchase.selectedAmount, callRatePerMinute: purchase.callRatePerMinute, returnPath: purchase.returnPath || '/user/call-astrologers', startTime, endTime: startTime + purchase.selectedDuration * 60 * 1000, status: 'active' })); navigate(`/call/${purchase.astrologerId}?sessionId=${purchase.transactionId}`) }
  return <main className="wallet-payment-page payment-success-page"><section className="wallet-success-card payment-success-card"><span className="wallet-success-card__icon"><Check size={25} /></span><h1>Payment Successful</h1><p>Your payment of ₹{purchase?.selectedAmount || 0} was successful.</p><section className="payment-success-card__astrologer"><div className="wallet-payment-page__avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>Call with: {astrologer.name}</strong><span>Duration: {purchase?.selectedDuration || 0} Minutes</span></div></section><button type="button" className="btn btn-primary" onClick={continueToCall}>Continue to Call</button></section></main>
}
