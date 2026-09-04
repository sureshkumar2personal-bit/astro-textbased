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

export function getDateAvailability(template, date) {
  const iso = typeof date === 'string' ? date : toIsoDate(date)
  const day = typeof date === 'string' ? fromIsoDate(date) : date
  const override = template?.dateOverrides?.[iso]
  if (override) {
    return {
      status: override.status || 'Available',
      windows: override.windows || [],
      breaks: override.breaks || [],
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
    windows: weekly?.enabled ? (weekly.slots || []) : [],
    breaks: weekly?.enabled ? (weekly.breaks || []) : [],
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
// appointment duration drives slot length (slotEnd = slotStart + duration); a
// short fixed grid interval places start times. The full duration must fit
// inside a working period (never split/shortened), must not overlap a break or
// an existing appointment, and must be in the future for the current day.
export function generateAppointmentSlots({ template, date, appointments = [], now = new Date() }) {
  const day = typeof date === 'string' ? fromIsoDate(date) : date
  const iso = toIsoDate(day)
  if (!template || !isWithinSchedulingHorizon(day, now, 3)) return []
  const schedule = getDateAvailability(template, day)
  if (schedule.status !== 'Available') return []
  const duration = Math.max(1, Math.round(Number(template.appointmentDuration) || 30))
  const interval = Math.min(duration, 15)
  const occupied = appointments
    .filter((appointment) => appointment.dateIso === iso && appointment.status !== 'Cancelled')
    .map(resolveAppointmentWindow)
  const manualBooked = new Set(getManualBookedSlots(template, iso))
  const breaks = (schedule.breaks || []).map((item) => ({ start: parseTimeToMinutes(item.start), end: parseTimeToMinutes(item.end) }))
  const slots = []
  ;(schedule.windows || []).forEach((window) => {
    const windowStart = parseTimeToMinutes(window.start)
    const windowEnd = parseTimeToMinutes(window.end)
    for (let start = windowStart; start + duration <= windowEnd; start += interval) {
      const end = start + duration
      if (appointmentDateTime(iso, start).getTime() <= now.getTime()) continue
      const isBreak = breaks.some((item) => overlaps(start, end, item.start, item.end))
      const isBooked = occupied.some((item) => overlaps(start, end, item.startMin, item.endMin))
      if (!isBreak && !isBooked && !manualBooked.has(start)) slots.push({ startMin: start, endMin: end, status: 'available' })
    }
  })
  return slots
}

// The scheduling editor needs both bookable and occupied slots.  This keeps
// the rules in one place: breaks are excluded, while cancelled appointments
// deliberately leave their slot available again.
export function getAppointmentSlotSummary({ template, date, appointments = [], now = new Date() }) {
  const day = typeof date === 'string' ? fromIsoDate(date) : date
  const iso = toIsoDate(day)
  if (!template || !isWithinSchedulingHorizon(day, now, 3)) return { total: 0, booked: 0, available: 0, slots: [] }
  const schedule = getDateAvailability(template, day)
  if (schedule.status !== 'Available') return { total: 0, booked: 0, available: 0, slots: [] }
  const duration = Math.max(1, Math.round(Number(template.appointmentDuration) || 30))
  const interval = Math.min(duration, 15)
  const appointmentsForDay = appointments.filter((appointment) => appointment.dateIso === iso && appointment.status !== 'Cancelled')
  const manualBooked = new Set(getManualBookedSlots(template, iso))
  const breaks = (schedule.breaks || []).map((item) => ({ start: parseTimeToMinutes(item.start), end: parseTimeToMinutes(item.end) }))
  const slots = []
  ;(schedule.windows || []).forEach((window) => {
    const windowStart = parseTimeToMinutes(window.start)
    const windowEnd = parseTimeToMinutes(window.end)
    for (let start = windowStart; start + duration <= windowEnd; start += interval) {
      const end = start + duration
      if (breaks.some((item) => overlaps(start, end, item.start, item.end))) continue
      const appointment = appointmentsForDay.find((item) => {
        const range = resolveAppointmentWindow(item)
        return overlaps(start, end, range.startMin, range.endMin)
      })
      const manual = manualBooked.has(start)
      slots.push({ startMin: start, endMin: end, status: appointment || manual ? 'booked' : 'available', appointment, manual: manual && !appointment })
    }
  })
  const booked = slots.filter((slot) => slot.status === 'booked').length
  return { total: slots.length, booked, available: slots.length - booked, slots }
}
