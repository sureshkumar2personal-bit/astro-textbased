import { ArrowRight, MessageCircle, Phone, Star, UserRound } from 'lucide-react'
import { usePricingVersion, withSavedRates } from '../utils/consultationPricing.js'
import { getStartingRate } from '../utils/publicAstrologerProfile.js'
import Card from './ui/Card.jsx'

const MAX_EXPERTISE = 3
const MAX_LANGUAGES = 3

function formatCount(count) {
  const value = Number(count) || 0
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value)
}

function formatYears(experience) {
  const years = String(experience || '').match(/\d+/)?.[0]
  if (!years) return '—'
  return `${years} ${Number(years) === 1 ? 'Year' : 'Years'}`
}

function shortLabel(value) {
  return String(value).replace(/\s+Astrology$/i, '')
}

function TagRow({ items, limit, className, label, tone = 'soft' }) {
  const visible = items.slice(0, limit)
  const remaining = items.length - visible.length
  return (
    <div className={`explore-astrologer-card__tags explore-astrologer-card__tags--${tone} ${className}`} aria-label={label}>
      {visible.map((item) => <span key={item} title={item}>{shortLabel(item)}</span>)}
      {remaining > 0 && <span title={items.slice(limit).join(', ')}>+{remaining}</span>}
    </div>
  )
}

export default function AstrologerCard({ astrologer: baseAstrologer, onViewProfile, onCall, onChat }) {
  usePricingVersion()
  const astrologer = withSavedRates(baseAstrologer)
  const rate = getStartingRate(astrologer) ?? astrologer.consultationRate ?? null
  const initials = astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')
  const photo = astrologer.photo || astrologer.profileImage
  const online = astrologer.availability === 'Online'

  return (
    <Card hover className="explore-astrologer-card">
      {rate && <span className="explore-astrologer-card__price" aria-label={`Consultation rate: ${rate} rupees per minute`}>₹{rate}/min</span>}

      <div className="explore-astrologer-card__main">
        <div className="explore-astrologer-card__avatar-wrap">
          <div className="explore-astrologer-card__avatar">
            {photo ? <img src={photo} alt={`${astrologer.name} profile`} /> : initials}
          </div>
          <span className={`explore-astrologer-card__status${online ? ' is-online' : ''}`} role="img" aria-label={online ? 'Online' : 'Offline'} />
        </div>

        <div className="explore-astrologer-card__details">
          <h3 className="explore-astrologer-card__name" title={astrologer.name}>{astrologer.name}</h3>
          <p className="explore-astrologer-card__specialization" title={astrologer.specialization}>{astrologer.specialization}</p>

          <div className="explore-astrologer-card__meta" aria-label="Astrologer details">
            <span className="explore-astrologer-card__rating" aria-label={`Rated ${astrologer.ratingValue} out of 5 from ${astrologer.reviewCount} reviews`}>
              <Star size={14} aria-hidden="true" /> <strong>{astrologer.ratingValue?.toFixed(1) || '—'}</strong>
              <span>({Number(astrologer.reviewCount || 0).toLocaleString('en-IN')})</span>
            </span>
            <span className="explore-astrologer-card__meta-divider" aria-hidden="true" />
            <span className="explore-astrologer-card__experience"><UserRound size={14} aria-hidden="true" /> <strong>{formatYears(astrologer.experience)}</strong></span>
          </div>

          <div className="explore-astrologer-card__followers"><strong>{formatCount(astrologer.followers)}</strong> Followers</div>
          <TagRow items={astrologer.expertise || []} limit={MAX_EXPERTISE} className="explore-astrologer-card__expertise" label="Areas of expertise" tone="accent" />
          <TagRow items={astrologer.languages || []} limit={MAX_LANGUAGES} className="explore-astrologer-card__languages" label="Languages" />
        </div>
      </div>

      {(Number(astrologer.callRate) > 0 || Number(astrologer.chatRate) > 0) && (
        <dl className="explore-astrologer-card__pricing" aria-label="Consultation pricing">
          {Number(astrologer.callRate) > 0 && astrologer.voiceEnabled !== false && <div><dt>Instant Call</dt><dd>₹{astrologer.callRate}/min</dd></div>}
          {Number(astrologer.chatRate) > 0 && astrologer.chatEnabled !== false && <div><dt>Instant Chat</dt><dd>₹{astrologer.chatRate}/min</dd></div>}
        </dl>
      )}

      <div className="explore-astrologer-card__actions" aria-label={`Contact ${astrologer.name}`}>
        <button type="button" className="explore-astrologer-card__action" disabled={astrologer.voiceEnabled === false} onClick={(event) => { event.stopPropagation(); onCall?.(astrologer.id) }}>
          <Phone size={17} aria-hidden="true" /> <span>Call</span>
        </button>
        <span className="explore-astrologer-card__action-divider" aria-hidden="true" />
        <button type="button" className="explore-astrologer-card__action" disabled={astrologer.chatEnabled === false} onClick={(event) => { event.stopPropagation(); onChat?.(astrologer.id) }}>
          <MessageCircle size={17} aria-hidden="true" /> <span>Chat</span>
        </button>
        {onViewProfile && <button type="button" className="explore-astrologer-card__profile" onClick={() => onViewProfile(astrologer.id)}>View Profile <ArrowRight size={16} aria-hidden="true" /></button>}
      </div>
    </Card>
  )
}
