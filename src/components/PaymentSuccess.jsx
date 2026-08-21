import { Check } from 'lucide-react'

const money = (value) => `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const count = (value) => Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(1)}K` : String(value)
const experience = (value) => String(value).match(/\d+/)?.[0] || value

export default function PaymentSuccess({ service, astrologer, details, onPrimary, onBack }) {
  const isCall = service === 'call'
  const rows = isCall
    ? [
        ['Service', 'Call'],
        ['Package', `${details.packageMinutes} Minutes`],
        ['Call Rate', `₹${details.rate}/min`],
        ['Amount Paid', money(details.amount)],
        ['Payment Method', 'Wallet'],
      ]
    : [
        ['Service', 'Chat'],
        ['Package', `${details.packageMinutes} Minutes`],
        ['Free Time', details.freeMinutes > 0 ? `${details.freeMinutes} Minutes Included` : 'Used'],
        ['Total Chat', `${details.totalMinutes} Minutes`],
        ['Amount Paid', money(details.amount)],
        ['Payment Method', 'Wallet'],
      ]

  return (
    <main className="wallet-payment-page payment-success-page">
      <section className="wallet-success-card payment-success-card">
        <span className="wallet-success-card__icon"><Check size={25} aria-hidden="true" /></span>
        <h1>Payment Successful</h1>
        <p>{isCall ? `Your call booking with ${astrologer.name} is confirmed.` : `Your chat package with ${astrologer.name} is ready.`}</p>
        <section className="payment-success-card__astrologer">
          <div className="wallet-payment-page__avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
          <div><strong>{astrologer.name}</strong><span>{astrologer.specialization}</span><small className={astrologer.availability === 'Online' ? 'wallet-payment-page__online' : ''}>● {astrologer.availability}</small><em>Ex {experience(astrologer.experience)} · {count(astrologer.followers)} Followers</em></div>
        </section>
        <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className="wallet-success-card__actions payment-success-card__actions">
          <button type="button" className="btn btn-primary" onClick={onPrimary}>Enter {isCall ? 'Call' : 'Chat'} →</button>
          <button type="button" className="btn btn-outline" onClick={onBack}>Back to Astrologers</button>
        </div>
      </section>
    </main>
  )
}
