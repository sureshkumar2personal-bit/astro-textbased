import { ArrowLeft, Check, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CALL_PACKAGES, mockAstrologers } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import PaymentSuccess from '../components/PaymentSuccess.jsx'

function money(value) { return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
export default function WalletPayment() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { userWallet, actions } = useAppData()
  const astrologer = mockAstrologers.find(({ id }) => id === params.get('id')) || mockAstrologers[0]
  const selectedPackage = CALL_PACKAGES.find(({ id }) => id === params.get('package')) || CALL_PACKAGES[0]
  const amount = selectedPackage.total
  const balance = Number(userWallet?.balance || 0)
  const remainingBalance = balance - amount
  const sufficient = balance >= amount
  const paymentKey = `astro-connect:call-payment:${currentUser?.id || 'guest'}:${astrologer.id}:${selectedPackage.id}`
  const [confirming, setConfirming] = useState(false)
  const [paid, setPaid] = useState(() => localStorage.getItem(paymentKey) === 'successful')
  const [processing, setProcessing] = useState(false)

  const confirmPayment = () => {
    if (!sufficient || processing || paid) return
    setProcessing(true)
    const transactionId = paymentKey
    actions.debitUserWallet({ amount, astrologer: astrologer.name, duration: selectedPackage.duration, service: 'Call', transactionId })
    localStorage.setItem(paymentKey, 'successful')
    setPaid(true)
    setConfirming(false)
    setProcessing(false)
  }

  if (paid) return <PaymentSuccess service="call" astrologer={astrologer} details={{ packageMinutes: selectedPackage.duration, rate: selectedPackage.rate, amount }} onPrimary={() => navigate(`${routes.call}?id=${astrologer.id}&package=${selectedPackage.id}`)} onBack={() => navigate(routes.astrologers)} />

  return (
    <main className="wallet-payment-page">
      <button type="button" className="wallet-payment-page__back" onClick={() => navigate(`${routes.callPackages}?id=${astrologer.id}`)}><ArrowLeft size={16} aria-hidden="true" /> Back to Call Packages</button>
      <header className="wallet-payment-page__heading">
        <h1>Confirm Your Call Booking</h1>
        <p>Review your booking and complete payment from your wallet.</p>
      </header>

      <section className="wallet-balance-card">
        <div className="wallet-balance-card__label"><WalletCards size={19} aria-hidden="true" /><span>Wallet Balance</span></div>
        <strong>{money(balance)}</strong>
        <span>Available Balance</span>
        <button type="button" className="btn btn-outline wallet-balance-card__add">+ Add Money</button>
      </section>

      <section className="wallet-payment-page__astrologer">
        <div className="wallet-payment-page__avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
        <div><strong>{astrologer.name}</strong><span>{astrologer.specialization}</span><small className={astrologer.availability === 'Online' ? 'wallet-payment-page__online' : ''}>● {astrologer.availability}</small><em>Call Consultation</em></div>
      </section>

      <section className="wallet-detail-card">
        <h2>Booking Details</h2>
        <dl>
          <div><dt>Astrologer</dt><dd>{astrologer.name}</dd></div>
          <div><dt>Call Duration</dt><dd>{selectedPackage.duration} Minutes</dd></div>
          <div><dt>Call Rate</dt><dd>₹{selectedPackage.rate}/min</dd></div>
          <div className="wallet-detail-card__total"><dt>Total Amount</dt><dd>{money(amount)}</dd></div>
        </dl>
      </section>

      <section className="wallet-detail-card wallet-payment-summary">
        <h2>Payment Summary</h2>
        <dl>
          <div><dt>Current Wallet Balance</dt><dd>{money(balance)}</dd></div>
          <div><dt>Call Booking Amount</dt><dd className="wallet-payment-summary__deduction">-{money(amount)}</dd></div>
          <div className="wallet-detail-card__total"><dt>Remaining Balance</dt><dd>{money(Math.max(0, remainingBalance))}</dd></div>
        </dl>
      </section>

      {sufficient ? <p className="wallet-payment-page__sufficient"><Check size={15} aria-hidden="true" /> Sufficient wallet balance</p> : <div className="wallet-payment-page__insufficient"><strong>Insufficient Wallet Balance</strong><span>You need {money(amount - balance)} more to complete this booking.</span><button type="button" className="btn btn-outline">Add {money(amount - balance)} to Wallet →</button></div>}
      <button type="button" className="btn btn-primary wallet-payment-page__pay" disabled={!sufficient || processing} onClick={() => setConfirming(true)}>Confirm &amp; Pay {money(amount)} →</button>

      {confirming && <div className="wallet-payment-page__overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-payment-heading"><section className="wallet-confirm-modal"><h2 id="confirm-payment-heading">Confirm Payment</h2><p>You are about to pay {money(amount)} from your wallet.</p><dl><div><dt>Wallet Balance</dt><dd>{money(balance)}</dd></div><div><dt>Booking Amount</dt><dd>-{money(amount)}</dd></div><div><dt>Remaining Balance</dt><dd>{money(remainingBalance)}</dd></div></dl><div><button type="button" className="btn btn-outline" onClick={() => setConfirming(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={confirmPayment}>Confirm Payment</button></div></section></div>}
    </main>
  )
}
