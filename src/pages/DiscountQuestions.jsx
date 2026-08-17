import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, CircleDollarSign, Gift, Languages, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { mockAstrologers } from '../data/notificationData.js'
import { getRoleRoutes } from '../utils/roleRoutes.js'

function getRemainingDays(validUntil) {
  return Math.max(0, Math.ceil((validUntil - Date.now()) / (24 * 60 * 60 * 1000)))
}

function getAstrologer(astrologerId) {
  return mockAstrologers.find((astrologer) => astrologer.id === astrologerId) || null
}

export default function DiscountQuestions() {
  const { campaigns, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const availableQuestions = actions.getAvailableDiscountQuestions(currentUser?.id)
  const subscribedAstrologers = useMemo(() => {
    const seen = new Set()
    return availableQuestions.filter((question) => {
      if (seen.has(question.astrologerId)) return false
      seen.add(question.astrologerId)
      return true
    })
  }, [availableQuestions])
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)
  const [selectedAstrologerId, setSelectedAstrologerId] = useState(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState(null)
  const [priceType, setPriceType] = useState('general')
  const [paid, setPaid] = useState(false)

  const selectedQuestion = availableQuestions.find((question) => question.id === selectedQuestionId) || null
  const selectedAstrologerQuestion = subscribedAstrologers.find((question) => question.astrologerId === selectedAstrologerId) || null
  const selectedAstrologer = getAstrologer(selectedAstrologerId)
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'Active')
  const selectedCampaign = activeCampaigns.find((campaign) => campaign.id === selectedCampaignId) || null
  const actualPrice = selectedCampaign ? (priceType === 'personal' ? selectedCampaign.personalPrice : selectedCampaign.generalPrice) : 0
  const discountPercent = selectedCampaign?.discountPercent || 0
  const discountAmount = Math.round((actualPrice * discountPercent) / 100)
  const afterDiscountAmount = actualPrice - discountAmount

  const resetSelection = () => {
    setSelectedQuestionId(null)
    setSelectedAstrologerId(null)
    setSelectedCampaignId(null)
    setPaid(false)
  }

  if (!availableQuestions.length) {
    return (
      <div>
        <PageHeader eyebrow="User portal" title="Use Discount Questions" actions={<Link to={routes.dashboard} className="btn btn-outline"><ArrowLeft size={15} />Back to Dashboard</Link>} />
        <Card>
          <div className="flex items-center gap-3">
            <Gift className="text-[color:var(--primary)]" />
            <div>
              <div className="font-bold text-[color:var(--text-primary)]">No available discount questions</div>
              <div className="muted" style={{ marginTop: 4 }}>Your next discount question will appear here when it becomes available.</div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!selectedQuestion) {
    return (
      <div>
        <PageHeader eyebrow="User portal" title="Use Discount Questions" subtitle="Choose one of your subscribed astrologers." actions={<Link to={routes.dashboard} className="btn btn-outline"><ArrowLeft size={15} />Back to Dashboard</Link>} />
        <Section title="Subscribed Astrologers" icon={UserRound}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {subscribedAstrologers.map((question) => {
              const astrologer = getAstrologer(question.astrologerId)
              return (
                <Card key={question.astrologerId} hover>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] font-bold text-white">
                        {question.astrologerName.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">{question.astrologerName}</h2>
                        <div className="muted" style={{ marginTop: 4 }}>{astrologer?.specialization || 'Astrology consultation'}</div>
                      </div>
                    </div>
                    {astrologer?.availability && <StatusBadge label={astrologer.availability} />}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
                    <Languages size={15} /> {astrologer?.languages?.join(' · ') || 'Languages available on profile'}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-[color:var(--accent-dark)]">
                    Discount question: {getRemainingDays(question.validUntil)} days remaining
                  </div>
                  <button type="button" className="btn btn-primary mt-5 w-full" onClick={() => { setSelectedQuestionId(question.id); setSelectedAstrologerId(question.astrologerId) }}>
                    View Campaigns
                  </button>
                </Card>
              )
            })}
          </div>
        </Section>
      </div>
    )
  }

  if (!selectedCampaign) {
    return (
      <div>
        <PageHeader eyebrow="User portal" title="Choose a Campaign" showBack backTo={routes.discountQuestions} />
        <Section title={`Campaigns for ${selectedAstrologerQuestion?.astrologerName || selectedAstrologer?.name || 'Astrologer'}`} icon={CircleDollarSign}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {activeCampaigns.map((campaign) => (
              <Card key={campaign.id} hover>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{campaign.name}</h2>
                    <div className="muted" style={{ marginTop: 5 }}>{campaign.date} · Ends {campaign.endDate}</div>
                  </div>
                  <StatusBadge label={campaign.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-[14px] bg-[color:var(--surface-soft)] p-3"><div className="muted">General</div><strong>₹{campaign.generalPrice}</strong></div>
                  <div className="rounded-[14px] bg-[color:var(--surface-soft)] p-3"><div className="muted">Personal</div><strong>₹{campaign.personalPrice}</strong></div>
                </div>
                <button type="button" className="btn btn-primary mt-5 w-full" onClick={() => setSelectedCampaignId(campaign.id)}>View Campaign Details</button>
              </Card>
            ))}
          </div>
        </Section>
      </div>
    )
  }

  if (paid) {
    return (
      <div>
        <PageHeader eyebrow="User portal" title="Payment Successful" />
        <Card className="mx-auto max-w-[620px] text-center">
          <CheckCircle2 size={48} className="mx-auto text-[color:var(--success)]" />
          <h2 className="mt-4 text-xl font-bold">Discount payment completed</h2>
          <p className="muted" style={{ marginTop: 8 }}>Your discount question is still available until you submit the question.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button type="button" className="btn btn-primary" onClick={() => navigate(`${routes.askQuestion}?useDiscount=1&discountQuestionId=${encodeURIComponent(selectedQuestion.id)}&campaignId=${encodeURIComponent(selectedCampaign.id)}&priceType=${priceType}`)}>Ask Now</button>
            <button type="button" className="btn btn-ghost" onClick={resetSelection}>Later</button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="User portal" title="Campaign Details" showBack backTo={routes.discountQuestions} />
      <Section title={selectedCampaign.name} icon={CircleDollarSign}>
        <Card className="mx-auto max-w-[720px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="muted">Subscribed astrologer</div>
              <h2 className="mt-1 text-xl font-bold">{selectedAstrologerQuestion?.astrologerName || selectedAstrologer?.name}</h2>
            </div>
            <StatusBadge label={selectedCampaign.status} />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="button" className={`rounded-[14px] border p-4 text-left ${priceType === 'general' ? 'border-[color:var(--primary)] bg-[color:var(--primary-bg)]' : 'border-[color:var(--border)]'}`} onClick={() => setPriceType('general')}>
              <div className="muted text-sm">General Question</div><div className="mt-1 text-lg font-bold">₹{selectedCampaign.generalPrice}</div>
            </button>
            <button type="button" className={`rounded-[14px] border p-4 text-left ${priceType === 'personal' ? 'border-[color:var(--primary)] bg-[color:var(--primary-bg)]' : 'border-[color:var(--border)]'}`} onClick={() => setPriceType('personal')}>
              <div className="muted text-sm">Personal Question</div><div className="mt-1 text-lg font-bold">₹{selectedCampaign.personalPrice}</div>
            </button>
          </div>
          <div className="mt-5 grid gap-3 rounded-[14px] bg-[color:var(--surface-soft)] p-4">
            <div className="flex justify-between gap-4"><span>Actual Price</span><strong>₹{actualPrice}</strong></div>
            <div className="flex justify-between gap-4"><span>Subscriber Discount</span><strong>{discountPercent}%</strong></div>
            <div className="flex justify-between gap-4"><span>Discount Amount</span><strong>-₹{discountAmount}</strong></div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="flex justify-between gap-4 text-lg"><span>After Discount</span><strong>₹{afterDiscountAmount}</strong></div>
          </div>
          <button type="button" className="btn btn-primary mt-5 w-full" onClick={() => setPaid(true)}>Pay ₹{afterDiscountAmount}</button>
        </Card>
      </Section>
    </div>
  )
}
