import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Gavel,
  MessageCircle,
  MessagesSquare,
  PauseCircle,
  Phone,
  PlayCircle,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Star,
  UserCheck,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { useAdmin } from '../../state/AdminContext.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import {
findAdminUser,
  formatDisplayDate,
  getUserAccountStatus,
  getUserJoinedDate,
  getUserLastLogin,
  selectUserAppointments,
  selectUserDisputes,
  selectUserPayments,
  selectUserQuestions,
  selectUserReviews,
  selectUserSubscriptions,
} from '../../utils/adminUsers.js'
import { getQuestionAstrologerName, getQuestionAskedAt } from '../../utils/adminQuestions.js'
import { getAppointmentAstrologerName, getAppointmentDate, getAppointmentTime } from '../../utils/adminAppointments.js'
import { getDisputeId } from '../../utils/adminDisputes.js'
import { getTransactionStatus } from '../../utils/adminPayments.js'
import { parseDisplayDate, sortByDateDesc } from '../../utils/date.js'

// Admin -> User details.
//
// Reference view only, and now read as a profile rather than a stack of tables.
// Every section still reads its data through the same pure selectors as before:
// findAdminUser, selectUserQuestions, selectUserAppointments, selectUserSubscriptions,
// selectUserDisputes, selectUserPayments, selectUserReviews. No selector, data
// source or relationship is duplicated or reimplemented here, and no record is
// created, reshaped or invented.
//
// Two of those selectors are documented as structurally unable to attribute records
// to one account (payments live in a single shared wallet, reviews carry no account
// reference at all). They are surfaced as an explicit "—" with the reason, never as
// a zero that would read as "this user has none".
//
// Nothing here manages a domain: there are no account actions on this page, because
// no block / suspend / edit / delete action exists anywhere in the admin codebase.

const PANEL = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--radius-m)',
  boxShadow: 'var(--shadow-xs)',
}

const RAISED_PANEL = { ...PANEL, background: 'var(--surface-strong)' }



const CAPTION = { fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }

// Sources the account model cannot attribute to a single user. Declared once so the
// summary tile and the section below it can never disagree about availability.
const UNAVAILABLE_SOURCES = {
  payments: 'Payments sit in one shared wallet, so transactions cannot be attributed to an account.',
  reviews: 'Review records carry no account reference, so none can be matched to this user.',
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return `${first}${last}`.toUpperCase()
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

// Aligned information grid: two columns on desktop, one on mobile. Every field is
// label-over-value with identical spacing, so a group of them reads as one block
// rather than as separate boxes. `wide` lets a single field span the full row,
// which is how the trailing Last login field is set on desktop.
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

function readProfileField(user, key) {
  const value = user?.[key]
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  return String(value ?? '').trim()
}

// Birth and horoscope fields are exactly the set AuthContext.updateProfile writes
// as `birthFields`. There is no horoscope attachment or document reference on a
// user record anywhere in the model, so nothing of that kind is shown.
const HOROSCOPE_FIELDS = [
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'birthTime', label: 'Birth time' },
  { key: 'birthPlace', label: 'Birth place' },
  { key: 'rasi', label: 'Rasi' },
  { key: 'nakshatra', label: 'Nakshatra' },
  { key: 'lagna', label: 'Lagna' },
  { key: 'horoscopeDetails', label: 'Horoscope details' },
]

// Same set plus the attachment line. The account model stores no attachment, no
// path and no document reference of any kind, so this entry can only ever render a
// status string. If the model ever gains a real attachment field, readProfileField
// will pick it up and this stops mattering.
const HOROSCOPE_FIELDS_WITH_ATTACHMENT = [
  ...HOROSCOPE_FIELDS,
  { key: 'horoscopeAttachment', label: 'Horoscope attachment' },
]

// Personal attributes outside the birth set. Each is filtered out when the record
// holds no value, so an empty panel states that plainly instead of showing dashes.
const PERSONAL_FIELDS = [
  { key: 'gender', label: 'Gender' },
  { key: 'languages', label: 'Languages' },
  { key: 'bio', label: 'Bio' },
]

