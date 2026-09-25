import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import CreateCampaignModal from '../components/CreateCampaignModal.jsx'
import { CampaignDetails } from './Campaigns.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { sortByDateDesc } from '../utils/date.js'
import { TempleDonationBoxIcon, TempleReturnIcon } from '../components/TempleIcons.jsx'
import '../css/astrologer/sales-management.css'

const CAMPAIGN_TINTS = ['lavender', 'cream', 'mint']

export default function SalesManagement() {
  const { campaigns, selectedCampaignId, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined
  const [searchParams, setSearchParams] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [campaignQuery, setCampaignQuery] = useState('')
  const [appliedCampaignQuery, setAppliedCampaignQuery] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsCampaignId, setDetailsCampaignId] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || campaigns[0]

  const campaignCards = useMemo(() => {
    const term = appliedCampaignQuery.trim().toLowerCase()
    return campaigns
      .slice()
      .sort((a, b) => sortByDateDesc(a, b, (item) => item.date))
      .filter((campaign) => !term || [campaign.name, campaign.id, campaign.status, ...(campaign.categories || []).map((category) => category.name)].join(' ').toLowerCase().includes(term))
  }, [appliedCampaignQuery, campaigns])

  const detailsCampaign = campaigns.find((campaign) => campaign.id === detailsCampaignId) || null

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const openCampaignDetails = (campaign) => {
    setDetailsCampaignId(campaign.id)
    actions.selectCampaign(campaign.id)
    setDetailsOpen(true)
  }

  const toggleDiscount = () => {
    if (!detailsCampaign) return
    const enabled = Number(detailsCampaign.discountPercent) > 0
    actions.updateCampaign(detailsCampaign.id, {
      discountPercent: enabled ? 0 : 60,
      generalOffer: !enabled,
      personalOffer: !enabled,
    })
  }

  return (
    <div className="sales-management-page">
      <div className="sales-hero">
        <div className="sales-hero__left">
          <PageHeader
            eyebrow="Astrologer"
            title="Sales Management"
            subtitle="Campaigns, pricing & allocation"
            showBack
            backTo={routes.dashboard}
            backIcon={backIcon}
          />
          <div className="sales-hero__icon" aria-hidden="true">
            <TempleDonationBoxIcon size={30} />
          </div>
        </div>
        <div className="sales-hero__zodiac" aria-hidden="true" />
      </div>

      <Section title={`All Campaigns (${campaignCards.length})`} icon={TempleDonationBoxIcon}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="muted">Select a campaign card to view complete details.</div>
          <div className="campaign-toolbar">
            <button className="btn btn-primary" type="button" onClick={() => setCreateOpen(true)}>
              <TempleDonationBoxIcon size={15} />Create Campaign
            </button>
            <div className="search-bar">
              <input
                className="text-input search-bar__input"
                placeholder="Search campaigns"
                value={campaignQuery}
                onChange={(event) => setCampaignQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') setAppliedCampaignQuery(campaignQuery)
                }}
              />
              <button type="button" className="icon-btn" aria-label="Search" onClick={() => setAppliedCampaignQuery(campaignQuery)}>
                <Search size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="campaign-cards-grid">
          {campaignCards.map((campaign, index) => {
            const tint = CAMPAIGN_TINTS[index % CAMPAIGN_TINTS.length]
            const sold = campaign.purchasedGeneral + campaign.purchasedPersonal
            const progress = campaign.totalLimit ? Math.min(100, Math.round((sold / campaign.totalLimit) * 100)) : 0
            const hasDiscount = Number(campaign.discountPercent) > 0

            return (
              <button
                type="button"
                key={campaign.id}
                className={`campaign-card-modern campaign-card-modern--${tint}`}
                onClick={() => openCampaignDetails(campaign)}
              >
                <div className="campaign-card-modern__header">
                  <div className="campaign-card-modern__icon" aria-hidden="true">
                    <TempleDonationBoxIcon size={18} />
                  </div>
                  <div className="campaign-card-modern__name">{campaign.name}</div>
                  <StatusBadge label={campaign.status} className="campaign-card-modern__status" />
                </div>

                <div className="campaign-card-modern__body">
                  <div className="campaign-card-modern__dates">
                    {campaign.date} – {campaign.endDate}
                    {campaign.status === 'Scheduled' && campaign.scheduledPublishAt && (
                      <span className="campaign-card-modern__publish"> · Publishes: {new Date(campaign.scheduledPublishAt).toLocaleString('en-IN')}</span>
                    )}
                  </div>

                  <div className="campaign-card-modern__slots">
                    <div className="campaign-card-modern__slots-row">
                      <span>Total slots: {campaign.totalLimit}</span>
                      <span>Sold: {sold}</span>
                    </div>
                    <div className="campaign-card-modern__progress">
                      <div className="campaign-card-modern__progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="campaign-card-modern__divider" />

                  <div className="campaign-card-modern__pricing">
                    <span>General ₹{campaign.generalPrice}</span>
                    <span>Individual ₹{campaign.personalPrice}</span>
                  </div>

                  <div className="campaign-card-modern__divider" />

                  <div className={`campaign-card-modern__discount${hasDiscount ? ' has-discount' : ''}`}>
                    {hasDiscount ? `${campaign.discountPercent}% subscriber discount` : 'No subscriber discount'}
                  </div>
                </div>

                <div className="campaign-card-modern__footer">
                  View Campaign Details <span aria-hidden="true">→</span>
                </div>
              </button>
            )
          })}
        </div>
        {!campaignCards.length && <div className="muted mt-4">No campaigns match your search.</div>}
      </Section>

      <CreateCampaignModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
        }}
        onComplete={(action) => {
          setSuccessMessage(action === 'Published' ? 'Campaign published successfully.' : action === 'Scheduled' ? 'Campaign scheduled successfully.' : 'Campaign draft saved successfully.')
        }}
        defaultTotalLimit={selectedCampaign?.totalLimit || 30}
      />

      {detailsOpen && detailsCampaign && createPortal((
        <div className="modal-overlay" onClick={() => setDetailsOpen(false)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(980px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>Campaign Details</div>
              <button type="button" className="icon-btn" aria-label="Close campaign details" onClick={() => setDetailsOpen(false)}>×</button>
            </div>
            <div className="modal-card__content">
              <CampaignDetails
                campaign={detailsCampaign}
                onPublish={() => {
                  actions.publishCampaign(detailsCampaign.id)
                  setSuccessMessage('Campaign published successfully.')
                }}
                onFreeze={() => actions.updateCampaign(detailsCampaign.id, { status: 'Closed' })}
                onDelete={() => setDeleteOpen(true)}
                onToggleDiscount={toggleDiscount}
              />
            </div>
          </div>
        </div>
      ), document.body)}

      {deleteOpen && detailsCampaign && createPortal((
        <div className="modal-overlay" style={{ zIndex: 70 }} onClick={() => setDeleteOpen(false)}>
          <div className="modal-card" style={{ width: 'min(460px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header"><div className="section-title" style={{ marginBottom: 0 }}>Delete Campaign?</div></div>
            <div className="modal-card__content"><p className="muted">Are you sure you want to delete <strong>{detailsCampaign.name}</strong>? Existing questions and records will remain unchanged.</p></div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={() => { actions.deleteCampaign(detailsCampaign.id); setDeleteOpen(false); setDetailsOpen(false) }}>Delete Campaign</button>
            </div>
          </div>
        </div>
      ), document.body)}

      {successMessage && <SuccessAlert message={successMessage} onDismiss={() => setSuccessMessage('')} />}
    </div>
  )
}
