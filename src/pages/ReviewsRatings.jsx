import { ArrowLeft, CheckCircle2, Star, ThumbsUp } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { consultationAstrologers } from '../data/consultationAstrologers.js'

const REVIEWS = [
  { id: 1, name: 'Priya', rating: 5, type: 'Call', date: '28 Aug 2026', text: 'Dr. Rani explained everything very clearly during my call consultation. She was patient and answered all my questions.', helpful: 42 },
  { id: 2, name: 'Sandhya', rating: 5, type: 'Chat', date: '26 Aug 2026', text: 'I had a chat consultation regarding my career and marriage. The guidance was detailed and easy to understand.', helpful: 35 },
  { id: 3, name: 'Ramesh', rating: 5, type: 'Appointment', date: '24 Aug 2026', text: 'The appointment was very smooth. Dr. Rani listened carefully and gave practical guidance.', helpful: 29 },
  { id: 4, name: 'Kavya', rating: 4, type: 'Chat', date: '21 Aug 2026', text: 'A thoughtful consultation with clear next steps and a reassuring explanation of my chart.', helpful: 18 },
  { id: 5, name: 'Arun', rating: 5, type: 'Appointment', date: '18 Aug 2026', text: 'Very professional and warm throughout the appointment. I felt heard and supported.', helpful: 24 },
]

const BREAKDOWN = [
  ['5 Star', 49100],
  ['4 Star', 2400],
  ['3 Star', 600],
  ['2 Star', 180],
  ['1 Star', 65],
]

function initials(name) { return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() }

export default function ReviewsRatings() {
  const { astrologerId } = useParams()
  const navigate = useNavigate()
  const astrologer = consultationAstrologers.find((item) => item.id === astrologerId) || consultationAstrologers[0]
  const total = BREAKDOWN.reduce((sum, [, count]) => sum + count, 0)

  return <main className="reviews-ratings-page">
    <button type="button" className="reviews-ratings-page__back" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back to Astrologer Profile</button>
    <PageHeader eyebrow="USER PORTAL" title="Reviews & Ratings" subtitle={`See what users are saying about their consultations with ${astrologer.name}`} showBack={false} />
    <Card className="reviews-rating-summary"><div className="reviews-rating-summary__score"><strong>4.9</strong><div><div className="reviews-stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={19} fill="currentColor" />)}</div><span>52,345 Reviews</span></div></div><div className="reviews-rating-breakdown">{BREAKDOWN.map(([label, count]) => <div key={label}><span>{label}</span><div className="reviews-rating-bar"><i style={{ width: `${(count / total) * 100}%` }} /></div><b>{count.toLocaleString('en-IN')}</b></div>)}</div></Card>
    <section className="reviews-rating-list"><div className="section-title">Latest Reviews</div>{REVIEWS.map((review) => <Card key={review.id} className="consultation-review-card"><div className="consultation-review-card__top"><span className="consultation-review-card__avatar">{initials(review.name)}</span><div><strong>{review.name}</strong><div className="reviews-stars reviews-stars--small">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill={index < review.rating ? 'currentColor' : 'none'} />)}</div></div><small>{review.date}</small></div><div className="consultation-review-card__badges"><span>{review.type} Consultation</span><em><CheckCircle2 size={13} /> Verified Consultation</em></div><p>{review.text}</p><button type="button" className="consultation-review-card__helpful"><ThumbsUp size={14} /> Helpful · {review.helpful}</button></Card>)}</section>
  </main>
}
