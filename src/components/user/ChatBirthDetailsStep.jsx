import { useEffect, useState } from 'react'

const BIRTH_DETAILS_STORAGE_KEY = 'astroconnect-user-birth-details'

function readSavedDetails(currentUser) {
  let saved = {}
  try {
    saved = JSON.parse(window.localStorage.getItem(BIRTH_DETAILS_STORAGE_KEY) || '{}') || {}
  } catch {
    saved = {}
  }

  return {
    name: saved.name || currentUser?.name || '',
    gender: saved.gender || currentUser?.gender || 'Female',
    place: saved.place || currentUser?.birthPlace || '',
    dob: saved.dob || currentUser?.dateOfBirth || '',
    time: saved.time || currentUser?.birthTime || '',
  }
}

const REQUIRED = ['name', 'dob', 'time', 'place', 'gender']

/**
 * Birth details collected inside the chat popup before duration and payment,
 * replacing the old standalone ChatBirthDetails page. Persists to the same
 * localStorage key so the astrologer sees them on the session.
 */
export default function ChatBirthDetailsStep({ currentUser, initial, onContinue, onBack }) {
  const [details, setDetails] = useState(() => initial || readSavedDetails(currentUser))
  const [error, setError] = useState('')

  useEffect(() => {
    if (initial) setDetails(initial)
  }, [initial])

  const update = (field, value) => setDetails((current) => ({ ...current, [field]: value }))

  const proceed = () => {
    if (!REQUIRED.every((field) => String(details[field] || '').trim())) {
      setError('Please complete your full name, date of birth, time of birth, place of birth, and gender.')
      return
    }
    setError('')
    try {
      window.localStorage.setItem(BIRTH_DETAILS_STORAGE_KEY, JSON.stringify(details))
    } catch {
      // Storage is optional; the details still travel on the session record.
    }
    onContinue(details)
  }

  return (
    <section className="instant-call-birth">
      <h3>Share your birth details</h3>
      <p className="instant-call-birth__hint">Your astrologer needs these to read your chart before the chat begins.</p>

      <div className="instant-call-birth__grid">
        <label className="field-group">
          <span className="field-label-top">Full Name</span>
          <input className="text-input" value={details.name} onChange={(event) => update('name', event.target.value)} placeholder="Your name" />
        </label>
        <label className="field-group">
          <span className="field-label-top">Gender</span>
          <select className="select-input" value={details.gender} onChange={(event) => update('gender', event.target.value)}>
            {['Female', 'Male', 'Other'].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field-group instant-call-birth__grid--wide">
          <span className="field-label-top">Place of Birth</span>
          <input className="text-input" value={details.place} onChange={(event) => update('place', event.target.value)} placeholder="City, State, Country" />
        </label>
        <label className="field-group">
          <span className="field-label-top">Date of Birth</span>
          <input className="text-input" type="date" value={details.dob} onChange={(event) => update('dob', event.target.value)} />
        </label>
        <label className="field-group">
          <span className="field-label-top">Time of Birth</span>
          <input className="text-input" type="time" value={details.time} onChange={(event) => update('time', event.target.value)} />
        </label>
      </div>

      {error && <p className="instant-call-error" role="alert">{error}</p>}

      <button type="button" className="instant-call-primary" onClick={proceed}>Continue</button>
      <button type="button" className="instant-call-secondary" onClick={onBack}>Back</button>
    </section>
  )
}