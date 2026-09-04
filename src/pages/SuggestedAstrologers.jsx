import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { getSuggestedAstrologers } from '../data/notificationData.js'
import AstrologerCard from '../components/AstrologerCard.jsx'
import BackButton from '../components/BackButton.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

const PAGE_SIZE = 4
const MAX_VISIBLE = PAGE_SIZE * 3

export default function SuggestedAstrologers() {
  const { currentUser } = useAuth()
  const { followedAstrologerIds, subscriptions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const subscribedAstrologerIds = subscriptions
    .filter((subscription) => subscription.userId === currentUser?.id)
    .map((subscription) => subscription.astrologerId)
  const suggestedAstrologers = getSuggestedAstrologers({ followedAstrologerIds, subscribedAstrologerIds, preferencesEnabled: currentUser?.astrologerPreferencesEnabled, preferences: currentUser?.astrologerPreferences })
  const visibleAstrologers = suggestedAstrologers.slice(0, visibleCount)
  const hasMore = visibleCount < suggestedAstrologers.length && visibleCount < MAX_VISIBLE

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--ink)]">Suggested Astrologers</h1>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">Recommended based on your preferences</p>
        </div>
        <BackButton to={routes.astrologers} />
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        {visibleAstrologers.map((astrologer) => (
          <AstrologerCard
            key={astrologer.id}
            astrologer={astrologer}
            onCall={(astrologerId) => navigate(`${routes.callPackages}?id=${astrologerId}`)}
            onChat={(astrologerId) => navigate(`/chat-birth-details/${astrologerId}`)}
            onViewProfile={(astrologerId) => navigate(`${routes.base}/astrologer/${astrologerId}?from=explore`)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button type="button" className="btn btn-primary" onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, MAX_VISIBLE))}>
            See More <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
