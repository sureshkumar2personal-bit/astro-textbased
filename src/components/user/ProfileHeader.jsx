import AvailabilityBadge from './AvailabilityBadge.jsx'
import Rating from './Rating.jsx'

function formatExperience(experience) {
  const years = String(experience || '').match(/\d+/)?.[0]
  return years ? `${years} years experience` : String(experience || 'Experience unavailable')
}

export default function ProfileHeader({ astrologer, kind, note, action, secondaryAction }) {
  const status = kind === 'call' ? astrologer.callStatus : astrologer.chatStatus
  const rate = kind === 'call' ? astrologer.callRate : astrologer.chatRate
  const statusLabel = kind === 'call' ? 'Available for Call' : 'Available for Chat'

  return (
    <div className="rounded-[28px] border border-[color:var(--surface-border)] bg-[linear-gradient(135deg,rgba(109,40,217,0.08),rgba(255,138,76,0.08))] p-5 shadow-[0_16px_34px_rgba(15,23,42,0.06)] md:p-6">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="flex justify-center lg:justify-start">
          <div className="consultation-profile-avatar">
            <img src={astrologer.profileImage} alt={`${astrologer.name} profile`} />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <AvailabilityBadge status={status === 'Available' ? statusLabel : status} />
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[color:var(--text-primary)] md:text-4xl">{astrologer.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] md:text-base">
                {astrologer.tagline || astrologer.bio}
              </p>
            </div>
            <div className="rounded-[22px] bg-white/85 px-4 py-3 text-right shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">Rate</div>
              <div className="mt-1 text-2xl font-black text-[color:var(--primary)]">₹{rate}/min</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Rating value={astrologer.ratingValue} reviews={astrologer.reviewCount} />
            <span className="text-sm font-medium text-[color:var(--text-secondary)]">{formatExperience(astrologer.experience)}</span>
            <span className="text-sm font-medium text-[color:var(--text-secondary)]">{astrologer.responseTime}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {astrologer.languages.map((lang) => (
              <span key={lang} className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[color:var(--primary)] shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                {lang}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {action}
            {secondaryAction}
          </div>

          {note && (
            <div className="rounded-[20px] border border-[color:rgba(255,138,76,0.2)] bg-white/85 px-4 py-3 text-sm text-[color:var(--body)]">
              {note}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

