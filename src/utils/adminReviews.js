import { REVIEWS } from '../pages/ReviewsRatings.jsx'
import { sortByDateDesc } from './date.js'

// Pure selectors for the Admin -> Reviews & Ratings module.
//
// The app has no review store. The only review records in the project are the
// REVIEWS array in ReviewsRatings.jsx, which the user-facing page renders
// directly. Those same records are read here, not copied, and no relationship
// is inferred: the records carry a reviewer display name and nothing else, so
// every user, astrologer or booking identifier is reported as unavailable.

export function selectAdminReviews() {
  return REVIEWS.map((review) => ({
    ...review,
    // The record carries only a display name, with no id of any kind.
    reviewerId: '',
    userName: review.name || '',
    // The page shows one astrologer at a time from the route param, but that is
    // not stored on the record, so no astrologer is attached to a review here.
    astrologerName: '',
    relatedReference: '',
    status: '',
  }))
}

export function selectReviewRatingFilters(reviews) {
  const ratings = new Set()
  for (const review of Array.isArray(reviews) ? reviews : []) {
    const rating = Number(review?.rating)
    if (Number.isFinite(rating) && rating > 0) ratings.add(rating)
  }
  return ['All', ...Array.from(ratings).sort((a, b) => b - a).map(String)]
}

export function matchesReviewQuery(review, query) {
  const search = String(query || '').trim().toLowerCase()
  if (!search) return true
  const fields = [review?.id, review?.name, review?.type, review?.text]
  return fields.some((field) => String(field || '').toLowerCase().includes(search))
}

export function filterAdminReviews(reviews, { query = '', rating = 'All' } = {}) {
  return (Array.isArray(reviews) ? reviews : []).filter((review) => {
    if (!matchesReviewQuery(review, query)) return false
    if (rating && rating !== 'All' && String(review?.rating) !== String(rating)) return false
    return true
  })
}

export function findAdminReview(reviews, reviewId) {
  return (Array.isArray(reviews) ? reviews : []).find((review) => String(review.id) === String(reviewId)) || null
}

export function sortReviewsByDateDesc(reviews) {
  return (Array.isArray(reviews) ? reviews : []).slice().sort((a, b) => sortByDateDesc(a, b, (review) => review.date))
}
