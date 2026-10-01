import { useEffect, useRef, useState } from 'react'
import { ChevronDown, CircleDollarSign, Gift } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

// The standalone "All Campaigns" page was removed; only the shared CampaignDetails view
// (used by Sales Management) lives here.
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
