import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Award, CalendarDays, Camera, Check, ChevronRight, Globe2, Mail, MapPin, Pencil, Phone, Plus, Quote, Save, Sparkles, Trash2, UserRound, X,
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../utils/roleRoutes.js'
import {
  ASTROLOGY_SYSTEMS, BIO_LIMIT, CONSULTATION_STYLES, EXPERTISE_OPTIONS, GENDERS, LANGUAGE_OPTIONS, PRICING_FIELDS, PROFILE_SECTIONS,
  SECTION_KEYS, SERVICE_DEFINITIONS, calculateCompletion, mergeProfile, profileStorageKey, validateCredential, validatePhoto, validateSection,
} from '../../utils/astrologerProfile.js'
import '../../css/astrologer/my-profile.css'

const SECTION_DESCRIPTIONS = {
  basic: 'This information will be used to build your professional astrologer profile.',
  experience: 'Tell users what you practise and how long you have been doing it.',
  languages: 'Select the languages you can consult in.',
  services: 'Choose the consultation services you offer.',
  pricing: 'Manage your professional consultation pricing.',
  credentials: 'Add the qualifications that support your practice.',
  about: 'Introduce yourself to users.',
  availability: 'Control when users can reach you.',
}

function readStored(userId) {
  try {
    return JSON.parse(window.localStorage.getItem(profileStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

function writeStored(userId, profile) {
  try {
    window.localStorage.setItem(profileStorageKey(userId), JSON.stringify(profile))
    return true
  } catch {
    return false
  }
}

const clone = (value) => JSON.parse(JSON.stringify(value))

function Mandala({ className = '' }) {
  const petals = Array.from({ length: 12 }, (_, index) => index * 30)
  return (
    <svg className={`mp-mandala ${className}`} viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="0.8" aria-hidden="true" focusable="false">
      {[92, 74, 56, 38, 20].map((radius) => <circle key={radius} cx="100" cy="100" r={radius} />)}
      {petals.map((angle) => (
        <g key={angle} transform={`rotate(${angle} 100 100)`}>
          <path d="M100 8 C108 30 108 48 100 62 C92 48 92 30 100 8Z" />
          <path d="M100 62 C104 72 104 80 100 88 C96 80 96 72 100 62Z" />
        </g>
      ))}
      {petals.map((angle) => <circle key={`dot-${angle}`} cx="100" cy="4" r="1.6" fill="currentColor" transform={`rotate(${angle} 100 100)`} />)}
    </svg>
  )
}

function CircularProgress({ percent }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  return (
    <div className="mp-ring" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100" aria-label="Profile completion">
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle className="mp-ring__track" cx="40" cy="40" r={radius} />
        <circle className="mp-ring__value" cx="40" cy="40" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percent / 100)} />
      </svg>
      <span>{percent}%</span>
    </div>
  )
}

function FieldError({ message }) {
  return message ? <small className="mp-error" role="alert">{message}</small> : null
}

function TextField({ label, required, error, children, icon: Icon, ...inputProps }) {
  const control = children || <input {...inputProps} aria-invalid={error ? 'true' : undefined} />
  return (
    <label className="account-field">
      <span>{label}{required && ' *'}</span>
      {Icon ? <span className="mp-input"><Icon size={16} aria-hidden="true" />{control}</span> : control}
      <FieldError message={error} />
    </label>
  )
}

function ChipGroup({ options, selected, onToggle, label }) {
  return (
    <div className="mp-chips" role="group" aria-label={label}>
      {options.map((option) => {
        const active = selected.includes(option)
        return (
          <button type="button" key={option} className={`mp-chip${active ? ' is-active' : ''}`} aria-pressed={active} onClick={() => onToggle(option)}>
            {active && <Check size={13} />}{option}
          </button>
        )
      })}
    </div>
  )
}

export default function MyProfile() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentUser } = useAuth()
  const { astrologerServices, appointmentAvailabilityTemplates, actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)

  // Always the authenticated user's own record; nothing in the URL can select another profile.
  const userId = currentUser?.id
  const astrologerId = userId === 'astrologer-demo-alias' ? 'astrologer-demo' : userId

  const [stored, setStored] = useState(() => mergeProfile(readStored(userId), currentUser))
  const [draft, setDraft] = useState(() => clone(stored))
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState(null)
  const [editingCredential, setEditingCredential] = useState(null)
  const photoInput = useRef(null)

  const requested = searchParams.get('section')
  const section = PROFILE_SECTIONS.some((item) => item.id === requested) ? requested : 'basic'

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  // Chat and voice settings live in the existing astrologerServices store; overlay them so both views agree.
  const withSharedServices = (profile) => {
    const services = { ...profile.services }
    services.chat = { ...services.chat, enabled: astrologerServices.chatEnabled, price: String(astrologerServices.chatPricePerMinute) }
    services.voice = { ...services.voice, enabled: astrologerServices.callEnabled, price: String(astrologerServices.callPricePerMinute) }
    return { ...profile, services }
  }
  const live = useMemo(
    () => withSharedServices(stored),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stored, astrologerServices.chatEnabled, astrologerServices.callEnabled, astrologerServices.chatPricePerMinute, astrologerServices.callPricePerMinute],
  )
  const shown = useMemo(
    () => withSharedServices(draft),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, astrologerServices.chatEnabled, astrologerServices.callEnabled, astrologerServices.chatPricePerMinute, astrologerServices.callPricePerMinute],
  )

  const hasAvailability = appointmentAvailabilityTemplates.some((template) => template.astrologerId === astrologerId)
  const completion = calculateCompletion(live, { hasAvailability })
  const enabledServices = Object.values(live.services).filter((service) => service.enabled)
  const incomplete = {
    basic: !live.fullName.trim() || !live.displayName.trim() || !live.photo,
    experience: !String(live.yearsOfExperience).trim() || !live.primarySystem || live.expertise.length === 0,
    languages: live.languages.length === 0 || !live.primaryLanguage,
    services: enabledServices.length === 0,
    pricing: enabledServices.some((service) => !(Number(service.price) > 0)),
    credentials: live.credentials.length === 0,
    about: !live.bio.trim(),
    availability: !hasAvailability,
  }

  const selectSection = (id) => {
    setErrors({})
    setEditingCredential(null)
    setDraft(clone(stored))
    setSearchParams({ section: id }, { replace: true })
  }
  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const setService = (key, patch) => setDraft((current) => ({ ...current, services: { ...current.services, [key]: { ...current.services[key], ...patch } } }))
  const toggleIn = (key, value) => setDraft((current) => ({
    ...current,
    [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
  }))

  const persist = (next, message) => {
    const withStatus = { ...next, status: next.status === 'Draft' && calculateCompletion(withSharedServices(next), { hasAvailability }).percent >= 75 ? 'Pending Review' : next.status }
    if (!writeStored(userId, withStatus)) {
      setToast({ kind: 'error', text: 'Could not save. Your browser storage may be full — try a smaller photo.' })
      return false
    }
    setStored(withStatus)
    setDraft(clone(withStatus))
    setToast({ kind: 'success', text: message })
    return true
  }

  const cancel = () => {
    setDraft(clone(stored))
    setErrors({})
    setEditingCredential(null)
  }

  const saveSection = () => {
    const found = validateSection(section, shown)
    setErrors(found)
    if (Object.keys(found).length) {
      setToast({ kind: 'error', text: 'Please fix the highlighted fields.' })
      return
    }
    const next = { ...stored }
    SECTION_KEYS[section].forEach((key) => { next[key] = draft[key] })
    if (section === 'services' || section === 'pricing') {
      // chat / voice persist through the existing astrologer service settings, the rest stay in the profile.
      actions.updateAstrologerServices({
        chatEnabled: Boolean(shown.services.chat.enabled),
        callEnabled: Boolean(shown.services.voice.enabled),
        ...(section === 'pricing' ? {
          chatPricePerMinute: Number(shown.services.chat.price) || 0,
          callPricePerMinute: Number(shown.services.voice.price) || 0,
        } : {}),
      })
      const services = { ...stored.services }
      SERVICE_DEFINITIONS.forEach(({ key }) => {
        const source = draft.services[key]
        services[key] = section === 'services'
          ? { ...services[key], enabled: source.enabled, duration: source.duration }
          : { ...services[key], price: source.price }
      })
      next.services = services
    }
    persist(next, `${PROFILE_SECTIONS.find((item) => item.id === section).label} saved.`)
  }

  const onPhotoChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const problem = validatePhoto(file)
    if (problem) {
      setErrors((current) => ({ ...current, photo: problem }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setErrors((current) => ({ ...current, photo: '' }))
      setField('photo', String(reader.result))
    }
    reader.readAsDataURL(file)
  }

  const saveCredential = () => {
    const found = validateCredential(editingCredential)
    setErrors(found)
    if (Object.keys(found).length) return
    const list = stored.credentials
    const record = { ...editingCredential, verificationStatus: editingCredential.verificationStatus || 'Pending' }
    const exists = list.some((item) => item.id === record.id)
    const credentials = exists ? list.map((item) => (item.id === record.id ? { ...record, verificationStatus: 'Pending' } : item)) : [...list, record]
    if (persist({ ...stored, credentials }, exists ? 'Credential updated.' : 'Credential added.')) setEditingCredential(null)
  }
  const deleteCredential = (id) => {
    if (!window.confirm('Delete this credential?')) return
    persist({ ...stored, credentials: stored.credentials.filter((item) => item.id !== id) }, 'Credential deleted.')
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(stored)
  const sectionMeta = PROFILE_SECTIONS.find((item) => item.id === section)
  const initials = (shown.displayName || currentUser?.name || 'A').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  const actionsBar = section !== 'availability' && section !== 'credentials' && (
    <div className="mp-actions">
      <button type="button" className="account-btn account-btn--outline" onClick={cancel} disabled={!dirty}><X size={15} /> Cancel</button>
      <button type="button" className="account-btn account-btn--primary" onClick={saveSection}><Save size={15} /> Save Changes</button>
    </div>
  )

  const renderSection = () => {
    if (section === 'basic') {
      return (
        <>
          <div className="mp-photo">
            <div className="mp-photo__frame">
              <span className="mp-photo__avatar">{shown.photo ? <img src={shown.photo} alt="Profile" /> : initials}</span>
              <button type="button" className="mp-photo__camera" aria-label="Change photo" onClick={() => photoInput.current?.click()}><Camera size={14} /></button>
            </div>
            <div className="mp-photo__info">
              <strong>Profile Photo</strong>
              <small>JPG / PNG · Max size 2MB</small>
              <div className="mp-photo__buttons">
                <button type="button" className="account-btn account-btn--primary" onClick={() => photoInput.current?.click()}><Camera size={15} /> {shown.photo ? 'Change Photo' : 'Upload Photo'}</button>
                {shown.photo && <button type="button" className="account-btn account-btn--outline" onClick={() => setField('photo', '')}><Trash2 size={15} /> Remove</button>}
              </div>
              <FieldError message={errors.photo} />
              <input ref={photoInput} type="file" accept="image/jpeg,image/png" hidden onChange={onPhotoChange} />
            </div>
          </div>
          <div className="account-form-grid">
            <TextField icon={UserRound} label="Name" required value={shown.fullName} error={errors.fullName} onChange={(e) => setField('fullName', e.target.value)} placeholder="Full legal / professional name" />
            <TextField icon={Sparkles} label="Display Name" required value={shown.displayName} error={errors.displayName} onChange={(e) => setField('displayName', e.target.value)} placeholder="Name shown to users" />
            <TextField icon={Phone} label="Phone Number" type="tel" value={shown.phone} error={errors.phone} onChange={(e) => setField('phone', e.target.value)} />
            <TextField icon={Mail} label="Email" type="email" value={shown.email} error={errors.email} onChange={(e) => setField('email', e.target.value)} />
            <TextField icon={UserRound} label="Gender">
              <select value={shown.gender} onChange={(e) => setField('gender', e.target.value)}>
                <option value="">Select gender</option>
                {GENDERS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </TextField>
            <TextField icon={CalendarDays} label="Date of Birth" type="date" value={shown.dob} error={errors.dob} onChange={(e) => setField('dob', e.target.value)} />
          </div>
          <h3 className="mp-subtitle">Location</h3>
          <div className="account-form-grid account-form-grid--three">
            <TextField icon={MapPin} label="City" value={shown.city} onChange={(e) => setField('city', e.target.value)} />
            <TextField icon={MapPin} label="State" value={shown.state} onChange={(e) => setField('state', e.target.value)} />
            <TextField icon={Globe2} label="Country" value={shown.country} onChange={(e) => setField('country', e.target.value)} />
          </div>
        </>
      )
    }
    if (section === 'experience') {
      return (
        <>
          <div className="account-form-grid">
            <TextField label="Years of Experience" required type="number" min="0" value={shown.yearsOfExperience} error={errors.yearsOfExperience} onChange={(e) => setField('yearsOfExperience', e.target.value)} />
            <TextField label="Primary Astrology System" required error={errors.primarySystem}>
              <select value={shown.primarySystem} onChange={(e) => setField('primarySystem', e.target.value)}>
                <option value="">Select a system</option>
                {ASTROLOGY_SYSTEMS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </TextField>
          </div>
          <h3 className="mp-subtitle">Areas of Expertise *</h3>
          <ChipGroup label="Areas of expertise" options={EXPERTISE_OPTIONS} selected={shown.expertise} onToggle={(value) => toggleIn('expertise', value)} />
          <FieldError message={errors.expertise} />
        </>
      )
    }
    if (section === 'languages') {
      return (
        <>
          <h3 className="mp-subtitle">Languages you can communicate in *</h3>
          <ChipGroup
            label="Languages"
            options={LANGUAGE_OPTIONS}
            selected={shown.languages}
            onToggle={(value) => {
              toggleIn('languages', value)
              if (shown.primaryLanguage === value) setField('primaryLanguage', '')
            }}
          />
          <FieldError message={errors.languages} />
          {shown.languages.length > 0 && (
            <>
              <h3 className="mp-subtitle">Primary Language</h3>
              <div className="mp-radios" role="radiogroup" aria-label="Primary language">
                {shown.languages.map((language) => (
                  <label key={language} className={`mp-radio${shown.primaryLanguage === language ? ' is-active' : ''}`}>
                    <input type="radio" name="primaryLanguage" checked={shown.primaryLanguage === language} onChange={() => setField('primaryLanguage', language)} />
                    {language}
                  </label>
                ))}
              </div>
              <FieldError message={errors.primaryLanguage} />
            </>
          )}
        </>
      )
    }
    if (section === 'services') {
      return (
        <div className="mp-service-list">
          {SERVICE_DEFINITIONS.map(({ key, label, unit }) => {
            const service = shown.services[key]
            return (
              <div className="mp-service" key={key}>
                <label className="account-toggle">
                  <span><strong>{label}</strong><small>{service.enabled ? (service.price ? `₹${service.price} / ${unit}` : 'Set a price in Pricing') : 'Disabled'}</small></span>
                  <input type="checkbox" checked={Boolean(service.enabled)} onChange={(e) => setService(key, { enabled: e.target.checked })} />
                  <i />
                </label>
                {service.enabled && (
                  <TextField label="Duration (minutes)" type="number" min="1" value={service.duration} error={errors[`${key}.duration`]} onChange={(e) => setService(key, { duration: e.target.value })} placeholder="Optional" />
                )}
              </div>
            )
          })}
        </div>
      )
    }
    if (section === 'pricing') {
      return (
        <>
          <p className="mp-note">Pricing changes may require admin approval before becoming publicly visible.</p>
          <div className="account-form-grid">
            {PRICING_FIELDS.map(({ key, label, suffix }) => (
              <TextField key={key} label={`${label} (₹, ${suffix})`} type="number" min="0" value={shown.services[key].price} error={errors[`${key}.price`]} onChange={(e) => setService(key, { price: e.target.value })} />
            ))}
            <TextField label="Currency" value="INR" readOnly disabled />
          </div>
        </>
      )
    }
    if (section === 'credentials') {
      const form = editingCredential
      return (
        <>
          {stored.credentials.length === 0 && !form && <p className="mp-empty">No credentials added yet.</p>}
          <div className="mp-credentials">
            {stored.credentials.map((item) => (
              <div className="mp-credential" key={item.id}>
                <span className="mp-credential__icon"><Award size={18} /></span>
                <div className="mp-credential__body">
                  <strong>{item.name}</strong>
                  <small>{[item.institution, item.year].filter(Boolean).join(' · ')}</small>
                  {item.number && <small>Certificate no. {item.number}</small>}
                  {item.document && <small>Document: {item.document} (private)</small>}
                </div>
                <b className={`account-status account-status--${item.verificationStatus === 'Verified' ? 'success' : item.verificationStatus === 'Rejected' ? 'danger' : 'pending'}`}>{item.verificationStatus}</b>
                <button type="button" className="icon-btn" aria-label={`Edit ${item.name}`} onClick={() => { setErrors({}); setEditingCredential({ ...item }) }}><Pencil size={15} /></button>
                <button type="button" className="icon-btn danger" aria-label={`Delete ${item.name}`} onClick={() => deleteCredential(item.id)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          {form ? (
            <div className="mp-credential-form">
              <h3 className="mp-subtitle">{stored.credentials.some((item) => item.id === form.id) ? 'Edit Credential' : 'Add Credential'}</h3>
              <div className="account-form-grid">
                <TextField label="Certification Name" required value={form.name} error={errors.name} onChange={(e) => setEditingCredential({ ...form, name: e.target.value })} placeholder="e.g. Vedic Astrology Course" />
                <TextField label="Institution / Organization" required value={form.institution} error={errors.institution} onChange={(e) => setEditingCredential({ ...form, institution: e.target.value })} />
                <TextField label="Year" type="number" value={form.year} error={errors.year} onChange={(e) => setEditingCredential({ ...form, year: e.target.value })} />
                <TextField label="Certificate Number" value={form.number} onChange={(e) => setEditingCredential({ ...form, number: e.target.value })} />
                <TextField label="Certificate Document">
                  <input type="file" accept=".pdf,image/jpeg,image/png" onChange={(e) => setEditingCredential({ ...form, document: e.target.files?.[0]?.name || form.document })} />
                </TextField>
              </div>
              <p className="mp-note">Uploaded documents stay private and are only shown publicly after platform approval.</p>
              <div className="mp-actions">
                <button type="button" className="account-btn account-btn--ghost" onClick={() => { setEditingCredential(null); setErrors({}) }}>Cancel</button>
                <button type="button" className="account-btn account-btn--primary" onClick={saveCredential}>Save Credential</button>
              </div>
            </div>
          ) : (
            <button type="button" className="account-btn account-btn--outline" onClick={() => { setErrors({}); setEditingCredential({ id: crypto.randomUUID(), name: '', institution: '', year: '', number: '', document: '' }) }}>
              <Plus size={15} /> Add Credential
            </button>
          )}
        </>
      )
    }
    if (section === 'about') {
      return (
        <>
          <TextField label="Professional Tagline" value={shown.tagline} onChange={(e) => setField('tagline', e.target.value)} placeholder="Helping you understand life's path through Vedic astrology." maxLength={120} />
          <TextField label="Professional Bio" error={errors.bio}>
            <textarea rows="7" value={shown.bio} onChange={(e) => setField('bio', e.target.value)} placeholder="Tell users about your astrology experience, consultation style, areas of expertise and approach." />
          </TextField>
          <small className={`mp-counter${shown.bio.length > BIO_LIMIT ? ' is-over' : ''}`}>{shown.bio.length} / {BIO_LIMIT}</small>
          <h3 className="mp-subtitle">Consultation Style</h3>
          <ChipGroup label="Consultation style" options={CONSULTATION_STYLES} selected={shown.consultationStyle} onToggle={(value) => toggleIn('consultationStyle', value)} />
        </>
      )
    }
    return (
      <>
        <div className="mp-service-list">
          <label className="account-toggle">
            <span><strong>Accepting Consultations</strong><small>Turn off to pause new chat and call requests (Do not disturb).</small></span>
            <input type="checkbox" checked={!astrologerServices.dndEnabled} onChange={(e) => actions.updateAstrologerServices({ dndEnabled: !e.target.checked })} />
            <i />
          </label>
          <label className="account-toggle">
            <span><strong>Online</strong><small>{astrologerServices.isOnline ? 'You appear online to users.' : 'You appear offline to users.'}</small></span>
            <input type="checkbox" checked={astrologerServices.isOnline} onChange={(e) => actions.setAstrologerPresence(e.target.checked)} />
            <i />
          </label>
        </div>
        <div className="mp-link-card">
          <div>
            <strong>Weekly schedule &amp; time slots</strong>
            <small>{hasAvailability ? 'Your appointment availability is configured.' : 'No appointment availability published yet.'} Day-wise slots are managed in Appointments → Schedule.</small>
          </div>
          <button type="button" className="account-btn account-btn--outline" onClick={() => navigate(routes.appointmentSchedule)}>Manage Schedule <ChevronRight size={15} /></button>
        </div>
      </>
    )
  }

  return (
    <div className="mp-page">
      <PageHeader className="mp-hero-header" eyebrow="Astrologer Workspace" title="My Profile" subtitle="Manage your professional identity and how you appear to users." actions={(
        <figure className="mp-quote">
          <Quote size={16} aria-hidden="true" />
          <blockquote>The stars incline, they do not compel.</blockquote>
          <figcaption>Guide with wisdom, advise with care.</figcaption>
        </figure>
      )} />

      <section className="account-panel mp-completion" aria-label="Profile completion">
        <div className="mp-completion__main">
          <CircularProgress percent={completion.percent} />
          <div className="mp-completion__text">
            <div className="mp-completion__title">
              <strong>Profile Completion</strong>
              <b className={`account-status account-status--${stored.status === 'Approved' ? 'success' : stored.status === 'Rejected' ? 'danger' : 'pending'}`}>{stored.status}</b>
            </div>
            <small>Complete your profile to attract more users and build trust.</small>
            <div className="mp-progress"><span style={{ width: `${completion.percent}%` }} /></div>
          </div>
        </div>
      </section>

      <div className="mp-layout">
        <nav className="mp-tabs" aria-label="Profile sections">
          {PROFILE_SECTIONS.map(({ id, label }) => (
            <button type="button" key={id} className={`mp-tabs__item${section === id ? ' is-active' : ''}`} aria-current={section === id ? 'page' : undefined} onClick={() => selectSection(id)}>
              {label}
              {incomplete[id] && <><span className="mp-tabs__dot" aria-hidden="true" /><span className="mp-sr-only"> (incomplete)</span></>}
            </button>
          ))}
        </nav>

        <section className="account-panel mp-content" aria-labelledby="mp-section-title">
          <Mandala className="mp-content__mandala" />
          <div className="account-panel-heading">
            <div>
              <h2 id="mp-section-title">{sectionMeta.label}</h2>
              <p>{SECTION_DESCRIPTIONS[section]}</p>
            </div>
          </div>
          {renderSection()}
          {actionsBar}
        </section>
      </div>

      {toast && <div className={`account-toast${toast.kind === 'error' ? ' mp-toast--error' : ''}`} role="status"><Check size={17} /> {toast.text}</div>}
    </div>
  )
}
