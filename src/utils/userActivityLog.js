const USER_ACTIVITY_LOG_STORAGE_KEY = 'astroconnect-user-activity-log'

function readStore() {
  if (typeof window === 'undefined') return {}
  try {
    const stored = JSON.parse(window.localStorage.getItem(USER_ACTIVITY_LOG_STORAGE_KEY) || '{}')
    return stored && typeof stored === 'object' ? stored : {}
  } catch {
    return {}
  }
}

export function getUserActivityLog(userId) {
  if (!userId) return []
  const entries = readStore()[userId]
  return Array.isArray(entries) ? entries : []
}

export function recordUserActivity({ userId, type, title, summary, status = 'Completed', metadata = '' }) {
  if (!userId || typeof window === 'undefined') return null
  const store = readStore()
  const entry = {
    id: `user-activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    summary,
    status,
    metadata,
    occurredAt: new Date().toISOString(),
    sourceType: 'user-activity-log',
  }
  store[userId] = [entry, ...(Array.isArray(store[userId]) ? store[userId] : [])].slice(0, 200)
  try {
    window.localStorage.setItem(USER_ACTIVITY_LOG_STORAGE_KEY, JSON.stringify(store))
  } catch {
    return null
  }
  return entry
}
