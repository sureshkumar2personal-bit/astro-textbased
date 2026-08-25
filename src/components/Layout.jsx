import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Sparkles,
  Gift,
  LayoutDashboard,
  ShoppingBag,
  CircleHelp,
  ListChecks,
  Gavel,
  Bell,
  ChevronRight,
  Wallet,
  LogOut,
  MessageCircle,
  PhoneCall,
  PhoneOff,
  X,
  ChevronDown,
  UserRound,
} from 'lucide-react'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleBasePath, ROLES } from '../utils/roleRoutes.js'
import NotificationsPanel from './NotificationsPanel.jsx'
import SidebarItem from './SidebarItem.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import {
  TempleArchIcon,
  TempleBellIcon,
  TempleDonationBoxIcon,
  TempleLotusIcon,
  TempleReturnIcon,
  TempleScrollIcon,
  TempleShieldIcon,
} from './TempleIcons.jsx'

const ROLE_CONFIG = {
  [ROLES.ASTROLOGER]: {
    title: 'Astrologer Workspace',
    subtitle: 'Campaigns, queue management, and dispute handling',
    navLabel: 'Astrologer',
    nav: [
      { to: '', label: 'Dashboard', icon: TempleArchIcon, end: true },
      {
        label: 'Text Based',
        icon: TempleScrollIcon,
        children: [
          { to: 'text-based-questions', label: 'Text Based Questions', icon: TempleScrollIcon },
          { to: 'sales-management', label: 'Sales Management', icon: TempleDonationBoxIcon },
          { to: 'answer-question', label: 'Answer Question', icon: TempleLotusIcon },
          { to: 'dispute-management', label: 'Dispute Management', icon: TempleShieldIcon },
        ],
      },
    ],
  },
  [ROLES.USER]: {
    title: 'User Portal',
    subtitle: 'Packages, questions, tracking, and disputes',
    navLabel: 'User',
    nav: [
      { to: '', label: 'Dashboard', icon: LayoutDashboard, end: true },
      {
        label: 'Ask Question',
        icon: CircleHelp,
        children: [
          { to: 'purchase-package', label: 'Purchase Package', icon: ShoppingBag },
          { to: 'track-questions', label: 'Track My Questions', icon: ListChecks },
          { to: 'raise-dispute', label: 'Raise Dispute', icon: Gavel },
        ],
      },
      { to: 'astrologers', label: 'Explore Astrologers', icon: Sparkles },
      { to: 'rewards', label: 'Rewards', icon: Gift },
      { to: 'my-account', label: 'My Account', icon: UserRound },
    ],
  },
}

const PAGE_META = {
  [ROLES.ASTROLOGER]: {
    '/astrologer': { title: 'Dashboard', sub: 'Astrologer workspace overview' },
    '/astrologer/wallet': { title: 'Wallet Management', sub: 'Manage earnings, payouts and transactions' },
    '/astrologer/text-based-questions': { title: 'Text Based Questions', sub: 'Campaign & queue overview' },
    '/astrologer/sales-management': { title: 'Sales Management', sub: 'Campaigns, pricing & allocation' },
    '/astrologer/campaigns': { title: 'All Campaigns', sub: 'Browse campaigns and view full details' },
    '/astrologer/astrologer-profile': { title: 'Astrologer Profile', sub: 'Public profile and profile activity' },
    '/astrologer/profile': { title: 'Astrologer Profile', sub: 'Public profile and profile activity' },
    '/astrologer/audience/follower': { title: 'Follower Profile', sub: 'Audience member details' },
    '/astrologer/audience/subscriber': { title: 'Subscriber Profile', sub: 'Audience member details' },
    '/astrologer/account-profile': { title: 'Profile Settings', sub: 'Astrologer account details' },
    '/astrologer/wallet-history': { title: 'Wallet History', sub: 'Balance and transaction history' },
    '/astrologer/answer-question': { title: 'Answer Question', sub: 'Respond to a user question' },
    '/astrologer/dispute-management': { title: 'Dispute Management', sub: 'Review & resolve a dispute' },
    '/astrologer/consultation-history': { title: 'Consultation History', sub: 'Instant chat and audio call earnings' },
    '/astrologer/live-session': { title: 'Live Session', sub: 'Broadcast workspace and session controls' },
    '/astrologer/purchase-package': { title: 'Purchase Question Package', sub: 'Buy general & individual questions' },
  },
  [ROLES.USER]: {
    '/user': { title: 'Dashboard', sub: 'User portal overview' },
    '/user/wallet-history': { title: 'Wallet History', sub: 'Balance and transaction history' },
    '/user/purchase-package': { title: 'Purchase Question Package', sub: 'Select and buy question packages' },
    '/user/ask-question': { title: 'Ask a Question', sub: 'Submit your question to an astrologer' },
    '/user/track-questions': { title: 'Track My Questions', sub: 'Review status and follow up' },
    '/user/raise-dispute': { title: 'Raise a Dispute', sub: 'Flag an issue with an answer' },
    '/user/dispute-management': { title: 'Dispute Management', sub: 'View dispute updates' },
    '/user/astrologer-profile': { title: 'Astrologer Profile', sub: 'Follow updates and ask a question' },
    '/user/astrologers': { title: 'Explore Astrologers', sub: 'Find an astrologer for your next consultation' },
    '/user/discount-questions': { title: 'Discount Questions', sub: 'Choose an available subscriber question' },
    '/user/rewards': { title: 'Rewards', sub: 'Subscriber benefits and discount questions' },
    '/user/my-account': { title: 'My Account', sub: 'Your profile, personal details, and consultations' },
    '/user/profile': { title: 'Profile', sub: 'User account details' },
    '/user/appointment-details': { title: 'Appointment Details', sub: 'Consultation schedule and status' },
    '/user/pooja-details': { title: 'Pooja Details', sub: 'Booking, live status, and prasadam updates' },
    '/user/live-session': { title: 'Live Session', sub: 'Watch or join a live astrology session' },
  },
}

