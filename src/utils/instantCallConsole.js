// Pure helpers for the astrologer Instant Call Console (KPIs, live billing, history rows, CSV, header earnings).
// Nothing here touches storage or React, so it is all unit-testable.
import { calculateInstantAmount } from './consultationPricing.js'

export const INCOMING_CALL_RING_MS = 60 * 1000 // same ring window the dashboard uses
// Demo callers the console can queue. The first three are queued by default (Arjun K. rings, the other two wait).
const chennai = { latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata' }
export const SIMULATED_CALLERS = [
  { userId: 'simulated-arjun-k', userName: 'Arjun K.', topic: 'Career & Job Change', language: 'Tamil', walletBalance: 625, durationMinutes: 10, queuedSecondsAgo: 18,
    birthDetails: { name: 'Arjun K.', gender: 'Male', dob: '1994-08-14', time: '06:30', place: 'Chennai, Tamil Nadu, India', ...chennai } },
  { userId: 'simulated-sneha-m', userName: 'Sneha M.', topic: 'Marriage & Compatibility', language: 'Tamil', walletBalance: 800, durationMinutes: 20, queuedSecondsAgo: 12,
    birthDetails: { name: 'Sneha M.', gender: 'Female', dob: '1996-03-02', time: '09:15', place: 'Coimbatore, Tamil Nadu, India', latitude: 11.0168, longitude: 76.9558, timezone: 'Asia/Kolkata' } },
  { userId: 'simulated-vikram-r', userName: 'Vikram R.', topic: 'Finance & Business', language: 'Tamil', walletBalance: 500, durationMinutes: 15, queuedSecondsAgo: 6,
    birthDetails: { name: 'Vikram R.', gender: 'Male', dob: '1989-11-21', time: '17:40', place: 'Madurai, Tamil Nadu, India', latitude: 9.9252, longitude: 78.1198, timezone: 'Asia/Kolkata' } },
  { userId: 'simulated-meena-s', userName: 'Meena S.', topic: 'Health & Wellbeing', language: 'Tamil', walletBalance: 450, durationMinutes: 10,
    birthDetails: { name: 'Meena S.', gender: 'Female', dob: '1991-06-09', time: '04:50', place: 'Chennai, Tamil Nadu, India', ...chennai } },
  { userId: 'simulated-karthik-p', userName: 'Karthik P.', topic: 'Education & Higher Studies', language: 'Tamil', walletBalance: 600, durationMinutes: 15,
    birthDetails: { name: 'Karthik P.', gender: 'Male', dob: '1999-01-27', time: '12:10', place: 'Madurai, Tamil Nadu, India', latitude: 9.9252, longitude: 78.1198, timezone: 'Asia/Kolkata' } },
]

/** The next demo caller that is not already waiting or on the call (null when all of them are in use). */
export const nextSimulatedCaller = (inUseUserIds = []) => SIMULATED_CALLERS.find((caller) => !inUseUserIds.includes(caller.userId)) || null

export const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100
export const formatRupees = (value, { decimals } = {}) => {
  const amount = Number(value) || 0
  const fixed = decimals ?? (Number.isInteger(roundMoney(amount)) ? 0 : 2)
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: fixed, maximumFractionDigits: fixed })}`
}
export const formatClock = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

const sameDay = (iso, now) => {
  const date = new Date(iso)
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date(now).toDateString()
}

/** Whole minutes a wallet can pay for at `rate` per minute (null when the balance is unknown). */
export const maxMinutesForWallet = (walletBalance, rate) => (
  walletBalance == null || !(Number(rate) > 0) ? null : Math.floor(Number(walletBalance) / Number(rate))
)

/** Seconds that count toward billing: elapsed since the call started, minus time on hold, capped by the wallet. */
export function billableSeconds(request, nowMs = Date.now()) {
  const started = request?.startedAt ? new Date(request.startedAt).getTime() : 0
  if (!started) return 0
  const heldNow = request.holdSince ? Math.max(0, nowMs - new Date(request.holdSince).getTime()) : 0
  const held = (Number(request.heldMs) || 0) + heldNow
  const seconds = Math.max(0, Math.floor((nowMs - started - held) / 1000))
  const cap = maxMinutesForWallet(request.walletBalance, request.pricePerMinute)
  return cap == null ? seconds : Math.min(seconds, cap * 60)
}

export const earningsForSeconds = (seconds, ratePerMinute) => roundMoney((Math.max(0, seconds) / 60) * (Number(ratePerMinute) || 0))

/** Fields written when "End & Save Call" is pressed; the history table reads these. */
export function buildCallCompletion(request, nowMs = Date.now()) {
  const seconds = billableSeconds(request, nowMs)
  const heldMs = (Number(request.heldMs) || 0) + (request.holdSince ? Math.max(0, nowMs - new Date(request.holdSince).getTime()) : 0)
  return {
    status: 'ended',
    endedAt: new Date(nowMs).toISOString(),
    bookedMinutes: Number(request.durationMinutes) || 0,
    durationMinutes: Math.max(1, Math.ceil(seconds / 60)),
    extraMinutes: 0,
    actualSeconds: seconds,
    amount: earningsForSeconds(seconds, request.pricePerMinute),
    heldMs,
    holdSince: null,
  }
}

const callsFor = (sessions, astrologerId) => sessions.filter((item) => item.astrologerId === astrologerId && item.type === 'call')
const isCompleted = (item) => item.status === 'ended' && Boolean(item.startedAt)
/** Today's completed calls: count, total minutes and average duration in minutes. */
export function todaysCallStats(sessions, astrologerId, now = Date.now()) {
  const done = callsFor(sessions, astrologerId).filter((item) => isCompleted(item) && sameDay(item.startedAt, now))
  // Minutes are the per-call figures the history table shows (billed minutes, at least 1), so KPI and rows agree.
  const minutes = done.reduce((sum, item) => sum + (Number(item.durationMinutes) || 0), 0)
  return { count: done.length, minutes, avgMinutes: done.length ? minutes / done.length : null }
}

/** Earnings from instant calls and chats completed today (what the header adds to its base figure). */
export function todaysInstantEarnings(sessions, astrologerId, now = Date.now()) {
  return roundMoney(sessions
    .filter((item) => item.astrologerId === astrologerId && isCompleted(item) && sameDay(item.startedAt, now))
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0))
}

/** Waiting callers (oldest first). Calls past the ring window are excluded; the console expires them. */
export function waitingCalls(sessions, astrologerId, now = Date.now()) {
  return callsFor(sessions, astrologerId)
    .filter((item) => item.status === 'ringing' && withinRing(item, now))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

// Simulated demo callers wait until answered; real callers expire after the ring window.
const withinRing = (item, now) => item.isSimulated === true || now - new Date(item.createdAt).getTime() < INCOMING_CALL_RING_MS

export const staleRingingCalls = (sessions, astrologerId, now = Date.now()) => callsFor(sessions, astrologerId)
  .filter((item) => item.status === 'ringing' && !withinRing(item, now))

/**
 * Estimated minutes until each waiting caller is reached: what is left of the call in progress (or nothing when
 * nobody is on a call) plus the booked time of every caller ahead of them. Returns { [requestId]: minutes }.
 */
export function queueWaitMinutes({ active, waiting, now = Date.now() }) {
  let ahead = 0
  if (active) {
    const booked = (Number(active.durationMinutes) || 0) + (Number(active.extraMinutes) || 0)
    ahead = Math.max(0, Math.ceil(booked - billableSeconds(active, now) / 60))
  }
  const waits = {}
  waiting.forEach((request) => {
    waits[request.id] = ahead
    ahead += Number(request.durationMinutes) || 0
  })
  return waits
}

export const activeCall = (sessions, astrologerId) => callsFor(sessions, astrologerId).find((item) => item.status === 'accepted') || null

/** One history row per finished/declined/missed call, newest first. */
export function describeCall(session, fallbackRate = 0) {
  const started = Boolean(session.startedAt)
  const status = session.status === 'expired' ? 'Missed' : session.status === 'rejected' ? 'Declined' : started ? 'Completed' : 'Cancelled'
  const rate = session.pricePerMinute ?? fallbackRate
  const amount = status === 'Completed' ? (session.amount ?? calculateInstantAmount(session.durationMinutes, rate)) : 0
  return { status, amount, when: session.startedAt || session.createdAt }
}

export function historyRows(sessions, astrologerId, fallbackRate = 0) {
  return callsFor(sessions, astrologerId)
    .filter((item) => ['ended', 'rejected', 'expired'].includes(item.status))
    .filter((item) => !(item.isTestRequest && item.status === 'expired')) // an unanswered dev test ring is not a real missed call
    .map((item) => ({ item, ...describeCall(item, fallbackRate) }))
    .sort((a, b) => new Date(b.when) - new Date(a.when))
}

export function filterHistoryRows(rows, { query = '', status = 'All' } = {}) {
  const needle = query.trim().toLowerCase()
  return rows.filter((row) => (status === 'All' || row.status === status) && (!needle || String(row.item.userName || '').toLowerCase().includes(needle)))
}

const csvCell = (value) => {
  let text = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}` // neutralise spreadsheet formula injection
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildHistoryCsv(rows) {
  const header = ['User', 'Date', 'Time', 'Duration (min)', 'Amount (INR)', 'Status', 'Topic', 'Notes']
  const lines = rows.map(({ item, status, amount, when }) => {
    const date = new Date(when)
    return [
      item.userName,
      date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      item.durationMinutes, status === 'Completed' ? amount : 0, status, item.topic, item.notes,
    ].map(csvCell).join(',')
  })
  return [header.map(csvCell).join(','), ...lines].join('\r\n')
}
