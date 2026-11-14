// Browser-side guard: createInstantConsultation refuses (cancels) a new request when the cached astrologer settings forbid it.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map()
globalThis.window = {
  localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) },
  dispatchEvent: () => true,
  setTimeout: (...args) => setTimeout(...args),
  clearTimeout: (...args) => clearTimeout(...args),
  addEventListener: () => {},
  removeEventListener: () => {},
}
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail } }
globalThis.fetch = vi.fn(async () => { throw new Error('offline') })

const { createInstantConsultation } = await import('./instantConsultation.js')
const { publishAvailability, checkInstantAvailability, liveServiceStatus } = await import('./availabilityStore.js')

const ASTRO = 'astrologer-guard'
const make = (type, extra = {}) => createInstantConsultation({ type, userId: `u-${Math.random()}`, astrologerId: ASTRO, astrologerName: 'Dr', durationMinutes: 10, ...extra })

beforeEach(() => store.clear())

describe('client guard + availability store (API offline, cache only)', () => {
  const matrix = [
    ['DND ON + Chat ON + Call ON', { dndEnabled: true, chatEnabled: true, callEnabled: true }, 'cancelled', 'cancelled'],
    ['DND OFF + Chat ON + Call ON', { dndEnabled: false, chatEnabled: true, callEnabled: true }, 'ringing', 'ringing'],
    ['DND OFF + Chat ON + Call OFF', { dndEnabled: false, chatEnabled: true, callEnabled: false }, 'ringing', 'cancelled'],
    ['DND OFF + Chat OFF + Call ON', { dndEnabled: false, chatEnabled: false, callEnabled: true }, 'cancelled', 'ringing'],
    ['DND OFF + Chat OFF + Call OFF', { dndEnabled: false, chatEnabled: false, callEnabled: false }, 'cancelled', 'cancelled'],
  ]
  it.each(matrix)('%s', async (_name, settings, chatStatus, callStatus) => {
    await publishAvailability(ASTRO, settings)
    expect(make('chat').status).toBe(chatStatus)
    expect(make('call').status).toBe(callStatus)
    expect((await checkInstantAvailability(ASTRO, 'chat')).ok).toBe(chatStatus === 'ringing')
    expect((await checkInstantAvailability(ASTRO, 'call')).ok).toBe(callStatus === 'ringing')
    expect(liveServiceStatus(ASTRO, 'chat', 'Available')).toBe(chatStatus === 'ringing' ? 'Available' : 'Offline')
  })

  it('records why a request was refused', async () => {
    await publishAvailability(ASTRO, { dndEnabled: true })
    expect(make('chat')).toMatchObject({ status: 'cancelled', cancelReason: 'astrologer-unavailable' })
  })

  it('lets the astrologer simulators bypass the guard, and unknown astrologers default open', async () => {
    await publishAvailability(ASTRO, { dndEnabled: true })
    expect(make('chat', { bypassAvailability: true }).status).toBe('ringing')
    expect(createInstantConsultation({ type: 'chat', userId: 'u-x', astrologerId: 'someone-else', durationMinutes: 5 }).status).toBe('ringing')
  })
})
