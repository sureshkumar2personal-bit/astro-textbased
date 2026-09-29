import { useMemo } from 'react'
import { Star } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import {
  findAdminSubscriptionByKey,
  getSubscriptionAstrologerName,
  getSubscriptionDiscountQuestionCount,
  getSubscriptionPlan,
  getSubscriptionStatus,
  getSubscriptionUserName,
} from '../../utils/adminSubscriptions.js'

// Admin -> Subscription details.
//
// Read-only. Subscribing, renewing, cancelling and redeeming discount questions
// all happen in their own modules; none of that behaviour is touched here.
function DetailField({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value || 'Not available'}</div>
    </div>
  )
}

export default function AdminSubscriptionDetails() {
  const { subscriptionKey } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const { subscriptions } = useAppData()

  const subscription = useMemo(
    () => findAdminSubscriptionByKey(subscriptions, subscriptionKey),
    [subscriptions, subscriptionKey],
  )

  if (!subscription) {
    return <Navigate to={`${routes.base}/subscriptions`} replace />
  }

  const status = getSubscriptionStatus(subscription)
  const discountQuestions = getSubscriptionDiscountQuestionCount(subscription)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title={getSubscriptionPlan(subscription) || 'Subscription'}
        subtitle={`${getSubscriptionUserName(subscription)} · ${getSubscriptionAstrologerName(subscription)}`}
        actions={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`${routes.base}/subscriptions`)}
          >
            Back to Subscriptions
          </button>
        }
      />

      <Section title="Subscription" icon={Star} className="!mt-4">
        <Card>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 18,
            }}
          >
            <DetailField label="User" value={getSubscriptionUserName(subscription)} />
            <DetailField label="Astrologer" value={getSubscriptionAstrologerName(subscription) || subscription.astrologerId} />
            <DetailField label="Plan" value={getSubscriptionPlan(subscription)} />
            <DetailField label="Started" value={formatDisplayDate(subscription.subscribedAt)} />
            <DetailField label="Expires" value={formatDisplayDate(subscription.expiresAt)} />
            <DetailField
              label="Status"
              value={status ? <StatusBadge label={status} /> : null}
            />
            <DetailField
              label="Price"
              value={subscription.price != null && subscription.price !== '' ? String(subscription.price) : null}
            />
            <DetailField
              label="Autopay"
              value={subscription.autopayEnabled === undefined ? null : subscription.autopayEnabled ? 'Enabled' : 'Disabled'}
            />
            <DetailField label="Discount questions" value={discountQuestions ? String(discountQuestions) : null} />
          </div>
        </Card>
      </Section>
    </div>
  )
}
