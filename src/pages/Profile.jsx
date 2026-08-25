import { ArrowLeft, BadgeCheck, CalendarDays, CalendarPlus, Camera, Clock3, Grid3X3, Headphones, Info, Mail, MapPin, MessageCircle, Phone, PhoneCall, Play, Plus, Pencil, Radio, Square, Trash2, UserCircle2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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

const VISIBILITY_OPTIONS = [
  ['public', 'Public'],
  ['followers', 'Followers'],
  ['subscribers', 'Subscribers'],
  ['private', 'Private'],
]

const POST_INTERACTION_OPTIONS = [
  ['like', 'Likes', 'Allow users to like this post.'],
  ['comment', 'Comments', 'Allow users to add comments.'],
  ['share', 'Shares', 'Allow users to share this post.'],
  ['save', 'Saves', 'Allow users to save this post.'],
]

function dateTimeLocal(value) {
  const date = value ? new Date(value) : new Date(Date.now() + 24 * 60 * 60 * 1000)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
}

function blankLiveForm() {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return {
    title: '',
    description: '',
    visibility: 'public',
    scheduledStartAt: dateTimeLocal(start),
    scheduledEndAt: dateTimeLocal(end),
  }
}

function visibilityLabel(value) {
  return VISIBILITY_OPTIONS.find(([key]) => key === value)?.[1] || 'Public'
}

function displayDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Profile() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, updateProfile } = useAuth()
  const { subscriptions, appointments, consultationHistory, actions, astrologerServices, astrologerPosts, astrologerLiveSessions, postComments } = useAppData()
  const isAstrologer = currentUser?.role === ROLES.ASTROLOGER
  const routes = getRoleRoutes(currentUser?.role)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState(isAstrologer ? 'Services' : 'Posts')
  const [audiencePanel, setAudiencePanel] = useState(null)
  const [form, setForm] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', phone: currentUser?.phone || '', specialization: currentUser?.specialization || '', experience: currentUser?.experience || '' })
  const [servicesForm, setServicesForm] = useState(astrologerServices)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [composer, setComposer] = useState(null)
  const [postForm, setPostForm] = useState({ title: '', body: '', visibility: 'public', interactionAccess: { like: true, comment: true, share: true, save: true }, media: [] })
  const [postAccessPanelOpen, setPostAccessPanelOpen] = useState(false)
  const [isRecordingPost, setIsRecordingPost] = useState(false)
  const [liveForm, setLiveForm] = useState(blankLiveForm)
  const [editingContent, setEditingContent] = useState(null)
  const [contentError, setContentError] = useState('')
  const [consultationTab, setConsultationTab] = useState('appointments')
  const [selectedConsultationAstrologerId, setSelectedConsultationAstrologerId] = useState(null)
  const mediaInputRef = useRef(null)
  const postRecorderRef = useRef(null)
  const postRecordingStreamRef = useRef(null)

  const name = currentUser?.name || (isAstrologer ? 'Astrologer' : 'User')
  const username = name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'profile'
  const bio = isAstrologer
    ? 'Helping you find clarity through thoughtful guidance.'
    : 'Astro Connect member\nAsk questions, explore astrologers, and follow your journey with clarity.'
  const liveSessions = useMemo(() => isAstrologer
    ? astrologerLiveSessions.filter((session) => session.astrologerId === currentUser?.id)
    : mockLiveSessions.filter((session) => session.astrologerId === 'astrologer-demo'), [astrologerLiveSessions, currentUser?.id, isAstrologer])
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

  const openPostComposer = (post = null) => {
    setContentError('')
    setPostAccessPanelOpen(false)
    setEditingContent(post ? { type: 'post', id: post.id } : null)
    setPostForm(post ? { title: post.title, body: post.body, visibility: post.visibility, interactionAccess: { like: true, comment: true, share: true, save: true, ...(post.interactionAccess || {}), ...(post.commentsEnabled === false ? { comment: false } : {}) }, media: post.media || [] } : { title: '', body: '', visibility: 'public', interactionAccess: { like: true, comment: true, share: true, save: true }, media: [] })
    setComposer('post')
  }

  const openLiveComposer = (session = null) => {
    setContentError('')
    setEditingContent(session ? { type: 'live', id: session.id } : null)
    setLiveForm(session ? {
      title: session.title,
      description: session.description,
      visibility: session.visibility,
      scheduledStartAt: dateTimeLocal(session.scheduledStartAt),
      scheduledEndAt: dateTimeLocal(session.scheduledEndAt),
    } : blankLiveForm())
    setComposer('live')
  }

  const openLiveWorkspace = (session = null) => {
    navigate(session ? `${routes.liveSession}?sessionId=${encodeURIComponent(session.id)}` : routes.liveSession)
  }

  const closeComposer = () => {
    setComposer(null)
    setEditingContent(null)
    setContentError('')
    setPostAccessPanelOpen(false)
  }

  const openPostAccessPanel = () => {
    if (!postForm.title.trim() || !postForm.body.trim()) {
      setContentError('Add a title and message before publishing.')
      return
    }
    setContentError('')
    setPostAccessPanelOpen(true)
  }

  const confirmPostPublish = () => {
    if (editingContent?.type === 'post') actions.updatePost(editingContent.id, postForm)
    else actions.createPost({ ...postForm, astrologerId: currentUser.id })
    closeComposer()
  }

  const handlePostMedia = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    const invalid = files.find((file) => !file.type.startsWith('image/') && !file.type.startsWith('video/'))
    if (invalid) {
      setContentError(`${invalid.name} is not a supported image or video file.`)
      return
    }
    const oversized = files.find((file) => file.size > 10 * 1024 * 1024)
    if (oversized) {
      setContentError(`${oversized.name} is larger than the 10 MB limit.`)
      return
    }
    Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, type: file.type, dataUrl: reader.result })
      reader.onerror = reject
      reader.readAsDataURL(file)
    }))).then((media) => {
      setPostForm((current) => ({ ...current, media: [...current.media, ...media] }))
      setContentError('')
    }).catch(() => setContentError('Unable to read one or more media files.'))
  }

  const removePostMedia = (mediaId) => setPostForm((current) => ({ ...current, media: current.media.filter((item) => item.id !== mediaId) }))

  const stopPostRecording = () => {
    if (postRecorderRef.current?.state === 'recording') postRecorderRef.current.stop()
  }

  const startPostRecording = async () => {
    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      setContentError('Camera recording is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks = []
      postRecordingStreamRef.current = stream
      postRecorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        const reader = new FileReader()
        reader.onload = () => {
          setPostForm((current) => ({
            ...current,
            media: [...current.media, { id: crypto.randomUUID(), name: `camera-recording-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.webm`, type: blob.type, dataUrl: reader.result }],
          }))
          setContentError('')
        }
        reader.onerror = () => setContentError('Unable to save the camera recording.')
        reader.readAsDataURL(blob)
        stream.getTracks().forEach((track) => track.stop())
        postRecordingStreamRef.current = null
        postRecorderRef.current = null
        setIsRecordingPost(false)
      }
      recorder.start()
      setContentError('')
      setIsRecordingPost(true)
    } catch {
      setContentError('Camera or microphone permission was denied. Recording was not started.')
      setIsRecordingPost(false)
    }
  }

  useEffect(() => () => {
    if (postRecorderRef.current?.state === 'recording') postRecorderRef.current.stop()
    postRecordingStreamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const saveLive = () => {
    const start = new Date(liveForm.scheduledStartAt)
    const end = new Date(liveForm.scheduledEndAt)
    if (!liveForm.title.trim() || !liveForm.description.trim()) {
      setContentError('Add a title and description before publishing.')
      return
    }
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setContentError('Choose a valid end time after the start time.')
      return
    }
    const payload = { ...liveForm, scheduledStartAt: start.toISOString(), scheduledEndAt: end.toISOString(), astrologerId: currentUser.id }
    if (editingContent?.type === 'live') actions.updateLiveSession(editingContent.id, payload)
    else actions.createLiveSession(payload)
    closeComposer()
  }

  const deleteContent = (type, id) => {
    if (!window.confirm(`Delete this ${type === 'post' ? 'post' : 'live session'}?`)) return
    if (type === 'post') actions.deletePost(id)
    else actions.deleteLiveSession(id)
  }

  const ownerPosts = astrologerPosts.filter((post) => post.astrologerId === currentUser?.id)
  const liveGroups = [
    ['past', 'Past live sessions'],
    ['live', 'Present / live now'],
    ['upcoming', 'Future live sessions'],
  ]

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
                {isAstrologer && <div className="muted">{currentUser?.specialization || 'Astrologer'}</div>}
                <div className="social-profile__meta"><MapPin size={14} /> India</div>
              </div>
              <div className="social-profile__actions"><button type="button" className="btn btn-primary" onClick={startEditing}>Edit Profile</button></div>
            </div>
            <div className="social-profile__stats">
              {!isAstrologer && <div><strong>0</strong><span>Posts</span></div>}
              {isAstrologer ? (
                <>
                  <div><strong>{currentUser?.experience || '—'}</strong><span>Experience</span></div>
                  <button type="button" className="social-profile__stat-button" onClick={() => openAudience('Followers')}><strong>{astrologerProfile.followers.toLocaleString('en-IN')}</strong><span>Followers</span></button>
                  <button type="button" className="social-profile__stat-button" onClick={() => openAudience('Subscribers')}><strong>{subscriberNames.length}</strong><span>Subscribers</span></button>
                </>
              ) : (
                <><div><strong>0</strong><span>Followers</span></div><div><strong>0</strong><span>Following</span></div></>
              )}
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
            {(isAstrologer ? [['Posts', Grid3X3], ['Services', Info], ['Live', Radio]] : [['Posts', Grid3X3], ['Live', Radio], ['Other', Info]]).map(([label, Icon]) => <button key={label} type="button" role="tab" aria-selected={activeTab === label} className={activeTab === label ? 'is-active' : ''} onClick={() => setActiveTab(label)}><Icon size={16} /> {label}</button>)}
          </div>

          {activeTab === 'Posts' && !isAstrologer && <div className="social-profile__posts"><Card className="social-profile__post social-profile__post--violet"><div className="social-profile__post-icon"><Grid3X3 size={20} /></div><h2>Share your first post</h2><p>When you share updates, they will appear on your profile.</p><span className="muted">Profile updates will appear here</span></Card></div>}
          {activeTab === 'Posts' && isAstrologer && <section className="profile-content-section">
            <div className="profile-content-heading"><div><div className="section-title">Posts</div><p className="muted">Share insights with your audience.</p></div><button type="button" className="btn btn-primary" onClick={() => openPostComposer()}><Plus size={16} /> Create Post</button></div>
            <div className="social-profile__posts">{ownerPosts.length ? ownerPosts.map((post) => <Card key={post.id} className={`social-profile__post social-profile__post--${post.tone || 'violet'}`}><div className="social-profile__post-icon"><Grid3X3 size={20} /></div><div className="profile-content-card-actions"><span className="profile-visibility-badge">{visibilityLabel(post.visibility)}</span><span className="profile-content-actions"><button type="button" className="icon-btn" aria-label={`Edit ${post.title}`} onClick={() => openPostComposer(post)}><Pencil size={14} /></button><button type="button" className="icon-btn" aria-label={`Delete ${post.title}`} onClick={() => deleteContent('post', post.id)}><Trash2 size={14} /></button></span></div><h2>{post.title}</h2><p>{post.body}</p>{post.media?.length > 0 && <div className="profile-post-media">{post.media.map((item) => item.type.startsWith('video/') ? <video key={item.id} src={item.dataUrl} controls preload="metadata" aria-label={item.name} /> : <img key={item.id} src={item.dataUrl} alt={item.name} />)}</div>}<div className="profile-post-meta"><span><MessageCircle size={13} /> {postComments[post.id]?.length || 0} comments</span><span>Published {displayDate(post.createdAt)}</span></div></Card>) : <Card className="social-profile__panel"><div className="section-title">No posts yet</div><p className="muted">Create your first post to share an astrology insight.</p></Card>}</div>
          </section>}
          {activeTab === 'Live' && !isAstrologer && <div className="social-profile__posts">{liveSessions.length ? liveSessions.map((session) => <Card key={session.id} className="social-profile__post social-profile__post--coral"><div className="social-profile__post-icon"><Radio size={20} /></div><h2>{session.title}</h2><p>{session.status}</p><span className="muted">{session.time}</span></Card>) : <Card className="social-profile__panel"><div className="section-title">No live sessions yet</div><p className="muted">Upcoming live sessions will appear here.</p></Card>}</div>}
          {activeTab === 'Live' && isAstrologer && <section className="profile-content-section">
            <div className="profile-content-heading"><div><div className="section-title">Live sessions</div><p className="muted">Schedule and host YouTube-style live sessions.</p></div><button type="button" className="btn btn-primary" onClick={() => openLiveWorkspace()}><Plus size={16} /> Create Live</button></div>
            <div className="profile-live-groups">{liveGroups.map(([status, label]) => { const sessions = liveSessions.filter((session) => session.status === status); return <div key={status} className="profile-live-group"><div className="profile-live-group__heading"><h3>{label}</h3><span>{sessions.length}</span></div>{sessions.length ? sessions.map((session) => <Card key={session.id} className={`social-profile__post social-profile__post--${status === 'live' ? 'coral' : 'violet'}`}><div className="profile-content-card-actions"><span className={`profile-visibility-badge profile-visibility-badge--${status}`}>{status === 'live' ? 'LIVE' : visibilityLabel(session.visibility)}</span><span className="profile-content-actions"><button type="button" className="icon-btn" aria-label={`Edit ${session.title}`} onClick={() => openLiveComposer(session)}><Pencil size={14} /></button><button type="button" className="icon-btn" aria-label={`Delete ${session.title}`} onClick={() => deleteContent('live', session.id)}><Trash2 size={14} /></button></span></div><div className="social-profile__post-icon"><Radio size={20} /></div><h2>{session.title}</h2><p>{session.description}</p><span className="muted">{displayDate(session.scheduledStartAt)} – {displayDate(session.scheduledEndAt)}</span><div className="profile-live-actions">{status === 'upcoming' && <button type="button" className="btn btn-primary" onClick={() => openLiveWorkspace(session)}><Play size={14} /> Start Live</button>}{status === 'live' && <button type="button" className="btn btn-outline" onClick={() => openLiveWorkspace(session)}><Radio size={14} /> Open Live</button>}</div></Card>) : <div className="profile-live-empty muted">No {label.toLowerCase()}.</div>}</div>})}</div>
          </section>}
          {activeTab === 'Other' && !isAstrologer && <Card className="social-profile__panel"><div className="section-title">Profile details</div><div className="social-profile__details"><div><strong>Email</strong><span><Mail size={14} /> {currentUser?.email || 'Not added'}</span></div><div><strong>Phone</strong><span><Phone size={14} /> {currentUser?.phone || 'Not added'}</span></div></div></Card>}
          {activeTab === 'Services' && isAstrologer && <Card className="social-profile__panel"><div className="section-title">Services</div><div className="profile-service-status"><span className={`service-status-dot ${astrologerServices.available ? 'is-available' : 'is-unavailable'}`} />{astrologerServices.dndEnabled ? 'Dyan / DND mode — unavailable' : astrologerServices.isOnline ? 'Online' : 'Offline'}</div><p className="profile-services-help">Manage Chat, Call, and DND from the status dropdown in the greeting panel.</p><div className="social-profile__details"><div><strong><PhoneCall size={14} /> Call</strong><span>{astrologerServices.callAvailable ? `Enabled · ₹${astrologerServices.callPricePerMinute}/min` : 'Disabled'}</span></div><div><strong><MessageCircle size={14} /> Chat</strong><span>{astrologerServices.chatAvailable ? `Enabled · ₹${astrologerServices.chatPricePerMinute}/min` : 'Disabled'}</span></div><div><strong>Dyan / DND</strong><span>{astrologerServices.dndEnabled ? 'Enabled · all services paused' : 'Disabled'}</span></div></div></Card>}
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

      {isAstrologer && composer && <div className="modal-overlay user-modal-overlay" onClick={closeComposer}>
        <div className="modal-card user-modal-card profile-content-composer" onClick={(event) => event.stopPropagation()}>
          <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4"><div><div className="section-title" style={{ marginBottom: 0 }}>{editingContent ? 'Edit' : 'Create'} {composer === 'post' ? 'Post' : 'Live Session'}</div><p className="muted">Choose who can see this {composer === 'post' ? 'post' : 'session'}.</p></div><button type="button" className="icon-btn" aria-label="Close composer" onClick={closeComposer}><X size={16} /></button></div>
          <div className="modal-card__content user-modal-card__content">
            {composer === 'post' ? (
              <div className="profile-composer-fields">
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Title</span>
                  <input className="text-input" value={postForm.title} onChange={(event) => setPostForm({ ...postForm, title: event.target.value })} placeholder="A thoughtful astrology insight" />
                </label>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Post</span>
                  <textarea className="text-input" rows="6" value={postForm.body} onChange={(event) => setPostForm({ ...postForm, body: event.target.value })} placeholder="Write your message..." />
                </label>
                <div className="post-media-uploader">
                  <div className="post-media-uploader__heading"><span className="field-label-top">Media</span><span>Images or videos · up to 10 MB each</span></div>
                  <div className="post-media-actions">
                    <button type="button" className="post-media-dropzone" onClick={() => mediaInputRef.current?.click()}><Plus size={20} /><strong>Add photos or videos</strong><small>Select multiple files</small></button>
                    <button type="button" className={`post-media-record${isRecordingPost ? ' is-recording' : ''}`} onClick={isRecordingPost ? stopPostRecording : startPostRecording}>{isRecordingPost ? <><Square size={20} /><strong>Stop recording</strong><small>Save camera video</small></> : <><Camera size={20} /><strong>Record from camera</strong><small>Use camera and microphone</small></>}</button>
                  </div>
                  <input ref={mediaInputRef} type="file" accept="image/*,video/*" multiple hidden onChange={handlePostMedia} />
                  {postForm.media.length > 0 && <div className="post-media-grid">{postForm.media.map((item) => <div className="post-media-item" key={item.id}>{item.type.startsWith('video/') ? <video src={item.dataUrl} muted /> : <img src={item.dataUrl} alt={item.name} />}<button type="button" className="post-media-remove" aria-label={`Remove ${item.name}`} onClick={() => removePostMedia(item.id)}><X size={13} /></button><span>{item.name}</span></div>)}</div>}
                  {postForm.media.length > 0 && <button type="button" className="post-media-clear" onClick={() => setPostForm((current) => ({ ...current, media: [] }))}>Remove all media</button>}
                </div>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Visibility</span>
                  <select className="select-input" value={postForm.visibility} onChange={(event) => setPostForm({ ...postForm, visibility: event.target.value })}>{VISIBILITY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                </label>
              </div>
            ) : (
              <div className="profile-composer-fields">
                <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Session title</span><input className="text-input" value={liveForm.title} onChange={(event) => setLiveForm({ ...liveForm, title: event.target.value })} placeholder="Ask me anything live" /></label>
                <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Description</span><textarea className="text-input" rows="4" value={liveForm.description} onChange={(event) => setLiveForm({ ...liveForm, description: event.target.value })} placeholder="Tell viewers what this session is about..." /></label>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Start</span><input type="datetime-local" className="text-input" value={liveForm.scheduledStartAt} onChange={(event) => setLiveForm({ ...liveForm, scheduledStartAt: event.target.value })} /></label><label className="field-group" style={{ margin: 0 }}><span className="field-label-top">End</span><input type="datetime-local" className="text-input" value={liveForm.scheduledEndAt} onChange={(event) => setLiveForm({ ...liveForm, scheduledEndAt: event.target.value })} /></label></div>
                <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Visibility</span><select className="select-input" value={liveForm.visibility} onChange={(event) => setLiveForm({ ...liveForm, visibility: event.target.value })}>{VISIBILITY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              </div>
            )}
            {contentError && <div className="profile-message profile-message--error">{contentError}</div>}
            <div className="profile-edit-actions"><button type="button" className="btn btn-ghost" onClick={closeComposer}>Cancel</button><button type="button" className="btn btn-primary" onClick={composer === 'post' ? openPostAccessPanel : saveLive}>{editingContent ? 'Save Changes' : 'Publish'}</button></div>
          </div>
          {composer === 'post' && postAccessPanelOpen && <div className="profile-post-access-panel" role="dialog" aria-modal="true" aria-label="Post access settings"><div className="profile-post-access-panel__header"><div><strong>Set post access</strong><small>Choose what users can do after this post is published.</small></div><button type="button" className="icon-btn" aria-label="Close post access settings" onClick={() => setPostAccessPanelOpen(false)}><X size={16} /></button></div><div className="profile-post-access-panel__options">{POST_INTERACTION_OPTIONS.map(([key, label, description]) => <label className="profile-toggle-field" key={key}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={postForm.interactionAccess[key]} onChange={(event) => setPostForm({ ...postForm, interactionAccess: { ...postForm.interactionAccess, [key]: event.target.checked } })} /></label>)}</div><div className="profile-post-access-panel__actions"><button type="button" className="btn btn-ghost" onClick={() => setPostAccessPanelOpen(false)}>Back</button><button type="button" className="btn btn-primary" onClick={confirmPostPublish}>OK &amp; {editingContent ? 'Save' : 'Publish'}</button></div></div>}
        </div>
      </div>}

    </div>
  )
}
