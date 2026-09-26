import { AtSign, CalendarDays, Clock3, Languages, Mail, MapPin, Moon, Pencil, Phone, SlidersHorizontal, Sparkles, Star, UserRound, VenusAndMars, X } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { NAKSHATRA_OPTIONS } from '../data/astrologyOptions.js'
import './my-account.css'

const formatBirthDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
const initials = (name = '') => name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'U'
const PREFERENCE_OPTIONS = {
  languages: ['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'Urdu', 'Odia', 'Assamese', 'Sanskrit', 'French', 'German', 'Spanish', 'Arabic', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Russian'],
  methods: ['Vedic Astrology', 'Tarot Reading', 'Numerology', 'Vastu Shastra', 'Nadi Astrology', 'Western Astrology', 'KP Astrology', 'Palmistry', 'Crystal Healing'],
  topics: ['Marriage', 'Career', 'Business', 'Child', 'Finance', 'Relationships', 'Health', 'Education', 'Timing', 'Family', 'Life Changes', 'Wellbeing'],
}
const GENDER_OPTIONS = ['Male', 'Female', 'Other']
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
]
const PERSONAL_FIELD_ICONS = { fullName: UserRound, username: AtSign, dob: CalendarDays, birthTime: Clock3, birthPlace: MapPin, gender: VenusAndMars, phone: Phone, email: Mail, languages: Languages }
const ASTROLOGY_FIELD_ICONS = { rasi: Sparkles, nakshatra: Star, lagna: Moon }
const PREFERENCE_ROWS = [
  ['languages', 'Preferred Language'],
  ['astrologerTypes', 'Astrologer Type'],
  ['consultationTitles', 'Consultation Title'],
]

