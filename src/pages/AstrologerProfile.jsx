import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus, UserCheck, Star, CalendarPlus, CalendarClock, BadgeCheck, Bookmark, Heart, X, Grid3X3, Info, MessageCircle, PhoneCall, Radio, MapPin, Languages, Pencil, Share2, Users } from 'lucide-react'
import { mockAstrologerPosts, mockAstrologers, mockLiveSessions } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'

const APPOINTMENT_TYPE = 'Audio Call'

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
  const { followedAstrologerIds, actions, subscriptions, astrologerServices, postLikes, savedPostIds, postComments } = useAppData()
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
  const [subscribeSuccess, setSubscribeSuccess] = useState(false)
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
  const astrologerPosts = mockAstrologerPosts.filter((post) => post.astrologerId === astrologer.id)
  const savedPosts = mockAstrologerPosts.filter((post) => savedPostIds.includes(post.id))
  const visiblePosts = footerTab === 'Saved Posts' ? savedPosts : astrologerPosts
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
    setShareMessage(`Shared “${post.title}”`)
    window.setTimeout(() => setShareMessage(''), 2200)
  }

  const handleSubscribe = () => {
    actions.subscribeToAstrologer(astrologer.id, astrologer.name, currentUser?.id, currentUser?.name)
    setSubscribeSuccess(true)
  }
  const [bookingForm, setBookingForm] = useState({
    type: APPOINTMENT_TYPE,
    date: toInputDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    time: '10:00 AM',
  })

  const openBooking = () => {
    setBookingForm({
      type: APPOINTMENT_TYPE,
      date: toInputDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      time: '10:00 AM',
    })
    setBookingOpen(true)
  }

  const handleConfirmBooking = () => {
    const newId = actions.bookAppointment({
      astrologerId: astrologer.id,
      astrologerName: astrologer.name,
      type: APPOINTMENT_TYPE,
      date: formatAppointmentDate(bookingForm.date),
      time: bookingForm.time,
    })
    setBookingOpen(false)
    navigate(`${routes.appointmentDetails}?id=${newId}`)
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

        {!isOwner && canBookAppointment && <div className="social-profile__footer-actions"><button type="button" className="btn btn-outline" onClick={openBooking}><CalendarPlus size={15} /> Book Appointment</button></div>}
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
          <section className="astrologer-consultation"><div className="astrologer-consultation__heading"><span className="profile-kicker">CONSULTATION OPTIONS</span></div><div className="astrologer-quick-actions"><Link to={`${routes.chatBooking}?id=${astrologer.id}`} className="btn btn-primary"><MessageCircle size={16} /> Chat</Link><Link to={`${routes.callPackages}?id=${astrologer.id}`} className="btn btn-primary"><PhoneCall size={16} /> Call</Link>{canBookAppointment && <button type="button" className="btn btn-primary" onClick={openBooking}><CalendarPlus size={16} /> Book Appointment</button>}</div></section>
          <section className="astrologer-content astrologer-footer-content"><div className="astrologer-footer-tabs" role="tablist" aria-label="Astrologer content"><button type="button" className={footerTab === 'Posts' ? 'is-active' : ''} onClick={() => setFooterTab('Posts')}><Grid3X3 size={15} /> Posts</button><button type="button" className={footerTab === 'Live' ? 'is-active' : ''} onClick={() => setFooterTab('Live')}><Radio size={15} /> Live</button><button type="button" className={footerTab === 'Saved Posts' ? 'is-active' : ''} onClick={() => setFooterTab('Saved Posts')}><Bookmark size={15} /> Saved Posts</button></div>
            {footerTab === 'Live' ? <div className="astrologer-live-groups">{liveGroups.map(([label, sessions]) => <section className="astrologer-live-group" key={label}><h3>{label}</h3>{sessions.length ? <div className="astrologer-live-group__list">{sessions.map((session) => <article className="astrologer-live-card" key={session.id}><span className="astrologer-live-badge"><Radio size={12} /> {session.status}</span><h4>{session.title}</h4><p>{session.time}</p></article>)}</div> : <p className="muted">No {label.toLowerCase()} sessions.</p>}</section>)}</div> : <div className="astrologer-post-list">{visiblePosts.length ? visiblePosts.map((post) => <article className={`astrologer-post-card astrologer-post-card--${post.tone}`} key={post.id}><div className="astrologer-content-card__top"><span className="astrologer-content-card__avatar">{astrologer.name.slice(0, 1)}</span><span><b>{astrologer.name}</b><small>{new Date(post.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small></span></div><h3>{post.title}</h3><p>{post.body}</p><div className="astrologer-post-actions"><button type="button" className={postLikes[post.id] ? 'is-active' : ''} onClick={() => actions.togglePostLike(post.id)}><Heart size={15} fill={postLikes[post.id] ? 'currentColor' : 'none'} /> {post.likeCount + (postLikes[post.id] ? 1 : 0)}</button><button type="button" onClick={() => sharePost(post)}><Share2 size={15} /> Share</button><button type="button" onClick={() => toggleComment(post.id)}><MessageCircle size={15} /> {(postComments[post.id] || []).length}</button><button type="button" className={savedPostIds.includes(post.id) ? 'is-active' : ''} onClick={() => actions.toggleSavedPost(post.id)}><Bookmark size={15} fill={savedPostIds.includes(post.id) ? 'currentColor' : 'none'} /> {savedPostIds.includes(post.id) ? 'Saved' : 'Save'}</button></div>{commentOpen[post.id] && <div className="astrologer-post-comments"><div className="astrologer-post-comments__list">{(postComments[post.id] || []).map((comment) => <p key={comment.id}><b>{comment.author}</b> {comment.text}</p>)}</div><div className="astrologer-post-comment-form"><input value={commentDrafts[post.id] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Write a comment" /><button type="button" className="btn btn-primary" onClick={() => submitComment(post.id)}>Post</button></div></div>}</article>) : <div className="astrologer-post-empty"><Bookmark size={22} /><h3>{footerTab === 'Saved Posts' ? 'No saved posts yet' : 'No posts yet'}</h3><p>{footerTab === 'Saved Posts' ? 'Posts you save from astrologers will appear here.' : 'New posts from this astrologer will appear here.'}</p></div>}</div>}
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
          <div className="modal-card user-modal-card" style={{ width: 'min(420px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>Book Appointment</div>
              <button type="button" className="icon-btn" aria-label="Close booking popup" onClick={() => setBookingOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-card__content user-modal-card__content">
              <div style={{ display: 'grid', gap: 16 }}>
                <div className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Appointment Type</span>
                  <div className="text-input" aria-label="Appointment Type">{APPOINTMENT_TYPE}</div>
                </div>
              <label className="field-group" style={{ margin: 0 }}>
                <span className="field-label-top">Date</span>
                <input
                  type="date"
                  className="text-input"
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                />
              </label>
              <label className="field-group" style={{ margin: 0 }}>
                <span className="field-label-top">Time</span>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="10:00 AM"
                    value={bookingForm.time}
                    onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                  />
                </label>
              </div>
            </div>
            <div className="modal-card__footer user-modal-card__footer">
              <button className="btn btn-ghost" type="button" onClick={() => setBookingOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={handleConfirmBooking}>
                Confirm Booking
              </button>
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
