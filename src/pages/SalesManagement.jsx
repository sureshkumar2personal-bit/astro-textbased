import { useEffect, useState } from 'react'
import StatusBadge from '../components/StatusBadge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
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

const createBlankCategory = (overrides = {}) => ({
  name: '',
  normalPrice: 200,
  discountPercent: 0,
  compulsoryQuestions: 150,
  ...overrides,
})

const defaultCampaignCategories = () => [
  createBlankCategory({ name: 'Marriage', discountPercent: 70 }),
  createBlankCategory({ name: 'Career', discountPercent: 80 }),
  createBlankCategory({ name: 'Love', discountPercent: 90 }),
  createBlankCategory({ name: 'Study', discountPercent: 40 }),
]

function CampaignCategoriesEditor({ categories, onChange }) {
  const update = (index, patch) => onChange(categories.map((cat, i) => (i === index ? { ...cat, ...patch } : cat)))
  const addCategory = () => {
    if (categories.length < 6) onChange([...categories, createBlankCategory()])
  }
  const removeCategory = (index) => {
    if (categories.length > 4) onChange(categories.filter((_, i) => i !== index))
  }
  const compulsoryTotal = categories.reduce((sum, cat) => sum + (Number(cat.compulsoryQuestions) || 0), 0)
  const countValid = categories.length >= 4 && categories.length <= 6
  const compulsoryValid = compulsoryTotal === 600
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {categories.map((cat, index) => (
        <div
          key={index}
          style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) repeat(3, 110px) 36px', gap: 10, alignItems: 'end' }}
        >
          <label className="field-group" style={{ margin: 0 }}>
            <span className="field-label-top">Category</span>
            <input
              className="text-input"
              value={cat.name}
              placeholder="e.g. Marriage"
              onChange={(e) => update(index, { name: e.target.value })}
            />
          </label>
          <label className="field-group" style={{ margin: 0 }}>
            <span className="field-label-top">Normal ₹</span>
            <input
              type="number"
              className="text-input"
              min={0}
              value={cat.normalPrice}
              onChange={(e) => update(index, { normalPrice: Number(e.target.value) })}
            />
          </label>
          <label className="field-group" style={{ margin: 0 }}>
            <span className="field-label-top">Discount %</span>
            <input
              type="number"
              className="text-input"
              min={0}
              max={100}
              value={cat.discountPercent}
              onChange={(e) => update(index, { discountPercent: Number(e.target.value) })}
            />
          </label>
          <label className="field-group" style={{ margin: 0 }}>
            <span className="field-label-top">Compulsory</span>
            <input
              type="number"
              className="text-input"
              min={0}
              value={cat.compulsoryQuestions}
              onChange={(e) => update(index, { compulsoryQuestions: Number(e.target.value) })}
            />
          </label>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ height: 38, padding: '0 8px' }}
            onClick={() => removeCategory(index)}
            disabled={categories.length <= 4}
            title="Remove category"
          >
            ✕
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-outline" onClick={addCategory} disabled={categories.length >= 6}>
          + Add Category
        </button>
        <span className="muted" style={{ fontSize: 13 }}>
          Categories: {categories.length}/6 · Compulsory total: <strong>{compulsoryTotal}</strong>/600
          {!countValid && ' (need 4–6)'}
          {countValid && !compulsoryValid && ' (must equal 600)'}
          {countValid && compulsoryValid && ' ✓'}
        </span>
      </div>
    </div>
  )
}

