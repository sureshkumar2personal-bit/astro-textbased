import { CalendarDays, Check, Headphones, Mail, MessageCircle, Pencil, Phone, PhoneCall, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { mockAstrologers } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const formatTime = (value) => new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
const formatAmount = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const initials = (name = 'User') => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
const PREFERENCE_OPTIONS = {
  languages: ['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'],
  methods: ['Vedic Astrology', 'Tarot Reading', 'Numerology', 'Vastu Shastra', 'Nadi Astrology', 'Western Astrology', 'KP Astrology', 'Palmistry', 'Crystal Healing'],
  topics: ['Marriage', 'Career', 'Business', 'Child', 'Finance', 'Relationships', 'Health', 'Education', 'Timing', 'Family', 'Life Changes', 'Wellbeing'],
}

export default function MyAccount() {
  const { currentUser, updateProfile } = useAuth()
  const { appointments, consultationHistory, actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const [searchParams] = useSearchParams()
  const section = 'personal'
  const [consultationTab, setConsultationTab] = useState(searchParams.get('tab') || 'appointment')
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [personalDetails, setPersonalDetails] = useState({ fullName: currentUser?.name || 'Priya V.', dob: '12 March 1995', birthTime: '08:30 AM', birthPlace: 'Chennai, India', gender: 'Female', language: 'English, Tamil' })
  const [name, setName] = useState(currentUser?.name || '')
  const [email, setEmail] = useState(currentUser?.email || '')
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [preferences, setPreferences] = useState({ languages: currentUser?.astrologerPreferences?.languages || [], astrologerTypes: currentUser?.astrologerPreferences?.astrologerTypes || currentUser?.astrologerPreferences?.methods || [], consultationTitles: currentUser?.astrologerPreferences?.consultationTitles || currentUser?.astrologerPreferences?.topics || [] })
  const [preferencesError, setPreferencesError] = useState('')
  const userHistory = useMemo(() => consultationHistory.filter((item) => item.customerId === currentUser?.id || (currentUser?.id === 'user-demo' && item.customerId === 'customer-priya')), [consultationHistory, currentUser?.id])
  const history = userHistory.length ? userHistory : consultationHistory.filter((item) => item.customerId === 'user-demo' || item.customerId === 'customer-priya')
  const chatHistory = history.filter((item) => item.type === 'Chat')
  const activeChat = chatHistory.find((item) => item.id === selectedChatId)
  const astrologerName = (id) => mockAstrologers.find((item) => item.id === id)?.name || 'Astrologer'
  const saveProfile = () => { updateProfile({ name, email }); setEditing(false) }
  const togglePreference = (group, value) => setPreferences((current) => ({ ...current, [group]: current[group].includes(value) ? current[group].filter((item) => item !== value) : [...current[group], value] }))
  const savePreferences = () => {
    const missing = Object.entries(preferences).find(([, values]) => !values.length)
    if (missing) { setPreferencesError(`Select at least one ${missing[0].replace('methods', 'astrologer type').replace('topics', 'consultation topic').replace('languages', 'language')}.`); return }
    updateProfile({ name: currentUser?.name, email: currentUser?.email, phone: currentUser?.phone, specialization: currentUser?.specialization, experience: currentUser?.experience, astrologerPreferencesEnabled: true, astrologerPreferences: { ...preferences, methods: preferences.astrologerTypes, topics: preferences.consultationTitles } })
    setPreferencesError('')
    setPreferencesOpen(false)
  }

  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    const closeOnEscape = (event) => { if (event.key === 'Escape') closeMenu() }
    document.addEventListener('click', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('click', closeMenu); document.removeEventListener('keydown', closeOnEscape) }
  }, [])

  const openContextMenu = (event, item) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({ id: item.id, x: Math.min(event.clientX, window.innerWidth - 170), y: Math.min(event.clientY, window.innerHeight - 60) })
  }
  const selectTab = (tab) => { setConsultationTab(tab); setSelectedChatId(null); setContextMenu(null) }

  return <div className="my-account-page">
    <PageHeader eyebrow="User portal" title="My Account" subtitle="Manage your profile, personal details, and consultation history." />
    <Card className="my-account-profile-card"><div className="my-account-avatar">{initials(currentUser?.name)}</div><div className="my-account-profile-copy"><h2>{currentUser?.name || 'User'}</h2><p>@{(currentUser?.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}</p><div className="my-account-contact"><span><Phone size={14} /> {currentUser?.phone || 'Mobile not added'}</span><span><Mail size={14} /> {currentUser?.email || 'Email not added'}</span></div></div><div className="my-account-profile-actions"><button type="button" className="btn btn-outline" onClick={() => setPreferencesOpen(true)}>Preferences</button><button type="button" className="btn btn-outline" onClick={() => setEditing(true)}><Pencil size={15} /> Edit Profile</button></div></Card>
    {preferencesOpen && <div className="preferences-overlay" role="dialog" aria-modal="true" aria-labelledby="preferences-heading"><Card className="preferences-dialog"><div className="preferences-dialog-header"><div><div className="page-eyebrow">Astrologer matching</div><h2 id="preferences-heading">Your Preferences</h2><p className="muted">Tell us what kind of guidance you are looking for.</p></div><button type="button" className="icon-btn" aria-label="Close preferences" onClick={() => setPreferencesOpen(false)}><X size={17} /></button></div>{Object.entries({ languages: PREFERENCE_OPTIONS.languages, astrologerTypes: PREFERENCE_OPTIONS.methods, consultationTitles: PREFERENCE_OPTIONS.topics }).map(([group, options]) => <fieldset className="preferences-group" key={group}><legend>{group === 'languages' ? 'Preferred Language' : group === 'astrologerTypes' ? 'Astrologer Type' : 'Consultation Title'} <span>*</span></legend><div className="preferences-options">{options.map((option) => <button type="button" key={option} className={preferences[group].includes(option) ? 'preference-option is-selected' : 'preference-option'} onClick={() => togglePreference(group, option)}>{option}</button>)}</div></fieldset>)}{preferencesError && <p className="preferences-error">{preferencesError}</p>}<div className="preferences-dialog-actions"><button type="button" className="btn btn-ghost" onClick={() => setPreferencesOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={savePreferences}>Save Preferences</button></div></Card></div>}
    {editing && <Card className="my-account-edit-card"><div className="form-grid"><label>Name<input className="text-input" value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input className="text-input" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div><div className="my-account-actions"><button type="button" className="btn btn-primary" onClick={saveProfile}>Save Changes</button><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div></Card>}
    <div className="my-account-section-tabs"><button type="button" className="is-active"><UserRound size={16} /> Personal Details</button></div>
    {section === 'personal' ? <Card className="my-account-details-card"><div className="my-account-section-heading"><div className="section-title">Personal Information</div><button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingDetails((value) => !value)}>{editingDetails ? 'Save Changes' : 'Edit Profile'}</button></div><div className="my-account-detail-grid">{[['fullName', 'Full Name'], ['dob', 'Date of Birth'], ['birthTime', 'Time of Birth'], ['birthPlace', 'Place of Birth'], ['gender', 'Gender'], ['language', 'Language Preference']].map(([key, label]) => <label className="my-account-form-field" key={key}><span>{label}</span>{editingDetails ? <input className="text-input" value={personalDetails[key]} onChange={(event) => setPersonalDetails((details) => ({ ...details, [key]: event.target.value }))} /> : <strong>{personalDetails[key]}</strong>}</label>)}</div><div className="my-account-astrology-heading"><div><div className="section-title">Astrology Details</div><p className="muted">Your saved horoscope information</p></div><button type="button" className="btn btn-outline btn-sm"><Pencil size={14} /> Edit Horoscope</button></div><div className="my-account-detail-grid">{[['Rashi', 'Karka (Cancer)'], ['Nakshatra', 'Pushya'], ['Lagna', 'Mithuna (Gemini)'], ['Saved Horoscope / Kundli', 'Saved']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}{label.includes('Saved') && <Check size={15} className="my-account-saved-icon" />}</strong></div>)}</div></Card> : <Card className="my-account-consultation-card"><div className="section-title">Consultation</div>
      {consultationTab === 'chat' && activeChat ? <InlineChatHistory item={activeChat} astrologerName={astrologerName(activeChat.astrologerId)} onBack={() => setSelectedChatId(null)} /> : consultationTab === 'appointment' ? <div className="my-account-history-list">{appointments.map((appointment) => { const canCancel = ['Confirmed', 'Rescheduled'].includes(appointment.status); const canJoin = appointment.status === 'Confirmed'; return <Card key={appointment.id} className="my-account-history-card"><div className="my-account-history-top"><div><h3>{appointment.astrologer}</h3><span>{appointment.type} · {appointment.duration || '30 min'}</span></div><StatusBadge label={appointment.status} /></div><div className="my-account-history-meta"><span><b>Date</b>{appointment.date}</span><span><b>Time</b>{appointment.time}</span><span><b>Status</b>{appointment.status}</span></div><div className="my-account-card-actions"><Link to={`${routes.appointmentDetails}?id=${appointment.id}`} className="btn btn-outline">Appointment Details</Link>{canJoin && <Link to={`${routes.appointmentDetails}?id=${appointment.id}`} className="btn btn-primary"><PhoneCall size={15} /> Join Audio Call</Link>}{canCancel && <button type="button" className="btn btn-ghost" onClick={() => actions.cancelAppointment(appointment.id, appointment)}>Cancel Appointment</button>}</div></Card> })}</div> : <div className="my-account-history-list">{history.filter((item) => item.type === 'Audio Call').map((item) => <Card key={item.id} className="my-account-history-card"><HistoryRecord item={item} title={astrologerName(item.astrologerId)} type="Audio call" icon={<Headphones size={14} />} action="Call Details" /></Card>)}{!history.some((item) => item.type === 'Audio Call') && <p className="muted">No call history yet.</p>}</div>}
      {consultationTab === 'chat' && !activeChat && <div className="my-account-history-list">{chatHistory.map((item) => <Card key={item.id} className="my-account-history-card my-account-chat-record" onContextMenu={(event) => openContextMenu(event, item)}><HistoryRecord item={item} title={astrologerName(item.astrologerId)} type="Chat consultation" icon={<MessageCircle size={14} />} /></Card>)}{!chatHistory.length && <p className="muted">No chat history yet.</p>}</div>}
    </Card>}
    {contextMenu && <div className="my-account-history-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => { setSelectedChatId(contextMenu.id); setContextMenu(null) }}><MessageCircle size={14} /> History</button></div>}
  </div>
}

