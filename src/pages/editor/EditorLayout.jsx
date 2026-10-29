import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSafeBack } from '../../utils/useSafeBack.js'
import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, Bell, CalendarDays, ChevronRight, Eye, EyeOff, FileText, LayoutDashboard, LockKeyhole, LogOut, MessageCircle, Pencil, UserRound, Megaphone, Radio, Gift, Tag, Flame, CalendarRange, X } from 'lucide-react'
import { useAuth } from '../../state/AuthContext.jsx'
import { useEditor } from '../../state/EditorContext.jsx'
import ThemeToggle from '../../components/ThemeToggle.jsx'
import { getEditorNavigation } from '../../utils/editorAccess.js'
import './editor-layout.css'
import './editor-password-setup.css'

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

function EditorPasswordSetupModal({ editor, onCancel, onComplete, setEditorPassword }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (!/[0-9]/.test(password)) return setError('Password must include at least one number.')
    if (!/[^A-Za-z0-9]/.test(password)) return setError('Password must include at least one special character.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    try {
      setEditorPassword(editor.editorId || editor.id, password)
      onComplete()
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  const field = (label, value, setValue, visible, setVisible, placeholder, autoComplete) => <label className="editor-password-label"><span>{label}</span><div className="editor-password-input"><LockKeyhole size={20} /><input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} type={visible ? 'text' : 'password'} autoComplete={autoComplete} required /><button type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff size={21} /> : <Eye size={21} />}</button></div></label>

  return <div className="editor-password-backdrop" role="dialog" aria-modal="true" aria-labelledby="editor-password-title"><form className="editor-password-modal" onSubmit={submit}><button type="button" className="editor-password-close" aria-label="Cancel password setup" onClick={onCancel}><X size={28} /></button><h2 id="editor-password-title">Set Your Password</h2><p className="editor-password-lead">Create a password to access your account.</p>{field('New Password', password, setPassword, showPassword, setShowPassword, 'Enter your password', 'new-password')}<p className="editor-password-hint">Minimum 8 characters, include a number and a special character.</p>{field('Confirm Password', confirmPassword, setConfirmPassword, showConfirmPassword, setShowConfirmPassword, 'Re-enter your password', 'new-password')}{error && <p className="editor-password-error" role="alert">{error}</p>}<div className="editor-password-actions"><button type="button" className="editor-password-cancel" onClick={onCancel}>Cancel</button><button type="submit" className="editor-password-submit">Set Password &amp; Sign In</button></div></form></div>
}

export default function EditorLayout() {
  const { currentUser } = useAuth()
  const { currentEditor, logoutEditor, setEditorPassword } = useEditor()
  const editorUser = currentEditor || currentUser
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = useSafeBack('/editor/dashboard')
  const navigation = getEditorNavigation(editorUser)
  const allowed = new Set(navigation.map((item) => item.to))
  const visibleGroups = groups.map((group) => ({ ...group, children: group.children?.filter((child) => allowed.has(child.to)) })).filter((group) => (group.children ? group.children.length > 0 : allowed.has(group.to)))
  const pageTitle = navigation.find((item) => location.pathname === item.to)?.label || 'Editor Workspace'
  const requiresPasswordSetup = Boolean(editorUser?.requiresPasswordSetup)
  const leavePasswordSetup = () => {
    const email = editorUser?.email
    logoutEditor()
    navigate('/', { replace: true, state: { email } })
  }
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
    <div className="main-column"><header className="topbar-header"><div className="topbar-heading"><div className="topbar-crumb">{pageTitle}</div><div className="topbar-crumb-sub">Editor access · managed by the primary astrologer</div></div><div className="topbar-actions"><button type="button" className="icon-btn" aria-label="Notifications" onClick={() => navigate('/editor/notifications')}><Bell size={18} /></button><ThemeToggle /><button type="button" className="avatar-chip" onClick={() => navigate('/editor/profile')}><span className="avatar-circle">{(currentUser?.name || 'Editor').split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span>{currentUser?.name || 'Editor'}</span></button><button type="button" className="icon-btn danger" aria-label="Logout" onClick={() => { logoutEditor(); navigate('/login', { replace: true }) }}><LogOut size={18} /></button></div></header><div className="page-content">{location.pathname !== '/editor/dashboard' && <div className="editor-page-return"><button type="button" className="editor-return-button" onClick={goBack}><ArrowLeft size={16} /> Return</button></div>}<Outlet /></div></div>
    {requiresPasswordSetup && <EditorPasswordSetupModal editor={editorUser} setEditorPassword={setEditorPassword} onCancel={leavePasswordSetup} onComplete={leavePasswordSetup} />}
  </div>
}
