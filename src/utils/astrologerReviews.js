export const ASTROLOGER_REVIEWS_STORAGE_KEY = 'astroconnect-astrologer-reviews'

export function getStoredAstrologerReviews(astrologerId) {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(ASTROLOGER_REVIEWS_STORAGE_KEY) : null
    const list = raw ? JSON.parse(raw) : []
    if (!astrologerId) return list
    return list.filter((r) => !r.astrologerId || r.astrologerId === astrologerId)
  } catch {
    return []
  }
}

export function saveAstrologerReview({
  astrologerId = 'astrologer-demo',
  astrologerName = 'Dr. Rani',
  userName = 'You',
  rating = 5,
  type = 'Instant Call',
  text = '',
  tags = [],
}) {
  const current = getStoredAstrologerReviews()
  const review = {
    id: `rev-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    astrologerId,
    astrologerName,
    name: userName || 'You',
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    type: type === 'chat' ? 'Instant Chat' : type === 'call' ? 'Instant Call' : type,
    date: 'Today',
    text: (text || '').trim() || `Rated ${rating} stars for ${type}.`,
    tags: Array.isArray(tags) ? tags : [],
    helpful: 0,
    isVerified: true,
    createdAt: new Date().toISOString(),
  }
  const next = [review, ...current]
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ASTROLOGER_REVIEWS_STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('astroconnect:astrologer-reviews', { detail: next }))
    } catch {
      // ignore localStorage quota errors
    }
  }
  return review
}

export function subscribeToAstrologerReviews(listener) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => listener(getStoredAstrologerReviews())
  window.addEventListener('astroconnect:astrologer-reviews', handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('astroconnect:astrologer-reviews', handler)
    window.removeEventListener('storage', handler)
  }
}
