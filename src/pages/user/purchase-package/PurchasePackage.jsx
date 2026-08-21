import { createPortal } from 'react-dom'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, X } from 'lucide-react'
import PageHeader from '../../../../components/ui/PageHeader.jsx'
import Card from '../../../../components/ui/Card.jsx'
import Section from '../../../../components/ui/Section.jsx'
import SuccessAlert from '../../../../components/ui/SuccessAlert.jsx'
import StatusBadge from '../../../../components/StatusBadge.jsx'
import { RadioGroup } from '../../../../components/OptionGroup.jsx'
import { useAppData } from '../../../../state/AppDataContext.jsx'
import { useAuth } from '../../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../../utils/roleRoutes.js'
import { TempleReturnIcon } from '../../../../components/TempleIcons.jsx'

const QTY_OPTIONS = [1, 2, 3, 5, 10]
const DEFAULT_QTY = { generalQty: 5, personalQty: 2 }

export default function PurchasePackage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { campaigns, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const source = searchParams.get('source')
  const highlightCampaignId = searchParams.get('campaignId')
  const backIcon = currentUser?.role === 'astrologer' || source === 'astrologer' ? TempleReturnIcon : undefined
  const [quantities, setQuantities] = useState({})
  const [payment, setPayment] = useState('UPI')
  const [purchasedCampaignName, setPurchasedCampaignName] = useState(null)
  const [selectedId, setSelectedId] = useState(highlightCampaignId || null)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(Boolean(highlightCampaignId))
  const isUser = currentUser?.role === 'user'

  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === 'Active'),
    [campaigns],
  )
  const selectedCampaign = activeCampaigns.find((campaign) => campaign.id === selectedId) || null

  const getQty = (campaignId) => quantities[campaignId] || DEFAULT_QTY
  const setQty = (campaignId, patch) => {
    setQuantities((prev) => ({ ...prev, [campaignId]: { ...getQty(campaignId), ...patch } }))
  }

  const handleBuyNow = () => {
    if (!selectedCampaign) return
    const { generalQty, personalQty } = getQty(selectedCampaign.id)
    const totalAmount = (generalQty * selectedCampaign.generalPrice) + (personalQty * selectedCampaign.personalPrice)
    actions.purchasePackage(selectedCampaign.id, {
      campaignName: selectedCampaign.name,
      generalQty,
      personalQty,
      totalAmount,
      userId: currentUser?.id,
      source: source || currentUser?.role,
    })
    setIsPurchaseModalOpen(false)
    setPurchasedCampaignName(selectedCampaign.name)
  }

  return (
    <div>
      <PageHeader
        eyebrow={currentUser?.role === 'astrologer' ? 'Astrologer' : 'User'}
        title="Purchase Question Package"
        showBack
        backTo={source === 'astrologer' ? routes.salesManagement : routes.dashboard}
        backIcon={backIcon}
      />

      {activeCampaigns.length === 0 && (
        <div className="section">
          <Card>
            <div className="muted">No active campaigns are available for purchase right now.</div>
          </Card>
        </div>
      )}

      <div className="section grid grid-cols-1 gap-4 md:grid-cols-2">
        {activeCampaigns.map((campaign) => {
          const isSelected = !isUser && selectedId === campaign.id

          return (
            <Card
              key={campaign.id}
              hover
              style={{
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: isSelected ? 'var(--primary-bg)' : undefined,
                padding: 18,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedId(campaign.id)
                  if (isUser) setIsPurchaseModalOpen(true)
                }}
                style={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{campaign.name}</div>
                  <div className="muted" style={{ marginTop: 4 }}>Valid till: {campaign.date}</div>
                  <div className="muted" style={{ marginTop: 2 }}>
                    General ₹{campaign.generalPrice} · Individual ₹{campaign.personalPrice}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusBadge label={campaign.status} />
                  {isSelected && <CheckCircle2 size={20} color="var(--primary)" />}
                </div>
              </button>
            </Card>
          )
        })}
      </div>

      {!isUser && selectedCampaign && (() => {
        const { generalQty, personalQty } = getQty(selectedCampaign.id)
        const totalAmount = (generalQty * selectedCampaign.generalPrice) + (personalQty * selectedCampaign.personalPrice)

        return (
          <Section title={`${selectedCampaign.name} — Purchase Details`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Card>
                <div className="section-title" style={{ fontSize: 15 }}>Package Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <div className="field-label-top">General Questions Available</div>
                    <div className="text-input" style={{ background: 'var(--violet-50)', fontWeight: 700 }}>{selectedCampaign.generalLimit}</div>
                  </div>
                  <div>
                    <div className="field-label-top">Individual Questions Available</div>
                    <div className="text-input" style={{ background: 'var(--violet-50)', fontWeight: 700 }}>{selectedCampaign.personalLimit}</div>
                  </div>
                  <div>
                    <div className="field-label-top">Total Package Questions</div>
                    <div className="text-input" style={{ background: 'var(--violet-50)', fontWeight: 700 }}>{selectedCampaign.totalLimit}</div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="section-title" style={{ fontSize: 15 }}>Purchase Options</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
                  <div className="field-group">
                    <label className="field-label-top">General Questions</label>
                    <select
                      value={generalQty}
                      onChange={(e) => setQty(selectedCampaign.id, { generalQty: Number(e.target.value) })}
                      className="select-input"
                    >
                      {QTY_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="field-group">
                    <label className="field-label-top">Individual Questions</label>
                    <select
                      value={personalQty}
                      onChange={(e) => setQty(selectedCampaign.id, { personalQty: Number(e.target.value) })}
                      className="select-input"
                    >
                      {QTY_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="section-title" style={{ fontSize: 15 }}>Price Summary</div>
                <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>General Questions</span>
                    <strong>₹{generalQty * selectedCampaign.generalPrice}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Individual Questions</span>
                    <strong>₹{personalQty * selectedCampaign.personalPrice}</strong>
                  </div>
                  <div className="divider" style={{ margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                    <span>Total Amount</span>
                    <strong>₹{totalAmount}</strong>
                  </div>
                </div>
              </Card>
            </div>
          </Section>
        )
      })()}

      {!isUser && selectedCampaign && (
        <Section title="Payment Method">
          <Card>
            <RadioGroup
              name="payment-method"
              options={['UPI', 'Credit / Debit Card', 'Net Banking', 'Wallet']}
              value={payment}
              onChange={setPayment}
            />
          </Card>
        </Section>
      )}

      {!isUser && <div className="section" style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          disabled={!selectedCampaign}
          onClick={handleBuyNow}
        >
          Buy Now
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(source === 'astrologer' ? routes.salesManagement : routes.dashboard)}>Cancel</button>
      </div>}

      {isUser && isPurchaseModalOpen && selectedCampaign && createPortal((() => {
        const { generalQty, personalQty } = getQty(selectedCampaign.id)
        const totalAmount = (generalQty * selectedCampaign.generalPrice) + (personalQty * selectedCampaign.personalPrice)

        return (
          <div className="modal-overlay user-modal-overlay" onClick={() => setIsPurchaseModalOpen(false)}>
            <div
              className="modal-card user-modal-card user-modal-card--scroll"
              style={{ width: 'min(640px, calc(100vw - 32px))' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="purchase-package-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="user-modal-card__header flex items-center justify-between gap-4">
                <div>
                  <div id="purchase-package-title" className="section-title" style={{ marginBottom: 0 }}>Buy Question Package</div>
                  <div className="muted" style={{ marginTop: 4 }}>{selectedCampaign.name}</div>
                </div>
                <button type="button" className="icon-btn" aria-label="Close purchase popup" onClick={() => setIsPurchaseModalOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="user-modal-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Card>
                  <div className="section-title" style={{ fontSize: 15 }}>Package Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><div className="field-label-top" style={{ minHeight: 32, margin: 0 }}>General Questions Available</div><div className="text-input" style={{ background: 'var(--violet-50)', fontWeight: 700, textAlign: 'center' }}>{selectedCampaign.generalLimit}</div></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><div className="field-label-top" style={{ minHeight: 32, margin: 0 }}>Individual Questions Available</div><div className="text-input" style={{ background: 'var(--violet-50)', fontWeight: 700, textAlign: 'center' }}>{selectedCampaign.personalLimit}</div></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><div className="field-label-top" style={{ minHeight: 32, margin: 0 }}>Total Package Questions</div><div className="text-input" style={{ background: 'var(--violet-50)', fontWeight: 700, textAlign: 'center' }}>{selectedCampaign.totalLimit}</div></div>
                  </div>
                </Card>

                <Card>
                  <div className="section-title" style={{ fontSize: 15 }}>Purchase Options</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
                    <div className="field-group"><label className="field-label-top">General Questions</label><select value={generalQty} onChange={(event) => setQty(selectedCampaign.id, { generalQty: Number(event.target.value) })} className="select-input">{QTY_OPTIONS.map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}</select></div>
                    <div className="field-group"><label className="field-label-top">Individual Questions</label><select value={personalQty} onChange={(event) => setQty(selectedCampaign.id, { personalQty: Number(event.target.value) })} className="select-input">{QTY_OPTIONS.map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}</select></div>
                  </div>
                </Card>

                <Card>
                  <div className="section-title" style={{ fontSize: 15 }}>Price Summary</div>
                  <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>General Questions</span><strong>₹{generalQty * selectedCampaign.generalPrice}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Individual Questions</span><strong>₹{personalQty * selectedCampaign.personalPrice}</strong></div>
                    <div className="divider" style={{ margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}><span>Total Amount</span><strong>₹{totalAmount}</strong></div>
                  </div>
                </Card>

                <Card>
                  <div className="section-title" style={{ fontSize: 15 }}>Payment Method</div>
                  <RadioGroup name="payment-method" options={['UPI', 'Credit / Debit Card', 'Net Banking', 'Wallet']} value={payment} onChange={setPayment} />
                </Card>
              </div>

              <div className="user-modal-card__footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsPurchaseModalOpen(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleBuyNow}>Buy Now</button>
              </div>
            </div>
          </div>
        )
      })(), document.body)}

      {purchasedCampaignName && (
        <SuccessAlert
          variant="user"
          message={`Purchase completed successfully for ${purchasedCampaignName}.`}
          onDismiss={() => setPurchasedCampaignName(null)}
        />
      )}
    </div>
  )
}
