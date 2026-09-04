import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Headphones, WalletCards } from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import BackButton from '../components/BackButton.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

const CANCELLABLE_STATUSES = ['Pending', 'Confirmed', 'Rescheduled', 'Analysed']

function timelineState(step, status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'cancelled') return step === 'Booking Created' ? 'is-complete' : 'is-cancelled'
  if (normalized === 'completed') return 'is-complete'
  if (normalized === 'analysed') return step === 'Booking Created' || step === 'Pending' ? 'is-complete' : step === 'Consultation' ? 'is-current' : ''
  if (normalized === 'confirmed' || normalized === 'rescheduled') return step === 'Booking Created' ? 'is-complete' : step === 'Confirmed' ? 'is-current' : ''
  if (normalized === 'pending') return step === 'Booking Created' ? 'is-complete' : step === 'Pending' ? 'is-current' : ''
  return step === 'Booking Created' ? 'is-complete' : ''
}

export default function AppointmentDetails() {
  const [searchParams] = useSearchParams()
  const { appointments, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const appointmentId = searchParams.get('id') || appointments[0].id
  const appointment = useMemo(
    () => appointments.find((item) => item.id === appointmentId) || appointments[0],
    [appointmentId, appointments],
  )
  const [cancelled, setCancelled] = useState(false)

  const handleCancel = () => {
    actions.cancelAppointment(appointment.id, {
      astrologer: appointment.astrologer,
      type: appointment.type,
      date: appointment.date,
      time: appointment.time,
    })
    setCancelled(true)
  }

  const price = appointment.price || 499
  const paymentStatus = appointment.paymentStatus || 'Paid'
  const transactionId = appointment.transactionId || `TXN-${appointment.id}`
  const timelineSteps = appointment.status === 'Confirmed' || appointment.status === 'Rescheduled'
    ? ['Booking Created', 'Confirmed', 'Consultation', 'Completed']
    : ['Booking Created', 'Pending', 'Consultation', 'Completed']

  return (
    <div className="appointment-details-page">
      <div className="appointment-details-toolbar"><BackButton to={routes.dashboard} /></div>

      <Card className="appointment-summary-card">
        <div className="appointment-summary-card__identity">
          <span className="appointment-summary-card__icon"><Headphones size={18} /></span>
          <div>
            <strong>{appointment.type}</strong>
            <span>{appointment.astrologer} · {appointment.specialization || 'Vedic Astrology'}</span>
          </div>
        </div>
        <StatusBadge label={appointment.status || 'Pending'} className="appointment-summary-card__status" />
      </Card>

      <Section title="Schedule">
        <Card className="appointment-compact-card appointment-schedule-card">
          <div className="appointment-data-grid">
            <div><span>Date</span><strong>{appointment.date}</strong></div>
            <div><span>Time</span><strong>{appointment.time}</strong></div>
            <div><span>Duration</span><strong>{appointment.duration || '30 Minutes'}</strong></div>
            <div><span>Consultation Type</span><strong>{appointment.type}</strong></div>
            <div><span>Price</span><strong className="is-primary">₹{price}</strong></div>
          </div>
        </Card>
      </Section>

      <Section title="Payment">
        <Card className="appointment-compact-card appointment-payment-card">
          <div className="appointment-payment-amount"><span>Amount</span><strong>₹{price}</strong></div>
          <div><span>Method</span><strong className="appointment-payment-method"><WalletCards size={14} /> Wallet</strong></div>
          <div><span>Status</span><strong className="appointment-paid-status">✓ {paymentStatus}</strong></div>
          <div className="appointment-payment-transaction"><span>Transaction</span><strong>{transactionId}</strong></div>
        </Card>
      </Section>

      <Section title="Status Timeline">
        <Card className="appointment-compact-card">
          <div className="appointment-status-timeline">{timelineSteps.map((step) => <div className={`appointment-status-step ${timelineState(step, appointment.status)}`} key={step}><span>{timelineState(step, appointment.status) === 'is-complete' ? '✓' : '•'}</span><strong>{step}</strong></div>)}</div>
        </Card>
      </Section>

      <Section title="Submitted Information">
        <Card className="appointment-compact-card appointment-submitted-card">
          {appointment.questionDetails?.question || appointment.questionDetails?.dob || appointment.questionDetails?.birthPlace ? <><div><span>Question</span><strong>{appointment.questionDetails?.question ? 'View Question' : 'Not Submitted'}</strong></div><div><span>Horoscope</span><strong>{appointment.questionDetails?.dob || appointment.questionDetails?.birthPlace ? 'View Horoscope' : 'Not Submitted'}</strong></div></> : <p>No question or horoscope details were submitted.</p>}
        </Card>
      </Section>

      <div className="appointment-details-actions">
        <Link to={routes.dashboard} className="btn btn-outline">Back to Dashboard</Link>
        {CANCELLABLE_STATUSES.includes(appointment.status) && (
          <button type="button" className="btn btn-danger" onClick={handleCancel}>
            Cancel Appointment
          </button>
        )}
      </div>

      {cancelled && (
        <SuccessAlert variant="user" message="Appointment cancelled successfully." onDismiss={() => setCancelled(false)} />
      )}
    </div>
  )
}
