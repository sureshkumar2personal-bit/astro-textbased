import { MessageCircle, Phone } from 'lucide-react'
import Card from '../ui/Card.jsx'

function formatCount(count) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return String(count)
}

function formatExperience(experience) {
  return String(experience || '').match(/\d+/)?.[0] || experience || '—'
}

export default function AstrologerCard({ astrologer, kind = 'chat', onSelect, onStart, onViewProfile }) {
  const rate = kind === 'call' ? astrologer.callRate : astrologer.chatRate
  const status = kind === 'call' ? astrologer.callStatus : astrologer.chatStatus

  return (
    <Card hover className="astrologer-card consultation-directory-astrologer-card">
      <span className="astrologer-card__rate" aria-label={`Consultation rate: ${rate} rupees per minute`}>
        ₹{rate}/min
      </span>

      <div className="astrologer-card__content">
        <div className="astrologer-card__avatar-wrap">
          <div className="flex h-14 w-14 overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] shadow-lg">
            <img className="h-full w-full object-cover" src={astrologer.profileImage} alt={`${astrologer.name} profile`} />
          </div>
          <span
            className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white ${
              status === 'Available' ? 'bg-[color:var(--success)]' : 'bg-[color:var(--muted)]'
            }`}
            aria-label={status === 'Available' ? 'Online' : status}
          />
        </div>

        <h3 className="astrologer-card__name">{astrologer.name}</h3>
        <p className="astrologer-card__specialization">{astrologer.specialization}</p>

        <div className="astrologer-card__meta" aria-label="Astrologer details">
          <span>Exp {formatExperience(astrologer.experience)}</span>
          <span aria-hidden="true">·</span>
          <strong>{formatCount(Number(astrologer.followers || 0))} Followers</strong>
        </div>

        <div className="astrologer-card__languages">
          {astrologer.languages.slice(0, 3).map((language) => (
            <span key={language} className="rounded-full bg-[color:var(--surface-soft)] px-2 py-0.5 text-xs text-[color:var(--text-secondary)]">
              {language}
            </span>
          ))}
        </div>
      </div>

      <div className="astrologer-card__stats">
        <div className="astrologer-card__actions astrologer-card__actions--chat" aria-label={`Contact ${astrologer.name}`}>
          <button type="button" className="astrologer-card__action astrologer-card__action--primary" onClick={() => onStart?.(astrologer)}>
            {kind === 'call' ? <Phone size={15} aria-hidden="true" /> : <MessageCircle size={15} aria-hidden="true" />}
            <span>{kind === 'call' ? 'Call' : 'Chat'}</span>
          </button>
        </div>
      </div>

      {onViewProfile && <button type="button" className="btn btn-primary btn-sm astrologer-card__profile-button" onClick={() => onViewProfile(astrologer.id)}>
        View Profile
      </button>}

    </Card>
  )
}
