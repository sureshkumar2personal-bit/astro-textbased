import { CalendarDays, Check, Headphones, Mail, MessageCircle, Pencil, Phone, PhoneCall, UserRound, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  const [accountTab, setAccountTab] = useState('personal')
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

  return <div className="my-account-page">
    <PageHeader eyebrow="User portal" title="My Account" subtitle="Manage your profile, personal details, and consultation history." />
    <Card className="my-account-profile-card"><div className="my-account-avatar">{initials(currentUser?.name)}</div><div className="my-account-profile-copy"><h2>{currentUser?.name || 'User'}</h2><p>@{(currentUser?.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}</p><div className="my-account-contact"><span><Phone size={14} /> {currentUser?.phone || 'Mobile not added'}</span><span><Mail size={14} /> {currentUser?.email || 'Email not added'}</span></div></div><div className="my-account-profile-actions"><button type="button" className="btn btn-outline" onClick={() => setPreferencesOpen(true)}>Preferences</button><button type="button" className="btn btn-outline" onClick={() => setEditing(true)}><Pencil size={15} /> Edit Profile</button></div></Card>
    {preferencesOpen && <div className="preferences-overlay" role="dialog" aria-modal="true" aria-labelledby="preferences-heading"><Card className="preferences-dialog"><div className="preferences-dialog-header"><div><div className="page-eyebrow">Astrologer matching</div><h2 id="preferences-heading">Your Preferences</h2><p className="muted">Tell us what kind of guidance you are looking for.</p></div><button type="button" className="icon-btn" aria-label="Close preferences" onClick={() => setPreferencesOpen(false)}><X size={17} /></button></div>{Object.entries({ languages: PREFERENCE_OPTIONS.languages, astrologerTypes: PREFERENCE_OPTIONS.methods, consultationTitles: PREFERENCE_OPTIONS.topics }).map(([group, options]) => <fieldset className="preferences-group" key={group}><legend>{group === 'languages' ? 'Preferred Language' : group === 'astrologerTypes' ? 'Astrologer Type' : 'Consultation Title'} <span>*</span></legend><div className="preferences-options">{options.map((option) => <button type="button" key={option} className={preferences[group].includes(option) ? 'preference-option is-selected' : 'preference-option'} onClick={() => togglePreference(group, option)}>{option}</button>)}</div></fieldset>)}{preferencesError && <p className="preferences-error">{preferencesError}</p>}<div className="preferences-dialog-actions"><button type="button" className="btn btn-ghost" onClick={() => setPreferencesOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={savePreferences}>Save Preferences</button></div></Card></div>}
    {editing && <Card className="my-account-edit-card"><div className="form-grid"><label>Name<input className="text-input" value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input className="text-input" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div><div className="my-account-actions"><button type="button" className="btn btn-primary" onClick={saveProfile}>Save Changes</button><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div></Card>}
    <div className="my-account-section-tabs" role="tablist"><button type="button" role="tab" aria-selected={accountTab === 'personal'} className={accountTab === 'personal' ? 'is-active' : ''} onClick={() => setAccountTab('personal')}><UserRound size={16} /> Personal Details</button><button type="button" role="tab" aria-selected={accountTab === 'consultation'} className={accountTab === 'consultation' ? 'is-active' : ''} onClick={() => setAccountTab('consultation')}><MessageCircle size={16} /> Consultation</button></div>
    {accountTab === 'personal' ? <Card className="my-account-details-card"><div className="my-account-section-heading"><div className="section-title">Personal Information</div><button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingDetails((value) => !value)}>{editingDetails ? 'Save Changes' : 'Edit Profile'}</button></div><div className="my-account-detail-grid">{[['fullName', 'Full Name'], ['dob', 'Date of Birth'], ['birthTime', 'Time of Birth'], ['birthPlace', 'Place of Birth'], ['gender', 'Gender'], ['language', 'Language Preference']].map(([key, label]) => <label className="my-account-form-field" key={key}><span>{label}</span>{editingDetails ? <input className="text-input" value={personalDetails[key]} onChange={(event) => setPersonalDetails((details) => ({ ...details, [key]: event.target.value }))} /> : <strong>{personalDetails[key]}</strong>}</label>)}</div><div className="my-account-astrology-heading"><div><div className="section-title">Astrology Details</div><p className="muted">Your saved horoscope information</p></div><button type="button" className="btn btn-outline btn-sm"><Pencil size={14} /> Edit Horoscope</button></div><div className="my-account-detail-grid">{[['Rashi', 'Karka (Cancer)'], ['Nakshatra', 'Pushya'], ['Lagna', 'Mithuna (Gemini)'], ['Saved Horoscope / Kundli', 'Saved']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}{label.includes('Saved') && <Check size={15} className="my-account-saved-icon" />}</strong></div>)}</div></Card> : <ConsultationHistorySection appointments={appointments} history={history} routes={routes} actions={actions} astrologerName={astrologerName} />}
  </div>
}

