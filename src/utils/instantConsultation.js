import { calculateInstantAmount, getInstantRate } from './consultationPricing.js'
import { isSyncable, mergeLists } from './consultationMerge.js'

export const INSTANT_CONSULTATION_STORAGE_KEY = 'astroconnect-instant-consultations'

// Keep consultations available in the current tab when browser storage is full.
// A later successful write clears this fallback and restores persistence.
let volatileConsultations = null
let volatileStorage = null

// ---- Cross-device sync (Upstash Redis behind /api/consultations) ----------------------------------
// localStorage stays the source the UI reads synchronously. Local changes are pushed to the shared
// store, and while something is subscribed the store is polled and merged back into localStorage.
// Without the API (e.g. plain `vite dev`) everything keeps working locally.
const SYNC_URL = '/api/consultations'
const SYNC_INTERVAL_MS = 2000
const SYNC_BACKOFF_MS = 30000
let syncPausedUntil = 0
let pushQueue = new Set()
let pushTimer = null
let pollTimer = null
let subscriberCount = 0
let syncing = false

function applyRemote(remote) {
  if (!Array.isArray(remote)) return
  const { merged, changed } = mergeLists(readAll(), remote)
  if (changed) writeAll(merged)
}

async function callSync(options) {
  if (typeof fetch === 'undefined' || Date.now() < syncPausedUntil) return
  try {
    const response = await fetch(SYNC_URL, { cache: 'no-store', ...options })
    if (!response.ok) throw new Error(`sync ${response.status}`)
    applyRemote((await response.json()).requests)
  } catch {
    // API missing or offline: stay local and retry later.
    syncPausedUntil = Date.now() + SYNC_BACKOFF_MS
  }
}

export function pullInstantConsultations() {
  if (syncing || (typeof document !== 'undefined' && document.hidden)) return Promise.resolve()
  syncing = true
  return callSync().finally(() => { syncing = false })
}

function schedulePush(ids) {
  ids.forEach((id) => pushQueue.add(id))
  if (pushTimer || typeof window === 'undefined') return
  // Deferred so callers that flag/adjust a record right after creating it are pushed in final form.
  pushTimer = setTimeout(() => {
    pushTimer = null
    const ids = [...pushQueue]
    pushQueue = new Set()
    const requests = readAll().filter((request) => ids.includes(request.id) && isSyncable(request))
    if (requests.length) callSync({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests }) })
  }, 0)
}

function startSync() {
  if (typeof window === 'undefined' || pollTimer) return
  pullInstantConsultations()
  pollTimer = setInterval(pullInstantConsultations, SYNC_INTERVAL_MS)
  document.addEventListener('visibilitychange', pullInstantConsultations)
}

function stopSync() {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
  document.removeEventListener('visibilitychange', pullInstantConsultations)
}
// ---------------------------------------------------------------------------------------------------

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
      pricePerMinute: type === 'chat' ? 15 : 25,
      amount: durationMinutes * (type === 'chat' ? 15 : 25),
      userPhone: '+91 98765 43210',
      language: 'Tamil',
      topic: type === 'chat' ? 'Career guidance' : 'Marriage timing',
      paymentMethod: 'Wallet',
      transactionId: `TXN-${id.toUpperCase()}`,
      createdAt: startedAt,
      startedAt,
      endedAt: new Date(new Date(startedAt).getTime() + durationMinutes * 60000).toISOString(),
      updatedAt: startedAt,
      messages,
    }
  }
  return [
    session('instant-call-2026-001', 'call', 'Dr. Rani', 15, 1),
    session('instant-chat-2026-001', 'chat', 'Dr. Rani', 20, 2, [{ id: 'instant-chat-2026-001-message', sender: 'astrologer', text: 'Your chart shows a positive period for steady career progress.', sentAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() }]),
    session('instant-call-2026-002', 'call', 'Dr. Rani', 10, 3),
    session('instant-chat-2026-002', 'chat', 'Dr. Rani', 30, 4, [{ id: 'instant-chat-2026-002-message', sender: 'user', text: 'I would like guidance about my next step.', sentAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString() }]),
    session('instant-chat-2026-003', 'chat', 'Dr. Rani', 15, 5, [{ id: 'instant-chat-2026-003-message', sender: 'astrologer', text: 'Focus on consistency and give this decision time to develop.', sentAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString() }]),
  ]
}

