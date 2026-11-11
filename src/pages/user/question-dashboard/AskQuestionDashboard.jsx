import { useCallback, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  MessageSquare,
  PlusCircle,
  Ticket,
  History,
  ShieldCheck,
} from 'lucide-react'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { getUserQuestions } from '../../../utils/questionDashboard.js'
import { QUESTION_CREDIT_AVAILABLE, getQuestionCreditsForUser } from '../../../utils/questionCredits.js'
import FlowSteps from '../../../components/user/FlowSteps.jsx'
import '../../askquestion-astrologers.css'
import './questiondashboard.css'

export default function AskQuestionDashboard() {
  const { currentUser } = useAuth()
  const { questions, purchasedSlots } = useAppData()
  const { pathname } = useLocation()
  const routes = getRoleRoutes(currentUser?.role)
  const [askStep, setAskStep] = useState(1)
  const stepActionsRef = useRef(null)

  const isAskNew = pathname === `${routes.askQuestion}/new` || pathname.endsWith('/ask-question/new') || pathname.endsWith('/user/ask-question/new')

  // Paid-but-unwritten "Pay Now & Ask Later" questions still need the user to
  // write the question, so they are counted on the Purchased Questions tab.
  const availablePurchasedCount = useMemo(
    () => getQuestionCreditsForUser(purchasedSlots, currentUser)
      .filter((credit) => credit.status === QUESTION_CREDIT_AVAILABLE).length,
    [purchasedSlots, currentUser],
  )

  const myQuestionsCount = useMemo(
    () => getUserQuestions(questions, currentUser).length,
    [questions, currentUser],
  )

  // 4 Main Navigation Tabs matching the Royal Emerald & Purple Edition
  const sections = [
    { key: 'my-questions', label: 'My Questions', icon: MessageSquare, to: `${routes.askQuestion}/my-questions`, count: myQuestionsCount },
    { key: 'new', label: 'Ask New', icon: PlusCircle, to: `${routes.askQuestion}/new`, count: 0 },
    { key: 'purchased', label: 'Purchased Slots', icon: Ticket, to: `${routes.askQuestion}/purchased`, count: availablePurchasedCount },
    { key: 'history', label: 'History & Invoices', icon: History, to: `${routes.askQuestion}/history`, count: 0 },
  ]

  const handleStepClick = useCallback((targetStep) => {
    if (stepActionsRef.current?.goToStep) {
      stepActionsRef.current.goToStep(targetStep)
    }
  }, [])

  return (
    <div className="question-dashboard space-y-4">
      {/* User Side Theme Dynamic Hero Banner */}
      <div className="aq-hero-banner rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="aq-hero-eyebrow text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            Premium Astrological Suite
          </span>
          <h1 className="aq-hero-title text-2xl md:text-3xl font-extrabold mt-2">Ask a Question Hub</h1>
          <p className="aq-hero-desc text-xs mt-1">
            Managed campaigns, active slots, and 30-day astrologer response guarantee.
          </p>
        </div>
        <div className="flex items-center space-x-3 banner-shield-badge px-4 py-3 rounded-2xl">
          <ShieldCheck className="banner-shield-icon w-7 h-7 flex-shrink-0" />
          <div className="text-xs">
            <p className="banner-shield-title font-bold">100% Refund Guarantee</p>
            <p className="banner-shield-sub">Auto-refund on 30-day delay</p>
          </div>
        </div>
      </div>

      {/* Step Wizard indicator when inside 'Ask New' */}
      {isAskNew && (
        <div className="pt-1 pb-2">
          <FlowSteps current={askStep} onStepClick={handleStepClick} />
        </div>
      )}

      {/* 4 Main Navigation Tabs */}
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
              className={`question-dashboard-tab ${isActive ? 'aq-tab-btn-active' : 'aq-tab-btn-inactive'}`}
            >
              <Icon size={15} strokeWidth={2.4} aria-hidden="true" />
              <span>{section.label}</span>
              {section.count > 0 && (
                <span className={`question-dashboard-tab-count ${isActive ? 'aq-tab-count-active' : 'aq-tab-count-inactive'}`}>
                  {section.count}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Child tab content */}
      <Outlet context={{ askStep, setAskStep, stepActionsRef }} />
    </div>
  )
}
