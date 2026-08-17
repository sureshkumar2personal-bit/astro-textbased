import { ArrowLeft, Languages, Star, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { mockAstrologers } from '../data/notificationData.js'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

function AvailabilityBadge({ availability }) {
  const online = availability === 'Online'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${online
        ? 'bg-[color:var(--success-bg)] text-[color:var(--green-600)]'
        : 'bg-[color:var(--neutral-bg)] text-[color:var(--muted)]'}`}
    >
      <span className={`h-2 w-2 rounded-full ${online ? 'bg-[color:var(--success)]' : 'bg-[color:var(--muted)]'}`} />
      {availability}
    </span>
  )
}

export default function Astrologers() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        eyebrow="User portal"
        title="Explore Astrologers"
        subtitle="Find the right astrologer for your questions and consultations."
        actions={<Link to={routes.dashboard} className="btn btn-outline"><ArrowLeft size={15} />Back to Dashboard</Link>}
      />

      <Section title={`${mockAstrologers.length} Astrologers Available`} icon={UserRound}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {mockAstrologers.map((astrologer) => (
            <Card key={astrologer.id} hover>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] text-lg font-bold text-white">
                    {astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{astrologer.name}</h2>
                    <div className="muted" style={{ marginTop: 4 }}>{astrologer.specialization}</div>
                  </div>
                </div>
                <AvailabilityBadge availability={astrologer.availability} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[14px] bg-[color:var(--surface-soft)] p-3">
                  <div className="muted text-xs font-semibold uppercase tracking-wide">Experience</div>
                  <div className="mt-1 flex items-center gap-2 font-bold text-[color:var(--text-primary)]">
                    <Star size={15} className="text-[color:var(--accent)]" />
                    {astrologer.experience}
                  </div>
                </div>
                <div className="rounded-[14px] bg-[color:var(--surface-soft)] p-3">
                  <div className="muted text-xs font-semibold uppercase tracking-wide">Rating</div>
                  <div className="mt-1 font-bold text-[color:var(--text-primary)]">{astrologer.rating}</div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2">
                <Languages size={16} className="mt-0.5 shrink-0 text-[color:var(--primary)]" />
                <div>
                  <div className="muted text-xs font-semibold uppercase tracking-wide">Languages</div>
                  <div className="mt-1 text-sm text-[color:var(--text-primary)]">{astrologer.languages.join(' · ')}</div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary mt-5 w-full"
                onClick={() => navigate(`${routes.astrologerProfile}?id=${astrologer.id}`)}
              >
                View Profile
              </button>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  )
}