function HistoryRecord({ item, title, type, icon, action }) {
  return <><div className="my-account-history-top"><div><h3>{title}</h3><span>{icon} {type}</span></div><StatusBadge label={item.status} /></div><div className="my-account-history-meta"><span><b>Date</b>{formatDate(item.startedAt)}</span><span><b>Time</b>{formatTime(item.startedAt)}</span><span><b>Duration</b>{item.durationMinutes} min</span><span><b>Spend Amount</b><strong>{formatAmount(item.amount)}</strong></span></div>{action && <button type="button" className="btn btn-outline btn-sm my-account-chat-action">{action}</button>}</>
}

function InlineChatHistory({ item, astrologerName, onBack }) {
  return <div className="my-account-inline-chat"><div className="my-account-inline-chat-header"><div><h3>{astrologerName}</h3><p><MessageCircle size={14} /> Chat History · {formatDate(item.startedAt)} · {item.durationMinutes} min · {formatAmount(item.amount)}</p></div><button type="button" className="btn btn-outline btn-sm" onClick={onBack}><X size={14} /> Back to Chat History</button></div><div className="my-account-inline-chat-messages">{(item.messages || []).map((message) => <div key={message.id} className={`my-account-inline-message my-account-inline-message--${message.sender}`}><p>{message.text}</p><time>{formatTime(message.sentAt)}</time></div>)}</div></div>
}
