import { useLocation, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function SidebarItem({ to, end, icon: Icon, label, showBadge = false, badgeCount = 0, nested = false, subItem = false, activeWhen = [], noHighlight = false }) {
  const { pathname } = useLocation()
  const extraActive = !noHighlight && activeWhen.some((prefix) => pathname.startsWith(prefix))

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `sidebar-link${nested || subItem ? ' sidebar-link--nested' : ''}${subItem ? ' sidebar-subnav-link' : ''}${(isActive && !noHighlight) || extraActive ? ' active' : ''}`}
    >
      {({ isActive: routeActive }) => {
        const isActive = routeActive && !noHighlight
        return (
        <>
          {(isActive || extraActive) && (
            <motion.span
              layoutId="sidebar-active-pill"
              className="sidebar-active-pill"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <Icon size={18} />
          <span className="sidebar-link-label">{label}</span>
          {badgeCount > 0 && <span className="sidebar-badge-count">{badgeCount}</span>}
          {showBadge && badgeCount === 0 && <span className="sidebar-notification-dot" aria-label="Reward available" />}
        </>
        )
      }}
    </NavLink>
  )
}
