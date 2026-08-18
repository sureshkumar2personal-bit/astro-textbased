import { useEffect, useMemo, useState } from 'react'
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

export default function SalesManagement() {
  const { campaigns, selectedCampaignId, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined
  const [searchParams, setSearchParams] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [created, setCreated] = useState(false)
  const [campaignQuery, setCampaignQuery] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsCampaignId, setDetailsCampaignId] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || campaigns[0]

  const campaignCards = useMemo(() => {
    const term = campaignQuery.trim().toLowerCase()
    return campaigns
      .slice()
      .sort((a, b) => sortByDateDesc(a, b, (item) => item.date))
      .filter((campaign) => !term || [campaign.name, campaign.id, campaign.status, ...(campaign.categories || []).map((category) => category.name)].join(' ').toLowerCase().includes(term))
  }, [campaignQuery, campaigns])

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
    <div>
      <PageHeader eyebrow="Astrologer" title="Sales Management" showBack backTo={routes.dashboard} backIcon={backIcon} />

      <Section title={`All Campaigns (${campaignCards.length})`} icon={TempleDonationBoxIcon}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="muted">Select a campaign card to view complete details.</div>
          <div className="flex flex-wrap items-center gap-3">
            <input className="text-input" placeholder="Search campaigns" value={campaignQuery} onChange={(event) => setCampaignQuery(event.target.value)} style={{ width: 240 }} />
            <button className="btn btn-primary" type="button" onClick={() => setCreateOpen(true)}>
              <TempleDonationBoxIcon size={15} />Create Campaign
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          {campaignCards.map((campaign) => (
            <button type="button" key={campaign.id} className="card flex h-full flex-col text-left transition hover:-translate-y-1 hover:border-[color:var(--secondary)]" onClick={() => openCampaignDetails(campaign)}>
              <div className="flex items-start justify-between gap-3">
                <div className="font-bold text-[color:var(--text-primary)]">{campaign.name}</div>
                <StatusBadge label={campaign.status} />
              </div>
              <div className="muted mt-3 flex flex-1 flex-col gap-2 text-sm">
                <span>{campaign.date} – {campaign.endDate}</span>
                <span>Total slots: {campaign.totalLimit} · Sold: {campaign.purchasedGeneral + campaign.purchasedPersonal}</span>
                <span>General ₹{campaign.generalPrice} · Individual ₹{campaign.personalPrice}</span>
                <span className={Number(campaign.discountPercent) > 0 ? 'font-semibold text-[color:var(--primary)]' : ''}>
                  {Number(campaign.discountPercent) > 0 ? `${campaign.discountPercent}% subscriber discount` : 'No subscriber discount'}
                </span>
              </div>
              <div className="mt-4 font-semibold text-[color:var(--primary)]">View Campaign Details →</div>
            </button>
          ))}
        </div>
        {!campaignCards.length && <div className="muted mt-4">No campaigns match your search.</div>}
      </Section>

      <CreateCampaignModal
        open={createOpen}
        onClose={(wasCreated) => {
          setCreateOpen(false)
          if (wasCreated) setCreated(true)
        }}
        defaultTotalLimit={selectedCampaign?.totalLimit || 30}
      />

      {detailsOpen && detailsCampaign && (
        <div className="modal-overlay" onClick={() => setDetailsOpen(false)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(980px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>Campaign Details</div>
              <button type="button" className="icon-btn" aria-label="Close campaign details" onClick={() => setDetailsOpen(false)}>×</button>
            </div>
            <div className="modal-card__content">
              <CampaignDetails
                campaign={detailsCampaign}
                onPublish={() => actions.publishCampaign(detailsCampaign.id)}
                onFreeze={() => actions.updateCampaign(detailsCampaign.id, { status: 'Closed' })}
                onDelete={() => setDeleteOpen(true)}
                onToggleDiscount={toggleDiscount}
              />
            </div>
          </div>
        </div>
      )}

      {deleteOpen && detailsCampaign && (
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
      )}

      {created && <SuccessAlert message="Campaign created successfully." onDismiss={() => setCreated(false)} />}
    </div>
  )
}
