import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { mockPoojas } from '../data/notificationData.js'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

export default function PoojaDetails() {
  const [searchParams] = useSearchParams()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const poojaId = searchParams.get('id') || mockPoojas[0].id
  const pooja = useMemo(() => mockPoojas.find((item) => item.id === poojaId) || mockPoojas[0], [poojaId])
  const isLive = pooja.status.toLowerCase().includes('live')

  return (
    <div>
      <PageHeader eyebrow="User portal" title="Pooja Details" showBack backTo={routes.dashboard} />

      <div className="section">
        <Card style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{pooja.name}</div>
            <div className="muted">{pooja.date} · {pooja.time}</div>
          </div>
          <StatusBadge label={pooja.status} />
        </Card>
      </div>

      <div className="section">
        <Card>
          <div className="section-title">Prasadam Status</div>
          <div className="badge badge-green" style={{ width: 'fit-content' }}>{pooja.prasadamStatus}</div>
        </Card>
      </div>

      <div className="section" style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        {isLive && <button className="btn btn-primary">Join Live Pooja</button>}
        <Link to={routes.dashboard} className="btn btn-outline">Back to Dashboard</Link>
      </div>
    </div>
  )
}
