import { useMemo, useState } from 'react'
import { ChevronRight, Eye, Info, Search, SearchX, Star, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { useAdmin } from '../../state/AdminContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import {
  filterAdminAstrologers,
  getAstrologerStatus,
  selectAdminAstrologers,
} from '../../utils/adminAstrologers.js'

// Admin -> Astrologers list.
//
// Reads the astrologer catalog already in the project (mockAstrologers, exported
// from data/notificationData.js) through the existing selectors, enriched with
// contact details from astrologer accounts held by AuthContext. No astrologer is
// created, counted or estimated here, and no selector is extended.
//
// Read-only by design. The only action is "View", which opens the existing
// astrologer detail route. Nothing on this page can edit, delete, block, suspend,
// approve or verify an astrologer.
//
// Presentation only below this point: one shared surface holds the control bar and
// the table, separated by a hairline, so the result count reads as table context
// rather than as another section. Row rhythm, typography, avatar treatment and
// badge usage come from the same tokens the rest of the admin workspace uses.

const PANEL = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--radius-m)',
  boxShadow: 'var(--shadow-xs)',
}

// Row rhythm. Only the vertical value is set, so the horizontal padding and the
// hairline separators keep coming from the shared table styles.
const CELL = { paddingTop: 18, paddingBottom: 18 }

// Muted avatar tints, assigned by row position so neighbouring astrologers never
// share the same one and the column can be scanned quickly. Every entry is an
// existing theme tint (see .tone-* in index.css) — none is a hardcoded colour, so
// the palette re-tints itself in dark mode.
const AVATAR_TONES = ['violet', 'sky', 'teal', 'gold', 'rose']

// Monogram built from the stored display name only. The catalog has no avatar
// image field, so no image URL is fabricated.
function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return `${first}${last}`.toUpperCase()
}

// Rating is stored as a display string such as '4.9 / 5'. Only the leading number
// is lifted out for the compact cell; the string itself is never replaced by a
// guess. Returns null when nothing numeric is on the record.
function getRatingValue(astrologer) {
  const match = String(astrologer?.rating || '').match(/\d+(?:\.\d+)?/)
  return match ? match[0] : null
}

// Review volume is stored as a display string such as '2,345 reviews'. Only the
// count is lifted out, so the number shown is always the stored number.
function getReviewCount(astrologer) {
  const match = String(astrologer?.reviews || '').match(/[\d,.]+/)
  return match ? match[0] : null
}

// Consultation rate is recorded as a bare per-minute number on only some catalog
// entries (consultationRate: 20). The app's own convention for a present rate is
// rupees per minute (see components/AstrologerCard.jsx), so that convention is
// reused here. A missing rate stays missing: unlike AstrologerCard, this page does
// not derive a rate from experience, because an invented price in an admin view is
// worse than an honest blank.
function getConsultationRate(astrologer) {
  const rate = astrologer?.consultationRate
  if (rate === undefined || rate === null || rate === '') return null
  return `₹${rate}/min`
}

// Availability reads best with Online ahead of Offline. Only the order given here
// is fixed; anything not listed still sorts alphabetically after those entries.
const AVAILABILITY_PREFERENCE = ['Online', 'Offline']

// Distinct values present in the catalog, with 'All' first. Built from the records
// themselves, so a filter option can never offer a value no astrologer has.
function buildFilterOptions(records, read, preferred = []) {
  const values = []
  for (const record of records) {
    const value = String(read(record) || '').trim()
    if (value && !values.includes(value)) values.push(value)
  }
  values.sort((a, b) => {
    const aIndex = preferred.indexOf(a)
    const bIndex = preferred.indexOf(b)
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    }
    return a.localeCompare(b)
  })
  return ['All', ...values]
}

