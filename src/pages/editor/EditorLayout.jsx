import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Activity, Bell, CalendarDays, ChevronRight, FileText, LayoutDashboard, LogOut, MessageCircle, Pencil, UserRound, Megaphone, Radio, Gift, Tag, Flame, CalendarRange } from 'lucide-react'
import { useAuth } from '../../state/AuthContext.jsx'
import { useEditor } from '../../state/EditorContext.jsx'
import ThemeToggle from '../../components/ThemeToggle.jsx'
import { getEditorNavigation } from '../../utils/editorAccess.js'
import './editor-layout.css'

const icons = { dashboard: LayoutDashboard, questions: MessageCircle, appointments: CalendarDays, content: FileText, profile: UserRound, notifications: Bell, activity: Activity, availability: CalendarRange, campaigns: Megaphone, live: Radio, perks: Gift, discounts: Tag, atonement: Flame }
const groups = [
  { label: 'Dashboard', icon: 'dashboard', to: '/editor/dashboard' },
  { label: 'Calendar Availability', icon: 'availability', to: '/editor/availability' },
  { label: 'Campaigns', icon: 'campaigns', to: '/editor/campaigns' },
  { label: 'Text Based', icon: 'questions', children: [{ label: 'Questions', to: '/editor/questions' }, { label: 'Content', to: '/editor/content' }] },
  { label: 'Appointments', icon: 'appointments', children: [{ label: 'Appointment History', to: '/editor/appointments' }] },
  { label: 'Live', icon: 'live', children: [{ label: 'Schedule Live', to: '/editor/live-scheduling' }, { label: 'Live History', to: '/editor/live-history' }] },
  { label: 'Perks & Benefits', icon: 'perks', to: '/editor/perks' },
  { label: 'Discounts', icon: 'discounts', to: '/editor/discounts' },
  { label: 'Atonement Tracking', icon: 'atonement', to: '/editor/atonement-tracking' },
  { label: 'Notifications', icon: 'notifications', to: '/editor/notifications' },
  { label: 'My Activity', icon: 'activity', to: '/editor/activity' },
  { label: 'My Account', icon: 'profile', to: '/editor/profile' },
]

export default function EditorLayout() {
  const { currentUser } = useAuth()
  const { currentEditor, logoutEditor } = useEditor()
  const editorUser = currentEditor || currentUser
  const navigate = useNavigate()
  const location = useLocation()
  const navigation = getEditorNavigation(editorUser)
  const allowed = new Set(navigation.map((item) => item.to))
  const visibleGroups = groups.map((group) => ({ ...group, children: group.children?.filter((child) => allowed.has(child.to)) })).filter((group) => (group.children ? group.children.length > 0 : allowed.has(group.to)))
  const pageTitle = navigation.find((item) => location.pathname === item.to)?.label || 'Editor Workspace'
  const [openSections, setOpenSections] = useState(() => Object.fromEntries(visibleGroups.filter((group) => group.children).map((group) => [group.label, group.children.some((child) => location.pathname.startsWith(child.to))])))
  useEffect(() => {
    visibleGroups.filter((group) => group.children && group.children.some((child) => location.pathname.startsWith(child.to))).forEach((group) => setOpenSections((current) => ({ ...current, [group.label]: true })))
  }, [location.pathname])
  return <div className="app-shell editor-app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><div className="sidebar-brand-mark"><Pencil size={24} color="#fff" /></div><div><div className="sidebar-brand-text">Astro Connect</div><div className="sidebar-brand-sub">Astrologer workspace</div></div></div>
      <div className="sidebar-group-label">Editor / Assistant</div>
      <nav className="sidebar-nav">{visibleGroups.map((group) => { const Icon = icons[group.icon] || LayoutDashboard; if (!group.children) return <NavLink key={group.to} to={group.to} end={group.to === '/editor/dashboard'} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}><Icon size={18} /><span className="sidebar-link-label">{group.label}</span></NavLink>; const open = Boolean(openSections[group.label]); return <div className="sidebar-nav-section" key={group.label}><button type="button" className={`sidebar-nav-section-title${open ? ' is-open' : ''}`} aria-expanded={open} onClick={() => setOpenSections((current) => ({ ...current, [group.label]: !current[group.label] }))}><Icon size={18} /><span>{group.label}</span><ChevronRight size={17} className="sidebar-nav-section-arrow" /></button>{open && <div className="sidebar-nav-subgroup">{group.children.map((child) => <NavLink key={child.to} to={child.to} className={({ isActive }) => `sidebar-link nested${isActive ? ' active' : ''}`}><FileText size={16} /><span>{child.label}</span></NavLink>)}</div>}</div> })}</nav>
    </aside>
    <div className="main-column"><header className="topbar-header"><div className="topbar-heading"><div className="topbar-crumb">{pageTitle}</div><div className="topbar-crumb-sub">Editor access · managed by the primary astrologer</div></div><div className="topbar-actions"><button type="button" className="icon-btn" aria-label="Notifications" onClick={() => navigate('/editor/notifications')}><Bell size={18} /></button><ThemeToggle /><button type="button" className="avatar-chip" onClick={() => navigate('/editor/profile')}><span className="avatar-circle">{(currentUser?.name || 'Editor').split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span>{currentUser?.name || 'Editor'}</span></button><button type="button" className="icon-btn danger" aria-label="Logout" onClick={() => { logoutEditor(); navigate('/login', { replace: true }) }}><LogOut size={18} /></button></div></header><div className="page-content"><Outlet /></div></div>
  </div>
}
