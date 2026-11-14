// Exercises the real API handlers (api/availability.js, api/consultations.js) against an in-memory Redis stand-in,
// including direct "customer" POSTs that skip every browser check.
import { beforeEach, describe, expect, it } from 'vitest'
import { createAvailabilityHandler } from '../../api/availability.js'
import { createConsultationsHandler } from '../../api/consultations.js'

function fakeDb() {
  const hashes = new Map()
  const keys = new Map()
  const hash = (key) => { if (!hashes.has(key)) hashes.set(key, new Map()); return hashes.get(key) }
  return {
    async hget(key, field) { return hash(key).get(field) ?? null },
    async hset(key, values) { Object.entries(values).forEach(([field, value]) => hash(key).set(field, value)); return 1 },
    async hgetall(key) { return hash(key).size ? Object.fromEntries(hash(key)) : null },
    async set(key, value, options = {}) { if (options.nx && keys.has(key)) return null; keys.set(key, value); return 'OK' },
  }
}

function call(handler, { method = 'GET', query = {}, body } = {}) {
  return new Promise((resolve) => {
    const res = { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v }, status(code) { this.statusCode = code; return this }, json(payload) { resolve({ status: this.statusCode, body: payload }) } }
    handler({ method, query, body }, res)
  })
}

const ASTRO = 'astrologer-demo'
let db, availability, consultations
const setAvailability = (patch) => call(availability, { method: 'POST', body: { astrologerId: ASTRO, ...patch } })
let counter = 0
const request = (overrides = {}) => ({ id: `req-${++counter}`, type: 'chat', status: 'ringing', userId: `user-${counter}`, astrologerId: ASTRO, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides })
const call_ = call
const submit = (...requests) => call(consultations, { method: 'POST', body: { requests } })

beforeEach(() => {
  db = fakeDb()
  availability = createAvailabilityHandler(() => db)
  consultations = createConsultationsHandler(() => db)
})

describe('availability API', () => {
  it('defaults to everything on and persists updates', async () => {
    expect((await call(availability, { query: { astrologerId: ASTRO } })).body.availability).toMatchObject({ chatEnabled: true, callEnabled: true, dndEnabled: false, chatAvailable: true, callAvailable: true })
    await setAvailability({ dndEnabled: true })
    const stored = (await call(availability, { query: { astrologerId: ASTRO } })).body.availability
    expect(stored).toMatchObject({ dndEnabled: true, chatAvailable: false, callAvailable: false })
    expect(stored.updatedAt).toBeTruthy()
  })

  it('merges partial updates and keeps the other flags', async () => {
    await setAvailability({ callEnabled: false })
    await setAvailability({ chatEnabled: true })
    expect((await call(availability, { query: { astrologerId: ASTRO } })).body.availability).toMatchObject({ chatEnabled: true, callEnabled: false })
  })

  it('lists everyone who saved settings', async () => {
    await call(availability, { method: 'POST', body: { astrologerId: 'a-1', dndEnabled: true } })
    await call(availability, { method: 'POST', body: { astrologerId: 'a-2', chatEnabled: false } })
    const { availabilities } = (await call(availability, { query: {} })).body
    expect(availabilities['a-1']).toMatchObject({ dndEnabled: true, chatAvailable: false })
    expect(availabilities['a-2']).toMatchObject({ chatAvailable: false, callAvailable: true })
  })

  it('rejects bad input', async () => {
    expect((await call(availability, { method: 'POST', body: { astrologerId: ASTRO, dndEnabled: 'yes' } })).status).toBe(400)
    expect((await call(availability, { method: 'POST', body: { astrologerId: 'bad id!', dndEnabled: true } })).status).toBe(400)
    expect((await call(availability, { method: 'POST', body: { astrologerId: ASTRO } })).status).toBe(400)
    expect((await call(availability, { query: { astrologerId: 'bad id!' } })).status).toBe(400)
    expect((await call(availability, { method: 'DELETE' })).status).toBe(405)
  })
})

describe('consultations API enforces availability (direct POST cannot bypass it)', () => {
  const matrix = [
    ['1. DND ON + Chat ON + Call ON', { dndEnabled: true, chatEnabled: true, callEnabled: true }, false, false],
    ['2. DND OFF + Chat ON + Call ON', { dndEnabled: false, chatEnabled: true, callEnabled: true }, true, true],
    ['3. DND OFF + Chat ON + Call OFF', { dndEnabled: false, chatEnabled: true, callEnabled: false }, true, false],
    ['4. DND OFF + Chat OFF + Call ON', { dndEnabled: false, chatEnabled: false, callEnabled: true }, false, true],
    ['5. DND OFF + Chat OFF + Call OFF', { dndEnabled: false, chatEnabled: false, callEnabled: false }, false, false],
  ]
  it.each(matrix)('%s', async (_name, settings, chatOk, callOk) => {
    await setAvailability(settings)
    const chat = await submit(request({ type: 'chat' }))
    const voice = await submit(request({ type: 'call' }))
    expect(chat.body.rejected.length).toBe(chatOk ? 0 : 1)
    expect(voice.body.rejected.length).toBe(callOk ? 0 : 1)
    if (!chatOk) expect(chat.body.rejected[0].reason).toBe('astrologer-unavailable')
    const listed = (await call_(consultations, { method: 'GET' })).body.requests
    expect(listed.filter((entry) => entry.type === 'chat').length).toBe(chatOk ? 1 : 0)
    expect(listed.filter((entry) => entry.type === 'call').length).toBe(callOk ? 1 : 0)
  })

  it('blocks a request forged as already accepted, and unknown types', async () => {
    await setAvailability({ dndEnabled: true })
    expect((await submit(request({ status: 'accepted' }))).body.rejected).toHaveLength(1)
    expect((await submit(request({ type: 'video' }))).body.rejected[0].reason).toBe('invalid-type')
  })

  it('does not interrupt a session that already exists when a service is turned off', async () => {
    const live = request({ status: 'accepted', type: 'call' })
    await submit(live)
    await setAvailability({ callEnabled: false, dndEnabled: true })
    const update = await submit({ ...live, status: 'ended', updatedAt: new Date(Date.now() + 1000).toISOString() })
    expect(update.body.rejected).toHaveLength(0)
    expect(update.body.requests.find((entry) => entry.id === live.id).status).toBe('ended')
  })

  it('stores finished history even while unavailable (appointments/history are not gated)', async () => {
    await setAvailability({ dndEnabled: true })
    expect((await submit(request({ status: 'ended' }))).body.rejected).toHaveLength(0)
  })

  it('refuses a second waiting request from the same user for the same astrologer and service', async () => {
    const first = request({ userId: 'user-dup' })
    expect((await submit(first)).body.rejected).toHaveLength(0)
    expect((await submit(request({ userId: 'user-dup' }))).body.rejected[0].reason).toBe('duplicate')
    expect((await submit(request({ userId: 'user-dup', type: 'call' }))).body.rejected).toHaveLength(0)
  })

  it('serialises two concurrent creates from one user (only one is stored)', async () => {
    const [a, b] = await Promise.all([submit(request({ userId: 'user-race' })), submit(request({ userId: 'user-race' }))])
    expect(a.body.rejected.length + b.body.rejected.length).toBe(1)
  })
})
