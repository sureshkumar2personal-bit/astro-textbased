export const LIVE_SESSION_MAX_DURATION_MS = 3 * 60 * 60 * 1000

export function getLiveSessionExpiry(session) {
  if (!session?.startedAt) return null
  const startedAt = new Date(session.startedAt).getTime()
  if (!Number.isFinite(startedAt)) return null
  return startedAt + LIVE_SESSION_MAX_DURATION_MS
}

export function hasLiveSessionExpired(session, now = Date.now()) {
  const expiry = getLiveSessionExpiry(session)
  return Boolean(expiry && now >= expiry)
}

