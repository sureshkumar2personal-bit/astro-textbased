import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

const BIRTH_DETAILS_KEY = 'astroconnect-user-birth-details'

function readSavedDetails(currentUser) {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(BIRTH_DETAILS_KEY) || '{}') || {} } catch { saved = {} }
  return {
    name: saved.name || currentUser?.name || '',
    dateOfBirth: saved.dateOfBirth || saved.dob || currentUser?.dateOfBirth || '',
    timeOfBirth: saved.timeOfBirth || saved.time || currentUser?.birthTime || '',
    placeOfBirth: saved.placeOfBirth || saved.place || currentUser?.birthPlace || '',
    gender: saved.gender || currentUser?.gender || 'Female',
  }
}

export default function ChatBirthDetails() {
  const { astrologerId } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [details, setDetails] = useState(() => readSavedDetails(currentUser))
  const [error, setError] = useState('')

  const update = (field, value) => setDetails((previous) => ({ ...previous, [field]: value }))
  const continueToBooking = () => {
    const required = ['name', 'dateOfBirth', 'timeOfBirth', 'placeOfBirth']
    if (required.some((field) => !String(details[field] || '').trim())) {
      setError('Please complete your name, date of birth, time of birth, and place of birth.')
      return
    }
    const saved = { ...details, dob: details.dateOfBirth, time: details.timeOfBirth, place: details.placeOfBirth }
    localStorage.setItem(BIRTH_DETAILS_KEY, JSON.stringify(saved))
    navigate(`/chat-booking/${astrologerId}`, { state: { birthDetails: details } })
  }

  return <main className="call-payment-page chat-birth-details-page">
    <button type="button" className="call-payment-page__back" onClick={() => navigate('/user/chat-astrologers')}><ArrowLeft size={16} /> Back to Astrologers</button>
    <header className="call-payment-page__heading"><span>CHAT CONSULTATION</span><h1>Birth Details</h1><p>Enter your birth details to continue with the consultation.</p></header>
    <section className="call-payment-page__card chat-birth-details-page__card">
      <label className="field-group"><span className="field-label-top">Full Name</span><input className="text-input" value={details.name} onChange={(event) => update('name', event.target.value)} /></label>
      <div className="chat-birth-details-page__grid"><label className="field-group"><span className="field-label-top">Date of Birth</span><input className="text-input" type="date" value={details.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} /></label><label className="field-group"><span className="field-label-top">Time of Birth</span><input className="text-input" type="time" value={details.timeOfBirth} onChange={(event) => update('timeOfBirth', event.target.value)} /></label></div>
      <label className="field-group"><span className="field-label-top">Place of Birth</span><input className="text-input" value={details.placeOfBirth} onChange={(event) => update('placeOfBirth', event.target.value)} placeholder="City, State, Country" /></label>
      <label className="field-group"><span className="field-label-top">Gender</span><select className="select-input" value={details.gender} onChange={(event) => update('gender', event.target.value)}>{['Male', 'Female', 'Other'].map((value) => <option key={value}>{value}</option>)}</select></label>
      {error && <p className="call-payment-page__insufficient">{error}</p>}
      <button type="button" className="btn btn-primary chat-birth-details-page__continue" onClick={continueToBooking}>Continue</button>
    </section>
  </main>
}
