import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CircleHelp, Gavel, History, ListChecks } from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { getUserDisputes, getUserQuestions } from '../../../utils/questionDashboard.js'
import './questiondashboard.css'

export default function AskQuestionDashboard() {
  const { currentUser } = useAuth()
  const { questions } = useAppData()
  const { pathname } = useLocation()
  const routes = getRoleRoutes(currentUser?.role)

  // The four Ask a Question sections. The dashboard is navigation only: Ask New
  // and My Questions render the pages that already implement those flows, and
  // Disputes / History render read-only views built from the same records.
  const sections = [
    { key: 'new', label: 'Ask New', icon: CircleHelp, to: routes.askQuestion, count: 0 },
    { key: 'my-questions', label: 'My Questions', icon: ListChecks, to: `${routes.askQuestion}/my-questions`, count: getUserQuestions(questions, currentUser).length },
    { key: 'disputes', label: 'Disputes', icon: Gavel, to: `${routes.askQuestion}/disputes`, count: getUserDisputes(questions, currentUser).length },
    { key: 'history', label: 'History', icon: History, to: `${routes.askQuestion}/history`, count: 0 },
  ]

  return (
    <div className="question-dashboard">
      <PageHeader
        eyebrow="User portal"
        title="Ask a Question"
        subtitle="Ask a new text-based question and manage your questions, disputes and history from one place."
      />

      <nav className="question-dashboard-tabs" aria-label="Ask a Question sections">
        {sections.map((section) => {
          const Icon = section.icon
          const isActive = section.key === 'new' ? pathname === section.to : pathname.startsWith(section.to)

          return (
            <NavLink
              key={section.key}
              to={section.to}
              end={section.key === 'new'}
              aria-current={isActive ? 'page' : undefined}
              className={`question-dashboard-tab${isActive ? ' is-active' : ''}`}
            >
              <Icon size={15} aria-hidden="true" />
              {section.label}
              {section.count > 0 && <span className="question-dashboard-tab-count">{section.count}</span>}
            </NavLink>
          )
        })}
      </nav>

      <Outlet />
    </div>
  )
}