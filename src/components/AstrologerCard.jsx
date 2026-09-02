import { MessageCircle, Phone } from 'lucide-react'
import Card from './ui/Card.jsx'

function formatCount(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }

  return String(count)
}

function formatExperience(experience) {
  return String(experience).match(/\d+/)?.[0] || experience
}

function getConsultationRate(astrologer) {
  if (astrologer.consultationRate) return astrologer.consultationRate

  const rateOptions = [15, 20, 25]
  const years = Number(formatExperience(astrologer.experience)) || 0
  return rateOptions[years % rateOptions.length]
}

export default function AstrologerCard({ astrologer, onViewProfile, onCall, onChat }) {
  return (
    <Card hover className="astrologer-card">
      <span className="astrologer-card__rate" aria-label={`Consultation rate: ${getConsultationRate(astrologer)} rupees per minute`}>
        ₹{getConsultationRate(astrologer)}/min
      </span>
      <div className="astrologer-card__content">
        <div className="astrologer-card__avatar-wrap">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] text-lg font-bold text-white shadow-lg">
            {astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
          </div>
          <span
            className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white ${
              astrologer.availability === 'Online' ? 'bg-[color:var(--success)]' : 'bg-[color:var(--muted)]'
            }`}
          />
        </div>

        <h3 className="astrologer-card__name">{astrologer.name}</h3>
        <p className="astrologer-card__specialization">{astrologer.specialization}</p>

        <div className="astrologer-card__meta" aria-label="Astrologer details">
          <span>Exp {formatExperience(astrologer.experience)}</span>
          <span aria-hidden="true">·</span>
          <strong>{formatCount(astrologer.followers)} Followers</strong>
        </div>

        <div className="astrologer-card__languages">
          {astrologer.languages.map((lang) => (
            <span key={lang} className="rounded-full bg-[color:var(--surface-soft)] px-2 py-0.5 text-xs text-[color:var(--text-secondary)]">
              {lang}
            </span>
          ))}
        </div>
      </div>

      <div className="astrologer-card__stats">
        <div className="astrologer-card__actions" aria-label={`Contact ${astrologer.name}`}>
          <button type="button" className="astrologer-card__action" onClick={() => onCall?.(astrologer.id)}>
            <Phone size={15} aria-hidden="true" />
            <span>Call</span>
          </button>
          <span className="astrologer-card__action-divider" aria-hidden="true" />
          <button type="button" className="astrologer-card__action" onClick={() => onChat?.(astrologer.id)}>
            <MessageCircle size={15} aria-hidden="true" />
            <span>Chat</span>
          </button>
        </div>
      </div>

      <button type="button" className="btn btn-primary btn-sm astrologer-card__profile-button" onClick={() => onViewProfile(astrologer.id)}>
        View Profile
      </button>
    </Card>
  )
}
