import { useMemo, useState } from 'react'
import { Eye, Search, Users as UsersIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import {
  ADMIN_USER_STATUS_FILTERS,
  filterAdminUsers,
  formatDisplayDate,
  getUserAccountStatus,
  getUserJoinedDate,
  selectCustomerUsers,
} from '../../utils/adminUsers.js'

// Admin -> Users list.
//
// Reads the real account list already held by AuthContext (localStorage key
// astroconnect-auth-users). No users are created here and no statistics are
// invented: every row is an account that exists in this browser.
export default function AdminUsers() {
  const { users } = useAuth()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')

  const allUsers = useMemo(() => selectCustomerUsers(users), [users])
  const visibleUsers = useMemo(() => filterAdminUsers(users, { query, status }), [users, query, status])

  const openUser = (userId) => navigate(`${routes.base}/users/${userId}`)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Users"
        subtitle="Every user account registered on this platform. Open a user to review their profile and related activity."
      />

      <Section className="!mt-4">
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group">
              <div className="search-bar">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, email, phone, or user ID"
                  className="text-input search-bar__input"
                  aria-label="Search users"
                />
                <button type="button" className="icon-btn" aria-label="Search">
                  <Search size={18} />
                </button>
              </div>
            </div>
            <div className="search-filter-row__group">
              <label className="search-filter-row__heading muted" htmlFor="admin-user-status" style={{ fontSize: 13, fontWeight: 600 }}>
                Status
              </label>
              <select
                id="admin-user-status"
                className="select-input"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {ADMIN_USER_STATUS_FILTERS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </Section>

      <Section
        title="Users"
        icon={UsersIcon}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({visibleUsers.length})</span>}
      >
        <div className="table-wrap">
          {allUsers.length === 0 ? (
            <p className="muted">No users found.</p>
          ) : visibleUsers.length === 0 ? (
            <p className="muted">No users match your search.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name || '—'}</strong>
                      {user.id && <div className="muted" style={{ fontSize: 12 }}>{user.id}</div>}
                    </td>
                    <td>{user.email || '—'}</td>
                    <td>{user.phone || '—'}</td>
                    <td><StatusBadge label={getUserAccountStatus(user)} /></td>
                    <td>{formatDisplayDate(getUserJoinedDate(user))}</td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openUser(user.id)}>
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

      <Section className="!mt-5">
        <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
          Account status is read-only here and is derived from the stored user record. This app has no
          blocked or suspended account state yet, so every registered account currently reports as
          Active and those filters return no rows until that state exists.
        </p>
      </Section>
    </div>
  )
}
