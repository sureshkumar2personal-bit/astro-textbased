import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  Download,
  Eye,
  Grid3X3,
  Headphones,
  Heart,
  Info,
  KeyRound,
  Languages,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  UserCircle2,
  UserRound,
  Users,
  UsersRound,
  VenusAndMars,
  WalletCards,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { NAKSHATRA_OPTIONS } from '../data/astrologyOptions.js'
import { deriveUsername, getBirthPlaceDetails, isFutureDate } from '../utils/profile.js'
import { getInstantConsultations, subscribeToInstantConsultations } from '../utils/instantConsultation.js'
import './my-account.css'

const formatBirthDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const initials = (name = '') => name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'U'

function consultationAmount(session) {
  if (session?.amountPaid) return Number(session.amountPaid)
  if (session?.amount) return Number(session.amount)
  return (Number(session?.pricePerMinute) || 0) * (session?.durationMinutes || 0)
}

function consultationPaid(session) {
  return session?.paymentStatus || (['ended', 'accepted'].includes(String(session?.status || '').toLowerCase()) ? 'Paid' : 'Pending')
}

const PREFERENCE_OPTIONS = {
  languages: ['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'Urdu', 'Odia', 'Assamese', 'Sanskrit', 'French', 'German', 'Spanish', 'Arabic', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Russian'],
  methods: ['Vedic Astrology', 'Tarot Reading', 'Numerology', 'Vastu Shastra', 'Nadi Astrology', 'Western Astrology', 'KP Astrology', 'Palmistry', 'Crystal Healing'],
  topics: ['Marriage', 'Career', 'Business', 'Child', 'Finance', 'Relationships', 'Health', 'Education', 'Timing', 'Family', 'Life Changes', 'Wellbeing'],
}
const GENDER_OPTIONS = ['Male', 'Female', 'Other']
const PRIVACY_OPTIONS = [['public', 'General / Visible'], ['email', 'Email Only'], ['private', 'Private']]
const LANGUAGE_OPTIONS = [...PREFERENCE_OPTIONS.languages].sort((first, second) => first.localeCompare(second))
const BIRTH_PLACE_OPTIONS = [
  'Ahmedabad, Gujarat, India',
  'Bengaluru, Karnataka, India',
  'Chennai, Tamil Nadu, India',
  'Chengalpattu, Tamil Nadu, India',
  'Chidambaram, Tamil Nadu, India',
  'Coimbatore, Tamil Nadu, India',
  'Cuddalore, Tamil Nadu, India',
  'Delhi, India',
  'Hyderabad, Telangana, India',
  'Kochi, Kerala, India',
  'Kolkata, West Bengal, India',
  'Madurai, Tamil Nadu, India',
  'Mumbai, Maharashtra, India',
  'Pune, Maharashtra, India',
  'Theni, Tamil Nadu, India',
  'Tiruchirappalli, Tamil Nadu, India',
  'Tirunelveli, Tamil Nadu, India',
  'Visakhapatnam, Andhra Pradesh, India',
].sort((first, second) => first.localeCompare(second))
const RASI_OPTIONS = ['Mesham', 'Rishabam', 'Mithunam', 'Kadagam', 'Simmam', 'Kanni', 'Thulam', 'Viruchigam', 'Dhanusu', 'Magaram', 'Kumbam', 'Meenam']

const toDateInputValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const PERSONAL_INFO_FIELDS = [
  ['fullName', 'Name'],
  ['username', 'Username'],
  ['dob', 'Date of Birth'],
  ['gender', 'Gender'],
  ['phone', 'Phone Number'],
  ['email', 'Email'],
  ['birthTime', 'Time of Birth'],
  ['birthPlace', 'Place of Birth'],
  ['languages', 'Languages'],
]

const ASTROLOGY_FIELDS = [
  ['rasi', 'Rasi'],
  ['nakshatra', 'Nakshatra'],
  ['lagna', 'Lagna / Ascendant'],
  ['sunSign', 'Sun Sign'],
]

const PERSONAL_FIELD_ICONS = { fullName: UserRound, username: AtSign, dob: CalendarDays, birthTime: Clock3, birthPlace: MapPin, gender: VenusAndMars, phone: Phone, email: Mail, languages: Languages, bio: UserCircle2 }
const ASTROLOGY_FIELD_ICONS = { rasi: Sparkles, nakshatra: Star, lagna: Moon, sunSign: Sparkles }
const PREFERENCE_ROWS = [
  ['languages', 'Preferred Language'],
  ['astrologerTypes', 'Astrology Type'],
  ['consultationTitles', 'Consultation Interests'],
]

function timeInputValue(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i)
  if (!match) return ''
  let hours = Number(match[1])
  if (match[3]?.toLowerCase() === 'pm' && hours < 12) hours += 12
  if (match[3]?.toLowerCase() === 'am' && hours === 12) hours = 0
  return `${String(hours).padStart(2, '0')}:${match[2]}`
}

