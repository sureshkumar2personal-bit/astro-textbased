import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import PageHeader from '../ui/PageHeader.jsx'
import Section from '../ui/Section.jsx'
import Card from '../ui/Card.jsx'
import FilterBar from './FilterBar.jsx'
import AstrologerCard from './AstrologerCard.jsx'
import { liveServiceStatus, useAvailabilityVersion } from '../../utils/availabilityStore.js'
import { usePricingVersion, withSavedRates } from '../../utils/consultationPricing.js'
import { getAstrologerLiveStatus, useConsultationsClock } from '../../utils/instantConsultation.js'
import { consultationAstrologers, getConsultationAvailabilityLabel } from '../../data/consultationAstrologers.js'
import { getRoleRoutes } from '../../utils/roleRoutes.js'
import { useAuth } from '../../state/AuthContext.jsx'
import { useInstantCall } from '../../state/InstantCallContext.jsx'

function matchesPriceBand(rate, band) {
  if (!band) return true
  const amount = Number(rate) || 0
  if (band === 'under-20') return amount < 20
  if (band === '20-24') return amount >= 20 && amount <= 24
  if (band === '25-plus') return amount >= 25
  return true
}

function matchesSearch(astrologer, search) {
  const term = String(search || '').trim().toLowerCase()
  if (!term) return true
  return [
    astrologer.name,
    astrologer.specialization,
    astrologer.tagline,
    astrologer.experience,
    astrologer.languages.join(' '),
  ]
    .join(' ')
    .toLowerCase()
    .includes(term)
}

export default function ConsultationDirectoryPage({ kind = 'chat' }) {
  const navigate = useNavigate()
  const { openInstantCall, openInstantChat } = useInstantCall()
  const pricingVersion = usePricingVersion()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const title = kind === 'call' ? 'Call with Astrologer' : 'Chat with Astrologer'
  const subtitle = kind === 'call'
    ? 'Choose an astrologer who is currently available for a voice call.'
    : 'Choose an astrologer who is currently available for live chat.'
  const availabilityLabel = getConsultationAvailabilityLabel(kind)
  // Chat / Call / DND switched off by the astrologer show as Offline here immediately (and the list refreshes itself).
  const availabilityVersion = useAvailabilityVersion()
  const { consultations, now } = useConsultationsClock()
  const uniqueConsultationAstrologers = useMemo(
    () => [...new Map(consultationAstrologers.map((astrologer) => [astrologer.id, astrologer])).values()]
      .map((astrologer) => ({ ...astrologer, chatStatus: liveServiceStatus(astrologer.id, 'chat', astrologer.chatStatus), callStatus: liveServiceStatus(astrologer.id, 'call', astrologer.callStatus) })),
    [availabilityVersion],
  )

  const [search, setSearch] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [minRating, setMinRating] = useState('')
  const [priceBand, setPriceBand] = useState('')

  // Map each astrologer to their live status
  const astrologersWithStatus = useMemo(() => {
    return uniqueConsultationAstrologers.map((astrologer) => {
      const live = getAstrologerLiveStatus(astrologer, kind, now, consultations)
      return { astrologer, live }
    })
  }, [uniqueConsultationAstrologers, kind, now, consultations])

  const filteredAstrologers = useMemo(() => {
    return astrologersWithStatus
      .filter(({ astrologer, live }) => {
        const rate = kind === 'call' ? withSavedRates(astrologer).callRate : withSavedRates(astrologer).chatRate

        if (live.status === 'Offline') return false
        if (specialization && astrologer.specialization !== specialization) return false
        if (minRating && astrologer.ratingValue < Number(minRating)) return false
        if (!matchesPriceBand(rate, priceBand)) return false
        if (!matchesSearch(astrologer, search)) return false
        return true
      })
      .sort((a, b) => {
        // Available astrologers first
        if (a.live.status === 'Available' && b.live.status !== 'Available') return -1
        if (a.live.status !== 'Available' && b.live.status === 'Available') return 1
        // For busy astrologers, sort by lowest wait time
        if (a.live.status === 'Busy' && b.live.status === 'Busy') {
          return (a.live.waitMinutes || 0) - (b.live.waitMinutes || 0)
        }
        return 0
      })
      .map(({ astrologer }) => astrologer)
  }, [astrologersWithStatus, kind, minRating, priceBand, pricingVersion, search, specialization])

  const startConsultation = (astrologer) => {
    if (kind === 'chat') {
      openInstantChat(astrologer.id)
      return
    }
    openInstantCall(astrologer.id)
  }

  const viewProfile = (astrologerId) => navigate(`${routes.base}/astrologer/${astrologerId}`)

  return (
    <div>
      <PageHeader
        eyebrow={kind === 'call' ? 'User portal' : undefined}
        title={title}
        subtitle={subtitle}
        showBack
        backTo={routes.dashboard}
        backLabel="Back to Dashboard"
      />

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAstrologers.length === 0 ? (
          <Card className="py-14 text-center">
            <div className="mx-auto max-w-md">
              <div className="text-xl font-bold text-[color:var(--text-primary)]">No astrologers found.</div>
              <p className="mt-3 text-[color:var(--text-secondary)]">Try adjusting your filters or check back shortly.</p>
            </div>
          </Card>
        ) : (
          filteredAstrologers.map((astrologer) => (
            <AstrologerCard
              key={astrologer.id}
              astrologer={astrologer}
              kind={kind}
              onInstant={(entry) => startConsultation(entry)}
              onViewProfile={viewProfile}
            />
          ))
        )}
      </div>
    </div>
  )
}
