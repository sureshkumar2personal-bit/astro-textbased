import { CalendarClock, Phone, PhoneIncoming, PhoneOff, Sparkles } from 'lucide-react'
import { formatClock, formatRupees, maxMinutesForWallet } from '../../../../utils/instantCallConsole.js'

const BIRTH_DATE = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const parseBirthTime = (value) => {
  const [h, m] = String(value || '').split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? new Date(2000, 0, 1, h, m).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : ''
}

/** "14 Aug 1994 • 06:30 AM • Chennai" (used by the active call header and the history modal). */
export function birthLine(details) {
  if (!details) return 'Birth details not shared'
  const date = details.dob ? new Date(`${details.dob}T00:00:00`) : null
  const place = String(details.place || '').split(',')[0].trim()
  return [date && !Number.isNaN(date.getTime()) ? BIRTH_DATE.format(date) : '', parseBirthTime(details.time), place].filter(Boolean).join(' • ') || 'Birth details not shared'
}

/** "14 Aug 1994, 06:30 AM (Chennai)" for the incoming call card. */
export function dobLine(details) {
  if (!details) return 'Birth details not shared'
  const date = details.dob ? new Date(`${details.dob}T00:00:00`) : null
  const place = String(details.place || '').split(',')[0].trim()
  const when = [date && !Number.isNaN(date.getTime()) ? BIRTH_DATE.format(date) : '', parseBirthTime(details.time)].filter(Boolean).join(', ')
  return when ? `${when}${place ? ` (${place})` : ''}` : 'Birth details not shared'
}

export function ageFromDob(dob, now = new Date()) {
  const born = dob ? new Date(`${dob}T00:00:00`) : null
  if (!born || Number.isNaN(born.getTime())) return null
  let age = now.getFullYear() - born.getFullYear()
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age -= 1
  return age >= 0 && age < 120 ? age : null
}

/** "Male, 29 yrs", or whichever of the two is known. */
export function demographics(details) {
  const age = ageFromDob(details?.dob)
  return [details?.gender, age != null ? `${age} yrs` : ''].filter(Boolean).join(', ')
}

export function walletLine(request) {
  const max = maxMinutesForWallet(request.walletBalance, request.pricePerMinute)
  if (request.walletBalance != null) return `${formatRupees(request.walletBalance)}${max != null ? ` • Max ${max} mins` : ''}`
  return `Prepaid ${formatRupees(request.amountPaid || 0)} for ${request.durationMinutes} mins`
}

function walletBadge(request) {
  const max = maxMinutesForWallet(request.walletBalance, request.pricePerMinute)
  if (request.walletBalance != null) return `Wallet Verified (${formatRupees(request.walletBalance)}${max != null ? ` / ${max}m max` : ''})`
  return `Wallet Verified (${formatRupees(request.amountPaid || 0)} prepaid / ${request.durationMinutes}m)`
}

export default function IncomingCallCard({ request, now, busy, error, onAccept, onDecline }) {
  const waited = (now - new Date(request.createdAt).getTime()) / 1000
  const who = demographics(request.birthDetails)
  return (
    <section className="icc-card icc-incoming" aria-label="Incoming instant call" aria-live="polite">
      <span className="icc-incoming__badge" aria-hidden="true"><PhoneIncoming size={30} /></span>
      <div className="icc-incoming__body">
        <div className="icc-incoming__top">
          <span className="icc-incoming__tag">Incoming Instant Call</span>
          <span className="icc-incoming__wallet"><i aria-hidden="true" /> {walletBadge(request)}</span>
          <span className="icc-incoming__wait" data-testid="incoming-wait">Waiting: {formatClock(waited)}</span>
        </div>
        <h2 className="icc-incoming__name"><span data-testid="incoming-caller">{request.userName}</span>{who && <small>• {who}</small>}</h2>
        <div className="icc-incoming__meta">
          <span><Sparkles size={16} aria-hidden="true" /> Topic: <b>{request.topic || 'Not specified'}</b></span>
          <span><CalendarClock size={16} aria-hidden="true" /> DOB: {dobLine(request.birthDetails)}</span>
        </div>
        <div className="icc-incoming__actions">
          <button type="button" className="icc-btn icc-btn--decline" disabled={busy} onClick={onDecline}><PhoneOff size={17} /> {busy === 'decline' ? 'Declining…' : 'Decline'}</button>
          <button type="button" className="icc-btn icc-btn--accept" disabled={busy} onClick={onAccept}><Phone size={17} fill="currentColor" /> {busy === 'accept' ? 'Connecting…' : 'Accept Call'}</button>
        </div>
        {error && <p className="icc-error" role="alert">{error}</p>}
      </div>
    </section>
  )
}
