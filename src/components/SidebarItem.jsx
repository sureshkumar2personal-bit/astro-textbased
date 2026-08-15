import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function SidebarItem({ to, end, icon: Icon, label }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
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
          {label}
        </>
      )}
    </NavLink>
  )
}
