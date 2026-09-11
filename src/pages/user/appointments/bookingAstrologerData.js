import { mockAstrologerAvailability } from '../../../data/notificationData.js'

export const MOCK_SEPTEMBER_AVAILABILITY = {
  '2026-09-07': ['10:00 AM', '02:00 PM', '06:00 PM'],
  '2026-09-08': ['10:00 AM', '02:00 PM'],
  '2026-09-09': ['06:00 PM'],
  '2026-09-10': ['10:00 AM', '02:00 PM', '06:00 PM'],
  '2026-09-11': ['10:00 AM'],
  '2026-09-12': ['10:00 AM', '02:00 PM', '06:00 PM'],
  '2026-09-14': ['10:00 AM', '02:00 PM', '06:00 PM'],
  '2026-09-16': ['06:00 PM'],
  '2026-09-18': ['10:00 AM', '02:00 PM'],
  '2026-09-21': ['06:00 PM'],
  '2026-09-24': ['10:00 AM', '02:00 PM', '06:00 PM'],
}
export const MOCK_FULL_DATES = new Set(['2026-09-09', '2026-09-11', '2026-09-16', '2026-09-21'])

export const BOOKING_WINDOW_END = '2026-09-30'
export const MAX_SELECTABLE_SLOTS = 4

export const BOOKING_OVERRIDES = {
  'astrologer-demo': { availableSlots: 1304, price: 798 },
  'acharya-meena': { availableSlots: 1630, price: 499 },
  'astrologer-demo-3': { availableSlots: 950, price: 799 },
  'astrologer-4': { availableSlots: 950, price: 799 },
  'astrologer-5': { availableSlots: 1630, price: 499 },
  'astrologer-6': { availableSlots: 950, price: 799 },
  'astrologer-7': { availableSlots: 850, price: 599 },
  'astrologer-8': { availableSlots: 720, price: 699 },
  'astrologer-9': { availableSlots: 980, price: 449 },
}

export const DEFAULT_OVERRIDE = { availableSlots: 900, price: 499 }

export const CONSULTATION_TYPE = 'Audio Call'
export const CONSULTATION_DURATION = '30 Minutes'
export const CONSULTATION_PACKAGE = '30 Min Consultation'

export const APPOINTMENT_CONFIG = {
  durationMinutes: 15,
  durationLabel: '15 Minutes',
  bufferMinutes: 5,
  bufferValue: '5 min',
  status: 'Active',
  mode: CONSULTATION_TYPE,
  workingHours: ['9:00 AM – 1:00 PM', '4:00 PM – 8:00 PM'],
}

const WORKING_WINDOWS = [
  { start: 9 * 60, end: 13 * 60 },
  { start: 16 * 60, end: 20 * 60 },
]
const SLOT_CADENCE_MINUTES = APPOINTMENT_CONFIG.durationMinutes + APPOINTMENT_CONFIG.bufferMinutes

const SLOT_TIMES = ['09:00 AM', '09:40 AM', '10:20 AM', '11:00 AM', '11:40 AM', '12:20 PM', '04:00 PM', '04:40 PM', '05:20 PM', '06:00 PM', '06:40 PM', '07:20 PM']

