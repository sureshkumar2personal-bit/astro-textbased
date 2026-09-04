import { Users, UserCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { mockAstrologers } from '../../../../data/notificationData.js'
import Card from '../../../components/ui/Card.jsx'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import Section from '../../../components/ui/Section.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'

function formatCount(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return String(count)
}

function AstrologerCard({ astrologer }) {
  return (
    <Card hover className="flex flex-col h-48">
      <div className="flex flex-col items-center text-center p-3">
        <div className="relative mb-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] text-xl font-bold text-white shadow-lg">
            {astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
          </div>
          <span
            className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white ${
              astrologer.availability === 'Online' ? 'bg-[color:var(--success)]' : 'bg-[color:var(--muted)]'
            }`}
          />
        </div>

        <h3 className="text-lg font-bold text-[color:var(--ink)]">{astrologer.name}</h3>
        <p className="mt-1 text-sm font-medium text-[color:var(--primary)]">{astrologer.specialization}</p>
        <p className="mt-1 text-xs text-[color:var(--muted)]">{astrologer.type}</p>

        <div className="mt-3 flex items-center gap-1 text-sm text-[color:var(--text-secondary)]">
          <span className="font-semibold">{astrologer.experience}</span>
          <span>Experience</span>
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {astrologer.languages.map((lang) => (
            <span
              key={lang}
              className="rounded-full bg-[color:var(--surface-soft)] px-2 py-0.5 text-xs text-[color:var(--text-secondary)]"
            >
              {lang}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-[color:var(--border)] px-4 py-3">
        <div className="flex items-center justify-around text-center">
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-[color:var(--primary)]" />
            <div>
              <div className="text-sm font-bold text-[color:var(--ink)]">{formatCount(astrologer.followers)}</div>
              <div className="text-[10px] text-[color:var(--muted)]">Followers</div>
            </div>
          </div>
          <div className="h-8 w-px bg-[color:var(--border)]" />
          <div className="flex items-center gap-1.5">
            <UserCheck size={14} className="text-[color:var(--accent)]" />
            <div>
              <div className="text-sm font-bold text-[color:var(--ink)]">{formatCount(astrologer.subscribers || 0)}</div>
              <div className="text-[10px] text-[color:var(--muted)]">Subscribers</div>
            </div>
          </div>
        </div>
      </div>

    </Card>
  )
}

export default function Astrologers() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()

  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-left">subscribed astrologer</h1>
      <div className="flex items-center gap-8">
        {mockAstrologers.slice(0, 3).map((astrologer) => (
          <AstrologerCard
            key={astrologer.id}
            astrologer={astrologer}
          />
        ))}
        <Link
          to="/astrologers-full"
          className="rounded-md border border-violet-300 bg-white text-violet-600 font-medium px-4 py-2 hover:border-violet-400 hover:text-violet-500 transition-colors cursor-pointer"
        >
          {isExpanded ? 'View Less ↑' : 'View More →'}
        </Link>
      </div>
      {isExpanded && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockAstrologers.slice(3).map((astrologer) => (
            <AstrologerCard
              key={astrologer.id}
              astrologer={astrologer}
            />
          ))}
        </div>
      )}
    </div>
  )
}