// Identity cell — the strongest element in a row. Monogram, then the astrologer
// name, then the astrologer id as quiet supporting metadata.
function AstrologerIdentity({ astrologer, tone }) {
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
          {getInitials(astrologer.name)}
        </span>
      </span>
      <span className="flex flex-col" style={{ minWidth: 0, gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
          {astrologer.name || '—'}
        </span>
        <span className="muted" style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.02em' }}>
          {astrologer.id || '—'}
        </span>
      </span>
    </div>
  )
}

// Rating cell. The score leads, the review count is quiet underneath. Both come
// straight off the record; a record without either keeps its dash.
function RatingCell({ astrologer }) {
  const rating = getRatingValue(astrologer)
  const reviews = getReviewCount(astrologer)
  return (
    <span className="flex flex-col" style={{ gap: 2 }}>
      <span
        className="inline-flex items-center gap-1.5"
        style={{ fontSize: 13, fontWeight: 650, color: 'var(--ink)', whiteSpace: 'nowrap' }}
      >
        <Star size={14} style={{ color: 'var(--primary)', flex: 'none' }} />
        {rating || <span className="muted" style={{ fontWeight: 500 }}>—</span>}
      </span>
      <span className="muted" style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
        {reviews ? `${reviews} reviews` : 'No review count'}
      </span>
    </span>
  )
}

// Neutral empty state. The two cases stay separate so the copy can say whether the
// platform has no catalog at all, or the current filters exclude them all.
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

export default function AdminAstrologers() {
  const { currentAdmin } = useAdmin()
  const { users } = useAuth()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState('All')
  const [specialization, setSpecialization] = useState('All')

  const allAstrologers = useMemo(() => selectAdminAstrologers(users), [users])

  // Search keeps using the shared selector, so the fields it matches (name, email,
  // phone) stay exactly as they were.
  const searchedAstrologers = useMemo(() => filterAdminAstrologers(users, query), [users, query])

  // Availability and Specialization are applied on top of that result. Both values
  // are compared against the record itself, so a filter can only ever narrow an
  // astrologer that genuinely carries the value.
  const visibleAstrologers = useMemo(
    () => searchedAstrologers.filter((astrologer) => {
      if (availability !== 'All' && String(astrologer.availability || '').trim() !== availability) return false
      if (specialization !== 'All' && String(astrologer.specialization || '').trim() !== specialization) return false
      return true
    }),
    [searchedAstrologers, availability, specialization],
  )

  const availabilityOptions = useMemo(
    () => buildFilterOptions(allAstrologers, (astrologer) => astrologer.availability, AVAILABILITY_PREFERENCE),
    [allAstrologers],
  )
  const specializationOptions = useMemo(
    () => buildFilterOptions(allAstrologers, (astrologer) => astrologer.specialization),
    [allAstrologers],
  )

  const openAstrologer = (astrologerId) => navigate(`${routes.base}/astrologers/${astrologerId}`)

  const totalLabel = `astrologer${allAstrologers.length === 1 ? '' : 's'}`
  const isFiltered =
    query.trim().length > 0 || availability !== 'All' || specialization !== 'All'
  const resultLabel = isFiltered
    ? `Showing ${visibleAstrologers.length} of ${allAstrologers.length} ${totalLabel}`
    : `${allAstrologers.length} ${totalLabel}`

  const adminName = currentAdmin?.name || 'Administrator'
  const adminInitials = adminName.split(' ').map((part) => part[0]).slice(0, 2).join('')

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Astrologers"
        subtitle="Every astrologer profile available on this platform. Review availability, specialisation and rating, then open a profile for the full record."
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
                style={{ flex: '1 1 240px', width: 'auto', minWidth: 0, maxWidth: 400 }}
              >
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, email, or phone"
                  className="text-input search-bar__input"
                  aria-label="Search astrologers"
                  style={{ borderColor: 'var(--border)', fontWeight: 500 }}
                />
                {/* Decorative only: filtering runs live on every keystroke, so this
                    icon carries no action and is never given a handler. */}
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

              {/* Secondary controls: recessed surface, lighter border, smaller type.
                  Both option lists are built from the catalog itself, so each
                  option corresponds to a value at least one astrologer has. */}
              <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
                <label
                  className="muted"
                  htmlFor="admin-astrologer-availability"
                  style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em' }}
                >
                  Availability
                </label>
                <select
                  id="admin-astrologer-availability"
                  className="select-input"
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value)}
                  style={{
                    width: 'auto',
                    minWidth: 132,
                    height: 40,
                    fontSize: 13.5,
                    fontWeight: 500,
                    borderRadius: 8,
                    borderColor: 'var(--surface-border)',
                    background: 'var(--surface-soft)',
                    boxShadow: 'none',
                  }}
                >
                  {availabilityOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
                <label
                  className="muted"
                  htmlFor="admin-astrologer-specialization"
                  style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em' }}
                >
                  Specialisation
                </label>
                <select
                  id="admin-astrologer-specialization"
                  className="select-input"
                  value={specialization}
                  onChange={(event) => setSpecialization(event.target.value)}
                  style={{
                    width: 'auto',
                    minWidth: 168,
                    height: 40,
                    fontSize: 13.5,
                    fontWeight: 500,
                    borderRadius: 8,
                    borderColor: 'var(--surface-border)',
                    background: 'var(--surface-soft)',
                    boxShadow: 'none',
                  }}
                >
                  {specializationOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <span
              className="muted"
              style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}
              aria-live="polite"
            >
              {resultLabel}
            </span>
          </div>

          <div aria-hidden="true" style={{ height: 1, background: 'var(--divider)' }} />

          {allAstrologers.length === 0 ? (
            <EmptyState
              icon={UserRound}
              title="No astrologers on record"
              note="The platform has no astrologer catalog entry, so there is nothing to list."
            />
          ) : visibleAstrologers.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No astrologers match your filters"
              note="No catalog entry matches the current search text, availability or specialisation."
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr style={{ background: 'var(--surface-soft)' }}>
                    <th style={{ width: '27%', color: 'var(--muted)', letterSpacing: '0.06em' }}>Astrologer</th>
                    <th style={{ width: '16%', color: 'var(--muted)', letterSpacing: '0.06em' }}>Specialisation</th>
                    <th style={{ width: '11%', color: 'var(--muted)', letterSpacing: '0.06em' }}>Experience</th>
                    <th style={{ width: '14%', color: 'var(--muted)', letterSpacing: '0.06em' }}>Rating</th>
                    <th style={{ width: '12%', color: 'var(--muted)', letterSpacing: '0.06em' }}>Availability</th>
                    <th style={{ width: '11%', color: 'var(--muted)', letterSpacing: '0.06em', textAlign: 'right' }}>
                      Consultation
                    </th>
                    <th style={{ width: '9%', color: 'var(--muted)', letterSpacing: '0.06em', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAstrologers.map((astrologer, index) => {
                    const status = getAstrologerStatus(astrologer)
                    const rate = getConsultationRate(astrologer)
                    return (
                      // The index is part of the key because the catalog currently
                      // carries one repeated id (two records both use
                      // 'astrologer-13'), which would otherwise collide here. Both
                      // records are still listed; the catalog itself is not touched
                      // here. Note that the existing findAdminAstrologer lookup
                      // matches by id, so View opens the first of the two.
                      <tr key={`${astrologer.id}-${index}`}>
                        <td style={CELL}>
                          <AstrologerIdentity
                            astrologer={astrologer}
                            tone={AVATAR_TONES[index % AVATAR_TONES.length]}
                          />
                        </td>
                        <td style={{ ...CELL, color: 'var(--body)', fontSize: 13 }}>
                          {astrologer.specialization || <span className="muted">Not available</span>}
                        </td>
                        <td className="muted" style={{ ...CELL, fontSize: 12.5, whiteSpace: 'nowrap' }}>
                          {astrologer.experience || '—'}
                        </td>
                        <td style={CELL}>
                          <RatingCell astrologer={astrologer} />
                        </td>
                        <td style={{ ...CELL, whiteSpace: 'nowrap' }}>
                          {status
                            ? <StatusBadge label={status} />
                            : <span className="muted" style={{ fontSize: 12.5 }}>Not available</span>}
                        </td>
                        <td
                          className={rate ? '' : 'muted'}
                          style={{ ...CELL, fontSize: 12.5, textAlign: 'right', whiteSpace: 'nowrap' }}
                        >
                          {rate || 'Not available'}
                        </td>
                        <td style={{ ...CELL, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {/* Same button system and handler as before, still opening the
                              existing detail route. The base border is softened so the
                              row action stays quiet. */}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openAstrologer(astrologer.id)}
                            aria-label={`View ${astrologer.name || 'astrologer'}`}
                            style={{ borderWidth: 1, borderColor: 'var(--surface-border)', fontWeight: 600 }}
                          >
                            <Eye size={15} /> View
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>

      {/* Compact neutral footnote. These are real limitations of the current
          astrologer model, so they are stated rather than papered over. */}
      <Card
        style={{ ...PANEL, background: 'var(--surface-soft)', padding: '14px 16px', marginTop: 14 }}
        className="flex gap-3"
      >
        <Info size={17} style={{ color: 'var(--muted)', flex: 'none', marginTop: 1 }} />
        <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
          Availability is availability, not an account status: it is the Online or Offline value the
          catalog records, and it is deliberately not presented as Active, Suspended, Blocked or
          Verified. There is no verification or document model for astrologers on this build, so no
          verification state is shown or implied. Email and phone are read from the astrologer
          account and therefore appear only for astrologers who have an account on this device;
          consultation rate is recorded on some entries only and is left blank where it is not on
          the record. Nothing on this page can change any of these values.
        </p>
      </Card>
    </div>
  )
}