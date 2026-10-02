import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarDays, History } from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import '../../../css/astrologer/wallet-dashboard.css'
import '../../../css/astrologer/appointments-dashboard.css'

const TABS = [
  { key: 'schedule', icon: CalendarDays, label: 'Schedule' },
  { key: 'history', icon: History, label: 'History' },
]

export default function AppointmentsShell() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const { pathname } = useLocation()

  return (
    <div className="apt-page">
      <PageHeader
        eyebrow="Astrologer Workspace"
        title="Appointments"
        subtitle="Publish availability first, review the calendar after publish, and check appointment history here."
        showBack
      />

      <div className="wd-tabs" role="tablist" aria-label="Appointment sections">
        {TABS.map((tab) => {
          const to = routes[`appointment${tab.key[0].toUpperCase()}${tab.key.slice(1)}`]
          const Icon = tab.icon
          const isActive = pathname === to
          return (
            <NavLink
              key={tab.key}
              to={to}
              end
              className={`wd-tab${isActive ? ' is-active' : ''}`}
              role="tab"
              aria-selected={isActive ? 'true' : 'false'}
            >
              <Icon size={16} />
              {tab.label}
            </NavLink>
          )
        })}
      </div>

      <Outlet />
    </div>
  )
}
