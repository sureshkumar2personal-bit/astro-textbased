import { beforeEach, describe, expect, it } from 'vitest'

const store = new Map()
globalThis.window = {
  localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
}
globalThis.CustomEvent = class { constructor(type) { this.type = type } }

const { getInstantRate, getSavedRate, saveConsultationPricing, withSavedRates } = await import('./consultationPricing.js')

describe('astrologer-specific consultation pricing', () => {
  beforeEach(() => store.clear())

  it('shows the saved price only on the matching astrologer and updates on change', () => {
    saveConsultationPricing('astrologer-demo', { call: 15, chat: 10 })
    expect(withSavedRates({ id: 'astrologer-demo', callRate: 22, chatRate: 18 })).toMatchObject({ callRate: 15, chatRate: 10 })
    expect(withSavedRates({ id: 'acharya-meena', callRate: 24, chatRate: 20 })).toMatchObject({ callRate: 24, chatRate: 20 })
    saveConsultationPricing('astrologer-demo', { call: 20, chat: 10 })
    expect(getInstantRate('astrologer-demo', 'call')).toBe(20)
  })

  it('falls back to the directory rate when nothing is saved', () => {
    expect(getSavedRate('acharya-meena', 'call')).toBeNull()
    expect(getInstantRate('acharya-meena', 'call')).toBe(24)
  })
})
