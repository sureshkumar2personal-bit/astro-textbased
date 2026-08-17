import { useEffect, useState } from 'react'
import Card from './ui/Card.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { defaultCampaignCategories } from '../utils/campaignCategories.js'
import { CampaignCategoriesEditor } from './CampaignCategoriesEditor.jsx'

function toInputDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function splitSlots(total) {
  const general = Math.ceil(total / 2)
  return { generalLimit: general, personalLimit: total - general }
}

function makeBlankForm(totalLimit) {
  return {
    name: '',
    date: toInputDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    endDate: toInputDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)),
    priority: 'Medium',
    generalPrice: 99,
    personalPrice: 99,
    totalLimit,
    ...splitSlots(totalLimit),
    generalOffer: true,
    personalOffer: true,
    categories: defaultCampaignCategories(),
  }
}

export default function CreateCampaignModal({ open, onClose, defaultTotalLimit = 30 }) {
  const { actions } = useAppData()
  const [form, setForm] = useState(() => makeBlankForm(defaultTotalLimit))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setForm(makeBlankForm(defaultTotalLimit))
      setError('')
    }
  }, [open, defaultTotalLimit])

  if (!open) return null

  const setTotalSlots = (total) => {
    setForm((prev) => ({ ...prev, totalLimit: total, ...splitSlots(total) }))
  }

  const slotAllocated = form.generalLimit + form.personalLimit
  const slotDifference = form.totalLimit - slotAllocated
  const isSlotAllocationValid = slotDifference === 0

  const categoryCount = form.categories.length
  const isCategoryCountValid = categoryCount >= 4 && categoryCount <= 6
  const compulsoryTotal = form.categories.reduce((sum, cat) => sum + (Number(cat.compulsoryQuestions) || 0), 0)
  const isCompulsoryValid = compulsoryTotal === 600
  const areCategoriesNamed = form.categories.every((cat) => cat.name.trim())
  const isCategoriesValid = isCategoryCountValid && isCompulsoryValid && areCategoriesNamed

  const handleCreate = () => {
    try {
      setError('')
      if (!form.name.trim()) throw new Error('Enter a campaign name.')
      if (!form.date) throw new Error('Select a campaign start date.')
      if (!form.endDate) throw new Error('Select a campaign closed date.')
      if (new Date(form.endDate) < new Date(form.date)) throw new Error('Closed date must be on or after the start date.')
      if (!isSlotAllocationValid) throw new Error('General Slots and Personal Slots must add up to the Total Slots.')
      if (!isCategoryCountValid) throw new Error('Add at least 4 and at most 6 campaign categories.')
      if (!areCategoriesNamed) throw new Error('Every campaign category needs a name.')
      if (!isCompulsoryValid) throw new Error('Compulsory questions across categories must total 600.')

      actions.createCampaign({ ...form, date: form.date })
      onClose(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create campaign.')
    }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
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
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ram Navami Special"
              />
            </label>
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <label className="field-group" style={{ margin: 0 }}>
                <span className="field-label-top">Start Date</span>
                <input
                  type="date"
                  className="text-input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>
              <label className="field-group" style={{ margin: 0 }}>
                <span className="field-label-top">Closed Date (End Date)</span>
                <input
                  type="date"
                  className="text-input"
                  value={form.endDate}
                  min={form.date}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </label>
            </div>
            <label className="field-group" style={{ margin: 0 }}>
              <span className="field-label-top">General Price</span>
              <input
                type="number"
                className="text-input"
                value={form.generalPrice}
                onChange={(e) => setForm({ ...form, generalPrice: Number(e.target.value) })}
                placeholder="Enter price"
                min={0}
              />
            </label>
            <label className="field-group" style={{ margin: 0 }}>
              <span className="field-label-top">Individual Price</span>
              <input
                type="number"
                className="text-input"
                value={form.personalPrice}
                onChange={(e) => setForm({ ...form, personalPrice: Number(e.target.value) })}
                placeholder="Enter price"
                min={0}
              />
            </label>
            <label className="field-group" style={{ margin: 0 }}>
              <span className="field-label-top">Total Slots</span>
              <input
                className="text-input"
                value={form.totalLimit}
                onChange={(e) => setTotalSlots(Number(e.target.value))}
              />
            </label>
            <label className="field-group" style={{ margin: 0 }}>
              <span className="field-label-top">General Slots</span>
              <input
                className="text-input"
                value={form.generalLimit}
                onChange={(e) => setForm({ ...form, generalLimit: Number(e.target.value) })}
              />
            </label>
            <label className="field-group" style={{ margin: 0 }}>
              <span className="field-label-top">Personal Slots</span>
              <input
                className="text-input"
                value={form.personalLimit}
                onChange={(e) => setForm({ ...form, personalLimit: Number(e.target.value) })}
              />
            </label>
            <div className="md:col-span-2" style={{ marginTop: -6 }}>
              {slotDifference === 0 ? (
                <p className="text-sm font-medium text-[color:var(--success)]">
                  Slots fully allocated ({slotAllocated}/{form.totalLimit}).
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
              categories={form.categories}
              onChange={(cats) => setForm((prev) => ({ ...prev, categories: cats }))}
            />
          </Card>

          {error && (
            <div className="mt-4 rounded-[14px] border border-[color:var(--danger-bg)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm font-medium text-[color:var(--danger)]">
              {error}
            </div>
          )}
        </div>
        <div className="modal-card__footer">
          <button className="btn btn-ghost" type="button" onClick={() => onClose(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!isSlotAllocationValid || !isCategoriesValid}
            onClick={handleCreate}
          >
            Create Campaign
          </button>
        </div>
      </div>
    </div>
  )
}
