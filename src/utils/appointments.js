// Appointment domain helpers shared across the astrologer Appointments module.

export const CALL_TYPES = {
  Audio: 'Audio',
  Text: 'Text',
}

// Normalize a free-form `type` string (e.g. "Video Consultation", "Audio Call")
// into one of the canonical call types used by the calendar.
export function getCallType(type) {
  if (!type) return CALL_TYPES.Audio
  const value = String(type).toLowerCase()
  if (value.includes('text') || value.includes('chat')) return CALL_TYPES.Text
  return CALL_TYPES.Audio
}

export function callTypeLabel(callType) {
  if (callType === CALL_TYPES.Audio) return 'Audio Call'
  return 'Text Consultation'
}

// ---- Time helpers ---------------------------------------------------------

export function parseTimeToMinutes(value) {
  if (typeof value === 'number') return value
  if (!value) return 0
  const text = String(value).trim().toLowerCase()
  const isPm = text.includes('pm')
  const isAm = text.includes('am')
  const clean = text.replace(/[^0-9:]/g, '')
  const [h, m] = clean.split(':').map((part) => Number(part) || 0)
  let hours = h
  if (isPm && hours < 12) hours += 12
  if (isAm && hours === 12) hours = 0
  return hours * 60 + m
}

export function format12h(minutes) {
  let h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${String(m).padStart(2, '0')} ${period}`
}

export function formatTimeRange(startMinutes, endMinutes) {
  return `${format12h(startMinutes)} – ${format12h(endMinutes)}`
}

export function toIsoDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromIsoDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

// The Availability Period is free-form, capped at a MAXIMUM of 90 days from
// today: the astrologer picks any Start Date between today and today + 90 days,
// then any End Date from the Start Date up to the same boundary. Nothing forces
// a full 90-day window — End is always the astrologer's own choice.
export const AVAILABILITY_PERIOD_DAYS = 90

// Selectable date bounds for the Availability Period, computed dynamically from
// today's date: every date from `min` through `max` is valid to pick.
export function availabilityBounds(today = new Date()) {
  const normalized =
    today instanceof Date ? today : new Date(today)
  return {
    min: toIsoDate(normalized),
    max: toIsoDate(
      addDays(normalized, AVAILABILITY_PERIOD_DAYS),
    ),
  }
}

// A period is valid only when the start is on or after today, the end is on or
// after the start, and both stay within the 90-day boundary from today.
export function isValidAvailabilityPeriod({
  start,
  end,
  today = new Date(),
}) {
  const iso = (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  if (!iso(start) || !iso(end)) return false
  const { min, max } = availabilityBounds(today)
  return start >= min && end >= start && end <= max
}

// Clamp a chosen { start, end } into the allowed window: Start is clamped to
// [today, today + 90 days] and End is clamped to [Start, today + 90 days].
export function clampAvailabilityPeriod({
  start,
  end,
  today = new Date(),
}) {
  const iso = (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value
      : null
  const { min, max } = availabilityBounds(today)
  const nextStart = iso(start)
    ? start < min
      ? min
      : start > max
        ? max
        : start
    : min
  const candidateEnd = iso(end) ? end : nextStart
  const nextEnd =
    candidateEnd < nextStart
      ? nextStart
      : candidateEnd > max
        ? max
        : candidateEnd
  return { start: nextStart, end: nextEnd }
}

// Weekly day-detail selection: no day is open by default (null). Clicking a day
// opens its detail, clicking the same day again closes it, and clicking another
// day replaces the previously open one. Only one detail is visible at a time.
export function openWeekdayDetail(current, next) {
  if (!Number.isInteger(next)) return current
  return next === current ? null : next
}

// Rest time automatically placed after every appointment, separate from Break
// Hours. A slot is never produced inside the buffer and the buffer never counts
// toward Total Slots. Templates without an explicit setting keep the legacy
// back-to-back behavior (0); the app-level defaults carry 5.
export const DEFAULT_APPOINTMENT_BUFFER = 5

export const APPOINTMENT_BUFFER_OPTIONS = [0, 5, 10]

// Collapse/expand toggle used by the Working Hours and Break Hours section
// headers in the scheduler. Purely presentational: collapsed sections keep all
// their ranges in state — nothing is hidden from the data, only from the page.
export function toggleCollapsed(current) {
  return !Boolean(current)
}

// The break reminder applies when a day has no configured breaks and the
// astrologer has not chosen Continue without Break.
export function shouldShowBreakReminder(schedule) {
  if (!schedule) return false
  const breaks = Array.isArray(schedule.breaks)
    ? schedule.breaks
    : []
  return breaks.length === 0 && !schedule.continueWithoutBreak
}

export function appointmentBufferMinutes(template) {
  const value = Number(template?.appointmentBuffer)
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.round(value)
}

export function startOfDay(date) {
  const current = new Date(date)
  current.setHours(0, 0, 0, 0)
  return current
}

export function startOfMonth(date) {
  const current = startOfDay(date)
  current.setDate(1)
  return current
}

export function addMonths(date, months) {
  const current = startOfMonth(date)
  current.setMonth(current.getMonth() + months)
  return current
}

export function startOfWeek(date, weekStartsOn = 1) {
  const current = new Date(date)
  const day = current.getDay() // 0 = Sunday
  const diff = (day - weekStartsOn + 7) % 7
  current.setDate(current.getDate() - diff)
  current.setHours(0, 0, 0, 0)
  return current
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatDisplayDate(iso, withWeekday = false) {
  if (!iso) return ''
  const date = fromIsoDate(iso)
  const base = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
  return withWeekday ? `${WEEKDAYS[date.getDay()]}, ${base}` : base
}

export function weekdayShort(iso) {
  return WEEKDAYS[fromIsoDate(iso).getDay()]
}

// Build a Date for an appointment's start/end using its iso date + minute offset.
function appointmentDateTime(iso, minutes) {
  const date = fromIsoDate(iso)
  date.setHours(0, 0, 0, 0)
  date.setMinutes(minutes)
  return date
}

// Resolve a robust start/end minute pair for an appointment, falling back to the
// `time` string and `duration` when explicit 24h `start`/`end` values are absent.
export function resolveAppointmentWindow(appointment) {
  let startMin = appointment.start != null ? parseTimeToMinutes(appointment.start) : null
  let endMin = appointment.end != null ? parseTimeToMinutes(appointment.end) : null

  if (startMin == null) {
    startMin = parseTimeToMinutes(appointment.time || '09:00 AM')
  }
  if (endMin == null) {
    const durationMin = parseDurationToMinutes(appointment.duration)
    endMin = startMin + (durationMin || 30)
  }
  return { startMin, endMin }
}

export function parseDurationToMinutes(duration) {
  if (typeof duration === 'number') return duration
  if (!duration) return 30
  const text = String(duration).toLowerCase()
  const hours = text.match(/(\d+)\s*h/)
  const mins = text.match(/(\d+)\s*m/)
  let total = 0
  if (hours) total += Number(hours[1]) * 60
  if (mins) total += Number(mins[1])
  return total || 30
}

// Determine the live phase of an appointment relative to `now`.
// Returns one of: cancelled | completed | pending | live | upcoming
export function getAppointmentPhase(appointment, now = new Date()) {
  const status = appointment.status || 'Booked'
  if (isCancelledStatus(status)) return 'cancelled'
  if (status === 'Completed' || status === APPOINTMENT_STATUS.NO_SHOW) return 'completed'

  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  const start = appointment.dateIso
    ? appointmentDateTime(appointment.dateIso, startMin)
    : null
  if (!start) return status === 'Pending' ? 'pending' : 'upcoming'

  const end = new Date(start)
  end.setMinutes(end.getMinutes() + (endMin - startMin))

  if (status === 'Pending') {
    return now < start ? 'pending' : now <= end ? 'live' : 'completed'
  }

  if (now < start) return { phase: 'upcoming', msUntilStart: start - now }
  if (now <= end) return { phase: 'live', msUntilEnd: end - now }
  return { phase: 'completed', auto: true }
}

// Human friendly countdown label, e.g. "15m 20s", "1h 30m", "01:25".
export function countdownLabel(ms) {
  if (ms == null || ms < 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// ---- React hook -----------------------------------------------------------

import { useEffect, useState } from 'react'
import { getGovernmentHoliday } from '../data/holidays.js'

// Ticking clock used to drive countdowns and auto state transitions.
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

// ---- Status semantics -----------------------------------------------------

// Canonical appointment statuses used across the product. Booked is the
// terminal "payment succeeded, no confirmation step" state. The remaining
// states are the historical/terminal statuses shown in Appointment History.
export const APPOINTMENT_STATUS = {
  BOOKED: 'Booked',
  COMPLETED: 'Completed',
  CANCELLED_BY_ASTROLOGER: 'Cancelled by Astrologer',
  CANCELLED_BY_USER: 'Cancelled by User',
  NO_SHOW: 'No-show',
  AUTO_CANCELLED: 'Auto-cancelled',
}

// Statuses that represent a cancelled appointment for filtering/summaries.
export const CANCELLED_STATUSES = [
  APPOINTMENT_STATUS.CANCELLED_BY_ASTROLOGER,
  APPOINTMENT_STATUS.CANCELLED_BY_USER,
  APPOINTMENT_STATUS.AUTO_CANCELLED,
]

export function isCancelledStatus(status) {
  return CANCELLED_STATUSES.includes(status) || status === 'Cancelled'
}

// Classify an appointment purely by its status into one of the history buckets.
// This is the single source of truth for All / Upcoming / Completed / Cancelled
// filtering, the summary cards and the calendar day counts, so that every part
// of Appointment History always agrees on the same numbers.
export function appointmentStatusBucket(status) {
  if (isCancelledStatus(status)) return 'cancelled'
  if (status === 'Completed' || status === 'No-show') return 'completed'
  return 'booked'
}

// The calendar window in which a Booked appointment is considered "Upcoming":
// the current calendar month plus the two following months (current + next 2).
// Returns the inclusive-exclusive {first, last} boundaries at local midnight.
// Nothing outside this window is ever Upcoming, regardless of status.
export function appointmentUpcomingHorizon(now = new Date()) {
  const first = startOfMonth(now)
  const last = addMonths(first, 3)
  return { first, last }
}

// An appointment is Upcoming only when it is currently Booked, its scheduled
// datetime has not yet passed, and it falls within the current + next 2 month
// horizon. Historical Booked records (previous months) are never Upcoming, and
// future Booked records beyond the horizon are never Upcoming either. A record
// that is a rescheduled original (pointed to a replacement) is not actionable
// and therefore not Upcoming.
export function isAppointmentUpcoming(appointment, now = new Date()) {
  const status = appointment.status || APPOINTMENT_STATUS.BOOKED
  if (status !== APPOINTMENT_STATUS.BOOKED) return false
  if (isCancelledStatus(status)) return false
  if (appointment.rescheduledTo) return false
  if (!appointment.dateIso) return false
  const { startMin } = resolveAppointmentWindow(appointment)
  if (startMin == null) return false

  const onDate = startOfDay(fromIsoDate(appointment.dateIso))
  const { first, last } = appointmentUpcomingHorizon(now)
  if (onDate < first || onDate >= last) return false

  const start = appointmentDateTime(appointment.dateIso, startMin)
  return now.getTime() <= start.getTime()
}

// Whether the astrologer may Start the audio call for this appointment.
// Requires: Booked status, Audio call type, not a rescheduled original, and the
// appointment is currently live (within its start..end window) or is a future
// Booked appointment inside the Upcoming horizon. Past Booked, Completed,
// cancelled, no-show, auto-cancelled and rescheduled-original records can never
// be started.
export function canStartCall(appointment, now = new Date()) {
  const status = appointment.status || APPOINTMENT_STATUS.BOOKED
  if (status !== APPOINTMENT_STATUS.BOOKED) return false
  if (isCancelledStatus(status)) return false
  if (getCallType(appointment.callType || appointment.type) !== CALL_TYPES.Audio) return false
  if (appointment.rescheduledTo) return false
  if (!appointment.dateIso) return false

  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  if (startMin == null || endMin == null) return false

  const onDate = startOfDay(fromIsoDate(appointment.dateIso))
  const { first, last } = appointmentUpcomingHorizon(now)
  if (onDate < first || onDate >= last) return false

  const start = appointmentDateTime(appointment.dateIso, startMin)
  const end = new Date(start)
  end.setMinutes(end.getMinutes() + (endMin - startMin))
  const live = now.getTime() >= start.getTime() && now.getTime() <= end.getTime()
  const future = now.getTime() < start.getTime()
  return live || future
}

// ---- Automatic cancellation / no-show policy ------------------------------
//
// Centralized, configurable rules that decide when a Booked appointment that
// never happened should be automatically flipped to `No-show` or
// `Auto-cancelled`. Kept here (single source of truth) so the exact cutoff can
// be tuned later without touching individual pages.
export const AUTO_CANCEL_POLICY = {
  // An appointment whose start has passed by more than this many minutes and
  // never completed is treated as a No-show.
  noShowAfterStartMinutes: 15,
  // A Booked appointment this far in the future may be auto-cancelled when the
  // astrologer no longer supports the slot (configurable; disabled when null).
  autoCancelLeadMinutes: null,
  // Hours after a booked appointment's end by which, if still "Booked/in
  // progress-unresolved", it is forced to a terminal state.
  resolveAfterHours: 24,
}

// Given an appointment and a reference time, derive whether an automatic
// status change applies. Returns null when no automatic transition applies.
export function deriveAutoStatus(appointment, now = new Date()) {
  const status = appointment.status
  if (status !== APPOINTMENT_STATUS.BOOKED) return null
  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  if (!appointment.dateIso || startMin == null || endMin == null) return null
  const start = appointmentDateTime(appointment.dateIso, startMin)
  const end = appointmentDateTime(appointment.dateIso, endMin)

  if (now.getTime() - end.getTime() > AUTO_CANCEL_POLICY.resolveAfterHours * 60 * 60 * 1000) {
    return { to: APPOINTMENT_STATUS.NO_SHOW }
  }
  if (now.getTime() > end.getTime()) {
    return { to: APPOINTMENT_STATUS.NO_SHOW }
  }
  const noShowAt = start.getTime() + AUTO_CANCEL_POLICY.noShowAfterStartMinutes * 60 * 1000
  if (now.getTime() >= noShowAt) {
    return { to: APPOINTMENT_STATUS.NO_SHOW }
  }
  if (AUTO_CANCEL_POLICY.autoCancelLeadMinutes != null) {
    const autoCancelAt = start.getTime() - AUTO_CANCEL_POLICY.autoCancelLeadMinutes * 60 * 1000
    if (now.getTime() >= autoCancelAt) {
      return { to: APPOINTMENT_STATUS.AUTO_CANCELLED }
    }
  }
  return null
}

// Group a single appointment into one of the history filter buckets (for the
// All / Upcoming / Completed / Cancelled controls).
export function appointmentGroup(appointment, now = new Date()) {
  const status = appointment.status || 'Booked'
  if (isCancelledStatus(status)) return 'cancelled'
  if (status === 'Completed' || status === APPOINTMENT_STATUS.NO_SHOW) return 'completed'
  const phaseResult = getAppointmentPhase(appointment, now)
  const phase = typeof phaseResult === 'string' ? phaseResult : phaseResult.phase
  if (phase === 'completed' || phase === 'pending') return 'completed'
  return 'upcoming'
}

// ---- Status presentation --------------------------------------------------

export const STATUS_THEME = {
  Booked: { label: 'Booked', tone: 'confirmed' },
  Confirmed: { label: 'Booked', tone: 'confirmed' },
  Pending: { label: 'Pending', tone: 'pending' },
  Rescheduled: { label: 'Rescheduled', tone: 'pending' },
  'In Progress': { label: 'In Progress', tone: 'live' },
  Completed: { label: 'Completed', tone: 'completed' },
  Cancelled: { label: 'Cancelled', tone: 'cancelled' },
  'Cancelled by Astrologer': { label: 'Cancelled by Astrologer', tone: 'cancelled' },
  'Cancelled by User': { label: 'Cancelled by User', tone: 'cancelled' },
  'No-show': { label: 'No-show', tone: 'break' },
  'Auto-cancelled': { label: 'Auto-cancelled', tone: 'cancelled' },
}

// Visual tone -> tailwind classes (works in light & dark via CSS vars).
export const TONE_CLASSES = {
  confirmed: {
    chip: 'bg-[color:var(--primary-bg)] text-[color:var(--primary)] border-[color:var(--primary-border,#ddd6fe)]',
    dot: 'bg-[color:var(--primary)]',
    soft: 'bg-[color:var(--primary-bg)]',
  },
  pending: {
    chip: 'bg-[color:var(--warning-bg)] text-[color:var(--amber-600)] border-[color:var(--warning-border,#fde68a)]',
    dot: 'bg-[color:var(--amber-600)]',
    soft: 'bg-[color:var(--warning-bg)]',
  },
  live: {
    chip: 'bg-[color:var(--green-100)] text-[color:var(--green-600)] border-[color:var(--green-200,#a7f3d0)]',
    dot: 'bg-[color:var(--green-600)]',
    soft: 'bg-[color:var(--green-100)]',
  },
  completed: {
    chip: 'bg-[color:var(--success-bg)] text-[color:var(--green-600)] border-[color:var(--green-200,#a7f3d0)]',
    dot: 'bg-[color:var(--green-600)]',
    soft: 'bg-[color:var(--success-bg)]',
  },
  cancelled: {
    chip: 'bg-[color:var(--danger-bg)] text-[color:var(--red-600)] border-[color:var(--red-200,#fecaca)]',
    dot: 'bg-[color:var(--red-600)]',
    soft: 'bg-[color:var(--danger-bg)]',
  },
  break: {
    chip: 'bg-[color:var(--neutral-bg)] text-[color:var(--muted)] border-[color:var(--border)]',
    dot: 'bg-[color:var(--muted)]',
    soft: 'bg-[color:var(--neutral-bg)]',
  },
}

// Build a full Date for a given iso + minute offset (exported for call windows).
export function appointmentStart(appointment) {
  const { startMin } = resolveAppointmentWindow(appointment)
  return appointment.dateIso ? appointmentDateTime(appointment.dateIso, startMin) : null
}

// ---- Availability / slot generation --------------------------------------

export function isWithinSchedulingHorizon(date, now = new Date(), months = 3) {
  const day = startOfDay(date)
  const first = startOfMonth(now)
  const end = addMonths(first, months)
  return day >= first && day < end
}

// A date whose calendar day is strictly before today. Past dates are never
// available for booking: their unbooked slots become Closed/Past, while any
// historical Booked / Completed records remain visible for reference.
export function isPastDate(iso, now = new Date()) {
  if (!iso) return false
  return String(iso) < toIsoDate(now)
}

// Working-hour/break lists are always arrays. Legacy single-object windows are
// safely normalized to an empty list rather than crashing slot generation.
function windowList(value) {
  return Array.isArray(value) ? value : []
}

// Remove exact duplicate working-hour ranges so stale/migrated schedule data can
// never inflate the generated slot count (e.g. a date resolving to 41 slots from
// two copies of the same 21-slot schedule). Overlapping-but-distinct ranges are
// preserved — the UI layers break/validation rules on top of those.
function dedupeWindows(list) {
  const seen = new Set()
  return list.filter((item) => {
    if (!item || item.start == null || item.end == null) return false
    const key = `${String(item.start)}|${String(item.end)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getDateAvailability(template, date) {
  const iso = typeof date === 'string' ? date : toIsoDate(date)
  const day = typeof date === 'string' ? fromIsoDate(date) : date
  const override = template?.dateOverrides?.[iso]
  if (override) {
    return {
      status: override.status || 'Available',
      windows: dedupeWindows(windowList(override.windows)),
      breaks: dedupeWindows(windowList(override.breaks)),
      isOverride: true,
    }
  }
  const holiday = getGovernmentHoliday(iso)
  if (holiday) {
    return { status: 'Unavailable', windows: [], breaks: [], isOverride: false, holiday }
  }
  const weekly = template?.weeklySchedule?.find((item) => Number(item.dayIndex) === day.getDay())
  return {
    status: weekly?.enabled ? 'Available' : 'Unavailable',
    windows: weekly?.enabled ? dedupeWindows(windowList(weekly.slots)) : [],
    breaks: weekly?.enabled ? dedupeWindows(windowList(weekly.breaks)) : [],
    isOverride: false,
  }
}

function overlaps(start, end, otherStart, otherEnd) {
  return start < otherEnd && end > otherStart
}

// Start times (in minutes from midnight) manually marked as Booked for a date in
// the astrologer's schedule UI. Stored on the date override so it persists
// through the existing appointment-availability localStorage architecture.
export function getManualBookedSlots(template, date) {
  const iso = typeof date === 'string' ? date : toIsoDate(date)
  const booked = template?.dateOverrides?.[iso]?.bookedSlots
  return Array.isArray(booked)
    ? booked.filter((n) => Number.isFinite(Number(n))).map((n) => Number(n))
    : []
}

// Generates only complete slots. Existing appointments are excluded so a slot
// can never be presented as available when it is already occupied. The selected
// appointment duration drives every slot: slotEnd = slotStart + duration, and
// the next slot starts only after the previous slot end PLUS the appointment
// buffer (a rest gap, not a slot and never counted in totals; default 5 minutes
// in the app, back-to-back for legacy templates without a buffer). No fixed
// 15-minute grid, so a 30-minute duration never produces 15-minute or
// overlapping slots. The full duration must fit inside a working period (never
// split/shortened), must not overlap a break or an existing appointment, and
// must be in the future for the current day.
export function generateAppointmentSlots({ template, date, appointments = [], now = new Date(), availabilityPeriod }) {
  const day = typeof date === 'string' ? fromIsoDate(date) : date
  const iso = toIsoDate(day)
  if (!template) return []
  if (isPastDate(iso, now)) return []
  if (availabilityPeriod) {
    // When an availability period is supplied, slots only exist inside it.
    if (iso < availabilityPeriod.start || iso > availabilityPeriod.end) return []
  } else {
    // Preserve the legacy horizon default for callers without a period.
    if (!isWithinSchedulingHorizon(day, now, 3)) return []
  }
  const schedule = getDateAvailability(template, day)
  if (schedule.status !== 'Available') return []
  const duration = Math.max(1, Math.round(Number(template.appointmentDuration) || 30))
  const buffer = appointmentBufferMinutes(template)
  const occupied = appointments
    .filter((appointment) => appointment.dateIso === iso && !isCancelledStatus(appointment.status))
    .map(resolveAppointmentWindow)
  const manualBooked = new Set(getManualBookedSlots(template, iso))
  const breaks = (schedule.breaks || []).map((item) => ({ start: parseTimeToMinutes(item.start), end: parseTimeToMinutes(item.end) }))
  const slots = []
  ;(schedule.windows || []).forEach((window) => {
    const windowStart = parseTimeToMinutes(window.start)
    const windowEnd = parseTimeToMinutes(window.end)
    for (let start = windowStart; start + duration <= windowEnd; start += duration + buffer) {
      const end = start + duration
      if (appointmentDateTime(iso, start).getTime() <= now.getTime()) continue
      const isBreak = breaks.some((item) => overlaps(start, end, item.start, item.end))
      const isBooked = occupied.some((item) => overlaps(start, end, item.startMin, item.endMin))
      if (!isBreak && !isBooked && !manualBooked.has(start)) slots.push({ startMin: start, endMin: end, status: 'available' })
    }
  })
  return slots
}

// ---- Break / working-hour validation ------------------------------------

// Fallback windows used when the shared weekly template has no working hours,
// and by the weekly schedule quick actions when no windows are configured.
export const DEFAULT_WEEKLY_WINDOWS = [
  { start: '09:00', end: '16:00' },
]

// Apply the shared weekly template (working hours + breaks + continue-without-
// break setting) to the chosen weekdays of a weekly schedule. Used by the
// "All Day" (all 7 days) and "Except Sunday" (Mon–Sat, Sunday off) quick
// actions. The template is copied into every selected day so each day remains
// independently editable afterwards.
export function weeklyScheduleFromTemplate(weeklySchedule = [], template = {}, options = {}) {
  const dayIndexes = options.dayIndexes || [0, 1, 2, 3, 4, 5, 6]
  const sundayOff = Boolean(options.sundayOff)
  const sourceWindows = (template.slots || []).filter(isValidRange)
  const slots = sourceWindows.length
    ? sourceWindows.map((item) => ({ start: item.start, end: item.end }))
    : DEFAULT_WEEKLY_WINDOWS.map((item) => ({ start: item.start, end: item.end }))
  const breaks = (template.breaks || [])
    .filter(isValidRange)
    .map((item) => ({ start: item.start, end: item.end }))
  const continueWithoutBreak = Boolean(template.continueWithoutBreak)
  const enabled = template.enabled !== false
  return weeklySchedule.map((day) => {
    if (!dayIndexes.includes(Number(day.dayIndex))) return day
    const off = sundayOff && Number(day.dayIndex) === 0
    return {
      ...day,
      enabled: off ? false : enabled,
      slots,
      breaks: off ? [] : breaks,
      continueWithoutBreak: off ? false : continueWithoutBreak,
    }
  })
}

// A range is valid only when it has a start strictly before its end.
export function isValidRange(item) {
  if (!item || item.start == null || item.end == null) return false
  return parseTimeToMinutes(item.start) < parseTimeToMinutes(item.end)
}

// A break must sit entirely inside at least one of the day's working windows.
export function isBreakWithinWindows(item, windows = []) {
  if (!isValidRange(item)) return false
  const start = parseTimeToMinutes(item.start)
  const end = parseTimeToMinutes(item.end)
  return windows.some((window) => {
    if (!window || window.start == null || window.end == null) return false
    const windowStart = parseTimeToMinutes(window.start)
    const windowEnd = parseTimeToMinutes(window.end)
    return windowStart < windowEnd && start >= windowStart && end <= windowEnd
  })
}

// Two breaks may not overlap each other.
export function breaksOverlap(a, b) {
  const start = parseTimeToMinutes(a.start)
  const end = parseTimeToMinutes(a.end)
  const otherStart = parseTimeToMinutes(b.start)
  const otherEnd = parseTimeToMinutes(b.end)
  return start < otherEnd && end > otherStart
}

// Returns the first validation message for a day's break list, or null when
// every break is well-formed, inside the working windows and non-overlapping.
export function validateDayBreaks(breaks = [], windows = []) {
  const list = Array.isArray(breaks) ? breaks : []
  for (const item of list) {
    if (!isValidRange(item)) {
      return 'Break end time must be later than its start time.'
    }
    if (!isBreakWithinWindows(item, windows)) {
      return 'Each break must fall inside that day\u2019s working hours.'
    }
  }
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      if (breaksOverlap(list[i], list[j])) {
        return 'Breaks must not overlap each other.'
      }
    }
  }
  return null
}

