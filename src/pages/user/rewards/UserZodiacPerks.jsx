import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Compass,
  ArrowRight,
  ArrowLeft,
  Star,
  Check,
  CheckCircle2,
  Clock,
  Briefcase,
  Heart,
  Coins,
  Activity,
  ShieldCheck,
  UserCheck,
  Crown,
  MapPin,
  Flame,
  Globe2,
  Wind,
  Droplets,
  ChevronDown,
} from 'lucide-react'
import {
  ZODIACS,
  ZODIAC_DAILY_PREDICTIONS,
  getZodiacPredictionSnippet,
  formatPeriodDateLabel,
  PERIODS,
  SPECIALIZATION_TABS,
  ASTROLOGERS_CATALOG,
  resolveUserZodiac,
  getAstrologerForecastData,
  getAstrologerSpecializations,
} from './zodiacPerksData.js'
import { getPublicAstrologers } from '../../../utils/publicAstrologerProfile.js'
import { consultationAstrologers } from '../../../data/consultationAstrologers.js'
import { useAuth } from '../../../state/AuthContext.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { REWARD_ASTROLOGERS } from './rewardsData.js'
import './userZodiacPerks.css'

const REFERENCE_PROFILE_PHOTOS = {
  'Dr. Rani': '/astrologer-photos/reference/dr-rani.png',
  'Acharya Meena': '/astrologer-photos/reference/acharya-meena.png',
  'Arjun Sharma': '/astrologer-photos/reference/arjun-sharma.png',
  'Nandini Kapoor': '/astrologer-photos/reference/nandini-kapoor.png',
  'Dev Malhotra': '/astrologer-photos/reference/dev-malhotra.png',
  'Priya Sharma': '/astrologer-photos/reference/priya-sharma.png',
  'Meera Desai': '/astrologer-photos/dashboard-reference/meera-desai.png',
  'Ishita Sen': '/astrologer-photos/dashboard-reference/ishita-sen.png',
  'Aditi Menon': '/astrologer-photos/dashboard-reference/aditi-menon.png',
  'Bhavana Joshi': '/astrologer-photos/dashboard-reference/bhavana-j.png',
}

function resolveAstrologerPhoto(id, name, matchPublic) {
  if (name && REFERENCE_PROFILE_PHOTOS[name]) return REFERENCE_PROFILE_PHOTOS[name]
  if (matchPublic?.photo) return matchPublic.photo
  if (matchPublic?.profileImage) return matchPublic.profileImage
  const matchConsultation = consultationAstrologers.find((c) => c.id === id || c.name === name)
  if (matchConsultation?.profileImage) return matchConsultation.profileImage
  if (matchConsultation?.photo) return matchConsultation.photo
  return ''
}

function formatAstrologerRating(rating) {
  if (!rating) return '4.8 / 5'
  const str = String(rating).trim()
  if (str.includes('/')) return str
  return `${str} / 5`
}

