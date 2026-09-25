import { NavLink, useLocation } from 'react-router-dom'
import { History, MessageCircleQuestion } from 'lucide-react'
import { TempleLotusIcon } from './TempleIcons.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

const MODULE_TABS = [
  {
    key: 'questions',
    label: 'Questions',
    icon: MessageCircleQuestion,
    routeKey: 'textBasedQuestions',
    color: 'var(--primary)',
    tint: 'var(--primary-bg)',
    border: 'rgba(91, 33, 182, 0.22)',
    shadow: '0 6px 18px rgba(91, 33, 182, 0.16)',
  },
  {
    key: 'answer',
    label: 'Answer Questions',
    icon: TempleLotusIcon,
    routeKey: 'answerQuestion',
    color: 'var(--green-600)',
    tint: 'var(--success-bg)',
    border: 'rgba(5, 150, 105, 0.26)',
    shadow: '0 6px 18px rgba(5, 150, 105, 0.14)',
  },
  {
    key: 'history',
    label: 'History',
    icon: History,
    routeKey: 'textBasedQuestionHistory',
    color: 'var(--amber-600)',
    tint: 'var(--amber-100)',
    border: 'rgba(245, 158, 11, 0.30)',
    shadow: '0 6px 18px rgba(245, 158, 11, 0.16)',
  },
]

export default function TextBasedQuestionsModuleTabs() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const { pathname } = useLocation()

  return (
    <div className="tbq-module-tabs" role="tablist" aria-label="Text-Based Questions sections">
      {MODULE_TABS.map((tab) => {
        const Icon = tab.icon
        const to = routes[tab.routeKey]
        const isActive = pathname === to
        return (
          <NavLink
            key={tab.key}
            to={to}
            end
            role="tab"
            aria-selected={isActive ? 'true' : 'false'}
            className={`tbq-module-tab${isActive ? ' is-active' : ''}`}
            style={{
              color: isActive ? tab.color : undefined,
              background: isActive ? tab.tint : undefined,
              borderColor: isActive ? tab.border : undefined,
              boxShadow: isActive ? tab.shadow : undefined,
            }}
          >
            <Icon size={16} aria-hidden="true" />
            {tab.label}
          </NavLink>
        )
      })}
    </div>
  )
}