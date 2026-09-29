import { useMemo } from 'react'
import { Megaphone } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import { findAdminDispute, getDisputeId, selectAdminDisputes } from '../../utils/adminDisputes.js'

// Admin -> Dispute details.
//
// Read-only. Raising, responding to and resolving a dispute all happen in the
// user and astrologer modules; none of that behaviour is touched here.
function DetailField({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value || 'Not available'}</div>
    </div>
  )
}

function DetailBlock({ label, children }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  )
}

export default function AdminDisputeDetails() {
  const { disputeKey } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const { questions } = useAppData()

  const disputes = useMemo(() => selectAdminDisputes(questions), [questions])
  const row = useMemo(() => findAdminDispute(disputes, disputeKey), [disputes, disputeKey])

  if (!row) {
    return <Navigate to={`${routes.base}/disputes`} replace />
  }

  const { dispute } = row

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title={getDisputeId(row) || row.questionId || 'Dispute'}
        subtitle={`${row.userName} · ${row.astrologerName}`}
        actions={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`${routes.base}/disputes`)}
          >
            Back to Disputes
          </button>
        }
      />

      <Section title="Dispute" icon={Megaphone} className="!mt-4">
        <Card>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 18,
            }}
          >
            <DetailField label="Dispute ID" value={getDisputeId(row)} />
            <DetailField label="User" value={row.userName} />
            <DetailField label="Astrologer" value={row.astrologerName} />
            <DetailField label="Related record" value={`${row.relatedLabel} · ${row.questionId}`} />
            <DetailField label="Created" value={formatDisplayDate(row.createdAt)} />
            <DetailField label="Target" value={dispute.target} />
            <DetailField
              label="Status"
              value={row.status ? <StatusBadge label={row.status} /> : null}
            />
            <DetailField label="Attachment" value={dispute.attachment} />
          </div>

          <DetailBlock label="Reason">{dispute.reason || 'Not available'}</DetailBlock>

          <DetailBlock label="Details">{dispute.description || 'Not available'}</DetailBlock>
        </Card>
      </Section>

      <Section title="Resolution" icon={Megaphone} className="!mt-5">
        <Card>
          {dispute.response ? (
            <div style={{ marginTop: 0 }}>{dispute.response}</div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>No records found.</p>
          )}
        </Card>
      </Section>
    </div>
  )
}
