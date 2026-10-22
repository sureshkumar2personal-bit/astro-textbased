// Authentication events — signing in, signing out, and other credential
// handshakes — say nothing about what a person actually did in the product.
// They are noise in every activity and audit feed (each portal wrote one on
// every sign-in), so they are never recorded and are filtered out of any feed
// that still holds them from an earlier session.

const AUTH_ACTIVITY_PATTERNS = [
  /\bsign[\s-]?in\b/i,
  /\bsigned[\s-]?in\b/i,
  /\bsign[\s-]?out\b/i,
  /\bsigned[\s-]?out\b/i,
  /\blog[\s-]?in\b/i,
  /\blogged[\s-]?in\b/i,
  /\blog[\s-]?out\b/i,
  /\blogged[\s-]?out\b/i,
  /\blogin\b/i,
  /\blogout\b/i,
  /\bauthentication\b/i,
]

// The fields that can carry the wording of an entry differ per feed:
// user activity rows use title/summary, editor audit rows use action/details,
// and the astrologer audit log stores a plain array of cells.
const ACTIVITY_TEXT_FIELDS = [
  'title',
  'summary',
  'action',
  'details',
  'description',
  'module',
  'label',
]

export function isAuthenticationActivity(entry) {
  if (!entry) return false
  const parts = Array.isArray(entry)
    ? entry
    : ACTIVITY_TEXT_FIELDS.map((field) => entry[field]).filter(Boolean)
  const text = parts.join(' ')
  if (!text.trim()) return false
  return AUTH_ACTIVITY_PATTERNS.some((pattern) => pattern.test(text))
}

export function filterOutAuthenticationActivities(entries) {
  if (!Array.isArray(entries)) return []
  return entries.filter((entry) => !isAuthenticationActivity(entry))
}
