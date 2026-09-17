import { CalendarDays, Clock3, FileText, MapPin } from 'lucide-react'
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
        timeOfBirth: selectedMember.timeOfBirth || '',
        placeOfBirth: selectedMember.birthPlace || '',
        horoscopeDetails: '',
      }
    }
    const stored = readBirthDetails()
    return {
      name: currentUser?.name || 'My Horoscope',
      dateOfBirth: stored.dateOfBirth || stored.dob || currentUser?.dateOfBirth || '',
      timeOfBirth: stored.timeOfBirth || stored.time || currentUser?.birthTime || '',
      placeOfBirth: stored.placeOfBirth || stored.place || currentUser?.birthPlace || '',
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
    { label: 'Time of Birth', value: person.timeOfBirth, icon: Clock3 },
    { label: 'Place of Birth', value: person.placeOfBirth, icon: MapPin },
  ]

  return (
    <div>
      <PageHeader eyebrow="HOROSCOPE" title="Horoscope" subtitle="View saved birth details and horoscope information for you and your family." showBack={fromProfile} backTo={routes.profile} />
      <div className="section user-profile">
        <div className="user-profile-content">
          <Card className="user-profile-card">
            <label className="field-group" style={{ margin: 0 }}>
              <span className="field-label-top">Horoscope for</span>
              <select className="select-input" value={selectedPerson} onChange={(event) => setSelectedPerson(event.target.value)}>
                <option value={SELF_SELECTOR}>My Horoscope</option>
                {familyMembers.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </label>
          </Card>
          <Card className="user-profile-card">
            <div className="user-profile-card__heading"><div><span className="profile-kicker">BIRTH CHART</span><h2>{isMe ? 'My Birth Details' : `${person.name}'s Birth Details`}</h2></div></div>
            <div className="user-profile-detail-rows">
              {birthFields.map((field) => {
                const Icon = field.icon
                return <div key={field.label}><span>{Icon && <Icon size={14} />} {field.label}</span><strong>{field.value || 'Not added'}</strong></div>
              })}
            </div>
            {birthAction ? <div className="user-profile-birth-actions">
              <Link className="btn btn-primary btn-sm" to={birthAction.to} state={birthAction.state}>{birthAction.label}</Link>
            </div> : null}
          </Card>
          {isMe && person.horoscopeDetails ? <Card className="user-profile-card">
            <div className="user-profile-card__heading"><div><span className="profile-kicker">HOROSCOPE NOTES</span><h2>Kundli / Horoscope Details</h2></div></div>
            <div className="user-profile-detail-rows">
              <div><span><FileText size={14} /> Saved Kundli Details</span><strong>{person.horoscopeDetails}</strong></div>
            </div>
          </Card> : null}
        </div>
      </div>
    </div>
  )
}