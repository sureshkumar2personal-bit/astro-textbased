import { useNavigate } from 'react-router-dom'
import { subscribedAstrologers } from '../../../data/notificationData.js'
import AstrologerCard from '../../../components/AstrologerCard.jsx'
import BackButton from '../../../components/BackButton.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'

export default function AstrologersFull() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--ink)]">All Subscribed Astrologers</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">Explore all astrologers you are subscribed to</p>
        </div>
        <BackButton to={routes.astrologers} />
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        {subscribedAstrologers.map((astrologer) => (
          <AstrologerCard
            key={astrologer.id}
            astrologer={astrologer}
            onViewProfile={(astrologerId) => navigate(`${routes.astrologerProfile}?id=${astrologerId}`)}
            onCall={(astrologerId) => navigate(`${routes.callPackages}?id=${astrologerId}`)}
            onChat={(astrologerId) => navigate(`${routes.chatBooking}?id=${astrologerId}`)}
          />
        ))}
      </div>
    </div>
  )
}
