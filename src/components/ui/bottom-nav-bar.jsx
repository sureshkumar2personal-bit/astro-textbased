import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils.js'

export function BottomNavBar({ items, basePath, className }) {
  return (
    <motion.nav
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      role="navigation"
      aria-label="Astrologer navigation"
      className={cn('astrologer-bottom-nav', className)}
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={label}
          to={`${basePath}/${to}`.replace(/\/$/, '')}
          end={end}
          className={({ isActive }) => cn(
            'astrologer-bottom-nav__item',
            isActive && 'is-active',
          )}
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              <motion.span whileTap={{ scale: 0.97 }} className="astrologer-bottom-nav__icon">
                <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
              </motion.span>
              <motion.span
                initial={false}
                animate={{
                  width: isActive ? 72 : 0,
                  opacity: isActive ? 1 : 0,
                  marginLeft: isActive ? 8 : 0,
                }}
                transition={{
                  width: { type: 'spring', stiffness: 350, damping: 32 },
                  opacity: { duration: 0.19 },
                  marginLeft: { duration: 0.19 },
                }}
                className="astrologer-bottom-nav__label-wrap"
              >
                <span className="astrologer-bottom-nav__label">{label}</span>
              </motion.span>
            </>
          )}
        </NavLink>
      ))}
    </motion.nav>
  )
}

export default BottomNavBar
