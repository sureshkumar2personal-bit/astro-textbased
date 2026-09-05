import { Activity, ArrowLeft, Ban, BadgeCheck, CircleAlert, Headphones, MessageCircle, MoreVertical, PhoneCall, Share2, ShieldAlert, UserRoundX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import { PROFILE_FOLLOWERS, PROFILE_SUBSCRIBERS, TIER_PRICES, accountHandle } from '../data/audienceMembers.js'
import { appointmentCustomers } from '../data/notificationData.js'
import { mockAstrologers } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { ACTIVITY_TYPES, getMemberCommunicationActivity } from '../utils/memberCommunicationActivity.js'

const POSTS = [
  { title: 'A calm start changes everything', body: 'Beginning the day with a quiet intention helps me return to clarity when life feels busy.', time: '2 days ago' },
  { title: 'A little gratitude today', body: 'Feeling thankful for the guidance, reflection, and supportive community I have found here.', time: '1 week ago' },
]

function initials(name) {
  return name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'U'
}

function memberDetails(member, isSubscriber) {
  const base = [
    ['Guidance focus', 'Exploring career guidance through astrology'],
    ['Community style', 'Enjoys practical spiritual daily rituals'],
    ['Preferred sessions', 'Values calm thoughtful live discussions'],
    ['Journey goal', 'Seeking clarity for meaningful decisions'],
    ['Member since', 'Growing with Astro Connect community'],
  ]
  return isSubscriber ? [['Subscription', `${member.tier || 'Silver'} membership is active today`], ...base.slice(1)] : base
}

function activityIcon(entry) {
  if (entry.type === ACTIVITY_TYPES.QUESTION) return MessageCircle
  if (entry.type === ACTIVITY_TYPES.ANSWER) return BadgeCheck
  if (entry.type === ACTIVITY_TYPES.DISPUTE) return CircleAlert
  if (entry.type === ACTIVITY_TYPES.CONSULTATION) return entry.sessionType === 'Audio Call' ? PhoneCall : Headphones
  return Activity
}

function activityDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || 'Unknown date'
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AudienceMemberProfile() {
  const { audienceType, memberId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { subscriptions, blockedUserIds, actions, questions, consultationHistory, appointments } = useAppData()
  const [activeTab, setActiveTab] = useState('Posts')
  const [menuOpen, setMenuOpen] = useState(false)
  const [message, setMessage] = useState('')
  const menuRef = useRef(null)
  const isSubscriber = audienceType === 'subscriber'
  const isFollower = audienceType === 'follower'
  const audienceLabel = isSubscriber ? 'Subscribers' : 'Followers'
  const astrologer = mockAstrologers.find((profile) => profile.id === currentUser?.id) || mockAstrologers[0]

  const subscribers = useMemo(() => {
    const live = subscriptions
      .filter((subscription) => subscription.astrologerId === currentUser?.id || subscription.astrologerId === astrologer.id)
      .map((subscription) => ({
        id: subscription.userId,
        name: subscription.userName || subscription.userId || 'Subscriber',
        username: accountHandle({ username: subscription.userUsername, id: subscription.userId }),
        bio: 'Astro Connect subscriber following astrology guidance and live sessions.',
        tier: subscription.tier || 'Silver',
      }))
    return [...new Map([...PROFILE_SUBSCRIBERS, ...live].map((entry) => [entry.id, entry])).values()]
  }, [astrologer.id, currentUser?.id, subscriptions])

  const member = (isSubscriber ? subscribers : isFollower ? PROFILE_FOLLOWERS : []).find((entry) => entry.id === memberId)
    || appointmentCustomers[memberId]
  const communicationActivity = useMemo(() => getMemberCommunicationActivity({
    questions,
    consultationHistory,
    appointments,
    userId: member?.userId || member?.id,
    astrologerId: astrologer.id,
  }), [appointments, astrologer.id, consultationHistory, member?.id, member?.userId, questions])

  useEffect(() => {
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (!member) {
    return <div className="audience-member-page"><Card className="audience-member-not-found"><CircleAlert size={28} /><h1>Member profile not found</h1><p>This audience member is unavailable or the profile link is invalid.</p><button type="button" className="btn btn-primary" onClick={() => navigate('/astrologer')}>Return to dashboard</button></Card></div>
  }

  const blocked = blockedUserIds.includes(member.id)
  const backTo = '/astrologer'
  const handleAction = (action) => {
    setMenuOpen(false)
    if (action === 'block') {
      actions.toggleUserBlock(member.id)
      setMessage(blocked ? `${member.name} has been unblocked.` : `${member.name} has been blocked.`)
      return
    }
    const messages = {
      restrict: `${member.name} has been restricted.`,
      report: 'Report submitted for review.',
      share: 'Share options opened.',
      about: 'Account information is shown in the About tab.',
      warning: `Warning sent to ${member.name}.`,
    }
    setMessage(messages[action])
  }

  return <div className="audience-member-page">
    <div className="audience-member-page__topbar">
      <button type="button" className="btn btn-ghost audience-member-page__back" onClick={() => navigate(backTo)}><ArrowLeft size={16} /> Back to {audienceLabel}</button>
      <div className="member-profile-menu-wrap audience-member-actions" ref={menuRef}>
        <button type="button" className="btn btn-outline audience-member-actions__button" aria-label="Open account actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><MoreVertical size={18} /> Actions</button>
        {menuOpen && <div className="member-profile-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => handleAction('block')}><Ban size={15} /> {blocked ? 'Unblock' : 'Block'}</button>
          <button type="button" role="menuitem" onClick={() => handleAction('restrict')}><UserRoundX size={15} /> Restrict</button>
          <button type="button" role="menuitem" onClick={() => handleAction('report')}><ShieldAlert size={15} /> Report</button>
          <button type="button" role="menuitem" onClick={() => handleAction('share')}><Share2 size={15} /> Share to</button>
          <button type="button" role="menuitem" onClick={() => { setActiveTab('About'); handleAction('about') }}><CircleAlert size={15} /> About this account</button>
          <button type="button" role="menuitem" onClick={() => handleAction('warning')}><CircleAlert size={15} /> Send warning</button>
        </div>}
      </div>
    </div>

    <Card className="audience-member-hero">
      <div className="audience-member-hero__cover" />
      <div className="audience-member-hero__body">
        <div className="audience-member-avatar">{initials(member.name)}</div>
        <div className="audience-member-identity">
          <div className="flex flex-wrap items-center gap-2"><h1>{member.name}</h1><span className={`audience-member-status${isSubscriber ? ' audience-member-status--subscriber' : ''}`}>{isSubscriber ? `${member.tier || 'Silver'} Subscriber` : 'Follower'}</span></div>
          <span>@{accountHandle(member)}</span>
          <code>Member ID: {member.id}</code>
        </div>
        {isSubscriber && <div className={`audience-member-tier audience-member-tier--${(member.tier || 'Silver').toLowerCase()}`}><small>ACTIVE MEMBERSHIP</small><strong>{member.tier || 'Silver'}</strong><span>₹{TIER_PRICES[member.tier] || TIER_PRICES.Silver}/month</span></div>}
      </div>
      <div className="audience-member-hero__summary"><span>{isSubscriber ? 'Subscriber since this month' : 'Following this astrologer'}</span><span className={blocked ? 'is-blocked' : 'is-active'}>{blocked ? 'Blocked account' : 'Active account'}</span></div>
    </Card>

    <div className="audience-member-tabs" role="tablist" aria-label="Member profile sections">
      {['Posts', 'Activity', 'About'].map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'is-active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}
    </div>
    <section className="audience-member-content">
      {activeTab === 'Posts' && <div className="audience-member-posts">{POSTS.map((post) => <Card key={post.title} className="audience-member-post"><div className="audience-member-post__avatar">{initials(member.name)}</div><div><div className="audience-member-post__meta"><strong>{member.name}</strong><span>{post.time}</span></div><h2>{post.title}</h2><p>{post.body}</p></div></Card>)}</div>}
      {activeTab === 'Activity' && <Card className="audience-member-panel"><h2>Communication history</h2><p className="muted">History between {member.name} and this astrologer.</p>{communicationActivity.length ? <div className="audience-member-activity">{communicationActivity.map((entry) => { const Icon = activityIcon(entry); return <div key={entry.id} className="audience-member-activity__item"><span><Icon size={17} /></span><p><strong>{entry.title}</strong><em>{entry.summary}</em><small>{activityDate(entry.occurredAt)} · {entry.status}{entry.metadata ? ` · ${entry.metadata}` : ''}</small></p></div> })}</div> : <div className="audience-member-activity-empty"><Activity size={20} /><p>No communication history with this astrologer yet.</p></div>}</Card>}
      {activeTab === 'About' && <Card className="audience-member-panel"><h2>About {member.name}</h2><div className="audience-member-details">{memberDetails(member, isSubscriber).map(([label, value]) => <div key={label}><strong>{label}</strong><span>{value}</span></div>)}</div></Card>}
      {message && <div className="profile-message profile-message--success audience-member-message">{message}</div>}
    </section>
  </div>
}
