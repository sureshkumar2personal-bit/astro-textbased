import { ArrowLeft, BadgeCheck, CalendarDays, CalendarPlus, Clock3, Grid3X3, Headphones, Info, Mail, MapPin, MessageCircle, Phone, PhoneCall, Radio, UserCircle2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import { PROFILE_FOLLOWERS, PROFILE_SUBSCRIBERS, accountHandle } from '../data/audienceMembers.js'
import { mockAstrologers, mockLiveSessions } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes, ROLES } from '../utils/roleRoutes.js'

function initials(name) {
  return name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'U'
}

export default function Profile() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, updateProfile } = useAuth()
  const { subscriptions, appointments, consultationHistory, actions, astrologerServices } = useAppData()
  const isAstrologer = currentUser?.role === ROLES.ASTROLOGER
  const routes = getRoleRoutes(currentUser?.role)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState(isAstrologer ? 'Services' : 'Posts')
  const [audiencePanel, setAudiencePanel] = useState(null)
  const [form, setForm] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', phone: currentUser?.phone || '', specialization: currentUser?.specialization || '', experience: currentUser?.experience || '' })
  const [servicesForm, setServicesForm] = useState(astrologerServices)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [consultationTab, setConsultationTab] = useState('appointments')
  const [selectedConsultationAstrologerId, setSelectedConsultationAstrologerId] = useState(null)

  const name = currentUser?.name || (isAstrologer ? 'Astrologer' : 'User')
  const username = name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'profile'
  const bio = isAstrologer
    ? `${currentUser?.specialization || 'Astrology guidance'} · ${currentUser?.experience || 'Experienced astrologer'}\nHelping you find clarity through thoughtful guidance.`
    : 'Astro Connect member\nAsk questions, explore astrologers, and follow your journey with clarity.'
  const liveSessions = useMemo(() => mockLiveSessions.filter((session) => !isAstrologer || session.astrologerId === 'astrologer-demo'), [isAstrologer])
  const astrologerProfile = mockAstrologers.find((profile) => profile.id === currentUser?.id) || mockAstrologers[0]
  const liveSubscriberEntries = subscriptions
    .filter((subscription) => subscription.astrologerId === currentUser?.id || (isAstrologer && subscription.astrologerId === astrologerProfile.id))
    .map((subscription) => ({
      id: subscription.userId,
      name: subscription.userName || subscription.userId || 'Subscriber',
      username: accountHandle({ username: subscription.userUsername, id: subscription.userId }),
      bio: 'Astro Connect subscriber following astrology guidance and live sessions.',
      tier: subscription.tier || 'Silver',
    }))
  const subscriberEntries = [...new Map([...PROFILE_SUBSCRIBERS, ...liveSubscriberEntries].map((subscriber) => [subscriber.id, subscriber])).values()]
  const subscriberNames = subscriberEntries.map((subscriber) => subscriber.name)
  const audienceEntries = audiencePanel === 'Followers'
    ? PROFILE_FOLLOWERS
    : subscriberEntries
  const appointmentHistory = isAstrologer ? [] : appointments
  const userConsultationHistory = useMemo(() => {
    if (isAstrologer) return []
    const ownedSessions = consultationHistory.filter((session) => session.customerId === currentUser?.id || (currentUser?.id === 'user-demo' && session.customerId === 'customer-priya'))
    if (ownedSessions.length) return ownedSessions
    return consultationHistory.filter((session) => session.customerId === 'user-demo' || session.customerId === 'customer-priya')
  }, [consultationHistory, currentUser?.id, isAstrologer])
  const filteredConsultationHistory = userConsultationHistory.filter((session) => consultationTab === 'chat' ? session.type === 'Chat' : consultationTab === 'call' ? session.type === 'Audio Call' : false)
  const consultationAstrologers = [...new Map(filteredConsultationHistory.map((session) => [session.astrologerId, session.astrologerId])).values()].map((astrologerId) => {
    const astrologerSessions = filteredConsultationHistory.filter((session) => session.astrologerId === astrologerId)
    const astrologer = mockAstrologers.find((item) => item.id === astrologerId)
    return { id: astrologerId, name: astrologer?.name || 'Astrologer', sessions: astrologerSessions, latest: astrologerSessions.reduce((latest, session) => new Date(session.startedAt) > new Date(latest) ? session.startedAt : latest, astrologerSessions[0]?.startedAt) }
  })
  const selectedConsultationAstrologer = consultationAstrologers.find((item) => item.id === selectedConsultationAstrologerId) || null
  const cancellableAppointmentStatuses = ['Pending', 'Confirmed', 'Rescheduled']
  const closeAudience = () => {
    setAudiencePanel(null)
    navigate('/astrologer/profile', { replace: true })
  }
  const openAudience = (panel) => {
    setAudiencePanel(panel)
    navigate(`/astrologer/profile?audience=${panel}`, { replace: true })
  }

  useEffect(() => {
    const audience = new URLSearchParams(location.search).get('audience')
    if (isAstrologer && (audience === 'Followers' || audience === 'Subscribers')) setAudiencePanel(audience)
  }, [isAstrologer, location.search])

  const startEditing = () => {
    setForm({ name: currentUser?.name || '', email: currentUser?.email || '', phone: currentUser?.phone || '', specialization: currentUser?.specialization || '', experience: currentUser?.experience || '' })
    setError('')
    setSaved(false)
    setServicesForm(astrologerServices)
    setEditing(true)
  }

  const handleSave = () => {
    try {
      if (servicesForm.callPricePerMinute < 0 || servicesForm.chatPricePerMinute < 0) {
        throw new Error('Service prices must be zero or greater.')
      }
      updateProfile(form)
      if (isAstrologer) actions.updateAstrologerServices({
        callPricePerMinute: servicesForm.callPricePerMinute,
        chatPricePerMinute: servicesForm.chatPricePerMinute,
      })
      setEditing(false)
      setSaved(true)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update your profile.')
    }
  }

  return (
    <div>
      {editing ? (
        <Card className="profile-edit-card">
          <div className="profile-edit-card__heading"><UserCircle2 size={20} /><div><h2>Edit Profile</h2><p>Update the details shown on your profile.</p></div></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Name</span><input className="text-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Email Address</span><input type="email" className="text-input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Phone Number</span><input type="tel" className="text-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            {isAstrologer && <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Specialization</span><input className="text-input" value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} /></label>}
            {isAstrologer && <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Experience</span><input className="text-input" value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} placeholder="8 years" /></label>}
          </div>
          {isAstrologer && (
            <div className="profile-services-editor">
              <div className="profile-edit-card__heading"><PhoneCall size={20} /><div><h2>Service Pricing</h2><p>Set separate per-minute prices for calls and chats. Availability controls are in Profile → Services.</p></div></div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2" style={{ marginTop: 16 }}>
                <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Call price per minute (₹)</span><input type="number" min="0" className="text-input" value={servicesForm.callPricePerMinute} onChange={(event) => setServicesForm({ ...servicesForm, callPricePerMinute: Number(event.target.value) })} /></label>
                <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Chat price per minute (₹)</span><input type="number" min="0" className="text-input" value={servicesForm.chatPricePerMinute} onChange={(event) => setServicesForm({ ...servicesForm, chatPricePerMinute: Number(event.target.value) })} /></label>
              </div>
            </div>
          )}
          {error && <div className="profile-message profile-message--error">{error}</div>}
          <div className="profile-edit-actions"><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleSave}>Save Changes</button></div>
        </Card>
      ) : (
        <div className="section social-profile social-profile--account">
          <Card className="social-profile__header">
            <div className="social-profile__cover" />
            <div className="social-profile__identity">
              <div className="social-profile__avatar">{initials(name)}</div>
              <div className="social-profile__identity-copy">
                <div className="flex flex-wrap items-center gap-2"><h1 className="social-profile__name">{name}</h1>{isAstrologer && <BadgeCheck size={18} className="text-[color:var(--primary)]" aria-label="Verified astrologer" />}</div>
                <div className="muted">@{username}</div>
                <div className="social-profile__meta"><MapPin size={14} /> India <span>·</span> {isAstrologer ? currentUser?.specialization || 'Astrologer' : 'Astro Connect member'}</div>
              </div>
              <div className="social-profile__actions"><button type="button" className="btn btn-primary" onClick={startEditing}>Edit Profile</button></div>
            </div>
            <div className="social-profile__stats">
              {!isAstrologer && <div><strong>0</strong><span>Posts</span></div>}
              {isAstrologer ? (
                <>
                  <button type="button" className="social-profile__stat-button" onClick={() => openAudience('Followers')}><strong>{astrologerProfile.followers.toLocaleString('en-IN')}</strong><span>Followers</span></button>
                  <button type="button" className="social-profile__stat-button" onClick={() => openAudience('Subscribers')}><strong>{subscriberNames.length}</strong><span>Subscribers</span></button>
                </>
              ) : (
                <><div><strong>0</strong><span>Followers</span></div><div><strong>0</strong><span>Following</span></div></>
              )}
              {isAstrologer && <div><strong>{currentUser?.experience || '—'}</strong><span>Experience</span></div>}
            </div>
            <div className="social-profile__bio">{bio}</div>
          </Card>

          {!isAstrologer && <Card className="profile-consultation-actions">
            <div className="section-title">Consultation</div>
            <div className="profile-consultation-actions__grid">
              <button type="button" className={`btn ${consultationTab === 'chat' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setConsultationTab('chat'); setSelectedConsultationAstrologerId(null) }}><MessageCircle size={16} /> Chat</button>
              <button type="button" className={`btn ${consultationTab === 'call' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setConsultationTab('call'); setSelectedConsultationAstrologerId(null) }}><PhoneCall size={16} /> Call</button>
              <button type="button" className={`btn ${consultationTab === 'appointments' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setConsultationTab('appointments'); setSelectedConsultationAstrologerId(null) }}><CalendarDays size={16} /> Appointment History</button>
            </div>
          </Card>}

          {!isAstrologer && <section className="profile-consultation-history" aria-live="polite">
            {consultationTab === 'appointments' ? <>
              <div className="profile-appointment-history__heading"><div><span className="profile-kicker">YOUR CONSULTATIONS</span><h2>Appointment History</h2></div><CalendarPlus size={20} /></div>
              {appointmentHistory.length ? <div className="profile-appointment-history__list">{appointmentHistory.map((appointment) => {
                const status = appointment.status || 'Pending'
                const canCancel = cancellableAppointmentStatuses.includes(status)
                const canJoin = status === 'Confirmed'
                return <Card key={appointment.id} className="profile-appointment-card">
                  <div className="profile-appointment-card__top"><div><h3>{appointment.astrologer}</h3><span className="profile-appointment-card__type">Audio Call · {appointment.duration || appointment.package || '30 min'}</span></div><span className={`profile-appointment-status profile-appointment-status--${status.toLowerCase()}`}>{status}</span></div>
                  <div className="profile-appointment-card__schedule"><span><b>Appointment Date</b>{appointment.date}</span><span><b>Appointment Time</b>{appointment.time}</span><span><b>Status</b>{status}</span></div>
                  <div className="profile-appointment-card__actions"><Link to={`${routes.appointmentDetails}?id=${appointment.id}`} className="btn btn-outline">Appointment Details</Link>{canJoin && <Link to={`${routes.appointmentDetails}?id=${appointment.id}`} className="btn btn-primary"><PhoneCall size={15} /> Join Audio Call</Link>}{canCancel && <button type="button" className="btn btn-ghost" onClick={() => actions.cancelAppointment(appointment.id, appointment)}>Cancel Appointment</button>}</div>
                </Card>
              })}</div> : <Card className="profile-appointment-empty"><CalendarDays size={22} /><h3>No appointments yet</h3><p>Your booked astrologer appointments will appear here.</p></Card>}
            </> : selectedConsultationAstrologer ? <>
              <div className="profile-history-detail-heading"><button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedConsultationAstrologerId(null)}><ArrowLeft size={14} /> All {consultationTab === 'chat' ? 'Chat' : 'Call'} History</button><div><span className="profile-kicker">{consultationTab === 'chat' ? 'CHAT HISTORY' : 'AUDIO CALL HISTORY'}</span><h2>{selectedConsultationAstrologer.name}</h2></div></div>
              <div className="profile-session-list">{selectedConsultationAstrologer.sessions.map((session) => <Card className={`profile-session-card${consultationTab === 'chat' ? ' profile-session-card--chat' : ''}`} key={session.id}>
                <div className="profile-session-card__icon">{consultationTab === 'chat' ? <MessageCircle size={18} /> : <Headphones size={18} />}</div><div className="profile-session-card__body"><div className="profile-session-card__top"><div><h3>{consultationTab === 'chat' ? 'Chat Session' : 'Audio Call'}</h3><span>{new Date(session.startedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div><span className="profile-session-status">{session.status}</span></div><div className="profile-session-card__meta"><span><Clock3 size={14} /> {session.durationMinutes} min</span><span>{session.messages?.length || 0} messages</span></div>{consultationTab === 'chat' && session.messages?.length ? <div className="profile-chat-messages">{session.messages.map((message) => <div className={`profile-chat-message profile-chat-message--${message.sender}`} key={message.id}><span>{message.text}</span><small>{new Date(message.sentAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</small></div>)}</div> : null}</div>
              </Card>)}</div>
            </> : <>
              <div className="profile-consultation-history__heading"><div><span className="profile-kicker">{consultationTab === 'chat' ? 'CHAT HISTORY' : 'AUDIO CALL HISTORY'}</span><h2>{consultationTab === 'chat' ? 'Your Chats' : 'Your Calls'}</h2></div>{consultationTab === 'chat' ? <MessageCircle size={20} /> : <Headphones size={20} />}</div>
              {consultationAstrologers.length ? <div className="profile-astrologer-history-list">{consultationAstrologers.map((entry) => <button type="button" className="profile-astrologer-history-row" key={entry.id} onClick={() => setSelectedConsultationAstrologerId(entry.id)}><span className="profile-astrologer-history-avatar">{initials(entry.name)}</span><span><strong>{entry.name}</strong><small>{entry.sessions.length} {consultationTab === 'chat' ? 'chat' : 'audio call'} session{entry.sessions.length === 1 ? '' : 's'} · Last session {new Date(entry.latest).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small></span><ArrowLeft size={16} className="profile-history-chevron" /></button>)}</div> : <Card className="profile-appointment-empty">{consultationTab === 'chat' ? <MessageCircle size={22} /> : <Headphones size={22} />}<h3>No {consultationTab === 'chat' ? 'chat' : 'call'} history yet</h3><p>Your astrologer {consultationTab === 'chat' ? 'chat' : 'call'} history will appear here.</p></Card>}
            </>}
          </section>}

          <div className="social-profile__tabs" role="tablist" aria-label="Profile sections">
            {(isAstrologer ? [['Services', Info], ['Live', Radio]] : [['Posts', Grid3X3], ['Live', Radio], ['Other', Info]]).map(([label, Icon]) => <button key={label} type="button" role="tab" aria-selected={activeTab === label} className={activeTab === label ? 'is-active' : ''} onClick={() => setActiveTab(label)}><Icon size={16} /> {label}</button>)}
          </div>

          {activeTab === 'Posts' && !isAstrologer && <div className="social-profile__posts"><Card className="social-profile__post social-profile__post--violet"><div className="social-profile__post-icon"><Grid3X3 size={20} /></div><h2>Share your first post</h2><p>When you share updates, they will appear on your profile.</p><span className="muted">Profile updates will appear here</span></Card></div>}
          {activeTab === 'Live' && <div className="social-profile__posts">{liveSessions.length ? liveSessions.map((session) => <Card key={session.id} className="social-profile__post social-profile__post--coral"><div className="social-profile__post-icon"><Radio size={20} /></div><h2>{session.title}</h2><p>{session.status}</p><span className="muted">{session.time}</span></Card>) : <Card className="social-profile__panel"><div className="section-title">No live sessions yet</div><p className="muted">Upcoming live sessions will appear here.</p></Card>}</div>}
          {activeTab === 'Other' && !isAstrologer && <Card className="social-profile__panel"><div className="section-title">Profile details</div><div className="social-profile__details"><div><strong>Email</strong><span><Mail size={14} /> {currentUser?.email || 'Not added'}</span></div><div><strong>Phone</strong><span><Phone size={14} /> {currentUser?.phone || 'Not added'}</span></div></div></Card>}
          {activeTab === 'Services' && isAstrologer && <Card className="social-profile__panel"><div className="section-title">Services</div><div className="profile-service-status"><span className={`service-status-dot ${astrologerServices.available ? 'is-available' : 'is-unavailable'}`} />{astrologerServices.dndEnabled ? 'Dyan / DND mode — unavailable' : astrologerServices.isOnline ? 'Online' : 'Offline'}</div><p className="profile-services-help">Control which instant consultation services are available to users.</p><div className="profile-services-grid" aria-label="Service controls"><label className={`service-toggle${astrologerServices.dndEnabled ? ' is-locked' : ''}`}><span><strong><PhoneCall size={14} /> Instant Call</strong><small>{astrologerServices.callAvailable ? 'Available to users' : 'Unavailable to users'}</small></span><input type="checkbox" checked={astrologerServices.callEnabled} disabled={astrologerServices.dndEnabled} onChange={(event) => actions.updateAstrologerServices({ callEnabled: event.target.checked })} aria-label="Enable instant calls" /><span className="toggle-switch" /></label><label className={`service-toggle${astrologerServices.dndEnabled ? ' is-locked' : ''}`}><span><strong><MessageCircle size={14} /> Instant Chat</strong><small>{astrologerServices.chatAvailable ? 'Available to users' : 'Unavailable to users'}</small></span><input type="checkbox" checked={astrologerServices.chatEnabled} disabled={astrologerServices.dndEnabled} onChange={(event) => actions.updateAstrologerServices({ chatEnabled: event.target.checked })} aria-label="Enable instant chat" /><span className="toggle-switch" /></label><label className="service-toggle service-toggle--dnd"><span><strong>Dyan / DND</strong><small>{astrologerServices.dndEnabled ? 'All services paused' : 'Pause all instant services'}</small></span><input type="checkbox" checked={astrologerServices.dndEnabled} onChange={(event) => actions.updateAstrologerServices({ dndEnabled: event.target.checked })} aria-label="Enable Dyan or DND mode" /><span className="toggle-switch" /></label></div>{astrologerServices.dndEnabled && <div className="service-lock-message">Turn off Dyan / DND to enable Call and Chat controls.</div>}<div className="social-profile__details"><div><strong><PhoneCall size={14} /> Call</strong><span>{astrologerServices.callAvailable ? `Available · ₹${astrologerServices.callPricePerMinute}/min` : 'Unavailable'}</span></div><div><strong><MessageCircle size={14} /> Chat</strong><span>{astrologerServices.chatAvailable ? `Available · ₹${astrologerServices.chatPricePerMinute}/min` : 'Unavailable'}</span></div><div><strong>Specialization</strong><span>{currentUser?.specialization || 'Not added'}</span></div><div><strong>Experience</strong><span>{currentUser?.experience || 'Not added'}</span></div></div></Card>}
          {saved && <div className="profile-message profile-message--success">Profile updated successfully.</div>}
        </div>
      )}

      {isAstrologer && audiencePanel && <div className="modal-overlay user-modal-overlay" onClick={closeAudience}>
        <div className="modal-card user-modal-card" style={{ width: 'min(420px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
          <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
            <div className="section-title" style={{ marginBottom: 0 }}>{audiencePanel}</div>
            <button type="button" className="icon-btn" aria-label={`Close ${audiencePanel} list`} onClick={closeAudience}><X size={16} /></button>
          </div>
          <div className="modal-card__content user-modal-card__content"><div className="social-profile__audience-list">{audienceEntries.length ? audienceEntries.map((entry) => <button key={entry.id} type="button" className="social-profile__audience-item" onClick={() => navigate(`/astrologer/audience/${audiencePanel === 'Subscribers' ? 'subscriber' : 'follower'}/${entry.id}`)}><div className="social-profile__audience-avatar">{entry.name.slice(0, 1).toUpperCase()}</div><div><strong>{entry.name}</strong><span className="audience-username">@{accountHandle(entry)}</span><span className="audience-account-id">ID: {entry.id}</span>{audiencePanel === 'Subscribers' && <span className="audience-tier-label">{entry.tier || 'Silver'}</span>}</div></button>) : <div className="muted">No {audiencePanel.toLowerCase()} yet.</div>}</div></div>
        </div>
      </div>}

    </div>
  )
}
