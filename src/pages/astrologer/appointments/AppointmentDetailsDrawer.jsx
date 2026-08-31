import { createPortal } from 'react-dom'
import { X, Clock, Calendar as CalIcon, Timer, Languages, Hash, Phone, Wallet, UserRound } from 'lucide-react'
import StatusBadge from '../../../components/StatusBadge.jsx'
import CallButton from './CallButton.jsx'
import { callTypeMeta } from './meta.jsx'
import {
  resolveAppointmentWindow,
  formatTimeRange,
  formatDisplayDate,
} from '../../../utils/appointments.js'

function Avatar({ name }) {
  const initials = String(name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const hue = [...String(name || '')].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360
  return (
    <div
      className="apt-avatar"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${(hue + 40) % 360} 70% 52%))` }}
    >
      {initials}
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  const resolvedValue = value == null || value === '' ? 'Not available' : value
  return (
    <div className="apt-detail-row">
      <span className="apt-detail-label">
        <Icon size={14} /> {label}
      </span>
      <span className="apt-detail-value">{resolvedValue}</span>
    </div>
  )
}

export default function AppointmentDetailsDrawer({ appointment, now, inProgress, onClose, onStartCall, onViewDetails }) {
  if (!appointment) return null
  const meta = callTypeMeta(appointment.callType)
  const Icon = meta.icon
  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  const durationMin = endMin - startMin
  const customerName = appointment.customerName || 'Not available'
  const orderId = appointment.orderId != null && appointment.orderId !== '' ? appointment.orderId : 'Not available'
  const hasAmount = appointment.amount != null && appointment.amount !== '' && Number.isFinite(Number(appointment.amount))
  const amountLabel = hasAmount ? `₹${Number(appointment.amount).toLocaleString('en-IN')}` : 'Not available'

  return createPortal(
    <div className="apt-drawer-overlay" onClick={onClose}>
      <aside
        className="apt-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apt-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="apt-drawer-head">
          <div className="apt-drawer-head-copy">
            <h2 id="apt-drawer-title">Appointment Details</h2>
            <StatusBadge label={appointment.status || 'Not available'} className="apt-drawer-status" />
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="apt-drawer-body">
          <div className="apt-customer">
            <Avatar name={customerName} />
            <div className="apt-customer-copy">
              <div className="apt-customer-name">{customerName}</div>
              <div className="apt-customer-order">Order ID: {orderId}</div>
            </div>
          </div>

          <section className="apt-drawer-summary">
            <div className="apt-drawer-summary-time">{formatTimeRange(startMin, endMin)}</div>
            <div className="apt-drawer-summary-calltype">
              <Icon size={14} /> {meta.label}
            </div>
          </section>

          <section className="apt-detail-card">
            <DetailRow icon={UserRound} label="Customer" value={customerName} />
            <DetailRow icon={Phone} label="Phone" value={appointment.customerPhone} />
            <DetailRow icon={Languages} label="Language" value={appointment.language} />
            <DetailRow icon={Hash} label="Topic" value={appointment.topic} />
          </section>

          <section className="apt-detail-card">
            <DetailRow icon={CalIcon} label="Date" value={formatDisplayDate(appointment.dateIso, true)} />
            <DetailRow icon={Clock} label="Time" value={formatTimeRange(startMin, endMin)} />
            <DetailRow
              icon={Icon}
              label="Call Type"
              value={
                <span className="apt-inline-calltype">
                  <Icon size={14} /> {meta.label}
                </span>
              }
            />
            <DetailRow icon={Timer} label="Duration" value={`${durationMin} Minutes`} />
          </section>

          <section className="apt-detail-card">
            <DetailRow icon={Wallet} label="Payment" value={<span className="apt-paid">Paid</span>} />
            <DetailRow icon={Wallet} label="Amount" value={amountLabel} />
          </section>

          <div className="apt-drawer-call">
            <CallButton
              appointment={appointment}
              now={now}
              inProgress={inProgress}
              onStart={onStartCall}
              onViewDetails={onViewDetails}
              size="lg"
            />
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
