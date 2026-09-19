import { createEmptyRemedyNotes, normalizeRemedyNotes } from './remedyNotes.js'

export const ATONEMENT_SOURCE_TYPES = ['question', 'chat', 'call', 'appointment']

export const ATONEMENT_SOURCE_LABELS = {
  question: 'Text Question',
  chat: 'Chat',
  call: 'Call',
  appointment: 'Appointment',
}

export const ATONEMENT_SOURCE_GROUPS = {
  all: ATONEMENT_SOURCE_TYPES,
  text: ['question'],
  'calls-chats': ['chat', 'call'],
  appointments: ['appointment'],
}

function clean(value) {
  return String(value || '').trim()
}

export function createEmptyAtonementDay() {
  return {
    ...createEmptyRemedyNotes(),
    date: '',
    completed: false,
    completedAt: null,
  }
}

export function normalizeAtonementDay(day = {}, index = 0) {
  const notes = normalizeRemedyNotes(day)
  return {
    ...notes,
    date: clean(day.date),
    dayNumber: Number(day.dayNumber) || index + 1,
    completed: day.completed === true,
    completedAt: day.completedAt || null,
  }
}

export function normalizeAtonement(record = {}) {
  const days = Array.isArray(record.days) && record.days.length
    ? record.days.map(normalizeAtonementDay)
    : [normalizeAtonementDay(record)]
  let foundIncomplete = false
  const sequentialDays = days.map((day) => {
    if (!foundIncomplete && day.completed) return day
    foundIncomplete = true
    return day.completed ? { ...day, completed: false, completedAt: null } : day
  })
  const progress = getAtonementProgress({ days: sequentialDays })
  const first = sequentialDays[0]
  return {
    id: record.id || crypto.randomUUID(),
    userId: record.userId || record.recipient || '',
    recipient: record.recipient || record.userId || '',
    astrologerId: record.astrologerId || '',
    astrologerName: record.astrologerName || 'Astrologer',
    sourceType: ATONEMENT_SOURCE_TYPES.includes(record.sourceType) ? record.sourceType : 'question',
    sourceId: record.sourceId || '',
    sourceLabel: record.sourceLabel || 'Consultation',
    summary: clean(record.summary || first.summary),
    day: clean(record.day || first.day),
    hour: clean(record.hour || first.hour),
    place: clean(record.place || first.place),
    deity: clean(record.deity || record.god || first.god),
    god: clean(record.god || record.deity || first.god),
    things: clean(record.things || first.things),
    poojas: clean(record.poojas || first.poojas),
    extraNotes: clean(record.extraNotes || first.extraNotes),
    days: sequentialDays,
    status: progress.completed === progress.total ? 'completed' : 'pending',
    createdAt: record.createdAt || new Date().toISOString(),
    completedAt: progress.completed === progress.total
      ? (record.completedAt || days.at(-1)?.completedAt || new Date().toISOString())
      : null,
  }
}

export function createAtonementRecord(payload = {}) {
  const days = (payload.days?.length ? payload.days : [payload]).map(normalizeAtonementDay)
  return normalizeAtonement({ ...payload, days, id: payload.id || `ATN-${Date.now().toString(36).toUpperCase()}` })
}

export function getAtonementProgress(atonement = {}) {
  const days = Array.isArray(atonement.days) ? atonement.days : []
  const completed = days.filter((day) => day.completed).length
  return { completed, total: days.length, percent: days.length ? Math.round((completed / days.length) * 100) : 0 }
}

export function getNextActionableDayIndex(atonement = {}) {
  const index = (atonement.days || []).findIndex((day) => !day.completed)
  return index
}

export function getFirstIncompleteAtonementDay(atonement = {}) {
  const index = getNextActionableDayIndex(atonement)
  return index === -1 ? null : { day: atonement.days[index], index }
}

export function localDateIso(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return ''
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export function isAtonementDayActionable(atonement, index, date = new Date()) {
  const next = getNextActionableDayIndex(atonement)
  if (index !== next) return false
  const ritualDate = atonement.days?.[index]?.date
  return !ritualDate || ritualDate <= localDateIso(date)
}

export function isAtonementDayLocked(atonement, index) {
  const next = getNextActionableDayIndex(atonement)
  return next !== -1 && index > next
}

export function updateAtonementDay(atonement, index, completed, date = new Date()) {
  const days = (atonement.days || []).map((day) => ({ ...day }))
  if (!days[index]) return atonement
  const progress = getAtonementProgress(atonement)
  const next = getNextActionableDayIndex(atonement)
  const isUndo = completed === false
  if (isUndo && index !== Math.max(0, progress.completed - 1)) return atonement
  if (!isUndo && (index !== next || !isAtonementDayActionable(atonement, index, date))) return atonement

  days[index] = { ...days[index], completed, completedAt: completed ? new Date().toISOString() : null }
  if (isUndo) {
    days.forEach((day, dayIndex) => {
      if (dayIndex > index) days[dayIndex] = { ...day, completed: false, completedAt: null }
    })
  }
  const nextProgress = getAtonementProgress({ days })
  return {
    ...atonement,
    days,
    status: nextProgress.completed === nextProgress.total ? 'completed' : 'pending',
    completedAt: nextProgress.completed === nextProgress.total ? days.at(-1)?.completedAt || new Date().toISOString() : null,
  }
}

export function sourceLabel(sourceType) {
  return ATONEMENT_SOURCE_LABELS[sourceType] || 'Consultation'
}
