import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { RadioGroup } from '../components/OptionGroup.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { TempleReturnIcon } from '../components/TempleIcons.jsx'

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
      source: source || currentUser?.role,
    })
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
          const isSelected = selectedId === campaign.id

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
                onClick={() => setSelectedId(campaign.id)}
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

      {selectedCampaign && (() => {
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

      {selectedCampaign && (
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

      <div className="section" style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          disabled={!selectedCampaign}
          onClick={handleBuyNow}
        >
          Buy Now
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(source === 'astrologer' ? routes.salesManagement : routes.dashboard)}>Cancel</button>
      </div>

      {purchasedCampaignName && (
        <SuccessAlert
          message={`Purchase completed successfully for ${purchasedCampaignName}.`}
          onDismiss={() => setPurchasedCampaignName(null)}
        />
      )}
    </div>
  )
}
