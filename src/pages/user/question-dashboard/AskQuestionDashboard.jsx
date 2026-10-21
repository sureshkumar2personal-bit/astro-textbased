import { useMemo } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CircleHelp, History, ListChecks, Package } from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { getUserQuestions } from '../../../utils/questionDashboard.js'
import { QUESTION_CREDIT_AVAILABLE, getQuestionCreditsForUser } from '../../../utils/questionCredits.js'
import './questiondashboard.css'

export default function AskQuestionDashboard() {
  const { currentUser } = useAuth()
  const { questions, purchasedSlots } = useAppData()
  const { pathname } = useLocation()
  const routes = getRoleRoutes(currentUser?.role)

  // Paid-but-unwritten "Pay Now & Ask Later" questions still need the user to
  // write the question, so they are counted on the Purchased Questions tab.
  const availablePurchasedCount = useMemo(
    () => getQuestionCreditsForUser(purchasedSlots, currentUser)
      .filter((credit) => credit.status === QUESTION_CREDIT_AVAILABLE).length,
    [purchasedSlots, currentUser],
  )

  // The Ask a Question sections. The dashboard is navigation only: Ask New and
  // My Questions render the pages that already implement those flows, and
  // Purchased Questions / History render read-only views built from the same
  // records. Disputes are managed inside My Questions, so they have no tab here.
  const sections = [
    { key: 'new', label: 'Ask New', icon: CircleHelp, to: routes.askQuestion, count: 0 },
    { key: 'my-questions', label: 'My Questions', icon: ListChecks, to: `${routes.askQuestion}/my-questions`, count: getUserQuestions(questions, currentUser).length },
    { key: 'purchased', label: 'Purchased Questions', icon: Package, to: `${routes.askQuestion}/purchased`, count: availablePurchasedCount },
    { key: 'history', label: 'History', icon: History, to: `${routes.askQuestion}/history`, count: 0 },
  ]

  return (
    <div className="question-dashboard">
      <PageHeader
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
              <Icon className="question-dashboard-tab-icon" size={18} strokeWidth={2.2} aria-hidden="true" />
              <span className="question-dashboard-tab-label">{section.label}</span>
              {section.count > 0 && <span className="question-dashboard-tab-count">{section.count}</span>}
            </NavLink>
          )
        })}
      </nav>

      <Outlet />
    </div>
  )
}