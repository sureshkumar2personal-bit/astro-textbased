import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Gavel,
  Globe,
  MessageCircle,
  MessagesSquare,
  Phone,
  Radio,
  Receipt,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Star,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { useAdmin } from '../../state/AdminContext.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { findAdminAstrologer, getAstrologerStatus } from '../../utils/adminAstrologers.js'
import { getQuestionAskedAt } from '../../utils/adminQuestions.js'
import { getAppointmentDate, getAppointmentTime } from '../../utils/adminAppointments.js'
import { getDisputeId } from '../../utils/adminDisputes.js'
import { selectAdminContent, getContentVisibility } from '../../utils/adminContent.js'
import { formatDisplayDate, getUserAccountStatus } from '../../utils/adminUsers.js'
import { parseDisplayDate, sortByDateDesc } from '../../utils/date.js'

// Admin -> Astrologer details.
//
// The identity and every stored figure still come from the existing selector
// (findAdminAstrologer) and the existing catalog. Relationships are read from the
// same shared stores the rest of the admin workspace reads, matched on the
// `astrologerId` field those records already carry:
//
//   questions.astrologerId            Text-Based Questions, Disputes (question.dispute)
//   appointments.astrologerId         Appointments
//   consultationHistory.astrologerId  Instant Calls and Instant Chats (split by .type)
//   subscriptions.astrologerId        Subscriptions
//   astrologerPosts.astrologerId      Content / Posts
//   astrologerLiveSessions.astrologerId  Live Sessions
//
// No selector, store, seed or relationship is modified here, and nothing is written
// anywhere. Two sources are reported as unavailable rather than as zero, because the
// model genuinely cannot attribute them to one astrologer:
//
//   * astrologerWallet is a single shared wallet with no astrologerId on its ledger.
//   * Review records carry no astrologer reference (selectAdminReviews sets
//     astrologerName to '' for exactly this reason).
//
// The one figure that IS real for every astrologer is the catalog's own `followers`
// number, which is why the summary reports it directly.
//
// There are no admin actions on this page: no approve, verify, suspend, block or
// edit action exists anywhere in the admin codebase for an astrologer, so none is
// offered here rather than a dead control.

const PANEL = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--radius-m)',
  boxShadow: 'var(--shadow-xs)',
}

const RAISED_PANEL = { ...PANEL, background: 'var(--surface-strong)' }

const CAPTION = { fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }

// Sources the astrologer model cannot attribute to a single astrologer. Declared once
// so the summary tile and the section below it can never disagree.
const UNAVAILABLE_SOURCES = {
  earnings: 'Earnings sit in one shared astrologer wallet whose ledger entries carry no astrologer reference.',
  reviews: 'Review records carry no astrologer reference, so none can be matched to this astrologer.',
  followers: 'The app keeps no per-follower records, so the follower identities behind the catalog count cannot be listed.',
}

// How many records each section previews. The heading always shows the real total, so
// a truncated preview never hides how much exists. This is a display cap only — it is
// not pagination, and no record is dropped from the data.
const PREVIEW_LIMIT = 3

function previewOverflow(total) {
  if (total <= PREVIEW_LIMIT) return null
  const hidden = total - PREVIEW_LIMIT
  return `+${hidden} more record${hidden === 1 ? '' : 's'}`
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return `${first}${last}`.toUpperCase()
}

// Rating and review volume are stored as display strings ('4.9 / 5', '2,345
// reviews'). Only the leading number is lifted out for a compact figure; the string is
// never replaced by a guess, and a record without one reports null.
function getRatingValue(astrologer) {
  const match = String(astrologer?.rating || '').match(/\d+(?:\.\d+)?/)
  return match ? match[0] : null
}

function getReviewCount(astrologer) {
  const match = String(astrologer?.reviews || '').match(/[\d,.]+/)
  return match ? match[0] : null
}

// Consultation rate is recorded as a bare per-minute number on only some catalog
// entries. The app's own convention for a present rate is rupees per minute (see
// components/AstrologerCard.jsx), so that convention is reused here. A missing rate
// stays missing: unlike AstrologerCard, this page does not derive a rate from
// experience, because an invented price in an admin view is worse than an honest
// blank.
function getConsultationRate(astrologer) {
  const rate = astrologer?.consultationRate
  if (rate === undefined || rate === null || rate === '') return null
  return `₹${rate}/min`
}

function formatCount(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return number.toLocaleString('en-IN')
}

function IconTile({ icon: Icon, tone, size = 34 }) {
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
      <Icon size={size >= 44 ? 22 : 17} />
    </span>
  )
}

// A short accent rule in a section's own colour, plus a barely-there tint of the same
// hue over the panel. Both are derived from the theme's own variables, so light and
// dark mode stay correct and nothing is hardcoded.
function AccentPanel({ accent, wash, children }) {
  return (
    <Card style={{ ...PANEL, padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '20px 22px 22px',
          background: wash ? `color-mix(in srgb, var(${wash}) 45%, var(--surface))` : undefined,
        }}
      >
        {accent && (
          <span
            aria-hidden="true"
            style={{
              display: 'block',
              width: 40,
              height: 3,
              borderRadius: 'var(--radius-pill)',
              background: `var(${accent})`,
              marginBottom: 18,
            }}
          />
        )}
        {children}
      </div>
    </Card>
  )
}

// Aligned information grid: two columns on desktop, one on mobile. Every field is
// label-over-value with identical spacing, so a group of them reads as one block
// rather than as separate boxes. `wide` lets a single field span the full row, which
// is how Bio is set on desktop.
function InfoGrid({ fields }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className={field.wide ? 'sm:col-span-2' : ''} style={{ minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.03em' }}>
            {field.label}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13.5,
              fontWeight: 500,
              color: 'var(--ink)',
              overflowWrap: 'anywhere',
            }}
          >
            {field.value || '—'}
          </div>
        </div>
      ))}
    </div>
  )
}

// One figure in the admin summary. `available: false` renders a dash plus the reason,
// so a missing data source can never be misread as a genuine zero. `demo` marks a
// figure or row set that comes from this page's presentation fallback, which is always
// visibly flagged. `to` is set only where an admin management route already exists in
// App.jsx; there is no route for instant calls, instant chats or followers, so those
// tiles are not links and no destination is invented.
function SummaryTile({ icon: Icon, tone, label, count, available = true, note, to, demo }) {
  const showsFigure = available || demo

  const tile = (
    <div
      className={[
        'flex h-full min-w-0 flex-col',
        available
          ? 'border border-[color:var(--divider)] bg-[color:var(--surface-soft)]'
          : 'border border-dashed border-[color:var(--surface-border)] bg-transparent',
        to ? 'group-hover:border-[color:var(--border)] group-hover:shadow-[var(--shadow-sm)]' : '',
      ].filter(Boolean).join(' ')}
      style={{ gap: 10, padding: 14, borderRadius: 'var(--radius-s)' }}
    >
      <span className="flex items-center gap-2">
        <IconTile icon={Icon} tone={available ? tone : 'neutral'} size={30} />
        <span className="muted" style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em' }}>
          {label}
        </span>
        {demo && (
          <span
            className="badge"
            title={note}
            style={{
              background: 'var(--neutral-bg)',
              color: 'var(--muted)',
              fontSize: 10.5,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Demo
          </span>
        )}
      </span>
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
          fontVariantNumeric: 'tabular-nums',
          color: showsFigure ? 'var(--text-primary)' : 'var(--muted)',
        }}
      >
        {showsFigure ? count : '—'}
      </span>
      {!showsFigure && (
        <span className="muted" style={{ ...CAPTION, fontSize: 11.5 }}>{note}</span>
      )}
    </div>
  )

  if (!to) return tile

  return (
    <Link
      to={to}
      className="block h-full cursor-pointer rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]"
      style={{ textDecoration: 'none' }}
      aria-label={`Open ${label} management`}
    >
      {tile}
    </Link>
  )
}

