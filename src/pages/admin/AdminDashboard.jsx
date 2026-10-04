import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  PauseCircle,
  Phone,
  RotateCcw,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useEditor } from '../../state/EditorContext.jsx'
import { useAdmin } from '../../state/AdminContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { selectCustomerUsers, formatDisplayDate } from '../../utils/adminUsers.js'
import { selectAdminAstrologers } from '../../utils/adminAstrologers.js'
import { selectAdminDisputes } from '../../utils/adminDisputes.js'
import { selectAdminContent } from '../../utils/adminContent.js'
import { summariseReports } from '../../utils/adminReports.js'
import { mergeActivity, summariseApprovals } from '../../utils/adminAudit.js'
import {
  ANSWER_WINDOW_DAYS,
  ASTROLOGER_INACTIVITY_DAYS,
  DEADLINE_WARNING_DAYS,
  DISPUTE_RESPONSE_WINDOW_DAYS,
} from '../../utils/paymentRules.js'
import { summariseCompliance } from '../../utils/adminCompliance.js'

// Admin -> Platform Admin Dashboard.
//
// Visual refinement only. Every figure rendered here is a live count of records
// the app already stores, read through the same selectors the individual admin
// modules use. Nothing is seeded, estimated or hardcoded here, and the data
// architecture is unchanged from the previous version of this page.
//
// Where a module has no admin-readable data source yet (assistants, instant
// call, instant chat) the card shows a neutral "—" placeholder and an explicit
// "Not connected" note, rather than a fabricated figure.

const ADMIN_BASE = getRoleRoutes(ROLES.ADMIN).base

const NOT_CONNECTED = 'Not connected'

// Rows kept per Operations panel. Any statuses beyond this are counted in a
// muted footnote rather than dropped silently.
const OPERATION_ROW_LIMIT = 5

// Upper bound on how many distinct activity types the feed shows at once.
const ACTIVITY_LIMIT = 6

// One shared surface treatment so every panel reads as the same component.
// Uses the existing theme tokens so light and dark stay in sync.
const PANEL = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--radius-m)',
  boxShadow: 'var(--shadow-xs)',
}

const RAISED_PANEL = { ...PANEL, background: 'var(--surface-strong)' }

// Typographic scale. Metric figures are the loudest element on a card, then the
// label, then the caption. Weights stay at two levels (700 for figures and
// titles, 650 for labels) so nothing looks over-emboldened.
const NUMBER_TEXT = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 38,
  fontWeight: 700,
  letterSpacing: '-0.03em',
  lineHeight: 1.05,
  // Figures share a width so a column of counts reads as one block.
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--text-primary)',
}

const LABEL_TEXT = { fontSize: 13, fontWeight: 650, letterSpacing: '-0.005em', color: 'var(--ink)' }

const NAME_TEXT = { fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)' }

const CAPTION_TEXT = { fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-secondary)' }

const FOOTER_RULE = { borderTop: '1px solid var(--divider)' }

function countByStatus(rows, status) {
  const target = status.toLowerCase()
  return rows.filter((row) => String(row.status || '').trim().toLowerCase() === target).length
}

// Small square icon tile, sized down from the shared .stat-icon so tiles read as
// accents rather than as the main content of the card. The inner ring is derived
// from the tile's own tone via currentColor, so it follows the theme automatically
// and never needs a hardcoded colour.
function IconTile({ icon: Icon, tone, size = 38 }) {
  return (
    <span
      aria-hidden="true"
      className={`stat-icon tone-${tone}`}
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-s)',
        flex: 'none',
        boxShadow: 'inset 0 0 0 1px color-mix(in srgb, currentColor 16%, transparent)',
      }}
    >
      <Icon size={size >= 40 ? 20 : 18} />
    </span>
  )
}

// The only navigation affordance on this page: a quiet text link that appears
// solely when a real admin route exists for the target module.
function OpenLink({ to, label = 'Open' }) {
  if (!to) return null
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]"
      style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', flex: 'none' }}
    >
      {label}
      <ArrowUpRight size={14} />
    </Link>
  )
}

function NeutralChip({ children }) {
  return (
    <span
      className="badge"
      style={{ background: 'var(--neutral-bg)', color: 'var(--muted)', fontSize: 11.5 }}
    >
      {children}
    </span>
  )
}

