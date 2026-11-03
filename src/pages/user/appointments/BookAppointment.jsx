import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Star } from 'lucide-react'
import { mockAstrologers, subscribedAstrologers } from '../../../data/notificationData.js'
import { consultationAstrologers } from '../../../data/consultationAstrologers.js'
import { getAstrologerPhoto } from '../../../data/astrologerPhotos.js'
import { BOOKING_OVERRIDES, DEFAULT_OVERRIDE, buildCalendarAvailability, countAvailableSlots } from './bookingAstrologerData.js'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { publishedAvailabilityMap } from '../../../utils/appointments.js'
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

const ASTROLOGER_PHOTOS = {
  'Dr. Rani': '/astrologer-photos/reference/dr-rani.png',
  'Acharya Meena': '/astrologer-photos/reference/acharya-meena.png',
  'Arjun Sharma': '/astrologer-photos/reference/arjun-sharma.png',
  'Nandini Kapoor': '/astrologer-photos/reference/nandini-kapoor.png',
  'Dev Malhotra': '/astrologer-photos/reference/dev-malhotra.png',
  'Priya Sharma': '/astrologer-photos/reference/priya-sharma.png',
  'Meera Desai': '/astrologer-photos/dashboard-reference/meera-desai.png',
  'Ishita Sen': '/astrologer-photos/dashboard-reference/ishita-sen.png',
  'Aditi Menon': '/astrologer-photos/dashboard-reference/aditi-menon.png',
  'Bhavana Joshi': '/astrologer-photos/dashboard-reference/bhavana-j.png',
}

const CONSULTATION_PHOTOS = new Map(consultationAstrologers.map((astrologer) => [astrologer.id, astrologer.profileImage]))

function profilePhoto(astrologer) {
  return astrologer?.photo || ASTROLOGER_PHOTOS[astrologer?.name] || CONSULTATION_PHOTOS.get(astrologer?.id) || astrologer?.profileImage || getAstrologerPhoto(astrologer) || ''
}

function ratingScore(rating) {
  return String(rating || '0').split('/')[0].trim() || '0'
}

function SubscribedAstrologerCard({ astrologer, override, availableSlots, onViewSlots, actionLabel = 'View Slots', subscribed = false }) {
  const offline = String(astrologer.availability || '').toLowerCase() === 'offline'
  return (
    <article className={`book-appointment-card${subscribed ? ' is-subscribed' : ''}${offline ? ' is-offline' : ''}`}>
      {subscribed && <span className="book-appointment-card__ribbon">Subscribed</span>}
      <div className="book-appointment-card__profile">
        <div className="book-appointment-avatar-wrap">
          <div className="book-appointment-avatar" aria-hidden="true">
            {profilePhoto(astrologer)
              ? <img src={profilePhoto(astrologer)} alt={`${astrologer.name} profile`} />
              : initials(astrologer.name)}
          </div>
          <span className={`book-appointment-availability-dot${offline ? ' is-offline' : ''}`} title={offline ? 'Offline' : 'Available now'} />
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
        <span className="book-appointment-price-badge">From ₹{override.price}</span>
      </div>

      <div className="book-appointment-card__slots">
        <span className="book-appointment-card__slots-dot" aria-hidden="true" />
        <strong>{availableSlots.toLocaleString('en-IN')}</strong> slots available
      </div>

      <button type="button" className="btn btn-primary book-appointment-card__action" onClick={() => onViewSlots(astrologer)}>
        <CalendarDays size={15} aria-hidden="true" />
        {actionLabel}
      </button>
    </article>
  )
}

function sortOnlineFirst(list) {
  return [...list].sort((a, b) => {
    const aOnline = String(a.availability || '').toLowerCase() === 'online'
    const bOnline = String(b.availability || '').toLowerCase() === 'online'
    if (aOnline === bOnline) return 0
    return aOnline ? -1 : 1
  })
}

const SUBSCRIBED_INCREMENT = 3
const SUGGESTED_PAGE_SIZE = 3

