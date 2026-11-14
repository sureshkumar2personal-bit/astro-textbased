import { beforeEach, describe, expect, it } from 'vitest'
import {
  addConsultationMinutes,
  createInstantConsultation,
  getConsultationEndsAt,
  getConsultationSecondsLeft,
  getConsultationTotalMinutes,
  getInstantConsultation,
  getInstantConsultations,
  getAstrologerLiveStatus,
  updateInstantConsultation,
} from './instantConsultation.js'

// The suite runs in the node environment, so stand up just enough of `window`
// for the module's localStorage-backed store.
function installWindowStub() {
  const data = new Map()
  const localStorage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  }
  const listeners = new Set()
  globalThis.window = {
    localStorage,
    addEventListener: (type, listener) => { if (type === 'storage') listeners.add(listener) },
    removeEventListener: (type, listener) => { if (type === 'storage') listeners.delete(listener) },
    dispatchEvent: () => true,
  }
  return localStorage
}

const store = () => globalThis.window.localStorage.getItem('astroconnect-instant-consultations')

describe('consultation duration maths', () => {
  beforeEach(() => {
    installWindowStub()
  })

  it('totals only the booked minutes before any extension', () => {
    const request = createInstantConsultation({ type: 'call', userId: 'u1', astrologerId: 'a1', durationMinutes: 10 })

    expect(request.extraMinutes).toBe(0)
    expect(getConsultationTotalMinutes(request)).toBe(10)
  })

  it('treats legacy records without extraMinutes as a plain booking', () => {
    expect(getConsultationTotalMinutes({ durationMinutes: 15 })).toBe(15)
    expect(getConsultationTotalMinutes({})).toBe(0)
  })

  it('accumulates extension minutes on top of the original booking', () => {
    const request = createInstantConsultation({ type: 'call', userId: 'u1', astrologerId: 'a1', durationMinutes: 10 })

    addConsultationMinutes(request.id, 5)
    addConsultationMinutes(request.id, 15)

    expect(getConsultationTotalMinutes(getInstantConsultation(request.id))).toBe(30)
  })

  it('moves the end time forward when time is bought', () => {
    const request = createInstantConsultation({ type: 'call', userId: 'u1', astrologerId: 'a1', durationMinutes: 10 })
    const accepted = updateInstantConsultation(request.id, { status: 'accepted', startedAt: new Date().toISOString() })
    const before = getConsultationEndsAt(accepted)

    addConsultationMinutes(request.id, 10)

    expect(getConsultationEndsAt(getInstantConsultation(request.id)) - before).toBe(10 * 60 * 1000)
  })

  it('tracks the amount paid across the booking and its extensions', () => {
    const request = createInstantConsultation({ type: 'call', userId: 'u1', astrologerId: 'a1', durationMinutes: 10, amount: 220 })

    expect(request.amountPaid).toBe(220)

    updateInstantConsultation(request.id, { extensionAmount: 110 })
    addConsultationMinutes(request.id, 5)

    expect(getInstantConsultation(request.id).amountPaid).toBe(330)
  })

  it('reports zero time left once the call runs past its end', () => {
    const request = createInstantConsultation({ type: 'call', userId: 'u1', astrologerId: 'a1', durationMinutes: 10 })
    const stale = updateInstantConsultation(request.id, {
      status: 'accepted',
      startedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    })

    expect(getConsultationSecondsLeft(stale)).toBe(0)
  })

  it('has no end time until the call is accepted', () => {
    const request = createInstantConsultation({ type: 'call', userId: 'u1', astrologerId: 'a1', durationMinutes: 10 })

    expect(getConsultationEndsAt(request)).toBe(0)
  })

  it('ignores an unknown id when extending', () => {
    expect(addConsultationMinutes('does-not-exist', 10)).toBeNull()
  })

  it('keeps chat sessions working through the shared store', () => {
    const chat = createInstantConsultation({ type: 'chat', userId: 'u1', astrologerId: 'a1', durationMinutes: 20 })

    expect(chat.type).toBe('chat')
    expect(getConsultationTotalMinutes(chat)).toBe(20)
    expect(store()).toContain('"type":"chat"')
  })
})

