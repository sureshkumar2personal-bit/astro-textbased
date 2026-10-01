import { createEmptyRemedyNotes, normalizeRemedyNotes } from './remedyNotes.js'

export const ATONEMENT_SOURCE_TYPES = ['question', 'chat', 'call', 'appointment']

export const ATONEMENT_SOURCE_LABELS = {
  question: 'Text Question',
  chat: 'Chat',
  call: 'Call',
  appointment: 'Appointment',
}

export const RECORD_CATEGORIES = {
  text: 'Text Question',
  call: 'Call',
  chat: 'Chat',
  appointment: 'Appointment',
  atonement: 'Atonement / Pariharam',
}

export function categoryLabel(category) {
  return RECORD_CATEGORIES[category] || RECORD_CATEGORIES.atonement
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

export function normalizeProof(proof) {
  if (!proof || typeof proof !== 'object' || !proof.dataUrl) return null
  return { name: clean(proof.name) || 'Proof', type: clean(proof.type), dataUrl: proof.dataUrl, addedAt: proof.addedAt || null }
}

export const PROOF_TYPE_LABELS = {
  photo: 'Photo',
  video: 'Video',
  'audio-sankalpam': 'Audio Sankalpam',
  'temple-receipt': 'Temple Receipt',
}

// Astrologer-configured proof map ({photo:'required'|'optional'}) -> list of {key,label,required}.
export function normalizeProofRequirements(value) {
  if (!value || typeof value !== 'object') return []
  return Object.entries(value)
    .filter(([, mode]) => mode === 'required' || mode === 'optional')
    .map(([key, mode]) => ({ key, label: PROOF_TYPE_LABELS[key] || key, required: mode === 'required' }))
}

export function setAtonementDayProof(atonement, index, proof) {
  const day = atonement.days?.[index]
  if (!day || !day.completed) return atonement
  const days = atonement.days.map((item, i) => (i === index ? { ...item, proof: normalizeProof(proof) } : item))
  return { ...atonement, days }
}

export function normalizeAtonementDay(day = {}, index = 0) {
  const notes = normalizeRemedyNotes(day)
  return {
    ...notes,
    date: clean(day.date),
    dayNumber: Number(day.dayNumber) || index + 1,
    completed: day.completed === true,
    completedAt: day.completedAt || null,
    proof: normalizeProof(day.proof),
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
    category: 'atonement',
    userId: record.userId || record.recipient || '',
    recipient: record.recipient || record.userId || '',
    astrologerId: record.astrologerId || '',
    astrologerName: record.astrologerName || 'Astrologer',
    sourceType: ATONEMENT_SOURCE_TYPES.includes(record.sourceType) ? record.sourceType : 'question',
    sourceId: record.sourceId || '',
    appointmentId: record.appointmentId || '',
    consultationId: record.consultationId || '',
    templateId: record.templateId || '',
    customerName: record.customerName || '',
    title: clean(record.title || record.method?.title),
    assignedBy: record.assignedBy || record.astrologerId || '',
    assignedAt: record.assignedAt || record.createdAt || null,
    proofRequirements: normalizeProofRequirements(record.proofRequirements || record.method?.proof),
    method: record.method && typeof record.method === 'object' ? record.method : null,
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

// Chrome blocks top-level navigation to data: URLs, so open proof through a blob URL instead.
export async function openProofInNewTab(proof) {
  if (!proof?.dataUrl) return
  try {
    const blob = await (await fetch(proof.dataUrl)).blob()
    window.open(URL.createObjectURL(blob), '_blank', 'noopener')
  } catch {
    window.open(proof.dataUrl, '_blank', 'noopener')
  }
}
