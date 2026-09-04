import { createPortal } from 'react-dom'
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
    maritalStatus: saved.maritalStatus || currentUser?.maritalStatus || 'Single',
    occupation: saved.occupation || currentUser?.occupation || '',
  }
}

export default function ShareBirthDetailsModal({ currentUser, onProceed, onSkip, onCancel }) {
  const [details, setDetails] = useState(() => readSavedDetails(currentUser))
  const [error, setError] = useState('')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  const update = (field, value) => setDetails((current) => ({ ...current, [field]: value }))
  const proceed = () => {
    if (![details.name, details.dob, details.time, details.place, details.gender].every((value) => String(value || '').trim())) {
      setError('Please complete your full name, date of birth, time of birth, place of birth, and gender.')
      return
    }
    setError('')
    window.localStorage.setItem(BIRTH_DETAILS_STORAGE_KEY, JSON.stringify(details))
    onProceed(details)
  }

  return createPortal(
    <div className="modal-overlay user-modal-overlay" onClick={onCancel}>
      <div className="modal-card user-modal-card user-modal-card--scroll" role="dialog" aria-modal="true" aria-labelledby="consultation-birth-details-title" onClick={(event) => event.stopPropagation()}>
        <div className="user-modal-card__header flex items-center justify-between gap-4">
          <div>
            <div id="consultation-birth-details-title" className="section-title" style={{ marginBottom: 0 }}>Birth Details</div>
            <div className="muted" style={{ marginTop: 4 }}>Enter your birth details to continue with the consultation.</div>
          </div>
          <button type="button" className="icon-btn" aria-label="Close birth details popup" onClick={onCancel}>×</button>
        </div>

        <div className="user-modal-card__content grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field-group"><span className="field-label-top">Full Name</span><input className="text-input" value={details.name} onChange={(event) => update('name', event.target.value)} placeholder="Your name" /></label>
            <label className="field-group"><span className="field-label-top">Gender</span><select className="select-input" value={details.gender} onChange={(event) => update('gender', event.target.value)}>{['Female', 'Male', 'Other'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="field-group md:col-span-2"><span className="field-label-top">Place of Birth</span><input className="text-input" value={details.place} onChange={(event) => update('place', event.target.value)} placeholder="City, State, Country" /></label>
            <label className="field-group"><span className="field-label-top">Date of Birth</span><input className="text-input" type="date" value={details.dob} onChange={(event) => update('dob', event.target.value)} /></label>
            <label className="field-group"><span className="field-label-top">Time of Birth</span><input className="text-input" type="time" value={details.time} onChange={(event) => update('time', event.target.value)} /></label>
          </div>
        </div>
        {error && <p className="call-payment-page__insufficient" role="alert">{error}</p>}

        <div className="user-modal-card__footer">
          <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-outline" onClick={onSkip}>Skip</button>
          <button type="button" className="btn btn-primary" onClick={proceed}>Continue</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