describe('storage failures', () => {
  it('does not throw when localStorage quota is exceeded while seeding consultations', () => {
    installWindowStub()
    globalThis.window.localStorage.setItem = () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    }

    expect(() => getInstantConsultations()).not.toThrow()
    expect(getInstantConsultations()).toHaveLength(5)
  })

  it('does not throw when a new consultation cannot be persisted', () => {
    installWindowStub()
    globalThis.window.localStorage.setItem = () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    }

    const request = createInstantConsultation({
      type: 'call',
      userId: 'u1',
      astrologerId: 'a1',
      durationMinutes: 10,
    })

    expect(getInstantConsultation(request.id)).toEqual(request)
  })
})

describe('birth details on chat sessions', () => {
  beforeEach(() => {
    installWindowStub()
  })

  it('carries birth details through to the session record', () => {
    const details = { name: 'Priya', gender: 'Female', dob: '1994-03-02', time: '07:15', place: 'Pune' }
    const chat = createInstantConsultation({ type: 'chat', userId: 'u1', astrologerId: 'a1', durationMinutes: 20, amount: 320, birthDetails: details })

    expect(chat.birthDetails).toEqual(details)
  })

  it('records the paid amount for chat', () => {
    const chat = createInstantConsultation({ type: 'chat', userId: 'u1', astrologerId: 'a1', durationMinutes: 20, amount: 320 })

    expect(chat.amountPaid).toBe(320)
  })

  it('leaves birth details null for calls', () => {
    const call = createInstantConsultation({ type: 'call', userId: 'u1', astrologerId: 'a1', durationMinutes: 10, amount: 220 })

    expect(call.birthDetails).toBeNull()
  })
})

describe('one live session per user', () => {
  beforeEach(() => {
    installWindowStub()
  })

  it('can hold concurrent records for different astrologers', () => {
    createInstantConsultation({ type: 'call', userId: 'u1', astrologerId: 'a1', durationMinutes: 10 })
    createInstantConsultation({ type: 'chat', userId: 'u1', astrologerId: 'a2', durationMinutes: 10 })

    const live = getInstantConsultations().filter((entry) => entry.userId === 'u1' && entry.status === 'ringing')
    expect(live).toHaveLength(2)
  })

  it('ends one session without disturbing the other', () => {
    const call = createInstantConsultation({ type: 'call', userId: 'u1', astrologerId: 'a1', durationMinutes: 10 })
    createInstantConsultation({ type: 'chat', userId: 'u1', astrologerId: 'a2', durationMinutes: 10 })

    updateInstantConsultation(call.id, { status: 'ended', endedAt: new Date().toISOString() })

    const live = getInstantConsultations().filter((entry) => entry.userId === 'u1' && entry.status === 'ringing')
    expect(live.map((entry) => entry.type)).toEqual(['chat'])
  })
})

describe('reopening a previously consulted astrologer', () => {
  beforeEach(() => {
    installWindowStub()
  })

  it('still finds no live session after the previous one ended', () => {
    const first = createInstantConsultation({ type: 'chat', userId: 'u1', astrologerId: 'a1', durationMinutes: 10 })
    updateInstantConsultation(first.id, { status: 'ended', endedAt: new Date().toISOString() })

    const live = getInstantConsultations().filter(
      (entry) => entry.userId === 'u1' && entry.astrologerId === 'a1' && entry.type === 'chat' && entry.status !== 'ended',
    )
    expect(live).toHaveLength(0)
  })

  it('allows a fresh booking with the same astrologer afterwards', () => {
    const first = createInstantConsultation({ type: 'chat', userId: 'u1', astrologerId: 'a1', durationMinutes: 10 })
    updateInstantConsultation(first.id, { status: 'ended', endedAt: new Date().toISOString() })

    const second = createInstantConsultation({ type: 'chat', userId: 'u1', astrologerId: 'a1', durationMinutes: 20 })

    expect(second.id).not.toBe(first.id)
    expect(getInstantConsultation(second.id).status).toBe('ringing')
  })
})

