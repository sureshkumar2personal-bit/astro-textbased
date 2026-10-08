import { CalendarDays, Clock3, FileText, MapPin, Sparkles, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Card from '../../../components/ui/Card.jsx'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'

function readBirthDetails() {
  let stored = {}
  if (typeof window !== 'undefined') {
    try {
      stored = JSON.parse(window.localStorage.getItem('astroconnect-user-birth-details') || '{}') || {}
    } catch {
      stored = {}
    }
  }
  return stored
}

function formatDob(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i)
  if (!match) return value || ''
  let hours = Number(match[1])
  if (match[3]?.toLowerCase() === 'pm' && hours < 12) hours += 12
  if (match[3]?.toLowerCase() === 'am' && hours === 12) hours = 0
  return `${String(hours % 12 || 12).padStart(2, '0')}:${match[2]} ${hours >= 12 ? 'PM' : 'AM'}`
}

const DEMO_STAR_DETAILS = [
  ['Nakshatra', 'Rohini'],
  ['Pada', '2'],
  ['Rasi', 'Rishabam'],
]

const DEMO_PLANETARY_POSITIONS = [
  ['Sun', 'Meenam', 'Revati'],
  ['Moon', 'Rishabam', 'Rohini'],
  ['Mars', 'Mithunam', 'Ardra'],
  ['Mercury', 'Kumbam', 'Shatabhisha'],
  ['Jupiter', 'Dhanusu', 'Mula'],
  ['Venus', 'Mesham', 'Ashwini'],
  ['Saturn', 'Makaram', 'Shravana'],
  ['Rahu', 'Kanni', 'Hasta'],
  ['Ketu', 'Meenam', 'Uttara Bhadrapada'],
]

const SELF_SELECTOR = 'me'

