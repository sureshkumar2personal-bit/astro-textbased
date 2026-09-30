import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, Star } from 'lucide-react'
import { mockAstrologers, subscribedAstrologers } from '../../../data/notificationData.js'
import { BOOKING_OVERRIDES, DEFAULT_OVERRIDE } from './bookingAstrologerData.js'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import AppointmentSectionTabs from './AppointmentSectionTabs.jsx'
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

function SubscribedAstrologerCard({ astrologer, override, onViewSlots, actionLabel = 'View Slots' }) {
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
        {actionLabel}
      </button>
    </article>
  )
}

export default function BookAppointment() {
  const { currentUser } = useAuth()
  const { subscriptions } = useAppData()
  const navigate = useNavigate()
  const location = useLocation()
  const routes = getRoleRoutes(currentUser?.role)
  const fromDashboard = location.state?.from === 'dashboard'
  const [activeBookingTab, setActiveBookingTab] = useState('subscribed')

  const subscribedAstrologersList = useMemo(() => {
    const subscriptionIds = subscriptions
      .filter((subscription) => subscription.userId === currentUser?.id)
      .map((subscription) => subscription.astrologerId)
    if (!subscriptionIds.length) return subscribedAstrologers
    return mockAstrologers.filter((astrologer) => subscriptionIds.includes(astrologer.id))
  }, [subscriptions, currentUser?.id])

  const suggestedAstrologersList = useMemo(() => {
    const subscribedIds = new Set(subscribedAstrologersList.map((astrologer) => astrologer.id))
    return mockAstrologers.filter((astrologer) => !subscribedIds.has(astrologer.id)).slice(0, 6)
  }, [subscribedAstrologersList])

  const viewSlots = (astrologer) => navigate(`/user/appointments/book/${astrologer.id}`)

  return (
    <div className="book-appointment-page">
      <PageHeader
        eyebrow="USER PORTAL"
        title="Book an Appointment"
        showBack={fromDashboard}
        backTo={routes.dashboard}
        backLabel="Back to Dashboard"
      />

      <AppointmentSectionTabs />

      <div className="book-appointment-inner-tabs" role="tablist" aria-label="Appointment booking options">
        <button
          type="button"
          role="tab"
          aria-selected={activeBookingTab === 'subscribed'}
          className={`book-appointment-inner-tab${activeBookingTab === 'subscribed' ? ' is-active' : ''}`}
          onClick={() => setActiveBookingTab('subscribed')}
        >
          Subscribed Astrologers
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeBookingTab === 'suggestions'}
          className={`book-appointment-inner-tab${activeBookingTab === 'suggestions' ? ' is-active' : ''}`}
          onClick={() => setActiveBookingTab('suggestions')}
        >
          Suggestions
        </button>
      </div>

      {activeBookingTab === 'subscribed' ? (
        <>
          <div className="book-appointment-section-head">
            <h2 className="section-title">Subscribed Astrologers</h2>
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
        </>
      ) : (
        <>
          <div className="book-appointment-section-head">
            <h2 className="section-title">Suggested Astrologers</h2>
            <p className="book-appointment-suggestion-note">Subscribe to your astrologer to book an appointment.</p>
          </div>
          <div className="book-appointment-grid">
            {suggestedAstrologersList.map((astrologer) => (
              <SubscribedAstrologerCard
                key={astrologer.id}
                astrologer={astrologer}
                override={BOOKING_OVERRIDES[astrologer.id] || DEFAULT_OVERRIDE}
                onViewSlots={() => navigate(`${routes.base}/astrologer/${encodeURIComponent(astrologer.id)}`)}
                actionLabel="View Astrologer"
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