function NavGroup({ links, basePath, showRewardBadge = false, rewardCount = 0 }) {
  const location = useLocation()
  const isAskQuestionSection = location.pathname.startsWith(`${basePath}/ask-question`) || location.pathname.startsWith(`${basePath}/purchase-package`) || location.pathname.startsWith(`${basePath}/track-questions`) || location.pathname.startsWith(`${basePath}/raise-dispute`)
  const [askQuestionOpen, setAskQuestionOpen] = useState(isAskQuestionSection)

  useEffect(() => {
    if (isAskQuestionSection) setAskQuestionOpen(true)
  }, [isAskQuestionSection])

  return (
    <nav className="sidebar-nav">
      {links.map(({ to, label, icon, end, children }) => {
        if (children) {
          const Icon = icon
          const submenuActive = children.some((child) => location.pathname.startsWith(`${basePath}/${child.to}`))
          const parentActive = submenuActive || location.pathname.startsWith(`${basePath}/ask-question`)
          return <div className="sidebar-nav-group" key={label}>
            <div className={`sidebar-link sidebar-link-toggle${parentActive ? ' active' : ''}`}>
              {parentActive && <span className="sidebar-active-pill" />}
              <NavLink to={`${basePath}/ask-question`} className="sidebar-parent-link">
                <Icon size={18} />
                <span className="sidebar-link-label">{label}</span>
              </NavLink>
              <button type="button" className="sidebar-chevron-button" aria-label={`${askQuestionOpen ? 'Collapse' : 'Expand'} ${label} menu`} aria-expanded={askQuestionOpen} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setAskQuestionOpen((open) => !open) }}>
                <ChevronDown size={16} className={`sidebar-chevron${askQuestionOpen ? ' is-open' : ''}`} />
              </button>
            </div>
            <motion.div className="sidebar-subnav" initial={false} animate={{ height: askQuestionOpen ? 'auto' : 0, opacity: askQuestionOpen ? 1 : 0 }} transition={{ duration: 0.24, ease: 'easeInOut' }}>
              {children.map((child) => <SidebarItem key={child.to} to={`${basePath}/${child.to}`} icon={child.icon} label={child.label} subItem />)}
            </motion.div>
          </div>
        }
        const route = `${basePath}/${to}`.replace(/\/$/, '')
        return <SidebarItem key={route} to={route} end={end} icon={icon} label={label} showBadge={showRewardBadge && label === 'Rewards'} badgeCount={label === 'Rewards' ? rewardCount : 0} />
      })}
    </nav>
  )
}

