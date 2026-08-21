import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingBag,
  MessagesSquare,
  ListChecks,
  Gavel,
  Clock3,
  BadgeCheck,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { useAppData } from '../../../../state/AppDataContext.jsx'
import { useAuth } from '../../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../../utils/roleRoutes.js'
import StatCard from '../../../../components/ui/StatCard.jsx'
import ActionCard from '../../../../components/ui/ActionCard.jsx'
import Section from '../../../../components/ui/Section.jsx'
import StatusBadge from '../../../../components/StatusBadge.jsx'

export default function UserDashboard() {
  const { currentUser } = useAuth()
  const { campaigns, questions, actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()

  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || !currentUser?.id) return
    initialized.current = true
    actions.markExpiredDiscountQuestions(currentUser.id)
    actions.renewMonthlyDiscountQuestions(currentUser.id)
  }, [currentUser?.id, actions])

  const pending = questions.filter((question) => question.status === 'Pending').length
  const answered = questions.filter((question) => question.status === 'Answered').length
  const disputed = questions.filter((question) => question.status === 'Disputed').length
  const recentQuestions = questions.slice(0, 4)

  return (
    <div>
      <div className="hero-banner hero-banner-user">
        <div className="hero-banner-content">
          <div className="page-eyebrow" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            User portal
          </div>
          <h2>Welcome, {currentUser?.name || 'User'} ✨</h2>
          <p>Browse packages, ask questions, and keep track of every update in one place.</p>
        </div>
        <div className="hero-banner-cta">
          <button
            type="button"
            className="btn btn-primary hero-banner-button"
            onClick={() => navigate(routes.astrologers)}
          >
            Explore Astrologers
          </button>
        </div>
      </div>

      <div className="stat-grid section">
        <button
          className="stat-card-clickable"
          onClick={() => navigate(routes.purchasePackage)}
        >
          <StatCard icon={ShoppingBag} label="available packages" value={campaigns.length} tone="gold" />
        </button>
        <button
          className="stat-card-clickable"
          onClick={() => navigate(`${routes.trackQuestions}?status=Pending`)}
        >
          <StatCard icon={MessagesSquare} label="questions pending" value={pending} tone="sky" />
        </button>
        <button
          className="stat-card-clickable"
          onClick={() => navigate(`${routes.trackQuestions}?status=Answered`)}
        >
          <StatCard icon={BadgeCheck} label="answered questions" value={answered} tone="green" />
        </button>
        <button
          className="stat-card-clickable"
          onClick={() => navigate(routes.raiseDispute)}
        >
          <StatCard icon={ShieldAlert} label="open disputes" value={disputed} tone="red" />
        </button>
      </div>

      <div className="section grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_0.95fr]">
        <div>
          <div className="section-title"><Sparkles size={20} />Quick Actions</div>
          <div className="grid gap-1">
            <ActionCard icon={ShoppingBag} title="Purchase Package" to={routes.purchasePackage} />
            <ActionCard icon={MessagesSquare} title="Ask a Question" to={routes.askQuestion} />
            <ActionCard icon={ListChecks} title="Track Questions" to={routes.trackQuestions} />
            <ActionCard icon={Gavel} title="Raise Dispute" to={routes.raiseDispute} />
          </div>
        </div>

        <div>
          <div className="section-title"><Clock3 size={20} />Recent Activity</div>
          <div className="activity-list">
            {recentQuestions.map((question) => (
              <div key={question.id} className="activity-row">
                <div>
                  <div className="activity-id">{question.id}</div>
                  <div className="activity-meta">{question.category} · {question.type}</div>
                </div>
                <StatusBadge label={question.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Section title="Guided Flow" icon={ListChecks}>
        <div className="step-list">
          <div className="step-item">
            <div className="step-number">1</div>
            <div>
              <div className="step-title">Buy package</div>
              <div className="step-desc">Choose a campaign and purchase the package that fits your needs.</div>
            </div>
          </div>
          <div className="step-item">
            <div className="step-number">2</div>
            <div>
              <div className="step-title">Ask question</div>
              <div className="step-desc">Submit a general or personal question with the right context and attachments.</div>
            </div>
          </div>
          <div className="step-item">
            <div className="step-number">3</div>
            <div>
              <div className="step-title">Track outcomes</div>
              <div className="step-desc">Follow progress, view answers, and raise disputes when needed.</div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}