function formatTime(value) {
  const input = timeInputValue(value)
  if (!input) return value || ''
  const [hours, minutes] = input.split(':').map(Number)
  return `${String(hours % 12 || 12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
}

function FamilyMemberCard({ member, onEdit, onDelete }) {
  return (
    <Card className="user-profile-family-card">
      <div className="user-profile-family-card__avatar">{initials(member.name)}</div>
      <div className="user-profile-family-card__body">
        <strong>{member.name}</strong>
        <span className="user-profile-family-card__relation">{member.relationship}</span>
        <div className="user-profile-family-card__meta">
          <span><CalendarDays size={12} /> {member.dateOfBirth || 'DOB not added'}</span>
          <span><Clock3 size={12} /> {member.timeOfBirth || 'Time not added'}</span>
          <span><MapPin size={12} /> {member.birthPlace || 'Place not added'}</span>
        </div>
      </div>
      <div className="user-profile-family-card__actions">
        <button type="button" className="icon-btn" aria-label={`Edit ${member.name}`} onClick={onEdit}><Pencil size={14} /></button>
        <button type="button" className="icon-btn" aria-label={`Remove ${member.name}`} onClick={onDelete}><Trash2 size={14} /></button>
      </div>
    </Card>
  )
}

export default function MyAccount() {
  const location = useLocation()
  const { currentUser, updateProfile, changePassword, deleteAccount } = useAuth()
  const {
    userWallet,
    subscriptions,
    userPaymentMethods,
    userAutopays,
    blockedUserIds,
    familyHoroscopes = [],
    actions,
    questions = [],
    appointments = [],
    savedPostIds = [],
    astrologerLiveSessions = [],
  } = useAppData()
  const { success } = useToast()
  const routes = getRoleRoutes(currentUser?.role)
  const name = currentUser?.name || ''
  const username = currentUser?.username || deriveUsername(name)
  const [editingDetails, setEditingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const syncDetails = () => ({
    fullName: currentUser?.name || '',
    username: currentUser?.username || deriveUsername(currentUser?.name),
    dob: currentUser?.dateOfBirth || '',
    birthTime: timeInputValue(currentUser?.birthTime),
    birthPlace: currentUser?.birthPlace || '',
    gender: currentUser?.gender || '',
    languages: [...(currentUser?.languages || [])],
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    bio: currentUser?.bio || '',
  })
  const [personalDetails, setPersonalDetails] = useState(syncDetails)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [preferences, setPreferences] = useState({ languages: currentUser?.astrologerPreferences?.languages || [], astrologerTypes: currentUser?.astrologerPreferences?.astrologerTypes || currentUser?.astrologerPreferences?.methods || [], consultationTitles: currentUser?.astrologerPreferences?.consultationTitles || currentUser?.astrologerPreferences?.topics || [] })
  const [preferencesError, setPreferencesError] = useState('')
  const [horoscopeOpen, setHoroscopeOpen] = useState(false)
  const [horoscopeForm, setHoroscopeForm] = useState({ rasi: '', nakshatra: '', lagna: '' })
  const [horoscopeError, setHoroscopeError] = useState('')
  const [privacyOpen, setPrivacyOpen] = useState(null)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const [languageSearch, setLanguageSearch] = useState('')
  const languageMenuRef = useRef(null)
  const [placeMenuOpen, setPlaceMenuOpen] = useState(false)
  const placeMenuRef = useRef(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [accountActionError, setAccountActionError] = useState('')
  const [settingsTab, setSettingsTab] = useState('about')

  // Family horoscopes state
  const familyMembers = useMemo(() => (familyHoroscopes || []).filter((entry) => entry.userId === currentUser?.id), [familyHoroscopes, currentUser?.id])
  const [familyFormOpen, setFamilyFormOpen] = useState(false)
  const [editingFamilyId, setEditingFamilyId] = useState(null)
  const [familyForm, setFamilyForm] = useState({
    relationship: '',
    name: '',
    gender: '',
    dateOfBirth: '',
    timeOfBirth: '',
    birthPlace: '',
    latitude: '',
    longitude: '',
    timezone: '',
    profileImage: '',
  })
  const [familyError, setFamilyError] = useState('')
  const [familyPlaceMenuOpen, setFamilyPlaceMenuOpen] = useState(false)
  const familyPlaceMenuRef = useRef(null)
  const [handledFamilyMemberId, setHandledFamilyMemberId] = useState(null)

  // Instant Consultations state
  const [instantConsultationTab, setInstantConsultationTab] = useState('all')
  const [instantConsultations, setInstantConsultations] = useState(() => getInstantConsultations())
  const [selectedInstantConsultation, setSelectedInstantConsultation] = useState(null)

  useEffect(() => subscribeToInstantConsultations(setInstantConsultations), [])

  const userInstantConsultations = useMemo(() => {
    if (!currentUser?.id) return []
    return (instantConsultations || [])
      .filter((session) => session.userId === currentUser.id)
      .sort((first, second) => new Date(second.startedAt || second.createdAt).getTime() - new Date(first.startedAt || first.createdAt).getTime())
  }, [currentUser?.id, instantConsultations])

  const visibleInstantConsultations = useMemo(() => {
    if (instantConsultationTab === 'call') return userInstantConsultations.filter((session) => session.type === 'call')
    if (instantConsultationTab === 'chat') return userInstantConsultations.filter((session) => session.type === 'chat')
    return userInstantConsultations
  }, [instantConsultationTab, userInstantConsultations])

  const horoscopeBirth = useMemo(() => {
    let stored = {}
    if (typeof window !== 'undefined') {
      try { stored = JSON.parse(window.localStorage.getItem('astroconnect-user-birth-details') || '{}') || {} } catch { stored = {} }
    }
    return {
      name: stored.name || currentUser?.name || '',
      dateOfBirth: stored.dateOfBirth || stored.dob || currentUser?.dateOfBirth || '',
      timeOfBirth: stored.timeOfBirth || stored.time || currentUser?.birthTime || '',
      placeOfBirth: stored.placeOfBirth || stored.place || currentUser?.birthPlace || '',
    }
  }, [currentUser?.name, currentUser?.dateOfBirth, currentUser?.birthTime, currentUser?.birthPlace])

  const activeQuestionCount = (questions || []).filter((question) => question.status !== 'Closed').length
  const ownedAppointments = (appointments || []).filter((appointment) => appointment.userId === currentUser?.id || appointment.customerId === currentUser?.id)
  const activitySummary = {
    questions: (questions || []).filter((question) => question.userId === currentUser?.id || question.customerId === currentUser?.id || (currentUser?.id === 'user-demo' && question.userId === 'user-demo')).length || activeQuestionCount,
    appointments: (ownedAppointments.length ? ownedAppointments : (appointments || []).filter((appointment) => appointment.status !== 'Cancelled')).length,
    liveSessions: (astrologerLiveSessions || []).filter((session) => session.status === 'live').length,
  }

  const familyPlaceSuggestions = BIRTH_PLACE_OPTIONS.filter((option) =>
    option.toLowerCase().includes(String(familyForm.birthPlace || '').trim().toLowerCase())
  ).slice(0, 8)

  useEffect(() => {
    if (!languageMenuOpen) return undefined
    const closeOnOutsideClick = (event) => {
      if (!languageMenuRef.current?.contains(event.target)) setLanguageMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [languageMenuOpen])

  useEffect(() => {
    if (!placeMenuOpen && !familyPlaceMenuOpen) return undefined
    const closeOnOutsideClick = (event) => {
      if (!placeMenuRef.current?.contains(event.target)) setPlaceMenuOpen(false)
      if (!familyPlaceMenuRef.current?.contains(event.target)) setFamilyPlaceMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [placeMenuOpen, familyPlaceMenuOpen])

  useEffect(() => {
    const memberId = location.state?.familyMember
    if (!memberId || memberId === handledFamilyMemberId) return
    const member = familyMembers.find((entry) => entry.id === memberId)
    setHandledFamilyMemberId(memberId)
    if (member) openFamilyForm(member)
    window.history.replaceState({}, '')
  }, [handledFamilyMemberId, location.state?.familyMember, familyMembers])

  const openFamilyForm = (member = null) => {
    setEditingFamilyId(member ? member.id : null)
    setFamilyForm(
      member
        ? {
            relationship: member.relationship || '',
            name: member.name || '',
            gender: member.gender || '',
            dateOfBirth: member.dateOfBirth || '',
            timeOfBirth: member.timeOfBirth || '',
            birthPlace: member.birthPlace || '',
            latitude: member.latitude || '',
            longitude: member.longitude || '',
            timezone: member.timezone || '',
            profileImage: member.profileImage || '',
          }
        : {
            relationship: '',
            name: '',
            gender: '',
            dateOfBirth: '',
            timeOfBirth: '',
            birthPlace: '',
            latitude: '',
            longitude: '',
            timezone: '',
            profileImage: '',
          }
    )
    setFamilyError('')
    setFamilyPlaceMenuOpen(false)
    setFamilyFormOpen(true)
  }

  const saveFamilyMember = () => {
    if (!familyForm.name.trim() || !familyForm.relationship.trim()) {
      setFamilyError('Add a name and relationship for this family member.')
      return
    }
    if (isFutureDate(familyForm.dateOfBirth)) {
      setFamilyError('Date of birth cannot be in the future.')
      return
    }
    const payload = { ...familyForm, name: familyForm.name.trim(), relationship: familyForm.relationship.trim() }
    if (editingFamilyId) {
      actions.updateFamilyHoroscope(editingFamilyId, payload)
      success('Family member updated')
    } else {
      actions.addFamilyHoroscope(payload)
      success('Family member added')
    }
    setFamilyFormOpen(false)
    setEditingFamilyId(null)
    setFamilyPlaceMenuOpen(false)
    setFamilyError('')
  }

  const deleteFamilyMember = (member) => {
    if (!window.confirm(`Remove ${member.name} from family horoscopes?`)) return
    actions.deleteFamilyHoroscope(member.id)
    success('Family member removed')
  }

  const personalValue = (key) => {
    switch (key) {
      case 'fullName': return currentUser?.name || ''
      case 'username': return username ? `@${username}` : ''
      case 'dob': return formatBirthDate(currentUser?.dateOfBirth)
      case 'gender': return currentUser?.gender || ''
      case 'phone': return currentUser?.phone || ''
      case 'email': return currentUser?.email || ''
      case 'birthTime': return formatTime(currentUser?.birthTime)
      case 'birthPlace': return currentUser?.birthPlace || ''
      case 'languages': return (currentUser?.languages || []).join(', ')
      default: return ''
    }
  }
  const preferenceValue = (group) => {
    const value = preferences[group]
    return Array.isArray(value) && value.length ? value.join(', ') : ''
  }
  const toggleLanguage = (option) => {
    setPersonalDetails((details) => {
      if (details.languages.includes(option)) return { ...details, languages: details.languages.filter((item) => item !== option) }
      if (details.languages.length >= 4) {
        setDetailsError('Select up to four languages.')
        return details
      }
      setDetailsError('')
      return { ...details, languages: [...details.languages, option] }
    })
  }
  const selectedLanguages = [...personalDetails.languages].sort((first, second) => first.localeCompare(second))
  const orderedLanguages = [...selectedLanguages, ...LANGUAGE_OPTIONS.filter((option) => !personalDetails.languages.includes(option))]
    .filter((option, index, options) => options.indexOf(option) === index)
    .filter((option) => option.toLowerCase().includes(languageSearch.trim().toLowerCase()))
  const placeSuggestions = BIRTH_PLACE_OPTIONS.filter((option) => option.toLowerCase().includes(personalDetails.birthPlace.trim().toLowerCase())).slice(0, 8)
  const openPersonalDetailsEditor = () => {
    setPersonalDetails(syncDetails())
    setDetailsError('')
    setEditingDetails(true)
  }
  const savePersonalDetails = () => {
    try {
      const placeDetails = getBirthPlaceDetails(personalDetails.birthPlace) || {}
      updateProfile({
        name: personalDetails.fullName,
        username: personalDetails.username,
        email: personalDetails.email,
        phone: personalDetails.phone,
        dateOfBirth: toDateInputValue(personalDetails.dob),
        birthTime: personalDetails.birthTime,
        birthPlace: personalDetails.birthPlace,
        ...placeDetails,
        gender: personalDetails.gender,
        languages: personalDetails.languages,
        bio: personalDetails.bio,
        astrologerPreferencesEnabled: true,
        astrologerPreferences: {
          ...preferences,
          languages: personalDetails.languages,
          methods: preferences.astrologerTypes,
          topics: preferences.consultationTitles,
        },
      })
      setPreferences((current) => ({ ...current, languages: personalDetails.languages }))
      setEditingDetails(false)
      setLanguageMenuOpen(false)
      setPlaceMenuOpen(false)
      setDetailsError('')
      success('Profile updated')
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Unable to update your details.')
    }
  }
  const updatePrivacy = (field, value) => {
    try {
      updateProfile({ name: currentUser?.name, email: currentUser?.email, phone: currentUser?.phone, [field]: value })
      setPrivacyOpen(null)
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Unable to update privacy settings.')
    }
  }
  const renderPrivacyControl = (field, label) => {
    const selectedPrivacy = currentUser?.[field] || 'private'
    const controlKey = field === 'phoneVisibility' ? 'phone' : 'email'
    return <div className="privacy-control-wrap"><button type="button" className={`privacy-control${privacyOpen === controlKey ? ' is-open' : ''}`} aria-label={`Change ${label} privacy`} aria-expanded={privacyOpen === controlKey} onClick={() => setPrivacyOpen(privacyOpen === controlKey ? null : controlKey)}><Lock size={11} /></button>{privacyOpen === controlKey && <div className="privacy-control-menu" role="menu">{PRIVACY_OPTIONS.map(([value, optionLabel]) => <button type="button" role="menuitem" className={selectedPrivacy === value ? 'is-selected' : ''} key={value} onClick={() => updatePrivacy(field, value)}><span>{optionLabel}</span>{selectedPrivacy === value && <Eye size={12} />}</button>)}</div>}</div>
  }
  const openHoroscopeEditor = () => {
    setHoroscopeForm({ rasi: currentUser?.rasi || '', nakshatra: currentUser?.nakshatra || '', lagna: currentUser?.lagna || '' })
    setHoroscopeError('')
    setHoroscopeOpen(true)
  }
  const saveHoroscopeDetails = () => {
    const rasi = horoscopeForm.rasi.trim()
    const nakshatra = horoscopeForm.nakshatra.trim()
    const lagna = horoscopeForm.lagna.trim()
    if (rasi && !RASI_OPTIONS.includes(rasi)) { setHoroscopeError('Select a valid Rasi.'); return }
    if (nakshatra && !NAKSHATRA_OPTIONS.includes(nakshatra)) { setHoroscopeError('Select a valid Nakshatra.'); return }
    if (lagna && !RASI_OPTIONS.includes(lagna)) { setHoroscopeError('Select a valid Lagna / Ascendant.'); return }
    try {
      updateProfile({ name: currentUser?.name, email: currentUser?.email, rasi, nakshatra, lagna })
      setHoroscopeOpen(false)
      setHoroscopeError('')
      success('Horoscope details saved')
    } catch (err) {
      setHoroscopeError(err instanceof Error ? err.message : 'Unable to save your horoscope details.')
    }
  }
  const togglePreference = (group, value) => setPreferences((current) => ({ ...current, [group]: current[group].includes(value) ? current[group].filter((item) => item !== value) : [...current[group], value] }))
  const savePreferences = () => {
    const missing = Object.entries(preferences).find(([, values]) => !values.length)
    if (missing) { setPreferencesError(`Select at least one ${missing[0].replace('methods', 'astrologer type').replace('topics', 'consultation topic').replace('languages', 'language')}.`); return }
    updateProfile({ name: currentUser?.name, email: currentUser?.email, phone: currentUser?.phone, specialization: currentUser?.specialization, experience: currentUser?.experience, astrologerPreferencesEnabled: true, astrologerPreferences: { ...preferences, methods: preferences.astrologerTypes, topics: preferences.consultationTitles } })
    setPreferencesError('')
    setPreferencesOpen(false)
    success('Preferences saved')
  }
  const downloadUserData = () => {
    const exportData = { profile: currentUser, subscriptions, wallet: userWallet, paymentMethods: userPaymentMethods }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'astro-connect-account-data.json'
    link.click()
    URL.revokeObjectURL(url)
  }
  const savePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setAccountActionError('New password and confirmation do not match.')
      return
    }
    try {
      changePassword(passwordForm)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordOpen(false)
      setAccountActionError('')
      success('Password updated')
    } catch (err) {
      setAccountActionError(err instanceof Error ? err.message : 'Unable to update your password.')
    }
  }
  const handleDeleteAccount = () => {
    if (!window.confirm('Delete your Astro Connect account? This action cannot be undone.')) return
    deleteAccount()
  }

  return (
    <div className="my-account-page">
      <BackButton to={routes.dashboard} label="Back to Dashboard" />
      <PageHeader title="My Account" />
      <Card className="my-account-summary">
        <div className="my-account-summary__avatar">{currentUser?.profileImage ? <img src={currentUser.profileImage} alt={`${name}'s avatar`} /> : initials(name)}</div>
        <div className="my-account-summary__copy">
          <strong>{name || 'Astro Connect Member'}</strong>
          <span className="muted">@{username}</span>
        </div>
        <Link className="my-account-summary__tag" to={routes.profile} state={{ from: 'my-account' }}>Profile</Link>
        <button type="button" className="btn btn-primary my-account-summary__edit" onClick={openPersonalDetailsEditor}><Pencil size={15} /> Edit Profile</button>
      </Card>
      <div className="my-account-layout">
      <Card className="my-account-settings-card">
        <nav className="my-account-tabbar" role="tablist" aria-label="Account sections">
          {[
            ['about', 'About', UserRound],
            ['astrology', 'Astrology', Sparkles],
            ['preferences', 'Preferences', SlidersHorizontal],
            ['birthchart', 'Birth Chart', CalendarDays],
            ['family', 'Family', Users],
            ['activity', 'Activity', Clock3],
            ['instant', 'Instant Chats', Headphones],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={settingsTab === id}
              className={`my-account-tab${settingsTab === id ? ' is-active' : ''}`}
              onClick={() => setSettingsTab(id)}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </nav>
        {settingsTab === 'about' && <section className="my-account-settings-section">
          <div className="my-account-section-heading">
            <div>
              <h2 className="my-account-settings-title">Personal Information</h2>
            </div>
            <button type="button" className="my-account-settings-edit" aria-label="Edit Personal Information" onClick={openPersonalDetailsEditor}><Pencil size={15} /></button>
          </div>
          {editingDetails ? (
            <>
              <div className="form-grid">
                <label>Full Name<input className="text-input" value={personalDetails.fullName} onChange={(event) => setPersonalDetails((details) => ({ ...details, fullName: event.target.value }))} /></label>
                <label>Username<input className="text-input" value={personalDetails.username} onChange={(event) => setPersonalDetails((details) => ({ ...details, username: event.target.value }))} placeholder="your-username" /></label>
                <label>Date of Birth<input type="date" className="text-input" value={personalDetails.dob} onChange={(event) => setPersonalDetails((details) => ({ ...details, dob: event.target.value }))} /></label>
                <label>Gender<select className="select-input" value={personalDetails.gender} onChange={(event) => setPersonalDetails((details) => ({ ...details, gender: event.target.value }))}><option value="">Select gender</option>{GENDER_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                <label>Phone Number<div className="my-account-edit-privacy-field"><input className="text-input" value={personalDetails.phone} onChange={(event) => setPersonalDetails((details) => ({ ...details, phone: event.target.value }))} />{renderPrivacyControl('phoneVisibility', 'phone number')}</div></label>
                <label>Email<div className="my-account-edit-privacy-field"><input className="text-input" value={personalDetails.email} onChange={(event) => setPersonalDetails((details) => ({ ...details, email: event.target.value }))} />{renderPrivacyControl('emailVisibility', 'email')}</div></label>
                <label>Time of Birth<input type="time" className="text-input" value={personalDetails.birthTime} onChange={(event) => setPersonalDetails((details) => ({ ...details, birthTime: event.target.value }))} /></label>
                <label className="my-account-place-field">Place of Birth<div className="my-account-place-wrap" ref={placeMenuRef}><input className="text-input" value={personalDetails.birthPlace} placeholder="Type a city or place" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={placeMenuOpen} onFocus={(event) => { event.currentTarget.select(); setPlaceMenuOpen(true) }} onChange={(event) => { setPersonalDetails((details) => ({ ...details, birthPlace: event.target.value })); setPlaceMenuOpen(true) }} />{placeMenuOpen && <div className="my-account-place-menu" role="listbox">{placeSuggestions.map((option) => <button type="button" role="option" key={option} onClick={() => { setPersonalDetails((details) => ({ ...details, birthPlace: option })); setPlaceMenuOpen(false) }}>{option}</button>)}{!placeSuggestions.length && <span>No matching cities found.</span>}</div>}</div></label>
                <label className="my-account-language-field">Languages<div className="my-account-language-select-wrap" ref={languageMenuRef}><button type="button" className="select-input my-account-language-select" aria-haspopup="listbox" aria-expanded={languageMenuOpen} onClick={() => { setLanguageMenuOpen(true); setLanguageSearch('') }}><span>{personalDetails.languages.length ? personalDetails.languages.join(', ') : 'Select up to 4 languages'}</span><ChevronDown size={15} /></button>{languageMenuOpen && <div className="my-account-language-menu" role="listbox" aria-label="Select languages" aria-multiselectable="true"><input autoFocus className="text-input my-account-language-search" value={languageSearch} onChange={(event) => setLanguageSearch(event.target.value)} placeholder="Type to find a language" aria-label="Filter languages" />{orderedLanguages.map((option) => { const selected = personalDetails.languages.includes(option); const disabled = !selected && personalDetails.languages.length >= 4; return <button type="button" role="option" aria-selected={selected} className={`my-account-language-option${selected ? ' is-selected' : ''}`} key={option} disabled={disabled} onClick={() => toggleLanguage(option)}><span>{option}</span>{selected && <Check size={14} />}</button> })}{!orderedLanguages.length && <span className="my-account-language-empty">No matching languages.</span>}<small>Select up to 4 languages. Selected languages stay at the top.</small></div>}</div></label>
                <label className="md:col-span-2">About Me<textarea className="textarea-box" rows="2" value={personalDetails.bio} onChange={(event) => setPersonalDetails((details) => ({ ...details, bio: event.target.value }))} placeholder="A short bio about yourself..." /></label>
              </div>
              {detailsError && <p className="preferences-error">{detailsError}</p>}
              <div className="my-account-actions">
                <button type="button" className="btn btn-primary" onClick={savePersonalDetails}>Save Changes</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setEditingDetails(false); setLanguageMenuOpen(false); setPlaceMenuOpen(false); setDetailsError('') }}>Cancel</button>
              </div>
            </>
          ) : (
            <div className="my-account-info-rows">
              {PERSONAL_INFO_FIELDS.map(([key, label]) => {
                const Icon = PERSONAL_FIELD_ICONS[key] || UserRound
                const privacyField = key === 'phone' ? 'phoneVisibility' : key === 'email' ? 'emailVisibility' : null
                const selectedPrivacy = privacyField ? currentUser?.[privacyField] || 'private' : null
                return (
                  <div className="my-account-info-row" key={key}>
                    <span><Icon size={14} />{label}</span>
                    <div className="my-account-info-value">
                      <strong className={personalValue(key) ? '' : 'is-empty'}>{personalValue(key) || 'Not added'}</strong>
                      {privacyField && (
                        <div className="privacy-control-wrap">
                          <button type="button" className={`privacy-control${privacyOpen === key ? ' is-open' : ''}`} aria-label={`Change ${label.toLowerCase()} privacy`} aria-expanded={privacyOpen === key} onClick={() => setPrivacyOpen(privacyOpen === key ? null : key)}><Lock size={11} /></button>
                          {privacyOpen === key && (
                            <div className="privacy-control-menu" role="menu">
                              {PRIVACY_OPTIONS.map(([value, optionLabel]) => (
                                <button type="button" role="menuitem" className={selectedPrivacy === value ? 'is-selected' : ''} key={value} onClick={() => updatePrivacy(privacyField, value)}>
                                  <span>{optionLabel}</span>
                                  {selectedPrivacy === value && <Eye size={12} />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {currentUser?.bio ? (
                <div className="my-account-info-row">
                  <span><UserCircle2 size={14} />About Me</span>
                  <div className="my-account-info-value">
                    <strong>{currentUser.bio}</strong>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>}
        {settingsTab === 'astrology' && <section className="my-account-settings-section">
          <div className="my-account-section-heading">
            <div>
              <h2 className="my-account-settings-title">Astrology Details</h2>
              <p className="muted my-account-settings-desc">Your basic horoscope information.</p>
            </div>
            <button type="button" className="my-account-settings-edit" aria-label="Edit Astrology Details" onClick={openHoroscopeEditor}><Pencil size={15} /></button>
          </div>
          <div className="my-account-info-rows">
            {ASTROLOGY_FIELDS.map(([key, label]) => {
              const Icon = ASTROLOGY_FIELD_ICONS[key] || Sparkles
              return (
                <div className="my-account-info-row" key={key}>
                  <span><Icon size={14} />{label}</span>
                  <strong className={currentUser?.[key] ? '' : 'is-empty'}>{currentUser?.[key] || 'Not added'}</strong>
                </div>
              )
            })}
          </div>
        </section>}
        {settingsTab === 'preferences' && <section className="my-account-settings-section">
          <div className="my-account-section-heading">
            <div>
              <h2 className="my-account-settings-title">Preferences</h2>
              <p className="muted my-account-settings-desc">Language and consultation preferences for astrologer matching.</p>
            </div>
            <button type="button" className="my-account-settings-edit" aria-label="Edit Preferences" onClick={() => { setPreferencesError(''); setPreferencesOpen(true) }}><SlidersHorizontal size={15} /></button>
          </div>
          <div className="my-account-info-rows">
            {PREFERENCE_ROWS.map(([key, label]) => <div className="my-account-info-row" key={key}><span>{label}</span><strong className={preferenceValue(key) ? '' : 'is-empty'}>{preferenceValue(key) || 'Not set'}</strong></div>)}
          </div>
        </section>}
        {settingsTab === 'birthchart' && <section className="my-account-settings-section">
          <div className="my-account-section-heading">
            <div>
              <h2 className="my-account-settings-title">Birth Chart</h2>
              <p className="muted my-account-settings-desc">Your birth details and horoscope charts.</p>
            </div>
            <Sparkles size={20} className="my-account-management-icon" />
          </div>
          <div className="my-account-info-rows">
            <div className="my-account-info-row">
              <span><CalendarDays size={14} />Date of Birth</span>
              <strong className={personalValue('dob') || horoscopeBirth.dateOfBirth ? '' : 'is-empty'}>
                {personalValue('dob') || formatBirthDate(horoscopeBirth.dateOfBirth) || 'Not added'}
              </strong>
            </div>
            <div className="my-account-info-row">
              <span><Clock3 size={14} />Time of Birth</span>
              <strong className={personalValue('birthTime') || horoscopeBirth.timeOfBirth ? '' : 'is-empty'}>
                {personalValue('birthTime') || formatTime(horoscopeBirth.timeOfBirth) || horoscopeBirth.timeOfBirth || 'Not added'}
              </strong>
            </div>
            <div className="my-account-info-row">
              <span><MapPin size={14} />Place of Birth</span>
              <strong className={personalValue('birthPlace') || horoscopeBirth.placeOfBirth ? '' : 'is-empty'}>
                {personalValue('birthPlace') || horoscopeBirth.placeOfBirth || 'Not added'}
              </strong>
            </div>
          </div>
          <div className="user-profile-chart-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 14 }}>
            <div style={{ display: 'grid', gap: 4, padding: '12px 14px', border: '1px solid var(--surface-border, #e4d8f1)', borderRadius: 12, background: 'var(--surface-strong, #faf6ff)' }}>
              <span style={{ color: 'var(--text-secondary, #7652a8)', fontSize: 11 }}>Kundli / Birth Chart</span>
              <strong style={{ color: 'var(--ink, #21182d)', fontSize: 13 }}>Available</strong>
            </div>
            <div style={{ display: 'grid', gap: 4, padding: '12px 14px', border: '1px solid var(--surface-border, #e4d8f1)', borderRadius: 12, background: 'var(--surface-strong, #faf6ff)' }}>
              <span style={{ color: 'var(--text-secondary, #7652a8)', fontSize: 11 }}>Navamsa Chart</span>
              <strong style={{ color: 'var(--ink, #21182d)', fontSize: 13 }}>Available</strong>
            </div>
            <div style={{ display: 'grid', gap: 4, padding: '12px 14px', border: '1px solid var(--surface-border, #e4d8f1)', borderRadius: 12, background: 'var(--surface-strong, #faf6ff)' }}>
              <span style={{ color: 'var(--text-secondary, #7652a8)', fontSize: 11 }}>Planetary Positions</span>
              <strong style={{ color: 'var(--ink, #21182d)', fontSize: 13 }}>View Horoscope</strong>
            </div>
            <div style={{ display: 'grid', gap: 4, padding: '12px 14px', border: '1px solid var(--surface-border, #e4d8f1)', borderRadius: 12, background: 'var(--surface-strong, #faf6ff)' }}>
              <span style={{ color: 'var(--text-secondary, #7652a8)', fontSize: 11 }}>Current Dasha</span>
              <strong style={{ color: 'var(--ink, #21182d)', fontSize: 13 }}>Vimshottari Dasha</strong>
            </div>
          </div>
          <div className="user-profile-birth-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <Link to={routes.horoscope} state={{ from: 'my-account' }} className="btn btn-outline btn-sm">
              View Full Horoscope <ArrowRight size={14} />
            </Link>
          </div>
        </section>}
        {settingsTab === 'family' && <section className="my-account-settings-section">
          <div className="my-account-section-heading">
            <div>
              <h2 className="my-account-settings-title">Family Horoscopes</h2>
              <p className="muted my-account-settings-desc">Keep birth details for your loved ones together.</p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => openFamilyForm()}>
              <Plus size={15} /> Add Family Member
            </button>
          </div>
          {familyMembers.length ? (
            <div className="user-profile-family-grid">
              {familyMembers.map((member) => (
                <FamilyMemberCard
                  key={member.id}
                  member={member}
                  onEdit={() => openFamilyForm(member)}
                  onDelete={() => deleteFamilyMember(member)}
                />
              ))}
            </div>
          ) : (
            <p className="muted user-profile-empty">Add family members so their birth details and horoscope information are always at hand.</p>
          )}
        </section>}
        {settingsTab === 'activity' && <section className="my-account-settings-section">
          <div className="my-account-section-heading">
            <div>
              <h2 className="my-account-settings-title">Activity Summary</h2>
              <p className="muted my-account-settings-desc">Your questions, consultations, and account activity.</p>
            </div>
            <Clock3 size={20} className="my-account-management-icon" />
          </div>
          <div className="user-profile-activity">
            <Link to={routes.trackQuestions}><strong>{activitySummary.questions}</strong><span><MessageCircle size={13} /> Questions</span></Link>
            <Link to={routes.myAppointments}><strong>{activitySummary.appointments}</strong><span><CalendarDays size={13} /> Appointments</span></Link>
            <button type="button" className="user-profile-consultation-tile" onClick={() => { setInstantConsultationTab('all'); document.getElementById('user-profile-instant-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><strong>{userInstantConsultations.length}</strong><span><Headphones size={13} /> Consultations</span></button>
            <div><strong>0</strong><span><Heart size={13} /> Reviews given</span></div>
            <div><strong>{savedPostIds?.length || 0}</strong><span><Bookmark size={13} /> Saved content</span></div>
            <Link to={routes.poojaDetails}><strong>0</strong><span><Sparkles size={13} /> Puja activity</span></Link>
          </div>
        </section>}
        {settingsTab === 'instant' && <section id="user-profile-instant-history" className="my-account-settings-section">
          <div className="my-account-section-heading">
            <div>
              <h2 className="my-account-settings-title">Instant Consultations</h2>
              <p className="muted my-account-settings-desc">Your recent instant calls and chats with astrologers.</p>
            </div>
            <Headphones size={20} className="my-account-management-icon" />
          </div>
          <div className="user-profile-consultation-tabs" role="tablist" aria-label="Instant consultation history">
            {[["all", "All"], ["call", "Instant Calls"], ["chat", "Instant Chats"]].map(([value, label]) => (
              <button
                type="button"
                role="tab"
                aria-selected={instantConsultationTab === value}
                className={instantConsultationTab === value ? 'is-active' : ''}
                key={value}
                onClick={() => setInstantConsultationTab(value)}
              >
                {label}
                <span>{value === 'all' ? userInstantConsultations.length : userInstantConsultations.filter((session) => session.type === value).length}</span>
              </button>
            ))}
          </div>
          {visibleInstantConsultations.length ? (
            <div className="user-profile-instant-history-list">
              {visibleInstantConsultations.map((session) => {
                const isChat = session.type === 'chat'
                const occurredAt = session.startedAt || session.createdAt
                return (
                  <article
                    className={`user-profile-instant-history-row user-profile-instant-history-row--${session.type}`}
                    key={session.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${isChat ? 'instant chat' : 'instant call'} with ${session.astrologerName || 'astrologer'}`}
                    onClick={() => setSelectedInstantConsultation(session)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedInstantConsultation(session)
                      }
                    }}
                  >
                    <span className="user-profile-instant-history-icon">
                      {isChat ? <MessageCircle size={17} /> : <PhoneCall size={17} />}
                    </span>
                    <div>
                      <strong>
                        {isChat ? 'Instant Chat' : 'Instant Call'} <span className="user-profile-instant-history-separator">·</span> {session.astrologerName || 'Astrologer'}
                      </strong>
                      <small>
                        {occurredAt ? new Date(occurredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date unavailable'} <span className="user-profile-instant-history-separator">·</span> {session.durationMinutes || 0} min
                      </small>
                    </div>
                    <span className={`user-profile-instant-history-status user-profile-instant-history-status--${String(session.status || '').toLowerCase()}`}>
                      {session.status || 'Unknown'}
                    </span>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="user-profile-instant-history-empty">
              <MessageCircle size={22} />
              <strong>No instant {instantConsultationTab === 'all' ? 'consultations' : `${instantConsultationTab}s`} yet</strong>
              <p>Your instant call and chat history will appear here.</p>
            </div>
          )}
        </section>}
      </Card>
      <section className="my-account-settings-section">
        <div className="my-account-section-heading">
          <div>
            <h2 className="my-account-settings-title">Account &amp; Security</h2>
          </div>
          <ShieldCheck size={20} className="my-account-management-icon" />
        </div>
        <div className="my-account-info-rows">
          <div className="my-account-info-row"><span><ShieldCheck size={14} />Account Status</span><strong>Active</strong></div>
          <div className="my-account-info-row"><span><Lock size={14} />Two-Factor Authentication</span><strong>Not enabled</strong></div>
          <div className="my-account-info-row"><span><Lock size={14} />Password</span><strong>••••••••</strong></div>
          <div className="my-account-info-row"><span><UsersRound size={14} />Profile Visibility</span><strong>{currentUser?.profileVisibility || 'Private'}</strong></div>
          <div className="my-account-info-row"><span><ShieldCheck size={14} />Active Sessions</span><strong>1 device</strong></div>
          <div className="my-account-info-row"><span><UsersRound size={14} />Blocked Users</span><strong>{blockedUserIds?.length || 0}</strong></div>
        </div>
      </section>
      </div>
      <Card className="my-account-management-card">
        <section className="my-account-management-section">
          <div className="my-account-section-heading"><div><h2 className="my-account-settings-title">Wallet &amp; Billing</h2><p className="muted my-account-settings-desc">View your balance, payments, and subscriptions.</p></div><WalletCards size={20} className="my-account-management-icon" /></div>
          <div className="my-account-info-rows">
            <div className="my-account-info-row"><span><WalletCards size={14} />Wallet</span><strong>₹{Number(userWallet?.balance || 0).toLocaleString('en-IN')}</strong></div>
            <div className="my-account-info-row"><span><CreditCard size={14} />Payment Methods</span><strong>{userPaymentMethods?.length || 0} saved</strong></div>
            <div className="my-account-info-row"><span><Star size={14} />Subscriptions</span><strong>{subscriptions?.length || 0} active</strong></div>
            <div className="my-account-info-row"><span><CalendarDays size={14} />Renewal Status</span><strong>{userAutopays?.some((item) => item.status === 'active') ? 'Autopay enabled' : 'Manual renewal'}</strong></div>
          </div>
          <div className="my-account-management-links"><Link className="my-account-management-link" to={routes.walletHistory}><WalletCards size={14} /> Wallet &amp; transactions</Link><Link className="my-account-management-link" to={routes.paymentMethods}><CreditCard size={14} /> Payment settings</Link></div>
        </section>
        <section className="my-account-management-section">
          <div className="my-account-section-heading"><div><h2 className="my-account-settings-title">Notifications</h2><p className="muted my-account-settings-desc">Choose how Astro Connect keeps you informed.</p></div><Mail size={20} className="my-account-management-icon" /></div>
          <div className="my-account-info-rows">
            <div className="my-account-info-row"><span>Consultation notifications</span><strong>Enabled</strong></div>
            <div className="my-account-info-row"><span>Messages</span><strong>Enabled</strong></div>
            <div className="my-account-info-row"><span>Puja &amp; order notifications</span><strong>Enabled</strong></div>
            <div className="my-account-info-row"><span>Payment notifications</span><strong>Enabled</strong></div>
            <div className="my-account-info-row"><span>Promotional notifications</span><strong>Off</strong></div>
          </div>
        </section>
        <section className="my-account-management-section my-account-management-section--account-actions">
          <div className="my-account-section-heading"><div><h2 className="my-account-settings-title">Account Management</h2><p className="muted my-account-settings-desc">Export or manage your Astro Connect account.</p></div><KeyRound size={20} className="my-account-management-icon" /></div>
          <div className="my-account-account-actions">
            <button type="button" className="my-account-management-link" onClick={() => { setAccountActionError(''); setPasswordOpen(true) }}><KeyRound size={14} /> Reset Password</button>
            <button type="button" className="my-account-management-link" onClick={downloadUserData}><Download size={14} /> Download My Data</button>
            <button type="button" className="my-account-management-link my-account-management-link--danger" onClick={handleDeleteAccount}><Trash2 size={14} /> Delete Account</button>
          </div>
        </section>
      </Card>
      {passwordOpen && <div className="preferences-overlay user-shell-overlay" role="dialog" aria-modal="true" aria-labelledby="password-heading"><Card className="preferences-dialog"><div className="preferences-dialog-header"><div><div className="page-eyebrow">Security</div><h2 id="password-heading">Reset Password</h2><p className="muted">Choose a new password for your account.</p></div><button type="button" className="icon-btn" aria-label="Close reset password" onClick={() => setPasswordOpen(false)}><X size={17} /></button></div><div className="form-grid"><label className="field-group"><span className="field-label-top">Current Password</span><input type="password" className="text-input" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((form) => ({ ...form, currentPassword: event.target.value }))} autoComplete="current-password" /></label><label className="field-group"><span className="field-label-top">New Password</span><input type="password" className="text-input" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((form) => ({ ...form, newPassword: event.target.value }))} autoComplete="new-password" /></label><label className="field-group"><span className="field-label-top">Confirm New Password</span><input type="password" className="text-input" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((form) => ({ ...form, confirmPassword: event.target.value }))} autoComplete="new-password" /></label></div>{accountActionError && <p className="preferences-error">{accountActionError}</p>}<div className="preferences-dialog-actions"><button type="button" className="btn btn-ghost" onClick={() => setPasswordOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={savePassword}>Update Password</button></div></Card></div>}
      {preferencesOpen && <div className="preferences-overlay user-shell-overlay" role="dialog" aria-modal="true" aria-labelledby="preferences-heading"><Card className="preferences-dialog"><div className="preferences-dialog-header"><div><div className="page-eyebrow">Astrologer matching</div><h2 id="preferences-heading">Your Preferences</h2><p className="muted">Tell us what kind of guidance you are looking for.</p></div><button type="button" className="icon-btn" aria-label="Close preferences" onClick={() => setPreferencesOpen(false)}><X size={17} /></button></div>{Object.entries({ languages: LANGUAGE_OPTIONS, astrologerTypes: PREFERENCE_OPTIONS.methods, consultationTitles: PREFERENCE_OPTIONS.topics }).map(([group, options]) => <fieldset className="preferences-group" key={group}><legend>{group === 'languages' ? 'Preferred Language' : group === 'astrologerTypes' ? 'Astrology Type' : 'Consultation Interests'} <span>*</span></legend><div className="preferences-options">{options.map((option) => <button type="button" key={option} className={preferences[group].includes(option) ? 'preference-option is-selected' : 'preference-option'} onClick={() => togglePreference(group, option)}>{option}</button>)}</div></fieldset>)}{preferencesError && <p className="preferences-error">{preferencesError}</p>}<div className="preferences-dialog-actions"><button type="button" className="btn btn-ghost" onClick={() => setPreferencesOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={savePreferences}>Save Preferences</button></div></Card></div>}
      {horoscopeOpen && <div className="preferences-overlay user-shell-overlay" role="dialog" aria-modal="true" aria-labelledby="horoscope-heading"><Card className="preferences-dialog"><div className="preferences-dialog-header"><div><div className="page-eyebrow">Astrology Details</div><h2 id="horoscope-heading">Edit Horoscope</h2><p className="muted">Select your Rasi, Nakshatra, and Lagna / Ascendant.</p></div><button type="button" className="icon-btn" aria-label="Close edit horoscope" onClick={() => setHoroscopeOpen(false)}><X size={17} /></button></div><div className="form-grid"><label className="field-group"><span className="field-label-top">Rasi</span><select className="select-input" value={horoscopeForm.rasi} onChange={(event) => setHoroscopeForm((form) => ({ ...form, rasi: event.target.value }))}><option value="">Select Rasi</option>{RASI_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label className="field-group"><span className="field-label-top">Nakshatra</span><select className="select-input" value={horoscopeForm.nakshatra} onChange={(event) => setHoroscopeForm((form) => ({ ...form, nakshatra: event.target.value }))}><option value="">Select Nakshatra</option>{NAKSHATRA_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label className="field-group" style={{ marginBottom: 0 }}><span className="field-label-top">Lagna / Ascendant</span><select className="select-input" value={horoscopeForm.lagna} onChange={(event) => setHoroscopeForm((form) => ({ ...form, lagna: event.target.value }))}><option value="">Select Lagna</option>{RASI_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label></div>{horoscopeError && <p className="preferences-error">{horoscopeError}</p>}<div className="preferences-dialog-actions"><button type="button" className="btn btn-ghost" onClick={() => setHoroscopeOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={saveHoroscopeDetails}>Save Horoscope</button></div></Card></div>}

      {familyFormOpen && createPortal(
        <div className="modal-overlay user-modal-overlay" onClick={() => setFamilyFormOpen(false)}>
          <div className="modal-card user-modal-card" style={{ width: 'min(480px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div>
                <div className="section-title" style={{ marginBottom: 0 }}>{editingFamilyId ? 'Edit' : 'Add'} Family Horoscope</div>
                <p className="muted">Save the birth details of a family member.</p>
              </div>
              <button type="button" className="icon-btn" aria-label="Close family form" onClick={() => setFamilyFormOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-card__content user-modal-card__content">
              <div className="form-grid">
                <label className="field-group"><span className="field-label-top">Relationship</span><input className="text-input" value={familyForm.relationship} onChange={(event) => setFamilyForm({ ...familyForm, relationship: event.target.value })} placeholder="Mother, Father, Partner..." /></label>
                <label className="field-group"><span className="field-label-top">Full Name</span><input className="text-input" value={familyForm.name} onChange={(event) => setFamilyForm({ ...familyForm, name: event.target.value })} placeholder="Member's name" /></label>
                <label className="field-group"><span className="field-label-top">Gender</span><input className="text-input" value={familyForm.gender} onChange={(event) => setFamilyForm({ ...familyForm, gender: event.target.value })} placeholder="Optional" /></label>
                <label className="field-group"><span className="field-label-top">Date of Birth</span><input type="date" className="text-input" value={familyForm.dateOfBirth} onChange={(event) => setFamilyForm({ ...familyForm, dateOfBirth: event.target.value })} /></label>
                <label className="field-group"><span className="field-label-top">Time of Birth</span><input type="time" className="text-input" value={familyForm.timeOfBirth} onChange={(event) => setFamilyForm({ ...familyForm, timeOfBirth: event.target.value })} /></label>
                <label className="field-group profile-place-field">
                  <span className="field-label-top">Place of Birth</span>
                  <div className="profile-place-wrap" ref={familyPlaceMenuRef}>
                    <input
                      className="text-input"
                      value={familyForm.birthPlace}
                      onChange={(event) => { setFamilyForm({ ...familyForm, birthPlace: event.target.value, latitude: '', longitude: '', timezone: '' }); setFamilyPlaceMenuOpen(true) }}
                      onFocus={(event) => { event.currentTarget.select(); setFamilyPlaceMenuOpen(true) }}
                      placeholder="Type a city or place"
                      autoComplete="off"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={familyPlaceMenuOpen}
                    />
                    {familyPlaceMenuOpen && (
                      <div className="profile-place-menu" role="listbox">
                        {familyPlaceSuggestions.map((option) => (
                          <button
                            type="button"
                            role="option"
                            key={option}
                            onClick={() => {
                              const details = getBirthPlaceDetails(option)
                              setFamilyForm({ ...familyForm, birthPlace: option, ...details })
                              setFamilyPlaceMenuOpen(false)
                            }}
                          >
                            {option}
                          </button>
                        ))}
                        {!familyPlaceSuggestions.length && <span>No matching cities found.</span>}
                      </div>
                    )}
                  </div>
                </label>
                <label className="field-group"><span className="field-label-top">Latitude</span><input inputMode="decimal" className="text-input" value={familyForm.latitude} onChange={(event) => setFamilyForm({ ...familyForm, latitude: event.target.value })} placeholder="Optional" /></label>
                <label className="field-group"><span className="field-label-top">Longitude</span><input inputMode="decimal" className="text-input" value={familyForm.longitude} onChange={(event) => setFamilyForm({ ...familyForm, longitude: event.target.value })} placeholder="Optional" /></label>
                <label className="field-group"><span className="field-label-top">Timezone</span><input className="text-input" value={familyForm.timezone} onChange={(event) => setFamilyForm({ ...familyForm, timezone: event.target.value })} placeholder="e.g. Asia/Kolkata" /></label>
                <label className="field-group"><span className="field-label-top">Profile photo URL</span><input className="text-input" value={familyForm.profileImage} onChange={(event) => setFamilyForm({ ...familyForm, profileImage: event.target.value })} placeholder="https://..." /></label>
              </div>
              {familyError && <div className="profile-message profile-message--error" style={{ marginTop: 12 }}>{familyError}</div>}
              <div className="profile-edit-actions" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setFamilyFormOpen(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={saveFamilyMember}>{editingFamilyId ? 'Save Changes' : 'Add Member'}</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedInstantConsultation && createPortal(
        <div className={`user-profile-consultation-modal-backdrop user-profile-consultation-modal-backdrop--${selectedInstantConsultation.type}`} role="presentation" onClick={() => setSelectedInstantConsultation(null)}>
          <section className={`user-profile-consultation-modal user-profile-consultation-modal--${selectedInstantConsultation.type}`} role="dialog" aria-modal="true" aria-labelledby="instant-consultation-summary-title" onClick={(event) => event.stopPropagation()}>
            <header className="user-profile-consultation-modal__topbar">
              <h2 id="instant-consultation-summary-title">Consultation Details</h2>
              <button type="button" className="user-profile-consultation-modal__close" aria-label="Close consultation summary" onClick={() => setSelectedInstantConsultation(null)}><X size={18} /></button>
            </header>
            <div className="user-profile-consultation-modal__content">
              <div className="user-profile-consultation-modal__identity-row">
                <div className="user-profile-consultation-modal__person">
                  <span>{initials(selectedInstantConsultation.astrologerName || 'Astrologer')}</span>
                  <div>
                    <strong>{selectedInstantConsultation.astrologerName || 'Astrologer'}</strong>
                    <small>ASTROLOGER</small>
                  </div>
                </div>
                <div className="user-profile-consultation-modal__id">
                  <small>CONSULTATION ID</small>
                  <strong>{selectedInstantConsultation.id}</strong>
                </div>
              </div>
              <div className="user-profile-consultation-modal__amount-panel">
                <span>AMOUNT</span>
                <strong>₹{consultationAmount(selectedInstantConsultation).toLocaleString('en-IN')}</strong>
                <em>{consultationPaid(selectedInstantConsultation)}</em>
              </div>
              <div className="user-profile-consultation-modal__details">
                <div>
                  <span className="user-profile-consultation-modal__detail-icon"><UserCircle2 size={15} /></span>
                  <span><small>ASTROLOGER</small><strong>{selectedInstantConsultation.astrologerName || 'Astrologer'}</strong></span>
                </div>
                <div>
                  <span className="user-profile-consultation-modal__detail-icon"><Clock3 size={15} /></span>
                  <span><small>{selectedInstantConsultation.type === 'chat' ? 'CHAT' : 'CALL'} STARTED</small><strong>{selectedInstantConsultation.startedAt ? new Date(selectedInstantConsultation.startedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not started'}</strong></span>
                </div>
                <div>
                  <span className="user-profile-consultation-modal__detail-icon"><Clock3 size={15} /></span>
                  <span><small>{selectedInstantConsultation.type === 'chat' ? 'CHAT' : 'CALL'} ENDED</small><strong>{selectedInstantConsultation.endedAt ? new Date(selectedInstantConsultation.endedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not ended'}</strong></span>
                </div>
                <div>
                  <span className="user-profile-consultation-modal__detail-icon"><Clock3 size={15} /></span>
                  <span><small>DURATION</small><strong>{(selectedInstantConsultation.durationMinutes || 0) + (selectedInstantConsultation.extraMinutes || 0)} min</strong></span>
                </div>
                <div>
                  <span className="user-profile-consultation-modal__detail-icon">₹</span>
                  <span><small>AMOUNT</small><strong>₹{consultationAmount(selectedInstantConsultation).toLocaleString('en-IN')}</strong></span>
                </div>
                <div>
                  <span className="user-profile-consultation-modal__detail-icon"><BadgeCheck size={15} /></span>
                  <span><small>PAYMENT</small><strong>{consultationPaid(selectedInstantConsultation)}</strong></span>
                </div>
                <div>
                  <span className="user-profile-consultation-modal__detail-icon"><BadgeCheck size={15} /></span>
                  <span><small>STATUS</small><strong>{selectedInstantConsultation.status || 'Unknown'}</strong></span>
                </div>
              </div>
            </div>
            <footer className="user-profile-consultation-modal__footer">
              <button type="button" className="user-profile-consultation-modal__close-action" onClick={() => setSelectedInstantConsultation(null)}>Close</button>
            </footer>
          </section>
        </div>,
        document.body
      )}
    </div>
  )
}