describe('getAstrologerLiveStatus', () => {
  it('calculates line busy with ~wait for 3 mins when astrologer has 3 mins left on active call', () => {
    const now = 1000000000000
    const startedAt = new Date(now - 7 * 60 * 1000).toISOString() // 7 mins ago on 10 min call = 3 mins left
    const consultations = [
      {
        id: 'call-1',
        astrologerId: 'dr-rani',
        type: 'call',
        status: 'accepted',
        startedAt,
        durationMinutes: 10,
        extraMinutes: 0,
      },
    ]

    const status = getAstrologerLiveStatus({ id: 'dr-rani', callStatus: 'Available' }, 'call', now, consultations)
    expect(status.status).toBe('Busy')
    expect(status.isLineBusy).toBe(true)
    expect(status.label).toBe('Line Busy')
    expect(status.waitMinutes).toBe(3)
    expect(status.waitLabel).toBe('~wait for 3 mins')
  })

  it('accumulates waiting callers ahead to the estimated wait time', () => {
    const now = 1000000000000
    const startedAt = new Date(now - 7 * 60 * 1000).toISOString() // 3 mins left
    const consultations = [
      {
        id: 'call-active',
        astrologerId: 'dr-rani',
        type: 'call',
        status: 'accepted',
        startedAt,
        durationMinutes: 10,
        extraMinutes: 0,
      },
      {
        id: 'call-waiting-1',
        astrologerId: 'dr-rani',
        type: 'call',
        status: 'ringing',
        durationMinutes: 5,
      },
    ]

    const status = getAstrologerLiveStatus({ id: 'dr-rani', callStatus: 'Available' }, 'call', now, consultations)
    expect(status.status).toBe('Busy')
    expect(status.isLineBusy).toBe(true)
    expect(status.waitMinutes).toBe(8) // 3 mins from active + 5 mins waiting
    expect(status.waitLabel).toBe('~wait for 8 mins')
  })

  it('uses static responseTime when astrologer has static Busy status and no active call in store', () => {
    const astrologer = { id: 'astro-busy', callStatus: 'Busy', responseTime: '5 min' }
    const status = getAstrologerLiveStatus(astrologer, 'call', Date.now(), [])

    expect(status.status).toBe('Busy')
    expect(status.isLineBusy).toBe(true)
    expect(status.waitMinutes).toBe(5)
    expect(status.waitLabel).toBe('~wait for 5 mins')
  })

  it('defaults to ~wait for 3 mins when static Busy has no responseTime', () => {
    const astrologer = { id: 'astro-busy', callStatus: 'Busy' }
    const status = getAstrologerLiveStatus(astrologer, 'call', Date.now(), [])

    expect(status.status).toBe('Busy')
    expect(status.isLineBusy).toBe(true)
    expect(status.waitMinutes).toBe(3)
    expect(status.waitLabel).toBe('~wait for 3 mins')
  })

  it('reports Available when astrologer is free', () => {
    const astrologer = { id: 'dr-rani', callStatus: 'Available' }
    const status = getAstrologerLiveStatus(astrologer, 'call', Date.now(), [])

    expect(status.status).toBe('Available')
    expect(status.isBusy).toBe(false)
    expect(status.isLineBusy).toBe(false)
  })

  it('reports Offline when astrologer is offline', () => {
    const astrologer = { id: 'dr-rani', callStatus: 'Offline' }
    const status = getAstrologerLiveStatus(astrologer, 'call', Date.now(), [])

    expect(status.status).toBe('Offline')
    expect(status.isBusy).toBe(false)
    expect(status.isLineBusy).toBe(false)
  })

  it('resolves consultation status from directory when base astrologer has no explicit status fields', () => {
    // astrologer-21 (Bhavana Joshi) has chatStatus: 'Busy', responseTime: '6 min'
    const chatStatus = getAstrologerLiveStatus({ id: 'astrologer-21', name: 'Bhavana Joshi' }, 'chat', Date.now(), [])
    expect(chatStatus.isBusy).toBe(true)
    expect(chatStatus.waitMinutes).toBe(6)
    expect(chatStatus.waitLabel).toBe('~wait for 6 mins')

    // astrologer-demo-3 (Arjun Sharma) has callStatus: 'Busy', responseTime: '12 min'
    const callStatus = getAstrologerLiveStatus({ id: 'astrologer-demo-3', name: 'Arjun Sharma' }, 'call', Date.now(), [])
    expect(callStatus.isBusy).toBe(true)
    expect(callStatus.waitMinutes).toBe(12)
    expect(callStatus.waitLabel).toBe('~wait for 12 mins')
  })
})