// One figure in the admin summary. `available: false` renders a dash plus the reason
// so a missing data source can never be misread as a genuine zero.
//
// `demo` marks a tile whose figure comes from this page's presentation fallback
// rather than from a selector. The figure still renders, but it carries a Demo
// chip whose tooltip repeats the underlying limitation, so a presentation value is
// never passed off as stored data.
//
// When the metric has an existing Admin management page, `to` is set and the tile
// becomes a link to it. Only routes that already exist in App.jsx are ever passed:
// there is no route for instant calls, instant chats or following, so those are not
// part of this summary and nothing here invents a destination.
//
// The surface tokens moved from inline style into utility classes purely so the
// group-hover treatment can reach them; an inline declaration would outrank a
// Tailwind utility and the hover would never apply. The rendered values are
// unchanged, including the dashed border on an unavailable tile.
function SummaryTile({ icon: Icon, tone, label, count, available = true, note, to, demo }) {
  // A demo figure behaves like a real one for display, but is always flagged.
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

// How many records each section previews. The section heading always shows the real
// total, so a truncated preview never hides how much exists. This is a display cap
// only — it is not pagination, and no record is dropped from the data.
const PREVIEW_LIMIT = 3

// Honest remainder line: how many real records sit behind the preview. It reports a
// count of existing rows, never an estimate.
function previewOverflow(total) {
  if (total <= PREVIEW_LIMIT) return null
  const hidden = total - PREVIEW_LIMIT
  return `+${hidden} more record${hidden === 1 ? '' : 's'}`
}

// Instant call / chat attribution mirrors consultationUserId() in
// utils/memberCommunicationActivity.js: a consultation session may carry either
// field, and neither one is ever invented here.
function consultationOwnerId(session) {
  return session?.userId || session?.customerId || null
}

// AppDataContext exposes one `consultationHistory` collection holding both instant
// call and instant chat sessions. Each record carries its own type, so the two are
// split apart here rather than being treated as two different stores.
const INSTANT_CALL_TYPE = 'Audio Call'
const INSTANT_CHAT_TYPE = 'Chat'

function selectUserConsultations(consultationHistory, userId) {
  if (!userId) return { calls: [], chats: [] }
  const mine = (Array.isArray(consultationHistory) ? consultationHistory : [])
    .filter((session) => consultationOwnerId(session) === userId)
  const newestFirst = (a, b) => sortByDateDesc(a, b, (row) => row.startedAt)
  return {
    calls: mine.filter((session) => session.type === INSTANT_CALL_TYPE).sort(newestFirst),
    chats: mine.filter((session) => session.type === INSTANT_CHAT_TYPE).sort(newestFirst),
  }
}

// Open disputes first, then most recent. Both orderings read fields the record
// already carries, so nothing is added to decide priority.
function prioritiseDisputes(questions, userId) {
  return selectUserDisputes(questions, userId)
    .slice()
    .sort((a, b) => {
      const openA = String(a.dispute?.status || '').trim().toLowerCase() === 'open' ? 0 : 1
      const openB = String(b.dispute?.status || '').trim().toLowerCase() === 'open' ? 0 : 1
      return openA - openB || sortByDateDesc(a, b, (row) => row.dispute?.raisedAt || row.raisedAt)
    })
}

// A short accent rule in a section's own colour, plus a barely-there tint of the
// same hue over the panel. Both are derived from the theme's own variables, so
// light and dark mode stay correct and nothing is hardcoded.
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

// One full-width section: heading, then a comfortable panel led by a small icon
// tile in the service's own colour and a count badge tinted to match. That pairing
// is what lets the eye find a section without colouring the card body at all.
// `to` is passed only when records exist, so an empty or unavailable section never
// offers a dead destination.
function RecordSection({ icon: Icon, tone = 'neutral', title, count, to, children, accent, note, demo }) {
  return (
    <Section title={title} icon={Icon}>
      <Card style={accent ? { ...PANEL, padding: 0, overflow: 'hidden', borderLeft: accent } : { ...PANEL, padding: 0, overflow: 'hidden' }}>
        <div
          className="flex items-center justify-between gap-3"
          style={{ padding: '13px 22px 12px' }}
        >
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

// Individual records get their own accent, rotating through this list so
// consecutive rows inside a section are always distinguishable. Each entry is an
// existing .tone-* class, which supplies both the tile background and its
// foreground from the theme — that is why the tile takes a class rather than a
// hand-picked colour (tone-rose, for instance, has no matching palette variable).
// The accent is deliberately confined to the tile: the record text, the muted
// metadata and the status badge all keep their own colours, so status meaning is
// never overridden for decoration.
const RECORD_ACCENTS = ['violet', 'sky', 'teal', 'gold', 'rose']

// Matching per-record background wash, in the same order as RECORD_ACCENTS so a
// row's tile and its background always belong to the same colour family. Each
// entry is an existing light surface token from the theme that is also redefined
// under html[data-theme='dark'], mixed into the row at low opacity so the result
// reads as a soft tint rather than a coloured card.
// --gold-100 is deliberately not used here: it is the one warm tint the dark theme
// does not redefine, and because a row tint covers the whole row it would read as
// a pale band in dark mode. --warning-bg is its theme-aware equivalent. Likewise
// tone-rose has no light tint of its own, so its row falls back to the neutral
// wash; at the current preview limit only the first three entries ever render.
const RECORD_TINTS = ['--primary-bg', '--sky-bg', '--success-bg', '--warning-bg', '--neutral-bg']

// How strongly the tint is mixed in. Deliberately low: the row must still read as
// an ordinary record with a hint of colour, in both light and dark mode.
const RECORD_TINT_OPACITY = 60

// ---------------------------------------------------------------------------
// Account status actions.
//
// The vocabulary is not new: these are exactly the three values already stored on
// the record and already read back by getUserAccountStatus(), which is what the
// Admin Users status filter matches on. `status` below is the value written back.
//
// The list is keyed by the account's CURRENT state, so an action is never offered
// that would contradict it — a blocked account cannot be "blocked" again, and a
// suspended account is never shown "Activate" alongside "Suspend".
//
// Block is the strongest state the model records, so a blocked account is only
// offered a way back out. Offering "Suspend" there would be a downgrade that the
// three-value model cannot represent meaningfully.
// ---------------------------------------------------------------------------
const USER_STATUS_ACTIONS = {
  Active: [
    {
      key: 'suspend',
      label: 'Suspend user',
      Icon: ShieldOff,
      tone: 'amber',
      status: 'suspended',
      confirm: 'Confirm suspension',
      audit: 'User Suspended',
      requiresReason: true,
    },
    {
      key: 'block',
      label: 'Block user',
      Icon: Ban,
      tone: 'red',
      status: 'blocked',
      confirm: 'Confirm block',
      audit: 'User Blocked',
      requiresReason: true,
    },
  ],
  Suspended: [
    {
      key: 'activate',
      label: 'Activate user',
      Icon: ShieldCheck,
      tone: 'green',
      status: 'active',
      confirm: 'Confirm activation',
      audit: 'User Activated',
      requiresReason: false,
    },
    {
      key: 'block',
      label: 'Block user',
      Icon: Ban,
      tone: 'red',
      status: 'blocked',
      confirm: 'Confirm block',
      audit: 'User Blocked',
      requiresReason: true,
    },
  ],
  Blocked: [
    {
      key: 'unblock',
      label: 'Activate / Unblock user',
      Icon: UserCheck,
      tone: 'green',
      status: 'active',
      confirm: 'Confirm unblock',
      audit: 'User Unblocked',
      requiresReason: false,
    },
  ],
}

// Existing semantic tokens per tone. No new colour is introduced.
const ACTION_TOKENS = {
  red: { tint: 'var(--danger-bg)', fg: 'var(--red-600)', solid: 'var(--danger)' },
  amber: { tint: 'var(--warning-bg)', fg: 'var(--amber-600)', solid: 'var(--warning)' },
  green: { tint: 'var(--success-bg)', fg: 'var(--green-600)', solid: 'var(--success)' },
}

// Confirmation modal for a status change. Block and Suspend cannot be confirmed
// without a reason; restoring an account may be confirmed without one.
function StatusConfirmDialog({ action, user, fromStatus, reason, onReasonChange, onCancel, onConfirm }) {
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
        aria-labelledby="status-confirm-title"
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
            <span id="status-confirm-title" style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>
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
          User:{' '}
          <span style={{ fontWeight: 650, color: 'var(--ink)' }}>{user.name || user.id}</span>
          <span className="muted" style={{ fontSize: 12 }}> · {user.id}</span>
        </p>

        <div className="flex items-center gap-2" style={{ marginTop: 12 }}>
          <span className="badge" style={{ background: 'var(--neutral-bg)', color: 'var(--muted)', fontSize: 11 }}>
            {fromStatus}
          </span>
          <ChevronRight size={14} style={{ color: 'var(--muted)', flex: 'none' }} />
          <span
            className="badge"
            style={{ background: tone.tint, color: tone.fg, fontSize: 11 }}
          >
            {action.status}
          </span>
        </div>

        <label
          className="muted"
          htmlFor="status-change-reason"
          style={{ display: 'block', marginTop: 16, fontSize: 12, fontWeight: 600 }}
        >
          Reason{action.requiresReason ? '' : ' (optional)'}
        </label>
        <textarea
          id="status-change-reason"
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
            className={`btn btn-sm ${action.confirmClass || (action.tone === 'green' ? 'btn-success' : 'btn-danger')}`}
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

// ---------------------------------------------------------------------------
// PRESENTATION-ONLY DEMO DATA
//
// Scoped entirely to this file so the profile reads as a complete Admin profile
// during a demo. Nothing here is written to storage, AppDataContext, AdminContext
// or any shared selector — it is read only while rendering this page.
//
// The rules this block obeys:
//   * Real records always win. Every section below falls back to these rows only
//     when its real selector returned nothing for this user, so a genuine record
//     is never replaced, hidden or altered in order to show demo content.
//   * Any section currently rendering these rows says so with a "Demo" chip.
//   * Everything here is invented for presentation: every id, name, date and line
//     of copy. None of it describes a real person, account or transaction.
//   * No credential of any kind appears in this block.
//   * No file, download or attachment URL is invented. The horoscope attachment is
//     reported as a status string only, so nothing is ever fetched.
//   * Real status labels are reused where the data model already defines them, so
//     a demo row cannot imply a status the app does not have.
// ---------------------------------------------------------------------------

const DEMO_PROFILE = {
  // Personal Information fallbacks, keyed to the same field names the account
  // record uses, so a real value always takes precedence.
  personal: {
    gender: 'Female',
    languages: 'English, Tamil',
    bio: 'Presentation-only profile entry used to demonstrate the admin user profile layout.',
  },

  // Horoscope fallbacks. horoscopeAttachment is a status string, never a path.
  horoscope: {
    dateOfBirth: '14 May 1994',
    birthTime: '06:35 AM',
    birthPlace: 'Madurai, Tamil Nadu',
    rasi: 'Mesha (Aries)',
    nakshatra: 'Bharani',
    lagna: 'Simha (Leo)',
    horoscopeDetails: 'Kundli prepared from the birth details above. Mangal dosha indicated.',
    horoscopeAttachment: 'Available (Demo)',
  },

  questions: [
    {
      primary: 'Is October a good time to accept the new role I was offered?',
      secondary: 'QTN-DEMO-0001 · Career · Dr. Rani · Asked 12 Sep 2026',
      statusLabel: 'Answered',
    },
    {
      primary: 'When will the property purchase I am planning finally come through?',
      secondary: 'QTN-DEMO-0002 · Property · Acharya Meena · Asked 28 Aug 2026',
      statusLabel: 'In Progress',
    },
    {
      primary: 'What should I focus on during the first month at work?',
      secondary: 'QTN-DEMO-0003 · Career · Dr. Rani · Asked 09 Aug 2026',
      statusLabel: 'Pending',
    },
  ],

  appointments: [
    {
      primary: 'APT-DEMO-0001',
      secondary: 'Dr. Rani · 22 Sep 2026 · 10:00 AM · Audio Call · ₹499',
      statusLabel: 'Completed',
    },
    {
      primary: 'APT-DEMO-0002',
      secondary: 'Acharya Meena · 18 Sep 2026 · 05:30 PM · Audio Call · ₹699',
      statusLabel: 'Confirmed',
    },
    {
      primary: 'APT-DEMO-0003',
      secondary: 'Dr. Rani · 02 Oct 2026 · 09:15 AM · Video Consultation · ₹799',
      statusLabel: 'Booked',
    },
  ],

  calls: [
    {
      primary: 'CALL-DEMO-0001',
      secondary: 'Dr. Rani · 26 Aug 2026 · 09:30 · 30 min · ₹750',
      statusLabel: 'Completed',
    },
    {
      primary: 'CALL-DEMO-0002',
      secondary: 'Acharya Meena · 14 Aug 2026 · 18:10 · 22 min · ₹550',
      statusLabel: 'Completed',
    },
    {
      primary: 'CALL-DEMO-0003',
      secondary: 'Dr. Rani · 02 Aug 2026 · 20:45 · 15 min · ₹375',
      statusLabel: 'Completed',
    },
  ],

  chats: [
    {
      primary: 'CHAT-DEMO-0001',
      secondary: 'Dr. Rani · 24 Aug 2026 · 19:10 · 26 min · 12 messages · ₹390',
      statusLabel: 'Completed',
    },
    {
      primary: 'CHAT-DEMO-0002',
      secondary: 'Acharya Meena · 11 Aug 2026 · 21:05 · 18 min · 8 messages · ₹270',
      statusLabel: 'Completed',
    },
    {
      primary: 'CHAT-DEMO-0003',
      secondary: 'Dr. Rani · 30 Jul 2026 · 08:40 · 12 min · 6 messages · ₹180',
      statusLabel: 'Completed',
    },
  ],

  subscriptions: [
    {
      primary: 'Dr. Rani',
      secondary: 'Gold · Started 02 Sep 2026 · Ends 02 Oct 2026 · Auto-pay on',
      statusLabel: 'Active',
    },
    {
      primary: 'Acharya Meena',
      secondary: 'Silver · Started 12 Aug 2026 · Ends 12 Sep 2026',
      statusLabel: 'Expired',
    },
    {
      primary: 'Arjun Sharma',
      secondary: 'Silver · Started 20 Jul 2026 · Ends 20 Aug 2026',
      statusLabel: 'Expired',
    },
  ],

  following: [
    { primary: 'Dr. Rani', secondary: 'Vedic Astrology · Followed 04 Sep 2026', statusLabel: 'Online' },
    { primary: 'Acharya Meena', secondary: 'Vedic Astrology · Followed 18 Aug 2026', statusLabel: 'Offline' },
    { primary: 'Arjun Sharma', secondary: 'Numerology · Followed 02 Jul 2026', statusLabel: 'Online' },
  ],

  payments: [
    { primary: 'TXN-DEMO-0001', secondary: 'Question purchase · ₹250 · 12 Sep 2026', statusLabel: 'Completed' },
    { primary: 'TXN-DEMO-0002', secondary: 'Audio consultation · ₹499 · 22 Sep 2026', statusLabel: 'Completed' },
    { primary: 'TXN-DEMO-0003', secondary: 'Instant chat · ₹390 · 24 Aug 2026', statusLabel: 'Refunded' },
  ],

  disputes: [
    {
      primary: 'DSP-DEMO-0001',
      secondary:
        'Related question QTN-DEMO-0001 · Against Astrologer · The answer did not address the timing question · Raised 20 Sep 2026',
      statusLabel: 'Open',
    },
    {
      primary: 'DSP-DEMO-0002',
      secondary:
        'Related question QTN-DEMO-0002 · Against Astrologer · Refund requested after a delayed answer · Raised 05 Sep 2026',
      statusLabel: 'Under Review',
    },
    {
      primary: 'DSP-DEMO-0003',
      secondary:
        'Related question QTN-DEMO-0003 · Against Astrologer · Clarification requested on the reported timeline · Raised 21 Aug 2026',
      statusLabel: 'Closed',
    },
  ],

  reviews: [
    {
      primary: 'Dr. Rani',
      secondary: 'Very clear guidance, and the timing matched what happened. · 14 Sep 2026',
      statusLabel: '5 / 5',
    },
    {
      primary: 'Acharya Meena',
      secondary: 'Patient and thorough, though the reply took a while. · 03 Sep 2026',
      statusLabel: '4 / 5',
    },
    {
      primary: 'Dr. Rani',
      secondary: 'Helpful session, would have liked a little more detail. · 27 Aug 2026',
      statusLabel: '4 / 5',
    },
  ],
}

// Per-user demo presentation: the fallback rows above are the base set, and
// demoProfileFor rotates astrologer names, id prefixes, months, horoscope fields
// and a few status mixes deterministically from the account id, so two different
// demo accounts no longer render the identical record set. Real selectors still
// win for every section, exactly as before, and only fallback rows are rotated.
function demoProfileFor(user) {
  const id = String(user?.id || '')
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const variant = hash % 3
  if (variant === 0) return DEMO_PROFILE

  const rot = variant === 1
    ? { 'Dr. Rani': 'Acharya Meena', 'Acharya Meena': 'Arjun Sharma', 'Arjun Sharma': 'Dr. Rani' }
    : { 'Dr. Rani': 'Arjun Sharma', 'Acharya Meena': 'Dr. Rani', 'Arjun Sharma': 'Acharya Meena' }
  const spools = variant === 1
    ? { 'QTN-DEMO-000': 'QTN-DEMO-010', 'APT-DEMO-000': 'APT-DEMO-010', 'CALL-DEMO-000': 'CALL-DEMO-010', 'CHAT-DEMO-000': 'CHAT-DEMO-010', 'TXN-DEMO-000': 'TXN-DEMO-010', 'DSP-DEMO-000': 'DSP-DEMO-010', 'Sep 2026': 'Oct 2026', 'Aug 2026': 'Sep 2026', 'Jul 2026': 'Aug 2026', Bharani: 'Rohini', 'Mesha (Aries)': 'Vrishabha (Taurus)', 'Madurai, Tamil Nadu': 'Pune, Maharashtra', 'Simha (Leo)': 'Dhanu (Sagittarius)', 'English, Tamil': 'English, Hindi', 'Mangal dosha indicated.': 'Shani transit period indicated.' }
    : { 'QTN-DEMO-000': 'QTN-DEMO-020', 'APT-DEMO-000': 'APT-DEMO-020', 'CALL-DEMO-000': 'CALL-DEMO-020', 'CHAT-DEMO-000': 'CHAT-DEMO-020', 'TXN-DEMO-000': 'TXN-DEMO-020', 'DSP-DEMO-000': 'DSP-DEMO-020', 'Sep 2026': 'Nov 2026', 'Aug 2026': 'Oct 2026', 'Jul 2026': 'Sep 2026', Bharani: 'Ashwini', 'Mesha (Aries)': 'Mithuna (Gemini)', 'Madurai, Tamil Nadu': 'Jaipur, Rajasthan', 'Simha (Leo)': 'Kanya (Virgo)', 'English, Tamil': 'Tamil, Hindi', 'Mangal dosha indicated.': 'No major dosha indicated.' }

  const apply = (value) => {
    if (!value) return value
    let out = String(value).replace(/Dr\. Rani|Acharya Meena|Arjun Sharma/g, (m) => rot[m])
    for (const [from, to] of Object.entries(spools)) out = out.split(from).join(to)
    return out
  }
  const mapRow = (row) => ({
    ...row,
    primary: apply(row.primary),
    secondary: apply(row.secondary),
    statusLabel:
      variant === 1 && row.statusLabel === 'Pending'
        ? 'Answered'
        : variant === 2 && row.statusLabel === 'Answered'
          ? 'In Progress'
          : row.statusLabel,
  })
  const personal = {}
  for (const key of Object.keys(DEMO_PROFILE.personal)) personal[key] = apply(DEMO_PROFILE.personal[key])
  const horoscope = {}
  for (const key of Object.keys(DEMO_PROFILE.horoscope)) horoscope[key] = apply(DEMO_PROFILE.horoscope[key])
  return {
    personal,
    horoscope,
    questions: DEMO_PROFILE.questions.map(mapRow),
    appointments: DEMO_PROFILE.appointments.map(mapRow),
    calls: DEMO_PROFILE.calls.map(mapRow),
    chats: DEMO_PROFILE.chats.map(mapRow),
    subscriptions: DEMO_PROFILE.subscriptions.map(mapRow),
    following: DEMO_PROFILE.following.map(mapRow),
    payments: DEMO_PROFILE.payments.map(mapRow),
    disputes: DEMO_PROFILE.disputes.map(mapRow),
    reviews: DEMO_PROFILE.reviews.map(mapRow),
  }
}

// Demo AutoPay identity for accounts with no real rule on file. Same contract as
// the rest of the presentation layer: shown only when no real rule exists, always
// flagged with a Demo chip, and never written anywhere.
function demoAutopayFor(user) {
  const id = String(user?.id || '')
  let hash = 0
  for (const ch of id) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0
  const variant = hash % 4
  if (variant === 3) {
    return { state: AUTOPAY_NO_RULE, plan: null, astrologer: null, autoRenew: 'Off', setUpOn: null, nextRun: null }
  }
  const plans = [
    { state: AUTOPAY_ACTIVE, plan: 'Gold', astrologer: 'Dr. Rani', autoRenew: 'On', setUpOn: '02 Sep 2026', nextRun: '02 Nov 2026' },
    { state: AUTOPAY_PAUSED, plan: 'Silver', astrologer: 'Acharya Meena', autoRenew: 'Paused', setUpOn: '12 Aug 2026', nextRun: null },
    { state: AUTOPAY_CANCELLED, plan: 'Platinum', astrologer: 'Arjun Sharma', autoRenew: 'Cancelled', setUpOn: '20 Jul 2026', nextRun: null },
  ]
  return plans[variant]
}

// Real rows always take precedence; these rows are a fallback only. `statusLabel`
// on a demo row becomes a real StatusBadge, so a demo record still renders through
// the same status component as live data.
function resolveRows(realRows, demoRows, StatusBadge) {
  if (realRows.length > 0) return { rows: realRows, isDemo: false }
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

// Records are stacked rather than tabular so a long question excerpt or a dispute
// reason stays readable. Type is sized for full width — readability comes first.
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
            // Background only. No text, status, icon, border or spacing is touched.
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

// Subscriptions carry no status field. Derived from the record's own expiresAt,
// the same way utils/appointments.js derives its own date-based phases.
function getSubscriptionStatus(subscription) {
  const expiresAt = parseDisplayDate(subscription?.expiresAt).getTime()
  if (expiresAt <= 0) return 'Unknown'
  return expiresAt >= Date.now() ? 'Active' : 'Expired'
}

// ---------------------------------------------------------------------------
// AutoPay
//
// An AutoPay record is real: AppDataContext keeps a `userAutopays` collection with
// real create/update actions and a real three-value status (active / paused /
// revoked). What it does NOT carry is a userId, so a rule cannot be matched to this
// account directly. The one real link is the subscription's own `autopayId`, and
// selectUserAutopayRules below resolves ownership through exactly that. A
// subscription that claims autopayEnabled while its rule cannot be found is reported
// as having no rule, because an inconsistent store is not evidence of a live mandate.
//
// The stored vocabulary is reused verbatim; nothing here introduces a status.
// ---------------------------------------------------------------------------
const AUTOPAY_ACTIVE = 'Active'
const AUTOPAY_PAUSED = 'Paused'
const AUTOPAY_CANCELLED = 'Cancelled'
const AUTOPAY_NO_RULE = 'No AutoPay Rule'

// Maps a stored autopay status onto the wording above. `revoked` is the model's own
// terminal value and reads as "Cancelled" because that is what it means to a
// customer. An absent or unrecognised status returns null rather than defaulting to
// a healthy state.
function autopayLabel(autopay) {
  const stored = String(autopay?.status || '').trim().toLowerCase()
  if (stored === 'active') return AUTOPAY_ACTIVE
  if (stored === 'paused') return AUTOPAY_PAUSED
  if (stored === 'revoked') return AUTOPAY_CANCELLED
  return null
}

// Every autopay rule reachable from this account's subscriptions.
function selectUserAutopayRules(subscriptions, userAutopays, userId) {
  if (!userId) return []
  const rules = Array.isArray(userAutopays) ? userAutopays : []
  if (!rules.length) return []

  const referenced = new Set(
    (Array.isArray(subscriptions) ? subscriptions : [])
      .filter((subscription) => subscription?.userId === userId)
      .map((subscription) => subscription?.autopayId)
      .filter(Boolean),
  )
  if (!referenced.size) return []

  return rules.filter((autopay) => referenced.has(autopay?.id))
}

// The single state shown for the account. An account can hold more than one rule, so
// the states are ranked: a live rule outranks a paused one, which outranks a
// cancelled one.
function userAutopayState(rules) {
  if (!rules.length) return AUTOPAY_NO_RULE
  const labels = rules.map(autopayLabel).filter(Boolean)
  if (labels.includes(AUTOPAY_ACTIVE)) return AUTOPAY_ACTIVE
  if (labels.includes(AUTOPAY_PAUSED)) return AUTOPAY_PAUSED
  if (labels.includes(AUTOPAY_CANCELLED)) return AUTOPAY_CANCELLED
  return AUTOPAY_NO_RULE
}

// Admin actions, per current state.
//
// Every one of these changes only whether the platform will attempt a future
// automatic charge. None of them touches the account status, the subscription, the
// wallet balance, any question payment or any dispute — pausing a mandate is a
// separate decision from suspending an account, and the two must stay separable. A
// user whose subscription is Active while their AutoPay is Paused is a valid,
// reachable state and these actions produce exactly that.
//
// `requiresReason` is true for all three: each one changes whether money may be
// taken automatically, so none is confirmed without an admin-supplied reason.
//
// Cancelled deliberately has no entry. The model stores `revoked` as terminal and
// nothing anywhere in the app re-enables it — the user's own AutoPay page offers
// only pause, resume-from-paused and revoke. Offering Resume on a revoked rule would
// write `active` over a terminal state and misrepresent it.
const AUTOPAY_ACTIONS = {
  [AUTOPAY_ACTIVE]: [
    {
      key: 'pause',
      label: 'Pause AutoPay',
      Icon: PauseCircle,
      tone: 'amber',
      status: 'paused',
      confirm: 'Confirm pause',
      audit: 'AutoPay Paused',
      // Pausing is reversible, so it does not wear the destructive button style.
      confirmClass: 'btn-primary',
      detail: 'Stops future automatic payment attempts. The subscription and the wallet are untouched, and the rule can be resumed later.',
      requiresReason: true,
    },
    {
      key: 'cancel',
      label: 'Cancel AutoPay',
      Icon: Ban,
      tone: 'red',
      status: 'revoked',
      confirm: 'Confirm cancellation',
      audit: 'AutoPay Cancelled',
      detail: 'Ends the rule for good. The subscription continues on its own terms, no refund is issued, and a new AutoPay setup would be needed to charge automatically again.',
      requiresReason: true,
    },
  ],
  [AUTOPAY_PAUSED]: [
    {
      key: 'resume',
      label: 'Resume AutoPay',
      Icon: PlayCircle,
      tone: 'green',
      status: 'active',
      confirm: 'Confirm resume',
      audit: 'AutoPay Resumed',
      detail: 'Allows future automatic payment attempts to resume under the rule’s existing terms. Nothing is charged at the moment of resuming.',
      requiresReason: true,
    },
    {
      key: 'cancel',
      label: 'Cancel AutoPay',
      Icon: Ban,
      tone: 'red',
      status: 'revoked',
      confirm: 'Confirm cancellation',
      audit: 'AutoPay Cancelled',
      detail: 'Ends the rule for good. The subscription continues on its own terms, no refund is issued, and a new AutoPay setup would be needed to charge automatically again.',
      requiresReason: true,
    },
  ],
}

// Stated rather than implied. Each note reports a real limit of the current model.
const AUTOPAY_SECTION_NOTES = {
  [AUTOPAY_ACTIVE]:
    'This rule is stored as active with a scheduled next run, but this build has no scheduler that executes AutoPay rules, so no automatic payment will actually be attempted.',
  [AUTOPAY_PAUSED]:
    'This rule is paused and makes no automatic payment attempts. The linked subscription is unaffected and continues on its own terms.',
  [AUTOPAY_CANCELLED]:
    'This rule was cancelled and cannot be resumed from here — the model treats a cancelled rule as final. It will not attempt any payment, and a new AutoPay setup is required before automatic payments can run again.',
  [AUTOPAY_NO_RULE]: null,
}

// The two rule types the model defines, labelled as the user's own AutoPay page
// labels them. An unrecognised type is left unlabelled rather than guessed at.
const AUTOPAY_TYPE_LABELS = {
  subscription: 'Subscription Renewal',
  'low-balance': 'Low Balance Top-up',
}

const AUTOPAY_BADGE_TONES = {
  [AUTOPAY_ACTIVE]: { background: 'var(--success-bg)', color: 'var(--green-600)' },
  [AUTOPAY_PAUSED]: { background: 'var(--warning-bg)', color: 'var(--amber-600)' },
  [AUTOPAY_CANCELLED]: { background: 'var(--danger-bg)', color: 'var(--red-600)' },
  [AUTOPAY_NO_RULE]: { background: 'var(--neutral-bg)', color: 'var(--muted)' },
}

function AutoPayStateBadge({ state }) {
  const tone = AUTOPAY_BADGE_TONES[state] || AUTOPAY_BADGE_TONES[AUTOPAY_NO_RULE]
  return (
    <span className="badge" style={{ background: tone.background, color: tone.color, fontSize: 11 }}>
      {state}
    </span>
  )
}

// One label/value pair. A value the record does not carry is simply not rendered, so
// the row never shows a placeholder that could read as stored data.
function AutoPayFact({ label, value }) {
  if (!value) return null
  return (
    <span style={{ minWidth: 0 }}>
      <span className="muted" style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ display: 'block', marginTop: 3, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
        {value}
      </span>
    </span>
  )
}

// Human summary of a stored payment method, resolved through the rule's own
// paymentMethodId. Only fields the method record actually carries are read; a rule
// whose method is missing reports nothing rather than falling back to a card or bank
// that was never stored.
function describePaymentMethod(method) {
  if (!method) return null
  if (method.type === 'bank') {
    return [method.bankName, method.accountType, method.accountNumber ? `••••${String(method.accountNumber).slice(-4)}` : null]
      .filter(Boolean)
      .join(' · ')
  }
  if (method.type === 'upi') return [method.upiProvider, method.upiId].filter(Boolean).join(' · ')
  if (method.type === 'card') {
    return [method.cardNetwork, method.cardType, method.cardNumber ? `••••${String(method.cardNumber).slice(-4)}` : null]
      .filter(Boolean)
      .join(' · ')
  }
  return null
}

// Resolves a stored payment method id to its record, so a rule can show the method
// it actually points at. Returns null when the method is absent — a rule never falls
// back to a made-up card or bank.
function getAutopayPaymentMethod(userPaymentMethods, paymentMethodId) {
  if (!paymentMethodId) return null
  return (Array.isArray(userPaymentMethods) ? userPaymentMethods : [])
    .find((method) => method?.id === paymentMethodId) || null
}

export default function AdminUserDetails() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const { users, setUserAccountStatus } = useAuth()
  const { recordAudit } = useAdmin()
  const { subscriptions, questions, appointments, consultationHistory, userAutopays, userPaymentMethods, actions } = useAppData()

  // Status-action UI state. Nothing is written until the dialog is confirmed.
  const [actionsOpen, setActionsOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [pendingReason, setPendingReason] = useState('')
  const actionsRef = useRef(null)

  // AutoPay action state, kept separate from the account-status state so the two
  // dialogs can never be open at once or write to each other's target.
  const [autopayActionsOpen, setAutopayActionsOpen] = useState(false)
  const [pendingAutopay, setPendingAutopay] = useState(null)
  const [pendingAutopayReason, setPendingAutopayReason] = useState('')
  const autopayActionsRef = useRef(null)

  const user = useMemo(() => findAdminUser(users, userId), [users, userId])

  const userSubscriptions = useMemo(() => selectUserSubscriptions(subscriptions, userId), [subscriptions, userId])
  const userQuestions = useMemo(() => selectUserQuestions(questions, userId), [questions, userId])
  const userAppointments = useMemo(() => selectUserAppointments(appointments, userId), [appointments, userId])
  const userDisputes = useMemo(() => prioritiseDisputes(questions, userId), [questions, userId])
  const userReviews = useMemo(() => selectUserReviews(), [])
  const userPayments = useMemo(() => selectUserPayments(), [])
  const userAutopayRules = useMemo(
    () => selectUserAutopayRules(subscriptions, userAutopays, userId),
    [subscriptions, userAutopays, userId],
  )
  const autopayState = userAutopayState(userAutopayRules)
  const demoAutopay = useMemo(() => demoAutopayFor(user), [user])
  const demoProfile = useMemo(() => demoProfileFor(user), [user])
  const { calls: userCalls, chats: userChats } = useMemo(
    () => selectUserConsultations(consultationHistory, userId),
    [consultationHistory, userId],
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

  // Same dismissal behaviour for the AutoPay menu.
  useEffect(() => {
    if (!autopayActionsOpen) return undefined
    const onPointerDown = (event) => {
      if (autopayActionsRef.current && !autopayActionsRef.current.contains(event.target)) setAutopayActionsOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setAutopayActionsOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [autopayActionsOpen])

  if (!user) {
    return <Navigate to={`${routes.base}/users`} replace />
  }

  const backToUsers = () => navigate(`${routes.base}/users`)

  const accountStatus = getUserAccountStatus(user)

  // The value actually stored on the record, for the audit trail. Defaults to
  // 'active' because that is what getUserAccountStatus() reports when absent.
  const storedStatus = String(user.status || user.accountStatus || '').trim().toLowerCase() || 'active'

  const availableStatusActions = USER_STATUS_ACTIONS[accountStatus] || []

  // Selecting a menu item only opens the dialog. The status is not touched here.
  const requestStatusAction = (action) => {
    setActionsOpen(false)
    setPendingReason('')
    setPendingAction(action)
  }

  const cancelStatusAction = () => {
    setPendingAction(null)
    setPendingReason('')
  }

  // Action -> confirmation -> reason -> confirm. This is the only place a status
  // is written, and every write is paired with an admin audit entry.
  const confirmStatusAction = () => {
    if (!pendingAction) return
    const reason = pendingReason.trim()
    if (pendingAction.requiresReason && !reason) return

    setUserAccountStatus(user.id, pendingAction.status)
    recordAudit(
      pendingAction.audit,
      'User Management',
      [
        `${user.name || 'User'} (${user.id})`,
        `${storedStatus} → ${pendingAction.status}`,
        reason ? `Reason: ${reason}` : 'Reason: not provided',
      ].join(' · '),
    )
    cancelStatusAction()
  }

  // ---- AutoPay actions ----------------------------------------------------
  // Selecting an AutoPay action only opens the dialog. The rule is not touched until
  // an admin supplies a reason and confirms.

  // Only a rule that actually holds the action's source state is offered, so the
  // menu can never present "Pause" for a rule that is already paused.
  const autopayTarget = userAutopayRules.find((rule) => {
    const stored = String(rule?.status || '').trim().toLowerCase()
    if (autopayState === AUTOPAY_ACTIVE) return stored === 'active'
    if (autopayState === AUTOPAY_PAUSED) return stored === 'paused'
    return false
  }) || null

  const availableAutopayActions = AUTOPAY_ACTIONS[autopayState] || []

  const requestAutopayAction = (action) => {
    setAutopayActionsOpen(false)
    setPendingAutopayReason('')
    setPendingAutopay(action)
  }

  const cancelAutopayAction = () => {
    setPendingAutopay(null)
    setPendingAutopayReason('')
  }

  // The single write point for AutoPay: Action -> confirmation -> required reason ->
  // confirm -> persist -> audit.
  //
  // It calls the existing updateUserAutopay() action, the same one the user's own
  // AutoPay page uses, and stamps revokedAt on cancellation exactly as that page
  // does, so the stored record shape does not drift.
  //
  // It touches nothing else: not the account status, not the subscription, not the
  // wallet, not any question payment or dispute. The reason is mandatory, so the
  // guard below cannot be bypassed by an empty field.
  const confirmAutopayAction = () => {
    if (!pendingAutopay || !autopayTarget) return
    const reason = pendingAutopayReason.trim()
    if (!reason) return

    const before = String(autopayTarget.status || '').trim().toLowerCase()
    const patch = { status: pendingAutopay.status }
    if (pendingAutopay.status === 'revoked') patch.revokedAt = new Date().toISOString()

    actions.updateUserAutopay(autopayTarget.id, patch)
    recordAudit(
      pendingAutopay.audit,
      'User Management',
      [
        `${user.name || 'User'} (${user.id})`,
        `AutoPay ${autopayTarget.id}: ${before} → ${pendingAutopay.status}`,
        `Reason: ${reason}`,
      ].join(' · '),
    )
    cancelAutopayAction()
  }

  // always wins; the presentation fallback only fills a field the record leaves
  // empty, and the two `*IsDemo` flags report when that happened so the panel can
  // say so rather than pass a fallback value off as stored data.
  const personalFields = PERSONAL_FIELDS
    .map((field) => ({
      label: field.label,
      value: readProfileField(user, field.key) || demoProfile.personal[field.key] || '',
    }))
    .filter((field) => field.value)

  const personalIsDemo = PERSONAL_FIELDS.some(
    (field) => !readProfileField(user, field.key) && demoProfile.personal[field.key],
  )

  const horoscopeFields = HOROSCOPE_FIELDS_WITH_ATTACHMENT
    .map((field) => ({
      label: field.label,
      value: readProfileField(user, field.key) || demoProfile.horoscope[field.key] || '',
    }))
    .filter((field) => field.value)

  const horoscopeIsDemo = HOROSCOPE_FIELDS_WITH_ATTACHMENT.some(
    (field) => !readProfileField(user, field.key) && demoProfile.horoscope[field.key],
  )

  // Preview rows for every activity section. Each is built from its real records
  // exactly as before and only falls back to the presentation rows when that
  // source had nothing for this user.
  const questionsView = resolveRows(
    userQuestions.map((question) => ({
      key: question.id,
      primary: question.question || question.id,
      secondary: [
        question.id,
        question.category,
        getQuestionAstrologerName(question),
        `Asked ${formatDisplayDate(getQuestionAskedAt(question))}`,
      ].filter(Boolean).join(' · '),
      statusLabel: question.status,
      status: <StatusBadge label={question.status} />,
      to: `${routes.base}/text-based-questions/${question.id}`,
    })),
    demoProfile.questions,
    StatusBadge,
  )

  const appointmentsView = resolveRows(
    userAppointments.map((appointment) => ({
      key: appointment.id,
      primary: appointment.id,
      secondary: [
        getAppointmentAstrologerName(appointment),
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
    demoProfile.appointments,
    StatusBadge,
  )

  const callsView = resolveRows(
    userCalls.map((session) => ({
      key: session.id,
      primary: session.id,
      secondary: [
        getAppointmentAstrologerName(session),
        `Started ${formatDisplayDate(session.startedAt)}`,
        session.durationMinutes != null ? `${session.durationMinutes} min` : null,
        session.amount != null ? `₹${session.amount}` : null,
      ].filter(Boolean).join(' · '),
      statusLabel: session.status,
      status: <StatusBadge label={session.status} />,
    })),
    demoProfile.calls,
    StatusBadge,
  )

  const chatsView = resolveRows(
    userChats.map((session) => ({
      key: session.id,
      primary: session.id,
      secondary: [
        getAppointmentAstrologerName(session),
        `Started ${formatDisplayDate(session.startedAt)}`,
        session.durationMinutes != null ? `${session.durationMinutes} min` : null,
        Array.isArray(session.messages) ? `${session.messages.length} messages` : null,
        session.amount != null ? `₹${session.amount}` : null,
      ].filter(Boolean).join(' · '),
      statusLabel: session.status,
      status: <StatusBadge label={session.status} />,
    })),
    demoProfile.chats,
    StatusBadge,
  )

  const subscriptionsView = resolveRows(
    userSubscriptions.map((subscription) => ({
      key: `${subscription.astrologerId || ''}-${subscription.subscribedAt || ''}`,
      primary: subscription.astrologerName || subscription.astrologerId,
      secondary: [
        subscription.tier,
        `Started ${formatDisplayDate(subscription.subscribedAt)}`,
        `Ends ${formatDisplayDate(subscription.expiresAt)}`,
        subscription.autopayEnabled ? 'Auto-pay on' : null,
      ].filter(Boolean).join(' · '),
      statusLabel: getSubscriptionStatus(subscription),
      status: <StatusBadge label={getSubscriptionStatus(subscription)} />,
    })),
    demoProfile.subscriptions,
    StatusBadge,
  )

  const followingView = resolveRows([], demoProfile.following, StatusBadge)

  const paymentsView = resolveRows(
    userPayments.map((payment) => ({
      key: payment.id,
      primary: payment.id,
      secondary: [payment.typeLabel || payment.type, payment.amount, formatDisplayDate(payment.date)]
        .filter(Boolean).join(' · '),
      statusLabel: getTransactionStatus(payment),
      status: getTransactionStatus(payment)
        ? <StatusBadge label={getTransactionStatus(payment)} />
        : null,
      to: `${routes.base}/payments/${payment.id}`,
    })),
    demoProfile.payments,
    StatusBadge,
  )

  const disputesView = resolveRows(
    userDisputes.map((question) => {
      const dispute = question.dispute
      return {
        key: question.id,
        primary: getDisputeId({ dispute }) || question.id,
        secondary: [
          `Related question ${question.id}`,
          dispute?.target ? `Against ${dispute.target}` : null,
          dispute?.reason,
          dispute?.response ? `Response: ${dispute.response}` : null,
          dispute?.raisedAt ? `Raised ${formatDisplayDate(dispute.raisedAt)}` : null,
        ].filter(Boolean).join(' · '),
        statusLabel: dispute?.status,
        status: <StatusBadge label={dispute?.status} />,
        to: `${routes.base}/disputes/${question.id}`,
      }
    }),
    demoProfile.disputes,
    StatusBadge,
  )

  const reviewsView = resolveRows(
    userReviews.map((review) => ({
      key: review.id,
      primary: review.astrologer || review.name,
      secondary: [review.text, formatDisplayDate(review.date)].filter(Boolean).join(' · '),
      statusLabel: review.rating != null ? `${review.rating} / 5` : null,
      status: review.rating != null
        ? <span className="muted" style={{ fontSize: 12.5, fontWeight: 650, whiteSpace: 'nowrap' }}>
            {review.rating}
          </span>
        : null,
    })),
    demoProfile.reviews,
    StatusBadge,
  )

  // An unresolved dispute is the one thing on this page an admin must not scroll
  // past, so its section is accented only while one is actually open. Read from
  // whichever rows are on screen, so the accent always matches what is displayed.
  const hasUnresolvedDispute = disputesView.rows.some(
    (row) => String(row.statusLabel || '').trim().toLowerCase() === 'open',
  )

  const summaryTiles = [
    {
      icon: MessageCircle,
      tone: 'green',
      label: 'Questions',
      count: userQuestions.length,
      available: true,
      to: `${routes.base}/text-based-questions`,
    },
    {
      icon: CalendarDays,
      tone: 'teal',
      label: 'Appointments',
      count: userAppointments.length,
      available: true,
      to: `${routes.base}/appointments`,
    },
    {
      icon: Star,
      tone: 'gold',
      label: 'Subscriptions',
      count: userSubscriptions.length,
      available: true,
      to: `${routes.base}/subscriptions`,
    },
    {
      icon: Wallet,
      tone: 'sky',
      label: 'Payments',
      // Reads the same resolved view the Payments & Wallet activity section uses,
      // so the summary figure and the rows below it can never disagree. A real
      // attributed transaction would always win; the presentation rows are only a
      // fallback, and `demo` marks the figure when they are what is on screen.
      count: paymentsView.rows.length,
      available: true,
      demo: paymentsView.isDemo,
      note: UNAVAILABLE_SOURCES.payments,
      to: `${routes.base}/payments`,
    },
    {
      icon: Gavel,
      tone: 'red',
      label: 'Disputes',
      count: userDisputes.length,
      available: true,
      to: `${routes.base}/disputes`,
    },
    {
      icon: Receipt,
      tone: 'neutral',
      label: 'Reviews',
      // Same source as the Reviews & Ratings activity section: real user-linked
      // reviews win, otherwise the presentation rows are shown and flagged.
      count: reviewsView.rows.length,
      available: true,
      demo: reviewsView.isDemo,
      note: UNAVAILABLE_SOURCES.reviews,
      to: `${routes.base}/reviews`,
    },
  ]

  return (
    <div className="tbq-page">
      {/* ---- Profile header ----
          Identity accent only: a whisper of the brand tint behind the raised
          surface, a slightly larger monogram and one short violet rule. */}
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
                {getInitials(user.name)}
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
                  {user.name || 'User'}
                </span>
                <StatusBadge label={accountStatus} />
              </span>
              <span className="muted" style={{ fontSize: 12.5, fontWeight: 500, letterSpacing: '0.02em' }}>
                {user.id || 'No user ID on record'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2" style={{ flex: 'none' }}>
            {/* ---- Status actions ----
                Selecting an item only opens the confirmation dialog. Nothing is
                written until the reason has been confirmed there. */}
            <div className="relative" ref={actionsRef}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setActionsOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={actionsOpen}
                aria-label={`Account actions for ${user.name || 'user'}`}
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
                    minWidth: 218,
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

            <button type="button" className="btn btn-ghost btn-sm" onClick={backToUsers} style={{ flex: 'none' }}>
              <ArrowLeft size={15} /> Back to Users
            </button>
          </div>
        </div>
      </Card>

      {pendingAction && (
        <StatusConfirmDialog
          action={pendingAction}
          user={user}
          fromStatus={storedStatus}
          reason={pendingReason}
          onReasonChange={setPendingReason}
          onCancel={cancelStatusAction}
          onConfirm={confirmStatusAction}
        />
      )}

      {/* AutoPay confirmation reuses the account-status dialog, so the pattern, the
          required-reason guard and the audit pairing are identical. It renders only
          for a rule that actually holds the action's source state. */}
      {pendingAutopay && autopayTarget && (
        <StatusConfirmDialog
          action={pendingAutopay}
          user={user}
          fromStatus={String(autopayTarget.status || '').trim().toLowerCase()}
          reason={pendingAutopayReason}
          onReasonChange={setPendingAutopayReason}
          onCancel={cancelAutopayAction}
          onConfirm={confirmAutopayAction}
        />
      )}

      {/* ---- Platform Administration ----
          The account-level facts an administrator acts on, in one aligned panel,
          accented in the same blue the Appointments service uses. */}
      <Section title="Platform Administration" icon={ShieldCheck}>
        <AccentPanel accent="--sky-600" wash="--sky-bg">
          <InfoGrid
            fields={[
              { label: 'Name', value: user.name },
              {
                label: 'Email',
                value: user.email ? (
                  <a href={`mailto:${user.email}`} style={{ fontWeight: 600 }}>{user.email}</a>
                ) : '',
              },
              { label: 'Phone', value: user.phone },
              { label: 'Joined', value: formatDisplayDate(getUserJoinedDate(user)) },
              { label: 'Last login', value: formatDisplayDate(getUserLastLogin(user)), wide: true },
            ]}
          />
        </AccentPanel>
      </Section>

      {/* ---- Personal Information ----
          Stored values first, presentation fallbacks only where the record is
          empty. Accented in teal so it reads as a separate panel from the one
          above. */}
      <Section title="Personal Information" icon={UserRound}>
        <AccentPanel accent="--green-600" wash="--success-bg">
          {personalFields.length === 0 && horoscopeFields.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              No additional personal details are stored for this account.
            </p>
          ) : (
            <>
              {(personalIsDemo || horoscopeIsDemo) && (
                <p className="muted" style={{ margin: '0 0 16px', fontSize: 12, lineHeight: 1.55 }}>
                  <span style={{ fontWeight: 650, color: 'var(--ink)' }}>Demo</span>
                  {' — fields marked below are presentation values, not data stored on this account.'}
                </p>
              )}

              {personalFields.length > 0 && <InfoGrid fields={personalFields} />}

              {horoscopeFields.length > 0 && (
                <>
                  {personalFields.length > 0 && (
                    <div
                      aria-hidden="true"
                      style={{ height: 1, background: 'var(--divider)', margin: '20px 0 18px' }}
                    />
                  )}
                  <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
                    <IconTile icon={Sparkles} tone="violet" size={30} />
                    <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--ink)' }}>
                      Horoscope Profile
                    </span>
                  </div>
                  <InfoGrid fields={horoscopeFields} />
                </>
              )}
            </>
          )}
        </AccentPanel>
      </Section>

      {/* ---- Admin summary ---- */}
      <Section title="Admin summary" icon={ShieldCheck}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {summaryTiles.map((tile) => (
            <SummaryTile key={tile.label} {...tile} />
          ))}
        </div>
      </Section>

      {/* ---- Text-Based Questions ---- */}
      <RecordSection
        icon={MessageCircle}
        tone="violet"
        title="Text-Based Questions"
        count={questionsView.rows.length}
        demo={questionsView.isDemo}
        to={userQuestions.length > 0 ? `${routes.base}/text-based-questions` : null}
      >
        <PreviewList
          icon={MessageCircle}
          empty="No questions found for this user."
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
        to={userAppointments.length > 0 ? `${routes.base}/appointments` : null}
      >
        <PreviewList
          icon={CalendarDays}
          empty="No appointments found for this user."
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
        note={callsView.isDemo ? null : 'Instant call history is not available for this user.'}
      >
        <PreviewList
          icon={Phone}
          empty="Instant call history is not available for this user."
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
        note={chatsView.isDemo ? null : 'Instant chat history is not available for this user.'}
      >
        <PreviewList
          icon={MessagesSquare}
          empty="Instant chat history is not available for this user."
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
        to={userSubscriptions.length > 0 ? `${routes.base}/subscriptions` : null}
      >
        <PreviewList
          icon={Star}
          empty="No subscriptions found for this user."
          overflow={previewOverflow(subscriptionsView.rows.length)}
          rows={subscriptionsView.rows}
        />
      </RecordSection>

      {/* ---- Following ----
          There is no user -> astrologer following relationship to read. The app keeps
          one flat followedAstrologerIds list scoped to whoever is signed in, and it
          carries no account reference, so it cannot be attributed to the user being
          viewed and is not shown here. */}
      <RecordSection
        icon={UserCheck}
        tone="rose"
        title="Following"
        count="—"
        note={followingView.isDemo ? null : 'Following information is not available for this user.'}
      >
        <PreviewList
          icon={UserCheck}
          empty="Following information is not available for this user."
          overflow={previewOverflow(followingView.rows.length)}
          rows={followingView.rows}
        />
      </RecordSection>

      {/* ---- Payments ----
          selectUserPayments() cannot attribute wallet transactions to one account,
          so this normally renders the unavailable state and offers no View more. */}
      <RecordSection
        icon={Wallet}
        tone="green"
        title="Payments & Wallet"
        count={paymentsView.rows.length}
        demo={paymentsView.isDemo}
        to={userPayments.length > 0 ? `${routes.base}/payments` : null}
        note={paymentsView.rows.length === 0 ? 'Full payment records are managed in the Payments & Finance module.' : null}
      >
        <PreviewList
          icon={Wallet}
          empty="Payment history is not available for this user in the current data model."
          overflow={previewOverflow(paymentsView.rows.length)}
          rows={paymentsView.rows}
        />
      </RecordSection>

      {/* ---- AutoPay ----
          Reads the real `userAutopays` collection through the subscription's own
          autopayId. No field below is invented: the method comes from the saved
          payment-method record the rule points at, and nextRunAt is the schedule the
          rule stores — which the section note says plainly is never executed. */}
      <RecordSection
        icon={RefreshCw}
        tone="violet"
        title="AutoPay"
        count={userAutopayRules.length || '—'}
        note={AUTOPAY_SECTION_NOTES[autopayState] || null}
      >
        {userAutopayRules.length === 0 ? (
          <div style={{ padding: '18px 22px 20px' }}>
            {/* The state is stated even with no rule, so the section answers "is
                AutoPay on for this account?" without inferring it from an absence. */}
            <AutoPayStateBadge state={demoAutopay.state === 'No AutoPay Rule' ? autopayState : demoAutopay.state} />
            {demoAutopay.state === 'No AutoPay Rule' ? (
              <p className="muted" style={{ margin: '11px 0 0', fontSize: 13, lineHeight: 1.5 }}>
                No AutoPay rule is linked to this account, so no automatic payment will be attempted for it.
              </p>
            ) : (
              <div className="flex flex-col" style={{ marginTop: 10 }}>
                <span style={{ display: 'inline-flex', alignSelf: 'flex-start', marginBottom: 8, padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: 10.5, fontWeight: 750, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'var(--primary-bg)', color: 'var(--primary)' }}>Demo</span>
                <AutoPayFact label="Subscription" value={demoAutopay.plan ? `${demoAutopay.plan} — ${demoAutopay.astrologer}` : null} />
                <AutoPayFact label="Auto-renewal" value={demoAutopay.autoRenew} />
                <AutoPayFact label="Set up on" value={demoAutopay.setUpOn} />
                <AutoPayFact label="Next run" value={demoAutopay.nextRun} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col" style={{ padding: '4px 22px 18px' }}>
            {userAutopayRules.map((rule) => {
              const method = describePaymentMethod(getAutopayPaymentMethod(userPaymentMethods, rule.paymentMethodId))
              const storedStatus = String(rule.status || '').trim().toLowerCase()
              return (
                <div key={rule.id} style={{ padding: '15px 0', borderTop: '1px solid var(--divider)' }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <span style={{ minWidth: 0 }}>
                      <AutoPayStateBadge state={autopayLabel(rule) || AUTOPAY_NO_RULE} />
                      <span className="muted" style={{ marginLeft: 9, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>
                        {rule.id}
                      </span>
                    </span>

                    {/* Offered only while the rule is in a state that can change. A
                        cancelled rule gets no menu at all. */}
                    {availableAutopayActions.length > 0 && autopayTarget && (
                      <div className="relative" ref={autopayActionsRef} style={{ flex: 'none' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setAutopayActionsOpen((open) => !open)}
                          aria-haspopup="menu"
                          aria-expanded={autopayActionsOpen}
                          aria-label={`AutoPay actions for ${rule.id}`}
                        >
                          Actions
                          <ChevronDown size={15} />
                        </button>

                        {autopayActionsOpen && (
                          <div
                            role="menu"
                            className="absolute right-0 z-30"
                            style={{
                              top: 'calc(100% + 6px)',
                              minWidth: 272,
                              borderRadius: 'var(--radius-s)',
                              border: '1px solid var(--surface-border)',
                              background: 'var(--surface-overlay)',
                              boxShadow: 'var(--shadow-md)',
                              padding: 6,
                            }}
                          >
                            {availableAutopayActions.map((action) => {
                              const ActionIcon = action.Icon
                              const tokens = ACTION_TOKENS[action.tone]
                              return (
                                <button
                                  key={action.key}
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-start gap-2.5 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--primary)]"
                                  style={{ padding: '8px 10px' }}
                                  onClick={() => requestAutopayAction(action)}
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
                                  <span className="flex flex-col" style={{ gap: 2, minWidth: 0 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                                      {action.label}
                                    </span>
                                    <span className="muted" style={{ fontSize: 11.5, lineHeight: 1.45 }}>
                                      {action.detail}
                                    </span>
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap" style={{ gap: '12px 26px', marginTop: 13 }}>
                    <AutoPayFact label="Type" value={AUTOPAY_TYPE_LABELS[rule.type] || null} />
                    <AutoPayFact
                      label="Amount"
                      value={Number(rule.amount) > 0 ? `₹${Number(rule.amount).toLocaleString('en-IN')}` : null}
                    />
                    <AutoPayFact
                      label="Frequency"
                      value={rule.frequency ? String(rule.frequency).replace(/^\w/, (c) => c.toUpperCase()) : null}
                    />
                    <AutoPayFact
                      label="Top-up below"
                      value={Number(rule.triggerThreshold) > 0 ? `₹${Number(rule.triggerThreshold).toLocaleString('en-IN')}` : null}
                    />
                    <AutoPayFact label="Payment method" value={method} />
                    <AutoPayFact
                      label="Next run"
                      value={rule.nextRunAt && storedStatus !== 'revoked' ? formatDisplayDate(rule.nextRunAt) : null}
                    />
                    <AutoPayFact label="Set up on" value={rule.createdAt ? formatDisplayDate(rule.createdAt) : null} />
                    <AutoPayFact
                      label="Cancelled on"
                      value={rule.revokedAt ? formatDisplayDate(rule.revokedAt) : null}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </RecordSection>

      {/* ---- Disputes ---- */}
      <RecordSection
        icon={Gavel}
        tone="amber"
        title="Disputes & Complaints"
        count={disputesView.rows.length}
        demo={disputesView.isDemo}
        to={userDisputes.length > 0 ? `${routes.base}/disputes` : null}
        accent={hasUnresolvedDispute ? '3px solid var(--danger)' : undefined}
        note={hasUnresolvedDispute ? 'At least one dispute is still open and needs a decision.' : null}
      >
        <PreviewList
          icon={Gavel}
          empty="No disputes found for this user."
          overflow={previewOverflow(disputesView.rows.length)}
          rows={disputesView.rows}
        />
      </RecordSection>

      {/* ---- Reviews ----
          selectUserReviews() returns an empty list by design: review records carry no
          account reference, so none can be attributed here. */}
      <RecordSection
        icon={Receipt}
        tone="secondary"
        title="Reviews & Ratings"
        count={reviewsView.rows.length}
        demo={reviewsView.isDemo}
        to={userReviews.length > 0 ? `${routes.base}/reviews` : null}
      >
        <PreviewList
          icon={Receipt}
          empty="No reviews can be linked to this user in the current data model."
          overflow={previewOverflow(reviewsView.rows.length)}
          rows={reviewsView.rows}
        />
      </RecordSection>
    </div>
  )
}