import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, CircleDollarSign, Gift, Megaphone, Search, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Card from '../../../../components/ui/Card.jsx'
import PageHeader from '../../../../components/ui/PageHeader.jsx'
import Section from '../../../../components/ui/Section.jsx'
import StatusBadge from '../../../../components/StatusBadge.jsx'
import SuccessAlert from '../../../../components/ui/SuccessAlert.jsx'
import { useAppData } from '../../../../state/AppDataContext.jsx'
import { useAuth } from '../../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../../utils/roleRoutes.js'
import { sortByDateDesc } from '../../../../utils/date.js'

function formatShortDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Detail({ label, value }) {
  return (
    <div className="field-group" style={{ margin: 0 }}>
      <span className="field-label-top">{label}</span>
      <div className="text-input" style={{ minHeight: 42, display: 'flex', alignItems: 'center' }}>{value ?? '—'}</div>
    </div>
  )
}

export function CampaignDetails({ campaign, onPublish, onFreeze, onDelete, onToggleDiscount, onBack }) {
  const generalRemaining = Math.max(campaign.generalLimit - campaign.purchasedGeneral, 0)
  const personalRemaining = Math.max(campaign.personalLimit - campaign.purchasedPersonal, 0)
  const discountPercent = Number(campaign.discountPercent) || 0
  const generalDiscount = Math.round((Number(campaign.generalPrice) * discountPercent) / 100)
  const personalDiscount = Math.round((Number(campaign.personalPrice) * discountPercent) / 100)
  const actionsMenuRef = useRef(null)
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)

  useEffect(() => {
    if (!actionsMenuOpen) return undefined
    const closeOnOutsideClick = (event) => {
      if (!actionsMenuRef.current?.contains(event.target)) setActionsMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [actionsMenuOpen])

  const runAction = (fn) => () => { setActionsMenuOpen(false); fn?.() }

  return (
    <div className="grid gap-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 className="text-xl font-bold">{campaign.name}</h2>
              <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{formatShortDate(campaign.date)} - {formatShortDate(campaign.endDate)}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{campaign.id}</p>
            {campaign.status === 'Scheduled' && <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>Publishes: {new Date(campaign.scheduledPublishAt).toLocaleString('en-IN')}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusBadge label={campaign.status} />
            <div className="member-profile-menu-wrap" ref={actionsMenuRef}>
              <button type="button" className="btn btn-primary audience-member-actions__button" aria-label="Campaign actions" aria-expanded={actionsMenuOpen} onClick={() => setActionsMenuOpen((open) => !open)}>
                <ChevronDown size={16} /> Actions
              </button>
              {actionsMenuOpen && <div className="member-profile-menu" role="menu">
                <div style={{ padding: '4px 10px 6px', fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-border)', marginBottom: 4 }}>
                  Status: <span style={{ color: 'var(--primary)' }}>{campaign.status}</span>
                </div>
                <button type="button" role="menuitem" onClick={runAction(onPublish)} style={{ color: campaign.status === 'Active' ? 'var(--text-secondary)' : 'var(--green-600)' }}>Publish</button>
                <button type="button" role="menuitem" onClick={runAction(onFreeze)} style={{ color: campaign.status === 'Closed' ? 'var(--text-secondary)' : 'var(--gold-600)' }}>Freeze</button>
                <button type="button" role="menuitem" onClick={runAction(onDelete)} style={{ color: 'var(--red-600)' }}>Delete Campaign</button>
                <button type="button" role="menuitem" onClick={runAction(onToggleDiscount)} style={{ color: discountPercent > 0 ? 'var(--primary)' : 'var(--text-secondary)' }}>{discountPercent > 0 ? `Discount ${discountPercent}%` : 'Enable Discount'}</button>
              </div>}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="section-title" style={{ fontSize: 15 }}><CircleDollarSign size={18} />Slots, Pricing & Discount</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div style={{ border: '1px solid var(--surface-border)', borderTop: '3px solid var(--violet-600)', borderRadius: 14, padding: 16, display: 'grid', gap: 12, alignContent: 'flex-start' }}>
            <div className="section-title" style={{ fontSize: 15, fontWeight: 800, color: 'var(--violet-600)' }}>General</div>
            <Detail label="Slots" value={campaign.generalLimit} />
            <Detail label="Price" value={`₹${Number(campaign.generalPrice) - generalDiscount}`} />
            <Detail label="Sold Out" value={campaign.purchasedGeneral} />
            <Detail label="Remaining" value={generalRemaining} />
          </div>
          <div style={{ border: '1px solid var(--surface-border)', borderTop: '3px solid var(--sky-600)', borderRadius: 14, padding: 16, display: 'grid', gap: 12, alignContent: 'flex-start' }}>
            <div className="section-title" style={{ fontSize: 15, fontWeight: 800, color: 'var(--sky-600)' }}>Individual</div>
            <Detail label="Slots" value={campaign.personalLimit} />
            <Detail label="Price" value={`₹${Number(campaign.personalPrice) - personalDiscount}`} />
            <Detail label="Sold Out" value={campaign.purchasedPersonal} />
            <Detail label="Remaining" value={personalRemaining} />
          </div>
          <div style={{ border: '1px solid var(--surface-border)', borderTop: '3px solid var(--gold-600)', borderRadius: 14, padding: 16, display: 'grid', gap: 12, alignContent: 'flex-start' }}>
            <div className="section-title" style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold-600)' }}><Gift size={16} />Discount</div>
            <Detail label="Discount Percentage" value={`${discountPercent}%`} />
            <Detail label="General Price" value={`₹${Number(campaign.generalPrice) - generalDiscount}`} />
            <Detail label="Individual Price" value={`₹${Number(campaign.personalPrice) - personalDiscount}`} />
          </div>
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
  const [appliedQuery, setAppliedQuery] = useState('')
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
    const term = appliedQuery.trim().toLowerCase()
    if (!term) return categorized
    return categorized.filter((campaign) => [campaign.name, campaign.id, campaign.status, campaign.priority, ...(campaign.categories || []).map((category) => category.name)].join(' ').toLowerCase().includes(term))
  }, [appliedQuery, filterType, sortedCampaigns])

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
        <div className="search-bar search-bar--campaigns">
          <input
            className="text-input search-bar__input"
            placeholder="Search campaign or category..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setAppliedQuery(query)
            }}
          />
          <button type="button" className="icon-btn" aria-label="Search" onClick={() => setAppliedQuery(query)}>
            <Search size={18} />
          </button>
        </div>
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

      {detailsOpen && selectedCampaign && createPortal((
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
      ), document.body)}

      {deleteOpen && selectedCampaign && createPortal((
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
      ), document.body)}

      {publishSuccess && <SuccessAlert message="Campaign published successfully." onDismiss={() => setPublishSuccess(false)} />}
    </div>
  )
}
