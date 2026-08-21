import { BadgeCheck, Grid3X3, Info, Mail, MapPin, MessageCircle, Phone, PhoneCall, Radio, UserCircle2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import Card from '../components/ui/Card.jsx'
import { mockAstrologers, mockLiveSessions } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { ROLES } from '../utils/roleRoutes.js'

const PROFILE_FOLLOWERS = [
  { id: 'follower-priya', name: 'Priya V.', username: 'priya.v', bio: 'Astro Connect member exploring guidance for life, career, and relationships.' },
  { id: 'follower-kannan', name: 'Kannan', username: 'kannan.astro', bio: 'Interested in practical astrology and thoughtful consultations.' },
  { id: 'follower-devi', name: 'Devi', username: 'devi.guidance', bio: 'Following astrology insights and live sessions.' },
  { id: 'follower-arun', name: 'Arun', username: 'arun.connect', bio: 'Astro Connect community member.' },
]
const PROFILE_POSTS = [
  { id: 'post-1', tone: 'violet', title: 'Understanding the right time to begin', body: 'Timing becomes clearer when preparation and patience work together. Look for the small signs that your next step is ready.' },
  { id: 'post-2', tone: 'coral', title: 'A simple weekly reflection', body: 'Write down one question, one intention, and one action for the week ahead. Clarity grows through consistent reflection.' },
  { id: 'post-3', tone: 'gold', title: 'Your chart is a guide', body: 'Astrology can help you understand patterns, but your choices give those patterns direction.' },
]

function initials(name) {
  return name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'U'
}

export default function Profile() {
  const { currentUser, updateProfile } = useAuth()
  const { subscriptions, blockedUserIds, actions, astrologerServices } = useAppData()
  const isAstrologer = currentUser?.role === ROLES.ASTROLOGER
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('Posts')
  const [audiencePanel, setAudiencePanel] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)
  const [form, setForm] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', phone: currentUser?.phone || '', specialization: currentUser?.specialization || '', experience: currentUser?.experience || '' })
  const [servicesForm, setServicesForm] = useState(astrologerServices)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const name = currentUser?.name || (isAstrologer ? 'Astrologer' : 'User')
  const username = name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'profile'
  const bio = isAstrologer
    ? `${currentUser?.specialization || 'Astrology guidance'} · ${currentUser?.experience || 'Experienced astrologer'}\nHelping you find clarity through thoughtful guidance.`
    : 'Astro Connect member\nAsk questions, explore astrologers, and follow your journey with clarity.'
  const liveSessions = useMemo(() => mockLiveSessions.filter((session) => !isAstrologer || session.astrologerId === 'astrologer-demo'), [isAstrologer])
  const astrologerProfile = mockAstrologers.find((profile) => profile.id === currentUser?.id) || mockAstrologers[0]
  const subscriberEntries = subscriptions
    .filter((subscription) => subscription.astrologerId === currentUser?.id || (isAstrologer && subscription.astrologerId === astrologerProfile.id))
    .map((subscription) => ({
      id: subscription.userId,
      name: subscription.userName || subscription.userId || 'Subscriber',
      username: String(subscription.userName || subscription.userId || 'subscriber').toLowerCase().replace(/[^a-z0-9]+/g, ''),
      bio: 'Astro Connect subscriber following astrology guidance and live sessions.',
      tier: subscription.tier || 'Silver',
    }))
  const subscriberNames = subscriberEntries.map((subscriber) => subscriber.name)
  const audienceEntries = audiencePanel === 'Followers'
    ? PROFILE_FOLLOWERS
    : subscriberEntries
  const closeAudience = () => {
    setAudiencePanel(null)
    setSelectedMember(null)
  }
  const openAudience = (panel) => {
    setSelectedMember(null)
    setAudiencePanel(panel)
  }

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
              <div className="profile-edit-card__heading"><PhoneCall size={20} /><div><h2>Service Pricing</h2><p>Set separate per-minute prices for calls and chats. Availability controls are on the dashboard.</p></div></div>
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
              <div><strong>{isAstrologer ? PROFILE_POSTS.length : 0}</strong><span>Posts</span></div>
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

          <div className="social-profile__tabs" role="tablist" aria-label="Profile sections">
            {[['Posts', Grid3X3], ['Live', Radio], [isAstrologer ? 'Services' : 'Other', Info]].map(([label, Icon]) => <button key={label} type="button" role="tab" aria-selected={activeTab === label} className={activeTab === label ? 'is-active' : ''} onClick={() => setActiveTab(label)}><Icon size={16} /> {label}</button>)}
          </div>

          {activeTab === 'Posts' && <div className="social-profile__posts">{isAstrologer ? PROFILE_POSTS.map((post) => <Card key={post.id} className={`social-profile__post social-profile__post--${post.tone}`}><div className="social-profile__post-icon"><Grid3X3 size={20} /></div><h2>{post.title}</h2><p>{post.body}</p><span className="muted">Astrology insight · 2 days ago</span></Card>) : <Card className="social-profile__post social-profile__post--violet"><div className="social-profile__post-icon"><Grid3X3 size={20} /></div><h2>Share your first post</h2><p>When you share updates, they will appear on your profile.</p><span className="muted">Profile updates will appear here</span></Card>}</div>}
          {activeTab === 'Live' && <div className="social-profile__posts">{liveSessions.length ? liveSessions.map((session) => <Card key={session.id} className="social-profile__post social-profile__post--coral"><div className="social-profile__post-icon"><Radio size={20} /></div><h2>{session.title}</h2><p>{session.status}</p><span className="muted">{session.time}</span></Card>) : <Card className="social-profile__panel"><div className="section-title">No live sessions yet</div><p className="muted">Upcoming live sessions will appear here.</p></Card>}</div>}
          {activeTab === 'Other' && !isAstrologer && <Card className="social-profile__panel"><div className="section-title">Profile details</div><div className="social-profile__details"><div><strong>Email</strong><span><Mail size={14} /> {currentUser?.email || 'Not added'}</span></div><div><strong>Phone</strong><span><Phone size={14} /> {currentUser?.phone || 'Not added'}</span></div></div></Card>}
          {activeTab === 'Services' && isAstrologer && <Card className="social-profile__panel"><div className="section-title">Services</div><div className="profile-service-status"><span className={`service-status-dot ${astrologerServices.available ? 'is-available' : 'is-unavailable'}`} />{astrologerServices.dndEnabled ? 'Dyan / DND mode — unavailable' : astrologerServices.isOnline ? 'Online' : 'Offline'}</div><div className="social-profile__details"><div><strong><PhoneCall size={14} /> Call</strong><span>{astrologerServices.callAvailable ? `Available · ₹${astrologerServices.callPricePerMinute}/min` : 'Unavailable'}</span></div><div><strong><MessageCircle size={14} /> Chat</strong><span>{astrologerServices.chatAvailable ? `Available · ₹${astrologerServices.chatPricePerMinute}/min` : 'Unavailable'}</span></div><div><strong>Specialization</strong><span>{currentUser?.specialization || 'Not added'}</span></div><div><strong>Experience</strong><span>{currentUser?.experience || 'Not added'}</span></div></div></Card>}
          {saved && <div className="profile-message profile-message--success">Profile updated successfully.</div>}
        </div>
      )}

      {isAstrologer && audiencePanel && <div className="modal-overlay user-modal-overlay" onClick={closeAudience}>
        <div className="modal-card user-modal-card" style={{ width: 'min(420px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
          <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">{selectedMember && <button type="button" className="icon-btn" aria-label={`Back to ${audiencePanel.toLowerCase()}`} onClick={() => setSelectedMember(null)}>←</button>}<div className="section-title" style={{ marginBottom: 0 }}>{selectedMember ? selectedMember.name : audiencePanel}</div></div>
            <button type="button" className="icon-btn" aria-label={`Close ${audiencePanel} list`} onClick={closeAudience}><X size={16} /></button>
          </div>
          <div className="modal-card__content user-modal-card__content">{selectedMember ? <div className="follower-profile-modal"><div className="social-profile__audience-avatar follower-profile-modal__avatar">{selectedMember.name.slice(0, 1).toUpperCase()}</div><h2>{selectedMember.name}</h2><div className="muted">@{selectedMember.username}</div>{audiencePanel === 'Subscribers' && <div className="subscriber-tier-badge">{selectedMember.tier || 'Silver'} Subscriber</div>}<p>{selectedMember.bio}</p><button type="button" className={blockedUserIds.includes(selectedMember.id) ? 'btn btn-outline' : 'btn btn-primary'} onClick={() => actions.toggleUserBlock(selectedMember.id)}>{blockedUserIds.includes(selectedMember.id) ? 'Unblock' : 'Block'}</button></div> : <div className="social-profile__audience-list">{audienceEntries.length ? audienceEntries.map((entry) => <button key={entry.id} type="button" className="social-profile__audience-item" onClick={() => setSelectedMember(entry)}><div className="social-profile__audience-avatar">{entry.name.slice(0, 1).toUpperCase()}</div><div><strong>{entry.name}</strong>{audiencePanel === 'Subscribers' && <span className="audience-tier-label">{entry.tier || 'Silver'}</span>}</div></button>) : <div className="muted">No {audiencePanel.toLowerCase()} yet.</div>}</div>}</div>
        </div>
      </div>}

    </div>
  )
}