// One full-width section: heading, then a comfortable panel led by a small icon tile
// in the service's own colour and a count badge tinted to match. `to` is passed only
// when records exist, so an empty or unavailable section never offers a dead
// destination.
function RecordSection({ icon: Icon, tone = 'neutral', title, count, to, children, accent, note, demo }) {
  return (
    <Section title={title} icon={Icon}>
      <Card
        style={{
          ...PANEL,
          padding: 0,
          overflow: 'hidden',
          // Only applied while a dispute is genuinely unresolved, and read from
          // whichever rows are on screen so the accent always matches the display.
          ...(accent ? { borderLeft: accent } : null),
        }}
      >
        <div className="flex items-center justify-between gap-3" style={{ padding: '13px 22px 12px' }}>
          <IconTile icon={Icon} tone={tone} size={30} />
          <span className="flex items-center gap-2" style={{ flex: 'none' }}>
            {demo && (
              <span
                className="badge"
                style={{
                  background: 'var(--neutral-bg)',
                  color: 'var(--muted)',
                  fontSize: 10.5,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Demo
              </span>
            )}
            <span className={`badge tone-${tone}`} style={{ fontSize: 11.5 }}>{count}</span>
          </span>
        </div>

        <div aria-hidden="true" style={{ height: 1, background: 'var(--divider)' }} />

        <div style={{ padding: '2px 22px 0' }}>{children}</div>

        {note && (
          <p className="muted" style={{ margin: 0, padding: '0 22px 16px', fontSize: 12, lineHeight: 1.55 }}>
            {note}
          </p>
        )}

        {to && (
          <div style={{ padding: '13px 22px', borderTop: '1px solid var(--divider)' }}>
            <Link
              to={to}
              className="inline-flex items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]"
              style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}
            >
              View more
              <ChevronRight size={14} />
            </Link>
          </div>
        )}
      </Card>
    </Section>
  )
}

// Individual records get their own accent, rotating through this list so consecutive
// rows inside a section are always distinguishable. Each entry is an existing .tone-*
// class, which supplies both the tile background and its foreground from the theme.
const RECORD_ACCENTS = ['violet', 'sky', 'teal', 'gold', 'rose']

// Matching per-record background wash, in the same order as RECORD_ACCENTS so a row's
// tile and its background always belong to the same colour family. --gold-100 is
// deliberately not used: it is the one warm tint the dark theme does not redefine, and
// because a row tint covers the whole row it would read as a pale band in dark mode.
// --warning-bg is its theme-aware equivalent.
const RECORD_TINTS = ['--primary-bg', '--sky-bg', '--success-bg', '--warning-bg', '--neutral-bg']

const RECORD_TINT_OPACITY = 60

// Records are stacked rather than tabular so a long question excerpt or a dispute
// reason stays readable.
function PreviewList({ icon: Icon, rows, empty, overflow }) {
  if (rows.length === 0) {
    return (
      <p className="muted" style={{ margin: 0, padding: '24px 0', fontSize: 13, lineHeight: 1.5 }}>
        {empty}
      </p>
    )
  }

  return (
    <div>
      {/* The cap is applied here so it holds for every source — real records and
          presentation rows alike — instead of at each call site. */}
      {rows.slice(0, PREVIEW_LIMIT).map((row, index) => (
        <div
          key={row.key}
          className="flex items-start justify-between gap-4"
          style={{
            padding: '15px 0',
            borderTop: index === 0 ? 'none' : '1px solid var(--divider)',
            background: `color-mix(in srgb, var(${RECORD_TINTS[index % RECORD_TINTS.length]}) ${RECORD_TINT_OPACITY}%, transparent)`,
          }}
        >
          {Icon && (
            <span
              aria-hidden="true"
              className={`stat-icon tone-${RECORD_ACCENTS[index % RECORD_ACCENTS.length]}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-xs)',
                flex: 'none',
                marginTop: 1,
                boxShadow: 'inset 0 0 0 1px color-mix(in srgb, currentColor 16%, transparent)',
              }}
            >
              <Icon size={14} />
            </span>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.45,
                color: 'var(--ink)',
                overflowWrap: 'anywhere',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {row.primary || '—'}
            </div>
            {row.secondary && (
              <div className="muted" style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.5 }}>
                {row.secondary}
              </div>
            )}
          </div>
          {row.status && <span style={{ flex: 'none' }}>{row.status}</span>}
          <RowLink to={row.to} />
        </div>
      ))}
      {overflow && (
        <p className="muted" style={{ margin: 0, padding: '11px 0 2px', fontSize: 12 }}>
          {overflow}
        </p>
      )}
    </div>
  )
}

// A row-level link into an existing admin module. Every target route already exists
// in App.jsx and every id is read from the record itself.
function RowLink({ to }) {
  if (!to) return null
  return (
    <Link
      to={to}
      className="inline-flex items-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]"
      style={{ color: 'var(--muted)', textDecoration: 'none', flex: 'none' }}
      aria-label="Open record"
    >
      <ChevronRight size={16} />
    </Link>
  )
}

// ---------------------------------------------------------------------------
// PRESENTATION-ONLY DEMO DATA
//
// Scoped entirely to this file and to ONE astrologer — DEMO_ASTROLOGER_ID below —
// so the profile reads as a complete Admin profile during a demo. Nothing here is
// written to storage, AppDataContext, AdminContext, any shared selector or the
// catalog. It is read only while rendering this page.
//
// The rules this block obeys:
//   * Scope. A fallback is used only when the astrologer being viewed is the demo
//     astrologer. Every other astrologer renders the honest empty state, so nothing
//     here can appear against a real catalog profile.
//   * Real records always win. A section falls back to these rows only when its real
//     store returned nothing, so a genuine record is never replaced or hidden in
//     order to show demo content.
//   * Anything rendering these rows says so with a "Demo" chip.
//   * Everything here is invented for presentation: every id, name, date and line of
//     copy. None of it describes a real person, account or transaction.
//   * No credential of any kind appears in this block, and no file, download or
//     attachment URL is invented.
//   * Real status labels are reused where the data model already defines them, so a
//     demo row cannot imply a status the app does not have.
// ---------------------------------------------------------------------------

const DEMO_ASTROLOGER_ID = 'astrologer-demo'

const DEMO_ASTROLOGER = {
  questions: [
    {
      primary: 'When is the right time for my marriage, and which period is best?',
      secondary: 'QTN-DEMO-0001 · Health · Priya V. · Asked 12 Sep 2026',
      statusLabel: 'Answered',
    },
    {
      primary: 'Is October a good time to accept the new role I was offered?',
      secondary: 'QTN-DEMO-0002 · Career · Arjun Sharma · Asked 28 Aug 2026',
      statusLabel: 'In Progress',
    },
    {
      primary: 'When will the property purchase I am planning finally come through?',
      secondary: 'QTN-DEMO-0003 · Property · Meera Iyer · Asked 09 Aug 2026',
      statusLabel: 'Pending',
    },
  ],

  appointments: [
    {
      primary: 'APT-DEMO-0001',
      secondary: 'Priya V. · 22 Sep 2026 · 10:00 AM · Audio Call · ₹499',
      statusLabel: 'Completed',
    },
    {
      primary: 'APT-DEMO-0002',
      secondary: 'Arjun Sharma · 18 Sep 2026 · 05:30 PM · Video Consultation · ₹699',
      statusLabel: 'Confirmed',
    },
    {
      primary: 'APT-DEMO-0003',
      secondary: 'Meera Iyer · 02 Oct 2026 · 09:15 AM · Audio Call · ₹799',
      statusLabel: 'Booked',
    },
  ],

  calls: [
    {
      primary: 'CALL-DEMO-0001',
      secondary: 'Priya V. · 26 Aug 2026 · 09:30 · 30 min · ₹750',
      statusLabel: 'Completed',
    },
    {
      primary: 'CALL-DEMO-0002',
      secondary: 'Arjun Sharma · 14 Aug 2026 · 18:10 · 22 min · ₹550',
      statusLabel: 'Completed',
    },
    {
      primary: 'CALL-DEMO-0003',
      secondary: 'Meera Iyer · 02 Aug 2026 · 20:45 · 15 min · ₹375',
      statusLabel: 'Completed',
    },
  ],

  chats: [
    {
      primary: 'CHAT-DEMO-0001',
      secondary: 'Priya V. · 24 Aug 2026 · 19:10 · 26 min · 12 messages · ₹390',
      statusLabel: 'Completed',
    },
    {
      primary: 'CHAT-DEMO-0002',
      secondary: 'Arjun Sharma · 11 Aug 2026 · 21:05 · 18 min · 8 messages · ₹270',
      statusLabel: 'Completed',
    },
    {
      primary: 'CHAT-DEMO-0003',
      secondary: 'Meera Iyer · 30 Jul 2026 · 08:40 · 12 min · 6 messages · ₹180',
      statusLabel: 'Completed',
    },
  ],

  subscriptions: [
    {
      primary: 'Priya V.',
      secondary: 'Gold · Started 02 Sep 2026 · Ends 02 Oct 2026',
      statusLabel: 'Active',
    },
    {
      primary: 'Arjun Sharma',
      secondary: 'Silver · Started 12 Aug 2026 · Ends 12 Sep 2026',
      statusLabel: 'Expired',
    },
    {
      primary: 'Meera Iyer',
      secondary: 'Gold · Started 20 Jul 2026 · Ends 20 Aug 2026',
      statusLabel: 'Expired',
    },
  ],

  followers: [
    {
      primary: 'Priya V.',
      secondary: 'Vedic Astrology · Followed 04 Sep 2026',
      statusLabel: 'Active',
    },
    {
      primary: 'Arjun Sharma',
      secondary: 'Numerology · Followed 18 Aug 2026',
      statusLabel: 'Active',
    },
    {
      primary: 'Meera Iyer',
      secondary: 'Vastu Shastra · Followed 02 Jul 2026',
      statusLabel: 'Active',
    },
  ],

  reviews: [
    {
      primary: 'Priya V.',
      secondary: 'Very clear guidance, and the timing matched what happened. · 14 Sep 2026',
      statusLabel: '5 / 5',
    },
    {
      primary: 'Arjun Sharma',
      secondary: 'Patient and thorough, though the reply took a while. · 03 Sep 2026',
      statusLabel: '4 / 5',
    },
    {
      primary: 'Meera Iyer',
      secondary: 'Helpful session, would have liked a little more detail. · 27 Aug 2026',
      statusLabel: '4 / 5',
    },
  ],

  earnings: [
    { primary: 'TXN-DEMO-0001', secondary: 'Text question · ₹250 · 12 Sep 2026', statusLabel: 'Completed' },
    { primary: 'TXN-DEMO-0002', secondary: 'Audio consultation · ₹499 · 22 Sep 2026', statusLabel: 'Completed' },
    { primary: 'TXN-DEMO-0003', secondary: 'Instant chat · ₹390 · 24 Aug 2026', statusLabel: 'Refunded' },
  ],

  disputes: [
    {
      primary: 'DSP-DEMO-0001',
      secondary: 'Related question QTN-DEMO-0001 · Against Astrologer · The answer did not address the timing question · Raised 20 Sep 2026',
      statusLabel: 'Open',
    },
    {
      primary: 'DSP-DEMO-0002',
      secondary: 'Related question QTN-DEMO-0002 · Against Astrologer · Refund requested after a delayed answer · Raised 05 Sep 2026',
      statusLabel: 'Under Review',
    },
    {
      primary: 'DSP-DEMO-0003',
      secondary: 'Related question QTN-DEMO-0003 · Against Astrologer · Clarification requested on the reported timeline · Raised 21 Aug 2026',
      statusLabel: 'Closed',
    },
  ],

  posts: [
    {
      primary: 'Choosing a muhurat for a house purchase',
      secondary: 'POST-DEMO-0001 · Vedic Astrology · 21 Sep 2026',
      statusLabel: 'Published',
    },
    {
      primary: 'What retrograde Jupiter means for career decisions',
      secondary: 'POST-DEMO-0002 · Vedic Astrology · 14 Sep 2026',
      statusLabel: 'Published',
    },
    {
      primary: 'Remedies for a delayed marriage process',
      secondary: 'POST-DEMO-0003 · Vedic Astrology · 02 Sep 2026',
      statusLabel: 'Draft',
    },
  ],

  liveSessions: [
    {
      primary: 'Career & Marriage Live Q&A',
      secondary: 'LIVE-DEMO-0001 · Vedic Astrology · Public · 26 Sep 2026 · ₹45/min',
      statusLabel: 'Scheduled',
    },
    {
      primary: 'Marriage Match & Delay Remedies',
      secondary: 'LIVE-DEMO-0002 · Vedic Astrology · Followers · 19 Sep 2026 · ₹60/min',
      statusLabel: 'Ended',
    },
    {
      primary: 'Navratri Guidance Session',
      secondary: 'LIVE-DEMO-0003 · Vedic Astrology · Public · 08 Oct 2026 · Free',
      statusLabel: 'Scheduled',
    },
  ],
}

// Real rows always take precedence; these rows are a fallback only, and only for the
// demo astrologer. `statusLabel` becomes a real StatusBadge, so a demo record still
// renders through the same status component as live data.
function resolveRows(realRows, isDemoScope, demoRows, StatusBadge) {
  if (realRows.length > 0) return { rows: realRows, isDemo: false }
  if (!isDemoScope) return { rows: [], isDemo: false }
  return {
    rows: demoRows.map((row) => ({
      ...row,
      // No `to`: a demo id has no matching record, so there is nothing to open.
      to: undefined,
      status: <StatusBadge label={row.statusLabel} />,
    })),
    isDemo: true,
  }
}

// Instant call / chat attribution mirrors utils/memberCommunicationActivity.js: a
// session may carry either field, and neither one is invented here.
function consultationAstrologerId(session) {
  return session?.astrologerId || null
}

const INSTANT_CALL_TYPE = 'Audio Call'
const INSTANT_CHAT_TYPE = 'Chat'

function selectAstrologerConsultations(consultationHistory, astrologerId) {
  if (!astrologerId) return { calls: [], chats: [] }
  const mine = (Array.isArray(consultationHistory) ? consultationHistory : [])
    .filter((session) => consultationAstrologerId(session) === astrologerId)
  const newestFirst = (a, b) => sortByDateDesc(a, b, (row) => row.startedAt)
  return {
    calls: mine.filter((session) => session.type === INSTANT_CALL_TYPE).sort(newestFirst),
    chats: mine.filter((session) => session.type === INSTANT_CHAT_TYPE).sort(newestFirst),
  }
}

function byAstrologer(records, astrologerId, dateFields) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record?.astrologerId === astrologerId)
    .slice()
    .sort((a, b) => sortByDateDesc(a, b, (row) => {
      for (const field of dateFields) {
        const parsed = parseDisplayDate(row?.[field])
        if (Number.isFinite(parsed.getTime())) return row[field]
      }
      return null
    }))
}

// Subscriptions carry no status field. Derived from the record's own expiresAt, the
// same way utils/appointments.js derives its own date-based phases.
function getSubscriptionStatus(subscription) {
  const expiresAt = parseDisplayDate(subscription?.expiresAt).getTime()
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return 'Unknown'
  return expiresAt >= Date.now() ? 'Active' : 'Expired'
}

// ---------------------------------------------------------------------------
// ACCOUNT STATUS ACTIONS
//
// The vocabulary is not new. These are exactly the three values AuthContext's
// setUserAccountStatus() already accepts and validates, and exactly the three values
// utils/adminUsers.js#getUserAccountStatus() already reads back. There is no second
// status system here: the action writes `status` onto the existing astrologer account
// record through the existing setter, and the existing persistence effect mirrors it
// into astroconnect-auth-users like any other account field.
//
// CRITICAL SEPARATION FROM AVAILABILITY
// `availability` (Online / Offline) is service presence recorded on the catalog entry
// and is never written by anything on this page. It is displayed independently and is
// repeated in every audit entry as unchanged, so an audit reader can never mistake a
// status change for an availability change.
//
// WRITABILITY
// Only an astrologer that has a real account record in the AuthContext user store can
// be actioned. The catalog entry itself is static seed data and is never modified, so
// for the 26 catalog entries without an account there is nothing to write to and the
// Actions control is not rendered at all — no fake persistence, no optimistic state.
//
// The list is keyed by the account's CURRENT state, so an action is never offered that
// would contradict it.
// ---------------------------------------------------------------------------
const ASTROLOGER_STATUS_ACTIONS = {
  Active: [
    {
      key: 'suspend',
      label: 'Suspend Astrologer',
      Icon: ShieldOff,
      tone: 'amber',
      status: 'suspended',
      confirm: 'Confirm Suspension',
      audit: 'Astrologer Suspended',
      requiresReason: true,
    },
    {
      key: 'block',
      label: 'Block Astrologer',
      Icon: Ban,
      tone: 'red',
      status: 'blocked',
      confirm: 'Confirm Block',
      audit: 'Astrologer Blocked',
      requiresReason: true,
    },
  ],
  Suspended: [
    {
      key: 'activate',
      label: 'Activate Astrologer',
      Icon: ShieldCheck,
      tone: 'green',
      status: 'active',
      confirm: 'Confirm Activation',
      audit: 'Astrologer Activated',
      requiresReason: false,
    },
    {
      key: 'block',
      label: 'Block Astrologer',
      Icon: Ban,
      tone: 'red',
      status: 'blocked',
      confirm: 'Confirm Block',
      audit: 'Astrologer Blocked',
      requiresReason: true,
    },
  ],
  Blocked: [
    {
      key: 'unblock',
      label: 'Activate / Unblock Astrologer',
      Icon: UserCheck,
      tone: 'green',
      status: 'active',
      confirm: 'Confirm Unblock',
      audit: 'Astrologer Unblocked',
      requiresReason: false,
    },
    {
      // Offered here, unlike on the Admin Users page, because the model genuinely
      // represents it: `suspended` is a stored value and getUserAccountStatus reads
      // it back as Suspended. It is a deliberate softening of a stronger sanction
      // rather than a state the record cannot hold.
      key: 'suspend',
      label: 'Suspend Astrologer',
      Icon: ShieldOff,
      tone: 'amber',
      status: 'suspended',
      confirm: 'Confirm Suspension',
      audit: 'Astrologer Suspended',
      requiresReason: true,
    },
  ],
}

// Existing semantic tokens per tone. No new colour is introduced.
const ACTION_TOKENS = {
  red: { tint: 'var(--danger-bg)', fg: 'var(--red-600)', solid: 'var(--danger)' },
  amber: { tint: 'var(--warning-bg)', fg: 'var(--amber-600)', solid: 'var(--warning)' },
  green: { tint: 'var(--success-bg)', fg: 'var(--green-600)', solid: 'var(--success)' },
}

// Confirmation modal for a status change. Suspend and Block cannot be confirmed
// without a reason; restoring an account may be confirmed without one.
function StatusConfirmDialog({ action, astrologer, fromStatus, reason, onReasonChange, onCancel, onConfirm }) {
  const tone = ACTION_TOKENS[action.tone]
  const reasonValue = reason.trim()
  const confirmDisabled = action.requiresReason && reasonValue.length === 0

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const ActionIcon = action.Icon

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="astrologer-status-confirm-title"
        style={{
          width: 'min(430px, 100%)',
          borderRadius: 'var(--radius-m)',
          border: '1px solid var(--surface-border)',
          background: 'var(--surface-strong)',
          boxShadow: 'var(--shadow-lg)',
          padding: 22,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
            <span
              aria-hidden="true"
              className="stat-icon"
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-s)',
                background: tone.tint,
                color: tone.fg,
                flex: 'none',
              }}
            >
              <ActionIcon size={17} />
            </span>
            <span id="astrologer-status-confirm-title" style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>
              {action.label}
            </span>
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onCancel}
            style={{ width: 30, height: 30, borderRadius: 'var(--radius-xs)' }}
          >
            <X size={15} />
          </button>
        </div>

        <p className="muted" style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.55 }}>
          Astrologer:{' '}
          <span style={{ fontWeight: 650, color: 'var(--ink)' }}>{astrologer.name || astrologer.id}</span>
          <span className="muted" style={{ fontSize: 12 }}> · {astrologer.id}</span>
        </p>

        <div className="flex items-center gap-2" style={{ marginTop: 12 }}>
          <span className="badge" style={{ background: 'var(--neutral-bg)', color: 'var(--muted)', fontSize: 11 }}>
            {fromStatus}
          </span>
          <ChevronRight size={14} style={{ color: 'var(--muted)', flex: 'none' }} />
          <span className="badge" style={{ background: tone.tint, color: tone.fg, fontSize: 11 }}>
            {action.status}
          </span>
        </div>

        {/* Availability is called out here so it is unambiguous that this action does
            not touch it. */}
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 12, lineHeight: 1.55 }}>
          Account status only. Availability stays{' '}
          <span style={{ fontWeight: 650, color: 'var(--ink)' }}>
            {getAstrologerStatus(astrologer) || 'Not recorded'}
          </span>
          , and the change applies to the account record only.
        </p>

        <label
          className="muted"
          htmlFor="astrologer-status-change-reason"
          style={{ display: 'block', marginTop: 16, fontSize: 12, fontWeight: 600 }}
        >
          Reason{action.requiresReason ? '' : ' (optional)'}
        </label>
        <textarea
          id="astrologer-status-change-reason"
          className="textarea-box"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Enter reason..."
          rows={3}
          autoFocus
          style={{ marginTop: 6, minHeight: 84, resize: 'vertical', fontSize: 13.5 }}
        />
        {action.requiresReason && confirmDisabled && (
          <p className="muted" style={{ margin: '7px 0 0', fontSize: 11.5 }}>
            A reason is required before this action can be confirmed.
          </p>
        )}

        <div className="flex items-center justify-end gap-2" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn btn-sm ${action.tone === 'green' ? 'btn-success' : 'btn-danger'}`}
            onClick={onConfirm}
            disabled={confirmDisabled}
            style={confirmDisabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
          >
            {action.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// One service line in the Services panel. `available` is decided purely by whether
// the shared stores hold a record for this astrologer — never asserted by hand.
function ServiceCard({ icon: Icon, tone, label, description, available, count, demo }) {
  return (
    <div
      className="flex items-start gap-3"
      style={{
        padding: 14,
        borderRadius: 'var(--radius-s)',
        border: available ? '1px solid var(--divider)' : '1px dashed var(--surface-border)',
        background: available ? 'var(--surface-soft)' : 'transparent',
        minWidth: 0,
      }}
    >
      <IconTile icon={Icon} tone={available ? tone : 'neutral'} size={30} />
      <div className="flex flex-col" style={{ minWidth: 0, gap: 3, flex: 1 }}>
        <span className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--ink)' }}>{label}</span>
          {available ? (
            <span className={`badge tone-${tone}`} style={{ fontSize: 10.5 }}>
              <Check size={11} /> Available
            </span>
          ) : (
            <span className="badge" style={{ background: 'var(--neutral-bg)', color: 'var(--muted)', fontSize: 10.5 }}>
              <X size={11} /> Not offered
            </span>
          )}
          {demo && (
            <span
              className="badge"
              style={{
                background: 'var(--neutral-bg)',
                color: 'var(--muted)',
                fontSize: 10.5,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Demo
            </span>
          )}
        </span>
        <span className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          {description}
        </span>
        {available && count != null && (
          <span className="muted" style={{ fontSize: 11.5, fontWeight: 500 }}>
            {count} record{count === 1 ? '' : 's'} on record
          </span>
        )}
      </div>
    </div>
  )
}

export default function AdminAstrologerDetails() {
  const { astrologerId } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const { users, setUserAccountStatus } = useAuth()
  const { recordAudit } = useAdmin()
  const {
    questions,
    appointments,
    consultationHistory,
    subscriptions,
    astrologerPosts,
    astrologerLiveSessions,
  } = useAppData()

  // Status-action UI state. Nothing is written until the dialog is confirmed.
  const [actionsOpen, setActionsOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [pendingReason, setPendingReason] = useState('')
  const actionsRef = useRef(null)
  const actionsButtonRef = useRef(null)

  const astrologer = useMemo(() => findAdminAstrologer(users, astrologerId), [users, astrologerId])

  // The writable record. Matched by id against the AuthContext user store, because
  // that id is the only thing both the catalog entry and the account agree on. The
  // catalog entry itself is static seed data and is never written to.
  //
  // The role check matters: an id that exists as some other kind of account is not an
  // astrologer account and must not be actioned from this page.
  const account = useMemo(
    () => (Array.isArray(users) ? users : [])
      .find((user) => user.id === astrologerId && user.role === ROLES.ASTROLOGER) || null,
    [users, astrologerId],
  )
  const hasWritableAccount = Boolean(account)
  const accountStatus = hasWritableAccount ? getUserAccountStatus(account) : null

  // Fallback rows are permitted for this one astrologer only. Every other profile
  // renders the honest empty state.
  const isDemoScope = astrologer?.id === DEMO_ASTROLOGER_ID

  // Real records, each filtered on the `astrologerId` the record already carries.
  const astrologerQuestions = useMemo(
    () => byAstrologer(questions, astrologerId, ['raisedAt', 'raised', 'createdAt']),
    [questions, astrologerId],
  )
  const astrologerAppointments = useMemo(
    () => byAstrologer(appointments, astrologerId, ['dateIso', 'date', 'bookedAt', 'bookingDate']),
    [appointments, astrologerId],
  )
  const astrologerSubscriptions = useMemo(
    () => byAstrologer(subscriptions, astrologerId, ['subscribedAt']),
    [subscriptions, astrologerId],
  )
  const astrologerPostsForRecord = useMemo(
    () => selectAdminContent(astrologerPosts).filter((post) => post.astrologerId === astrologerId),
    [astrologerPosts, astrologerId],
  )
  const liveSessions = useMemo(
    () => byAstrologer(astrologerLiveSessions, astrologerId, ['scheduledStartAt', 'startedAt', 'createdAt']),
    [astrologerLiveSessions, astrologerId],
  )
  const { calls, chats } = useMemo(
    () => selectAstrologerConsultations(consultationHistory, astrologerId),
    [consultationHistory, astrologerId],
  )
  // A dispute is a field on a question, so the relationship to an astrologer is
  // inherited from the question's own astrologerId rather than stored on the dispute.
  const disputes = useMemo(
    () => astrologerQuestions.filter((question) => question.dispute),
    [astrologerQuestions],
  )
  // Dismiss the menu on an outside click or on Escape.
  useEffect(() => {
    if (!actionsOpen) return undefined
    const onPointerDown = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) setActionsOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setActionsOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [actionsOpen])

  // Unknown id: fall back to the list. Declared after every hook above so hook order
  // is identical on every render.
  if (!astrologer) {
    return <Navigate to={`${routes.base}/astrologers`} replace />
  }

  const backToAstrologers = () => navigate(`${routes.base}/astrologers`)
  const status = getAstrologerStatus(astrologer)
  const isOnline = String(status || '').trim().toLowerCase() === 'online'

  // The value actually stored on the account record, for the audit trail. Defaults to
  // 'active' because that is what getUserAccountStatus() reports when absent.
  const storedStatus = hasWritableAccount
    ? String(account.status || account.accountStatus || '').trim().toLowerCase() || 'active'
    : null

  const availableStatusActions = hasWritableAccount
    ? ASTROLOGER_STATUS_ACTIONS[accountStatus] || []
    : []

  // Selecting a menu item only opens the dialog. The status is not touched here.
  const requestStatusAction = (action) => {
    setActionsOpen(false)
    setPendingReason('')
    setPendingAction(action)
  }

  const cancelStatusAction = () => {
    setPendingAction(null)
    setPendingReason('')
    // Return focus to the control that opened the dialog so keyboard users are not
    // dropped at the top of the document.
    if (actionsButtonRef.current) actionsButtonRef.current.focus()
  }

  // Action -> confirmation -> reason -> confirm. This is the only place a status is
  // written, and every write is paired with an existing admin audit entry.
  //
  // Guarded on hasWritableAccount as well as on the reason, so an astrologer with no
  // account record can never be written to even if this handler were reached.
  const confirmStatusAction = () => {
    if (!pendingAction || !hasWritableAccount) return
    const reason = pendingReason.trim()
    if (pendingAction.requiresReason && !reason) return

    setUserAccountStatus(account.id, pendingAction.status)
    recordAudit(
      pendingAction.audit,
      'Astrologer Management',
      [
        `${astrologer.name || 'Astrologer'} (${astrologer.id})`,
        `${storedStatus} → ${pendingAction.status}`,
        reason ? `Reason: ${reason}` : 'Reason: not provided',
        // Recorded explicitly so an audit reader can see that availability was not
        // part of this change. It is never written.
        `Availability: ${status || 'Not recorded'} (unchanged)`,
      ].join(' · '),
    )
    cancelStatusAction()
  }

  // ---- Preview rows for every activity section -------------------------------
  const questionsView = resolveRows(
    astrologerQuestions.map((question) => ({
      key: question.id,
      primary: question.question || question.id,
      secondary: [
        question.id,
        question.category,
        question.user || question.userName,
        `Asked ${formatDisplayDate(getQuestionAskedAt(question))}`,
      ].filter(Boolean).join(' · '),
      statusLabel: question.status,
      status: <StatusBadge label={question.status} />,
      to: `${routes.base}/text-based-questions/${question.id}`,
    })),
    isDemoScope,
    DEMO_ASTROLOGER.questions,
    StatusBadge,
  )

  const appointmentsView = resolveRows(
    astrologerAppointments.map((appointment) => ({
      key: appointment.id,
      primary: appointment.id,
      secondary: [
        appointment.userName || appointment.customerName,
        [formatDisplayDate(getAppointmentDate(appointment)), getAppointmentTime(appointment)]
          .filter(Boolean).join(' · '),
        appointment.type,
        appointment.amount != null ? `₹${appointment.amount}` : null,
        appointment.paymentStatus,
      ].filter(Boolean).join(' · '),
      statusLabel: appointment.status,
      status: <StatusBadge label={appointment.status} />,
      to: `${routes.base}/appointments/${appointment.id}`,
    })),
    isDemoScope,
    DEMO_ASTROLOGER.appointments,
    StatusBadge,
  )

  const callsView = resolveRows(
    calls.map((session) => ({
      key: session.id,
      primary: session.id,
      secondary: [
        session.customerName || session.userName,
        `Started ${formatDisplayDate(session.startedAt)}`,
        session.durationMinutes != null ? `${session.durationMinutes} min` : null,
        session.amount != null ? `₹${session.amount}` : null,
      ].filter(Boolean).join(' · '),
      statusLabel: session.status,
      status: <StatusBadge label={session.status} />,
    })),
    isDemoScope,
    DEMO_ASTROLOGER.calls,
    StatusBadge,
  )

  const chatsView = resolveRows(
    chats.map((session) => ({
      key: session.id,
      primary: session.id,
      secondary: [
        session.customerName || session.userName,
        `Started ${formatDisplayDate(session.startedAt)}`,
        session.durationMinutes != null ? `${session.durationMinutes} min` : null,
        Array.isArray(session.messages) ? `${session.messages.length} messages` : null,
        session.amount != null ? `₹${session.amount}` : null,
      ].filter(Boolean).join(' · '),
      statusLabel: session.status,
      status: <StatusBadge label={session.status} />,
    })),
    isDemoScope,
    DEMO_ASTROLOGER.chats,
    StatusBadge,
  )

  const subscriptionsView = resolveRows(
    astrologerSubscriptions.map((subscription) => {
      const phase = getSubscriptionStatus(subscription)
      return {
        key: subscription.id,
        primary: subscription.userName || subscription.userId,
        secondary: [
          subscription.tier,
          `Started ${formatDisplayDate(subscription.subscribedAt)}`,
          `Ends ${formatDisplayDate(subscription.expiresAt)}`,
        ].filter(Boolean).join(' · '),
        statusLabel: phase,
        status: <StatusBadge label={phase} />,
      }
    }),
    isDemoScope,
    DEMO_ASTROLOGER.subscriptions,
    StatusBadge,
  )

  // Follower count is the one follower figure that is real: it is the catalog's own
  // `followers` number. The identities behind it are not stored anywhere.
  const followersView = resolveRows([], isDemoScope, DEMO_ASTROLOGER.followers, StatusBadge)

  // Reviews cannot be attributed: selectAdminReviews sets astrologerName to '' because
  // the record carries no astrologer reference. The catalog's own rating and review
  // volume are still reported as real figures above this section.
  const reviewsView = resolveRows([], isDemoScope, DEMO_ASTROLOGER.reviews, StatusBadge)

  // Earnings cannot be attributed: astrologerWallet is one shared wallet and its
  // ledger entries carry no astrologerId.
  const earningsView = resolveRows([], isDemoScope, DEMO_ASTROLOGER.earnings, StatusBadge)

  const disputesView = resolveRows(
    disputes.map((question) => {
      const dispute = question.dispute
      return {
        key: question.id,
        primary: getDisputeId({ dispute }) || question.id,
        secondary: [
          `Related question ${question.id}`,
          dispute?.target ? `Against ${dispute.target}` : null,
          dispute?.reason,
          dispute?.raisedAt ? `Raised ${formatDisplayDate(dispute.raisedAt)}` : null,
        ].filter(Boolean).join(' · '),
        statusLabel: dispute?.status,
        status: <StatusBadge label={dispute?.status} />,
        to: `${routes.base}/disputes/${question.id}`,
      }
    }),
    isDemoScope,
    DEMO_ASTROLOGER.disputes,
    StatusBadge,
  )

  const postsView = resolveRows(
    astrologerPostsForRecord.map((post) => {
      const visibility = getContentVisibility(post)
      return {
        key: post.id,
        primary: post.title || post.content || post.id,
        secondary: [
          post.id,
          post.category,
          post.astrologerName,
          `Posted ${formatDisplayDate(post.createdAt)}`,
        ].filter(Boolean).join(' · '),
        statusLabel: visibility,
        status: <StatusBadge label={visibility} />,
        to: `${routes.base}/content/${post.id}`,
      }
    }),
    isDemoScope,
    DEMO_ASTROLOGER.posts,
    StatusBadge,
  )

  const liveSessionsView = resolveRows(
    liveSessions.map((session) => ({
      key: session.id,
      primary: session.title || session.id,
      secondary: [
        session.id,
        session.category,
        session.audience || session.visibility,
        formatDisplayDate(session.scheduledStartAt),
        session.rate ? `₹${session.rate}/min` : 'Free',
      ].filter(Boolean).join(' · '),
      statusLabel: session.status,
      status: <StatusBadge label={session.status} />,
    })),
    isDemoScope,
    DEMO_ASTROLOGER.liveSessions,
    StatusBadge,
  )

  // An unresolved dispute is the one thing on this page an admin must not scroll
  // past, so its section is accented only while one is actually open.
  const hasUnresolvedDispute = disputesView.rows.some(
    (row) => String(row.statusLabel || '').trim().toLowerCase() === 'open',
  )

  // ---- Professional information ----------------------------------------------
  const languages = Array.isArray(astrologer.languages)
    ? astrologer.languages.filter(Boolean).join(', ')
    : String(astrologer.languages || '').trim()
  const consultationRate = getConsultationRate(astrologer)
  const rating = getRatingValue(astrologer)
  const reviewCount = getReviewCount(astrologer)
  const followers = formatCount(astrologer.followers)
  const subscribers = formatCount(astrologer.subscribers)

  // chatAvailable is recorded as a boolean on one catalog entry and is absent
  // elsewhere. Absent is reported as "—", never as "No".
  const chatAvailable = astrologer.chatAvailable === true
    ? 'Yes'
    : astrologer.chatAvailable === false
      ? 'No'
      : ''

  const professionalFields = [
    { label: 'Specialisation', value: astrologer.specialization },
    { label: 'Experience', value: astrologer.experience },
    { label: 'Languages', value: languages },
    { label: 'Consultation rate', value: consultationRate },
    { label: 'Chat available', value: chatAvailable },
    { label: 'Followers', value: followers },
    { label: 'Subscribers', value: subscribers },
    {
      label: 'Rating',
      value: rating
        ? (
          <span className="inline-flex items-center gap-1.5">
            <Star size={14} style={{ color: 'var(--primary)' }} />
            {rating}
            <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>
              / 5
            </span>
          </span>
        )
        : '',
    },
    { label: 'Reviews', value: reviewCount },
    { label: 'Consultation focus', value: astrologer.type },
    { label: 'Bio', value: astrologer.bio, wide: true },
  ]

  // ---- Services --------------------------------------------------------------
  // Availability is decided only by whether a real record exists in the shared store
  // for this astrologer. For the demo astrologer a service with no real record is
  // shown as available with a Demo flag, so all four services are visible in the
  // presentation without any store being changed.
  const serviceDefinitions = [
    {
      key: 'questions',
      icon: MessageCircle,
      tone: 'violet',
      label: 'Text-Based Questions',
      description: 'Paid and free questions routed to this astrologer from the question queue.',
      realCount: astrologerQuestions.length,
      to: `${routes.base}/text-based-questions`,
    },
    {
      key: 'appointments',
      icon: CalendarDays,
      tone: 'sky',
      label: 'Appointments',
      description: 'Scheduled consultations booked against this astrologer.',
      realCount: astrologerAppointments.length,
      to: `${routes.base}/appointments`,
    },
    {
      key: 'calls',
      icon: Phone,
      tone: 'green',
      label: 'Instant Call',
      description: 'Audio consultations started with this astrologer.',
      realCount: calls.length,
      to: null,
    },
    {
      key: 'chats',
      icon: MessagesSquare,
      tone: 'teal',
      label: 'Instant Chat',
      description: 'Chat sessions started with this astrologer.',
      realCount: chats.length,
      to: null,
    },
  ]

  const services = serviceDefinitions.map((service) => {
    const real = service.realCount > 0
    const shownAsDemo = !real && isDemoScope
    return {
      ...service,
      available: real || shownAsDemo,
      demo: shownAsDemo,
      count: real ? service.realCount : null,
    }
  })

  // ---- Admin summary ---------------------------------------------------------
  const summaryTiles = [
    {
      icon: MessageCircle,
      tone: 'violet',
      label: 'Questions',
      count: questionsView.rows.length,
      available: true,
      demo: questionsView.isDemo,
      note: UNAVAILABLE_SOURCES.earnings,
      to: `${routes.base}/text-based-questions`,
    },
    {
      icon: CalendarDays,
      tone: 'sky',
      label: 'Appointments',
      count: appointmentsView.rows.length,
      available: true,
      demo: appointmentsView.isDemo,
      note: UNAVAILABLE_SOURCES.earnings,
      to: `${routes.base}/appointments`,
    },
    {
      icon: Phone,
      tone: 'green',
      label: 'Instant Calls',
      // No admin route lists instant calls, so this tile is not a link.
      count: callsView.rows.length,
      available: astrologerCallsReal(calls),
      demo: callsView.isDemo,
      note: 'Instant call sessions are not listed in any admin module.',
    },
    {
      icon: MessagesSquare,
      tone: 'teal',
      label: 'Instant Chats',
      count: chatsView.rows.length,
      available: chats.length > 0,
      demo: chatsView.isDemo,
      note: 'Instant chat sessions are not listed in any admin module.',
    },
    {
      icon: Star,
      tone: 'gold',
      label: 'Subscriptions',
      count: subscriptionsView.rows.length,
      available: true,
      demo: subscriptionsView.isDemo,
      note: UNAVAILABLE_SOURCES.earnings,
      to: `${routes.base}/subscriptions`,
    },
    {
      icon: Users,
      tone: 'rose',
      label: 'Followers',
      // The catalog's own followers number, so this figure is real for every
      // astrologer and never a presentation value.
      count: followers || '—',
      available: Boolean(followers),
      note: UNAVAILABLE_SOURCES.followers,
    },
    {
      icon: Receipt,
      tone: 'secondary',
      label: 'Reviews',
      // The catalog's own review volume, likewise real.
      count: reviewCount || '—',
      available: Boolean(reviewCount),
      to: `${routes.base}/reviews`,
      note: UNAVAILABLE_SOURCES.reviews,
    },
    {
      icon: Wallet,
      tone: 'neutral',
      label: 'Earnings',
      count: earningsView.rows.length,
      available: false,
      demo: earningsView.isDemo,
      note: UNAVAILABLE_SOURCES.earnings,
      to: `${routes.base}/payments`,
    },
  ]

  return (
    <div className="tbq-page">
      {/* ---- Profile header ----
          Identity accent only: a whisper of the brand tint behind the raised surface,
          a larger monogram and one short violet rule. No banner. */}
      <Card
        style={{
          ...RAISED_PANEL,
          padding: '22px 24px',
          background: 'color-mix(in srgb, var(--primary-bg) 22%, var(--surface-strong))',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4" style={{ minWidth: 0 }}>
            <span
              aria-hidden="true"
              className="stat-icon tone-violet"
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-m)',
                flex: 'none',
                boxShadow: 'inset 0 0 0 1px color-mix(in srgb, currentColor 16%, transparent)',
              }}
            >
              <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {getInitials(astrologer.name)}
              </span>
            </span>

            <div className="flex flex-col" style={{ minWidth: 0, gap: 6 }}>
              <span
                aria-hidden="true"
                style={{
                  display: 'block',
                  width: 36,
                  height: 3,
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--primary)',
                  opacity: 0.85,
                }}
              />
              <span className="page-eyebrow" style={{ marginBottom: 0, alignSelf: 'flex-start' }}>
                Platform administration
              </span>
              <span className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 25,
                    fontWeight: 700,
                    letterSpacing: '-0.025em',
                    lineHeight: 1.15,
                    color: 'var(--text-primary)',
                  }}
                >
                  {astrologer.name || 'Astrologer'}
                </span>
                {/* Availability — service presence from the catalog, never an account
                    status and never written by any action on this page. */}
                {status ? <StatusBadge label={status} /> : null}
                {/* Account status — only meaningful when a real account record exists,
                    and always shown separately from the badge above. */}
                {hasWritableAccount && <StatusBadge label={accountStatus} />}
              </span>
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1" style={{ fontSize: 12.5 }}>
                <span className="muted" style={{ fontWeight: 500, letterSpacing: '0.02em' }}>
                  {astrologer.id || 'No astrologer ID on record'}
                </span>
                {astrologer.specialization && (
                  <>
                    <span aria-hidden="true" style={{ color: 'var(--divider)' }}>|</span>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      Specialisation: {astrologer.specialization}
                    </span>
                  </>
                )}
                {hasWritableAccount && (
                  <>
                    <span aria-hidden="true" style={{ color: 'var(--divider)' }}>|</span>
                    <span className="muted" style={{ fontWeight: 500 }}>
                      Account status: {accountStatus}
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2" style={{ flex: 'none' }}>
            {/* ---- Account status actions ----
                Rendered only when a writable account record exists. Selecting an item
                only opens the confirmation dialog; nothing is written until the
                reason has been confirmed there. */}
            {hasWritableAccount ? (
              <div className="relative" ref={actionsRef}>
                <button
                  ref={actionsButtonRef}
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setActionsOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={actionsOpen}
                  aria-label={`Account actions for ${astrologer.name || 'astrologer'}`}
                >
                  Actions
                  <ChevronDown size={15} />
                </button>

                {actionsOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-30"
                    style={{
                      top: 'calc(100% + 6px)',
                      minWidth: 236,
                      borderRadius: 'var(--radius-s)',
                      border: '1px solid var(--surface-border)',
                      background: 'var(--surface-overlay)',
                      boxShadow: 'var(--shadow-md)',
                      padding: 6,
                    }}
                  >
                    {availableStatusActions.map((action) => {
                      const ActionIcon = action.Icon
                      const tokens = ACTION_TOKENS[action.tone]
                      return (
                        <button
                          key={action.key}
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2.5 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--primary)]"
                          style={{ padding: '8px 10px' }}
                          onClick={() => requestStatusAction(action)}
                        >
                          <span
                            aria-hidden="true"
                            className="stat-icon"
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 'var(--radius-xs)',
                              background: tokens.tint,
                              color: tokens.fg,
                              flex: 'none',
                            }}
                          >
                            <ActionIcon size={14} />
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                            {action.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* No account record on this device, so there is nothing to write a
                 status to. The limitation is stated rather than hidden, and no
                 control is offered that could not be persisted. */
              <span
                className="muted"
                style={{ fontSize: 12, maxWidth: 260, lineHeight: 1.45, textAlign: 'right' }}
              >
                No account record on this device, so account status cannot be changed.
              </span>
            )}

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={backToAstrologers}
              style={{ flex: 'none' }}
            >
              <ArrowLeft size={15} /> Back to Astrologers
            </button>
          </div>
        </div>
      </Card>

      {pendingAction && hasWritableAccount && (
        <StatusConfirmDialog
          action={pendingAction}
          astrologer={astrologer}
          fromStatus={storedStatus}
          reason={pendingReason}
          onReasonChange={setPendingReason}
          onCancel={cancelStatusAction}
          onConfirm={confirmStatusAction}
        />
      )}

      {/* ---- Admin summary ---- */}
      <Section title="Admin summary" icon={Sparkles} className="!mt-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {summaryTiles.map((tile) => (
            <SummaryTile key={tile.label} {...tile} />
          ))}
        </div>
      </Section>

      {/* ---- Professional information ----
          Every value is read off the catalog record. A field the record does not carry
          reports a dash rather than a substituted value. */}
      <Section title="Professional Information" icon={Globe}>
        <AccentPanel accent="--green-600" wash="--success-bg">
          <InfoGrid fields={professionalFields} />
        </AccentPanel>
      </Section>

      {/* ---- Availability ----
          Availability is availability, not an account status: it is the Online/Offline
          value the catalog records, and it is never relabelled Active, Suspended,
          Blocked or Verified. There is no weekly schedule on the record, so none is
          shown, and the appointment availability system is left untouched. */}
      <Section title="Availability" icon={Sparkles}>
        <AccentPanel accent="--sky-600" wash="--sky-bg">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`badge ${isOnline ? 'tone-green' : 'tone-neutral'}`}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              {status || 'Not recorded'}
            </span>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {chatAvailable
                ? `Instant chat is marked available on this record.`
                : chatAvailable === ''
                  ? 'No chat availability flag is recorded on this astrologer.'
                  : 'Instant chat is marked unavailable on this record.'}
            </span>
          </div>
          <p className="muted" style={{ margin: '16px 0 0', fontSize: 12, lineHeight: 1.55 }}>
            This is the presence recorded on the catalog entry, not an account or verification
            status. The catalog carries no weekly schedule, slot template or time-zone field, so
            none is shown here and the appointment availability system is left untouched. A
            dedicated availability screen can be added once that model exists.
          </p>
        </AccentPanel>
      </Section>

      {/* ---- Services ---- */}
      <Section title="Services" icon={Sparkles}>
        <Card style={{ ...PANEL, padding: 0, overflow: 'hidden' }}>
          {isDemoScope && (
            <p className="muted" style={{ margin: 0, padding: '13px 22px 0', fontSize: 12, lineHeight: 1.55 }}>
              <span style={{ fontWeight: 650, color: 'var(--ink)' }}>Demo</span>
              {' — this is the presentation astrologer. A service with no record of its own is shown as available so all four are visible; those entries are flagged below. No store is changed.'}
            </p>
          )}
          <div
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
            style={{ padding: '16px 22px 22px' }}
          >
            {services.map((service) => (
              <ServiceCard
                key={service.key}
                icon={service.icon}
                tone={service.tone}
                label={service.label}
                description={service.description}
                available={service.available}
                count={service.count}
                demo={service.demo}
              />
            ))}
          </div>
        </Card>
      </Section>

      {/* ---- Text-Based Questions ---- */}
      <RecordSection
        icon={MessageCircle}
        tone="violet"
        title="Text-Based Questions"
        count={questionsView.rows.length}
        demo={questionsView.isDemo}
        to={astrologerQuestions.length > 0 ? `${routes.base}/text-based-questions` : null}
      >
        <PreviewList
          icon={MessageCircle}
          empty="No text-based questions are recorded for this astrologer."
          overflow={previewOverflow(questionsView.rows.length)}
          rows={questionsView.rows}
        />
      </RecordSection>

      {/* ---- Appointments ---- */}
      <RecordSection
        icon={CalendarDays}
        tone="sky"
        title="Appointments"
        count={appointmentsView.rows.length}
        demo={appointmentsView.isDemo}
        to={astrologerAppointments.length > 0 ? `${routes.base}/appointments` : null}
      >
        <PreviewList
          icon={CalendarDays}
          empty="No appointments are recorded for this astrologer."
          overflow={previewOverflow(appointmentsView.rows.length)}
          rows={appointmentsView.rows}
        />
      </RecordSection>

      {/* ---- Instant Calls ----
          Real sessions from AppDataContext's consultationHistory, split by the
          record's own type. No admin module lists instant calls, so there is no
          existing route to send a "View more" to and none is invented. */}
      <RecordSection
        icon={Phone}
        tone="green"
        title="Instant Calls"
        count={callsView.rows.length}
        demo={callsView.isDemo}
        note={callsView.isDemo ? null : 'No instant call sessions are recorded for this astrologer.'}
      >
        <PreviewList
          icon={Phone}
          empty="No instant call sessions are recorded for this astrologer."
          overflow={previewOverflow(callsView.rows.length)}
          rows={callsView.rows}
        />
      </RecordSection>

      {/* ---- Instant Chats ----
          Same collection as the calls above, filtered to chat sessions. Message
          bodies are deliberately not surfaced; only session-level facts are. */}
      <RecordSection
        icon={MessagesSquare}
        tone="teal"
        title="Instant Chats"
        count={chatsView.rows.length}
        demo={chatsView.isDemo}
        note={chatsView.isDemo ? null : 'No instant chat sessions are recorded for this astrologer.'}
      >
        <PreviewList
          icon={MessagesSquare}
          empty="No instant chat sessions are recorded for this astrologer."
          overflow={previewOverflow(chatsView.rows.length)}
          rows={chatsView.rows}
        />
      </RecordSection>

      {/* ---- Subscriptions ---- */}
      <RecordSection
        icon={Star}
        tone="gold"
        title="Subscriptions"
        count={subscriptionsView.rows.length}
        demo={subscriptionsView.isDemo}
        to={astrologerSubscriptions.length > 0 ? `${routes.base}/subscriptions` : null}
      >
        <PreviewList
          icon={Star}
          empty="No subscriptions to this astrologer are recorded."
          overflow={previewOverflow(subscriptionsView.rows.length)}
          rows={subscriptionsView.rows}
        />
      </RecordSection>

      {/* ---- Followers ----
          The follower total is real (the catalog's own number) and is reported above.
          The app stores no per-follower records, so the identities behind the count
          cannot be listed and are not invented here. */}
      <RecordSection
        icon={UserCheck}
        tone="rose"
        title="Followers"
        count={followers || '—'}
        demo={followersView.isDemo}
        note={
          followersView.isDemo
            ? null
            : followers
              ? `${followers} followers are recorded on the catalog entry, but no per-follower records exist to list.`
              : UNAVAILABLE_SOURCES.followers
        }
      >
        <PreviewList
          icon={UserCheck}
          empty={UNAVAILABLE_SOURCES.followers}
          overflow={previewOverflow(followersView.rows.length)}
          rows={followersView.rows}
        />
      </RecordSection>

      {/* ---- Reviews & Ratings ----
          The aggregate rating and review volume are real and are shown in the note
          below. The individual review records cannot be attributed, so they are never
          listed as if they were this astrologer's. */}
      <RecordSection
        icon={Receipt}
        tone="secondary"
        title="Reviews & Ratings"
        count={reviewsView.rows.length}
        demo={reviewsView.isDemo}
        to={`${routes.base}/reviews`}
        note={
          reviewsView.isDemo
            ? null
            : rating
              ? `Catalog rating ${rating} / 5 across ${reviewCount} reviews.`
              : undefined
        }
      >
        <PreviewList
          icon={Receipt}
          empty={UNAVAILABLE_SOURCES.reviews}
          overflow={previewOverflow(reviewsView.rows.length)}
          rows={reviewsView.rows}
        />
      </RecordSection>

      {/* ---- Payments / Earnings ----
          astrologerWallet is one shared wallet and its ledger entries carry no
          astrologerId, so a figure cannot be attributed to this astrologer. */}
      <RecordSection
        icon={Wallet}
        tone="neutral"
        title="Payments / Earnings"
        count={earningsView.rows.length}
        demo={earningsView.isDemo}
        to={earningsView.isDemo ? null : `${routes.base}/payments`}
        note={earningsView.isDemo ? null : UNAVAILABLE_SOURCES.earnings}
      >
        <PreviewList
          icon={Wallet}
          empty={UNAVAILABLE_SOURCES.earnings}
          overflow={previewOverflow(earningsView.rows.length)}
          rows={earningsView.rows}
        />
      </RecordSection>

      {/* ---- Disputes / Complaints ----
          A dispute is stored on the question, so it inherits the question's
          astrologerId. */}
      <RecordSection
        icon={Gavel}
        tone="amber"
        title="Disputes / Complaints"
        count={disputesView.rows.length}
        demo={disputesView.isDemo}
        to={disputes.length > 0 ? `${routes.base}/disputes` : null}
        accent={hasUnresolvedDispute ? '3px solid var(--danger)' : undefined}
        note={hasUnresolvedDispute ? 'At least one dispute is still open and needs a decision.' : null}
      >
        <PreviewList
          icon={Gavel}
          empty="No disputes have been raised against this astrologer."
          overflow={previewOverflow(disputesView.rows.length)}
          rows={disputesView.rows}
        />
      </RecordSection>

      {/* ---- Content / Posts ---- */}
      <RecordSection
        icon={FileText}
        tone="sky"
        title="Content / Posts"
        count={postsView.rows.length}
        demo={postsView.isDemo}
        to={astrologerPostsForRecord.length > 0 ? `${routes.base}/content` : null}
      >
        <PreviewList
          icon={FileText}
          empty="No posts or content are recorded for this astrologer."
          overflow={previewOverflow(postsView.rows.length)}
          rows={postsView.rows}
        />
      </RecordSection>

      {/* ---- Live Sessions ---- */}
      <RecordSection
        icon={Radio}
        tone="violet"
        title="Live Sessions"
        count={liveSessionsView.rows.length}
        demo={liveSessionsView.isDemo}
      >
        <PreviewList
          icon={Radio}
          empty="No live sessions are recorded for this astrologer."
          overflow={previewOverflow(liveSessionsView.rows.length)}
          rows={liveSessionsView.rows}
        />
      </RecordSection>

      {/* ---- Scope note ----
          Stated once, plainly, so nothing on this page can be mistaken for a
          verification or approval state that the platform does not have. */}
      <Card
        style={{ ...PANEL, background: 'var(--surface-soft)', padding: '14px 16px', marginTop: 14 }}
        className="flex gap-3"
      >
        <Gavel size={17} style={{ color: 'var(--muted)', flex: 'none', marginTop: 1 }} />
        <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
          Availability is the Online/Offline value recorded on the catalog entry and is never
          written by any action on this page; the account status shown in the header is a separate
          field on the account record. There is no astrologer verification, document or approval
          model anywhere in the platform today, so none is shown or implied here. Account status can
          only be changed for an astrologer that has a real account record in the local account
          store — on a fresh install that is the seeded{' '}
          <span style={{ fontWeight: 650, color: 'var(--ink)' }}>astrologer-demo</span> account
          only. The remaining catalog entries are static seed records with no account behind them,
          so no action is offered for them rather than showing a change that could not persist. Note
          that the sign-in path in <code>AuthContext</code> still checks only email and password, so
          a Suspended or Blocked label is descriptive on this build rather than enforced. The
          Astrologers list still shows availability in its Status column; it has no account-status
          column and none was added.
        </p>
      </Card>
    </div>
  )
}

// Instant calls have no admin listing route, so the tile reports the real store state
// directly rather than the resolved view.
function astrologerCallsReal(calls) {
  return calls.length > 0
}