export function keyFor(date) {
  const value = new Date(date)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export function parseKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function normalizeAppointmentDate(value, dateIso) {
  if (dateIso && /^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return dateIso
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : keyFor(parsed)
}

export function formatDate(value) {
  return parseKey(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function timeToMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return -1
  let hours = Number(match[1]) % 12
  if (/pm/i.test(match[3])) hours += 12
  return hours * 60 + Number(match[2])
}

export function minutesToClock(minutes, pad = true) {
  const h24 = ((Math.floor(minutes / 60) % 24) + 24) % 24
  const minute = minutes % 60
  const meridiem = h24 >= 12 ? 'PM' : 'AM'
  const hours12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${pad ? String(hours12).padStart(2, '0') : String(hours12)}:${String(minute).padStart(2, '0')} ${meridiem}`
}

function hashString(value) {
  return String(value || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

export function getBookingOverride(astrologer) {
  return astrologer ? (BOOKING_OVERRIDES[astrologer.id] || DEFAULT_OVERRIDE) : DEFAULT_OVERRIDE
}

export function buildPublishedAvailability(astrologer) {
  const existing = mockAstrologerAvailability[astrologer?.id] || {}
  const generated = {}
  const today = new Date()
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = parseKey(BOOKING_WINDOW_END)
  while (cursor <= end) {
    const key = keyFor(cursor)
    if (!existing[key]) {
      const seed = hashString(`${astrologer.id}:${key}`)
      if (seed % 10 < 6) {
        const count = 2 + (seed % 3)
        const times = new Set()
        for (let index = 0; index < count; index += 1) {
          times.add(SLOT_TIMES[(seed + index * 3) % SLOT_TIMES.length])
        }
        generated[key] = [...times]
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return { ...generated, ...existing }
}

export function buildCalendarAvailability(astrologer) {
  return { ...MOCK_SEPTEMBER_AVAILABILITY, ...buildPublishedAvailability(astrologer) }
}

export function isFullyBooked(dateKey) {
  return MOCK_FULL_DATES.has(dateKey)
}

function workingWindowSlotStarts() {
  return WORKING_WINDOWS.flatMap((window) => {
    const starts = []
    for (let minute = window.start; minute < window.end; minute += SLOT_CADENCE_MINUTES) starts.push(minute)
    return starts
  })
}

export function buildAppointmentDaySlotModel({ availability, dateKey, astrologerId, appointments = [], price }) {
  const publishedMinutes = (Array.isArray(availability?.[dateKey]) ? availability[dateKey] : [])
    .map(timeToMinutes)
    .filter((minutes) => minutes >= 0)
  const publishedSet = new Set(publishedMinutes)
  const dateAppointments = appointments.filter((item) => item.astrologerId === astrologerId && item.status !== 'Cancelled' && normalizeAppointmentDate(item.date, item.dateIso) === dateKey)
  const bookingByMinute = new Map()
  dateAppointments.forEach((item) => {
    const minutes = timeToMinutes(item.time)
    if (minutes >= 0 && !bookingByMinute.has(minutes)) bookingByMinute.set(minutes, item)
  })
  const cadence = workingWindowSlotStarts()
  const slotStarts = [...new Set([...cadence, ...publishedMinutes])].sort((a, b) => a - b)
  const slots = slotStarts.map((startMinutes) => {
    const start = minutesToClock(startMinutes)
    const end = minutesToClock(startMinutes + APPOINTMENT_CONFIG.durationMinutes)
    const booking = bookingByMinute.get(startMinutes)
    let status = 'closed'
    if (booking) status = booking.status === 'Completed' ? 'completed' : 'booked'
    else if (publishedSet.has(startMinutes)) status = 'available'
    return {
      key: `${dateKey}|${start}`,
      date: dateKey,
      time: start,
      timeLabel: minutesToClock(startMinutes, false),
      endTime: end,
      endLabel: minutesToClock(startMinutes + APPOINTMENT_CONFIG.durationMinutes, false),
      status,
      selectable: status === 'available',
    }
  })
  const countBy = (status) => slots.filter((slot) => slot.status === status).length
  return {
    slots,
    summary: {
      workingHours: APPOINTMENT_CONFIG.workingHours,
      duration: APPOINTMENT_CONFIG.durationLabel,
      buffer: APPOINTMENT_CONFIG.bufferValue,
      price,
      available: countBy('available'),
      total: slots.length,
      booked: countBy('booked'),
      completed: countBy('completed'),
      remaining: countBy('available'),
      closed: countBy('closed'),
      status: APPOINTMENT_CONFIG.status,
      mode: APPOINTMENT_CONFIG.mode,
    },
  }
}

export function gridOpenSlotCount({ availability, dateKey, astrologerId, appointments = [] }) {
  return buildAppointmentDaySlotModel({ availability, dateKey, astrologerId, appointments }).summary.remaining
}