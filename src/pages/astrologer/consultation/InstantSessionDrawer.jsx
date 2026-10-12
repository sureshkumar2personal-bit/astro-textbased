import { createPortal } from 'react-dom'
import { X, Clock, Calendar as CalIcon, Timer, Languages, Hash, Phone, Wallet, UserRound, Headphones, MessageCircle } from 'lucide-react'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { Avatar, DetailRow } from '../appointments/AppointmentDetailsDrawer.jsx'
import { getSessionCode } from '../../../utils/instantConsultation.js'
import { calculateInstantAmount } from '../../../utils/consultationPricing.js'

const formatClock = (date) => date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
const formatDay = (date) => date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

// Reuses the Appointment Details drawer markup/styles; only the content differs.
export default function InstantSessionDrawer({ session, sessions = [], fallbackRate = 0, onClose }) {
  if (!session) return null
  const isChat = session.type === 'chat'
  const label = isChat ? 'Instant Chat' : 'Audio Call'
  const TypeIcon = isChat ? MessageCircle : Headphones
  const start = new Date(session.startedAt || session.createdAt)
  const end = new Date(session.endedAt || start.getTime() + (Number(session.durationMinutes) || 0) * 60000)
  const range = `${formatClock(start)} – ${formatClock(end)}`
  const status = session.status === 'rejected' ? 'Declined' : session.startedAt ? 'Completed' : 'Cancelled'
  const completed = status === 'Completed'
  const rate = session.pricePerMinute ?? fallbackRate
  const amount = completed ? (session.amount ?? calculateInstantAmount(session.durationMinutes, rate)) : 0
  const customer = session.userName || 'Not available'

  return createPortal(
    <div className="apt-drawer-overlay" onClick={onClose}>
      <aside className="apt-drawer" role="dialog" aria-modal="true" aria-labelledby="apt-drawer-title" onClick={(event) => event.stopPropagation()}>
        <header className="apt-drawer-head">
          <div className="apt-drawer-head-copy">
            <h2 id="apt-drawer-title">{label === 'Audio Call' ? 'Instant Call' : 'Instant Chat'} Details</h2>
            <StatusBadge label={status} className="apt-drawer-status" />
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="apt-drawer-body">
          <div className="apt-customer">
            <Avatar name={customer} />
            <div className="apt-customer-copy">
              <div className="apt-customer-name">{customer}</div>
              <div className="apt-customer-order">Session ID: {getSessionCode(session, sessions)}</div>
            </div>
          </div>

          <section className="apt-drawer-summary">
            <div className="apt-drawer-summary-time">{range}</div>
            <div className="apt-drawer-summary-calltype"><TypeIcon size={14} /> {label} · {session.durationMinutes} min</div>
          </section>

          <section className="apt-detail-card">
            <DetailRow icon={UserRound} label="Customer" value={customer} />
            <DetailRow icon={Phone} label="Phone" value={session.userPhone} />
            <DetailRow icon={Languages} label="Language" value={session.language} />
            <DetailRow icon={Hash} label="Topic" value={session.topic} />
          </section>

          <section className="apt-detail-card">
            <DetailRow icon={CalIcon} label="Date" value={formatDay(start)} />
            <DetailRow icon={Clock} label="Time" value={range} />
            <DetailRow icon={TypeIcon} label="Consultation Type" value={<span className="apt-inline-calltype"><TypeIcon size={14} /> {label}</span>} />
            <DetailRow icon={Timer} label="Duration" value={`${session.durationMinutes} Minutes`} />
            <DetailRow icon={Wallet} label="Rate" value={`₹${rate} / minute`} />
          </section>

          <section className="apt-detail-card">
            <DetailRow icon={Wallet} label="Payment" value={completed ? 'Paid' : 'Not charged'} />
            <DetailRow icon={Wallet} label="Amount" value={`₹${amount.toLocaleString('en-IN')}`} />
            <DetailRow icon={Wallet} label="Method" value={session.paymentMethod || 'Wallet'} />
            <DetailRow icon={Hash} label="Transaction" value={completed ? session.transactionId : ''} />
          </section>

          <section className="apt-detail-card">
            <DetailRow icon={CalIcon} label={`Session Date`} value={formatDay(start)} />
            <DetailRow icon={Wallet} label="Session Status" value={status} />
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
