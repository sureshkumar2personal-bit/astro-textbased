import { useMemo } from 'react'
import { UserRound } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { findAdminAstrologer, getAstrologerStatus } from '../../utils/adminAstrologers.js'

// Admin -> Astrologer details.
//
// Read-only view of an existing astrologer record. No edit, delete, block,
// approve, payment or subscription actions are included at this stage.
function DetailField({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value || '—'}</div>
    </div>
  )
}

export default function AdminAstrologerDetails() {
  const { astrologerId } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const { users } = useAuth()

  const astrologer = useMemo(() => findAdminAstrologer(users, astrologerId), [users, astrologerId])

  if (!astrologer) {
    return <Navigate to={`${routes.base}/astrologers`} replace />
  }

  const status = getAstrologerStatus(astrologer)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title={astrologer.name || 'Astrologer'}
        subtitle={astrologer.specialization || 'No specialisation on record'}
        actions={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`${routes.base}/astrologers`)}
          >
            Back to Astrologers
          </button>
        }
      />

      <Section title="Profile" icon={UserRound} className="!mt-4">
        <Card>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 18,
            }}
          >
            <DetailField label="Name" value={astrologer.name} />
            <DetailField label="Email" value={astrologer.email} />
            <DetailField label="Phone" value={astrologer.phone} />
            <DetailField label="Astrologer ID" value={astrologer.id} />
            <DetailField label="Status" value={status ? <StatusBadge label={status} /> : null} />
          </div>
        </Card>
      </Section>
    </div>
  )
}
