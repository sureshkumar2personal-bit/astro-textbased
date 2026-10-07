export const INSTANT_CONSULTATION_STORAGE_KEY = 'astroconnect-instant-consultations'

function demoConsultations() {
  const now = Date.now()
  const session = (id, type, astrologerName, durationMinutes, daysAgo, messages = []) => {
    const startedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString()
    return {
      id,
      type,
      status: 'ended',
      userId: 'user-demo',
      userName: 'Priya V.',
      astrologerId: 'astrologer-demo',
      astrologerName,
      durationMinutes,
      createdAt: startedAt,
      startedAt,
      endedAt: new Date(new Date(startedAt).getTime() + durationMinutes * 60000).toISOString(),
      updatedAt: startedAt,
      messages,
    }
  }
  return [
    session('instant-demo-call-001', 'call', 'Dr. Rani', 15, 1),
    session('instant-demo-chat-001', 'chat', 'Dr. Rani', 20, 2, [{ id: 'instant-demo-chat-001-message', sender: 'astrologer', text: 'Your chart shows a positive period for steady career progress.', sentAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() }]),
    session('instant-demo-call-002', 'call', 'Dr. Rani', 10, 3),
    session('instant-demo-chat-002', 'chat', 'Dr. Rani', 30, 4, [{ id: 'instant-demo-chat-002-message', sender: 'user', text: 'I would like guidance about my next step.', sentAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString() }]),
    session('instant-demo-chat-003', 'chat', 'Dr. Rani', 15, 5, [{ id: 'instant-demo-chat-003-message', sender: 'astrologer', text: 'Focus on consistency and give this decision time to develop.', sentAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString() }]),
  ]
}

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
  const stored = readAll()
  const demo = demoConsultations()
  if (typeof window === 'undefined') return stored
  const missingDemo = demo.filter((item) => !stored.some((entry) => entry.id === item.id))
  if (!missingDemo.length) return stored
  const merged = [...stored, ...missingDemo]
  writeAll(merged)
  return merged
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
  // Retain terminal sessions for the profile and Activity history views.
  writeAll([request, ...readAll()])
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
  const notify = () => listener(getInstantConsultations())
  window.addEventListener('storage', notify)
  window.addEventListener('astroconnect:instant-consultation', notify)
  return () => {
    window.removeEventListener('storage', notify)
    window.removeEventListener('astroconnect:instant-consultation', notify)
  }
}
