import { Link, useNavigate } from 'react-router-dom'
import { getSuggestedAstrologers, mockAstrologers } from '../data/notificationData.js'
import AstrologerCard from '../components/AstrologerCard.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

function AstrologerSection({ title, astrologers, viewMoreTo, onViewProfile, onCall, onChat }) {
  return (
    <section className="astrologer-list-section" aria-labelledby={`${title.toLowerCase().replaceAll(' ', '-')}-heading`}>
      <h2 id={`${title.toLowerCase().replaceAll(' ', '-')}-heading`} className="astrologer-list-section__title">{title}</h2>
      <div className="astrologer-list-section__grid">
        {astrologers.slice(0, 3).map((astrologer) => (
          <AstrologerCard key={astrologer.id} astrologer={astrologer} onViewProfile={onViewProfile} onCall={onCall} onChat={onChat} />
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
  const suggestedAstrologers = getSuggestedAstrologers({ followedAstrologerIds, subscribedAstrologerIds })

  const handleViewProfile = (astrologerId) => {
    navigate(`${routes.astrologerProfile}?id=${astrologerId}`)
  }

  const handleCall = (astrologerId) => {
    navigate(`${routes.callPackages}?id=${astrologerId}`)
  }

  const handleChat = (astrologerId) => {
    navigate(`${routes.chatBooking}?id=${astrologerId}`)
  }

  return (
    <div className="explore-astrologers">
      <PageHeader title="Explore Astrologers" subtitle="Find an astrologer for your next consultation" className="explore-astrologers__header" />
      <AstrologerSection title="Subscribed Astrologers" astrologers={subscribedAstrologers} viewMoreTo={routes.astrologersFull} onViewProfile={handleViewProfile} onCall={handleCall} onChat={handleChat} />
      <AstrologerSection title="Followed Astrologers" astrologers={followedAstrologers} viewMoreTo={routes.followedAstrologersFull} onViewProfile={handleViewProfile} onCall={handleCall} onChat={handleChat} />
      <AstrologerSection title="Suggested Astrologers" astrologers={suggestedAstrologers} viewMoreTo={routes.suggestedAstrologers} onViewProfile={handleViewProfile} onCall={handleCall} onChat={handleChat} />
    </div>
  )
}
