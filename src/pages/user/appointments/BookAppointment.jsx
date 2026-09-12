import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Star } from 'lucide-react'
import { mockAstrologers, subscribedAstrologers } from '../../../data/notificationData.js'
import { BOOKING_OVERRIDES, DEFAULT_OVERRIDE } from './bookingAstrologerData.js'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import './bookappointment.css'

function initials(name = '') {
  return String(name)
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function ratingScore(rating) {
  return String(rating || '0').split('/')[0].trim() || '0'
}

function SubscribedAstrologerCard({ astrologer, override, onViewSlots }) {
  return (
    <article className="book-appointment-card">
      <div className="book-appointment-card__top">
        <div className="book-appointment-avatar-wrap">
          <div className="book-appointment-avatar" aria-hidden="true">{initials(astrologer.name)}</div>
          <span className="book-appointment-availability-dot" title="Available now" />
        </div>
        <span className="book-appointment-price-badge">From ₹{override.price}</span>
      </div>

      <div className="book-appointment-card__body">
        <h3 className="book-appointment-card__name">{astrologer.name}</h3>
        <p className="book-appointment-card__spec">{astrologer.specialization}</p>
        <div className="book-appointment-card__rating" aria-label={`Rated ${ratingScore(astrologer.rating)} out of 5`}>
          <Star size={14} aria-hidden="true" />
          <strong>{ratingScore(astrologer.rating)}</strong>
          <span> / 5</span>
        </div>
      </div>

      <div className="book-appointment-card__slots">
        <span className="book-appointment-card__slots-dot" aria-hidden="true" />
        <strong>{override.availableSlots.toLocaleString('en-IN')}</strong> slots available
        <span className="book-appointment-card__next">Next Today</span>
      </div>

      <button type="button" className="btn btn-primary book-appointment-card__action" onClick={() => onViewSlots(astrologer)}>
        <CalendarDays size={15} aria-hidden="true" />
        View Slots
      </button>
    </article>
  )
}

export default function BookAppointment() {
  const { currentUser } = useAuth()
  const { subscriptions } = useAppData()
  const navigate = useNavigate()

  const subscribedAstrologersList = useMemo(() => {
    const subscriptionIds = subscriptions
      .filter((subscription) => subscription.userId === currentUser?.id)
      .map((subscription) => subscription.astrologerId)
    if (!subscriptionIds.length) return subscribedAstrologers
    return mockAstrologers.filter((astrologer) => subscriptionIds.includes(astrologer.id))
  }, [subscriptions, currentUser?.id])

  const viewSlots = (astrologer) => navigate(`/user/appointments/book/${astrologer.id}`)

  return (
    <div className="book-appointment-page">
      <PageHeader
        eyebrow="USER PORTAL"
        title="Book an Appointment"
        subtitle="Schedule an appointment with the astrologers you subscribe to. Subscribe to an astrologer to unlock their appointment slots."
      />

      <div className="book-appointment-section-head">
        <h2 className="section-title">Your Subscribed Astrologers</h2>
        <p className="book-appointment-section-support">Astrologers you are subscribed with open appointment slots</p>
      </div>

      <div className="book-appointment-grid">
        {subscribedAstrologersList.map((astrologer) => (
          <SubscribedAstrologerCard
            key={astrologer.id}
            astrologer={astrologer}
            override={BOOKING_OVERRIDES[astrologer.id] || DEFAULT_OVERRIDE}
            onViewSlots={viewSlots}
          />
        ))}
      </div>
    </div>
  )
}
