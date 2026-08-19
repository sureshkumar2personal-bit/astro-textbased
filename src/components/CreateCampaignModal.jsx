import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppData } from '../state/AppDataContext.jsx'

function toInputDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function toInputDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
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
    generalPrice: 99,
    personalPrice: 99,
    totalLimit,
    ...splitSlots(totalLimit),
    discountEnabled: true,
    discountPercent: 60,
  }
}

export default function CreateCampaignModal({ open, onClose, onComplete, defaultTotalLimit = 30 }) {
  const { actions } = useAppData()
  const [form, setForm] = useState(() => makeBlankForm(defaultTotalLimit))
  const [error, setError] = useState('')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDateTime, setScheduleDateTime] = useState(() => toInputDateTime(Date.now() + 60 * 60 * 1000))

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setForm(makeBlankForm(defaultTotalLimit))
    setError('')
    setScheduleOpen(false)
    setScheduleDateTime(toInputDateTime(Date.now() + 60 * 60 * 1000))
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open, defaultTotalLimit])

  if (!open) return null

  const setTotalSlots = (total) => {
    setForm((prev) => ({ ...prev, totalLimit: total, ...splitSlots(total) }))
  }

  const slotAllocated = form.generalLimit + form.personalLimit
  const slotDifference = form.totalLimit - slotAllocated
  const isSlotAllocationValid = slotDifference === 0 && form.totalLimit > 0
  const isDiscountValid = !form.discountEnabled || (form.discountPercent >= 0 && form.discountPercent <= 100)
  const validatePublish = () => {
    if (!form.name.trim()) throw new Error('Enter a campaign name.')
    if (!form.date) throw new Error('Select a campaign start date.')
    if (!form.endDate) throw new Error('Select a campaign end date.')
    if (new Date(form.endDate) < new Date(form.date)) throw new Error('End date must be on or after the start date.')
    if (!isSlotAllocationValid) throw new Error('General Slots and Individual Slots must add up to Total Slots.')
    if (!isDiscountValid) throw new Error('Discount must be between 0% and 100%.')
  }

  const handleDraft = () => {
    try {
      setError('')
      actions.createCampaign({ ...form, status: 'Draft' })
      onComplete?.('Draft')
      onClose(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save campaign draft.')
    }
  }

  const handlePublish = () => {
    try {
      setError('')
      validatePublish()
      actions.createCampaign({ ...form, status: 'Active' })
      onComplete?.('Published')
      onClose(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish campaign.')
    }
  }

  const handleSchedule = () => {
    try {
      setError('')
      validatePublish()
      const scheduledAt = new Date(scheduleDateTime)
      if (!scheduleDateTime || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
        throw new Error('Choose a future date and time for publishing.')
      }
      actions.createCampaign({ ...form, status: 'Scheduled', scheduledPublishAt: scheduledAt.toISOString() })
      onComplete?.('Scheduled')
      onClose(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to schedule campaign.')
    }
  }

  return createPortal((
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-card modal-card--scroll" style={{ width: 'min(720px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-card__header">
          <div className="section-title" style={{ marginBottom: 16 }}>Create Campaign</div>
        </div>

        <div className="modal-card__content">
          <div className="grid gap-4">
            <label className="field-group" style={{ margin: 0 }}>
              <span className="field-label-top">Campaign Name</span>
              <input
                className="text-input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Ram Navami Special"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="field-group" style={{ margin: 0 }}>
                <span className="field-label-top">Start Date</span>
                <input type="date" className="text-input" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              </label>
              <label className="field-group" style={{ margin: 0 }}>
                <span className="field-label-top">End Date</span>
                <input type="date" className="text-input" min={form.date} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
              </label>
            </div>

            <label className="field-group" style={{ margin: 0 }}>
              <span className="field-label-top">Total Slots</span>
              <input type="number" min="1" className="text-input" value={form.totalLimit} onChange={(event) => setTotalSlots(Number(event.target.value))} />
            </label>

            <div>
              <div className="field-label-top">Slot Allocation</div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">General Slots</span>
                  <input type="number" min="0" className="text-input" value={form.generalLimit} onChange={(event) => setForm({ ...form, generalLimit: Number(event.target.value) })} />
                </label>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Individual Slots</span>
                  <input type="number" min="0" className="text-input" value={form.personalLimit} onChange={(event) => setForm({ ...form, personalLimit: Number(event.target.value) })} />
                </label>
              </div>
              <p className={`mt-2 text-sm font-medium ${slotDifference === 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
                {slotDifference === 0 ? `Slots fully allocated (${slotAllocated}/${form.totalLimit}).` : `Slots must total ${form.totalLimit}. Current allocation: ${slotAllocated}.`}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="field-group" style={{ margin: 0 }}>
                <span className="field-label-top">General Price</span>
                <input type="number" min="0" className="text-input" value={form.generalPrice} onChange={(event) => setForm({ ...form, generalPrice: Number(event.target.value) })} />
              </label>
              <label className="field-group" style={{ margin: 0 }}>
                <span className="field-label-top">Individual Price</span>
                <input type="number" min="0" className="text-input" value={form.personalPrice} onChange={(event) => setForm({ ...form, personalPrice: Number(event.target.value) })} />
              </label>
            </div>

            <div>
              <div className="field-label-top">Subscriber Discount</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={`btn ${form.discountEnabled ? 'btn-primary' : 'btn-outline'}`} onClick={() => setForm({ ...form, discountEnabled: true })}>Yes</button>
                <button type="button" className={`btn ${!form.discountEnabled ? 'btn-primary' : 'btn-outline'}`} onClick={() => setForm({ ...form, discountEnabled: false })}>No</button>
              </div>
            </div>

            {form.discountEnabled && (
              <label className="field-group" style={{ margin: 0 }}>
                <span className="field-label-top">Subscriber Discount Percentage</span>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" className="text-input" value={form.discountPercent} onChange={(event) => setForm({ ...form, discountPercent: Number(event.target.value) })} />
                  <span className="font-bold text-[color:var(--text-secondary)]">%</span>
                </div>
              </label>
            )}
          </div>

          {error && <div className="mt-4 rounded-[14px] border border-[color:var(--danger-bg)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm font-medium text-[color:var(--danger)]">{error}</div>}
        </div>

        <div className="modal-card__footer" style={{ position: 'relative' }}>
          <button className="btn btn-ghost" type="button" onClick={() => onClose(false)}>Cancel</button>
          <button className="btn btn-outline" type="button" onClick={handleDraft}>Draft</button>
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handlePublish}
              onContextMenu={(event) => {
                event.preventDefault()
                setScheduleOpen(true)
                setError('')
              }}
            >
              Publish
            </button>
            {scheduleOpen && (
              <div
                className="card"
                style={{ position: 'absolute', zIndex: 20, right: 0, bottom: 'calc(100% + 10px)', width: 280, padding: 16, boxShadow: 'var(--shadow-lg)' }}
                onContextMenu={(event) => event.preventDefault()}
              >
                <div className="field-label-top" style={{ marginBottom: 8 }}>Schedule Publish</div>
                <input
                  type="datetime-local"
                  className="text-input"
                  value={scheduleDateTime}
                  min={toInputDateTime(Date.now() + 60 * 1000)}
                  onChange={(event) => setScheduleDateTime(event.target.value)}
                />
                <div className="flex justify-end gap-2" style={{ marginTop: 12 }}>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => setScheduleOpen(false)}>Back</button>
                  <button className="btn btn-primary btn-sm" type="button" onClick={handleSchedule}>Schedule</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ), document.body)
}
