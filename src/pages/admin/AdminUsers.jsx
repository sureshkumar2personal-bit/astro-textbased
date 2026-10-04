import { useMemo, useState } from 'react'
import { ChevronRight, Eye, Info, Search, SearchX, Users as UsersIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { useAdmin } from '../../state/AdminContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import {
  ADMIN_USER_STATUS_FILTERS,
  ADMIN_USER_SUBSCRIPTION_FILTERS,
  filterAdminUsers,
  formatDisplayDate,
  getUserAccountStatus,
  getUserJoinedDate,
  selectCustomerUsers,
} from '../../utils/adminUsers.js'

// Admin -> Users list.
//
// Reads the real account list already held by AuthContext (localStorage key
// astroconnect-auth-users). Every row is an account that exists in this browser;
// nothing is created, counted or estimated here.
//
// Read-only by design. The only action is "View", which opens the existing user
// detail route. Nothing on this page can edit, block, suspend or delete an
// account.
//
// Presentation only below this point: one shared surface holds the control bar
// and the table, separated by a hairline, so the result count reads as table
// context rather than as another section. Row rhythm, typography and avatar
// treatment come from the same tokens the rest of the admin workspace uses.
//
// Colour hierarchy below is deliberately three-tiered and uses only tokens that
// already exist, so it re-tints itself in dark mode:
//   primary    -> var(--ink)      titles, headings, names, counts
//   secondary  -> var(--body)     email, phone, joined, supporting row values
//   supporting -> var(--muted)    ids, labels, notes, placeholder states
// Accent (var(--primary)) is reserved for the single interactive emphasis on the
// page — the eyebrow, an active filter and the avatar tints — so the page does not
// become uniformly colourful.

// Surfaces. `--primary-bg` is a very light violet in light mode and a low-alpha
// violet in dark mode, so mixing it into the surface gives a tint that stays soft
// in both themes without introducing a new token or a gradient.
const PANEL = {
  background: 'color-mix(in srgb, var(--primary-bg) 26%, var(--surface))',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--radius-m)',
  boxShadow: 'var(--shadow-xs)',
}

// Column headings. The shared `th` rule is already 700 weight, so the fix here is
// colour: the headings were pinned to var(--muted), the same tone as the quietest
// text in the table, which is what made them read as grey labels rather than as
// headings.
const HEADING = {
  color: 'var(--ink)',
  fontWeight: 700,
  letterSpacing: '0.05em',
}

// Row rhythm. Only the vertical value is set, so the horizontal padding and the
// hairline separators keep coming from the shared table styles.
const CELL = { paddingTop: 18, paddingBottom: 18 }

// Secondary row values. var(--body) rather than .muted: phone and joined were the
// faintest text in the row and were hard to scan, while the ids that sit underneath
// the name are meant to be quieter than those.
const SECONDARY = { color: 'var(--body)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }

// Status pill tones. This mirrors the shared StatusBadge visual exactly — same
// rounded pill, same dot, same text size — and reuses the same token pairs, but the
// mapping is local to this page.
//
// It exists because StatusBadge has no entry for "blocked" or "suspended", so both
// fell through to its violet fallback: a blocked account and a suspended account were
// rendered in the same colour, and neither matched its meaning. Active/Suspended/
// Blocked are the only three values getUserAccountStatus can return, and this maps
// them to positive / warning / negative using tokens already in the stylesheet.
// No status is invented and no status logic changes: the labels still come from
// getUserAccountStatus, this only decides which existing tone paints them.
const STATUS_TONES = {
  Active: 'bg-[color:var(--success-bg)] text-[color:var(--green-600)]',
  Suspended: 'bg-[color:var(--warning-bg)] text-[color:var(--amber-600)]',
  Blocked: 'bg-[color:var(--danger-bg)] text-[color:var(--red-600)]',
}

// Muted avatar tints, assigned by row position so neighbouring users never share
// the same one and the column can be scanned quickly. Every entry is an existing
// theme tint (see .tone-* in index.css) — none is a hardcoded colour, so the
// palette re-tints itself in dark mode.
const AVATAR_TONES = ['violet', 'sky', 'teal', 'gold', 'rose']


// Monogram built from the stored display name only. There is no avatar image in
// the account model, so no image URL is fabricated.
function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return `${first}${last}`.toUpperCase()
}

