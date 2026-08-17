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
import CreateCampaignModal from '../components/CreateCampaignModal.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { sortByDateDesc } from '../utils/date.js'

export default function Dashboard() {
  const { campaigns, questions, selectedCampaign } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState('Date')
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const questionListRef = useRef(null)

  const stats = useMemo(() => {
    const pending = questions.filter((q) => q.status === 'Pending').length
    const answered = questions.filter((q) => q.status === 'Answered').length
    const disputed = questions.filter((q) => q.status === 'Disputed').length
    const sold = questions.filter((q) => q.purchaseType === 'Paid').length
    return [
      { label: 'active campaigns', value: campaigns.length, icon: Megaphone, tone: 'violet', route: routes.salesManagement },
      { label: 'sold questions', value: sold, icon: ShoppingBag, tone: 'gold', route: routes.salesManagement },
      { label: 'pending questions', value: pending, icon: MessageCircleReply, tone: 'sky', route: `${routes.answerQuestion}?status=pending_group` },
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

  const campaignGroups = useMemo(() => {
    const active = sortedCampaigns.filter((campaign) => campaign.status === 'Active')
    const discount = active.filter((campaign) => (campaign.discountPercent || 0) > 0 || campaign.generalOffer || campaign.personalOffer)
    const nonDiscount = active.filter((campaign) => (campaign.discountPercent || 0) <= 0 && !campaign.generalOffer && !campaign.personalOffer)
    return [
      { key: 'active', title: 'Active Campaigns', campaigns: active },
      { key: 'discount', title: 'Discount Campaigns', campaigns: discount },
      { key: 'non-discount', title: 'Non-Discount Campaigns', campaigns: nonDiscount },
    ]
  }, [sortedCampaigns])

  const filteredQuestions = useMemo(() => {
    const term = query.trim().toLowerCase()
    const priorityWeight = { High: 0, Medium: 1, Low: 2 }
    const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]))

    return questions
      .filter((question) => {
        if (!term) return true
        const campaign = campaignById.get(question.campaignId)
        const campaignCategories = campaign?.categories?.map((category) => category.name) || []
        const haystack = [
          question.id,
          question.user,
          question.category,
          question.type,
          question.status,
          question.campaignName,
          campaign?.name,
          ...campaignCategories,
        ]
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
  }, [query, campaigns, questions, sortBy])

  const handleSearch = () => {
    const term = query.trim().toLowerCase()
    if (!term) {
      questionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    const matchingCampaign = campaigns.find((campaign) => {
      const categories = (campaign.categories || []).map((category) => category.name)
      return [campaign.name, campaign.id, ...categories]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })

    if (matchingCampaign) {
      navigate(`${routes.campaigns}?campaignId=${encodeURIComponent(matchingCampaign.id)}`)
      return
    }

    questionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <div className="hero-banner">
        <div className="page-eyebrow" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
          Welcome back
        </div>
        <h2>Welcome, Astro ✨</h2>
        <p>Here&apos;s what&apos;s happening across your campaigns today.</p>
      </div>

      <div className="section" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          + Create Campaign
        </button>
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

      <div className="section">
        <div className="campaign-groups-grid grid grid-cols-1 gap-5 xl:grid-cols-3">
          {campaignGroups.map((group) => {
            const visibleCampaigns = group.campaigns.slice(0, 3)
            return (
              <Card key={group.key}>
                <div className="section-title"><Megaphone size={20} />{group.title}</div>
                <div className="grid gap-3">
                  {visibleCampaigns.map((campaign) => (
                    <button
                      type="button"
                      key={campaign.id}
                      className="rounded-[14px] border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] p-3 text-left transition hover:-translate-y-0.5 hover:border-[color:var(--secondary)]"
                      onClick={() => navigate(`${routes.campaigns}?campaignId=${encodeURIComponent(campaign.id)}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-[color:var(--text-primary)]">{campaign.name}</div>
                        <StatusBadge label={campaign.status} />
                      </div>
                      <div className="muted" style={{ marginTop: 7, fontSize: 12 }}>{campaign.priority} priority · {campaign.date}</div>
                    </button>
                  ))}
                  {!visibleCampaigns.length && <div className="muted" style={{ padding: '12px 0', fontSize: 13 }}>No campaigns available.</div>}
                </div>
                {group.campaigns.length > 3 && (
                  <Link to={`${routes.campaigns}?filter=${group.key}`} className="btn btn-ghost mt-4 w-full">
                    See More <ArrowRight size={15} />
                  </Link>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      <Card className="section">
        <div className="section-title"><Search size={20} />Search</div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="text-input"
            placeholder="Search by question ID, user, campaign, category..."
            value={query}
            style={{ flex: '0 1 360px', width: 'min(360px, 100%)', margin: 0 }}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch()
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary min-w-[110px]"
            onClick={handleSearch}
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

      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} defaultTotalLimit={selectedCampaign?.totalLimit || 30} />
    </div>
  )
}
