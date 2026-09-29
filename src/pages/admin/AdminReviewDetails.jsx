import { useMemo } from 'react'
import { Star } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import { findAdminReview, selectAdminReviews } from '../../utils/adminReviews.js'

// Admin -> Review details.
//
// Read-only. Moderating a review happens elsewhere; none of that behaviour is
// touched here. Fields the record does not carry show "Not available".
function DetailField({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value || 'Not available'}</div>
    </div>
  )
}

export default function AdminReviewDetails() {
  const { reviewId } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)

  const reviews = useMemo(() => selectAdminReviews(), [])
  const review = useMemo(() => findAdminReview(reviews, reviewId), [reviews, reviewId])

  if (!review) {
    return <Navigate to={`${routes.base}/reviews`} replace />
  }

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title={review.name ? `Review by ${review.name}` : 'Review'}
        subtitle={`${review.rating} / 5 · ${review.type ? `${review.type} consultation` : 'Not available'}`}
        actions={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`${routes.base}/reviews`)}
          >
            Back to Reviews
          </button>
        }
      />

      <Section title="Review" icon={Star} className="!mt-4">
        <Card>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 18,
            }}
          >
            <DetailField label="Review ID" value={review.id != null ? String(review.id) : null} />
            <DetailField label="Reviewer" value={review.userName} />
            <DetailField label="Astrologer" value={review.astrologerName} />
            <DetailField label="Rating" value={review.rating != null ? `${review.rating} / 5` : null} />
            <DetailField label="Consultation type" value={review.type} />
            <DetailField label="Date" value={formatDisplayDate(review.date)} />
            <DetailField
              label="Helpful votes"
              value={review.helpful != null ? String(review.helpful) : null}
            />
            <DetailField label="Related record" value={review.relatedReference} />
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Comment</div>
            <div style={{ marginTop: 4 }}>{review.text || 'Not available'}</div>
          </div>
        </Card>
      </Section>
    </div>
  )
}