export default function MyAccount() {
  const { currentUser, updateProfile } = useAuth()
  const { success } = useToast()
  const routes = getRoleRoutes(currentUser?.role)
  const location = useLocation()
  const backTo = location.state?.from === 'profile' ? routes.profile : location.state?.from === 'horoscope' ? routes.horoscope : null
  const name = currentUser?.name || ''
  const username = name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'profile'
  const [editingDetails, setEditingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const syncDetails = () => ({
    fullName: currentUser?.name || '',
    dob: currentUser?.dateOfBirth || '',
    birthTime: currentUser?.birthTime || '',
    birthPlace: currentUser?.birthPlace || '',
    gender: currentUser?.gender || '',
    languages: [...(currentUser?.languages || [])],
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
  })
  const [personalDetails, setPersonalDetails] = useState(syncDetails)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [preferences, setPreferences] = useState({ languages: currentUser?.astrologerPreferences?.languages || [], astrologerTypes: currentUser?.astrologerPreferences?.astrologerTypes || currentUser?.astrologerPreferences?.methods || [], consultationTitles: currentUser?.astrologerPreferences?.consultationTitles || currentUser?.astrologerPreferences?.topics || [] })
  const [preferencesError, setPreferencesError] = useState('')
  const [horoscopeOpen, setHoroscopeOpen] = useState(false)
  const [horoscopeForm, setHoroscopeForm] = useState({ rasi: '', nakshatra: '', lagna: '' })
  const [horoscopeError, setHoroscopeError] = useState('')
  const personalValue = (key) => {
    switch (key) {
      case 'fullName': return currentUser?.name || ''
      case 'username': return username ? `@${username}` : ''
      case 'dob': return formatBirthDate(currentUser?.dateOfBirth)
      case 'gender': return currentUser?.gender || ''
      case 'phone': return currentUser?.phone || ''
      case 'email': return currentUser?.email || ''
      case 'birthTime': return currentUser?.birthTime || ''
      case 'birthPlace': return currentUser?.birthPlace || ''
      case 'languages': return (currentUser?.languages || []).join(', ')
      default: return ''
    }
  }
  const preferenceValue = (group) => {
    const value = preferences[group]
    return Array.isArray(value) && value.length ? value.join(', ') : ''
  }
  const openPersonalDetailsEditor = () => {
    setPersonalDetails(syncDetails())
    setDetailsError('')
    setEditingDetails(true)
  }
  const savePersonalDetails = () => {
    try {
      updateProfile({
        name: personalDetails.fullName,
        email: personalDetails.email,
        phone: personalDetails.phone,
        dateOfBirth: toDateInputValue(personalDetails.dob),
        birthTime: personalDetails.birthTime,
        birthPlace: personalDetails.birthPlace,
        gender: personalDetails.gender,
        languages: personalDetails.languages,
      })
      setEditingDetails(false)
      setDetailsError('')
      success('Profile updated')
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Unable to update your details.')
    }
  }
  const toggleLanguage = (option) => setPersonalDetails((details) => ({ ...details, languages: details.languages.includes(option) ? details.languages.filter((item) => item !== option) : [...details.languages, option] }))
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

  return (
    <div className="my-account-page">
      <BackButton to={backTo} label="Back to Dashboard" />
      <PageHeader title="My Account" subtitle="Manage your personal information, astrology details and preferences." />
      <Card className="my-account-summary">
        <div className="my-account-summary__avatar">{currentUser?.profileImage ? <img src={currentUser.profileImage} alt={`${name}'s avatar`} /> : initials(name)}</div>
        <div className="my-account-summary__copy">
          <strong>{name || 'Astro Connect Member'}</strong>
          <span className="muted">@{username}</span>
        </div>
        <span className="my-account-summary__tag">Member</span>
        <button type="button" className="btn btn-primary my-account-summary__edit" onClick={openPersonalDetailsEditor}><Pencil size={15} /> Edit Profile</button>
      </Card>
      <Card className="my-account-settings-card">
        <section className="my-account-settings-section">
          <div className="my-account-section-heading">
            <div>
              <h2 className="my-account-settings-title">Personal Information</h2>
              <p className="muted my-account-settings-desc">Your basic account and birth details.</p>
            </div>
            <button type="button" className="my-account-settings-edit" aria-label="Edit Personal Information" onClick={openPersonalDetailsEditor}><Pencil size={15} /></button>
          </div>
          {editingDetails ? (
            <>
              <div className="form-grid">
                <label>Name<input className="text-input" value={personalDetails.fullName} onChange={(event) => setPersonalDetails((details) => ({ ...details, fullName: event.target.value }))} /></label>
                <label>Date of Birth<input type="date" className="text-input" value={personalDetails.dob} onChange={(event) => setPersonalDetails((details) => ({ ...details, dob: event.target.value }))} /></label>
                <label>Gender<select className="select-input" value={personalDetails.gender} onChange={(event) => setPersonalDetails((details) => ({ ...details, gender: event.target.value }))}><option value="">Select gender</option>{GENDER_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                <label>Phone Number<input className="text-input" value={personalDetails.phone} onChange={(event) => setPersonalDetails((details) => ({ ...details, phone: event.target.value }))} /></label>
                <label>Email<input className="text-input" value={personalDetails.email} onChange={(event) => setPersonalDetails((details) => ({ ...details, email: event.target.value }))} /></label>
                <label>Time of Birth<input type="time" className="text-input" value={personalDetails.birthTime} onChange={(event) => setPersonalDetails((details) => ({ ...details, birthTime: event.target.value }))} /></label>
                <label>Place of Birth<input className="text-input" value={personalDetails.birthPlace} onChange={(event) => setPersonalDetails((details) => ({ ...details, birthPlace: event.target.value }))} /></label>
                <label>Languages<div className="preferences-options">{PREFERENCE_OPTIONS.languages.map((option) => <button type="button" key={option} className={personalDetails.languages.includes(option) ? 'preference-option is-selected' : 'preference-option'} onClick={() => toggleLanguage(option)}>{option}</button>)}</div></label>
              </div>
              {detailsError && <p className="preferences-error">{detailsError}</p>}
              <div className="my-account-actions">
                <button type="button" className="btn btn-primary" onClick={savePersonalDetails}>Save Changes</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setEditingDetails(false); setDetailsError('') }}>Cancel</button>
              </div>
            </>
          ) : (
            <div className="my-account-info-rows">
              {PERSONAL_INFO_FIELDS.map(([key, label]) => { const Icon = PERSONAL_FIELD_ICONS[key] || UserRound; return <div className="my-account-info-row" key={key}><span><Icon size={14} />{label}</span><strong className={personalValue(key) ? '' : 'is-empty'}>{personalValue(key) || 'Not added'}</strong></div> })}
            </div>
          )}
        </section>
        <section className="my-account-settings-section">
          <div className="my-account-section-heading">
            <div>
              <h2 className="my-account-settings-title">Astrology Details</h2>
              <p className="muted my-account-settings-desc">Your basic horoscope information.</p>
            </div>
            <button type="button" className="my-account-settings-edit" aria-label="Edit Astrology Details" onClick={openHoroscopeEditor}><Pencil size={15} /></button>
          </div>
          <div className="my-account-info-rows">
            {ASTROLOGY_FIELDS.map(([key, label]) => { const Icon = ASTROLOGY_FIELD_ICONS[key] || Sparkles; return <div className="my-account-info-row" key={key}><span><Icon size={14} />{label}</span><strong className={currentUser?.[key] ? '' : 'is-empty'}>{currentUser?.[key] || 'Not added'}</strong></div> })}
          </div>
        </section>
        <section className="my-account-settings-section">
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
        </section>
      </Card>
      {preferencesOpen && <div className="preferences-overlay" role="dialog" aria-modal="true" aria-labelledby="preferences-heading"><Card className="preferences-dialog"><div className="preferences-dialog-header"><div><div className="page-eyebrow">Astrologer matching</div><h2 id="preferences-heading">Your Preferences</h2><p className="muted">Tell us what kind of guidance you are looking for.</p></div><button type="button" className="icon-btn" aria-label="Close preferences" onClick={() => setPreferencesOpen(false)}><X size={17} /></button></div>{Object.entries({ languages: PREFERENCE_OPTIONS.languages, astrologerTypes: PREFERENCE_OPTIONS.methods, consultationTitles: PREFERENCE_OPTIONS.topics }).map(([group, options]) => <fieldset className="preferences-group" key={group}><legend>{group === 'languages' ? 'Preferred Language' : group === 'astrologerTypes' ? 'Astrologer Type' : 'Consultation Title'} <span>*</span></legend><div className="preferences-options">{options.map((option) => <button type="button" key={option} className={preferences[group].includes(option) ? 'preference-option is-selected' : 'preference-option'} onClick={() => togglePreference(group, option)}>{option}</button>)}</div></fieldset>)}{preferencesError && <p className="preferences-error">{preferencesError}</p>}<div className="preferences-dialog-actions"><button type="button" className="btn btn-ghost" onClick={() => setPreferencesOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={savePreferences}>Save Preferences</button></div></Card></div>}
      {horoscopeOpen && <div className="preferences-overlay" role="dialog" aria-modal="true" aria-labelledby="horoscope-heading"><Card className="preferences-dialog"><div className="preferences-dialog-header"><div><div className="page-eyebrow">Astrology Details</div><h2 id="horoscope-heading">Edit Horoscope</h2><p className="muted">Select your Rasi, Nakshatra, and Lagna / Ascendant.</p></div><button type="button" className="icon-btn" aria-label="Close edit horoscope" onClick={() => setHoroscopeOpen(false)}><X size={17} /></button></div><div className="form-grid"><label className="field-group"><span className="field-label-top">Rasi</span><select className="select-input" value={horoscopeForm.rasi} onChange={(event) => setHoroscopeForm((form) => ({ ...form, rasi: event.target.value }))}><option value="">Select Rasi</option>{RASI_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label className="field-group"><span className="field-label-top">Nakshatra</span><select className="select-input" value={horoscopeForm.nakshatra} onChange={(event) => setHoroscopeForm((form) => ({ ...form, nakshatra: event.target.value }))}><option value="">Select Nakshatra</option>{NAKSHATRA_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label className="field-group" style={{ marginBottom: 0 }}><span className="field-label-top">Lagna / Ascendant</span><select className="select-input" value={horoscopeForm.lagna} onChange={(event) => setHoroscopeForm((form) => ({ ...form, lagna: event.target.value }))}><option value="">Select Lagna</option>{RASI_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label></div>{horoscopeError && <p className="preferences-error">{horoscopeError}</p>}<div className="preferences-dialog-actions"><button type="button" className="btn btn-ghost" onClick={() => setHoroscopeOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={saveHoroscopeDetails}>Save Horoscope</button></div></Card></div>}
    </div>
  )
}
