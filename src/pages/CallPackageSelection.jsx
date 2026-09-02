import { ArrowLeft, Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CALL_PACKAGES, mockAstrologers } from '../data/notificationData.js'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

function formatExperience(experience) {
  const years = String(experience).match(/\d+/)?.[0] || experience
  return `${years} Years Experience`
}

export default function CallPackageSelection() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const astrologer = mockAstrologers.find(({ id }) => id === searchParams.get('id')) || mockAstrologers[0]
  const [selectedPackageId, setSelectedPackageId] = useState(CALL_PACKAGES[0].id)
  const selectedPackage = CALL_PACKAGES.find(({ id }) => id === selectedPackageId) || CALL_PACKAGES[0]
  const isOnline = astrologer.availability === 'Online'

  return (
    <main className="call-booking-page">
      <button type="button" className="call-booking-page__back" onClick={() => navigate(routes.astrologers)}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Astrologers
      </button>

      <section className="call-booking-page__panel" aria-labelledby="call-booking-heading">
        <div className="call-booking-page__astrologer">
          <div className="call-booking-page__avatar-wrap">
            <div className="call-booking-page__avatar">
              {astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
            </div>
            <span className={`call-booking-page__status ${isOnline ? 'call-booking-page__status--online' : ''}`} />
          </div>
          <div>
            <h1 id="call-booking-heading">Book a Call with {astrologer.name}</h1>
            <p>{astrologer.specialization} · {formatExperience(astrologer.experience)}</p>
            <span className={`call-booking-page__availability ${isOnline ? 'call-booking-page__availability--online' : ''}`}>
              {astrologer.availability}
            </span>
          </div>
        </div>

        <section className="call-booking-page__packages" aria-labelledby="call-duration-heading">
          <h2 id="call-duration-heading">Choose Your Call Duration</h2>
          <div className="call-booking-page__package-grid">
            {CALL_PACKAGES.map((callPackage) => {
              const selected = selectedPackageId === callPackage.id
              return (
                <button
                  key={callPackage.id}
                  type="button"
                  className={`call-package ${selected ? 'call-package--selected' : ''}`}
                  onClick={() => setSelectedPackageId(callPackage.id)}
                  aria-pressed={selected}
                >
                  {callPackage.bestValue && <span className="call-package__best-value">Best Value</span>}
                  {selected && <span className="call-package__selected-icon"><Check size={13} aria-hidden="true" /></span>}
                  <span className="call-package__duration">{callPackage.duration} Minutes</span>
                  <strong>₹{callPackage.total}</strong>
                  <span className="call-package__rate">₹{callPackage.rate}/min</span>
                  <span className="call-package__select-label">{selected ? 'Selected' : 'Select'}</span>
                </button>
              )
            })}
          </div>
        </section>

        <div className="call-booking-page__cta">
          <button type="button" className="btn btn-primary call-booking-page__book-button" onClick={() => navigate(`${routes.walletPayment}?id=${astrologer.id}&package=${selectedPackage.id}`)}>Book Call Now →</button>
          <p className="call-booking-page__note">
            {isOnline
              ? 'You will be connected with the astrologer after your booking is confirmed.'
              : 'Astrologer is currently offline. Your call will start when the astrologer becomes available.'}
          </p>
        </div>
      </section>
    </main>
  )
}