function ConsultationHistorySection({ appointments, history, routes, actions, astrologerName }) {
  const [tab, setTab] = useState('calls')
  const [selectedChatId, setSelectedChatId] = useState(null)
  const calls = history.filter((item) => item.type === 'Audio Call')
  const chats = history.filter((item) => item.type === 'Chat')
  const selectedChat = chats.find((item) => item.id === selectedChatId)
  const tabs = [['calls', 'Call History'], ['chats', 'Chat History'], ['appointments', 'Appointment History']]

  return <section className="my-account-consultation-history"><div className="my-account-consultation-heading"><div><div className="section-title">Consultation History</div><p className="muted">View your previous calls, chats, and appointments.</p></div></div><div className="my-account-consultation-tabs" role="tablist">{tabs.map(([value, label]) => <button type="button" role="tab" aria-selected={tab === value} className={tab === value ? 'is-active' : ''} key={value} onClick={() => { setTab(value); if (value !== 'chats') setSelectedChatId(null) }}>{label}</button>)}</div>{tab === 'calls' && <div className="my-account-history-list">{calls.map((item) => <Card key={item.id} className="my-account-history-card"><HistoryRecord item={item} title={astrologerName(item.astrologerId)} type="Audio Call" icon={<Headphones size={14} />} /></Card>)}{!calls.length && <HistoryEmpty message="No call history yet." detail="Your completed calls will appear here." />}</div>}{tab === 'chats' && (selectedChat ? <InlineChatHistory item={selectedChat} astrologerName={astrologerName(selectedChat.astrologerId)} specialization={mockAstrologers.find((astrologer) => astrologer.id === selectedChat.astrologerId)?.specialization || 'Vedic Astrology'} onBack={() => setSelectedChatId(null)} /> : <div className="my-account-history-list">{chats.map((item) => <Card key={item.id} className="my-account-history-card my-account-chat-record" role="button" tabIndex="0" onClick={() => setSelectedChatId(item.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedChatId(item.id) } }}><HistoryRecord item={item} title={astrologerName(item.astrologerId)} type="Chat consultation" icon={<MessageCircle size={14} />} /></Card>)}{!chats.length && <HistoryEmpty message="No chat history yet." />}</div>)}{tab === 'appointments' && <div className="my-account-history-list">{appointments.map((appointment) => <AppointmentHistoryRecord key={appointment.id} appointment={appointment} routes={routes} actions={actions} />)}{!appointments.length && <HistoryEmpty message="No appointment history yet." />}</div>}</section>
}

function AppointmentHistoryRecord({ appointment, routes, actions }) {
  const canCancel = ['Pending', 'Confirmed', 'Rescheduled', 'Analysed'].includes(appointment.status)
  const canJoin = appointment.status === 'Confirmed'
  return <Card className="my-account-history-card"><div className="my-account-history-top"><div><h3>{appointment.astrologer}</h3><span>{appointment.specialization || 'Vedic Astrology'}</span></div><StatusBadge label={appointment.status || 'Pending'} /></div><div className="my-account-history-meta"><span><b>Date</b>{appointment.date}</span><span><b>Time</b>{appointment.time}</span><span><b>Type</b>{appointment.type}</span><span><b>Duration</b>{appointment.duration || '30 min'}</span><span><b>Amount</b>{formatAmount(appointment.price || 499)}</span><span><b>Booking ID</b>{appointment.id}</span></div><div className="my-account-card-actions"><Link to={`${routes.appointmentDetails}?id=${appointment.id}`} className="btn btn-outline">View Appointment</Link>{canJoin && <Link to={`${routes.appointmentDetails}?id=${appointment.id}`} className="btn btn-primary"><PhoneCall size={15} /> Receive Call</Link>}{canCancel && <button type="button" className="btn btn-ghost" onClick={() => actions.cancelAppointment(appointment.id, appointment)}>Cancel Appointment</button>}</div></Card>
}

function HistoryEmpty({ message, detail }) {
  return <div className="my-account-history-empty"><strong>{message}</strong>{detail && <span>{detail}</span>}</div>
}

function HistoryRecord({ item, title, type, icon, action }) {
  return <><div className="my-account-history-top"><div><h3>{title}</h3><span>{icon} {type}</span></div><StatusBadge label={item.status} /></div><div className="my-account-history-meta"><span><b>Date</b>{formatDate(item.startedAt)}</span><span><b>Time</b>{formatTime(item.startedAt)}</span><span><b>Duration</b>{item.durationMinutes} min</span><span><b>Spend Amount</b><strong>{formatAmount(item.amount)}</strong></span></div>{action && <button type="button" className="btn btn-outline btn-sm my-account-chat-action">{action}</button>}</>
}

function InlineChatHistory({ item, astrologerName, specialization, onBack }) {
  const messages = item.messages || []
  return <div className="my-account-inline-chat"><div className="my-account-inline-chat-header"><div><button type="button" className="my-account-chat-back" onClick={onBack}><span aria-hidden="true">←</span> Back to Chat History</button><h3>{astrologerName}</h3><p>{specialization}</p></div><StatusBadge label={item.status} /></div><div className="my-account-chat-session-summary"><strong>Chat Consultation</strong><span>{astrologerName} · {specialization}</span><span>{formatDate(item.startedAt)} · {formatTime(item.startedAt)}</span><span>Duration: {item.durationMinutes} min · Amount: {formatAmount(item.amount)}</span><small>Chat History · Read Only</small></div><div className="my-account-inline-chat-messages">{messages.length ? messages.map((message) => <div key={message.id} className={`my-account-inline-message my-account-inline-message--${message.sender}`}><p>{message.text}</p><time>{formatTime(message.sentAt)}</time></div>) : <p className="my-account-chat-empty">No conversation messages available.</p>}</div></div>
}
