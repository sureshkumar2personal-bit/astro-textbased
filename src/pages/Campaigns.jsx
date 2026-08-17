import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, CircleDollarSign, ListChecks, Megaphone, Users } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { sortByDateDesc } from '../utils/date.js'

function Detail({ label, value }) {
  return (
    <div className="field-group" style={{ margin: 0 }}>
      <span className="field-label-top">{label}</span>
      <div className="text-input" style={{ minHeight: 42, display: 'flex', alignItems: 'center' }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

export default function Campaigns() {
  const { campaigns, selectedCampaignId, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const [campaignId, setCampaignId] = useState(selectedCampaignId || campaigns[0]?.id)
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')

  const sortedCampaigns = useMemo(
    () => campaigns.slice().sort((a, b) => sortByDateDesc(a, b, (item) => item.date)),
    [campaigns],
  )

  useEffect(() => {
    const requestedCampaignId = searchParams.get('campaignId')
    if (requestedCampaignId && campaigns.some((campaign) => campaign.id === requestedCampaignId)) {
      setCampaignId(requestedCampaignId)
      actions.selectCampaign(requestedCampaignId)
    }
  }, [actions, campaigns, searchParams])

  const filteredCampaigns = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return sortedCampaigns
    return sortedCampaigns.filter((campaign) => {
      const categories = (campaign.categories || []).map((category) => category.name)
      return [campaign.name, campaign.id, campaign.status, campaign.priority, ...categories]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [query, sortedCampaigns])

  const selectedCampaign = campaigns.find((campaign) => campaign.id === campaignId) || sortedCampaigns[0]

  if (!selectedCampaign) {
    return (
      <div>
        <PageHeader eyebrow="Astrologer" title="All Campaigns" showBack backTo={routes.dashboard} />
        <Card><p className="muted">No campaigns are available.</p></Card>
      </div>
    )
  }

  const remainingQuestions = Math.max(
    selectedCampaign.totalLimit - selectedCampaign.generalLimit - selectedCampaign.personalLimit,
    0,
  )
  const compulsoryTotal = (selectedCampaign.categories || []).reduce(
    (sum, category) => sum + (Number(category.compulsoryQuestions) || 0),
    0,
  )

  const selectCampaign = (id) => {
    setCampaignId(id)
    actions.selectCampaign(id)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Astrologer"
        title="All Campaigns"
        subtitle="Select a campaign to view its complete details."
        actions={<Link to={routes.dashboard} className="btn btn-outline"><ArrowLeft size={15} />Back to Dashboard</Link>}
      />

      <div className="campaigns-page-grid grid grid-cols-1 gap-6 xl:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.7fr)]">
        <Section title={`Campaigns (${campaigns.length})`} icon={Megaphone}>
          <input
            className="text-input"
            placeholder="Search campaign or category..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div className="grid gap-3">
            {filteredCampaigns.map((campaign) => (
              <button
                type="button"
                key={campaign.id}
                className="card text-left transition"
                style={{
                  cursor: 'pointer',
                  border: campaign.id === selectedCampaign.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-l)',
                  padding: 20,
                  background: campaign.id === selectedCampaign.id ? 'var(--primary-bg)' : 'transparent',
                }}
                onClick={() => selectCampaign(campaign.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{campaign.name}</span>
                  <StatusBadge label={campaign.status} />
                </div>
                <div className="muted" style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>{campaign.date} – {campaign.endDate}</span>
                  <span>General ₹{campaign.generalPrice} · Personal ₹{campaign.personalPrice}</span>
                  <span>{campaign.purchasedGeneral + campaign.purchasedPersonal}/{campaign.totalLimit} questions sold</span>
                  <span>{campaign.priority} priority</span>
                </div>
              </button>
            ))}
            {!filteredCampaigns.length && <p className="muted" style={{ margin: 0 }}>No campaigns match your search.</p>}
          </div>
        </Section>

        <div className="campaigns-details-column">
          <Section title="Campaign Details" icon={Megaphone}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4" style={{ marginBottom: 18 }}>
                <div>
                  <h2 className="text-xl font-bold">{selectedCampaign.name}</h2>
                  <p className="muted" style={{ margin: '6px 0 0' }}>{selectedCampaign.id}</p>
                </div>
                <StatusBadge label={selectedCampaign.status} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Detail label="Start Date" value={selectedCampaign.date} />
                <Detail label="Closed Date" value={selectedCampaign.endDate} />
                <Detail label="Priority" value={selectedCampaign.priority} />
                <Detail label="Package Price" value={`₹${selectedCampaign.packagePrice || 0}`} />
              </div>
            </Card>
          </Section>

          <Section title="Pricing & Question Allocation" icon={CircleDollarSign}>
            <Card>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="General Price" value={`₹${selectedCampaign.generalPrice}`} />
                <Detail label="Personal Price" value={`₹${selectedCampaign.personalPrice}`} />
                <Detail label="Total Questions" value={selectedCampaign.totalLimit} />
                <Detail label="Remaining Questions" value={remainingQuestions} />
                <Detail label="General Questions" value={`${selectedCampaign.generalLimit} (${selectedCampaign.purchasedGeneral} sold)`} />
                <Detail label="Personal Questions" value={`${selectedCampaign.personalLimit} (${selectedCampaign.purchasedPersonal} sold)`} />
              </div>
            </Card>
          </Section>

          <Section title="Offers & Categories" icon={ListChecks}>
            <Card>
              <div className="flex flex-wrap gap-2" style={{ marginBottom: 18 }}>
                <span className={`badge ${selectedCampaign.generalOffer ? 'badge-green' : 'badge-gray'}`}>
                  General offer: {selectedCampaign.generalOffer ? 'Enabled' : 'Disabled'}
                </span>
                <span className={`badge ${selectedCampaign.personalOffer ? 'badge-green' : 'badge-gray'}`}>
                  Personal offer: {selectedCampaign.personalOffer ? 'Enabled' : 'Disabled'}
                </span>
                <span className="badge badge-violet">Compulsory total: {compulsoryTotal}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Category</th><th>Normal Price</th><th>Discount</th><th>Compulsory Questions</th></tr>
                  </thead>
                  <tbody>
                    {(selectedCampaign.categories || []).map((category, index) => (
                      <tr key={`${category.name}-${index}`}>
                        <td>{category.name}</td>
                        <td>₹{category.normalPrice}</td>
                        <td>{category.discountPercent}%</td>
                        <td>{category.compulsoryQuestions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Section>

          <Section title="Sales Summary" icon={Users}>
            <Card>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Detail label="General Sold" value={selectedCampaign.purchasedGeneral} />
                <Detail label="Personal Sold" value={selectedCampaign.purchasedPersonal} />
                <Detail
                  label="Total Revenue"
                  value={`₹${((selectedCampaign.purchasedGeneral * selectedCampaign.generalPrice) + (selectedCampaign.purchasedPersonal * selectedCampaign.personalPrice)).toLocaleString('en-IN')}`}
                />
              </div>
              <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 13 }}>
                <CalendarDays size={15} /> Campaign dates: {selectedCampaign.date} to {selectedCampaign.endDate || '—'}
              </div>
            </Card>
          </Section>
        </div>
      </div>
    </div>
  )
}
