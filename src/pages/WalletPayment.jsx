import { ArrowLeft, CalendarDays, Check, CreditCard, LockKeyhole, Radio, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CALL_PACKAGES, mockAstrologers } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import PaymentSuccess from '../components/PaymentSuccess.jsx'

function money(value) { return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

export default function WalletPayment() {
  const { currentUser } = useAuth(); const routes = getRoleRoutes(currentUser?.role); const navigate = useNavigate(); const [params] = useSearchParams()
  const { userWallet, actions } = useAppData(); const astrologer = mockAstrologers.find(({ id }) => id === params.get('id')) || mockAstrologers[0]; const selectedPackage = CALL_PACKAGES.find(({ id }) => id === params.get('package')) || CALL_PACKAGES[0]
  const bookingAmount = Number(selectedPackage.total); const gst = bookingAmount * 0.18; const totalPayable = bookingAmount + gst; const balance = Number(userWallet?.balance || 0); const sufficient = balance >= totalPayable
  const paymentKey = `astro-connect:call-payment:${currentUser?.id || 'guest'}:${astrologer.id}:${selectedPackage.id}`
  const [paymentMethod, setPaymentMethod] = useState('upi'); const [coupon, setCoupon] = useState(''); const [confirming, setConfirming] = useState(false); const [processing, setProcessing] = useState(false); const [paid, setPaid] = useState(() => localStorage.getItem(paymentKey) === 'successful')
  const confirmPayment = () => { if (!sufficient || processing || paid) return; setProcessing(true); actions.debitUserWallet({ amount: totalPayable, astrologer: astrologer.name, duration: selectedPackage.duration, service: 'Call', transactionId: paymentKey }); actions.createIncomingRequest({ type: 'call', userId: currentUser?.id, userName: currentUser?.name, userUsername: currentUser?.id, astrologerId: astrologer.id }); localStorage.setItem(paymentKey, 'successful'); setPaid(true); setConfirming(false); setProcessing(false) }
  if (paid) return <PaymentSuccess service="call" astrologer={astrologer} details={{ packageMinutes: selectedPackage.duration, rate: selectedPackage.rate, amount: totalPayable }} onPrimary={() => navigate(`${routes.call}?id=${astrologer.id}&package=${selectedPackage.id}`)} onBack={() => navigate(routes.astrologers)} />
  const methods = [['upi', Smartphone, 'UPI', 'Pay using UPI'], ['card', CreditCard, 'Credit / Debit Card', 'Pay securely using your card'], ['netbanking', Radio, 'Net Banking', 'Pay using Net Banking']]
  return <main className="call-payment-page">
    <button type="button" className="call-payment-page__back" onClick={() => navigate(`${routes.callPackages}?id=${astrologer.id}`)}><ArrowLeft size={16} /> Back to Call Booking</button>
    <header className="call-payment-page__heading"><span>CALL BOOKING</span><h1>Payment Information</h1><p>Complete your payment to confirm your consultation.</p></header>
    <div className="call-payment-checkout"><p className="call-payment-page__compact-details">{astrologer.name} · {astrologer.specialization} · {selectedPackage.duration} Minutes · ₹{selectedPackage.rate}/min</p>
    <section className="call-payment-page__card"><h2>Payment Information</h2><dl className="call-payment-page__amounts"><div><dt>Call Booking Amount</dt><dd>{money(bookingAmount)}</dd></div><div><dt>GST (18%)</dt><dd>{money(gst)}</dd></div><div className="is-total"><dt>Total Amount</dt><dd>{money(totalPayable)}</dd></div></dl><p className="call-payment-page__secure"><LockKeyhole size={15} /> 100% Safe and Secure</p></section>
    <section className="call-payment-page__card call-payment-page__coupon"><h2>Have a coupon code?</h2><div><input className="text-input" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Enter Coupon Code" /><button type="button" className="btn btn-outline">Apply</button></div></section>
    <section className="call-payment-page__card"><h2>Payment Methods</h2><div className="call-payment-page__methods">{methods.map(([id, Icon, title, description]) => <button type="button" key={id} className={`call-payment-method ${paymentMethod === id ? 'is-selected' : ''}`} onClick={() => setPaymentMethod(id)}><span className="call-payment-method__icon"><Icon size={18} /></span><span><b>{title}</b><small>{description}</small></span><span className="call-payment-method__radio">{paymentMethod === id && <Check size={12} />}</span></button>)}</div></section>
    {!sufficient && <p className="call-payment-page__insufficient">Insufficient wallet balance. You need {money(totalPayable - balance)} more to complete this booking.</p>}
    <div className="call-payment-page__sticky-pay"><button type="button" className="btn btn-primary call-payment-page__pay" disabled={!sufficient || processing} onClick={() => setConfirming(true)}>Pay and Call {money(totalPayable)} →</button></div></div>
    {confirming && <div className="wallet-payment-page__overlay"><section className="wallet-confirm-modal"><h2>Confirm Payment</h2><p>You are about to pay {money(totalPayable)} for your call booking.</p><div><button type="button" className="btn btn-outline" onClick={() => setConfirming(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={confirmPayment}>Confirm Payment</button></div></section></div>}
  </main>
}
