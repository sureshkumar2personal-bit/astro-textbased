import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import CreateCampaignModal from '../components/CreateCampaignModal.jsx'
import { defaultCampaignCategories } from '../utils/campaignCategories.js'
import { CampaignCategoriesEditor } from '../components/CampaignCategoriesEditor.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import {
  TempleCycleIcon,
  TempleDonationBoxIcon,
  TempleLampIcon,
  TempleLotusIcon,
  TempleReturnIcon,
  TempleScrollIcon,
  TempleSearchIcon,
  TempleShieldIcon,
} from '../components/TempleIcons.jsx'

export default function SalesManagement() {
  const { campaigns, selectedCampaignId, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined
  const [campaignId] = useState(selectedCampaignId)
  const [createOpen, setCreateOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [created, setCreated] = useState(false)
  const [editCatsOpen, setEditCatsOpen] = useState(false)
  const [editCats, setEditCats] = useState([])
  const [editCatsError, setEditCatsError] = useState('')
  const selectedCampaign = campaigns.find((campaign) => campaign.id === campaignId) || campaigns[0]

  useEffect(() => {
    if (!editCatsOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [editCatsOpen])

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const openEditCategories = () => {
    setEditCatsError('')
    setEditCats(
      selectedCampaign.categories
        ? selectedCampaign.categories.map((cat) => ({ ...cat }))
        : defaultCampaignCategories(),
    )
    setEditCatsOpen(true)
  }

  const saveCategories = () => {
    const count = editCats.length
    const comp = editCats.reduce((sum, cat) => sum + (Number(cat.compulsoryQuestions) || 0), 0)
    if (count < 4 || count > 6) {
      setEditCatsError('Add at least 4 and at most 6 campaign categories.')
      return
    }
    if (!editCats.every((cat) => cat.name.trim())) {
      setEditCatsError('Every campaign category needs a name.')
      return
    }
    if (comp !== 600) {
      setEditCatsError('Compulsory questions across categories must total 600.')
      return
    }
    actions.updateCampaign(selectedCampaign.id, { categories: editCats })
    setEditCatsOpen(false)
    setEditCatsError('')
  }

  return (
    <div>
      <PageHeader eyebrow="Astrologer" title="Sales Management" showBack backTo={routes.dashboard} backIcon={backIcon} />

      <div className="section">
        <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <TempleSearchIcon size={16} className="muted" />
              <input className="text-input" placeholder="Search campaign" style={{ maxWidth: 220 }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            <StatusBadge label={selectedCampaign.status} />
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              <TempleDonationBoxIcon size={15} />Create New Campaign
            </button>
          </div>
        </Card>
      </div>

      <Section title="Campaign Information">
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
            <div className="field-group" style={{ margin: 0 }}>
              <label className="field-label-top">Campaign Name</label>
              <input
                className="text-input"
                value={selectedCampaign.name}
                readOnly
              />
            </div>
            <div className="field-group" style={{ margin: 0 }}>
              <label className="field-label-top">Campaign ID</label>
              <input className="text-input" value={selectedCampaign.id} readOnly />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div className="field-group" style={{ margin: 0 }}>
                <label className="field-label-top">Start Date</label>
                <input className="text-input" value={selectedCampaign.date} readOnly />
              </div>
              <div className="field-group" style={{ margin: 0 }}>
                <label className="field-label-top">Closed Date</label>
                <input className="text-input" value={selectedCampaign.endDate || '—'} readOnly />
              </div>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Service Price" icon={TempleLampIcon}>
        <Card>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
            <div className="field-group" style={{ margin: 0 }}>
              <label className="field-label-top">General Question</label>
              <input className="text-input" value={`₹${selectedCampaign.generalPrice}`} readOnly />
            </div>
            <div className="field-group" style={{ margin: 0 }}>
              <label className="field-label-top">Personal / Individual</label>
              <input className="text-input" value={`₹${selectedCampaign.personalPrice}`} readOnly />
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Actions">
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
            <button
              className={`btn ${selectedCampaign.status === 'Active' ? 'btn-success' : 'btn-success-outline'}`}
              onClick={() => actions.publishCampaign(selectedCampaign.id)}
            >
              <TempleLampIcon size={14} />Publish
            </button>
            <button
              className={`btn ${selectedCampaign.status === 'Closed' ? 'btn-warning' : 'btn-warning-outline'}`}
              onClick={() => actions.updateCampaign(selectedCampaign.id, { status: 'Closed' })}
            >
              <TempleShieldIcon size={14} />Freeze
            </button>
            <button
              className={`btn ${selectedCampaign.status === 'Resume' ? 'btn-info' : 'btn-info-outline'}`}
              onClick={() => actions.updateCampaign(selectedCampaign.id, { status: 'Resume' })}
            >
              <TempleCycleIcon size={14} />Resume
            </button>
          </div>
          <button className="btn btn-danger" onClick={() => actions.updateCampaign(selectedCampaign.id, { status: 'Closed' })}>Delete Campaign</button>
        </Card>
      </Section>

      <Section title="Question Allocation" icon={TempleScrollIcon}>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
            <div className="field-group" style={{ margin: 0 }}>
              <label className="field-label-top">Total Question Limit</label>
              <input className="text-input" value={selectedCampaign.totalLimit} readOnly />
            </div>
            <div className="field-group" style={{ margin: 0 }}>
              <label className="field-label-top">General Question</label>
              <input className="text-input" value={selectedCampaign.generalLimit} readOnly />
            </div>
            <div className="field-group" style={{ margin: 0 }}>
              <label className="field-label-top">Individual Question</label>
              <input className="text-input" value={selectedCampaign.personalLimit} readOnly />
            </div>
            <div className="field-group" style={{ margin: 0 }}>
              <label className="field-label-top">Remaining Question</label>
              <input
                className="text-input"
                value={Math.max(selectedCampaign.totalLimit - selectedCampaign.generalLimit - selectedCampaign.personalLimit, 0)}
                readOnly
              />
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Subscriber / Benefits" icon={TempleLotusIcon}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexWrap: 'wrap' }}>
            <button
              className={`btn ${selectedCampaign.generalOffer ? 'btn-primary' : 'btn-outline'}`}
              style={{ width: 'fit-content' }}
              onClick={() => actions.toggleCampaignOffer(selectedCampaign.id, 'generalOffer')}
            >
              General Question Offer
            </button>
            <button
              className={`btn ${selectedCampaign.personalOffer ? 'btn-primary' : 'btn-outline'}`}
              style={{ width: 'fit-content' }}
              onClick={() => actions.toggleCampaignOffer(selectedCampaign.id, 'personalOffer')}
            >
              Free Personal Question Offer
            </button>
          </div>
        </Card>
      </Section>

      <Section title="Campaign Categories" icon={TempleLotusIcon}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div className="muted">Subscriber discount questions use these category discounts. Compulsory questions total 600 every month.</div>
            <button className="btn btn-outline" style={{ width: 'fit-content' }} onClick={openEditCategories}>
              Edit Categories
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Normal Price</th>
                  <th>Subscriber Discount</th>
                  <th>Compulsory Questions</th>
                </tr>
              </thead>
              <tbody>
                {(selectedCampaign.categories || []).map((cat, index) => (
                  <tr key={index}>
                    <td>{cat.name}</td>
                    <td>₹{cat.normalPrice}</td>
                    <td>{cat.discountPercent}%</td>
                    <td>{cat.compulsoryQuestions}</td>
                  </tr>
                ))}
                <tr>
                  <td><strong>Total</strong></td>
                  <td>—</td>
                  <td>—</td>
                  <td>
                    <strong>
                      {(selectedCampaign.categories || []).reduce((sum, cat) => sum + (Number(cat.compulsoryQuestions) || 0), 0)}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section title="History Sale" icon={TempleCycleIcon}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign</th><th>General Sold</th><th>Individual Sold</th><th>Revenue</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.purchasedGeneral}</td>
                  <td>{row.purchasedPersonal}</td>
                  <td>₹{((row.purchasedGeneral * row.generalPrice) + (row.purchasedPersonal * row.personalPrice)).toLocaleString('en-IN')}</td>
                  <td><StatusBadge label={row.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        className={`btn ${row.status === 'Active' ? 'btn-success' : 'btn-success-outline'}`}
                        style={{ padding: '4px 10px', fontSize: 12, height: 'auto' }}
                        onClick={() => actions.publishCampaign(row.id)}
                      >
                        Publish
                      </button>
                      <button
                        className={`btn ${row.status === 'Closed' ? 'btn-warning' : 'btn-warning-outline'}`}
                        style={{ padding: '4px 10px', fontSize: 12, height: 'auto' }}
                        onClick={() => actions.updateCampaign(row.id, { status: 'Closed' })}
                      >
                        Freeze
                      </button>
                      <button
                        className={`btn ${row.status === 'Resume' ? 'btn-info' : 'btn-info-outline'}`}
                        style={{ padding: '4px 10px', fontSize: 12, height: 'auto' }}
                        onClick={() => actions.updateCampaign(row.id, { status: 'Resume' })}
                      >
                        Resume
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <CreateCampaignModal
        open={createOpen}
        onClose={(created) => {
          setCreateOpen(false)
          if (created) setCreated(true)
        }}
        defaultTotalLimit={selectedCampaign.totalLimit}
      />

      {editCatsOpen && (
        <div className="modal-overlay" onClick={() => setEditCatsOpen(false)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(820px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header">
              <div className="section-title" style={{ marginBottom: 16 }}>
                Edit Campaign Categories — {selectedCampaign.name}
              </div>
            </div>
            <div className="modal-card__content">
              <Card className="section" style={{ padding: '16px 20px' }}>
                <div className="section-title" style={{ fontSize: 15, marginBottom: 10 }}>Campaign Categories (4–6)</div>
                <CampaignCategoriesEditor categories={editCats} onChange={setEditCats} />
              </Card>
              {editCatsError && (
                <div className="mt-4 rounded-[14px] border border-[color:var(--danger-bg)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm font-medium text-[color:var(--danger)]">
                  {editCatsError}
                </div>
              )}
            </div>
            <div className="modal-card__footer">
              <button className="btn btn-ghost" type="button" onClick={() => setEditCatsOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={saveCategories}>
                Save Categories
              </button>
            </div>
          </div>
        </div>
      )}

      {created && (
        <SuccessAlert message="Campaign created successfully." onDismiss={() => setCreated(false)} />
      )}
    </div>
  )
}
