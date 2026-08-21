import { ArrowLeft, Check, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CHAT_PACKAGES, mockAstrologers } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import PaymentSuccess from '../components/PaymentSuccess.jsx'

const FREE_SECONDS = 120
const money = (value) => `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const count = (value) => value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value)
const experience = (value) => String(value).match(/\d+/)?.[0] || value

function readFreeSession(key) {
  try {
    const session = JSON.parse(localStorage.getItem(key) || 'null')
    if (!session) return null
    if (!session.freeUsed && Date.now() - session.startedAt >= FREE_SECONDS * 1000) {
      const used = { ...session, freeUsed: true, freeRemaining: 0 }
      localStorage.setItem(key, JSON.stringify(used))
      return used
    }
    return session
  } catch {
    return null
  }
}

function readPayment(key) {
  try {
    const value = localStorage.getItem(key)
    if (value === 'successful') return { status: 'successful' }
    return JSON.parse(value || 'null')
  } catch {
    return null
  }
}

export default function ChatWalletPayment() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { userWallet, actions } = useAppData()
  const astrologer = mockAstrologers.find(({ id }) => id === params.get('id')) || mockAstrologers[0]
  const selectedPackage = CHAT_PACKAGES.find(({ id }) => id === params.get('package')) || CHAT_PACKAGES[0]
  const sessionKey = `astro-connect:free-chat:${currentUser?.id || 'guest'}:${astrologer.id}`
  const freeSession = readFreeSession(sessionKey)
  const freeSeconds = !freeSession ? FREE_SECONDS : freeSession.freeUsed ? 0 : Math.max(0, Math.ceil((FREE_SECONDS * 1000 - (Date.now() - freeSession.startedAt)) / 1000))
  const totalSeconds = freeSeconds + selectedPackage.duration * 60
  const balance = Number(userWallet?.balance || 0)
  const remainingBalance = balance - selectedPackage.total
  const sufficient = balance >= selectedPackage.total
  const paymentKey = `astro-connect:chat-payment:${currentUser?.id || 'guest'}:${astrologer.id}:${selectedPackage.id}`
  const [confirming, setConfirming] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState(() => readPayment(paymentKey))
  const [paid, setPaid] = useState(() => readPayment(paymentKey)?.status === 'successful')

  const confirmPayment = () => {
    if (!sufficient || processing || paid) return
    setProcessing(true)
    const purchasedFreeSeconds = freeSeconds
    const transactionId = paymentKey
    actions.debitUserWallet({ amount: selectedPackage.total, astrologer: astrologer.name, duration: selectedPackage.duration, service: 'Chat', transactionId })
    localStorage.setItem(sessionKey, JSON.stringify({ startedAt: Date.now(), freeUsed: true, freeRemaining: 0, paidDuration: selectedPackage.duration * 60, totalDuration: totalSeconds }))
    const details = { status: 'successful', amount: selectedPackage.total, packageMinutes: selectedPackage.duration, freeMinutes: Math.ceil(purchasedFreeSeconds / 60), totalMinutes: Math.floor((selectedPackage.duration * 60 + purchasedFreeSeconds) / 60) }
    localStorage.setItem(paymentKey, JSON.stringify(details))
    setPaymentDetails(details)
    setPaid(true)
    setConfirming(false)
    setProcessing(false)
  }

  if (paid) return <PaymentSuccess service="chat" astrologer={astrologer} details={paymentDetails || { packageMinutes: selectedPackage.duration, freeMinutes: 0, totalMinutes: selectedPackage.duration, amount: selectedPackage.total }} onPrimary={() => navigate(`${routes.chat}?id=${astrologer.id}&mode=paid&package=${selectedPackage.id}`)} onBack={() => navigate(routes.astrologers)} />

  return (
    <main className="wallet-payment-page">
      <button type="button" className="wallet-payment-page__back" onClick={() => navigate(`${routes.chatBooking}?id=${astrologer.id}`)}><ArrowLeft size={16} aria-hidden="true" /> Back to Chat Packages</button>
      <header className="wallet-payment-page__heading"><h1>Confirm Your Chat</h1><p>Review your chat package and complete the payment using your wallet.</p></header>
      <section className="wallet-balance-card"><div className="wallet-balance-card__label"><WalletCards size={19} aria-hidden="true" /><span>Wallet Balance</span></div><strong>{money(balance)}</strong><span>Available Balance</span><button type="button" className="btn btn-outline wallet-balance-card__add">+ Add Money</button></section>
      <section className="wallet-payment-page__astrologer"><div className="wallet-payment-page__avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{astrologer.name}</strong><span>{astrologer.specialization}</span><small className={astrologer.availability === 'Online' ? 'wallet-payment-page__online' : ''}>● {astrologer.availability}</small><em>Ex {experience(astrologer.experience)} · {count(astrologer.followers)} Followers</em></div></section>
      <section className="wallet-detail-card chat-wallet-package"><h2>Selected Chat Package</h2><strong>{selectedPackage.duration} Minutes</strong><b>{money(selectedPackage.total)}</b><span>₹{selectedPackage.rate}/min</span></section>
      <section className="wallet-detail-card"><h2>Payment Summary</h2><dl><div><dt>Wallet Balance</dt><dd>{money(balance)}</dd></div><div><dt>Chat Package</dt><dd className="wallet-payment-summary__deduction">-{money(selectedPackage.total)}</dd></div><div><dt>Free Chat</dt><dd>{freeSeconds ? '2 Minutes' : 'Used'}</dd></div><div><dt>Paid Package</dt><dd>{selectedPackage.duration} Minutes</dd></div><div><dt>Total Chat</dt><dd>{Math.floor(totalSeconds / 60)} Minutes</dd></div><div className="wallet-detail-card__total"><dt>Total Payable</dt><dd>{money(selectedPackage.total)}</dd></div><div><dt>Remaining Balance</dt><dd>{money(Math.max(0, remainingBalance))}</dd></div></dl></section>
      {sufficient ? <p className="wallet-payment-page__sufficient"><Check size={15} aria-hidden="true" /> Sufficient wallet balance</p> : <div className="wallet-payment-page__insufficient"><strong>Insufficient Wallet Balance</strong><span>Your wallet balance is {money(balance)}. You need {money(selectedPackage.total - balance)} more to continue.</span><button type="button" className="btn btn-outline">Add {money(selectedPackage.total - balance)} to Wallet →</button></div>}
      <button type="button" className="btn btn-primary wallet-payment-page__pay" disabled={!sufficient || processing} onClick={() => setConfirming(true)}>Confirm &amp; Pay {money(selectedPackage.total)} →</button>
      <p className="call-booking-page__note">Secure wallet payment</p>
      {confirming && <div className="wallet-payment-page__overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-chat-payment-heading"><section className="wallet-confirm-modal"><h2 id="confirm-chat-payment-heading">Confirm Chat Payment</h2><p>You are about to pay {money(selectedPackage.total)} from your wallet for a {selectedPackage.duration}-minute chat package with {astrologer.name}.</p><dl><div><dt>Wallet Balance</dt><dd>{money(balance)}</dd></div><div><dt>Payment</dt><dd>{money(selectedPackage.total)}</dd></div><div><dt>Remaining Balance</dt><dd>{money(remainingBalance)}</dd></div><div><dt>Total Chat Time</dt><dd>{Math.floor(totalSeconds / 60)} Minutes</dd></div></dl>{freeSeconds > 0 && <p>Includes 2 free minutes.</p>}<div><button type="button" className="btn btn-outline" onClick={() => setConfirming(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={confirmPayment}>Confirm Payment</button></div></section></div>}
    </main>
  )
}
