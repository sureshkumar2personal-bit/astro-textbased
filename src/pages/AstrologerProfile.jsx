import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus, UserCheck, Star, CalendarPlus, CalendarClock, BadgeCheck, Bookmark, Heart, X, Grid3X3, Info, MessageCircle, PhoneCall, Radio, MapPin, Languages, Pencil, Share2, Users } from 'lucide-react'
import { getSuggestedAstrologers, mockAstrologerAvailability, mockAstrologerPosts, mockAstrologers, mockLiveSessions } from '../data/notificationData.js'
import { selectVisiblePosts, useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'

const APPOINTMENT_TYPE = 'Audio Call'
const APPOINTMENT_PRICE = 499

const PROFILE_POSTS = [
  { id: 'post-1', tone: 'violet', title: 'Understanding the right time to begin', body: 'Timing becomes clearer when preparation and patience work together. Look for the small signs that your next step is ready.' },
  { id: 'post-2', tone: 'coral', title: 'A simple weekly reflection', body: 'Write down one question, one intention, and one action for the week ahead. Clarity grows through consistent reflection.' },
  { id: 'post-3', tone: 'gold', title: 'Your chart is a guide', body: 'Astrology can help you understand patterns, but your choices give those patterns direction.' },
]

const PROFILE_FOLLOWERS = ['Priya V.', 'Kannan', 'Devi', 'Arun']

function toInputDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function formatAppointmentDate(value) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function displayDateKey(value) {
  return dateFromKey(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function calendarDays(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
}

function getSubscriptionExpiry(subscription) {
  return subscription?.expiresAt || subscription?.discountQuestions?.[0]?.validUntil
}

function getSubscriptionDaysRemaining(expiry) {
  const expiryTime = new Date(expiry).getTime()
  if (!Number.isFinite(expiryTime) || expiryTime <= Date.now()) return 0
  return Math.ceil((expiryTime - Date.now()) / (24 * 60 * 60 * 1000))
}

export default function AstrologerProfile() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { followedAstrologerIds, actions, subscriptions, appointments, astrologerServices, astrologerPosts: sharedPosts, postLikes, savedPostIds, postComments } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const astrologerId = searchParams.get('id') || mockAstrologers[0].id
  const astrologer = useMemo(
    () => {
      const profile = mockAstrologers.find((item) => item.id === astrologerId) || mockAstrologers[0]
      if (currentUser?.role !== 'astrologer' || currentUser.id !== profile.id) return profile
      return {
        ...profile,
        name: currentUser.name || profile.name,
        specialization: currentUser.specialization || profile.specialization,
        experience: currentUser.experience || profile.experience,
      }
    },
    [astrologerId, currentUser],
  )
  const isOwner = currentUser?.role === 'astrologer' && astrologer.id === mockAstrologers[0].id
  const following = followedAstrologerIds.includes(astrologer.id)
  const subscription = subscriptions.find(
    (sub) => sub.userId === currentUser?.id && sub.astrologerId === astrologer.id,
  )
  const subscriptionDaysRemaining = getSubscriptionDaysRemaining(getSubscriptionExpiry(subscription))
  const subscribed = Boolean(subscription && subscriptionDaysRemaining > 0)
  const canBookAppointment = subscribed
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingStep, setBookingStep] = useState('form')
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [bookedAppointmentId, setBookedAppointmentId] = useState(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [bookingForm, setBookingForm] = useState({
    type: APPOINTMENT_TYPE,
    date: '',
    time: '',
  })
  const [subscribeSuccess, setSubscribeSuccess] = useState(false)
  const [subscriptionPromptOpen, setSubscriptionPromptOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Posts')
  const [audiencePanel, setAudiencePanel] = useState(null)
  const [footerTab, setFooterTab] = useState('Posts')
  const [commentOpen, setCommentOpen] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [shareMessage, setShareMessage] = useState('')
  const subscriberNames = subscriptions
    .filter((subscription) => subscription.astrologerId === astrologer.id)
    .map((subscription) => subscription.userName || subscription.userId || 'Subscriber')
  const liveSessions = mockLiveSessions.filter((session) => session.astrologerId === astrologer.id)
  const accessiblePosts = selectVisiblePosts(sharedPosts, { userId: currentUser?.id, followedAstrologerIds, subscriptions, astrologerId: astrologer.id })
  const hasSharedPosts = sharedPosts.some((post) => post.astrologerId === astrologer.id)
  const astrologerPosts = hasSharedPosts ? accessiblePosts : mockAstrologerPosts.filter((post) => post.astrologerId === astrologer.id)
  const savedPosts = accessiblePosts.filter((post) => savedPostIds.includes(post.id))
  const availability = mockAstrologerAvailability[astrologer.id] || {}
  const monthDays = calendarDays(calendarMonth)
  const todayKey = dateKey(new Date())
  const selectedDateSlots = bookingForm.date ? availability[bookingForm.date] || [] : []
  const bookedSlots = new Set(appointments.filter((appointment) => appointment.astrologerId === astrologer.id).map((appointment) => `${appointment.date}|${appointment.time}`))
  const visiblePosts = footerTab === 'Saved Posts' ? savedPosts : astrologerPosts
  const selectedAstrologerTypes = currentUser?.astrologerPreferences?.astrologerTypes || currentUser?.astrologerPreferences?.methods || []
  const selectedConsultationTitles = currentUser?.astrologerPreferences?.consultationTitles || currentUser?.astrologerPreferences?.topics || []
  const suggestedForUser = getSuggestedAstrologers({ followedAstrologerIds, subscribedAstrologerIds: subscriptions.filter((subscription) => subscription.userId === currentUser?.id).map((subscription) => subscription.astrologerId), preferencesEnabled: currentUser?.astrologerPreferencesEnabled, preferences: currentUser?.astrologerPreferences })
  const showPreferenceChips = !isOwner && suggestedForUser.some((suggested) => suggested.id === astrologer.id) && (selectedAstrologerTypes.length || selectedConsultationTitles.length) > 0
  const liveGroups = [
    ['Upcoming', liveSessions.filter((session) => session.status === 'Upcoming')],
    ['Present / Live Now', liveSessions.filter((session) => ['Live now', 'Present', 'Live'].includes(session.status))],
    ['Past', liveSessions.filter((session) => session.status === 'Past' || session.status === 'Completed')],
  ]
  const toggleComment = (postId) => setCommentOpen((current) => ({ ...current, [postId]: !current[postId] }))
  const submitComment = (postId) => {
    const text = commentDrafts[postId]?.trim()
    if (!text) return
    actions.addPostComment(postId, text, currentUser?.name || 'You')
    setCommentDrafts((current) => ({ ...current, [postId]: '' }))
  }
  const sharePost = (post) => {
    const shareUrl = `${window.location.origin}/user/astrologer-profile?id=${encodeURIComponent(astrologer.id)}&post=${encodeURIComponent(post.id)}`
    const shareData = { title: post.title, text: post.body, url: shareUrl }
    const completeShare = () => {
      setShareMessage(`Shared “${post.title}”`)
      window.setTimeout(() => setShareMessage(''), 2200)
    }
    if (navigator.share) navigator.share(shareData).then(completeShare).catch(() => {})
    else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(shareUrl).then(completeShare).catch(completeShare)
    else completeShare()
  }

  const handleSubscribe = () => {
    actions.subscribeToAstrologer(astrologer.id, astrologer.name, currentUser?.id, currentUser?.name)
    setSubscribeSuccess(true)
  }
  const openBooking = () => {
    if (!subscribed) {
      setSubscriptionPromptOpen(true)
      return
    }
    const firstAvailableDate = Object.keys(availability).filter((date) => date >= todayKey).sort()[0] || ''
    setBookingForm({
      type: APPOINTMENT_TYPE,
      date: firstAvailableDate,
      time: '',
    })
    if (firstAvailableDate) setCalendarMonth(new Date(dateFromKey(firstAvailableDate).getFullYear(), dateFromKey(firstAvailableDate).getMonth(), 1))
    setBookingStep('form')
    setPaymentMethod('UPI')
    setBookedAppointmentId(null)
    setBookingOpen(true)
  }

  const handleConfirmBooking = () => {
    if (!bookingForm.date || !bookingForm.time) return
    setBookingStep('payment')
  }

  const handlePayment = () => {
    const newId = actions.bookAppointment({
      astrologerId: astrologer.id,
      astrologerName: astrologer.name,
      type: APPOINTMENT_TYPE,
      date: formatAppointmentDate(bookingForm.date),
      time: bookingForm.time,
      price: APPOINTMENT_PRICE,
    })
    setBookedAppointmentId(newId)
    setBookingStep('success')
    return newId
  }

  return (
    <div>
      {!isOwner && <PageHeader eyebrow="User portal" title="Astrologer Profile" showBack />}

      {isOwner ? (
      <div className="section social-profile">
        <Card className="social-profile__header">
          <div className="social-profile__cover" />
          <div className="social-profile__identity">
            <div className="social-profile__avatar">{astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
            <div className="social-profile__identity-copy">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="social-profile__name">{astrologer.name}</h1>
                <BadgeCheck size={18} className="text-[color:var(--primary)]" aria-label="Verified astrologer" />
              </div>
              <div className="muted">@{astrologer.name.toLowerCase().replace(/[^a-z0-9]+/g, '')} · {astrologer.specialization}</div>
              <div className="social-profile__meta"><MapPin size={14} /> India <span>·</span><Languages size={14} /> {astrologer.languages.join(', ')}</div>
            </div>
            <div className="social-profile__actions">
              {isOwner ? (
                <Link to={routes.accountProfile} className="btn btn-primary"><Pencil size={15} /> Edit Profile</Link>
              ) : (
                <>
                  <button type="button" className="btn btn-primary" onClick={subscribed ? () => setSubscribeSuccess(true) : handleSubscribe}>
                    <BadgeCheck size={15} /> {subscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => actions.toggleFollow(astrologer.id, astrologer.name, following)}>
                    {following ? <UserCheck size={15} /> : <UserPlus size={15} />} {following ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="social-profile__stats">
            <div><strong>{astrologer.experience}</strong><span>Experience</span></div>
            <div><strong>{astrologer.specialization.split(',').length}</strong><span>Astrology Types</span></div>
            <button type="button" className="social-profile__stat-button" onClick={() => setAudiencePanel('Followers')}><strong>{astrologer.followers.toLocaleString('en-IN')}</strong><span>Followers</span></button>
            <button type="button" className="social-profile__stat-button" onClick={() => setAudiencePanel('Subscribers')}><strong>{subscriberNames.length}</strong><span>Subscribers</span></button>
          </div>
          <div className="social-profile__bio">{astrologer.bio}</div>
        </Card>

        <div className="social-profile__tabs" role="tablist" aria-label="Astrologer profile sections">
          {[
            ['Posts', Grid3X3],
            ['Live', Radio],
            ['Services', Info],
          ].map(([label, Icon]) => (
            <button key={label} type="button" role="tab" aria-selected={activeTab === label} className={activeTab === label ? 'is-active' : ''} onClick={() => setActiveTab(label)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {activeTab === 'Posts' && (
          <div className="social-profile__posts">
            {PROFILE_POSTS.map((post) => <Card key={post.id} className={`social-profile__post social-profile__post--${post.tone}`}><div className="social-profile__post-icon"><Star size={20} /></div><h2>{post.title}</h2><p>{post.body}</p><span className="muted">Astrology insight · 2 days ago</span></Card>)}
          </div>
        )}
        {activeTab === 'Live' && (
          <div className="social-profile__posts">{liveSessions.length ? liveSessions.map((session) => <Card key={session.id} className="social-profile__post social-profile__post--coral"><div className="social-profile__post-icon"><Radio size={20} /></div><h2>{session.title}</h2><p>{session.status}</p><span className="muted">{session.time}</span></Card>) : <Card className="social-profile__panel"><div className="section-title">No live sessions yet</div><p className="muted">Upcoming live sessions will appear here.</p></Card>}</div>
        )}
        {activeTab === 'Services' && (
          <Card className="social-profile__panel"><div className="section-title">Services</div><div className="profile-service-status"><span className={`service-status-dot ${astrologerServices.available ? 'is-available' : 'is-unavailable'}`} />{astrologerServices.dndEnabled ? 'Dyan / DND mode — unavailable' : astrologerServices.isOnline ? 'Online' : 'Offline'}</div><div className="social-profile__details"><div><strong><PhoneCall size={14} /> Call</strong><span>{astrologerServices.callAvailable ? `Available · ₹${astrologerServices.callPricePerMinute}/min` : 'Unavailable'}</span></div><div><strong><MessageCircle size={14} /> Chat</strong><span>{astrologerServices.chatAvailable ? `Available · ₹${astrologerServices.chatPricePerMinute}/min` : 'Unavailable'}</span></div><div><strong>Specialization</strong><span>{astrologer.specialization}</span></div><div><strong>Languages</strong><span>{astrologer.languages.join(' · ')}</span></div></div></Card>
        )}

          {!isOwner && <div className="social-profile__footer-actions"><button type="button" className={`btn btn-outline${!canBookAppointment ? ' appointment-action--locked' : ''}`} aria-disabled={!canBookAppointment} onClick={openBooking}><CalendarPlus size={15} /> Book Appointment {!canBookAppointment && <span aria-hidden="true">🔒</span>}</button></div>}
      </div>
      ) : (
        <div className="astrologer-profile-compact">
          <Card className="section astrologer-compact-header">
            <div className="astrologer-compact-identity">
              <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] text-[18px] font-bold text-white">
                {astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
              </div>
              <div className="astrologer-compact-identity-copy">
                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>{astrologer.name}</div>
                <div className="muted">{astrologer.specialization}</div>
                {showPreferenceChips && <div className="astrologer-preference-chips"><div><small>Astrologer Type</small><div>{selectedAstrologerTypes.map((value) => <span key={value}>{value}</span>)}</div></div><div><small>Consultation For</small><div>{selectedConsultationTitles.map((value) => <span key={value}>{value}</span>)}</div></div></div>}
                <div className="astrologer-inline-about"><span>About</span>{astrologer.bio}</div>
                <div className="astrologer-profile-highlights"><span><strong>{astrologer.experience}</strong> Experience</span><span><Star size={13} /> <strong>{astrologer.rating}</strong><small>{astrologer.reviews}</small></span></div>
              </div>
            </div>
            <div className="astrologer-compact-actions"><button type="button" className="btn btn-primary" onClick={subscribed ? () => setSubscribeSuccess(true) : handleSubscribe}>
              <BadgeCheck size={15} /> {subscribed ? 'Subscribed' : 'Subscribe'}
            </button><button type="button" className="btn btn-outline" onClick={() => actions.toggleFollow(astrologer.id, astrologer.name, following)}>
              {following ? <UserCheck size={15} /> : <UserPlus size={15} />} {following ? 'Following' : 'Follow'}
            </button>{subscribed && <div className="subscription-status" role="status"><CalendarClock size={15} /><span><strong>Subscribed</strong><small>Subscription ends {subscriptionDaysRemaining === 1 ? 'tomorrow' : `in ${subscriptionDaysRemaining} days`}</small></span></div>}</div>
          </Card>
          <Card className="section astrologer-compact-stats">
            <div className="section-title">Stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}><div className="stat-icon tone-violet"><Users size={16} /></div><div><div className="stat-value">{astrologer.followers.toLocaleString('en-IN')}</div><div className="stat-label">followers</div></div></div>
              <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}><div className="stat-icon tone-violet"><BadgeCheck size={16} /></div><div><div className="stat-value">{subscriberNames.length.toLocaleString('en-IN')}</div><div className="stat-label">subscribers</div></div></div>
              <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}><div className="stat-icon tone-violet"><CalendarPlus size={16} /></div><div><div className="stat-value">3,850</div><div className="stat-label">consultations</div></div></div>
            </div>
          </Card>
          <section className="astrologer-consultation"><div className="astrologer-consultation__heading"><span className="profile-kicker">CONSULTATION OPTIONS</span></div><div className="astrologer-quick-actions"><Link to={`${routes.chatBooking}?id=${astrologer.id}`} className="btn btn-primary"><MessageCircle size={16} /> Chat</Link><Link to={`${routes.callPackages}?id=${astrologer.id}`} className="btn btn-primary"><PhoneCall size={16} /> Call</Link><button type="button" className={`btn btn-primary${!canBookAppointment ? ' appointment-action--locked' : ''}`} aria-disabled={!canBookAppointment} onClick={openBooking}><CalendarPlus size={16} /> Book Appointment {!canBookAppointment && <span aria-hidden="true">🔒</span>}</button></div>{!canBookAppointment && <p className="appointment-subscription-hint">Subscribe to this astrologer to book an appointment.</p>}</section>
          <section className="astrologer-content astrologer-footer-content"><div className="astrologer-footer-tabs" role="tablist" aria-label="Astrologer content"><button type="button" className={footerTab === 'Posts' ? 'is-active' : ''} onClick={() => setFooterTab('Posts')}><Grid3X3 size={15} /> Posts</button><button type="button" className={footerTab === 'Live' ? 'is-active' : ''} onClick={() => setFooterTab('Live')}><Radio size={15} /> Live</button><button type="button" className={footerTab === 'Saved Posts' ? 'is-active' : ''} onClick={() => setFooterTab('Saved Posts')}><Bookmark size={15} /> Saved Posts</button></div>
            {footerTab === 'Live' ? <div className="astrologer-live-groups">{liveGroups.map(([label, sessions]) => <section className="astrologer-live-group" key={label}><h3>{label}</h3>{sessions.length ? <div className="astrologer-live-group__list">{sessions.map((session) => <article className="astrologer-live-card" key={session.id}><span className="astrologer-live-badge"><Radio size={12} /> {session.status}</span><h4>{session.title}</h4><p>{session.time}</p></article>)}</div> : <p className="muted">No {label.toLowerCase()} sessions.</p>}</section>)}</div> : <div className="astrologer-post-list">{visiblePosts.length ? visiblePosts.map((post) => { const access = post.interactionAccess || { like: true, comment: post.commentsEnabled !== false, share: true, save: true }; return <article className={`astrologer-post-card astrologer-post-card--${post.tone}`} key={post.id}><div className="astrologer-content-card__top"><span className="astrologer-content-card__avatar">{astrologer.name.slice(0, 1)}</span><span><b>{astrologer.name}</b><small>{new Date(post.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small></span></div><h3>{post.title}</h3><p>{post.body}</p><div className="astrologer-post-actions">{access.like && <button type="button" className={postLikes[post.id] ? 'is-active' : ''} onClick={() => actions.togglePostLike(post.id)}><Heart size={15} fill={postLikes[post.id] ? 'currentColor' : 'none'} /> {(post.likeCount || 0) + (postLikes[post.id] ? 1 : 0)}</button>}{access.share && <button type="button" onClick={() => sharePost(post)}><Share2 size={15} /> Share</button>}{access.comment && <button type="button" onClick={() => toggleComment(post.id)}><MessageCircle size={15} /> {(postComments[post.id] || []).length}</button>}{access.save && <button type="button" className={savedPostIds.includes(post.id) ? 'is-active' : ''} onClick={() => actions.toggleSavedPost(post.id)}><Bookmark size={15} fill={savedPostIds.includes(post.id) ? 'currentColor' : 'none'} /> {savedPostIds.includes(post.id) ? 'Saved' : 'Save'}</button>}</div>{!access.comment && (postComments[post.id] || []).length > 0 && <div className="astrologer-post-comments"><div className="astrologer-post-comments__list">{(postComments[post.id] || []).map((comment) => <p key={comment.id}><b>{comment.author}</b> {comment.text}</p>)}</div><p className="muted">Comments are turned off for this post.</p></div>}{access.comment && commentOpen[post.id] && <div className="astrologer-post-comments"><div className="astrologer-post-comments__list">{(postComments[post.id] || []).map((comment) => <p key={comment.id}><b>{comment.author}</b> {comment.text}</p>)}</div><div className="astrologer-post-comment-form"><input value={commentDrafts[post.id] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Write a comment" /><button type="button" className="btn btn-primary" onClick={() => submitComment(post.id)}>Post</button></div></div>}</article> }) : <div className="astrologer-post-empty"><Bookmark size={22} /><h3>{footerTab === 'Saved Posts' ? 'No saved posts yet' : 'No posts yet'}</h3><p>{footerTab === 'Saved Posts' ? 'Posts you save from astrologers will appear here.' : 'New posts from this astrologer will appear here.'}</p></div>}</div>}
            {shareMessage && <div className="astrologer-share-feedback" role="status">{shareMessage}</div>}
          </section>
        </div>
      )}

      {isOwner && audiencePanel && (
        <div className="modal-overlay user-modal-overlay" onClick={() => setAudiencePanel(null)}>
          <div className="modal-card user-modal-card" style={{ width: 'min(420px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>{audiencePanel}</div>
              <button type="button" className="icon-btn" aria-label={`Close ${audiencePanel} list`} onClick={() => setAudiencePanel(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content user-modal-card__content">
              <div className="social-profile__audience-list">
                {(audiencePanel === 'Followers' ? PROFILE_FOLLOWERS : subscriberNames).length ? (audiencePanel === 'Followers' ? PROFILE_FOLLOWERS : subscriberNames).map((name, index) => (
                  <div key={`${name}-${index}`} className="social-profile__audience-item"><div className="social-profile__audience-avatar">{name.slice(0, 1).toUpperCase()}</div><strong>{name}</strong></div>
                )) : <div className="muted">No {audiencePanel.toLowerCase()} yet.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {bookingOpen && (
        <div className="modal-overlay user-modal-overlay" onClick={() => setBookingOpen(false)}>
          <div className="modal-card user-modal-card appointment-booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header appointment-booking-modal__header flex items-start justify-between gap-4">
              <div><div className="section-title" style={{ marginBottom: 3 }}>Book Appointment</div><p>Choose your preferred date and time</p></div>
              <button type="button" className="icon-btn" aria-label="Close booking popup" onClick={() => setBookingOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-card__content user-modal-card__content">
              {bookingStep === 'form' && <div className="appointment-booking-form">
                <label className="field-group appointment-booking-field" style={{ margin: 0 }}>
                  <span className="field-label-top">Appointment Type</span>
                  <select className="select-input appointment-type-select" aria-label="Appointment Type" value={APPOINTMENT_TYPE} disabled><option value={APPOINTMENT_TYPE}>{APPOINTMENT_TYPE}</option></select>
                </label>
                <div className="appointment-booking-section-label">Select Date</div>
                <div className="field-group availability-picker" style={{ margin: 0 }}>
                  <span className="sr-only">Select Available Date</span>
                  <div className="availability-calendar">
                    <div className="availability-calendar__header"><button type="button" className="icon-btn" aria-label="Previous month" disabled={calendarMonth.getFullYear() === new Date().getFullYear() && calendarMonth.getMonth() <= new Date().getMonth()} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>‹</button><strong>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><button type="button" className="icon-btn" aria-label="Next month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>›</button></div>
                    <div className="availability-calendar__weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
                    <div className="availability-calendar__days">{monthDays.map((day) => { const key = dateKey(day); const available = Boolean(availability[key]?.length) && key >= todayKey; const inMonth = day.getMonth() === calendarMonth.getMonth(); return <button type="button" key={key} className={`${available ? 'is-available' : ''}${bookingForm.date === key ? ' is-selected' : ''}${!inMonth ? ' is-outside' : ''}`} disabled={!available} onClick={() => setBookingForm({ ...bookingForm, date: key, time: '' })}>{day.getDate()}</button> })}</div>
                  </div>
                </div>
                <div className="appointment-booking-section-label">Available Time Slots</div>
                <div className="field-group availability-picker" style={{ margin: 0 }}>
                  {bookingForm.date ? <div className="availability-slots"><strong>{displayDateKey(bookingForm.date)}</strong>{selectedDateSlots.length ? <div>{selectedDateSlots.map((slot) => { const booked = bookedSlots.has(`${displayDateKey(bookingForm.date)}|${slot}`); return <button type="button" key={slot} className={bookingForm.time === slot ? 'is-selected' : ''} disabled={booked} onClick={() => setBookingForm({ ...bookingForm, time: slot })}>{slot}{booked && <small>Booked</small>}</button> })}</div> : <p className="availability-empty">No available slots for this date.</p>}</div> : <p className="availability-empty">Select an available date to see time slots.</p>}
                </div>
                <div className="appointment-price-summary"><span>Appointment Price</span><strong>₹{APPOINTMENT_PRICE}</strong></div>
                {bookingForm.date && bookingForm.time && <div className="appointment-booking-summary"><div className="appointment-booking-section-label">Booking Summary</div><div><span>Appointment</span><strong>{APPOINTMENT_TYPE}</strong></div><div><span>Date</span><strong>{displayDateKey(bookingForm.date)}</strong></div><div><span>Time</span><strong>{bookingForm.time}</strong></div><div><span>Price</span><strong>₹{APPOINTMENT_PRICE}</strong></div></div>}
              </div>}
              {bookingStep === 'payment' && <div className="appointment-payment-step">
                <div className="appointment-payment-summary"><strong>{astrologer.name}</strong><span>{APPOINTMENT_TYPE}</span><span>{formatAppointmentDate(bookingForm.date)} · {bookingForm.time}</span><b>₹{APPOINTMENT_PRICE}</b></div>
                <div className="field-label-top">Payment Method</div>
                <div className="appointment-payment-methods">{['UPI', 'Card', 'Wallet'].map((method) => <button type="button" key={method} className={paymentMethod === method ? 'is-selected' : ''} onClick={() => setPaymentMethod(method)}>{method}</button>)}</div>
                <div className="appointment-payment-total"><span>Total payable</span><strong>₹{APPOINTMENT_PRICE}</strong></div>
              </div>}
              {bookingStep === 'success' && <div className="appointment-booking-success"><div>✓</div><h3>Appointment booked successfully</h3><p>Your Audio Call appointment with {astrologer.name} is confirmed.</p><span>{formatAppointmentDate(bookingForm.date)} · {bookingForm.time} · ₹{APPOINTMENT_PRICE}</span></div>}
            </div>
            <div className="modal-card__footer user-modal-card__footer appointment-booking-modal__footer">
              {bookingStep !== 'success' && <button className="btn btn-ghost" type="button" onClick={() => setBookingOpen(false)}>Cancel</button>}
              {bookingStep === 'form' && <button className="btn btn-primary" type="button" disabled={!bookingForm.date || !bookingForm.time} onClick={handleConfirmBooking}>Confirm Booking</button>}
              {bookingStep === 'payment' && <button className="btn btn-primary" type="button" onClick={handlePayment}>Pay ₹{APPOINTMENT_PRICE} &amp; Book</button>}
              {bookingStep === 'success' && <button className="btn btn-primary" type="button" onClick={() => { setBookingOpen(false); navigate(`${routes.appointmentDetails}?id=${bookedAppointmentId}`) }}>Done</button>}
            </div>
          </div>
        </div>
      )}

      {subscriptionPromptOpen && (
        <div className="modal-overlay user-modal-overlay" onClick={() => setSubscriptionPromptOpen(false)}>
          <div className="modal-card user-modal-card subscription-prompt-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>Subscription required</div>
              <button type="button" className="icon-btn" aria-label="Close subscription prompt" onClick={() => setSubscriptionPromptOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-card__content user-modal-card__content" style={{ textAlign: 'center' }}>
              <div className="subscription-prompt-card__icon">🔒</div>
              <p className="muted">Subscribe to this astrologer to book an appointment.</p>
            </div>
            <div className="modal-card__footer user-modal-card__footer" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setSubscriptionPromptOpen(false)}>Not now</button>
              <button type="button" className="btn btn-primary" onClick={() => { setSubscriptionPromptOpen(false); handleSubscribe() }}>Subscribe Now</button>
            </div>
          </div>
        </div>
      )}

      {subscribeSuccess && (
        <div className="modal-overlay user-modal-overlay" onClick={() => setSubscribeSuccess(false)}>
          <div
            className="modal-card user-modal-card"
            style={{ width: 'min(420px, calc(100vw - 32px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>Subscription Successful</div>
              <button type="button" className="icon-btn" aria-label="Close subscription popup" onClick={() => setSubscribeSuccess(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-card__content user-modal-card__content" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
              <p className="muted" style={{ lineHeight: 1.7 }}>
                You are now a subscriber of <strong style={{ color: 'var(--ink)' }}>{astrologer.name}</strong>.<br />
                You get <strong style={{ color: 'var(--ink)' }}>1 Discount Question</strong> valid for{' '}
                <strong style={{ color: 'var(--ink)' }}>15 days</strong>.
              </p>
            </div>
            <div className="modal-card__footer user-modal-card__footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-ghost" type="button" onClick={() => setSubscribeSuccess(false)}>
                Later
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  setSubscribeSuccess(false)
                  navigate(`${routes.askQuestion}?useDiscount=1`)
                }}
              >
                Ask Discount Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