// ---- Published availability snapshots ------------------------------------
//
// Availability templates carry a published snapshot
// (publishedWeeklySchedule / publishedDateOverrides) that records exactly what
// was last published. Saving edited changes (weeklySchedule / dateOverrides)
// never changes what users see until the astrologer publishes again.

export function publishedAvailabilitySnapshot(template) {
  if (!template) return null
  const publishedWeeklySchedule = template.publishedWeeklySchedule
  const publishedDateOverrides = template.publishedDateOverrides
  if (!publishedWeeklySchedule && !publishedDateOverrides) return null
  return {
    ...template,
    weeklySchedule: publishedWeeklySchedule || template.weeklySchedule || [],
    dateOverrides: publishedDateOverrides || template.dateOverrides || {},
    appointmentDuration: template.publishedAppointmentDuration != null
      ? Number(template.publishedAppointmentDuration)
      : Number(template.appointmentDuration) || 30,
    appointmentPrice: template.publishedAppointmentPrice != null
      ? Number(template.publishedAppointmentPrice)
      : Number(template.appointmentPrice) || 799,
    appointmentBuffer: template.publishedAppointmentBuffer != null
      ? Math.max(0, Math.round(Number(template.publishedAppointmentBuffer)))
      : appointmentBufferMinutes(template),
  }
}

