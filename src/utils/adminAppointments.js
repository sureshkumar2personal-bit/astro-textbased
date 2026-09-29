import { mockAstrologers } from '../data/notificationData.js'

// Pure selectors for the Admin -> Appointments module.
//
// Reads the live appointments store already exposed by AppDataContext
// (localStorage key astroconnect-appointments, merged with the seed lists from
// data/notificationData.js and data/appointmentHistoryData.js). No appointment
// record is created, reshaped or invented here.

// Stored appointments always carry the astrologer name, but the catalog is used
// as a fallback so an appointment saved without one still shows a real name
// rather than a blank cell.
const ASTROLOGER_NAMES = new Map(mockAstrologers.map((astrologer) => [astrologer.id, astrologer.name]))

export function getAppointmentAstrologerName(appointment) {
  return appointment?.astrologer || ASTROLOGER_NAMES.get(appointment?.astrologerId) || ''
}

export function getAppointmentUserName(appointment) {
  return appointment?.customerName || appointment?.customer || ''
}

export function getAppointmentDate(appointment) {
  return appointment?.dateIso || appointment?.date || ''
}

export function getAppointmentTime(appointment) {
  return appointment?.time || appointment?.start || ''
}

// Filter options are derived from the appointments that actually exist, so the
// filter can only ever offer a status the data already contains.
export function selectAppointmentStatusFilters(appointments) {
  const statuses = new Set()
  for (const appointment of Array.isArray(appointments) ? appointments : []) {
    const status = String(appointment?.status || '').trim()
    if (status) statuses.add(status)
  }
  return ['All', ...Array.from(statuses).sort((a, b) => a.localeCompare(b))]
}

export function matchesAppointmentQuery(appointment, query) {
  const search = String(query || '').trim().toLowerCase()
  if (!search) return true
  return [appointment?.id, appointment?.orderId, getAppointmentUserName(appointment), getAppointmentAstrologerName(appointment)]
    .some((field) => String(field || '').toLowerCase().includes(search))
}

export function filterAdminAppointments(appointments, { query = '', status = 'All' } = {}) {
  return (Array.isArray(appointments) ? appointments : []).filter((appointment) => {
    if (!matchesAppointmentQuery(appointment, query)) return false
    if (status && status !== 'All' && String(appointment?.status || '').trim() !== status) return false
    return true
  })
}

export function findAdminAppointment(appointments, appointmentId) {
  return (Array.isArray(appointments) ? appointments : []).find((appointment) => appointment.id === appointmentId) || null
}
