import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Megaphone,
  ShoppingBag,
  MessageCircleCheck,
  ShieldAlert,
  Search,
  MessageCircleReply,
  Gavel,
  LineChart,
  ArrowRight,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import { ChipGroup } from '../components/OptionGroup.jsx'
import Card from '../components/ui/Card.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import ActionCard from '../components/ui/ActionCard.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { sortByDateDesc } from '../utils/date.js'

export default function Dashboard() {
  const { campaigns, questions, selectedCampaignId, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState('Date')
  const [query, setQuery] = useState('')
  const [campaignFilter, setCampaignFilter] = useState(selectedCampaignId)
  const questionListRef = useRef(null)

  const stats = useMemo(() => {
    const pending = questions.filter((q) => q.status === 'Pending').length
    const answered = questions.filter((q) => q.status === 'Answered').length
    const disputed = questions.filter((q) => q.status === 'Disputed').length
    const sold = questions.filter((q) => q.purchaseType === 'Paid').length
    return [
      { label: 'active campaigns', value: campaigns.length, icon: Megaphone, tone: 'violet', route: routes.salesManagement },
      { label: 'sold questions', value: sold, icon: ShoppingBag, tone: 'gold', route: routes.salesManagement },
      { label: 'queued questions', value: pending, icon: MessageCircleReply, tone: 'sky', route: `${routes.answerQuestion}?status=pending_group` },
      { label: 'answered questions', value: answered, icon: MessageCircleCheck, tone: 'green', route: `${routes.answerQuestion}?status=Answered` },
      { label: 'disputed questions', value: disputed, icon: ShieldAlert, tone: 'red', route: routes.disputeManagement },
    ]
  }, [campaigns, questions, routes])

  const sortedCampaigns = useMemo(() => {
    const list = campaigns.slice()
    const priorityWeight = { High: 0, Medium: 1, Low: 2 }

    if (sortBy === 'Priority') {
      return list.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority])
    }
    if (sortBy === 'Campaign') {
      return list.sort((a, b) => a.name.localeCompare(b.name))
    }
    return list.sort((a, b) => sortByDateDesc(a, b, (item) => item.date))
  }, [campaigns, sortBy])

  const filteredQuestions = useMemo(() => {
    const term = query.trim().toLowerCase()
    const priorityWeight = { High: 0, Medium: 1, Low: 2 }

    return questions
      .filter((question) => {
        if (term) return true
        return !campaignFilter || question.campaignId === campaignFilter
      })
      .filter((question) => {
        if (!term) return true
        const haystack = [question.id, question.user, question.category, question.type, question.status, question.campaignName]
          .join(' ')
          .toLowerCase()
        return haystack.includes(term)
      })
      .sort((a, b) => {
        if (sortBy === 'Priority') {
          return priorityWeight[a.priority] - priorityWeight[b.priority]
        }
        if (sortBy === 'Campaign') {
          return a.campaignName.localeCompare(b.campaignName)
        }
        return sortByDateDesc(a, b, (item) => item.raisedAt || item.raised)
      })
  }, [query, campaignFilter, questions, sortBy])

  return (
    <div>
      <div className="hero-banner">
        <div className="page-eyebrow" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
          Welcome back
        </div>
        <h2>Welcome, Astro ✨</h2>
        <p>Here&apos;s what&apos;s happening across your campaigns today.</p>
      </div>

      <div className="stat-grid section">
        {stats.map((stat) => (
          <button
            key={stat.label}
            className="stat-card-clickable"
            onClick={() => navigate(stat.route)}
          >
            <StatCard
              icon={stat.icon}
              tone={stat.tone}
              value={stat.value}
              label={<span className="capitalize">{stat.label}</span>}
            />
          </button>
        ))}
      </div>

      <div className="section grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <div className="section-title"><Megaphone size={20} />Active Campaign</div>
          <select
            className="select-input"
            value={campaignFilter}
            onChange={(e) => {
              setCampaignFilter(e.target.value)
              actions.selectCampaign(e.target.value)
            }}
            style={{ maxWidth: 340 }}
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2" style={{ marginTop: 16 }}>
            {sortedCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={`badge ${campaign.id === campaignFilter ? 'badge-green' : 'badge-violet'}`}
                style={{ width: 'fit-content' }}
              >
                {campaign.name} · {campaign.priority} · {campaign.date}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <Link to={routes.textBasedQuestions} className="btn btn-primary">
              Text Based Questions <ArrowRight size={15} />
            </Link>
          </div>
        </Card>

        <Card>
          <div className="section-title"><Search size={20} />Search</div>
          <div className="flex flex-wrap gap-2.5">
            <input
              className="text-input"
              placeholder="Search by question ID, user, category..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  questionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => questionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Search
            </button>
          </div>
          {query.trim() && (
            <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
              {filteredQuestions.length
                ? `Found ${filteredQuestions.length} question${filteredQuestions.length === 1 ? '' : 's'} for "${query.trim()}"`
                : `No questions found for "${query.trim()}"`}
            </div>
          )}
          <div className="divider" />
          <div className="section-title" style={{ marginBottom: 12 }}>Quick Actions</div>
          <div className="grid gap-1">
            <ActionCard icon={MessageCircleReply} title="Answer a question" to={routes.answerQuestion} />
            <ActionCard icon={Gavel} title="Handle a dispute" to={routes.disputeManagement} />
            <ActionCard icon={LineChart} title="Manage text sales" to={routes.salesManagement} />
          </div>
        </Card>
      </div>

      <div className="section">
        <div className="section-title">Sort By</div>
        <ChipGroup options={['Date', 'Priority', 'Campaign']} value={sortBy} onChange={setSortBy} />
      </div>

      <div className="section" ref={questionListRef}>
        <div className="section-title">Question List</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>User</th><th>Category</th><th>Type</th><th>Status</th><th>Time</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: '20px 16px' }}>
                    No questions match your search.
                  </td>
                </tr>
              )}
              {filteredQuestions.map((question) => {
                const actionLabel = question.status === 'Disputed' ? 'Resolve' : question.status === 'Pending' ? 'Open' : 'View'
                const actionRoute = question.status === 'Disputed' ? routes.disputeManagement : routes.answerQuestion
                return (
                  <tr key={question.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{question.id}</td>
                    <td>{question.user}</td>
                    <td>{question.category}</td>
                    <td>{question.type}</td>
                    <td><StatusBadge label={question.status} /></td>
                    <td className="muted">{question.raised}</td>
                    <td>
                      <Link to={`${actionRoute}?questionId=${question.id}`} className="link-btn">
                        {actionLabel}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
