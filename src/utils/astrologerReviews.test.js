import { describe, it, expect, beforeEach } from 'vitest'
import {
  ASTROLOGER_REVIEWS_STORAGE_KEY,
  getStoredAstrologerReviews,
  saveAstrologerReview,
} from './astrologerReviews.js'

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
    addEventListener: (type, listener) => listeners.add(listener),
    removeEventListener: (type, listener) => listeners.delete(listener),
    dispatchEvent: () => true,
  }
  return localStorage
}

describe('astrologerReviews utility', () => {
  let localStorage

  beforeEach(() => {
    localStorage = installWindowStub()
    localStorage.removeItem(ASTROLOGER_REVIEWS_STORAGE_KEY)
  })

  it('returns empty array when no reviews are stored', () => {
    expect(getStoredAstrologerReviews()).toEqual([])
  })

  it('saves and retrieves an astrologer review', () => {
    const saved = saveAstrologerReview({
      astrologerId: 'astrologer-demo',
      astrologerName: 'Dr. Rani',
      userName: 'Priya V.',
      rating: 5,
      type: 'Instant Call',
      text: 'Wonderful consultation with deep insight!',
      tags: ['Accurate Guidance', 'Patient & Polite'],
    })

    expect(saved.rating).toBe(5)
    expect(saved.name).toBe('Priya V.')
    expect(saved.tags).toContain('Accurate Guidance')

    const list = getStoredAstrologerReviews('astrologer-demo')
    expect(list.length).toBe(1)
    expect(list[0].id).toBe(saved.id)
  })

  it('clamps rating between 1 and 5', () => {
    const high = saveAstrologerReview({ rating: 10 })
    expect(high.rating).toBe(5)

    const low = saveAstrologerReview({ rating: -2 })
    expect(low.rating).toBe(1)
  })
})
