// Browser side of astrologer availability. The server (api/availability.js) is the source of truth; this keeps a
// per-browser cache so the dashboard and customer pages react instantly and keep working if the API is unreachable.
//
//   astrologer dashboard -> publishAvailability()  -> cache + POST /api/availability
//   customer pages       -> useAstrologerAvailability() / checkInstantAvailability() -> GET /api/availability (polled)
import { useEffect, useState } from 'react'
import { canStartInstant, normalizeAvailability, unavailableMessage } from './astrologerAvailability.js'

const CACHE_KEY = 'astroconnect-astrologer-availability'
const EVENT = 'astroconnect:availability'
const API = '/api/availability'
const POLL_MS = 4000
const CHECK_TIMEOUT_MS = 3000

const readCache = () => {
  try { return JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}') || {} } catch { return {} }
}

export function getCachedAvailability(astrologerId) {
  if (typeof window === 'undefined' || !astrologerId) return null
  return readCache()[astrologerId] || null
}

function cacheAvailability(astrologerId, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), [astrologerId]: { ...normalizeAvailability(value), updatedAt: value.updatedAt || new Date().toISOString() } }))
  } catch { /* storage full or blocked: the server copy still applies */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: astrologerId }))
}

async function request(url, options, timeoutMs, field = 'availability') {
  const controller = new AbortController()
  const timer = timeoutMs ? window.setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal, ...options })
    if (!response.ok) return null
    return (await response.json())[field] || null
  } catch {
    return null // API missing or offline
  } finally {
    if (timer) window.clearTimeout(timer)
  }
}

/** Reads the server copy and caches it (only when something was ever saved there). Resolves to it, or null. */
export async function fetchAvailability(astrologerId, timeoutMs) {
  if (!astrologerId) return null
  const remote = await request(`${API}?astrologerId=${encodeURIComponent(astrologerId)}`, undefined, timeoutMs)
  if (remote?.updatedAt) cacheAvailability(astrologerId, remote)
  return remote
}

/** Reads everyone's saved settings (for directory pages) and caches each. */
export async function fetchAllAvailability() {
  const all = await request(API, undefined, undefined, 'availabilities')
  if (all) Object.entries(all).forEach(([id, value]) => { if (value?.updatedAt) cacheAvailability(id, value) })
  return all
}

/** Saves astrologer settings: cache first (instant UI), then the server. Resolves to the server copy, or null if offline. */
export async function publishAvailability(astrologerId, settings) {
  if (!astrologerId) return null
  const next = normalizeAvailability(settings)
  cacheAvailability(astrologerId, next)
  const saved = await request(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ astrologerId, ...next }) })
  if (saved?.updatedAt) cacheAvailability(astrologerId, saved)
  return saved
}

/**
 * Asked right before a customer pays: { ok, message }. Uses a fresh server read; if the server cannot be reached it falls
 * back to the cached value, and with neither it allows the request (the server still re-checks when the request is stored).
 */
export async function checkInstantAvailability(astrologerId, type) {
  const remote = await fetchAvailability(astrologerId, CHECK_TIMEOUT_MS)
  const settings = remote || getCachedAvailability(astrologerId)
  if (!settings || canStartInstant(settings, type)) return { ok: true, message: '' }
  return { ok: false, message: unavailableMessage(settings, type) }
}

/** Live { chatAvailable, callAvailable, known } for one astrologer; `known` is false until something was saved for them. */
export function useAstrologerAvailability(astrologerId) {
  const read = () => {
    const cached = getCachedAvailability(astrologerId)
    return cached ? { known: true, chatAvailable: canStartInstant(cached, 'chat'), callAvailable: canStartInstant(cached, 'call'), settings: cached } : { known: false, chatAvailable: true, callAvailable: true, settings: null }
  }
  const [state, setState] = useState(read)
  useEffect(() => {
    if (!astrologerId) return undefined
    const refresh = () => setState(read())
    refresh()
    const poll = () => { if (!document.hidden) fetchAvailability(astrologerId) }
    poll()
    const timer = window.setInterval(poll, POLL_MS)
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener(EVENT, refresh); window.removeEventListener('storage', refresh) }
  }, [astrologerId])
  return state
}

/** Re-renders a directory page whenever any astrologer's availability changes (polls the whole list). */
export function useAvailabilityVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const bump = () => setVersion((value) => value + 1)
    const poll = () => { if (!document.hidden) fetchAllAvailability() }
    poll()
    const timer = window.setInterval(poll, POLL_MS)
    window.addEventListener(EVENT, bump)
    window.addEventListener('storage', bump)
    return () => { window.clearInterval(timer); window.removeEventListener(EVENT, bump); window.removeEventListener('storage', bump) }
  }, [])
  return version
}

/** Catalogue status ('Available' | 'Busy' | 'Offline') adjusted by the astrologer's own switches. */
export function liveServiceStatus(astrologerId, kind, catalogueStatus) {
  const cached = getCachedAvailability(astrologerId)
  if (cached && !canStartInstant(cached, kind)) return 'Offline'
  return catalogueStatus
}
