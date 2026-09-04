import { Star } from 'lucide-react'

export default function Rating({ value = 0, reviews = 0, className = '' }) {
  const rating = Number(value) || 0
  const reviewLabel = Number(reviews) > 0 ? `${Number(reviews).toLocaleString('en-IN')} reviews` : 'No reviews yet'

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--gold-100)] px-2.5 py-1 text-xs font-semibold text-[color:var(--amber-600)]">
        <Star size={12} fill="currentColor" strokeWidth={1.8} />
        {rating.toFixed(1)}
      </span>
      <span className="text-xs font-medium text-[color:var(--text-secondary)]">{reviewLabel}</span>
    </div>
  )
}

