import { useMemo, useState } from 'react'
import { Eye, Search, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import {
  filterAdminReviews,
  selectAdminReviews,
  selectReviewRatingFilters,
  sortReviewsByDateDesc,
} from '../../utils/adminReviews.js'

// Admin -> Reviews & Ratings list.
//
// Reads the same REVIEWS records the user-facing page renders. Read-only: there
// is no approve, reject, edit or delete action here. Fields the records do not
// carry are shown as "Not available" rather than inferred.
export default function AdminReviews() {
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const [query, setQuery] = useState('')
  const [rating, setRating] = useState('All')

  const reviews = useMemo(() => sortReviewsByDateDesc(selectAdminReviews()), [])
  const ratingFilters = useMemo(() => selectReviewRatingFilters(reviews), [reviews])
  const visibleReviews = useMemo(() => filterAdminReviews(reviews, { query, rating }), [reviews, query, rating])

  const openReview = (reviewId) => navigate(`${routes.base}/reviews/${reviewId}`)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Reviews &amp; Ratings"
        subtitle="Every review recorded on this platform. Open a review to read it in full."
      />

      <Section className="!mt-4">
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group">
              <div className="search-bar">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by reviewer, review text, or type"
                  className="text-input search-bar__input"
                  aria-label="Search reviews"
                />
                <button type="button" className="icon-btn" aria-label="Search">
                  <Search size={18} />
                </button>
              </div>
            </div>
            <div className="search-filter-row__group">
              <label className="search-filter-row__heading muted" htmlFor="admin-review-rating" style={{ fontSize: 13, fontWeight: 600 }}>
                Rating
              </label>
              <select
                id="admin-review-rating"
                className="select-input"
                value={rating}
                onChange={(event) => setRating(event.target.value)}
              >
                {ratingFilters.map((option) => (
                  <option key={option} value={option}>{option === 'All' ? 'All' : `${option} star${option === '1' ? '' : 's'}`}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </Section>

      <Section
        title="Reviews"
        icon={Star}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({visibleReviews.length})</span>}
      >
        <div className="table-wrap">
          {!reviews.length ? (
            <p className="muted">No reviews found.</p>
          ) : visibleReviews.length === 0 ? (
            <p className="muted">No reviews match your search.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Review ID</th>
                  <th>Reviewer</th>
                  <th>Astrologer</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleReviews.map((review) => (
                  <tr key={review.id}>
                    <td>{review.id ?? <span className="muted">Not available</span>}</td>
                    <td>{review.userName || '—'}</td>
                    <td><span className="muted">Not available</span></td>
                    <td>{review.rating} / 5</td>
                    <td>{review.text}</td>
                    <td>{formatDisplayDate(review.date)}</td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openReview(review.id)}>
                        <Eye size={15} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </div>
  )
}
