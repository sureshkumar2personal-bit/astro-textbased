import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  ShieldCheck,
  UserRound,
  Users,
  Star,
  Wallet,
  Megaphone,
  BarChart3,
} from 'lucide-react'
import { useAuth } from '../../state/AuthContext.jsx'
import ThemeToggle from '../../components/ThemeToggle.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'

// Platform/Admin shell.
//
// Deliberately built from the same token-based classes as the rest of the app
// (.app-shell / .sidebar / .topbar-header / .page-content) so it inherits the
// existing AstroConnect design and dark theme for free. It intentionally does
// NOT import editor-layout.css - that file is a legacy hardcoded-hex design
// which is not used by EditorLayout and has no dark-theme support.
//
// The entries below are placeholders only. No admin module is wired up yet, so
// the sections that are not built yet are rendered as inert groups rather than
// links, to avoid dead routes.

const ADMIN_BASE = getRoleRoutes(ROLES.ADMIN).base

const ICONS = {
  dashboard: LayoutDashboard,
  users: Users,
  astrologers: UserRound,
  questions: MessageCircle,
  appointments: CalendarDays,
  subscriptions: Star,
  finance: Wallet,
  disputes: Megaphone,
  reviews: Star,
  content: FileText,
  reports: BarChart3,
  audit: ShieldCheck,
}

// Placeholder groups. `to` is only set for routes that exist today; the rest
// render as non-navigating sections until their module is built.

const ADMIN_GROUPS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', to: `${ADMIN_BASE}/dashboard` },
  { key: 'users', label: 'Users', icon: 'users', to: `${ADMIN_BASE}/users` },
  { key: 'astrologers', label: 'Astrologers', icon: 'astrologers', to: `${ADMIN_BASE}/astrologers` },
  { key: 'questions', label: 'Text-Based Questions', icon: 'questions', to: `${ADMIN_BASE}/text-based-questions` },
  { key: 'appointments', label: 'Appointments', icon: 'appointments', to: `${ADMIN_BASE}/appointments` },
  { key: 'subscriptions', label: 'Subscriptions', icon: 'subscriptions', to: `${ADMIN_BASE}/subscriptions` },
  { key: 'finance', label: 'Payments & Finance', icon: 'finance', to: `${ADMIN_BASE}/payments` },
  { key: 'disputes', label: 'Disputes', icon: 'disputes', to: `${ADMIN_BASE}/disputes` },
  { key: 'reviews', label: 'Reviews & Ratings', icon: 'reviews', to: `${ADMIN_BASE}/reviews` },
  { key: 'content', label: 'Content Management', icon: 'content', to: `${ADMIN_BASE}/content` },
  { key: 'reports', label: 'Reports / Analytics', icon: 'reports', to: `${ADMIN_BASE}/reports` },
  { key: 'audit', label: 'Admin & Audit', icon: 'audit', to: `${ADMIN_BASE}/audit` },
]

export default function AdminLayout() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [openSections, setOpenSections] = useState({})

  const dashboardPath = `${ADMIN_BASE}/dashboard`
  const pageTitle = ADMIN_GROUPS.find((group) => group.to === location.pathname)?.label || 'Platform Admin'

  return (
    <div className="app-shell admin-app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark"><ShieldCheck size={24} color="#fff" /></div>
          <div>
            <div className="sidebar-brand-text">Astro Connect</div>
            <div className="sidebar-brand-sub">Platform administration</div>
          </div>
        </div>
        <div className="sidebar-group-label">Platform Admin</div>
        <nav className="sidebar-nav">
          {ADMIN_GROUPS.map((group) => {
            const Icon = ICONS[group.icon] || LayoutDashboard
            if (group.to) {
              return (
                <NavLink
                  key={group.key}
                  to={group.to}
                  end
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  <Icon size={18} />
                  <span className="sidebar-link-label">{group.label}</span>
                </NavLink>
              )
            }
            // Placeholder: expandable group with no children wired up yet.
            const open = Boolean(openSections[group.key])
            return (
              <div className="sidebar-nav-section" key={group.key}>
                <button
                  type="button"
                  className={`sidebar-nav-section-title${open ? ' is-open' : ''}`}
                  aria-expanded={open}
                  onClick={() => setOpenSections((current) => ({ ...current, [group.key]: !current[group.key] }))}
                >
                  <Icon size={18} />
                  <span>{group.label}</span>
                  <ChevronRight size={17} className="sidebar-nav-section-arrow" />
                </button>
                {open && (
                  <div className="sidebar-nav-subgroup">
                    <span className="sidebar-link nested" aria-disabled="true">Coming soon</span>
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      <div className="main-column">
        <header className="topbar-header">
          <div className="topbar-heading">
            <div className="topbar-crumb">{pageTitle}</div>
            <div className="topbar-crumb-sub">Platform access · full workspace visibility</div>
          </div>
          <div className="topbar-actions">
            <button type="button" className="icon-btn" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <ThemeToggle />
            <span className="avatar-chip">
              <span className="avatar-circle">
                {(currentUser?.name || 'Admin').split(' ').map((part) => part[0]).slice(0, 2).join('')}
              </span>
              <span>{currentUser?.name || 'Admin'}</span>
            </span>
            <button
              type="button"
              className="icon-btn danger"
              aria-label="Logout"
              onClick={() => navigate('/login', { replace: true })}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="page-content">
          {location.pathname !== dashboardPath && (
            <div className="editor-page-return">
              <button type="button" className="editor-return-button" onClick={() => navigate(-1)}>
                <ArrowLeft size={16} /> Return
              </button>
            </div>
          )}
          <Outlet />
        </div>
      </div>
    </div>
  )
}