// Identity cell — the strongest element in a row. Monogram, then the account name,
// then the id as quiet supporting metadata.
function UserIdentity({ user, tone }) {
  return (
    <div className="flex items-center gap-3.5" style={{ minWidth: 0 }}>
      <span
        aria-hidden="true"
        className={`stat-icon tone-${tone}`}
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-s)',
          flex: 'none',
          // Ring derived from the tile's own colour, so it matches the tint in
          // both themes without another token.
          boxShadow: 'inset 0 0 0 1px color-mix(in srgb, currentColor 16%, transparent)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.01em' }}>
          {getInitials(user.name)}
        </span>
      </span>
      <span className="flex flex-col" style={{ minWidth: 0, gap: 3 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
          {user.name || '—'}
        </span>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: 'var(--body)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {user.id || '—'}
        </span>
      </span>
    </div>
  )
}

// Page-scoped account status pill. See STATUS_TONES for why this is local rather
// than delegated to the shared StatusBadge.
function UserStatusBadge({ label }) {
  const tone = STATUS_TONES[label] || STATUS_TONES.Active
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${tone}`}>
      <span className="h-[7px] w-[7px] rounded-full bg-current" />
      {label}
    </span>
  )
}


// Neutral empty state. The two cases stay separate so the copy can say whether
// the platform has no accounts at all, or the current filters exclude them all.
function EmptyState({ icon: Icon, title, note }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ gap: 10, padding: '52px 24px', textAlign: 'center' }}
    >
      <span
        className="stat-icon tone-neutral"
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-s)',
          flex: 'none',
          boxShadow: 'inset 0 0 0 1px color-mix(in srgb, currentColor 16%, transparent)',
        }}
      >
        <Icon size={20} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 650, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
        {title}
      </span>
      <span className="muted" style={{ fontSize: 12.5, maxWidth: 340, lineHeight: 1.55 }}>{note}</span>
    </div>
  )
}

export default function AdminUsers() {
  const { currentAdmin } = useAdmin()
  const { users } = useAuth()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [subscription, setSubscription] = useState('All')
  const [page, setPage] = useState(1)

  const allUsers = useMemo(() => selectCustomerUsers(users), [users])

  const visibleUsers = useMemo(() => filterAdminUsers(users, { query, status, subscription }), [users, query, status, subscription])

  const totalLabel = `user${allUsers.length === 1 ? '' : 's'}`
  const isFiltered = status !== 'All' || subscription !== 'All' || query.trim().length > 0

  const PAGE_SIZE = 10
  const pageCount = Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pagedUsers = visibleUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const updateQuery = (value) => { setQuery(value); setPage(1) }
  const updateStatus = (value) => { setStatus(value); setPage(1) }
  const updateSubscription = (value) => { setSubscription(value); setPage(1) }

  const openUser = (userId) => navigate(`${routes.base}/users/${userId}`)

  const adminName = currentAdmin?.name || 'Administrator'
  const adminInitials = adminName.split(' ').map((part) => part[0]).slice(0, 2).join('')

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Users"
        subtitle="Every user account registered on this platform. Open a user to review their profile and related activity."
        actions={(
          <div
            className="flex items-center gap-2.5"
            style={{
              padding: '7px 14px 7px 7px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--surface)',
              border: '1px solid var(--surface-border)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <span
              className="inline-flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--primary-bg)',
                color: 'var(--primary)',
                fontSize: 11,
                fontWeight: 800,
                flex: 'none',
              }}
            >
              {adminInitials}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--ink)' }}>{adminName}</span>
            <span aria-hidden="true" style={{ width: 1, height: 14, background: 'var(--divider)' }} />
            <span className="muted" style={{ fontSize: 12 }}>Platform administrator</span>
          </div>
        )}
      />

      <Section>
        {/* One surface for the controls and the table. The hairline between them
            is what makes the result count read as table context. */}
        <Card style={{ ...PANEL, padding: 0, overflow: 'hidden' }}>
          <div
            className="flex flex-wrap items-center gap-3"
            style={{ padding: '15px 18px', justifyContent: 'space-between', rowGap: 12 }}
          >
            <div
              className="flex flex-wrap items-center gap-3"
              style={{ flex: '1 1 360px', minWidth: 0 }}
            >
              {/* Primary control: the search field carries the stronger border. */}
              <div
                className="search-bar"
                style={{ flex: '1 1 260px', width: 'auto', minWidth: 0, maxWidth: 440 }}
              >
                <input
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder="Search by name, email, phone, or user ID"
                  className="text-input search-bar__input"
                  aria-label="Search users"
                  style={{ borderColor: 'var(--border)', fontWeight: 500 }}
                />
                {/* Decorative only: filtering runs live on every keystroke, so this
                    icon carries no action and is never given a handler. Quieted down
                    so it does not read as a second button. */}
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Search"
                  style={{ color: 'var(--muted)', borderColor: 'var(--surface-border)' }}
                >
                  <Search size={17} />
                </button>
              </div>

              <span
                aria-hidden="true"
                className="hidden lg:block"
                style={{ width: 1, height: 24, background: 'var(--divider)', flex: 'none' }}
              />

              {/* Secondary control: recessed surface. The accent only appears once a
                  status other than "All" is chosen, so the control reads as neutral at
                  rest and clearly engaged when it is narrowing the list. This is a
                  presentation of the existing `status` state — the same value drives
                  the same filter as before. */}
              <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
                <label
                  htmlFor="admin-user-status"
                  style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--body)', letterSpacing: '0.01em' }}
                >
                  Status
                </label>
                <select
                  id="admin-user-status"
                  className="select-input"
                  value={status}
                  onChange={(event) => updateStatus(event.target.value)}
                  style={{
                    width: 'auto',
                    minWidth: 132,
                    height: 40,
                    fontSize: 13.5,
                    fontWeight: status === 'All' ? 500 : 700,
                    borderRadius: 8,
                    borderColor: status === 'All' ? 'var(--surface-border)' : 'var(--primary)',
                    background: status === 'All'
                      ? 'var(--surface-soft)'
                      : 'color-mix(in srgb, var(--primary-bg) 55%, var(--surface))',
                    color: status === 'All' ? 'var(--body)' : 'var(--primary)',
                    boxShadow: status === 'All' ? 'none' : 'inset 0 0 0 1px color-mix(in srgb, var(--primary) 22%, transparent)',
                  }}
                >
                  {ADMIN_USER_STATUS_FILTERS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <span
                aria-hidden="true"
                className="hidden lg:block"
                style={{ width: 1, height: 24, background: 'var(--divider)', flex: 'none' }}
              />

              {/* Subscription filter mirrors the status filter: same accent
                  treatment when narrowing, neutral at rest, and it combines with
                  the search and status filters on the same value pipeline. */}
              <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
                <label
                  htmlFor="admin-user-subscription"
                  style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--body)', letterSpacing: '0.01em' }}
                >
                  Subscription
                </label>
                <select
                  id="admin-user-subscription"
                  className="select-input"
                  value={subscription}
                  onChange={(event) => updateSubscription(event.target.value)}
                  style={{
                    width: 'auto',
                    minWidth: 132,
                    height: 40,
                    fontSize: 13.5,
                    fontWeight: subscription === 'All' ? 500 : 700,
                    borderRadius: 8,
                    borderColor: subscription === 'All' ? 'var(--surface-border)' : 'var(--primary)',
                    background: subscription === 'All'
                      ? 'var(--surface-soft)'
                      : 'color-mix(in srgb, var(--primary-bg) 55%, var(--surface))',
                    color: subscription === 'All' ? 'var(--body)' : 'var(--primary)',
                    boxShadow: subscription === 'All' ? 'none' : 'inset 0 0 0 1px color-mix(in srgb, var(--primary) 22%, transparent)',
                  }}
                >
                  {ADMIN_USER_SUBSCRIPTION_FILTERS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Result count. The number is the one figure on this page, so it is set in
                ink with tabular figures; the noun stays quiet so the count leads. */}
            <span
              className="flex items-baseline gap-1.5"
              style={{ whiteSpace: 'nowrap' }}
              aria-live="polite"
            >
              <span style={{ fontSize: 17, fontWeight: 750, color: 'var(--ink)', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                {visibleUsers.length}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--muted)' }}>
                {isFiltered ? `of ${allUsers.length} ${totalLabel}` : totalLabel}
              </span>
            </span>
          </div>

          <div aria-hidden="true" style={{ height: 1, background: 'var(--divider)' }} />

          {allUsers.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No user accounts yet"
              note="No user account is registered on this device, so there is nothing to list."
            />
          ) : visibleUsers.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No users match your search"
              note="No registered account matches the current search text, status filter and subscription filter."
            />
          ) : (
            <>
            <div className="table-wrap">
              <table>
                <thead>
                  {/* Header row carries a light accent tint so the columns read as a
                      band above the data rather than as floating grey labels. */}
                  <tr style={{ background: 'color-mix(in srgb, var(--primary-bg) 42%, var(--surface-soft))' }}>
                    <th style={{ ...HEADING, width: '27%' }}>User</th>
                    <th style={{ ...HEADING, width: '22%' }}>Email</th>
                    <th style={{ ...HEADING, width: '15%' }}>Phone</th>
                    <th style={{ ...HEADING, width: '12%' }}>Status</th>
                    <th style={{ ...HEADING, width: '12%', textAlign: 'right' }}>
                      Joined
                    </th>
                    <th style={{ ...HEADING, width: '12%', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td style={CELL}>
                        <UserIdentity user={user} tone={AVATAR_TONES[index % AVATAR_TONES.length]} />
                      </td>
                      <td style={{ ...CELL, ...SECONDARY, fontSize: 13, fontWeight: 500 }}>{user.email || '—'}</td>
                      <td style={{ ...CELL, ...SECONDARY, whiteSpace: 'nowrap' }}>
                        {user.phone || '—'}
                      </td>
                      <td style={{ ...CELL, whiteSpace: 'nowrap' }}>
                        <UserStatusBadge label={getUserAccountStatus(user)} />
                      </td>
                      <td style={{ ...CELL, ...SECONDARY, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {formatDisplayDate(getUserJoinedDate(user))}
                      </td>
                      <td style={{ ...CELL, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {/* Same button system and handler as before. The base border is
                            softened so the row action is quiet, while the shared
                            hover (tinted background + primary text) still reads. */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openUser(user.id)}
                          aria-label={`View ${user.name || 'user'}`}
                          style={{ borderWidth: 1, borderColor: 'var(--border)', fontWeight: 600 }}
                        >
                          <Eye size={15} /> View
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className="flex items-center justify-between gap-3"
              style={{ padding: '12px 18px', borderTop: '1px solid var(--divider)' }}
              aria-label="User list pagination"
            >
              <span className="muted" style={{ fontSize: 12.5 }}>
                Page {currentPage} of {pageCount} · {visibleUsers.length} user{visibleUsers.length === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
            </>
          )}
        </Card>
      </Section>

      {/* Compact neutral footnote. This is a real limitation of the account
          model, so it is kept rather than dropped, but it no longer sits in a
          title-less Section that reads like broken page structure. */}
      <Card
        style={{ ...PANEL, background: 'var(--surface-soft)', padding: '14px 16px', marginTop: 14 }}
        className="flex gap-3"
      >
        <Info size={17} style={{ color: 'var(--muted)', flex: 'none', marginTop: 1 }} />
        <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
          Account status is read-only here and is read straight from the stored account. Seeded demo accounts cover every status (Active, Suspended, Blocked), and nothing on this page can change one.
          Note that the sign-in path in <code>AuthContext</code> still checks only email and
          password, so a Blocked or Suspended label is descriptive on this build rather than
          enforced. Joined is shown from the account’s own registration timestamp; an account
          recorded without one still reports “Not available”.
        </p>
      </Card>
    </div>
  )
}
