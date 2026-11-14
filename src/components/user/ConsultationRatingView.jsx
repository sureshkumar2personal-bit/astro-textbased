import { useState } from 'react'
import { Star, Check, Sparkles, MessageCircle, Phone, X, Award, CheckCircle2 } from 'lucide-react'
import { getAstrologerPhoto } from '../../utils/publicAstrologerProfile.js'
import { getConsultationTotalMinutes, updateInstantConsultation } from '../../utils/instantConsultation.js'
import { saveAstrologerReview } from '../../utils/astrologerReviews.js'
import { useAuth } from '../../state/AuthContext.jsx'
import './consultation-rating.css'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

const RATING_DESCRIPTIONS = {
  1: 'Poor Consultation',
  2: 'Could Be Better',
  3: 'Good Guidance',
  4: 'Very Helpful & Clear',
  5: 'Excellent & Deeply Insightful!',
}

const FEEDBACK_TAGS = [
  'Accurate Guidance',
  'Patient & Polite',
  'Helpful Remedies',
  'Clear Explanations',
  'Calm & Reassuring',
  'Deep Vedic Knowledge',
]

export default function ConsultationRatingView({
  session,
  astrologer: propAstrologer,
  onSubmitted,
  onClose,
  isModal = false,
}) {
  const { currentUser } = useAuth()
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState(['Accurate Guidance'])
  const [feedback, setFeedback] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const astrologer = propAstrologer || {
    id: session?.astrologerId || 'astrologer-demo',
    name: session?.astrologerName || 'Dr. Rani',
    specialization: session?.astrologerSpecialization || 'Vedic Astrology',
    photo: session?.astrologerPhoto || '/astrologer-photos/reference/dr-rani.png',
  }

  const isCall = session?.type !== 'chat'
  const durationMins = session ? getConsultationTotalMinutes(session) : 5
  const amountPaid = session?.amountPaid ?? (session?.pricePerMinute ? session.pricePerMinute * durationMins : null)
  const activeRating = hoverRating || rating

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const handleSubmit = (e) => {
    e?.preventDefault?.()
    if (!rating) return

    // 1. Update the consultation session in instant consultations store
    if (session?.id) {
      updateInstantConsultation(session.id, {
        rating,
        feedback: feedback.trim(),
        reviewTags: selectedTags,
        ratedAt: new Date().toISOString(),
      })
    }

    // 2. Save into public astrologer reviews
    saveAstrologerReview({
      astrologerId: astrologer.id,
      astrologerName: astrologer.name,
      userName: currentUser?.name || session?.userName || 'You',
      rating,
      type: isCall ? 'Instant Call' : 'Instant Chat',
      text: feedback.trim() || `Rated ${rating} stars for instant ${isCall ? 'call' : 'chat'}.`,
      tags: selectedTags,
    })

    setIsSubmitted(true)
    onSubmitted?.({ rating, feedback, selectedTags })
  }

  const handleSkip = () => {
    if (session?.id) {
      updateInstantConsultation(session.id, {
        skippedRating: true,
      })
    }
    onClose?.()
  }

  const photo = astrologer.photo || getAstrologerPhoto(astrologer)

  if (isSubmitted) {
    return (
      <div className={`consultation-rating-card ${isModal ? 'is-modal' : ''} is-submitted`}>
        <div className="consultation-rating-success">
          <div className="consultation-rating-success__icon">
            <CheckCircle2 size={38} />
          </div>
          <h3>Thank you for rating {astrologer.name}!</h3>
          <div className="consultation-rating-success__stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={22}
                className={i < rating ? 'star-filled' : 'star-empty'}
                fill={i < rating ? 'currentColor' : 'none'}
              />
            ))}
            <span>{rating} / 5</span>
          </div>
          <p>Your feedback helps us maintain the highest Vedic guidance standards.</p>
          <button
            type="button"
            className="consultation-rating-btn consultation-rating-btn--primary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`consultation-rating-card ${isModal ? 'is-modal' : ''}`}>
      {onClose && (
        <button
          type="button"
          className="consultation-rating-close"
          onClick={handleSkip}
          aria-label="Skip rating"
          title="Skip rating"
        >
          <X size={15} />
        </button>
      )}

      {/* Header with Call Summary */}
      <div className="consultation-rating-header">
        <div className="consultation-rating-avatar">
          {photo ? (
            <img src={photo} alt={astrologer.name} />
          ) : (
            astrologer.name.slice(0, 1)
          )}
        </div>
        <div className="consultation-rating-info">
          <span className="consultation-rating-badge">
            <Check size={12} /> {isCall ? 'Call Completed' : 'Chat Completed'}
          </span>
          <h4>{astrologer.name}</h4>
          <p>{astrologer.specialization}</p>
        </div>
      </div>

      {/* Consultation Summary Strip */}
      <div className="consultation-rating-meta-strip">
        <div>
          <small>Duration</small>
          <strong>{durationMins} mins</strong>
        </div>
        {amountPaid !== null && (
          <div>
            <small>Amount Paid</small>
            <strong>{money(amountPaid)}</strong>
          </div>
        )}
        {session?.topic && (
          <div>
            <small>Topic</small>
            <strong className="consultation-rating-topic">{session.topic}</strong>
          </div>
        )}
      </div>

      {/* Star Rating Section */}
      <div className="consultation-rating-stars-section">
        <label className="consultation-rating-label">
          How was your consultation experience?
        </label>
        <div className="consultation-rating-stars-row" role="radiogroup" aria-label="Rate your astrologer from 1 to 5 stars">
          {[1, 2, 3, 4, 5].map((starValue) => {
            const isFilled = activeRating >= starValue
            return (
              <button
                key={starValue}
                type="button"
                className={`consultation-rating-star-btn ${isFilled ? 'is-active' : ''}`}
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
              >
                <Star size={28} fill={isFilled ? 'currentColor' : 'none'} />
              </button>
            )
          })}
        </div>
        <span className="consultation-rating-desc">
          {activeRating > 0 ? RATING_DESCRIPTIONS[activeRating] : 'Tap a star to rate'}
        </span>
      </div>

      {/* Quick Feedback Tags */}
      <div className="consultation-rating-tags-section">
        <label className="consultation-rating-sublabel">
          What went well? <small>(tap to select)</small>
        </label>
        <div className="consultation-rating-tags-list">
          {FEEDBACK_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                className={`consultation-rating-tag ${isSelected ? 'is-selected' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {isSelected && <Check size={11} />} {tag}
              </button>
            )
          })}
        </div>
      </div>

      {/* Detailed Feedback Textarea */}
      <div className="consultation-rating-feedback-section">
        <label className="consultation-rating-sublabel" htmlFor="consultation-review-textarea">
          Write a review <small>(optional)</small>
        </label>
        <textarea
          id="consultation-review-textarea"
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={`Share your experience with ${astrologer.name} to help other seekers...`}
        />
      </div>

      {/* Actions */}
      <div className="consultation-rating-actions">
        <button
          type="button"
          className="consultation-rating-btn consultation-rating-btn--primary"
          onClick={handleSubmit}
          disabled={rating === 0}
        >
          <Award size={15} /> Submit Rating & Review
        </button>
        {onClose && (
          <button
            type="button"
            className="consultation-rating-btn consultation-rating-btn--secondary"
            onClick={handleSkip}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}
