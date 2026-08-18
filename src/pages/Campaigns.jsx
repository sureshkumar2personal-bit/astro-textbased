import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CircleDollarSign, Gift, Megaphone, Users, X } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { sortByDateDesc } from '../utils/date.js'

function Detail({ label, value }) {
  return (
    <div className="field-group" style={{ margin: 0 }}>
      <span className="field-label-top">{label}</span>
      <div className="text-input" style={{ minHeight: 42, display: 'flex', alignItems: 'center' }}>{value ?? '—'}</div>
    </div>
  )
}

export function CampaignDetails({ campaign, onPublish, onFreeze, onDelete, onToggleDiscount, onBack }) {
  const totalRemaining = Math.max(campaign.totalLimit - campaign.purchasedGeneral - campaign.purchasedPersonal, 0)
  const generalRemaining = Math.max(campaign.generalLimit - campaign.purchasedGeneral, 0)
  const personalRemaining = Math.max(campaign.personalLimit - campaign.purchasedPersonal, 0)
  const discountPercent = Number(campaign.discountPercent) || 0
  const generalDiscount = Math.round((Number(campaign.generalPrice) * discountPercent) / 100)
  const personalDiscount = Math.round((Number(campaign.personalPrice) * discountPercent) / 100)

  return (
    <div className="grid gap-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4" style={{ marginBottom: 18 }}>
          <div><h2 className="text-xl font-bold">{campaign.name}</h2><p className="muted" style={{ margin: '6px 0 0' }}>{campaign.id}</p></div>
          <StatusBadge label={campaign.status} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Start Date" value={campaign.date} />
          <Detail label="Closed Date" value={campaign.endDate} />
          {campaign.status === 'Scheduled' && <Detail label="Scheduled Publish" value={new Date(campaign.scheduledPublishAt).toLocaleString('en-IN')} />}
        </div>
      </Card>

      <Card>
        <div className="section-title" style={{ fontSize: 15 }}><CircleDollarSign size={18} />Slots & Pricing</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="General Original Price" value={`₹${campaign.generalPrice}`} />
          <Detail label="Individual Original Price" value={`₹${campaign.personalPrice}`} />
          <Detail label="General Actual Price" value={`₹${Number(campaign.generalPrice) - generalDiscount}`} />
          <Detail label="Individual Actual Price" value={`₹${Number(campaign.personalPrice) - personalDiscount}`} />
          <Detail label="Total Slots" value={campaign.totalLimit} />
          <Detail label="Total Remaining Slots" value={totalRemaining} />
          <Detail label="General Allocation Slots" value={campaign.generalLimit} />
          <Detail label="General Sold-out Slots" value={campaign.purchasedGeneral} />
          <Detail label="General Remaining Slots" value={generalRemaining} />
          <Detail label="Individual Allocation Slots" value={campaign.personalLimit} />
          <Detail label="Individual Sold-out Slots" value={campaign.purchasedPersonal} />
          <Detail label="Individual Remaining Slots" value={personalRemaining} />
        </div>
      </Card>

      <Card>
        <div className="section-title" style={{ fontSize: 15 }}><Gift size={18} />Subscriber Discount</div>
        {discountPercent > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Detail label="Discount Percentage" value={`${discountPercent}%`} />
            <Detail label="Total Sold-out Slots" value={campaign.purchasedGeneral + campaign.purchasedPersonal} />
            <Detail label="Total Remaining Slots" value={totalRemaining} />
          </div>
        ) : (
          <div className="muted">No subscriber discount is available for this campaign.</div>
        )}
      </Card>

      <Card>
        <div className="section-title" style={{ fontSize: 15 }}><Users size={18} />Sales Summary</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Detail label="General Sold" value={campaign.purchasedGeneral} />
          <Detail label="Personal Sold" value={campaign.purchasedPersonal} />
          <Detail label="Total Revenue" value={`₹${((campaign.purchasedGeneral * campaign.generalPrice) + (campaign.purchasedPersonal * campaign.personalPrice)).toLocaleString('en-IN')}`} />
        </div>
        <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 13 }}><CalendarDays size={15} /> Campaign dates: {campaign.date} to {campaign.endDate || '—'}</div>
      </Card>

      <Card>
        <div className="section-title" style={{ fontSize: 15 }}><Megaphone size={18} />Campaign Actions</div>
        <div className="flex flex-wrap gap-3">
          {onBack && <button type="button" className="btn btn-ghost" onClick={onBack}>Back</button>}
          <button type="button" className={`btn ${campaign.status === 'Active' ? 'btn-success' : 'btn-success-outline'}`} onClick={onPublish}>
            Publish
          </button>
          <button type="button" className={`btn ${campaign.status === 'Closed' ? 'btn-warning' : 'btn-warning-outline'}`} onClick={onFreeze}>
            Freeze
          </button>
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            Delete Campaign
          </button>
          <button type="button" className={`btn ${discountPercent > 0 ? 'btn-primary' : 'btn-outline'}`} onClick={onToggleDiscount}>
            {discountPercent > 0 ? `Discount ${discountPercent}%` : 'Enable Discount'}
          </button>
        </div>
      </Card>
    </div>
  )
}

