import { createPortal } from 'react-dom'
import { CalendarDays, Clock3, Download, Eye, FileText, Hash, Languages, Phone, PhoneCall, Timer, UserRound, Wallet, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusBadge from '../StatusBadge.jsx'
import { formatDisplayDate, formatTimeRange, getAppointmentDisplayStatus, resolveAppointmentWindow } from '../../utils/appointments.js'

function initials(name = '') {
  return String(name).split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AS'
}

function UserDetailRow({ icon: Icon, label, value }) {
  return (
    <div className="apt-detail-row">
      <span className="apt-detail-label"><Icon size={14} /> {label}</span>
      <span className="apt-detail-value">{value == null || value === '' ? 'Not available' : value}</span>
    </div>
  )
}

function UserHoroscopeSection({ appointment }) {
  const horoscope = appointment.horoscope
  if (!horoscope) {
    return (
      <section className="apt-detail-card apt-horoscope-section">
        <div className="apt-detail-row">
          <span className="apt-detail-label"><FileText size={14} /> Horoscope</span>
          <span className="apt-detail-value apt-horoscope-empty">Horoscope not uploaded yet</span>
        </div>
      </section>
    )
  }

  const uploadedDate = horoscope.uploadedAt
    ? new Date(horoscope.uploadedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  return (
    <section className="apt-detail-card apt-horoscope-section">
      <div className="apt-detail-row">
        <span className="apt-detail-label"><FileText size={14} /> Horoscope</span>
        <span className="apt-detail-value apt-horoscope-file">{horoscope.name || 'Uploaded horoscope'}</span>
      </div>
      <div className="apt-detail-row"><span className="apt-detail-label">Type</span><span className="apt-detail-value">{horoscope.type}</span></div>
      <div className="apt-detail-row"><span className="apt-detail-label">Size</span><span className="apt-detail-value">{horoscope.size || `${horoscope.sizeBytes || 0} KB`}</span></div>
      <div className="apt-detail-row"><span className="apt-detail-label">Uploaded</span><span className="apt-detail-value">{uploadedDate || 'Not available'}</span></div>
      <div className="apt-horoscope-actions">
        {horoscope.dataUrl && <a className="btn btn-outline" href={horoscope.dataUrl} target="_blank" rel="noreferrer"><Eye size={14} /> View</a>}
        {horoscope.dataUrl && <a className="btn btn-outline" href={horoscope.dataUrl} download={horoscope.name || 'horoscope'} rel="noreferrer"><Download size={14} /> Download</a>}
      </div>
    </section>
  )
}

export default function UserAppointmentDetailsDrawer({ appointment, currentUser, onClose, onBookAgain }) {
  if (!appointment) return null
  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  const displayStatus = getAppointmentDisplayStatus(appointment)
  const customerName = appointment.customerName || currentUser?.name || 'Not available'
  const astrologerName = appointment.astrologer || customerName
  const paymentStatus = appointment.paymentStatus || (appointment.status?.toLowerCase().includes('cancel') ? appointment.refundStatus || 'Refunded' : 'Paid')
  const amount = appointment.amount ?? appointment.price
  const bookingDate = appointment.bookingDate || (appointment.bookedAt ? new Date(appointment.bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '')
  const notes = appointment.privateNotes || appointment.notes

  return createPortal(
    <div className="apt-drawer-overlay" onClick={onClose}>
      <aside className="apt-drawer" role="dialog" aria-modal="true" aria-labelledby="user-apt-drawer-title" onClick={(event) => event.stopPropagation()}>
        <header className="apt-drawer-head">
          <div className="apt-drawer-head-copy">
            <h2 id="user-apt-drawer-title">Appointment Details</h2>
            <StatusBadge label={displayStatus} className="apt-drawer-status" />
          </div>
          <button type="button" className="icon-btn" aria-label="Close appointment details" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="apt-drawer-body">
          <div className="apt-customer">
            <span className="user-appointment-avatar user-appointment-avatar--large">{initials(customerName)}</span>
            <div className="apt-customer-copy">
              <div className="apt-customer-name">
                {appointment.astrologerId ? <Link className="apt-customer-name--link" to={`/user/astrologer/${appointment.astrologerId}`}>{astrologerName}</Link> : astrologerName}
              </div>
              <div className="apt-customer-order">Booking ID: {appointment.orderId || appointment.id}</div>
            </div>
          </div>

          <section className="apt-drawer-summary">
            <div className="apt-drawer-summary-time">{formatTimeRange(startMin, endMin)}</div>
            <div className="apt-drawer-summary-calltype"><PhoneCall size={14} /> {appointment.type || 'Audio Call'}</div>
          </section>

          <section className="apt-detail-card">
            <UserDetailRow icon={UserRound} label="Customer" value={customerName} />
            <UserDetailRow icon={Phone} label="Phone" value={appointment.customerPhone || currentUser?.phone} />
            <UserDetailRow icon={Languages} label="Language" value={appointment.language || appointment.lang} />
            <UserDetailRow icon={Hash} label="Topic" value={appointment.topic} />
          </section>

          <section className="apt-detail-card">
            <UserDetailRow icon={CalendarDays} label="Date" value={formatDisplayDate(appointment.dateIso, true)} />
            <UserDetailRow icon={Clock3} label="Time" value={formatTimeRange(startMin, endMin)} />
            <UserDetailRow icon={PhoneCall} label="Appointment Type" value={appointment.type || 'Audio Call'} />
            <UserDetailRow icon={Timer} label="Duration" value={appointment.duration || `${endMin - startMin} Minutes`} />
          </section>

          <section className="apt-detail-card">
            <UserDetailRow icon={Wallet} label="Payment" value={paymentStatus} />
            <UserDetailRow icon={Wallet} label="Amount" value={amount == null ? '' : `₹${Number(amount).toLocaleString('en-IN')}`} />
            <UserDetailRow icon={Wallet} label="Payment Method" value={appointment.paymentMethod} />
            <UserDetailRow icon={Hash} label="Transaction ID" value={appointment.transactionId} />
          </section>

          <section className="apt-detail-card">
            <UserDetailRow icon={CalendarDays} label="Booking Date" value={bookingDate} />
            <UserDetailRow icon={Wallet} label="Current Status" value={displayStatus} />
          </section>

          <UserHoroscopeSection appointment={appointment} />

          <section className="apt-detail-card apt-detail-card--notes apt-user-astrologer-notes">
            <div className="apt-private-notes-head"><span>Astrologer Notes</span><span className="apt-private-notes-private">Only you can see</span></div>
            <div className="apt-user-astrologer-notes-content" aria-readonly="true">{notes || 'No astrologer notes are available for this appointment.'}</div>
          </section>

          {displayStatus === 'Completed' && appointment.astrologerId && onBookAgain && (
            <div className="apt-drawer-actions">
              <button type="button" className="btn btn-primary" onClick={() => onBookAgain(appointment)}>
                Book Again
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  )
}