// People: one number per group, with the supporting line demoted to a caption.
//
// Each role gets its own identity from the existing theme tokens only, so the
// three cards read as one family that is individually recognisable:
//   wash   — a faint tint of the role colour mixed into the shared surface
//   accent — a 3px tick in the role's stronger colour
//   tone   — drives the soft icon tile (and its currentColor ring)
// Nothing here is a gradient, nothing is a hardcoded hex, and both parts are
// theme variables, so light and dark stay correct automatically.
//
// No hover lift on purpose: `.card` is an unlayered rule and the border comes
// from an inline shorthand, so hover utilities cannot reach these panels and the
// existing `.card-hover` pattern would add a misleading pointer cursor to a card
// that is not itself clickable.
function PeopleCard({ icon: Icon, tone, wash, accent, label, value, hint, to, muted }) {
  return (
    <Card
      style={{
        ...PANEL,
        background: `color-mix(in srgb, var(${wash}) 26%, var(--surface))`,
        padding: 18,
      }}
      className="relative flex h-full flex-col gap-2.5"
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 18,
          width: 36,
          height: 3,
          borderRadius: 'var(--radius-pill)',
          background: `var(${accent})`,
          opacity: 0.85,
        }}
      />
      <div className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
        <IconTile icon={Icon} tone={tone} size={36} />
        <span style={LABEL_TEXT}>{label}</span>
      </div>
      <div style={{ ...NUMBER_TEXT, color: muted ? 'var(--muted)' : 'var(--text-primary)' }}>
        {value}
      </div>
      <p style={{ ...CAPTION_TEXT, margin: 0 }}>{hint}</p>
      <div
        className="flex items-center justify-between gap-3"
        style={{ ...FOOTER_RULE, marginTop: 'auto', paddingTop: 12 }}
      >
        {to ? <OpenLink to={to} /> : <NeutralChip>{NOT_CONNECTED}</NeutralChip>}
      </div>
    </Card>
  )
}

// Platform Services: the same information, weighted as the primary metrics of
// the platform. Each service gets a distinct tone family so the four cards are
// individually identifiable at a glance. Unconnected services keep an identical
// structure so the row stays even, but the tile and figure are neutralised to
// signal "no data yet" without inventing a metric.
function ServiceCard({ icon: Icon, tone, label, value, note, to, muted }) {
  return (
    <Card style={{ ...RAISED_PANEL, padding: 20 }} className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
        <IconTile icon={Icon} tone={muted ? 'neutral' : tone} size={42} />
        <span style={NAME_TEXT}>{label}</span>
      </div>
      <div
        style={{ ...NUMBER_TEXT, fontSize: muted ? 32 : 40, color: muted ? 'var(--muted)' : 'var(--text-primary)' }}
      >
        {value}
      </div>
      <p style={{ ...CAPTION_TEXT, margin: 0 }}>{note}</p>
      <div
        className="flex items-center justify-between gap-3"
        style={{ ...FOOTER_RULE, marginTop: 'auto', paddingTop: 12 }}
      >
        {to ? <OpenLink to={to} /> : <NeutralChip>{NOT_CONNECTED}</NeutralChip>}
      </div>
    </Card>
  )
}

