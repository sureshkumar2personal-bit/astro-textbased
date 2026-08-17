import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Sparkles,
  LayoutDashboard,
  ShoppingBag,
  CircleHelp,
  ListChecks,
  Gavel,
  Bell,
  Wallet,
  LogOut,
  UserCircle2,
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
      { to: 'text-based-questions', label: 'Text Based Questions', icon: TempleScrollIcon },
      { to: 'sales-management', label: 'Sales Management', icon: TempleDonationBoxIcon },
      { to: 'answer-question', label: 'Answer Question', icon: TempleLotusIcon },
      { to: 'dispute-management', label: 'Dispute Management', icon: TempleShieldIcon },
    ],
  },
  [ROLES.USER]: {
    title: 'User Portal',
    subtitle: 'Packages, questions, tracking, and disputes',
    navLabel: 'User',
    nav: [
      { to: '', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: 'purchase-package', label: 'Purchase Package', icon: ShoppingBag },
      { to: 'ask-question', label: 'Ask Question', icon: CircleHelp },
      { to: 'track-questions', label: 'Track My Questions', icon: ListChecks },
      { to: 'raise-dispute', label: 'Raise Dispute', icon: Gavel },
    ],
  },
}

const PAGE_META = {
  [ROLES.ASTROLOGER]: {
    '/astrologer': { title: 'Dashboard', sub: 'Astrologer workspace overview' },
    '/astrologer/text-based-questions': { title: 'Text Based Questions', sub: 'Campaign & queue overview' },
    '/astrologer/sales-management': { title: 'Sales Management', sub: 'Campaigns, pricing & allocation' },
    '/astrologer/campaigns': { title: 'All Campaigns', sub: 'Browse campaigns and view full details' },
    '/astrologer/wallet-history': { title: 'Wallet History', sub: 'Balance and transaction history' },
    '/astrologer/answer-question': { title: 'Answer Question', sub: 'Respond to a user question' },
    '/astrologer/dispute-management': { title: 'Dispute Management', sub: 'Review & resolve a dispute' },
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
    '/user/appointment-details': { title: 'Appointment Details', sub: 'Consultation schedule and status' },
    '/user/pooja-details': { title: 'Pooja Details', sub: 'Booking, live status, and prasadam updates' },
    '/user/live-session': { title: 'Live Session', sub: 'Watch or join a live astrology session' },
  },
}

function NavGroup({ links, basePath }) {
  return (
    <nav className="sidebar-nav">
      {links.map(({ to, label, icon, end }) => {
        const route = `${basePath}/${to}`.replace(/\/$/, '')
        return <SidebarItem key={route} to={route} end={end} icon={icon} label={label} />
      })}
    </nav>
  )
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const { notifications, profile, actions } = useAppData()
  const role = currentUser?.role || ROLES.ASTROLOGER
  const basePath = getRoleBasePath(role)
  const routes = {
    walletHistory: `${basePath}/wallet-history`,
  }
  const config = ROLE_CONFIG[role]
  const meta = PAGE_META[role][location.pathname] || { title: config.title, sub: config.subtitle }
  const isAstrologer = role === ROLES.ASTROLOGER
  const visibleNotifications = notifications.filter(
    (item) => !item.audience || item.audience === 'all' || item.audience === role,
  )
  const unreadNotificationCount = visibleNotifications.filter((item) => !item.read).length
  const [panel, setPanel] = useState(null)
  const actionRef = useRef(null)

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
    <div className="app-shell">
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
        <NavGroup links={config.nav} basePath={basePath} />
      </aside>

      <div className="main-column">
        <header className="topbar-header">
          <div>
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
            <button type="button" className="icon-btn" aria-label="Wallet" onClick={() => navigate(routes.walletHistory)}>
              {isAstrologer ? <TempleDonationBoxIcon size={18} /> : <Wallet size={18} />}
            </button>
            <ThemeToggle />
            <button
              type="button"
              className="avatar-chip"
              onClick={() => setPanel(panel === 'profile' ? null : 'profile')}
            >
              <span className="avatar-circle">
                {currentUser?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'DR'}
              </span>
              {currentUser?.name || 'Dashboard'}
            </button>
            <button
              type="button"
              className="icon-btn danger"
              aria-label="Logout"
              onClick={() => {
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
                    if (item.route) {
                      navigate(item.route)
                    }
                    setPanel(null)
                  }}
                />
              </div>
            )}

            {panel === 'profile' && (
              <div className="topbar-popover">
                <div className="popover-title">Profile</div>
                <div className="profile-summary">
                  <div className="profile-avatar">
                    {isAstrologer ? <TempleLotusIcon size={24} /> : <UserCircle2 size={24} />}
                  </div>
                  <div>
                    <div className="font-bold text-[color:var(--ink)]">{profile.name}</div>
                    <div className="text-[color:var(--muted)]">{profile.role}</div>
                  </div>
                </div>
                <div className="popover-list">
                  <div className="popover-item"><strong>Rating</strong><div>{profile.rating}</div></div>
                  <div className="popover-item"><strong>Reviews</strong><div>{profile.reviews}</div></div>
                  <div className="popover-item"><strong>Email</strong><div>{profile.email}</div></div>
                  <div className="popover-item"><strong>Phone</strong><div>{profile.phone}</div></div>
                </div>
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
      </div>
    </div>
  )
}
