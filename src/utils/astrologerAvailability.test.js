import { describe, expect, it } from 'vitest'
import { canStartInstant, instantAvailability, normalizeAvailability } from './astrologerAvailability.js'

const cases = [
  // [name, dnd, chat, call, expectChat, expectCall]
  ['1. DND ON + Chat ON + Call ON', true, true, true, false, false],
  ['2. DND OFF + Chat ON + Call ON', false, true, true, true, true],
  ['3. DND OFF + Chat ON + Call OFF', false, true, false, true, false],
  ['4. DND OFF + Chat OFF + Call ON', false, false, true, false, true],
  ['5. DND OFF + Chat OFF + Call OFF', false, false, false, false, false],
  ['extra: DND ON + Chat OFF + Call OFF', true, false, false, false, false],
]

describe('instant availability priority', () => {
  it.each(cases)('%s', (_name, dndEnabled, chatEnabled, callEnabled, chat, call) => {
    const settings = { dndEnabled, chatEnabled, callEnabled }
    expect(instantAvailability(settings)).toMatchObject({ chat, call })
    expect(canStartInstant(settings, 'chat')).toBe(chat)
    expect(canStartInstant(settings, 'call')).toBe(call)
  })

  it('treats an unknown service type as unavailable', () => {
    expect(canStartInstant({}, 'video')).toBe(false)
    expect(canStartInstant({}, undefined)).toBe(false)
  })

  it('defaults to everything on when nothing is stored', () => {
    expect(normalizeAvailability(undefined)).toEqual({ chatEnabled: true, callEnabled: true, dndEnabled: false })
    expect(instantAvailability(null)).toMatchObject({ chat: true, call: true, reason: null })
  })

  it('only an explicit value changes a flag (no truthy/falsy coercion)', () => {
    expect(normalizeAvailability({ chatEnabled: 0, callEnabled: 'no', dndEnabled: 'true' })).toEqual({ chatEnabled: true, callEnabled: true, dndEnabled: false })
  })
})