export default function BookAppointment() {
  const { currentUser } = useAuth()
  const { subscriptions, appointments, appointmentAvailabilityTemplates } = useAppData()
  const navigate = useNavigate()
  const location = useLocation()
  const routes = getRoleRoutes(currentUser?.role)
  const fromDashboard = location.state?.from === 'dashboard'

  const [subscribedVisibleCount, setSubscribedVisibleCount] = useState(SUBSCRIBED_INCREMENT)
  const [suggestedPage, setSuggestedPage] = useState(0)

  const sortedSubscribedList = useMemo(() => {
    const subscriptionIds = subscriptions
      .filter((subscription) => subscription.userId === currentUser?.id)
      .map((subscription) => subscription.astrologerId)
    const baseList = !subscriptionIds.length
      ? subscribedAstrologers
      : mockAstrologers.filter((astrologer) => subscriptionIds.includes(astrologer.id))
    return sortOnlineFirst(baseList)
  }, [subscriptions, currentUser?.id])

  const sortedSuggestedList = useMemo(() => {
    const subscribedIds = new Set(sortedSubscribedList.map((astrologer) => astrologer.id))
    const baseList = mockAstrologers.filter((astrologer) => !subscribedIds.has(astrologer.id))
    return sortOnlineFirst(baseList)
  }, [sortedSubscribedList])

  const visibleSubscribed = useMemo(
    () => sortedSubscribedList.slice(0, subscribedVisibleCount),
    [sortedSubscribedList, subscribedVisibleCount]
  )
  const hasMoreSubscribed = subscribedVisibleCount < sortedSubscribedList.length
  const remainingSubscribed = Math.max(0, sortedSubscribedList.length - subscribedVisibleCount)

  const totalSuggestedPages = Math.ceil(sortedSuggestedList.length / SUGGESTED_PAGE_SIZE)
  const visibleSuggested = useMemo(
    () => sortedSuggestedList.slice(suggestedPage * SUGGESTED_PAGE_SIZE, (suggestedPage + 1) * SUGGESTED_PAGE_SIZE),
    [sortedSuggestedList, suggestedPage]
  )

  const availableSlotsFor = (astrologer) => {
    const hasSchedule = appointmentAvailabilityTemplates.some((template) =>
      template.astrologerId === astrologer.id && (template.weeklySchedule || template.dateOverrides || template.publishedWeeklySchedule || template.publishedDateOverrides),
    )
    const availability = hasSchedule
      ? publishedAvailabilityMap({ templates: appointmentAvailabilityTemplates, astrologerId: astrologer.id, appointments, includeSaved: true })
      : buildCalendarAvailability(astrologer)
    return countAvailableSlots({ availability, astrologerId: astrologer.id, appointments })
  }

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

      {/* Subscribed Astrologers Section */}
      <div className="book-appointment-section-head">
        <h2 className="section-title">Subscribed Astrologers</h2>
      </div>
      <div className="book-appointment-grid">
        {visibleSubscribed.map((astrologer) => (
          <SubscribedAstrologerCard
            key={astrologer.id}
            astrologer={astrologer}
            override={BOOKING_OVERRIDES[astrologer.id] || DEFAULT_OVERRIDE}
            availableSlots={availableSlotsFor(astrologer)}
            onViewSlots={viewSlots}
            subscribed
          />
        ))}
      </div>
      {sortedSubscribedList.length > SUBSCRIBED_INCREMENT && (
        <div className="book-appointment-bottom-actions">
          {hasMoreSubscribed ? (
            <button
              type="button"
              className="book-appointment-more-btn"
              onClick={() => setSubscribedVisibleCount((prev) => prev + SUBSCRIBED_INCREMENT)}
            >
              More (+{Math.min(SUBSCRIBED_INCREMENT, remainingSubscribed)}) <ChevronDown size={15} />
            </button>
          ) : (
            <button
              type="button"
              className="book-appointment-more-btn"
              onClick={() => setSubscribedVisibleCount(SUBSCRIBED_INCREMENT)}
            >
              Show Less <ChevronUp size={15} />
            </button>
          )}
        </div>
      )}

      {/* Suggested Astrologers Section */}
      <div className="book-appointment-section-head book-appointment-section-head--suggestions">
        <h2 className="section-title">Suggested Astrologers</h2>
        <p className="book-appointment-suggestion-note">Subscribe to your astrologer to book an appointment.</p>
      </div>
      <div className="book-appointment-grid">
        {visibleSuggested.map((astrologer) => (
          <SubscribedAstrologerCard
            key={astrologer.id}
            astrologer={astrologer}
            override={BOOKING_OVERRIDES[astrologer.id] || DEFAULT_OVERRIDE}
            availableSlots={availableSlotsFor(astrologer)}
            onViewSlots={() => navigate(`${routes.base}/astrologer/${encodeURIComponent(astrologer.id)}`)}
            actionLabel="View Astrologer"
          />
        ))}
      </div>
      {totalSuggestedPages > 1 && (
        <div className="book-appointment-pagination">
          <button
            type="button"
            className="book-appointment-page-btn"
            onClick={() => setSuggestedPage((prev) => Math.max(0, prev - 1))}
            disabled={suggestedPage === 0}
            aria-label="Previous suggested astrologers"
          >
            <ChevronLeft size={16} aria-hidden="true" /> Previous
          </button>
          <span className="book-appointment-page-indicator">
            Page {suggestedPage + 1} of {totalSuggestedPages}
          </span>
          <button
            type="button"
            className="book-appointment-page-btn"
            onClick={() => setSuggestedPage((prev) => Math.min(totalSuggestedPages - 1, prev + 1))}
            disabled={suggestedPage >= totalSuggestedPages - 1}
            aria-label="Next suggested astrologers"
          >
            Next <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