function readAll() {
  if (typeof window === 'undefined') return []
  if (volatileConsultations && volatileStorage === window.localStorage) return volatileConsultations
  volatileConsultations = null
  volatileStorage = null
  try {
    const value = JSON.parse(window.localStorage.getItem(INSTANT_CONSULTATION_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeAll(requests) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(INSTANT_CONSULTATION_STORAGE_KEY, JSON.stringify(requests))
  } catch {
    // A full or restricted localStorage must not crash the React tree.
    volatileConsultations = requests
    volatileStorage = window.localStorage
    return false
  }

  volatileConsultations = null
  volatileStorage = null
  window.dispatchEvent(new CustomEvent('astroconnect:instant-consultation', { detail: requests }))
  return true
}

export function getInstantConsultations() {
  const rawStored = readAll()
  const stored = rawStored.filter((entry) => !entry.id?.startsWith('instant-demo-'))
  const demo = demoConsultations()
  if (typeof window === 'undefined') return stored
  const missingDemo = demo.filter((item) => !stored.some((entry) => entry.id === item.id))
  if (!missingDemo.length && stored.length === rawStored.length) return stored
  const merged = [...stored, ...missingDemo]
  writeAll(merged)
  return merged
}

export function getInstantConsultation(id) {
  return readAll().find((request) => request.id === id) || null
}

export function createInstantConsultation(payload) {
  const now = new Date().toISOString()
  const type = payload.type === 'chat' ? 'chat' : 'call'
  const durationMinutes = Number(payload.durationMinutes) || 10
  // Price is locked in when the request is made so later price edits never change past amounts.
  const pricePerMinute = Number.isFinite(Number(payload.pricePerMinute)) && payload.pricePerMinute !== undefined
    ? Number(payload.pricePerMinute)
    : getInstantRate(payload.astrologerId, type)
  const request = {
    id: crypto.randomUUID(),
    type,
    status: 'ringing',
    userId: payload.userId,
    userName: payload.userName || 'User',
    astrologerId: payload.astrologerId,
    astrologerName: payload.astrologerName || 'Astrologer',
    durationMinutes,
    pricePerMinute,
    amount: calculateInstantAmount(durationMinutes, pricePerMinute),
    extraMinutes: 0,
    amountPaid: Number(payload.amount) || calculateInstantAmount(durationMinutes, pricePerMinute),
    birthDetails: payload.birthDetails || null,
    userAvatar: payload.userAvatar || '',
    userPhone: payload.userPhone || '',
    language: payload.language || '',
    topic: payload.topic || '',
    paymentMethod: 'Wallet',
    transactionId: `TXN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
  const stored = readAll()
  // One waiting request per user and astrologer: repeating the request returns the one already queued.
  const duplicate = stored.find((entry) => entry.status === 'ringing' && entry.userId === request.userId && entry.astrologerId === request.astrologerId && entry.type === request.type)
  if (duplicate) return duplicate
  // Retain terminal sessions for the profile and Activity history views.
  writeAll([request, ...stored])
  schedulePush([request.id])
  return request
}

function mergeMessages(stored = [], incoming = []) {
  const seen = new Set()
  return [...stored, ...incoming]
    .filter((message) => message?.id && !seen.has(message.id) && seen.add(message.id))
    .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
}

/** Appends one message to the latest stored session (never to a stale copy). `sender` is 'user' or 'astrologer'. */
export function appendConsultationMessage(id, sender, text) {
  const value = String(text || '').trim()
  if (!value) return null
  return updateInstantConsultation(id, { messages: [{ id: crypto.randomUUID(), sender, text: value, sentAt: new Date().toISOString() }] })
}

export function updateInstantConsultation(id, patch) {
  let updated = null
  const touched = [id]
  const all = readAll()
  const accepting = patch.status === 'accepted' ? all.find((request) => request.id === id) : null
  const requests = all.map((request) => {
    // A user who connects with one astrologer leaves every other astrologer's waiting queue.
    if (accepting && request.id !== id && request.status === 'ringing' && request.userId === accepting.userId) {
      touched.push(request.id)
      return { ...request, status: 'cancelled', cancelledAt: new Date().toISOString(), cancelReason: 'connected-elsewhere', updatedAt: new Date().toISOString() }
    }
    if (request.id !== id) return request
    // Merge messages by id with what is stored now: a sender holding a stale copy must never drop
    // (or duplicate) a message the other side has just written.
    const messages = patch.messages ? mergeMessages(request.messages, patch.messages) : request.messages
    updated = { ...request, ...patch, ...(messages ? { messages } : {}), updatedAt: new Date().toISOString() }
    return updated
  })
  if (updated) {
    writeAll(requests)
    schedulePush(touched)
  }
  return updated
}

export function getConsultationTotalMinutes(request) {
  return (Number(request?.durationMinutes) || 0) + (Number(request?.extraMinutes) || 0)
}

export function getConsultationEndsAt(request) {
  const startedAt = request?.startedAt ? new Date(request.startedAt).getTime() : 0
  if (!startedAt) return 0
  return startedAt + getConsultationTotalMinutes(request) * 60000
}

export function getConsultationSecondsLeft(request) {
  const endsAt = getConsultationEndsAt(request)
  if (!endsAt) return 0
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
}

export function addConsultationMinutes(id, minutes) {
  const request = getInstantConsultation(id)
  if (!request) return null
  return updateInstantConsultation(id, {
    extraMinutes: (Number(request.extraMinutes) || 0) + (Number(minutes) || 0),
    amountPaid: (Number(request.amountPaid) || 0) + (Number(request.extensionAmount) || 0),
  })
}

export function subscribeToInstantConsultations(listener) {
  if (typeof window === 'undefined') return () => {}
  const notify = () => listener(getInstantConsultations())
  window.addEventListener('storage', notify)
  window.addEventListener('astroconnect:instant-consultation', notify)
  subscriberCount += 1
  startSync()
  return () => {
    window.removeEventListener('storage', notify)
    window.removeEventListener('astroconnect:instant-consultation', notify)
    subscriberCount -= 1
    if (subscriberCount <= 0) { subscriberCount = 0; stopSync() }
  }
}

const pad = (value) => String(value).padStart(2, '0')

/** Session ID like IC20261006-001 (chat: CH...), numbered per type and day by request time. */
export function getSessionCode(session, all = []) {
  const created = new Date(session.createdAt || session.startedAt)
  const day = `${created.getFullYear()}${pad(created.getMonth() + 1)}${pad(created.getDate())}`
  const sameDay = all
    .filter((item) => item.type === session.type && new Date(item.createdAt || item.startedAt).toDateString() === created.toDateString())
    .sort((a, b) => new Date(a.createdAt || a.startedAt) - new Date(b.createdAt || b.startedAt))
  const index = Math.max(0, sameDay.findIndex((item) => item.id === session.id)) + 1
  return `${session.type === 'chat' ? 'CH' : 'IC'}${day}-${String(index).padStart(3, '0')}`
}
