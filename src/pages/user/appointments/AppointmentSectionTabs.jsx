import { NavLink } from 'react-router-dom'
import './appointmenttabs.css'

const TABS = [
  { to: '/user/appointments/book', label: 'Book an Appointment' },
  { to: '/user/appointments/my', label: 'Appointment History' },
]

export default function AppointmentSectionTabs() {
  return (
    <nav className="appointment-section-tabs" aria-label="Appointment sections">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) => `appointment-section-tab${isActive ? ' is-active' : ''}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
