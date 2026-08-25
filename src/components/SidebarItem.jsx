import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function SidebarItem({ to, end, icon: Icon, label, showBadge = false, badgeCount = 0, nested = false }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `sidebar-link${nested ? ' sidebar-link--nested' : ''}${isActive ? ' active' : ''}`}>
      {({ isActive }) => (
        <>
          {isActive && (
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
      )}
    </NavLink>
  )
}