export default function SalesManagement() {
  const { campaigns, selectedCampaignId, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined
  const [campaignId, setCampaignId] = useState(selectedCampaignId)
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState('')
  const [created, setCreated] = useState(false)
  const [editCatsOpen, setEditCatsOpen] = useState(false)
  const [editCats, setEditCats] = useState([])
  const [editCatsError, setEditCatsError] = useState('')
  const selectedCampaign = campaigns.find((campaign) => campaign.id === campaignId) || campaigns[0]

  useEffect(() => {
    if (!createOpen && !editCatsOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [createOpen, editCatsOpen])

  const toInputDate = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
  }
  const splitSlots = (total) => {
    const general = Math.ceil(total / 2)
    return { generalLimit: general, personalLimit: total - general }
  }
  const [createForm, setCreateForm] = useState({
    name: '',
    date: toInputDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    endDate: toInputDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)),
    generalPrice: 99,
    personalPrice: 99,
    totalLimit: selectedCampaign.totalLimit,
    ...splitSlots(selectedCampaign.totalLimit),
    generalOffer: true,
    personalOffer: true,
    categories: defaultCampaignCategories(),
  })

  const openCreateCampaign = () => {
    setCreateError('')
    setCreateForm({
      name: '',
      date: toInputDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      endDate: toInputDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)),
      priority: 'Medium',
      generalPrice: 99,
      personalPrice: 99,
      totalLimit: selectedCampaign.totalLimit,
      ...splitSlots(selectedCampaign.totalLimit),
      generalOffer: true,
      personalOffer: true,
      categories: defaultCampaignCategories(),
    })
    setCreateOpen(true)
  }

  const setTotalSlots = (total) => {
    setCreateForm((prev) => ({ ...prev, totalLimit: total, ...splitSlots(total) }))
  }

  const slotAllocated = createForm.generalLimit + createForm.personalLimit
  const slotDifference = createForm.totalLimit - slotAllocated
  const isSlotAllocationValid = slotDifference === 0

  const categoryCount = createForm.categories.length
  const isCategoryCountValid = categoryCount >= 4 && categoryCount <= 6
  const compulsoryTotal = createForm.categories.reduce((sum, cat) => sum + (Number(cat.compulsoryQuestions) || 0), 0)
  const isCompulsoryValid = compulsoryTotal === 600
  const areCategoriesNamed = createForm.categories.every((cat) => cat.name.trim())
  const isCategoriesValid = isCategoryCountValid && isCompulsoryValid && areCategoriesNamed

  const handleCreateCampaign = () => {
    try {
      setCreateError('')
      if (!createForm.name.trim()) {
        throw new Error('Enter a campaign name.')
      }
      if (!createForm.date) {
        throw new Error('Select a campaign start date.')
      }
      if (!createForm.endDate) {
        throw new Error('Select a campaign closed date.')
      }
      if (new Date(createForm.endDate) < new Date(createForm.date)) {
        throw new Error('Closed date must be on or after the start date.')
      }
      if (!isSlotAllocationValid) {
        throw new Error('General Slots and Personal Slots must add up to the Total Slots.')
      }
      if (!isCategoryCountValid) {
        throw new Error('Add at least 4 and at most 6 campaign categories.')
      }
      if (!areCategoriesNamed) {
        throw new Error('Every campaign category needs a name.')
      }
      if (!isCompulsoryValid) {
        throw new Error('Compulsory questions across categories must total 600.')
      }

      const newCampaign = actions.createCampaign({
        ...createForm,
        date: createForm.date,
      })
      setCampaignId(newCampaign.id)
      setCreateOpen(false)
      setCreated(true)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unable to create campaign.')
    }
  }

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
            <button className="btn btn-primary" onClick={openCreateCampaign}>
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

      {createOpen && (
        <div className="modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(920px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header">
              <div className="section-title" style={{ marginBottom: 16 }}>Create New Campaign</div>
            </div>
            <div className="modal-card__content">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Campaign Name</span>
                  <input
                    className="text-input"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Ram Navami Special"
                  />
                </label>
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <label className="field-group" style={{ margin: 0 }}>
                    <span className="field-label-top">Start Date</span>
                    <input
                      type="date"
                      className="text-input"
                      value={createForm.date}
                      onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                    />
                  </label>
                  <label className="field-group" style={{ margin: 0 }}>
                    <span className="field-label-top">Closed Date (End Date)</span>
                    <input
                      type="date"
                      className="text-input"
                      value={createForm.endDate}
                      min={createForm.date}
                      onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                    />
                  </label>
                </div>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">General Price</span>
                  <input
                    type="number"
                    className="text-input"
                    value={createForm.generalPrice}
                    onChange={(e) => setCreateForm({ ...createForm, generalPrice: Number(e.target.value) })}
                    placeholder="Enter price"
                    min={0}
                  />
                </label>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Individual Price</span>
                  <input
                    type="number"
                    className="text-input"
                    value={createForm.personalPrice}
                    onChange={(e) => setCreateForm({ ...createForm, personalPrice: Number(e.target.value) })}
                    placeholder="Enter price"
                    min={0}
                  />
                </label>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Total Slots</span>
                  <input
                    className="text-input"
                    value={createForm.totalLimit}
                    onChange={(e) => setTotalSlots(Number(e.target.value))}
                  />
                </label>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">General Slots</span>
                  <input
                    className="text-input"
                    value={createForm.generalLimit}
                    onChange={(e) => setCreateForm({ ...createForm, generalLimit: Number(e.target.value) })}
                  />
                </label>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Personal Slots</span>
                  <input
                    className="text-input"
                    value={createForm.personalLimit}
                    onChange={(e) => setCreateForm({ ...createForm, personalLimit: Number(e.target.value) })}
                  />
                </label>
                <div className="md:col-span-2" style={{ marginTop: -6 }}>
                  {slotDifference === 0 ? (
                    <p className="text-sm font-medium text-[color:var(--success)]">
                      Slots fully allocated ({slotAllocated}/{createForm.totalLimit}).
                    </p>
                  ) : slotDifference > 0 ? (
                    <p className="text-sm font-medium text-[color:var(--warning)]">
                      Remaining Slots: {slotDifference}
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-[color:var(--danger)]">
                      Exceeded by {Math.abs(slotDifference)} Slots
                    </p>
                  )}
                </div>
              </div>

              <Card className="section" style={{ padding: '16px 20px' }}>
                <div className="section-title" style={{ fontSize: 15, marginBottom: 10 }}>Campaign Categories (4–6)</div>
                <CampaignCategoriesEditor
                  categories={createForm.categories}
                  onChange={(cats) => setCreateForm((prev) => ({ ...prev, categories: cats }))}
                />
              </Card>

              {createError && (
                <div className="mt-4 rounded-[14px] border border-[color:var(--danger-bg)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm font-medium text-[color:var(--danger)]">
                  {createError}
                </div>
              )}
            </div>
            <div className="modal-card__footer">
              <button className="btn btn-ghost" type="button" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={!isSlotAllocationValid || !isCategoriesValid}
                onClick={handleCreateCampaign}
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}

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
