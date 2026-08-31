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
  const status = appointment.status || 'Confirmed'
  if (status === 'Cancelled') return 'cancelled'
  if (status === 'Completed') return 'completed'

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

// Ticking clock used to drive countdowns and auto state transitions.
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

// ---- Status presentation --------------------------------------------------

export const STATUS_THEME = {
  Confirmed: { label: 'Confirmed', tone: 'confirmed' },
  Pending: { label: 'Pending', tone: 'pending' },
  Rescheduled: { label: 'Rescheduled', tone: 'pending' },
  'In Progress': { label: 'In Progress', tone: 'live' },
  Completed: { label: 'Completed', tone: 'completed' },
  Cancelled: { label: 'Cancelled', tone: 'cancelled' },
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
