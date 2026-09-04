import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import PageHeader from '../ui/PageHeader.jsx'
import Section from '../ui/Section.jsx'
import Card from '../ui/Card.jsx'
import FilterBar from './FilterBar.jsx'
import AstrologerCard from './AstrologerCard.jsx'
import { consultationAstrologers, getConsultationAvailabilityLabel } from '../../data/consultationAstrologers.js'
import { getRoleRoutes } from '../../utils/roleRoutes.js'
import { useAuth } from '../../state/AuthContext.jsx'
import ShareBirthDetailsModal from './ShareBirthDetailsModal.jsx'
import { CALL_PACKAGES } from '../../data/notificationData.js'

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
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const title = kind === 'call' ? 'Call with Astrologer' : 'Chat with Astrologer'
  const subtitle = kind === 'call'
    ? 'Choose an astrologer who is currently available for a voice call.'
    : 'Choose an astrologer who is currently available for live chat.'
  const availabilityLabel = getConsultationAvailabilityLabel(kind)
  const uniqueConsultationAstrologers = useMemo(
    () => [...new Map(consultationAstrologers.map((astrologer) => [astrologer.id, astrologer])).values()],
    [],
  )

  const availableAstrologers = useMemo(
    () => uniqueConsultationAstrologers.filter((astrologer) => (kind === 'call' ? astrologer.callStatus : astrologer.chatStatus) === 'Available'),
    [kind, uniqueConsultationAstrologers],
  )

  const specializations = useMemo(
    () => [...new Set(uniqueConsultationAstrologers.map((astrologer) => astrologer.specialization))].sort(),
    [uniqueConsultationAstrologers],
  )

  const [search, setSearch] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [minRating, setMinRating] = useState('')
  const [priceBand, setPriceBand] = useState('')
  const [availability, setAvailability] = useState('Available')
  const [selectedAstrologer, setSelectedAstrologer] = useState(null)

  const filteredAstrologers = useMemo(() => {
    return uniqueConsultationAstrologers.filter((astrologer) => {
      const status = kind === 'call' ? astrologer.callStatus : astrologer.chatStatus
      const rate = kind === 'call' ? astrologer.callRate : astrologer.chatRate
      // Chat is intentionally an available-only directory. Call keeps its
      // existing availability filter behavior.
      if (kind === 'chat' ? status !== 'Available' : availability && status !== availability) return false
      if (specialization && astrologer.specialization !== specialization) return false
      if (minRating && astrologer.ratingValue < Number(minRating)) return false
      if (!matchesPriceBand(rate, priceBand)) return false
      if (!matchesSearch(astrologer, search)) return false
      return true
    })
  }, [availability, kind, minRating, priceBand, search, specialization, uniqueConsultationAstrologers])

  const availabilityOptions = [
    { value: 'Available', label: 'Available only' },
    { value: 'Busy', label: 'Busy' },
    { value: 'Offline', label: 'Offline' },
  ]

  const priceOptions = kind === 'call'
    ? [
        { value: 'under-20', label: 'Under ₹20/min' },
        { value: '20-24', label: '₹20-24/min' },
        { value: '25-plus', label: '₹25+/min' },
      ]
    : [
        { value: 'under-20', label: 'Under ₹20/min' },
        { value: '20-24', label: '₹20-24/min' },
        { value: '25-plus', label: '₹25+/min' },
      ]

  const startConsultation = (astrologer, birthDetails = null) => {
    if (kind === 'chat') {
      navigate(`/chat-booking/${astrologer.id}`, { state: { birthDetails } })
      return
    }
    navigate(`/call-booking/${astrologer.id}`)
  }

  const viewProfile = (astrologerId) => navigate(`${routes.base}/astrologer/${astrologerId}`)

  return (
    <div>
      <button type="button" className="consultation-directory__dashboard-link" onClick={() => navigate(routes.dashboard)}><ArrowLeft size={16} aria-hidden="true" /> Back to Dashboard</button>
      <PageHeader
        eyebrow={kind === 'call' ? 'User portal' : undefined}
        title={title}
        subtitle={subtitle}
        showBack={false}
      />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAstrologers.length === 0 ? (
            <Card className="py-14 text-center">
              <div className="mx-auto max-w-md">
                <div className="text-xl font-bold text-[color:var(--text-primary)]">No astrologers are currently available.</div>
                <p className="mt-3 text-[color:var(--text-secondary)]">Try again a little later.</p>
              </div>
            </Card>
          ) : (
            filteredAstrologers.map((astrologer) => (
              <AstrologerCard key={astrologer.id} astrologer={astrologer} kind={kind} onSelect={() => kind === 'chat' ? setSelectedAstrologer(astrologer) : startConsultation(astrologer)} onStart={() => kind === 'chat' ? setSelectedAstrologer(astrologer) : startConsultation(astrologer)} onViewProfile={viewProfile} />
            ))
          )}
        </div>
      {selectedAstrologer && (
        <ShareBirthDetailsModal
          currentUser={currentUser}
          onCancel={() => setSelectedAstrologer(null)}
          onSkip={() => { const astrologer = selectedAstrologer; setSelectedAstrologer(null); startConsultation(astrologer) }}
          onProceed={(birthDetails) => { const astrologer = selectedAstrologer; setSelectedAstrologer(null); startConsultation(astrologer, birthDetails) }}
        />
      )}
    </div>
  )
}