function AstrologerNav({ links, basePath }) {
  const [textBasedOpen, setTextBasedOpen] = useState(false)

  return (
    <nav className="sidebar-nav">
      {links.map((link) => {
        if (!link.children) {
          const route = `${basePath}/${link.to}`.replace(/\/$/, '')
          return <SidebarItem key={route} to={route} end={link.end} icon={link.icon} label={link.label} />
        }

        return (
          <div className="sidebar-nav-section" key={link.label}>
            <button
              type="button"
              className={`sidebar-nav-section-title${textBasedOpen ? ' is-open' : ''}`}
              aria-expanded={textBasedOpen}
              onClick={() => setTextBasedOpen((isOpen) => !isOpen)}
            >
              <link.icon size={18} />
              <span>{link.label}</span>
              <ChevronRight size={17} className="sidebar-nav-section-arrow" aria-hidden="true" />
            </button>
            {textBasedOpen && (
              <div className="sidebar-nav-subgroup">
                {link.children.map(({ to, label, icon }) => {
                  const route = `${basePath}/${to}`
                  return <SidebarItem key={route} to={route} icon={icon} label={label} nested />
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

const CALL_QUICK_REPLIES = ['I’ll attend shortly.', 'Please wait a moment.', 'I’m finishing another session.', 'Please try again later.', 'Can we continue by chat?']

function requestInitials(name) {
  return String(name || 'User').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

function requestAudienceLabel(request) {
  if (request.relationship === 'subscriber') return `${request.subscriberTier || 'Subscriber'} subscriber${request.subscriptionPrice ? ` · ₹${request.subscriptionPrice}/month` : ''}`
  return request.relationship || 'User'
}

function IncomingRequestOverlay({ callRequest, chatPreviewRequest, chatRequest, actions, onOpenChat, onCloseChat }) {
  const [messageOpen, setMessageOpen] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [chatDraft, setChatDraft] = useState('')
  const request = callRequest || chatPreviewRequest || chatRequest
  if (!request) return null

  const isCall = request.type === 'call'
  const isPreview = Boolean(chatPreviewRequest && !chatRequest && !callRequest)
  const sendMessage = (text) => {
    actions.sendIncomingMessage(request.id, text)
    setMessageOpen(false)
    setCustomMessage('')
  }

  return <div className="incoming-request-overlay">
    <section className={`incoming-request-card${!isCall ? ' incoming-request-card--chat' : ''}`} role="dialog" aria-modal="true" aria-labelledby="incoming-request-title">
      <div className="incoming-request-card__header"><span className="incoming-request-card__type">{isCall ? <PhoneCall size={16} /> : <MessageCircle size={16} />} {isPreview ? 'New chat request' : isCall ? 'Incoming call' : 'Chat with user'}</span>{isCall && <span className="incoming-request-card__pulse" />}{!isCall && !isPreview && <button type="button" className="icon-btn" aria-label="Close chat" onClick={onCloseChat}><X size={16} /></button>}</div>
      <div className="incoming-request-card__profile"><div className="incoming-request-card__avatar">{requestInitials(request.userName)}</div><div><h2 id="incoming-request-title">{request.userName}</h2><p>ID: {request.userId} · @{request.userUsername}</p><span>{requestAudienceLabel(request)}</span></div></div>
      {isPreview ? <div className="incoming-request-actions"><button type="button" className="btn btn-primary" onClick={() => { actions.acceptIncomingRequest(request.id); onOpenChat(request.id) }}><MessageCircle size={15} /> Open Chat</button></div> : isCall ? (messageOpen ? <div className="incoming-request-message"><div className="incoming-request-quick-replies">{CALL_QUICK_REPLIES.map((reply) => <button type="button" key={reply} onClick={() => sendMessage(reply)}>{reply}</button>)}</div><textarea value={customMessage} onChange={(event) => setCustomMessage(event.target.value)} placeholder="Write a custom message..." rows="3" /><button type="button" className="btn btn-primary" disabled={!customMessage.trim()} onClick={() => sendMessage(customMessage)}>Send Message</button></div> : <div className="incoming-request-actions"><button type="button" className="btn btn-primary" onClick={() => actions.acceptIncomingRequest(request.id)}><PhoneCall size={15} /> Attend Call</button><button type="button" className="btn btn-outline" onClick={() => actions.declineIncomingRequest(request.id)}><PhoneOff size={15} /> Decline</button><button type="button" className="btn btn-ghost" onClick={() => setMessageOpen(true)}><MessageCircle size={15} /> Message</button></div>) : <><div className="incoming-chat-messages">{(request.messages || []).map((message) => <p key={message.id} className={`incoming-chat-message incoming-chat-message--${message.sender}`}>{message.text}</p>)}{!(request.messages || []).length && <p className="muted">Start the conversation with {request.userName}.</p>}</div><form className="incoming-chat-composer" onSubmit={(event) => { event.preventDefault(); if (!chatDraft.trim()) return; actions.sendIncomingMessage(request.id, chatDraft); setChatDraft('') }}><input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Write a message..." aria-label="Message user" /><button type="submit" className="btn btn-primary" disabled={!chatDraft.trim()}><MessageCircle size={15} /> Send</button></form><button type="button" className="btn btn-outline incoming-chat-accept" onClick={() => { actions.acceptIncomingRequest(request.id); onCloseChat() }}>Accept Chat</button></>}
    </section>
  </div>
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const { notifications, actions, astrologerServices, incomingRequests } = useAppData()
  const role = currentUser?.role || ROLES.ASTROLOGER
  const basePath = getRoleBasePath(role)
  const routes = {
    walletHistory: `${basePath}/wallet-history`,
    wallet: `${basePath}/wallet`,
  }
  const config = ROLE_CONFIG[role]
  const audienceMeta = role === ROLES.ASTROLOGER && location.pathname.startsWith('/astrologer/audience/')
    ? (location.pathname.includes('/subscriber/') ? PAGE_META[role]['/astrologer/audience/subscriber'] : PAGE_META[role]['/astrologer/audience/follower'])
    : null
  const meta = audienceMeta || PAGE_META[role][location.pathname] || { title: config.title, sub: config.subtitle }
  const isAstrologer = role === ROLES.ASTROLOGER
  const isOwnerProfile = location.pathname === '/user/profile' || (location.pathname === '/astrologer/profile' && isAstrologer)
  const rewardStatus = role === ROLES.USER ? actions.getDiscountStatus(currentUser?.id) : null
  const showRewardBadge = rewardStatus?.state === 'available'
  const rewardCount = role === ROLES.USER ? actions.getAvailableDiscountQuestions(currentUser?.id).length : 0
  const visibleNotifications = notifications.filter(
    (item) => !item.audience || item.audience === 'all' || item.audience === role,
  )
  const unreadNotificationCount = visibleNotifications.filter((item) => !item.read).length
  const [panel, setPanel] = useState(null)
  const [activeChatRequestId, setActiveChatRequestId] = useState(null)
  const actionRef = useRef(null)
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
  const pendingRequests = incomingRequests.filter((request) => request.astrologerId === astrologerId && request.status === 'pending')
  const activeCallRequest = pendingRequests.find((request) => request.type === 'call')
  const activeChatRequest = incomingRequests.find((request) => request.id === activeChatRequestId && request.astrologerId === astrologerId)
  const chatPreviewRequest = pendingRequests.find((request) => request.type === 'chat' && !request.notificationsSaved && Date.now() - new Date(request.createdAt).getTime() < 5000)

  useEffect(() => {
    if (!isAstrologer) return undefined
    const checkChatRequests = () => {
      incomingRequests
        .filter((request) => request.astrologerId === astrologerId && request.type === 'chat' && request.status === 'pending' && !request.notificationsSaved)
        .filter((request) => Date.now() - new Date(request.createdAt).getTime() >= 5000)
        .forEach((request) => actions.saveIncomingRequestNotification(request.id))
    }
    checkChatRequests()
    const timer = window.setInterval(checkChatRequests, 1000)
    return () => window.clearInterval(timer)
  }, [actions, astrologerId, incomingRequests, isAstrologer])

  useEffect(() => {
    if (!isAstrologer) return undefined

    const updatePresence = () => actions.setAstrologerPresence(document.visibilityState === 'visible')
    updatePresence()
    document.addEventListener('visibilitychange', updatePresence)
    window.addEventListener('focus', updatePresence)
    window.addEventListener('blur', updatePresence)
    return () => {
      document.removeEventListener('visibilitychange', updatePresence)
      window.removeEventListener('focus', updatePresence)
      window.removeEventListener('blur', updatePresence)
      actions.setAstrologerPresence(false)
    }
  }, [actions, isAstrologer])

  useEffect(() => {
    function handlePointerDown(event) {
      const insideActions = actionRef.current && actionRef.current.contains(event.target)
      if (!insideActions) {
        setPanel(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div className={`app-shell${isOwnerProfile ? ' app-shell--profile' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            {isAstrologer ? <TempleArchIcon size={24} color="#fff" /> : <Sparkles size={24} color="#fff" />}
          </div>
          <div>
            <div className="sidebar-brand-text">Astro Connect</div>
            <div className="sidebar-brand-sub">{config.subtitle}</div>
          </div>
        </div>

        <div className="sidebar-group-label">{config.navLabel}</div>
        {isAstrologer ? (
          <AstrologerNav links={config.nav} basePath={basePath} />
        ) : (
          <NavGroup links={config.nav} basePath={basePath} showRewardBadge={showRewardBadge} rewardCount={rewardCount} />
        )}
      </aside>

      <div className="main-column">
        <header className="topbar-header">
          {isOwnerProfile && <button type="button" className="profile-home-btn" aria-label="Back to dashboard" onClick={() => navigate(basePath)}><span aria-hidden="true">‹</span></button>}
          {isOwnerProfile && <div className="profile-topbar-brand"><span className="profile-topbar-mark"><Sparkles size={17} /></span><strong>Astro Connect</strong></div>}
          <div className="topbar-heading">
            <div className="topbar-crumb">{meta.title}</div>
            <div className="topbar-crumb-sub">{meta.sub}</div>
          </div>
          <div className="topbar-actions" ref={actionRef}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => setPanel(panel === 'notifications' ? null : 'notifications')}
            >
              {isAstrologer ? <TempleBellIcon size={18} /> : <Bell size={18} />}
              {unreadNotificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border-[1.5px] border-white bg-[color:var(--red-500)] px-1 text-[10px] font-bold leading-none text-white">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>
            <button type="button" className="icon-btn profile-wallet-action" aria-label="Wallet" onClick={() => navigate(isAstrologer ? routes.wallet : routes.walletHistory)}>
              {isAstrologer ? <TempleDonationBoxIcon size={18} /> : <Wallet size={18} />}
            </button>
            <ThemeToggle />
            <button
              type="button"
              className="avatar-chip"
              onClick={() => {
                setPanel(null)
                navigate(`${basePath}/profile`)
              }}
            >
              <span className="avatar-circle">
                {currentUser?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'DR'}
              </span>
              <span>{currentUser?.name || 'Dashboard'}</span>
              {isAstrologer && (
                <span className={`topbar-service-status ${astrologerServices.available ? 'is-available' : 'is-unavailable'}`} title="Astrologer service status">
                  <span className="service-status-dot" />
                  {astrologerServices.dndEnabled ? 'DND' : astrologerServices.isOnline ? 'Online' : 'Offline'}
                </span>
              )}
            </button>
            <button
              type="button"
              className="icon-btn danger"
              aria-label="Logout"
              onClick={() => {
                if (isAstrologer) actions.setAstrologerPresence(false)
                logout()
                navigate('/login')
              }}
            >
              {isAstrologer ? <TempleReturnIcon size={18} /> : <LogOut size={18} />}
            </button>

            {panel === 'notifications' && (
              <div className="topbar-popover" style={{ width: 'min(420px, calc(100vw - 40px))' }}>
                <NotificationsPanel
                  notifications={visibleNotifications}
                  role={role}
                  onMarkAllRead={() => actions.markAllNotificationsRead(role)}
                  onSelect={(item) => {
                    actions.markNotificationRead(item.id)
                    if (item.incomingRequestId) {
                      setActiveChatRequestId(item.incomingRequestId)
                      setPanel(null)
                      return
                    }
                    if (item.route) {
                      navigate(item.route)
                    }
                    setPanel(null)
                  }}
                />
              </div>
            )}

          </div>
        </header>

        <div className="page-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className="page-transition"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
        {isAstrologer && <IncomingRequestOverlay callRequest={activeCallRequest} chatPreviewRequest={chatPreviewRequest} chatRequest={activeChatRequest} actions={actions} onOpenChat={setActiveChatRequestId} onCloseChat={() => setActiveChatRequestId(null)} />}
      </div>
    </div>
  )
}
