import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Radio } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { mockLiveSessions } from '../data/notificationData.js'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

export default function LiveSession() {
  const [searchParams] = useSearchParams()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const sessionId = searchParams.get('id') || mockLiveSessions[0].id
  const session = useMemo(
    () => mockLiveSessions.find((item) => item.id === sessionId) || mockLiveSessions[0],
    [sessionId],
  )
  const isLive = session.status.toLowerCase().includes('live')

  return (
    <div>
      <PageHeader eyebrow="User portal" title="Live Session" showBack backTo={routes.dashboard} />

      <div className="section">
        <Card style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{session.title}</div>
            <div className="muted">with {session.astrologer} · {session.time}</div>
          </div>
          <StatusBadge label={session.status} />
        </Card>
      </div>

      <div className="section">
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 20px', color: 'var(--muted)' }}>
          <Radio size={32} />
          {isLive ? 'Live stream would play here.' : 'This session has not started yet.'}
        </Card>
      </div>

      <div className="section" style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        {isLive ? (
          <button className="btn btn-primary">Join Live Session</button>
        ) : (
          <button className="btn btn-primary">Set Reminder</button>
        )}
        <Link to={routes.dashboard} className="btn btn-outline">Back to Dashboard</Link>
      </div>
    </div>
  )
}
