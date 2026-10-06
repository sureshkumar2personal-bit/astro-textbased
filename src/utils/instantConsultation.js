export const INSTANT_CONSULTATION_STORAGE_KEY = 'astroconnect-instant-consultations'

function readAll() {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(INSTANT_CONSULTATION_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeAll(requests) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(INSTANT_CONSULTATION_STORAGE_KEY, JSON.stringify(requests))
  window.dispatchEvent(new CustomEvent('astroconnect:instant-consultation', { detail: requests }))
}

export function getInstantConsultations() {
  return readAll()
}

export function getInstantConsultation(id) {
  return readAll().find((request) => request.id === id) || null
}

export function createInstantConsultation(payload) {
  const now = new Date().toISOString()
  const request = {
    id: crypto.randomUUID(),
    type: payload.type === 'chat' ? 'chat' : 'call',
    status: 'ringing',
    userId: payload.userId,
    userName: payload.userName || 'User',
    astrologerId: payload.astrologerId,
    astrologerName: payload.astrologerName || 'Astrologer',
    durationMinutes: Number(payload.durationMinutes) || 10,
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
  writeAll([request, ...readAll().filter((entry) => entry.status !== 'ended')])
  return request
}

export function updateInstantConsultation(id, patch) {
  let updated = null
  const requests = readAll().map((request) => {
    if (request.id !== id) return request
    updated = { ...request, ...patch, updatedAt: new Date().toISOString() }
    return updated
  })
  if (updated) writeAll(requests)
  return updated
}

export function subscribeToInstantConsultations(listener) {
  if (typeof window === 'undefined') return () => {}
  const notify = () => listener(readAll())
  window.addEventListener('storage', notify)
  window.addEventListener('astroconnect:instant-consultation', notify)
  return () => {
    window.removeEventListener('storage', notify)
    window.removeEventListener('astroconnect:instant-consultation', notify)
  }
}
