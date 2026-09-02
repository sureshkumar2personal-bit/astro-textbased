import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, ListChecks, ScrollText } from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'

const TABS = [
  { key: 'schedule', icon: ScrollText, label: 'Schedule' },
  { key: 'calendar', icon: CalendarDays, label: 'Calendar' },
  { key: 'history', icon: ListChecks, label: 'History' },
]

export default function AppointmentsShell() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)

  return (
    <div className="apt-page">
      <PageHeader
        eyebrow="Astrologer Workspace"
        title="Appointments"
        subtitle="Publish availability first, review the calendar after publish, and check appointment history here."
      />

      <div className="appointment-view-tabs apt-appointment-tabs" role="tablist" aria-label="Appointment sections">
        {TABS.map((tab) => {
          const to = routes[`appointment${tab.key[0].toUpperCase()}${tab.key.slice(1)}`]
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.key}
              to={to}
              end
              className={({ isActive }) => `apt-tab-btn${isActive ? ' is-active' : ''}`}
              role="tab"
            >
              <Icon size={15} />
              {tab.label}
            </NavLink>
          )
        })}
      </div>

      <Outlet />
    </div>
  )
}
