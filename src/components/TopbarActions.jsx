import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Wallet,
  LogOut,
  Search,
} from 'lucide-react'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleBasePath, getRoleRoutes, ROLES } from '../utils/roleRoutes.js'
import { TempleBellIcon, TempleDonationBoxIcon, TempleReturnIcon } from './TempleIcons.jsx'
import ActiveCallIndicator from './user/ActiveCallIndicator.jsx'
import NotificationsPanel from './NotificationsPanel.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function TopbarActions({ className = '' }) {
  const { currentUser, logout } = useAuth()
  const { notifications, actions, astrologerServices } = useAppData()
  const navigate = useNavigate()
  const [panel, setPanel] = useState(null)
  const actionRef = useRef(null)

  const role = currentUser?.role || ROLES.USER
  const basePath = getRoleBasePath(role)
  const routes = getRoleRoutes(role)
  const isAstrologer = role === ROLES.ASTROLOGER
  const headerName = currentUser?.name || 'Dashboard'

  const visibleNotifications = (notifications || []).filter((item) => (
    (!item.audience || item.audience === 'all' || item.audience === role)
    && (!item.userId || item.userId === currentUser?.id)
  ))
  const unreadNotificationCount = visibleNotifications.filter((item) => !item.read).length

  useEffect(() => {
    function handlePointerDown(event) {
      if (actionRef.current && !actionRef.current.contains(event.target)) {
        setPanel(null)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div className={`topbar-actions ${className}`.trim()} ref={actionRef}>
      {!isAstrologer && <ActiveCallIndicator />}
      {!isAstrologer && (
        <button
          type="button"
          className="topbar-explore-btn"
          aria-label="Explore Astrologers"
          title="Explore Astrologers"
          onClick={() => navigate(`${basePath}/astrologers`)}
        >
          <Search size={18} aria-hidden="true" />
          <span className="topbar-explore-btn__label">Explore</span>
        </button>
      )}
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
      <button
        type="button"
        className="icon-btn profile-wallet-action"
        aria-label="Wallet"
        onClick={() => navigate(isAstrologer ? routes.wallet : routes.walletHistory)}
      >
        {isAstrologer ? <TempleDonationBoxIcon size={18} /> : <Wallet size={18} />}
      </button>
      <ThemeToggle />
      <button
        type="button"
        className="avatar-chip"
        onClick={() => {
          setPanel(null)
          navigate(isAstrologer ? `${basePath}/my-account` : `${basePath}/profile`)
        }}
      >
        <span className="avatar-circle">
          {headerName.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'U'}
        </span>
        <span>{headerName}</span>
        {isAstrologer && astrologerServices && (
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
              if (item.route) {
                navigate(item.route)
              }
              setPanel(null)
            }}
          />
        </div>
      )}
    </div>
  )
}
