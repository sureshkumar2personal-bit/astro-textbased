import { describe, expect, it } from 'vitest'
import { LIVE_SESSION_MAX_DURATION_MS, getLiveSessionExpiry, hasLiveSessionExpired } from './liveSessions.js'

describe('live session duration limit', () => {
  const startedAt = '2026-09-21T10:00:00.000Z'
  const session = { startedAt }

  it('sets the live session expiry to three hours after it starts', () => {
    expect(getLiveSessionExpiry(session)).toBe(new Date(startedAt).getTime() + LIVE_SESSION_MAX_DURATION_MS)
  })

  it('keeps a session live before three hours and closes it at the limit', () => {
    const expiry = getLiveSessionExpiry(session)
    expect(hasLiveSessionExpired(session, expiry - 1)).toBe(false)
    expect(hasLiveSessionExpired(session, expiry)).toBe(true)
  })

  it('returns false when the session has no valid start time', () => {
    expect(hasLiveSessionExpired({ startedAt: null }, Date.now())).toBe(false)
  })
})
