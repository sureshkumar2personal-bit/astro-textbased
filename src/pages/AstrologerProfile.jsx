import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus, UserCheck, Star, CalendarPlus, BadgeCheck, X, Grid3X3, Info, MessageCircle, MapPin, Languages, Pencil } from 'lucide-react'
import { mockAstrologers } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'

const CONSULTATION_TYPES = ['Video Consultation', 'Voice Consultation', 'Chat Consultation']

const PROFILE_POSTS = [
  { id: 'post-1', tone: 'violet', title: 'Understanding the right time to begin', body: 'Timing becomes clearer when preparation and patience work together. Look for the small signs that your next step is ready.' },
  { id: 'post-2', tone: 'coral', title: 'A simple weekly reflection', body: 'Write down one question, one intention, and one action for the week ahead. Clarity grows through consistent reflection.' },
  { id: 'post-3', tone: 'gold', title: 'Your chart is a guide', body: 'Astrology can help you understand patterns, but your choices give those patterns direction.' },
]

const PROFILE_REVIEWS = [
  { id: 'review-1', name: 'Priya V.', rating: 5, text: 'Thoughtful guidance and a very clear explanation of the timing.' },
  { id: 'review-2', name: 'Kannan', rating: 5, text: 'The consultation felt personal, practical, and easy to understand.' },
  { id: 'review-3', name: 'Devi', rating: 4, text: 'Helpful perspective with suggestions I could actually follow.' },
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

export default function AstrologerProfile() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { followedAstrologerIds, actions, subscriptions } = useAppData()
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
  const subscribed = subscriptions.some(
    (sub) => sub.userId === currentUser?.id && sub.astrologerId === astrologer.id,
  )
  const [bookingOpen, setBookingOpen] = useState(false)
  const [subscribeSuccess, setSubscribeSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('Posts')
  const [audiencePanel, setAudiencePanel] = useState(null)
  const subscriberNames = subscriptions
    .filter((subscription) => subscription.astrologerId === astrologer.id)
    .map((subscription) => subscription.userName || subscription.userId || 'Subscriber')

  const handleSubscribe = () => {
    actions.subscribeToAstrologer(astrologer.id, astrologer.name, currentUser?.id, currentUser?.name)
    setSubscribeSuccess(true)
  }
  const [bookingForm, setBookingForm] = useState({
    type: CONSULTATION_TYPES[0],
    date: toInputDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    time: '10:00 AM',
  })

  const openBooking = () => {
    setBookingForm({
      type: CONSULTATION_TYPES[0],
      date: toInputDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      time: '10:00 AM',
    })
    setBookingOpen(true)
  }

  const handleConfirmBooking = () => {
    const newId = actions.bookAppointment({
      astrologerId: astrologer.id,
      astrologerName: astrologer.name,
      type: bookingForm.type,
      date: formatAppointmentDate(bookingForm.date),
      time: bookingForm.time,
    })
    setBookingOpen(false)
    navigate(`${routes.appointmentDetails}?id=${newId}`)
  }

  return (
    <div>
      <PageHeader eyebrow={isOwner ? 'Astrologer' : 'User portal'} title="Astrologer Profile" showBack backTo={routes.dashboard} />

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
            ['About', Info],
            ['Reviews', MessageCircle],
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
        {activeTab === 'About' && (
          <Card className="social-profile__panel"><div className="section-title">About {astrologer.name}</div><p className="muted">{astrologer.bio}</p><div className="social-profile__details"><div><strong>Specialization</strong><span>{astrologer.specialization}</span></div><div><strong>Languages</strong><span>{astrologer.languages.join(' · ')}</span></div><div><strong>Availability</strong><span>{astrologer.availability}</span></div><div><strong>Consultations</strong><span>{CONSULTATION_TYPES.join(' · ')}</span></div></div></Card>
        )}
        {activeTab === 'Reviews' && (
          <div className="social-profile__reviews">{PROFILE_REVIEWS.map((review) => <Card key={review.id} className="social-profile__review"><div className="flex items-center justify-between gap-3"><strong>{review.name}</strong><span className="social-profile__rating"><Star size={14} /> {review.rating}.0</span></div><p className="muted">{review.text}</p></Card>)}</div>
        )}

        {!isOwner && <div className="social-profile__footer-actions"><button type="button" className="btn btn-outline" onClick={openBooking}><CalendarPlus size={15} /> Book Appointment</button><Link to={routes.askQuestion} className="btn btn-primary">Ask a Question</Link></div>}
      </div>
      ) : (
        <>
          <Card className="section" style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] text-[18px] font-bold text-white">
                {astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>{astrologer.name}</div>
                <div className="muted">{astrologer.specialization}</div>
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={subscribed ? () => setSubscribeSuccess(true) : handleSubscribe}>
              <BadgeCheck size={15} /> {subscribed ? 'Subscribed' : 'Subscribe'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => actions.toggleFollow(astrologer.id, astrologer.name, following)}>
              {following ? <UserCheck size={15} /> : <UserPlus size={15} />} {following ? 'Following' : 'Follow'}
            </button>
          </Card>
          <Card className="section"><div className="section-title">About</div><div className="muted" style={{ lineHeight: 1.7 }}>{astrologer.bio}</div></Card>
          <Card className="section">
            <div className="section-title">Stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}><div className="stat-icon tone-gold"><Star size={18} /></div><div><div className="stat-value">{astrologer.rating}</div><div className="stat-label">{astrologer.reviews}</div></div></div>
              <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}><div className="stat-icon tone-violet"><Star size={18} /></div><div><div className="stat-value">{astrologer.followers.toLocaleString('en-IN')}</div><div className="stat-label">followers</div></div></div>
              <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}><div className="stat-icon tone-sky"><Star size={18} /></div><div><div className="stat-value">{astrologer.experience}</div><div className="stat-label">experience</div></div></div>
            </div>
          </Card>
          <div className="section" style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}><button type="button" className="btn btn-outline" onClick={openBooking}><CalendarPlus size={15} /> Book Appointment</button><Link to={routes.askQuestion} className="btn btn-primary">Ask a Question</Link></div>
        </>
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
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Consultation Type</span>
                <select
                  className="select-input"
                  value={bookingForm.type}
                  onChange={(e) => setBookingForm({ ...bookingForm, type: e.target.value })}
                >
                  {CONSULTATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
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
