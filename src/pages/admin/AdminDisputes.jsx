import { useMemo, useState } from 'react'
import { Eye, Megaphone, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import {
  filterAdminDisputes,
  getDisputeId,
  selectAdminDisputes,
  selectDisputeStatusFilters,
} from '../../utils/adminDisputes.js'

// Admin -> Disputes list.
//
// Reads the disputes attached to the questions store. Read-only: there is no
// respond, resolve, refund, edit or delete action here.
export default function AdminDisputes() {
  const { questions } = useAppData()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')

  const disputes = useMemo(() => selectAdminDisputes(questions), [questions])
  const statusFilters = useMemo(() => selectDisputeStatusFilters(disputes), [disputes])
  const visibleDisputes = useMemo(() => filterAdminDisputes(disputes, { query, status }), [disputes, query, status])

  const openDispute = (key) => navigate(`${routes.base}/disputes/${key}`)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Disputes"
        subtitle="Every dispute raised on this platform. Open a dispute to review its details."
      />

      <Section className="!mt-4">
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group">
              <div className="search-bar">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by user, astrologer, or question ID"
                  className="text-input search-bar__input"
                  aria-label="Search disputes"
                />
                <button type="button" className="icon-btn" aria-label="Search">
                  <Search size={18} />
                </button>
              </div>
            </div>
            <div className="search-filter-row__group">
              <label className="search-filter-row__heading muted" htmlFor="admin-dispute-status" style={{ fontSize: 13, fontWeight: 600 }}>
                Status
              </label>
              <select
                id="admin-dispute-status"
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
        title="Disputes"
        icon={Megaphone}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({visibleDisputes.length})</span>}
      >
        <div className="table-wrap">
          {!disputes.length ? (
            <p className="muted">No disputes found.</p>
          ) : visibleDisputes.length === 0 ? (
            <p className="muted">No disputes match your search.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Dispute ID</th>
                  <th>User</th>
                  <th>Astrologer</th>
                  <th>Related</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDisputes.map((dispute) => (
                  <tr key={dispute.key}>
                    <td>{getDisputeId(dispute) || <span className="muted">Not available</span>}</td>
                    <td>{dispute.userName || '—'}</td>
                    <td>{dispute.astrologerName || '—'}</td>
                    <td>{dispute.relatedLabel}</td>
                    <td>{formatDisplayDate(dispute.createdAt)}</td>
                    <td><StatusBadge label={dispute.status} /></td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openDispute(dispute.key)}>
                        <Eye size={15} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </div>
  )
}