export default function UserZodiacPerks() {
  const { currentUser } = useAuth()
  const { subscriptions = [], followedAstrologerIds = [] } = useAppData()
  const navigate = useNavigate()
  const routes = getRoleRoutes('user')

  // Fixed to user's natal Rasi (e.g. Priya V. -> Taurus / Rishabam)
  const natalSign = useMemo(() => {
    return resolveUserZodiac(currentUser?.rasi)
  }, [currentUser?.rasi])

  // null = 12-sign card grid view (matching Astrotalk screenshot)
  // non-null = detail view for selected zodiac
  const [selectedSign, setSelectedSign] = useState(null)

  const currentDisplaySign = selectedSign || natalSign

  const [period, setPeriod] = useState('Daily')

  const displayPeriodDate = useMemo(() => {
    return formatPeriodDateLabel(period)
  }, [period])

  // Available astrologers: ONLY astrologers the user currently follows or subscribes to
  const availableAstrologers = useMemo(() => {
    const list = []
    const seen = new Set()
    const publicAstros = getPublicAstrologers()

    // 1. Active subscriptions for the logged-in user
    subscriptions.forEach((sub) => {
      if (sub.userId && currentUser?.id && sub.userId !== currentUser.id) return
      // Exclude expired subscriptions
      const expiry = sub.expiresAt || sub.discountQuestions?.[0]?.validUntil
      if (expiry && Number.isFinite(new Date(expiry).getTime()) && new Date(expiry).getTime() <= Date.now()) {
        return
      }

      if (!seen.has(sub.astrologerId)) {
        seen.add(sub.astrologerId)
        const matchPublic = publicAstros.find((a) => a.id === sub.astrologerId)
        const matchCatalog = ASTROLOGERS_CATALOG.find((a) => a.id === sub.astrologerId)
        const matchReward = REWARD_ASTROLOGERS.find((a) => a.id === sub.astrologerId)
        const name = sub.astrologerName || matchPublic?.name || matchCatalog?.name || matchReward?.name || 'Astrologer'
        const specialty = matchPublic?.specialization || matchCatalog?.specialty || matchReward?.specialty || 'Vedic Astrology'
        const rating = matchPublic?.rating || matchCatalog?.rating || matchReward?.rating || '4.8'
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()

        list.push({
          id: sub.astrologerId,
          name,
          photo: resolveAstrologerPhoto(sub.astrologerId, name, matchPublic),
          specialty,
          rating,
          initials: matchCatalog?.initials || initials || 'AS',
          status: `Subscribed (${sub.tier || 'Gold'})`,
          tier: sub.tier || 'Gold',
          isSubscribed: true,
          isFollowed: followedAstrologerIds.includes(sub.astrologerId),
        })
      }
    })

    // 2. Followed astrologers (who are currently in followedAstrologerIds)
    followedAstrologerIds.forEach((id) => {
      if (!seen.has(id)) {
        seen.add(id)
        const matchPublic = publicAstros.find((a) => a.id === id)
        const matchCatalog = ASTROLOGERS_CATALOG.find((a) => a.id === id)
        const matchReward = REWARD_ASTROLOGERS.find((a) => a.id === id)
        const name = matchPublic?.name || matchCatalog?.name || matchReward?.name || (id === 'astrologer-demo' ? 'Dr. Rani' : 'Astrologer')
        const specialty = matchPublic?.specialization || matchCatalog?.specialty || matchReward?.specialty || 'Vedic Astrology'
        const rating = matchPublic?.rating || matchCatalog?.rating || matchReward?.rating || '4.7'
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()

        list.push({
          id,
          name,
          photo: resolveAstrologerPhoto(id, name, matchPublic),
          specialty,
          rating,
          initials: matchCatalog?.initials || initials || 'FA',
          status: 'Following',
          tier: null,
          isSubscribed: false,
          isFollowed: true,
        })
      }
    })

    return list
  }, [subscriptions, followedAstrologerIds, currentUser?.id])

  const [selectedAstrologerId, setSelectedAstrologerId] = useState(
    availableAstrologers[0]?.id || '',
  )
  const [astroDropdownOpen, setAstroDropdownOpen] = useState(false)
  const astroPickerBadgeRef = useRef(null)

  useEffect(() => {
    if (!astroDropdownOpen) return undefined
    const handleClickOutside = (e) => {
      if (astroPickerBadgeRef.current && !astroPickerBadgeRef.current.contains(e.target)) {
        setAstroDropdownOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setAstroDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [astroDropdownOpen])

  useEffect(() => {
    if (availableAstrologers.length > 0 && !availableAstrologers.some((a) => a.id === selectedAstrologerId)) {
      setSelectedAstrologerId(availableAstrologers[0].id)
    }
  }, [availableAstrologers, selectedAstrologerId])

  const activeAstrologer = useMemo(() => {
    return (
      availableAstrologers.find((a) => a.id === selectedAstrologerId) ||
      availableAstrologers[0] ||
      null
    )
  }, [availableAstrologers, selectedAstrologerId])

  // Forecast data with pillars and alignment score
  const forecastData = useMemo(() => {
    if (!activeAstrologer) return null
    return getAstrologerForecastData(activeAstrologer.id, currentDisplaySign.sign, period)
  }, [activeAstrologer?.id, currentDisplaySign.sign, period])

  // Specializations for active astrologer
  const astrologerSpecializations = useMemo(() => {
    if (!activeAstrologer) return []
    return getAstrologerSpecializations(activeAstrologer.id)
  }, [activeAstrologer?.id])

  const [selectedSpecName, setSelectedSpecName] = useState(
    astrologerSpecializations[0]?.name || 'Guru Peyarchi',
  )
  const [specializationTab, setSpecializationTab] = useState(SPECIALIZATION_TABS[0])

  useEffect(() => {
    if (astrologerSpecializations.length > 0 && !astrologerSpecializations.some((s) => s.name === selectedSpecName)) {
      setSelectedSpecName(astrologerSpecializations[0].name)
    }
  }, [astrologerSpecializations, selectedSpecName])

  const activeSpecialization = useMemo(() => {
    const found = astrologerSpecializations.find((s) => s.name === selectedSpecName)
    return found || astrologerSpecializations[0]
  }, [astrologerSpecializations, selectedSpecName])

  const handleAskQuestion = () => {
    if (!activeAstrologer) return
    const targetAstro = activeAstrologer.id
    if (routes.discountQuestions) {
      navigate(`${routes.discountQuestions}?astrologer=${encodeURIComponent(targetAstro)}`)
    } else {
      navigate(`/user/text-questions?astrologer=${encodeURIComponent(targetAstro)}`)
    }
  }

  const handleBookConsultation = () => {
    if (!activeAstrologer) return
    navigate(`/user/call-astrologers?astrologer=${encodeURIComponent(activeAstrologer.id)}`)
  }

  const renderAstrologerPicker = () => {
    if (!activeAstrologer) return null
    return (
      <div
        className={`celestial-astro-picker-badge ${astroDropdownOpen ? 'is-dropdown-open' : ''}`}
        ref={astroPickerBadgeRef}
        aria-label="Astrologer Guidance Card"
      >
        <span className="celestial-astro-avatar" aria-hidden="true">
          {activeAstrologer.photo ? (
            <img
              src={activeAstrologer.photo}
              alt=""
              className="celestial-astro-avatar-img"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            activeAstrologer.initials
          )}
        </span>

        <div className="celestial-astro-info">
          <div className="celestial-astro-name-row">
            <div className="celestial-astro-select-wrap">
              <label htmlFor="celestial-astrologer-select" className="sr-only">
                Select Astrologer
              </label>
              <select
                id="celestial-astrologer-select"
                className="sr-only"
                value={activeAstrologer.id}
                onChange={(e) => {
                  setSelectedAstrologerId(e.target.value)
                  const nextSpecs = getAstrologerSpecializations(e.target.value)
                  if (nextSpecs[0]) setSelectedSpecName(nextSpecs[0].name)
                }}
                aria-label="Select Astrologer Guidance"
                tabIndex={-1}
              >
                {availableAstrologers.map((astro) => (
                  <option key={astro.id} value={astro.id}>
                    {astro.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                id="celestial-astrologer-select-btn"
                className="celestial-astro-select-trigger"
                onClick={() => setAstroDropdownOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={astroDropdownOpen}
                aria-label={`Select Astrologer Guidance, currently ${activeAstrologer.name}`}
              >
                <span className="celestial-astro-select-name">{activeAstrologer.name}</span>
                <ChevronDown
                  size={14}
                  className={`celestial-astro-chevron ${astroDropdownOpen ? 'is-rotated' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            <span className="celestial-astro-rating">
              <Star size={11} fill="currentColor" /> {formatAstrologerRating(activeAstrologer.rating)}
            </span>
          </div>

          <div className="celestial-astro-sub">
            <span>{activeAstrologer.specialty}</span>
            <span>·</span>
            <span className={`celestial-rel-pill ${activeAstrologer.isSubscribed ? 'is-sub' : 'is-follow'}`}>
              {activeAstrologer.isSubscribed ? <Crown size={10} /> : <UserCheck size={10} />}
              {activeAstrologer.status}
            </span>
          </div>
        </div>

        {/* Custom Dropdown Menu with Perfectly Aligned Astrologers */}
        {astroDropdownOpen && (
          <div
            className="celestial-astro-dropdown-menu"
            role="listbox"
            aria-label="Available Astrologer Guidance"
          >
            <div className="celestial-astro-dropdown-header">
              <span>Select Astrologer</span>
              <span className="celestial-astro-dropdown-count">{availableAstrologers.length} mentors</span>
            </div>
            <div className="celestial-astro-dropdown-list">
              {availableAstrologers.map((astro) => {
                const isSelected = astro.id === activeAstrologer.id
                return (
                  <button
                    type="button"
                    key={astro.id}
                    role="option"
                    aria-selected={isSelected}
                    className={`celestial-astro-dropdown-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedAstrologerId(astro.id)
                      const nextSpecs = getAstrologerSpecializations(astro.id)
                      if (nextSpecs[0]) setSelectedSpecName(nextSpecs[0].name)
                      setAstroDropdownOpen(false)
                    }}
                  >
                    <span className="celestial-astro-dropdown-avatar" aria-hidden="true">
                      {astro.photo ? (
                        <img
                          src={astro.photo}
                          alt=""
                          className="celestial-astro-dropdown-avatar-img"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        astro.initials
                      )}
                    </span>

                    <div className="celestial-astro-dropdown-main">
                      <div className="celestial-astro-dropdown-name-row">
                        <strong className="celestial-astro-dropdown-name">{astro.name}</strong>
                        <span className="celestial-astro-dropdown-rating">
                          <Star size={10.5} fill="currentColor" /> {formatAstrologerRating(astro.rating)}
                        </span>
                      </div>
                      <div className="celestial-astro-dropdown-sub-row">
                        <span className="celestial-astro-dropdown-spec">{astro.specialty}</span>
                        <span className="celestial-astro-dropdown-dot">·</span>
                        <span className={`celestial-rel-pill celestial-rel-pill--sm ${astro.isSubscribed ? 'is-sub' : 'is-follow'}`}>
                          {astro.isSubscribed ? <Crown size={9} /> : <UserCheck size={9} />}
                          {astro.status}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="celestial-astro-dropdown-check" aria-hidden="true">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!activeAstrologer) {
    return (
      <div className="celestial-hub celestial-hub--empty" aria-label="Personalized Astrological Guidance Dashboard">
        <div className="celestial-empty-card">
          <div className="celestial-empty-icon-wrap">
            <Sparkles size={28} />
          </div>
          <h3 className="celestial-empty-title">Connect with Astrologers for Personalized Guidance</h3>
          <p className="celestial-empty-desc">
            Follow or subscribe to astrologers to unlock tailored daily horoscopes for your birth sign ({natalSign.en} / {natalSign.rasi}) and sacred transit remedies curated directly by your trusted mentors.
          </p>
          <button
            type="button"
            className="celestial-explore-btn"
            onClick={() => navigate(routes.astrologers)}
          >
            Explore Astrologers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="celestial-hub" aria-label="Personalized Astrological Guidance Dashboard">
      {/* ============================================================== */}
      {/* PART 1: 12 ZODIAC CARDS GRID OR DETAILED BENTO VIEW            */}
      {/* ============================================================== */}
      {selectedSign === null ? (
        <section className="astrotalk-zodiac-section" aria-label="Daily Horoscope & Predictions">
          {/* Header Controls: Forecast Period Tabs on Left, Astrologer Guidance Picker on Right */}
          <div className="astrotalk-section-head">
            <div className="celestial-period-tabs" role="tablist" aria-label="Forecast Period">
              {PERIODS.map((p) => {
                const isActive = period === p
                return (
                  <button
                    key={p}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`celestial-period-btn${isActive ? ' is-active' : ''}`}
                    onClick={() => setPeriod(p)}
                  >
                    <span>{p}</span>
                  </button>
                )
              })}
            </div>

            {renderAstrologerPicker()}
          </div>

          {/* 12 Zodiac Cards Grid (Astrotalk 3-column layout) */}
          <div className="astrotalk-zodiac-grid">
            {ZODIACS.map((zodiac) => {
              const isUserSign = zodiac.sign === natalSign.sign
              const predictionSnippet = getZodiacPredictionSnippet(zodiac.sign, period)
              return (
                <article
                  key={zodiac.sign}
                  className={`astrotalk-zodiac-card ${isUserSign ? 'is-user-sign' : ''}`}
                  onClick={() => setSelectedSign(zodiac)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedSign(zodiac)
                    }
                  }}
                  aria-label={`View daily horoscope for ${zodiac.en}`}
                >
                  <div className="astrotalk-card-top">
                    <div className="astrotalk-zodiac-avatar" aria-hidden="true">
                      <span className="astrotalk-avatar-glyph">{zodiac.symbol}</span>
                    </div>
                    <div className="astrotalk-card-heading">
                      <div className="astrotalk-sign-name-row">
                        <h3 className="astrotalk-sign-name">{zodiac.en}</h3>
                        {isUserSign && <span className="astrotalk-user-sign-badge">★ Your Sign</span>}
                      </div>
                      <span className="astrotalk-sign-dates" title={`Birth period: ${zodiac.dates}`}>
                        {displayPeriodDate}
                      </span>
                    </div>
                  </div>

                  <div className="astrotalk-card-meta">
                    <div className="astrotalk-meta-item">
                      <span className="astrotalk-meta-label">Lucky Number:</span>
                      <strong className="astrotalk-meta-val">{zodiac.luckyNumber}</strong>
                    </div>
                    <div className="astrotalk-meta-item">
                      <span className="astrotalk-meta-label">Lucky Colour:</span>
                      <span
                        className="astrotalk-color-dot"
                        style={{ backgroundColor: zodiac.luckyHex }}
                        title={zodiac.luckyColor}
                        aria-hidden="true"
                      />
                      <span className="astrotalk-color-name">{zodiac.luckyColor}</span>
                    </div>
                  </div>

                  <p className="astrotalk-card-snippet">
                    {predictionSnippet}
                  </p>

                  <div className="astrotalk-card-footer">
                    <button
                      type="button"
                      className="astrotalk-read-more-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedSign(zodiac)
                      }}
                    >
                      <span>Read More</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="celestial-part celestial-part--zodiac" aria-labelledby="celestial-zodiac-title">
          {/* Back Navigation Bar + Quick Switcher */}
          <div className="celestial-back-nav-bar">
            <button
              type="button"
              className="celestial-back-to-grid-btn"
              onClick={() => setSelectedSign(null)}
              aria-label="Back to all 12 Zodiac Signs"
            >
              <ArrowLeft size={16} />
              <span>Back to all 12 Zodiac Signs</span>
            </button>

            <div className="celestial-back-nav-info">
              <span className="celestial-back-nav-sub">Viewing Horoscope &amp; Pillars for</span>
              <strong className="celestial-back-nav-sign">{currentDisplaySign.en} ({currentDisplaySign.rasi})</strong>
            </div>

            <div className="celestial-quick-sign-pills" role="tablist" aria-label="Switch Zodiac Sign">
              {ZODIACS.map((z) => {
                const isCurrent = z.sign === currentDisplaySign.sign
                return (
                  <button
                    key={z.sign}
                    type="button"
                    role="tab"
                    aria-selected={isCurrent}
                    className={`celestial-quick-pill ${isCurrent ? 'is-active' : ''}`}
                    onClick={() => setSelectedSign(z)}
                    title={z.en}
                  >
                    <span className="celestial-quick-pill-glyph">{z.symbol}</span>
                    <span className="celestial-quick-pill-name">{z.sign}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Unified Zodiac Horizon Banner with Astrologer Guidance Card & Lead Forecast inside */}
          <div className="celestial-banner">
            {/* Top Row: Left (Sign Identity + Period Tabs) & Right (Astrologer Badge) */}
            <div className="celestial-banner-top">
              <div className="celestial-banner-left">
                <div className="celestial-sign-identity">
                  <div className="celestial-glyph-badge" aria-hidden="true">
                    <span className="celestial-glyph">{currentDisplaySign.symbol}</span>
                  </div>
                  <div className="celestial-sign-details">
                    <h2 id="celestial-zodiac-title" className="celestial-sign-name">
                      {currentDisplaySign.en} <span className="celestial-sign-rasi">({currentDisplaySign.rasi})</span>
                    </h2>
                    <div className="celestial-meta-chips">
                      <span className="celestial-meta-chip">
                        {currentDisplaySign.element === 'Fire' && <Flame size={12} />}
                        {currentDisplaySign.element === 'Earth' && <Globe2 size={12} />}
                        {currentDisplaySign.element === 'Air' && <Wind size={12} />}
                        {currentDisplaySign.element === 'Water' && <Droplets size={12} />}
                        {currentDisplaySign.element} Element
                      </span>
                      <span className="celestial-meta-chip">
                        <Compass size={12} /> Ruled by {currentDisplaySign.ruler}
                      </span>
                      {currentDisplaySign.sign === natalSign.sign && currentUser?.nakshatra && (
                        <span className="celestial-nakshatra-chip">
                          ★ Your Birth Star: {currentUser.nakshatra}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {renderAstrologerPicker()}
            </div>

            {/* Lead Astrological Forecast (Integrated inside celestial-banner) */}
            <div className="celestial-banner-forecast">
              <blockquote className="celestial-forecast-quote">
                <span className="celestial-forecast-quote-mark">“</span>
                {forecastData.lead}
              </blockquote>

              <div className="celestial-forecast-footer">
                <button
                  type="button"
                  className="celestial-forecast-cta"
                  onClick={handleAskQuestion}
                >
                  <span>Ask {activeAstrologer.name} a Question</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* BENTO GRID: Visual Layout of Four Pillars & Auspicious Tokens */}
          <div className="celestial-bento-grid">
            {/* Bento Cell 2: Four Pillars of Life (Career, Love, Wealth, Health) */}
            <article className="celestial-bento-cell celestial-bento-cell--pillars">
              <div className="celestial-cell-header">
                <div className="celestial-cell-tag">
                  <Activity size={13} /> Four Pillars of Life
                </div>
                <span className="celestial-cell-period-sub">{period} Focus</span>
              </div>

              <div className="celestial-pillars-grid">
                {/* Career */}
                <div className="celestial-pillar-card">
                  <div className="celestial-pillar-top">
                    <span className="celestial-pillar-icon celestial-pillar-icon--career">
                      <Briefcase size={14} />
                    </span>
                    <span className="celestial-pillar-title">Career</span>
                    <span className="celestial-pillar-status">{forecastData.pillars.career.status}</span>
                  </div>
                  <p className="celestial-pillar-tip">{forecastData.pillars.career.tip}</p>
                </div>

                {/* Love & Relationships */}
                <div className="celestial-pillar-card">
                  <div className="celestial-pillar-top">
                    <span className="celestial-pillar-icon celestial-pillar-icon--love">
                      <Heart size={14} />
                    </span>
                    <span className="celestial-pillar-title">Love &amp; Kin</span>
                    <span className="celestial-pillar-status">{forecastData.pillars.love.status}</span>
                  </div>
                  <p className="celestial-pillar-tip">{forecastData.pillars.love.tip}</p>
                </div>

                {/* Wealth & Finance */}
                <div className="celestial-pillar-card">
                  <div className="celestial-pillar-top">
                    <span className="celestial-pillar-icon celestial-pillar-icon--wealth">
                      <Coins size={14} />
                    </span>
                    <span className="celestial-pillar-title">Wealth</span>
                    <span className="celestial-pillar-status">{forecastData.pillars.wealth.status}</span>
                  </div>
                  <p className="celestial-pillar-tip">{forecastData.pillars.wealth.tip}</p>
                </div>

                {/* Health & Vitality */}
                <div className="celestial-pillar-card">
                  <div className="celestial-pillar-top">
                    <span className="celestial-pillar-icon celestial-pillar-icon--health">
                      <Activity size={14} />
                    </span>
                    <span className="celestial-pillar-title">Vitality</span>
                    <span className="celestial-pillar-status">{forecastData.pillars.health.status}</span>
                  </div>
                  <p className="celestial-pillar-tip">{forecastData.pillars.health.tip}</p>
                </div>
              </div>
            </article>

            {/* Bento Cell 3: Lucky Cosmic Tokens & Muhurta Window */}
            <article className="celestial-bento-cell celestial-bento-cell--tokens">
              <div className="celestial-cell-header">
                <div className="celestial-cell-tag">
                  <Sparkles size={13} /> Auspicious Cosmic Tokens
                </div>
              </div>

              <div className="celestial-tokens-grid">
                {/* Lucky Color */}
                <div className="celestial-token-card">
                  <span className="celestial-token-label">Lucky Color</span>
                  <div className="celestial-token-val-row">
                    <span
                      className="celestial-color-swatch"
                      style={{ backgroundColor: currentDisplaySign.luckyHex }}
                      aria-hidden="true"
                    />
                    <strong>{currentDisplaySign.luckyColor}</strong>
                  </div>
                </div>

                {/* Lucky Number */}
                <div className="celestial-token-card">
                  <span className="celestial-token-label">Lucky Number</span>
                  <div className="celestial-token-val-row">
                    <span className="celestial-number-glyph">{currentDisplaySign.luckyNumber}</span>
                  </div>
                </div>

                {/* Auspicious Direction */}
                <div className="celestial-token-card">
                  <span className="celestial-token-label">Auspicious Direction</span>
                  <div className="celestial-token-val-row">
                    <Compass size={16} className="celestial-token-icon" />
                    <strong>{currentDisplaySign.direction}</strong>
                  </div>
                </div>

                {/* Auspicious Muhurta Window */}
                <div className="celestial-token-card">
                  <span className="celestial-token-label">Shubha Muhurta</span>
                  <div className="celestial-token-val-row">
                    <Clock size={15} className="celestial-token-icon" />
                    <span className="celestial-muhurta-time">{currentDisplaySign.muhurta}</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* PART 2: JYOTISH PANCHANGAM & SACRED PARIHARAMS STUDIO          */}
      {/* ============================================================== */}
      <section className="celestial-part celestial-part--remedies" aria-labelledby="celestial-remedies-title">
        {/* Section Header */}
        <div className="celestial-section-head">
          <div className="celestial-section-head-left">
            <h3 id="celestial-remedies-title" className="celestial-section-title">
              Planetary Transits &amp; Sacred Pariharams
            </h3>
          </div>
          <div className="celestial-curator-chip">
            <span className="celestial-curator-avatar" aria-hidden="true">
              {activeAstrologer.photo ? (
                <img
                  src={activeAstrologer.photo}
                  alt=""
                  className="celestial-curator-avatar-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                activeAstrologer.initials
              )}
            </span>
            <div className="celestial-curator-meta">
              <span className="celestial-curator-label">Curated by</span>
              <strong>{activeAstrologer.name}</strong>
            </div>
          </div>
        </div>

        {/* Master-Detail Split Layout */}
        <div className="celestial-remedies-studio">
          {/* LEFT: Curated Specializations Stack */}
          <aside className="celestial-spec-stack" role="listbox" aria-label="Curated Transits and Events">
            {astrologerSpecializations.map((spec) => {
              const isSelected = spec.name === activeSpecialization.name
              return (
                <button
                  key={spec.name}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`celestial-spec-card${isSelected ? ' is-selected' : ''}`}
                  onClick={() => setSelectedSpecName(spec.name)}
                >
                  <div className="celestial-spec-card-body">
                    <strong className="celestial-spec-card-title">{spec.name}</strong>
                    <span className="celestial-spec-planet">{spec.planet}</span>
                  </div>
                  {isSelected && <Check size={16} className="celestial-spec-selected-check" />}
                </button>
              )
            })}
          </aside>

          {/* RIGHT: Deep-Dive Sacred Remedy Studio */}
          <main className="celestial-spec-studio-panel">
            {/* Sacred Banner Bar */}
            <div className="celestial-studio-hero">
              <div className="celestial-studio-hero-title-row">
                <div>
                  <h4 className="celestial-studio-title">{activeSpecialization.name}</h4>
                  <span className="celestial-studio-summary">{activeSpecialization.summary}</span>
                </div>
              </div>

              <div className="celestial-studio-meta-grid">
                <div className="celestial-studio-meta-item">
                  <span className="celestial-studio-meta-label">Presiding Deity</span>
                  <strong>{activeSpecialization.deity}</strong>
                </div>
                <div className="celestial-studio-meta-item">
                  <span className="celestial-studio-meta-label">Sacred Kshetra</span>
                  <strong>
                    <MapPin size={13} className="inline mr-1" />
                    {activeSpecialization.temple}
                  </strong>
                  <small>{activeSpecialization.location}</small>
                </div>
                <div className="celestial-studio-meta-item">
                  <span className="celestial-studio-meta-label">Auspicious Day</span>
                  <strong>{activeSpecialization.day}</strong>
                </div>
              </div>
            </div>

            {/* Studio Navigation Tabs */}
            <div className="celestial-studio-nav" role="tablist" aria-label="Remedy Details">
              {SPECIALIZATION_TABS.map((tab) => {
                const isActive = specializationTab === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`celestial-studio-tab${isActive ? ' is-active' : ''}`}
                    onClick={() => setSpecializationTab(tab)}
                  >
                    <span>{tab}</span>
                  </button>
                )
              })}
            </div>

            {/* Tab 1: Sacred Remedies Checklist */}
            {specializationTab === 'Remedies & Pariharam' && (
              <div className="celestial-studio-content">
                <ul className="celestial-remedy-checklist">
                  {activeSpecialization.checklist.map((step, idx) => (
                    <li key={idx} className="celestial-checklist-item">
                      <span className="celestial-step-num">{idx + 1}</span>
                      <span className="celestial-step-text">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tab 2: Mantra & Sacred Timings */}
            {specializationTab === 'Mantra & Sacred Timings' && (
              <div className="celestial-studio-content">
                <div className="celestial-content-box celestial-content-box--mantra">
                  <div className="celestial-mantra-highlight">
                    <strong className="celestial-mantra-text">{activeSpecialization.mantra}</strong>
                  </div>
                  <div className="celestial-mantra-guidelines">
                    <span>Recitation: <strong>{activeSpecialization.mantraCount}</strong></span>
                    <span>·</span>
                    <span>Auspicious Timing: <strong>Sunrise facing East</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Studio Action Footer */}
            <div className="celestial-studio-footer">
              <button
                type="button"
                className="celestial-gold-cta"
                onClick={handleBookConsultation}
              >
                <span>Consult Astrologer on this Pariharam</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </main>
        </div>
      </section>
    </div>
  )
}
