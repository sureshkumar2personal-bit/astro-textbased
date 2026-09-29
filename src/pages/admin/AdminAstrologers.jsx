import { useMemo, useState } from 'react'
import { Eye, Search, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import {
  filterAdminAstrologers,
  getAstrologerStatus,
  selectAdminAstrologers,
} from '../../utils/adminAstrologers.js'

// Admin -> Astrologers list.
//
// Reads the existing astrologer catalog (mockAstrologers) through a pure
// selector. No astrologers are created here and nothing is invented: contact
// details appear only for astrologers who have a real account on this device.
export default function AdminAstrologers() {
  const { users } = useAuth()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const [query, setQuery] = useState('')

  const allAstrologers = useMemo(() => selectAdminAstrologers(users), [users])
  const visibleAstrologers = useMemo(() => filterAdminAstrologers(users, query), [users, query])

  const openAstrologer = (astrologerId) => navigate(`${routes.base}/astrologers/${astrologerId}`)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Astrologers"
        subtitle="Every astrologer profile available on this platform. Open an astrologer to review their details."
      />

      <Section className="!mt-4">
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group">
              <div className="search-bar">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, email, or phone"
                  className="text-input search-bar__input"
                  aria-label="Search astrologers"
                />
                <button type="button" className="icon-btn" aria-label="Search">
                  <Search size={18} />
                </button>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      <Section
        title="Astrologers"
        icon={UserRound}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({visibleAstrologers.length})</span>}
      >
        <div className="table-wrap">
          {allAstrologers.length === 0 ? (
            <p className="muted">No astrologers found.</p>
          ) : visibleAstrologers.length === 0 ? (
            <p className="muted">No astrologers match your search.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Astrologer</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleAstrologers.map((astrologer) => {
                  const status = getAstrologerStatus(astrologer)
                  return (
                    <tr key={astrologer.id}>
                      <td>
                        <strong>{astrologer.name || '—'}</strong>
                        {astrologer.id && <div className="muted" style={{ fontSize: 12 }}>{astrologer.id}</div>}
                      </td>
                      <td>{astrologer.email || '—'}</td>
                      <td>{astrologer.phone || '—'}</td>
                      <td>{status ? <StatusBadge label={status} /> : '—'}</td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openAstrologer(astrologer.id)}>
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

      <Section className="!mt-5">
        <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
          Email and phone are stored on the astrologer account, so they only appear for astrologers who
          have an account on this device. Status shows the availability recorded on the profile.
        </p>
      </Section>
    </div>
  )
}
