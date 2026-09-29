import { useMemo, useState } from 'react'
import { Eye, Search, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import {
  filterAdminSubscriptions,
  getSubscriptionAstrologerName,
  getSubscriptionKey,
  getSubscriptionPlan,
  getSubscriptionStatus,
  getSubscriptionUserName,
  selectSubscriptionStatusFilters,
} from '../../utils/adminSubscriptions.js'

// Admin -> Subscriptions list.
//
// Reads the existing subscriptions collection from AppDataContext. Read-only:
// there is no edit, cancel or refund action here.
export default function AdminSubscriptions() {
  const { subscriptions } = useAppData()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')

  const statusFilters = useMemo(() => selectSubscriptionStatusFilters(subscriptions), [subscriptions])
  const visibleSubscriptions = useMemo(
    () => filterAdminSubscriptions(subscriptions, { query, status }),
    [subscriptions, query, status],
  )

  const openSubscription = (subscription) =>
    navigate(`${routes.base}/subscriptions/${encodeURIComponent(getSubscriptionKey(subscription))}`)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Subscriptions"
        subtitle="Every astrologer subscription on this platform. Open a subscription to review its details."
      />

      <Section className="!mt-4">
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group">
              <div className="search-bar">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by user or astrologer"
                  className="text-input search-bar__input"
                  aria-label="Search subscriptions"
                />
                <button type="button" className="icon-btn" aria-label="Search">
                  <Search size={18} />
                </button>
              </div>
            </div>
            <div className="search-filter-row__group">
              <label className="search-filter-row__heading muted" htmlFor="admin-subscription-status" style={{ fontSize: 13, fontWeight: 600 }}>
                Status
              </label>
              <select
                id="admin-subscription-status"
                className="select-input"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {statusFilters.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </Section>

      <Section
        title="Subscriptions"
        icon={Star}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({visibleSubscriptions.length})</span>}
      >
        <div className="table-wrap">
          {!subscriptions.length ? (
            <p className="muted">No subscriptions found.</p>
          ) : visibleSubscriptions.length === 0 ? (
            <p className="muted">No subscriptions match your search.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Astrologer</th>
                  <th>Plan</th>
                  <th>Started</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleSubscriptions.map((subscription) => {
                  const subscriptionStatus = getSubscriptionStatus(subscription)
                  return (
                    <tr key={getSubscriptionKey(subscription)}>
                      <td>{getSubscriptionUserName(subscription) || '—'}</td>
                      <td>{getSubscriptionAstrologerName(subscription) || subscription.astrologerId || '—'}</td>
                      <td>{getSubscriptionPlan(subscription) || '—'}</td>
                      <td>{formatDisplayDate(subscription.subscribedAt)}</td>
                      <td>{formatDisplayDate(subscription.expiresAt)}</td>
                      <td>
                        {subscriptionStatus ? <StatusBadge label={subscriptionStatus} /> : <span className="muted">Not available</span>}
                      </td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openSubscription(subscription)}>
                          <Eye size={15} /> View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </div>
  )
}