export default function FullHoroscope() {
  const location = useLocation()
  const { currentUser } = useAuth()
  const { familyHoroscopes } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const fromProfile = location.state?.from === 'profile'

  const familyMembers = useMemo(
    () => familyHoroscopes.filter((entry) => entry.userId === currentUser?.id),
    [familyHoroscopes, currentUser?.id],
  )

  const [selectedPerson, setSelectedPerson] = useState(SELF_SELECTOR)
  const selectedMember = selectedPerson !== SELF_SELECTOR ? familyMembers.find((member) => member.id === selectedPerson) || null : null
  const isMe = !selectedMember

  const person = useMemo(() => {
    if (selectedMember) {
      return {
        name: selectedMember.name || 'Family Member',
        dateOfBirth: selectedMember.dateOfBirth || '',
        timeOfBirth: selectedMember.timeOfBirth || '07:05',
        placeOfBirth: selectedMember.birthPlace || 'Theni, Tamil Nadu, India',
        horoscopeDetails: '',
      }
    }
    const stored = readBirthDetails()
    return {
      name: currentUser?.name || 'My Horoscope',
      dateOfBirth: stored.dateOfBirth || stored.dob || currentUser?.dateOfBirth || '',
      timeOfBirth: stored.timeOfBirth || stored.time || currentUser?.birthTime || '07:05',
      placeOfBirth: stored.placeOfBirth || stored.place || currentUser?.birthPlace || 'Theni, Tamil Nadu, India',
      horoscopeDetails: stored.horoscopeDetails || currentUser?.horoscopeDetails || '',
    }
  }, [selectedMember, currentUser?.name, currentUser?.dateOfBirth, currentUser?.birthTime, currentUser?.birthPlace, currentUser?.horoscopeDetails])

  const needsBirthDetails = !person.dateOfBirth || !person.timeOfBirth

  const birthAction = isMe
    ? needsBirthDetails
      ? { label: 'Add Birth Details', to: routes.myAccount, state: { from: 'horoscope' } }
      : null
    : { label: needsBirthDetails ? 'Add Birth Details' : 'Edit Birth Details', to: routes.profile, state: { familyMember: selectedMember.id } }

  const birthFields = [
    { label: 'Date of Birth', value: formatDob(person.dateOfBirth), icon: CalendarDays },
    { label: 'Time of Birth', value: formatTime(person.timeOfBirth), icon: Clock3 },
    { label: 'Place of Birth', value: person.placeOfBirth, icon: MapPin },
  ]

  return (
    <div>
      <PageHeader eyebrow="HOROSCOPE" title="Horoscope" subtitle="View saved birth details and horoscope information for you and your family." showBack={fromProfile} backTo={routes.profile} />
      <div className="section horoscope-page">
        <div className="horoscope-page__content">
          <Card className="horoscope-selector-card">
            <div className="horoscope-selector-card__copy"><span className="horoscope-kicker">YOUR COSMIC PROFILE</span><strong>Choose a horoscope</strong><span>View birth details and planetary guidance.</span></div>
            <label className="horoscope-selector-card__field"><span>Horoscope for</span><select className="select-input" value={selectedPerson} onChange={(event) => setSelectedPerson(event.target.value)}><option value={SELF_SELECTOR}>My Horoscope</option>{familyMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
          </Card>

          <div className="horoscope-overview-grid">
            <Card className="horoscope-birth-card">
              <div className="horoscope-card-heading"><div><span className="horoscope-kicker">BIRTH CHART</span><h2>{isMe ? 'My Birth Details' : `${person.name}'s Birth Details`}</h2></div><span className="horoscope-heading-icon"><Sparkles size={18} /></span></div>
              <div className="horoscope-birth-tiles">{birthFields.map((field) => { const Icon = field.icon; return <div className="horoscope-birth-tile" key={field.label}><span className="horoscope-birth-tile__icon"><Icon size={16} /></span><span>{field.label}</span><strong>{field.value || 'Not added'}</strong></div> })}</div>
              {birthAction ? <div className="user-profile-birth-actions"><Link className="btn btn-primary btn-sm" to={birthAction.to} state={birthAction.state}>{birthAction.label}</Link></div> : null}
            </Card>

            <Card className="horoscope-star-card">
              <div className="horoscope-card-heading"><div><span className="horoscope-kicker">STARS</span><h2>Star / Nakshatra</h2></div><span className="horoscope-heading-icon horoscope-heading-icon--gold"><Star size={18} /></span></div>
              <div className="horoscope-star-card__visual"><div className="horoscope-star-card__orb"><Star size={25} /></div><div><strong>{DEMO_STAR_DETAILS[0][1]}</strong><span>Your birth star</span></div></div>
              <div className="horoscope-stat-chips">{DEMO_STAR_DETAILS.slice(1).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
            </Card>
          </div>

          <Card className="horoscope-planets-card">
            <div className="horoscope-card-heading"><div><span className="horoscope-kicker">PLANETS</span><h2>Planetary Positions</h2><p>Key placements from your Vedic astrology profile.</p></div><span className="horoscope-heading-icon"><Sparkles size={18} /></span></div>
            <div className="horoscope-planets-grid">{DEMO_PLANETARY_POSITIONS.map(([planet, rasi, nakshatra]) => <div className="horoscope-planet-tile" key={planet}><span className="horoscope-planet-tile__symbol">{planet.slice(0, 1)}</span><div><strong>{planet}</strong><span>{rasi} · {nakshatra}</span></div></div>)}</div>
          </Card>

          {isMe && person.horoscopeDetails ? <Card className="horoscope-notes-card"><div className="horoscope-card-heading"><div><span className="horoscope-kicker">HOROSCOPE NOTES</span><h2>Kundli / Horoscope Details</h2></div><span className="horoscope-heading-icon horoscope-heading-icon--gold"><FileText size={18} /></span></div><p>{person.horoscopeDetails}</p></Card> : null}
        </div>
      </div>
    </div>
  )
}
