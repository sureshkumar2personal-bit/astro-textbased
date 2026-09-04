import { ArrowLeft, CreditCard, Radio, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockAstrologers } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { PURCHASE_KEY } from './ChatBooking.jsx'

const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`

function readPurchase(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}

export default function ChatPaymentInformation() {
  const { currentUser } = useAuth()
  const { userWallet, actions } = useAppData()
  const navigate = useNavigate()
  const storageKey = `${PURCHASE_KEY}-${currentUser?.id || 'guest'}`
  const purchase = readPurchase(storageKey)
  const astrologer = mockAstrologers.find(({ id }) => id === purchase?.astrologerId) || mockAstrologers[0]
  const amount = Number(purchase?.selectedAmount || 0)
  const [method, setMethod] = useState('wallet')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  if (!purchase) return <main className="call-payment-page"><section className="call-payment-page__card"><h1>Payment Information</h1><p>No chat package is waiting for payment.</p><button type="button" className="btn btn-primary" onClick={() => navigate('/user/chat-astrologers')}>Back to Astrologers</button></section></main>

  const pay = () => {
    if (processing) return
    if (Number(userWallet?.balance || 0) < amount) {
      setError('Insufficient wallet balance. Please add money before paying.')
      return
    }
    setProcessing(true)
    window.setTimeout(() => {
      const transactionId = `chat-purchase-${purchase.astrologerId}-${purchase.selectedDuration}-${currentUser?.id || 'guest'}`
      actions.debitUserWallet({ amount, astrologer: astrologer.name, duration: purchase.selectedDuration, service: 'Chat', transactionId })
      localStorage.setItem(storageKey, JSON.stringify({ ...purchase, paymentStatus: 'successful', paymentMethod: method, transactionId }))
      navigate('/payment-success')
    }, 350)
  }

  const methods = [['wallet', Radio, 'Wallet', 'Pay from your Astro Connect wallet'], ['upi', Smartphone, 'UPI', 'Pay securely using UPI'], ['card', CreditCard, 'Card', 'Pay securely using your card']]
  return <main className="call-payment-page">
    <button type="button" className="call-payment-page__back" onClick={() => navigate(`/chat-booking/${purchase.astrologerId}`)}><ArrowLeft size={16} /> Back to Chat Booking</button>
    <header className="call-payment-page__heading"><span>CHAT BOOKING</span><h1>Payment Information</h1><p>Complete your payment to confirm your chat.</p></header>
    <section className="call-payment-page__card"><h2>Payment Information</h2><dl className="call-payment-page__amounts"><div><dt>Astrologer</dt><dd>{astrologer.name}</dd></div><div><dt>Chat Duration</dt><dd>{purchase.selectedDuration} Minutes</dd></div><div className="is-total"><dt>Amount</dt><dd>{money(amount)}</dd></div></dl></section>
    <section className="call-payment-page__card"><h2>Payment Method</h2><div className="call-payment-page__methods">{methods.map(([id, Icon, title, description]) => <button type="button" key={id} className={`call-payment-method ${method === id ? 'is-selected' : ''}`} onClick={() => setMethod(id)}><span className="call-payment-method__icon"><Icon size={18} /></span><span><b>{title}</b><small>{description}</small></span><span className="call-payment-method__radio">{method === id ? '✓' : ''}</span></button>)}</div></section>
    {error && <p className="call-payment-page__insufficient">{error}</p>}
    <button type="button" className="btn btn-primary call-payment-page__pay" disabled={processing} onClick={pay}>{processing ? 'Processing Payment...' : `Pay ${money(amount)}`}</button>
  </main>
}
