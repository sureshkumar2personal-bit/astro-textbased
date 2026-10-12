import { NavLink, Outlet } from 'react-router-dom'
import { Headphones, IndianRupee, MessageCircle } from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import '../../../css/astrologer/wallet-dashboard.css'
import './consultation.css'

const TABS = [
  { to: 'instant-call', label: 'Instant Call', icon: Headphones },
  { to: 'instant-chat', label: 'Instant Chat', icon: MessageCircle },
  { to: 'pricing', label: 'Pricing', icon: IndianRupee },
]

export default function ConsultationShell() {
  return (
    <div className="consult-page">
      <PageHeader eyebrow="Astrologer Workspace" title="Consultation" subtitle="Review instant call and chat history, and set your per-minute prices." />
      <div className="wd-tabs" role="tablist" aria-label="Consultation sections">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end role="tab" className={({ isActive }) => `wd-tab${isActive ? ' is-active' : ''}`}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
