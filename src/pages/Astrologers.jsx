import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getSuggestedAstrologers } from '../data/notificationData.js'
import { getPublicAstrologers, resolvePublicAstrologers } from '../utils/publicAstrologerProfile.js'
import AstrologerCard from '../components/AstrologerCard.jsx'
import { useInstantCall } from '../state/InstantCallContext.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

function AstrologerSection({ title, subtitle, astrologers, viewMoreTo, onCall, onChat, onViewProfile }) {
  const headingId = `${title.toLowerCase().replaceAll(' ', '-')}-heading`
  return (
    <section className="astrologer-list-section" aria-labelledby={headingId}>
      <div className="astrologer-list-section__head">
        <h2 id={headingId} className="astrologer-list-section__title">{title}</h2>
        <Link to={viewMoreTo} className="astrologer-list-section__view-more">View More <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      {subtitle && <p className="astrologer-list-section__subtitle">{subtitle}</p>}
      <div className="astrologer-list-section__grid">
        {astrologers.slice(0, 3).map((astrologer) => (
          <AstrologerCard key={astrologer.id} astrologer={astrologer} onCall={onCall} onChat={onChat} onViewProfile={onViewProfile} />
        ))}
      </div>
    </section>
  )
}

function isActiveSubscription(subscription) {
  const expiry = subscription.expiresAt || subscription.discountQuestions?.[0]?.validUntil
  return Number.isFinite(new Date(expiry).getTime()) && new Date(expiry).getTime() > Date.now()
}

export default function Astrologers() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const { openInstantCall, openInstantChat } = useInstantCall()
  const { followedAstrologerIds, subscriptions } = useAppData()
  const query = ''
  const onlineOnly = false
  const activeSubscriptions = subscriptions
    .filter((subscription) => subscription.userId === currentUser?.id && isActiveSubscription(subscription))
  const subscribedAstrologerIds = activeSubscriptions
    .map((subscription) => subscription.astrologerId)
  const publicAstrologers = getPublicAstrologers()
  const subscribedAstrologers = publicAstrologers
    .filter((astrologer) => subscribedAstrologerIds.includes(astrologer.id))
    .slice()
    .sort((a, b) => {
      const findSub = (id) => activeSubscriptions.find((subscription) => subscription.astrologerId === id)
      return new Date(findSub(b.id)?.subscribedAt || 0) - new Date(findSub(a.id)?.subscribedAt || 0)
    })
  const followedAstrologers = publicAstrologers.filter((astrologer) => followedAstrologerIds.includes(astrologer.id) && !subscribedAstrologerIds.includes(astrologer.id))
  const suggestedAstrologers = resolvePublicAstrologers(getSuggestedAstrologers({ followedAstrologerIds, subscribedAstrologerIds, preferencesEnabled: currentUser?.astrologerPreferencesEnabled, preferences: currentUser?.astrologerPreferences }))

  const matches = (astrologer) => {
    const text = [astrologer.name, astrologer.specialization, ...astrologer.expertise, ...astrologer.languages].join(' ').toLowerCase()
    return text.includes(query.trim().toLowerCase()) && (!onlineOnly || astrologer.availability === 'Online')
  }

  const handleCall = (astrologerId) => {
    openInstantCall(astrologerId)
  }

  const handleChat = (astrologerId) => {
    openInstantChat(astrologerId)
  }

  const handleViewProfile = (astrologerId) => {
    navigate(`${routes.base}/astrologer/${astrologerId}?from=explore`)
  }

  return (
    <div className="explore-astrologers">
      <button type="button" className="explore-back-link" onClick={() => navigate(routes.dashboard)}>
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </button>
      <PageHeader title="Explore Astrologers" subtitle="Find an astrologer for your next consultation" className="explore-astrologers__header" />
      <AstrologerSection title="Subscribed Astrologers" astrologers={subscribedAstrologers.filter(matches)} viewMoreTo={routes.astrologersFull} onCall={handleCall} onChat={handleChat} onViewProfile={handleViewProfile} />
      <AstrologerSection title="Followed Astrologers" astrologers={followedAstrologers.filter(matches)} viewMoreTo={routes.followedAstrologersFull} onCall={handleCall} onChat={handleChat} onViewProfile={handleViewProfile} />
      <AstrologerSection title="Suggested Astrologers" subtitle="Recommended based on your preferences" astrologers={suggestedAstrologers.filter(matches)} viewMoreTo={routes.suggestedAstrologers} onCall={handleCall} onChat={handleChat} onViewProfile={handleViewProfile} />
    </div>
  )
}