export default function Campaigns() {
  const { campaigns, selectedCampaignId, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(selectedCampaignId || campaigns[0]?.id)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const filterType = searchParams.get('filter')
  const fromDashboard = searchParams.get('from') === 'dashboard'

  const sortedCampaigns = useMemo(() => campaigns.slice().sort((a, b) => sortByDateDesc(a, b, (item) => item.date)), [campaigns])
  const filteredCampaigns = useMemo(() => {
    const categorized = sortedCampaigns.filter((campaign) => {
      if (filterType === 'active') return campaign.status === 'Active'
      if (filterType === 'discount') return campaign.status === 'Active' && ((campaign.discountPercent || 0) > 0 || campaign.generalOffer || campaign.personalOffer)
      if (filterType === 'non-discount') return campaign.status === 'Active' && (campaign.discountPercent || 0) <= 0 && !campaign.generalOffer && !campaign.personalOffer
      return true
    })
    const term = query.trim().toLowerCase()
    if (!term) return categorized
    return categorized.filter((campaign) => [campaign.name, campaign.id, campaign.status, campaign.priority, ...(campaign.categories || []).map((category) => category.name)].join(' ').toLowerCase().includes(term))
  }, [filterType, query, sortedCampaigns])

  const closeDetails = useCallback(() => {
    setDetailsOpen(false)
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.delete('campaignId')
      next.delete('from')
      return next
    })
  }, [setSearchParams])

  useEffect(() => {
    const requestedCampaignId = searchParams.get('campaignId')
    if (requestedCampaignId && campaigns.some((campaign) => campaign.id === requestedCampaignId)) {
      setSelectedId(requestedCampaignId)
      actions.selectCampaign(requestedCampaignId)
      setDetailsOpen(true)
    }
  }, [actions, campaigns, searchParams])

  useEffect(() => {
    if (!detailsOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => { if (event.key === 'Escape') closeDetails() }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [detailsOpen, closeDetails])

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedId) || null
  const pageTitle = filterType === 'active' ? 'Active Campaigns' : filterType === 'discount' ? 'Discount Campaigns' : filterType === 'non-discount' ? 'Non-Discount Campaigns' : 'All Campaigns'
  const openDetails = (campaign) => {
    setSelectedId(campaign.id)
    actions.selectCampaign(campaign.id)
    setDetailsOpen(true)
  }

  const handleDetailsBack = () => {
    if (fromDashboard) {
      navigate(routes.dashboard)
      return
    }
    closeDetails()
  }

  return (
    <div>
      <PageHeader eyebrow="Astrologer" title={pageTitle} subtitle="Select a campaign card to view its complete details." actions={<Link to={routes.dashboard} className="btn btn-outline">Back to Dashboard</Link>} />
      <Section title={`Campaigns (${filteredCampaigns.length})`} icon={Megaphone}>
        <input className="text-input" placeholder="Search campaign or category..." value={query} onChange={(event) => setQuery(event.target.value)} style={{ marginBottom: 16, maxWidth: 420 }} />
        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <button type="button" key={campaign.id} className="card flex h-full flex-col text-left transition hover:-translate-y-1 hover:border-[color:var(--secondary)]" onClick={() => openDetails(campaign)}>
              <div className="flex items-start justify-between gap-3"><div className="font-bold text-[color:var(--text-primary)]">{campaign.name}</div><StatusBadge label={campaign.status} /></div>
              <div className="muted mt-3 flex flex-1 flex-col gap-2 text-sm">
                <span>{campaign.date} – {campaign.endDate}</span>
                {campaign.status === 'Scheduled' && campaign.scheduledPublishAt && <span>Publishes: {new Date(campaign.scheduledPublishAt).toLocaleString('en-IN')}</span>}
                <span>{campaign.priority} priority</span>
                <span>General ₹{campaign.generalPrice} · Individual ₹{campaign.personalPrice}</span>
                <span>{campaign.purchasedGeneral + campaign.purchasedPersonal}/{campaign.totalLimit} slots sold</span>
                <span className={Number(campaign.discountPercent) > 0 ? 'font-semibold text-[color:var(--primary)]' : ''}>
                  {Number(campaign.discountPercent) > 0 ? `${campaign.discountPercent}% subscriber discount` : 'No subscriber discount'}
                </span>
              </div>
              <div className="mt-4 font-semibold text-[color:var(--primary)]">View Full Details →</div>
            </button>
          ))}
        </div>
        {!filteredCampaigns.length && <p className="muted" style={{ marginTop: 16 }}>No campaigns match your search.</p>}
      </Section>

      {detailsOpen && selectedCampaign && (
        <div className="modal-overlay" onClick={fromDashboard ? handleDetailsBack : closeDetails}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(980px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>Campaign Details</div>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-outline btn-sm" onClick={handleDetailsBack}>
                  {fromDashboard ? 'Back to Dashboard' : 'Back to Campaigns'}
                </button>
                <button type="button" className="icon-btn" aria-label="Close details" onClick={closeDetails}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-card__content">
              <CampaignDetails
                campaign={selectedCampaign}
                onPublish={() => {
                  actions.publishCampaign(selectedCampaign.id)
                  setPublishSuccess(true)
                }}
                onFreeze={() => actions.updateCampaign(selectedCampaign.id, { status: 'Closed' })}
                onDelete={() => setDeleteOpen(true)}
                onBack={handleDetailsBack}
                onToggleDiscount={() => {
                  const enabled = Number(selectedCampaign.discountPercent) > 0
                  actions.updateCampaign(selectedCampaign.id, {
                    discountPercent: enabled ? 0 : 60,
                    generalOffer: !enabled,
                    personalOffer: !enabled,
                  })
                }}
              />
            </div>
          </div>
        </div>
      )}

      {deleteOpen && selectedCampaign && (
        <div className="modal-overlay" style={{ zIndex: 70 }} onClick={() => setDeleteOpen(false)}>
          <div className="modal-card" style={{ width: 'min(460px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header">
              <div className="section-title" style={{ marginBottom: 0 }}>Delete Campaign?</div>
            </div>
            <div className="modal-card__content">
              <p className="muted">Are you sure you want to delete <strong>{selectedCampaign.name}</strong>? Existing questions and records will remain unchanged.</p>
            </div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  actions.deleteCampaign(selectedCampaign.id)
                  setDeleteOpen(false)
                  closeDetails()
                }}
              >
                Delete Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {publishSuccess && <SuccessAlert message="Campaign published successfully." onDismiss={() => setPublishSuccess(false)} />}
    </div>
  )
}