// Operations: a proportional status breakdown rather than a list of totals.
// The overall total is intentionally not repeated here — it already leads the
// matching card in Platform Services. Bar widths are each status' share of the
// panel total, which is the same number the service card displays.
function OperationsPanel({ title, icon: Icon, accent, total, rows, to }) {
  const visible = rows.slice(0, OPERATION_ROW_LIMIT)
  const overflow = rows.length - visible.length

  return (
    <Card style={{ ...PANEL, padding: 18 }} className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
          <IconTile icon={Icon} tone="neutral" size={34} />
          <span style={LABEL_TEXT}>{title}</span>
        </span>
        <OpenLink to={to} label="View all" />
      </div>

      {visible.length === 0 ? (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>No records found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((row) => {
            const share = total > 0 ? Math.max((row.count / total) * 100, row.count > 0 ? 4 : 0) : 0
            return (
              <div key={row.label}>
                <div className="flex items-center justify-between gap-3" style={{ marginBottom: 6 }}>
                  <StatusBadge label={row.label} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{row.count}</span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--surface-soft)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${share}%`,
                      borderRadius: 'var(--radius-pill)',
                      background: accent,
                      transition: 'width 200ms var(--ease-premium)',
                    }}
                  />
                </div>
              </div>
            )
          })}
          {overflow > 0 && (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              +{overflow} further status{overflow === 1 ? '' : 'es'} in the full report.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

// One actionable exception, shaped as Issue -> Count -> Admin action. The count is
// always an aggregate: individual questions are listed in Questions Management,
// never on this page.
function AttentionRow({ icon: Icon, tone, label, note, count, to, action = 'Review' }) {
  return (
    <div className="flex items-center gap-3" style={{ padding: '13px 18px', borderTop: '1px solid var(--divider)' }}>
      <IconTile icon={Icon} tone={tone} size={34} />
      <span className="flex flex-col" style={{ minWidth: 0, flex: 1, gap: 2 }}>
        <span style={LABEL_TEXT}>{label}</span>
        <span className="muted" style={{ fontSize: 12, lineHeight: 1.4 }}>{note}</span>
      </span>
      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, flex: 'none' }}>
        {count}
      </span>
      <OpenLink to={to} label={action} />
    </div>
  )
}

// Needs Attention lists only admin-actionable exceptions, never the normal
// workload. Categories at zero are omitted so the queue is never zero-heavy, and
// when nothing is actionable the card shows a calm neutral state instead.
//
// `unavailable` names a category that cannot be derived from the data model at
// all. It is disclosed in a footnote rather than rendered as a row, so a missing
// capability never looks like an empty queue and never carries a made-up count.
function AttentionCard({ items, unavailable }) {
  const actionable = items.filter((item) => item.count > 0)
  const hasUnavailable = Array.isArray(unavailable) && unavailable.length > 0

  return (
    <Card
      style={{ ...PANEL, padding: 0, overflow: 'hidden', borderLeft: '3px solid var(--warning)' }}
      className="flex h-full flex-col"
    >
      <div style={{ padding: '14px 18px 13px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Action queue</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          Exceptions a platform administrator needs to resolve
        </div>
      </div>

      {actionable.length === 0 ? (
        <div
          className="flex flex-1 flex-col items-center justify-center"
          style={{ gap: 8, padding: '28px 18px', textAlign: 'center' }}
        >
          <IconTile icon={CheckCircle2} tone="green" size={38} />
          <span style={LABEL_TEXT}>All clear</span>
          <span className="muted" style={{ fontSize: 12, maxWidth: 280 }}>
            No admin action is currently required.
          </span>
        </div>
      ) : (
        actionable.map((item) => <AttentionRow key={item.label} {...item} />)
      )}

      {hasUnavailable && (
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--divider)' }}>
          {unavailable.map((item) => (
            <p key={item.label} className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 650, color: 'var(--ink)' }}>{item.label}</span>
              {' — '}
              {item.reason}
            </p>
          ))}
        </div>
      )}
    </Card>
  )
}

// Collapses repeats of the same activity type into a single row, so one
// high-frequency event (question views, for example) cannot fill the whole
// feed. Nothing is invented or re-labelled: the newest record of each type is
// shown as-is, and `repeats` is a count of the other real records of that type.
function groupActivityByType(entries) {
  const groups = []
  const seen = new Map()

  // mergeActivity() returns newest first, so the first record seen for a type is
  // also the most recent one.
  for (const entry of entries) {
    const key = [entry.source, entry.type || entry.module || '', String(entry.action || '').trim().toLowerCase()].join('|')
    const existing = seen.get(key)
    if (existing) {
      existing.repeats += 1
      continue
    }
    const group = { ...entry, key, repeats: 0 }
    seen.set(key, group)
    groups.push(group)
  }

  return groups
}

function ActivityFeed({ groups, totalRecords }) {
  if (groups.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ gap: 8, padding: '26px 18px', textAlign: 'center' }}
      >
        <IconTile icon={History} tone="neutral" size={38} />
        <span style={LABEL_TEXT}>No activity recorded yet</span>
        <span className="muted" style={{ fontSize: 12, maxWidth: 340 }}>
          Actions taken in the platform, editor and astrologer workspaces appear here as they
          are logged.
        </span>
      </div>
    )
  }

  const repeats = totalRecords - groups.length
  const unlistedTypes = groups.length - Math.min(groups.length, ACTIVITY_LIMIT)

  return (
    <div>
      <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {groups.slice(0, ACTIVITY_LIMIT).map((group) => (
          <li
            key={group.key}
            className="flex gap-3.5"
            style={{ padding: '12px 2px', borderTop: '1px solid var(--divider)', alignItems: 'flex-start' }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--primary-light)',
                marginTop: 7,
                flex: 'none',
              }}
            />
            <span className="flex flex-col" style={{ minWidth: 0, flex: 1, gap: 2 }}>
              <span className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--ink)' }}>
                  {group.action || '—'}
                </span>
                {group.repeats > 0 && (
                  <span
                    className="badge"
                    style={{ background: 'var(--neutral-bg)', color: 'var(--muted)', fontSize: 11, padding: '2px 8px' }}
                  >
                    +{group.repeats} earlier
                  </span>
                )}
              </span>
              <span className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
                {[group.module || group.kind, group.actor, group.details].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="muted" style={{ fontSize: 12, flex: 'none', whiteSpace: 'nowrap' }}>
              {formatDisplayDate(group.occurredAt)}
            </span>
          </li>
        ))}
      </ul>

      {(repeats > 0 || unlistedTypes > 0) && (
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 12 }}>
          {[
            repeats > 0
              ? `${repeats} repeated record${repeats === 1 ? '' : 's'} of the types above ${repeats === 1 ? 'is' : 'are'} grouped.`
              : '',
            unlistedTypes > 0
              ? `${unlistedTypes} further activity type${unlistedTypes === 1 ? '' : 's'} not shown.`
              : '',
          ].filter(Boolean).join(' ')}
        </p>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { currentAdmin, audit: adminAudit } = useAdmin()
  const { users } = useAuth()
  const { appointments, questions, astrologerPosts, activityLog } = useAppData()
  const { audit: editorAudit, approvals } = useEditor()

  // The same report object AdminReports builds, so the dashboard and the reports
  // module can never disagree about a count.
  const reports = useMemo(() => summariseReports({
    customerUsers: selectCustomerUsers(users),
    astrologers: selectAdminAstrologers(users),
    appointments,
    questions,
    disputes: selectAdminDisputes(questions),
    posts: selectAdminContent(astrologerPosts),
  }), [users, appointments, questions, astrologerPosts])

  const disputes = useMemo(() => selectAdminDisputes(questions), [questions])

  // The astrologer catalog records, needed for dormancy. Kept separate from
  // reports.astrologers, which is the Reports summary rather than the records.
  const astrologers = useMemo(() => selectAdminAstrologers(users), [users])

  // The same merged activity log AdminAudit displays, built from the three logs
  // the app already writes. mergeActivity() gates the admin source through
  // isAdminActivity(), so nothing is presented as an admin action unless the
  // record really is one.
  const mergedActivity = useMemo(
    () => mergeActivity(editorAudit, activityLog, adminAudit),
    [editorAudit, activityLog, adminAudit],
  )
  const activityGroups = useMemo(() => groupActivityByType(mergedActivity), [mergedActivity])
  const approvalsSummary = useMemo(() => summariseApprovals(approvals), [approvals])

  // The compliance snapshot: 30-day answer windows, 7-day dispute windows, refunds
  // awaiting settlement, held/disputed money and dormant astrologers. Every figure
  // is summed from records that exist right now by utils/adminCompliance.js — none
  // is estimated, and the same selectors back the dispute and astrologer pages.
  //
  // astrologers is passed as the list, not reports.astrologers: that key holds the
  // Reports summary counts, while dormancy needs the records themselves.
  //
  // Declared BEFORE questionExceptions, which reads it. Both are `const`, so reading
  // complianceRows first would throw a temporal-dead-zone ReferenceError and take the
  // whole admin shell down with it.
  const complianceRows = useMemo(
    () => summariseCompliance({ questions, astrologers, activityLog }),
    [questions, astrologers, activityLog],
  )
  const compliance = complianceRows

  // Aggregate exception counts only — no question record is read out for display
  // here, so the cost of this section does not grow with question volume. The same
  // selectors that back the dispute and astrologer pages drive these figures.
  const questionExceptions = useMemo(() => ({
    dueSoon: complianceRows.dueSoonQuestions.length,
    overdue: complianceRows.overdueQuestions.length,
  }), [complianceRows])

  // Admin-actionable exceptions, most urgent first. Routes are the existing
  // management pages: Questions Management for question exceptions, Disputes
  // Management for disputes. No new route is introduced.
  const attentionItems = [
    {
      icon: AlertTriangle,
      tone: 'red',
      label: 'Overdue questions',
      note: `Past the ${ANSWER_WINDOW_DAYS}-day response window with no answer — the automatic expiry or refund did not complete`,
      count: questionExceptions.overdue,
      to: `${ADMIN_BASE}/text-based-questions`,
    },
    {
      icon: Clock,
      tone: 'amber',
      label: 'Questions due soon',
      note: `Unanswered with ${DEADLINE_WARNING_DAYS} days or less left on the ${ANSWER_WINDOW_DAYS}-day response window`,
      count: questionExceptions.dueSoon,
      to: `${ADMIN_BASE}/text-based-questions`,
    },
    {
      icon: Megaphone,
      tone: 'red',
      label: 'Open disputes',
      note: 'Raised by a user against an astrologer and awaiting a decision',
      count: countByStatus(disputes, 'open'),
      to: `${ADMIN_BASE}/disputes`,
    },
    {
      // An overdue dispute has passed its 7-day response window. It is flagged, not
      // decided: the amount stays held and no side is awarded.
      icon: AlertTriangle,
      tone: 'red',
      label: 'Overdue disputes',
      note: `No astrologer response within ${DISPUTE_RESPONSE_WINDOW_DAYS} days — admin review required, nothing awarded yet`,
      count: compliance.overdueDisputes.length,
      to: `${ADMIN_BASE}/disputes`,
    },
    {
      icon: RotateCcw,
      tone: 'amber',
      label: 'Refunds pending',
      note: 'Expired or dispute-refunded questions whose refund has not settled to the customer yet',
      count: compliance.pendingRefunds.count,
      to: `${ADMIN_BASE}/text-based-questions`,
    },
    {
      icon: PauseCircle,
      tone: 'neutral',
      label: 'Dormant astrologers',
      note: compliance.unknownActivityAstrologers > 0
        ? `No astrologer-side activity for ${ASTROLOGER_INACTIVITY_DAYS}+ days. ${compliance.unknownActivityAstrologers} more have no activity data at all and are not counted.`
        : `No astrologer-side activity for ${ASTROLOGER_INACTIVITY_DAYS}+ days`,
      count: compliance.dormantAstrologerCount,
      to: `${ADMIN_BASE}/astrologers`,
    },
  ]

  // Money currently withheld from astrologers, summed from the questions store. Held
  // and disputed amounts are reported apart from refund-pending money, which is
  // already spoken for and on its way back to a customer.
  const heldTotals = [
    {
      label: 'Held for astrologers',
      amount: compliance.heldAmounts.held,
      note: 'Answered or in progress and not yet released',
    },
    {
      label: 'Held in dispute',
      amount: compliance.heldAmounts.disputed,
      note: 'Withheld until a dispute is actually resolved',
    },
    {
      label: 'Refund pending',
      amount: compliance.pendingRefunds.amount,
      note: 'Owed back to customers, awaiting settlement',
    },
  ]

  // Categories the data model cannot support. Disclosed rather than counted, so a
  // missing capability never renders as a real figure.
  const unavailableAttention = [
    {
      label: 'Pending content approvals',
      reason:
        `${approvalsSummary.pending} awaiting review in the editor workspace. Not surfaced here as an `
        + 'exception, because that queue belongs to the astrologer rather than the platform.',
    },
    {
      label: 'Escrowed funds',
      reason:
        'this build has no escrow facility. Amounts marked held are held inside the local wallet and question '
        + 'records only, and no money is transferred anywhere by the platform.',
    },
  ]

  const adminName = currentAdmin?.name || 'Administrator'
  const adminInitials = adminName.split(' ').map((part) => part[0]).slice(0, 2).join('')

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Platform Dashboard"
        subtitle="Overview of your AstroConnect platform"
        actions={(
          <div
            className="flex items-center gap-2.5"
            style={{
              padding: '8px 14px 8px 8px',
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

      <Section title="People" icon={Users}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PeopleCard
            icon={Users}
            tone="violet"
            wash="--primary-bg"
            accent="--primary"
            label="Users"
            value={reports.users.total}
            hint="Registered user accounts on the platform"
            to={`${ADMIN_BASE}/users`}
          />
          <PeopleCard
            icon={UserRound}
            tone="amber"
            wash="--warning-bg"
            accent="--amber-600"
            label="Astrologers"
            value={reports.astrologers.total}
            hint="Profiles listed in the astrologer catalogue"
            to={`${ADMIN_BASE}/astrologers`}
          />
          <PeopleCard
            icon={ShieldCheck}
            tone="teal"
            wash="--success-bg"
            accent="--green-600"
            label="Assistants"
            value="—"
            hint="No platform-wide assistant directory is connected yet"
            muted
          />
        </div>
      </Section>

      <Section title="Platform Services" icon={LayoutGrid}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ServiceCard
            icon={MessageCircle}
            tone="sky"
            label="Text-Based Questions"
            value={reports.questions.total}
            note="Questions raised by users and their live status mix"
            to={`${ADMIN_BASE}/text-based-questions`}
          />
          <ServiceCard
            icon={CalendarDays}
            tone="green"
            label="Appointments"
            value={reports.appointments.total}
            note="Booked, confirmed, completed and cancelled slots"
            to={`${ADMIN_BASE}/appointments`}
          />
          <ServiceCard
            icon={Phone}
            tone="amber"
            label="Instant Call"
            value="—"
            note="Session records for this service are not connected to the admin workspace"
            muted
          />
          <ServiceCard
            icon={MessagesSquare}
            tone="secondary"
            label="Instant Chat"
            value="—"
            note="Session records for this service are not connected to the admin workspace"
            muted
          />
        </div>
      </Section>

      {/* Two equal panels across the full content width, so both the left and
          the right edge line up with every other section on the page. */}
      <Section title="Operations" icon={ShieldCheck}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OperationsPanel
            title="Questions"
            icon={MessageCircle}
            accent="var(--primary)"
            total={reports.questions.total}
            rows={reports.questions.breakdown.rows}
            to={`${ADMIN_BASE}/text-based-questions`}
          />
          <OperationsPanel
            title="Appointments"
            icon={CalendarDays}
            accent="var(--sky-600)"
            total={reports.appointments.total}
            rows={reports.appointments.breakdown.rows}
            to={`${ADMIN_BASE}/appointments`}
          />
        </div>
      </Section>

      {/* Its own section, so the heading sits on the same left edge as every
          other section heading rather than inside the Operations grid. */}
      <Section title="Needs Attention" icon={Megaphone}>
        <AttentionCard items={attentionItems} unavailable={unavailableAttention} />
      </Section>

      {/* Money currently withheld, summed from the questions store by
          utils/adminCompliance.js. Held and disputed amounts are kept apart from
          refund-pending money, which is already owed back to a customer rather than
          being withheld from anyone. Every row is a real sum over real records; a
          zero is a genuine zero, and the escrow limitation is restated here so the
          word "held" is never read as a regulated fund. */}
      <Section title="Held &amp; Disputed Amounts" icon={Wallet}>
        <Card style={{ ...PANEL, padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 1,
              background: 'var(--divider)',
            }}
          >
            {heldTotals.map((row) => (
              <div key={row.label} style={{ padding: '16px 18px', background: 'var(--surface)' }}>
                <div className="muted" style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.03em' }}>
                  {row.label}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--ink)',
                  }}
                >
                  ₹{row.amount.toLocaleString('en-IN')}
                </div>
                <div className="muted" style={{ marginTop: 4, fontSize: 11.5, lineHeight: 1.45 }}>
                  {row.note}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Recent Activity" icon={Activity}>
        <Card style={{ ...PANEL, padding: 18 }}>
          <ActivityFeed groups={activityGroups} totalRecords={mergedActivity.length} />
        </Card>
      </Section>
    </div>
  )
}