import { useEffect, useState } from 'react'
import { searchPlaces } from '../../utils/geocode.js'

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
    // Partner details are per call only; never read from or written to the shared saved-horoscope key.
    partner: { name: '', dob: '', time: '', place: '' },
    // Coordinates/zone saved with the profile are valid only for the profile's own birthplace text.
    latitude: currentUser?.latitude ?? '',
    longitude: currentUser?.longitude ?? '',
    timezone: currentUser?.timezone || '',
    coordsPlace: currentUser?.birthPlace || '',
  }
}

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
const hasCoords = (entry) => entry && entry.latitude !== '' && entry.latitude != null && entry.longitude !== '' && entry.longitude != null && entry.timezone && same(entry.coordsPlace, entry.place)

/** Drops coordinates that no longer belong to the typed place; keeps them when they do. */
function resolveCoords(entry) {
  const { latitude, longitude, timezone, coordsPlace, ...rest } = entry
  return hasCoords(entry)
    ? { ...rest, latitude: Number(latitude), longitude: Number(longitude), timezone, coordsPlace }
    : rest
}

/**
 * Place input with an explicit "Find location" lookup. The user picks one of the returned
 * places, so coordinates and time zone are never guessed.
 */
function PlaceField({ label, value, onChange, onPick, located, placeholder, wide = false, testId }) {
  const [results, setResults] = useState([])
  const [state, setState] = useState('idle')
  const [message, setMessage] = useState('')

  const find = async () => {
    setState('loading')
    setMessage('')
    try {
      const found = await searchPlaces(value)
      setResults(found)
      setState('done')
      if (!found.length) setMessage('No matching place found. Try adding the state or country.')
    } catch {
      setResults([])
      setState('error')
      setMessage('Location lookup is unavailable right now (network or service limit). Try again shortly.')
    }
  }

  return (
    <div className={`field-group${wide ? ' instant-call-birth__grid--wide' : ''}`} data-testid={testId}>
      <span className="field-label-top">{label}</span>
      <div className="instant-call-place">
        <input className="text-input" value={value} onChange={(event) => { onChange(event.target.value); setResults([]); setState('idle') }} placeholder={placeholder} />
        <button type="button" className="instant-call-secondary instant-call-place__find" onClick={find} disabled={state === 'loading' || String(value).trim().length < 2}>
          {state === 'loading' ? 'Searching…' : 'Find location'}
        </button>
      </div>
      {located && <small className="instant-call-place__ok" data-testid="place-located">📍 {located}</small>}
      {message && <small className="instant-call-place__msg" role="status">{message}</small>}
      {results.length > 0 && (
        <ul className="instant-call-place__results" role="listbox" aria-label="Matching places">
          {results.map((result) => (
            <li key={result.id}>
              <button type="button" role="option" onClick={() => { onPick(result); setResults([]); setState('idle') }}>
                <strong>{result.label}</strong>
                <small>{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)} · {result.timeZone}{result.type ? ` · ${result.type}` : ''}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const REQUIRED = ['name', 'dob', 'time', 'place', 'gender']

/**
 * Birth details collected inside the chat popup before duration and payment,
 * replacing the old standalone ChatBirthDetails page. Persists to the same
 * localStorage key so the astrologer sees them on the session.
 */
export default function ChatBirthDetailsStep({ currentUser, initial, onContinue, onBack, type = 'call' }) {
  const [details, setDetails] = useState(() => initial || readSavedDetails(currentUser))
  const [topic, setTopic] = useState(() => {
    if (initial?.topic) {
      if (['Career', 'Business', 'Marriage'].includes(initial.topic)) return initial.topic
      return 'Others'
    }
    return 'Career'
  })
  const [customTopic, setCustomTopic] = useState(() => {
    if (initial?.topic && !['Career', 'Business', 'Marriage'].includes(initial.topic)) {
      return initial.topic.slice(0, 25)
    }
    return ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (initial) setDetails(initial)
  }, [initial])

  const update = (field, value) => setDetails((current) => ({ ...current, [field]: value }))
  const pickPlace = (result) => setDetails((current) => ({ ...current, place: result.label, latitude: result.latitude, longitude: result.longitude, timezone: result.timeZone, coordsPlace: result.label }))
  const pickPartnerPlace = (result) => setDetails((current) => ({ ...current, partner: { ...(current.partner || {}), place: result.label, latitude: result.latitude, longitude: result.longitude, timezone: result.timeZone, coordsPlace: result.label } }))
  const partner = details.partner || { name: '', dob: '', time: '', place: '' }
  const updatePartner = (field, value) => setDetails((current) => ({ ...current, partner: { ...(current.partner || {}), [field]: value } }))

  const proceed = () => {
    if (!REQUIRED.every((field) => String(details[field] || '').trim())) {
      setError('Please complete your full name, date of birth, time of birth, place of birth, and gender.')
      return
    }
    setError('')
    try {
      // Persist only the user's own birth details (the shape other pages already read).
      const { name, gender, place, dob, time } = details
      window.localStorage.setItem(BIRTH_DETAILS_STORAGE_KEY, JSON.stringify({ name, gender, place, dob, time }))
    } catch {
      // Storage is optional; the details still travel on the session record.
    }
    const partnerFilled = ['name', 'dob', 'time', 'place'].some((field) => String(details.partner?.[field] || '').trim())
    const own = resolveCoords(details)
    const finalTopic = topic === 'Others' ? (customTopic.trim() || 'Others') : topic
    onContinue({ ...own, topic: finalTopic, partner: partnerFilled ? resolveCoords(details.partner) : null })
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
        <PlaceField
          label="Place of Birth"
          wide
          testId="own-place"
          value={details.place}
          onChange={(value) => update('place', value)}
          onPick={pickPlace}
          placeholder="City, State, Country"
          located={hasCoords(details) ? `${Number(details.latitude).toFixed(4)}, ${Number(details.longitude).toFixed(4)} · ${details.timezone}` : ''}
        />
        <label className="field-group">
          <span className="field-label-top">Date of Birth</span>
          <input className="text-input" type="date" value={details.dob} onChange={(event) => update('dob', event.target.value)} />
        </label>
        <label className="field-group">
          <span className="field-label-top">Time of Birth</span>
          <input className="text-input" type="time" value={details.time} onChange={(event) => update('time', event.target.value)} />
        </label>
      </div>

      <div className="instant-call-purpose-section">
        <h3>Purpose of {type === 'chat' ? 'Consultation' : 'Call'}</h3>
        <p className="instant-call-birth__hint">Choose what you want to consult with Guruji about:</p>
        <div className="instant-call-purpose-options" role="radiogroup" aria-label={`Purpose of ${type}`}>
          {['Career', 'Business', 'Marriage', 'Others'].map((item) => {
            const isSelected = topic === item
            return (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`instant-call-purpose-pill ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  setTopic(item)
                  if (item !== 'Others') setCustomTopic('')
                }}
              >
                <span className="instant-call-purpose-pill__icon">
                  {item === 'Career' && '💼 '}
                  {item === 'Business' && '📈 '}
                  {item === 'Marriage' && '💍 '}
                  {item === 'Others' && '✨ '}
                </span>
                <span>{item}</span>
              </button>
            )
          })}
        </div>

        {topic === 'Others' && (
          <div className="instant-call-custom-purpose-box">
            <label className="field-group">
              <span className="field-label-top">
                Specify purpose <small>(max 25 characters)</small>
              </span>
              <input
                type="text"
                className="text-input"
                placeholder="e.g. Health, Relocation"
                maxLength={25}
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value.slice(0, 25))}
                autoFocus
              />
            </label>
            <div className="instant-call-char-counter">
              {25 - customTopic.length} characters left
            </div>
          </div>
        )}
      </div>

      <h3>Partner birth details <small>(optional)</small></h3>
      <p className="instant-call-birth__hint">Add these only if you want your astrologer to match charts with a partner.</p>
      <div className="instant-call-birth__grid" data-testid="partner-fields">
        <label className="field-group">
          <span className="field-label-top">Partner Name</span>
          <input className="text-input" value={partner.name || ''} onChange={(event) => updatePartner('name', event.target.value)} placeholder="Partner's name" />
        </label>
        <PlaceField
          label="Partner Birth Place"
          testId="partner-place"
          value={partner.place || ''}
          onChange={(value) => updatePartner('place', value)}
          onPick={pickPartnerPlace}
          placeholder="City, State, Country"
          located={hasCoords(partner) ? `${Number(partner.latitude).toFixed(4)}, ${Number(partner.longitude).toFixed(4)} · ${partner.timezone}` : ''}
        />
        <label className="field-group">
          <span className="field-label-top">Partner Date of Birth</span>
          <input className="text-input" type="date" value={partner.dob || ''} onChange={(event) => updatePartner('dob', event.target.value)} />
        </label>
        <label className="field-group">
          <span className="field-label-top">Partner Birth Time</span>
          <input className="text-input" type="time" value={partner.time || ''} onChange={(event) => updatePartner('time', event.target.value)} />
        </label>
      </div>

      {error && <p className="instant-call-error" role="alert">{error}</p>}

      <button type="button" className="instant-call-primary" onClick={proceed}>Continue</button>
      <button type="button" className="instant-call-secondary" onClick={onBack}>Back</button>
    </section>
  )
}