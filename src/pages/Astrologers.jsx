import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getSuggestedAstrologers, mockAstrologers } from '../data/notificationData.js'
import AstrologerCard from '../components/AstrologerCard.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

function AstrologerSection({ title, subtitle, astrologers, viewMoreTo, onCall, onChat, onViewProfile }) {
  return (
    <section className="astrologer-list-section" aria-labelledby={`${title.toLowerCase().replaceAll(' ', '-')}-heading`}>
      <h2 id={`${title.toLowerCase().replaceAll(' ', '-')}-heading`} className="astrologer-list-section__title">{title}</h2>
      {subtitle && <p className="astrologer-list-section__subtitle">{subtitle}</p>}
      <div className="astrologer-list-section__grid">
        {astrologers.slice(0, 3).map((astrologer) => (
          <AstrologerCard key={astrologer.id} astrologer={astrologer} onCall={onCall} onChat={onChat} onViewProfile={onViewProfile} />
        ))}
        <div className="astrologer-list-section__action">
          <Link to={viewMoreTo} className="astrologer-list-section__view-more">
            View More →
          </Link>
        </div>
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
  const { followedAstrologerIds, subscriptions } = useAppData()
  const activeSubscriptions = subscriptions
    .filter((subscription) => subscription.userId === currentUser?.id && isActiveSubscription(subscription))
  const subscribedAstrologerIds = activeSubscriptions
    .map((subscription) => subscription.astrologerId)
  const subscribedAstrologers = mockAstrologers.filter((astrologer) => subscribedAstrologerIds.includes(astrologer.id))
  const followedAstrologers = mockAstrologers.filter((astrologer) => followedAstrologerIds.includes(astrologer.id) && !subscribedAstrologerIds.includes(astrologer.id))
  const suggestedAstrologers = getSuggestedAstrologers({ followedAstrologerIds, subscribedAstrologerIds, preferencesEnabled: currentUser?.astrologerPreferencesEnabled, preferences: currentUser?.astrologerPreferences })

  const handleCall = (astrologerId) => {
    navigate(`/call-booking/${astrologerId}?from=explore`)
  }

  const handleChat = (astrologerId) => {
    navigate(`/chat-booking/${astrologerId}?from=explore`)
  }

  const handleViewProfile = (astrologerId) => {
    navigate(`${routes.base}/astrologer/${astrologerId}?from=explore`)
  }

  return (
    <div className="explore-astrologers">
      <PageHeader title="Explore Astrologers" subtitle="Find an astrologer for your next consultation" className="explore-astrologers__header" actions={<button type="button" className="explore-back-link" onClick={() => navigate(routes.dashboard)}><ArrowLeft size={16} aria-hidden="true" /> Back to Dashboard</button>} />
      <AstrologerSection title="Subscribed Astrologers" astrologers={subscribedAstrologers} viewMoreTo={routes.astrologersFull} onCall={handleCall} onChat={handleChat} onViewProfile={handleViewProfile} />
      <AstrologerSection title="Followed Astrologers" astrologers={followedAstrologers} viewMoreTo={routes.followedAstrologersFull} onCall={handleCall} onChat={handleChat} onViewProfile={handleViewProfile} />
      <AstrologerSection title="Suggested Astrologers" subtitle="Recommended based on your preferences" astrologers={suggestedAstrologers} viewMoreTo={routes.suggestedAstrologers} onCall={handleCall} onChat={handleChat} onViewProfile={handleViewProfile} />
    </div>
  )
}