const monthKeyOf = (dateOrIso) => {
  const date = typeof dateOrIso === 'string' ? fromIsoDate(dateOrIso) : dateOrIso
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Published snapshot that governs a date across the whole published period.
// Prefers the same-month template's own published snapshot; otherwise falls back
// to the newest published template whose published availability period contains
// the date. This lets a single publish (e.g. in September) drive every month
// inside the 90-day period through December — future months never turn
// Unpublished just because they have no per-month template.
export function publishedSnapshotForDate({ templates = [], date }) {
  if (!Array.isArray(templates)) return null
  const iso = typeof date === 'string' ? date : toIsoDate(date)
  const month = monthKeyOf(iso)
  const sameMonth = templates.find(
    (item) => item?.monthKey === month && publishedAvailabilitySnapshot(item),
  )
  if (sameMonth) return publishedAvailabilitySnapshot(sameMonth)
  const candidates = templates
    .map((item) => ({
      item,
      snapshot: publishedAvailabilitySnapshot(item),
    }))
    .filter(({ item, snapshot }) => {
      if (!snapshot) return false
      const period = item.publishedAvailabilityPeriod || item.availabilityPeriod
      return Boolean(period?.start && period?.end && iso >= period.start && iso <= period.end)
    })
    .sort((a, b) => {
      const at = a.item.publishedAt || ''
      const bt = b.item.publishedAt || ''
      return at < bt ? 1 : at > bt ? -1 : 0
    })
  const best = candidates[0]
  return best ? best.snapshot : null
}

export function hasUnpublishedChanges(template) {
  if (!template) return false
  const snapshot = publishedAvailabilitySnapshot(template)
  if (!snapshot) return false
  const comparable = (value) => (value == null ? 'null' : JSON.stringify(value))
  const policyChanged =
    (template.publishedAppointmentDuration != null &&
      Number(template.appointmentDuration) !== Number(template.publishedAppointmentDuration)) ||
    (template.publishedAppointmentPrice != null &&
      Number(template.appointmentPrice) !== Number(template.publishedAppointmentPrice)) ||
    (Number(template.appointmentBuffer) || 0) !==
      (Number(snapshot.appointmentBuffer) || 0)
  const publishedPeriod = template.publishedAvailabilityPeriod || template.availabilityPeriod
  const periodChanged = comparable(publishedPeriod) !== comparable(template.availabilityPeriod)
  return (
    comparable(template.weeklySchedule) !== comparable(snapshot.weeklySchedule) ||
    comparable(template.dateOverrides) !== comparable(snapshot.dateOverrides) ||
    policyChanged ||
    periodChanged
  )
}

// Date -> '10:00 AM' slot-time map shown on the user booking page. Uses ONLY
// published snapshots (saved-but-not-published edits are invisible to users),
// derives slots through the same generateAppointmentSlots engine, and lets
// booked appointments occupy/remove their slots automatically.
export function publishedAvailabilityMap({ templates = [], astrologerId, appointments = [], now = new Date() }) {
  const map = {}
  if (!Array.isArray(templates) || !astrologerId) return map

  // Determine the range to scan. Prefer the astrologer's explicit published
  // availability period; otherwise fall back to the current-month horizon.
  let rangeStart = null
  let rangeEnd = null
  for (const template of templates) {
    if (template?.astrologerId !== astrologerId) continue
    const period =
      template.publishedAvailabilityPeriod || template.availabilityPeriod
    if (period?.start && period?.end) {
      const s = fromIsoDate(period.start)
      const e = fromIsoDate(period.end)
      if (!rangeStart || s < rangeStart) rangeStart = s
      if (!rangeEnd || e > rangeEnd) rangeEnd = e
    }
  }

  const astrologerTemplates = templates.filter((appointment) => appointment.astrologerId === astrologerId)
  const astrologerAppointments = appointments.filter((appointment) => appointment.astrologerId === astrologerId)

  if (!rangeStart || !rangeEnd) {
    rangeStart = startOfMonth(now)
    rangeEnd = addMonths(rangeStart, 3)
  }

  const cursor = new Date(rangeStart)
  const limit = addDays(rangeEnd, 1)
  while (cursor < limit) {
    const published = publishedSnapshotForDate({ templates: astrologerTemplates, date: cursor })
    if (published) {
      const period = published.publishedAvailabilityPeriod || published.availabilityPeriod
      const slots = generateAppointmentSlots({
        template: published,
        date: cursor,
        appointments: astrologerAppointments,
        now,
        availabilityPeriod: period || undefined,
      })
      if (slots.length) map[toIsoDate(cursor)] = slots.map((slot) => format12h(slot.startMin))
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return map
}

// Cell state for the View Published Availability calendar. Future months inside
// the published period stay Available/Booked (never Unpublished); only dates
// before the start or after the end are Unpublished. Previous months are shown
// for reference only and are never actionable.
export function publishedCellState({
  inViewMonth,
  isPast = false,
  historicalView,
  withinPeriod,
  hasSnapshot,
  summaryTotal,
  remaining,
  isHoliday,
}) {
  let state = 'unavailable'
  let label = 'Unavailable'
  if (!inViewMonth) {
    state = 'out-of-month'
    label = ''
  } else if (isPast) {
    // A date before today is never available: its slots are Closed for new
    // bookings while historical Booked/Completed records stay visible.
    state = 'closed'
    label = 'Closed'
  } else if (historicalView) {
    if (summaryTotal > 0) {
      state = remaining > 0 ? 'available' : 'booked'
    } else if (isHoliday) {
      state = 'holiday'
      label = 'Holiday'
    } else if (hasSnapshot) {
      state = 'unavailable'
      label = 'Unavailable'
    } else {
      state = 'unpublished'
      label = 'Unpublished'
    }
  } else if (!withinPeriod || !hasSnapshot) {
    state = 'unpublished'
    label = 'Unpublished'
  } else if (summaryTotal > 0) {
    state = remaining > 0 ? 'available' : 'booked'
  } else if (isHoliday) {
    state = 'holiday'
    label = 'Holiday'
  } else {
    state = 'unavailable'
    label = 'Unavailable'
  }
  return {
    state,
    label,
    actionable: Boolean(
      inViewMonth && !isPast && withinPeriod && !historicalView && summaryTotal > 0,
    ),
  }
}

// Monthly availability summary for a date. The rules live in one place: breaks
// are excluded, while cancelled appointments deliberately leave their slot
// available again. Every slot status is strictly TIME-BASED — the appointment
// record's own status never forces a slot to Completed ahead of its scheduled
// END time, so a preset/mock "Completed" record on a future date still reads
// Booked. Boundary: slot end time vs now.
//   - end NOT passed + booking  -> Booked (in-progress slots stay Booked)
//   - end NOT passed + unbooked -> Available
//   - end passed + booking      -> Completed (both conditions required)
//   - end passed + unbooked     -> Closed (never counted as Completed)
// Remaining = Available. Historical Booked/Completed data stays intact on past
// dates via the appointments list, just resolved dynamically.
export function getAppointmentSlotSummary({ template, date, appointments = [], now = new Date(), availabilityPeriod }) {
  const day = typeof date === 'string' ? fromIsoDate(date) : date
  const iso = toIsoDate(day)
  const empty = { total: 0, booked: 0, completed: 0, closed: 0, remaining: 0, available: 0, slots: [], isPast: isPastDate(iso, now) }
  if (!template) return empty
  // Past dates are reference-only: bounded by the scheduling horizon (never past
  // the current 3-month window) instead of the availability period, so their
  // historical Booked/Completed records stay visible. Future dates are governed
  // by the availability period as before.
  if (empty.isPast) {
    if (!isWithinSchedulingHorizon(day, now, 3)) return empty
  } else if (availabilityPeriod) {
    if (iso < availabilityPeriod.start || iso > availabilityPeriod.end) return empty
  } else if (!isWithinSchedulingHorizon(day, now, 3)) {
    return empty
  }
  const schedule = getDateAvailability(template, day)
  if (schedule.status !== 'Available') return empty
  const isPast = empty.isPast
  const duration = Math.max(1, Math.round(Number(template.appointmentDuration) || 30))
  const buffer = appointmentBufferMinutes(template)
  const appointmentsForDay = appointments.filter((appointment) => appointment.dateIso === iso && !isCancelledStatus(appointment.status))
  const manualBooked = new Set(getManualBookedSlots(template, iso))
  const breaks = (schedule.breaks || []).map((item) => ({ start: parseTimeToMinutes(item.start), end: parseTimeToMinutes(item.end) }))
  const slots = []
  ;(schedule.windows || []).forEach((window) => {
    const windowStart = parseTimeToMinutes(window.start)
    const windowEnd = parseTimeToMinutes(window.end)
    for (let start = windowStart; start + duration <= windowEnd; start += duration + buffer) {
      const end = start + duration
      if (breaks.some((item) => overlaps(start, end, item.start, item.end))) continue
      const appointment = appointmentsForDay.find((item) => {
        const range = resolveAppointmentWindow(item)
        return overlaps(start, end, range.startMin, range.endMin)
      })
      const manual = manualBooked.has(start) && !appointment
      // Time-based boundary: the slot's END time (not its start) decides whether
      // it has finished. A booked slot stays Booked while live/upcoming and only
      // flips to Completed once its appointment end time has truly passed.
      const ended = appointmentDateTime(iso, end).getTime() <= now.getTime()
      const status = resolveSlotStatus({ iso, endMin: end, appointment, manual, now })
      slots.push({
        startMin: start,
        endMin: end,
        status,
        label: resolveSlotLabel(appointment, status),
        appointment: appointment || null,
        manual,
        completed: status === 'completed',
        elapsed: ended,
        ended,
        isPast,
      })
    }
  })
  const available = slots.filter((slot) => slot.status === 'available').length
  const booked = slots.filter((slot) => slot.status === 'booked').length
  const completedCount = slots.filter((slot) => slot.status === 'completed').length
  const closed = slots.filter((slot) => slot.status === 'closed').length
  const remaining = available
  return { total: slots.length, booked, completed: completedCount, closed, remaining, available, slots, isPast }
}

// A slot is Completed only when BOTH a real appointment occupies it AND its
// scheduled end time has passed. A stale/preset "Completed" record on a date
// that has not happened yet stays Booked. Past dates, where every slot has
// ended, naturally resolve their booked histories to Completed and their empty
// slots to Closed.
function resolveSlotStatus({ iso, endMin, appointment, manual, now }) {
  const ended = appointmentDateTime(iso, endMin).getTime() <= now.getTime()
  if (appointment) return ended ? 'completed' : 'booked'
  if (manual) return ended ? 'closed' : 'booked'
  return ended ? 'closed' : 'available'
}

// Human label for a resolved slot status. The appointment's raw status is only
// surfaced when it cannot contradict the time-based status: a still-active slot
// whose record says "Completed"/"No-show" reads "Booked" (the record happened
// only once its time truly ended), while in-progress calls keep "In Progress".
function resolveSlotLabel(appointment, status) {
  if (status === 'closed') return 'Closed'
  if (status === 'available') return 'Available'
  if (status === 'completed') {
    return appointment?.status === APPOINTMENT_STATUS.NO_SHOW ? 'No-show' : 'Completed'
  }
  if (appointment?.status === 'In Progress') return 'In Progress'
  if (appointment?.status === 'Pending') return 'Pending'
  if (appointment?.status === 'Rescheduled') return 'Rescheduled'
  return 'Booked'
}
