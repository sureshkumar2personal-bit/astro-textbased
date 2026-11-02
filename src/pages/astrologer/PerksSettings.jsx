import { useState } from 'react'
import { ArrowRight, BadgePercent, BarChart3, Check, Crown, DollarSign, Edit2, Eye, Gem, Save, Settings2, ShieldCheck, Users, X } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'

const PLAN_DEFINITIONS = [
  { key: 'Silver', tone: 'silver', icon: ShieldCheck },
  { key: 'Gold', tone: 'gold', icon: Crown },
  { key: 'Platinum', tone: 'platinum', icon: Gem },
]

const PROGRAM_METRICS = [
  { label: 'Active Subscribers', value: '81', hint: '+12 this month', icon: Users },
  { label: 'Silver Subscribers', value: '41', hint: '50.6%', icon: ShieldCheck },
  { label: 'Gold Subscribers', value: '28', hint: '34.6%', icon: Crown },
  { label: 'Platinum Subscribers', value: '12', hint: '14.8%', icon: Gem },
]

const DEFAULT_SETTINGS = [
  ['discounts', 'Subscriber discounts', 'Automatically apply eligible subscriber discounts to paid services.', true, BadgePercent],
  ['profile', 'Show benefits on astrologer profile', 'Display your available subscriber benefits on your public profile.', true, Eye],
  ['badge', 'Show subscriber badge', 'Show a subscriber indicator where supported.', true, Crown],
  ['savings', 'Show customer savings', 'Show customers how much they saved through subscriber benefits.', true, DollarSign],
]

function PlanCard({ plan, config, onEdit }) {
  const Icon = plan.icon
  return (
    <Card className={`subscriber-plan-card subscriber-plan-card--${plan.tone}`}>
      <div className="subscriber-plan-card__header">
        <div className="subscriber-plan-card__identity">
          <span className="subscriber-plan-card__icon"><Icon size={18} /></span>
          <div><span className="subscriber-plan-card__eyebrow">{plan.key.toUpperCase()}</span><h3>{plan.key}</h3></div>
        </div>
        <span className="subscriber-plan-card__status"><Check size={13} /> Active</span>
      </div>
        <div className="subscriber-plan-card__price">₹{config.price} <small>/ month</small></div>
        <div className="subscriber-plan-card__benefits">
          <div><span>Text Questions</span><strong>{config.discounts.questions}% OFF</strong></div>
          <div><span>Audio Calls</span><strong>{config.discounts.audio}% OFF</strong></div>
          <div><span>Appointments</span><strong>{config.discounts.appointments}% OFF</strong></div>
          <div><span>Live Access</span><strong>{config.access.live}</strong></div>
        </div>
        <button type="button" className="subscriber-plan-card__edit" onClick={() => onEdit(plan.key)}><Edit2 size={14} /> Edit {plan.key}</button>

    </Card>
  )
}

function PlanEditModal({ plan, draft, onChange, onDiscountChange, onCancel, onSave }) {
  if (!plan || !draft) return null
  return <div className="subscriber-plan-modal-overlay" role="presentation" onClick={onCancel}>
    <section className="subscriber-plan-modal" role="dialog" aria-modal="true" aria-labelledby="subscriber-plan-modal-title" onClick={(event) => event.stopPropagation()}>
      <div className="subscriber-plan-modal__heading"><div><span className="perks-section-eyebrow">EDIT SUBSCRIPTION PLAN</span><h2 id="subscriber-plan-modal-title">Edit {plan} Plan</h2><p>Update the plan benefits used throughout the pricing calculation.</p></div><button type="button" className="subscriber-plan-editor__close" onClick={onCancel} aria-label="Close edit plan"><X size={17} /></button></div>
      <div className="subscriber-plan-modal__fields">
        <label>Monthly price<input type="number" min="0" step="1" value={draft.price} onChange={(event) => onChange('price', event.target.value)} /></label>
        {Object.entries({ questions: 'Text questions discount', audio: 'Audio calls discount', appointments: 'Appointments discount' }).map(([key, label]) => <label key={key}>{label}<span className="plan-input-with-suffix"><input type="number" min="0" max="100" step="1" value={draft.discounts[key]} onChange={(event) => onDiscountChange(key, event.target.value)} /><span aria-hidden="true">%</span></span></label>)}
        <label>Appointment access<select value={draft.access.booking} onChange={(event) => onChange('booking', event.target.value)}><option>Standard</option><option>Priority</option><option>Priority+</option></select></label>
        <label>Content access<select value={draft.access.content} onChange={(event) => onChange('content', event.target.value)}><option>Standard</option><option>Early Access</option><option>Premium Access</option></select></label>
        <label>Live access<select value={draft.access.live} onChange={(event) => onChange('live', event.target.value)}><option>Standard Access</option><option>Early Access</option><option>Priority Access</option></select></label>
      </div>
      <div className="subscriber-plan-editor__actions"><button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button><button type="button" className="btn btn-primary" onClick={onSave}><Save size={14} /> Save Changes</button></div>
    </section>
  </div>
}

export default function PerksSettings({ tierConfigs, onSave, onTierSave, onManageBenefits }) {
  const [settings, setSettings] = useState(() => Object.fromEntries(DEFAULT_SETTINGS.map(([key, , , enabled]) => [key, enabled])))
  const [editingPlan, setEditingPlan] = useState(null)
  const [planDraft, setPlanDraft] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('Gold')
  const [selectedService, setSelectedService] = useState('questions')
  const [servicePrices, setServicePrices] = useState({ questions: 399, audio: 25, appointments: 799 })

  const toggleSetting = (key) => setSettings((current) => ({ ...current, [key]: !current[key] }))
  const startEditing = (plan) => {
    setEditingPlan(plan)
    setPlanDraft({ ...tierConfigs[plan], discounts: { ...tierConfigs[plan].discounts }, access: { ...tierConfigs[plan].access } })
  }
  const updatePlanDiscount = (key, value) => setPlanDraft((current) => ({ ...current, discounts: { ...current.discounts, [key]: value === '' ? '' : Math.max(0, Math.min(100, Number(value) || 0)) } }))
  const updatePlanField = (key, value) => setPlanDraft((current) => ['booking', 'content', 'live'].includes(key) ? ({ ...current, access: { ...current.access, [key]: value } }) : ({ ...current, [key]: value }))
  const savePlan = () => {
    if (!editingPlan || !planDraft) return
    onTierSave?.(editingPlan, { ...planDraft, price: Number(planDraft.price) || 0, discounts: Object.fromEntries(Object.entries(planDraft.discounts).map(([key, value]) => [key, Number(value) || 0])) })
    setEditingPlan(null)
    setPlanDraft(null)
  }
  const serviceOptions = { questions: { label: 'Text Question', discount: 'questions' }, audio: { label: 'Audio Call', discount: 'audio' }, appointments: { label: 'Appointment', discount: 'appointments' } }
  const selectedServiceMeta = serviceOptions[selectedService]
  const originalPrice = Number(servicePrices[selectedService]) || 0
  const applicableDiscount = Number(tierConfigs[selectedPlan].discounts[selectedServiceMeta.discount] || 0)
  const discountAmount = originalPrice * applicableDiscount / 100
  const customerPayable = Math.max(0, originalPrice - discountAmount)
  const money = (amount) => `₹${amount.toFixed(2)}`

  return (
    <div className="perks-settings-redesign">
      <section className="subscriber-program-section subscriber-program-section--compact" aria-labelledby="subscriber-program-title">
        <div className="subscriber-program-glance-heading"><span className="subscriber-program-glance-heading__icon"><BarChart3 size={19} /></span><h2 id="subscriber-program-title">Program at a Glance</h2></div>
        <div className="subscriber-program-metrics">
          {PROGRAM_METRICS.map(({ label, value, hint, icon: Icon }) => <div className="subscriber-program-stat" key={label}><span className="subscriber-program-stat__icon"><Icon size={16} /></span><div><span className="subscriber-program-stat__label">{label}</span><strong>{value}</strong><small>{hint}</small></div></div>)}
        </div>
      </section>

      <section className="perks-settings-section" aria-labelledby="subscription-plans-title">
        <div className="perks-section-heading perks-section-heading--inline"><div><h2 id="subscription-plans-title">Plans built around paid services</h2></div></div>
        <div className="subscriber-plan-stage"><div className="subscriber-plans-grid">{PLAN_DEFINITIONS.map((plan) => <PlanCard key={plan.key} plan={plan} config={tierConfigs[plan.key]} onEdit={startEditing} />)}</div></div>
        <div className="benefits-flow benefits-flow--embedded" aria-labelledby="benefits-flow-title"><div><DollarSign size={17} /><strong id="benefits-flow-title">Original Price</strong><label className="benefits-flow__price-input"><span className="sr-only">Original {selectedServiceMeta.label} price</span><span>₹</span><input type="number" min="0" step="0.01" value={servicePrices[selectedService]} onChange={(event) => setServicePrices((current) => ({ ...current, [selectedService]: event.target.value }))} /></label></div><ArrowRight className="benefits-flow__arrow" size={18} /><div><Crown size={17} /><strong>Subscriber Plan</strong><select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value)}><option>Silver</option><option>Gold</option><option>Platinum</option></select></div><ArrowRight className="benefits-flow__arrow" size={18} /><div><BadgePercent size={17} /><strong>Discount Applied</strong><select value={selectedService} onChange={(event) => setSelectedService(event.target.value)}>{Object.entries(serviceOptions).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}</select><span>{applicableDiscount}% · {money(discountAmount)} off</span></div><ArrowRight className="benefits-flow__arrow" size={18} /><div className="benefits-flow__result"><Check size={17} /><strong>Final Customer Payable</strong><span>{money(customerPayable)}</span></div></div>
        <PlanEditModal plan={editingPlan} draft={planDraft} onChange={updatePlanField} onDiscountChange={updatePlanDiscount} onCancel={() => { setEditingPlan(null); setPlanDraft(null) }} onSave={savePlan} />
      </section>

      <section className="perks-settings-section program-settings-section" aria-labelledby="program-settings-title">
        <div className="perks-section-heading"><div><h2 id="program-settings-title">Control benefit visibility</h2></div><span className="perks-heading-mark"><Settings2 size={18} /></span></div>
        <div className="program-settings-list">{DEFAULT_SETTINGS.map(([key, label, description, , Icon]) => <div className="program-setting-row" key={key}><span className="program-setting-icon"><Icon size={16} /></span><div><strong>{label}</strong><small className="program-setting-description" id={`program-setting-description-${key}`}>{description}</small></div><button type="button" role="switch" aria-checked={settings[key]} aria-describedby={`program-setting-description-${key}`} className={`program-setting-toggle${settings[key] ? ' is-on' : ''}`} onClick={() => toggleSetting(key)}><span>{settings[key] ? 'ON' : 'OFF'}</span><i /></button></div>)}</div>
        <div className="program-settings-actions"><button type="button" className="btn btn-primary" onClick={() => onSave({ ...settings })}><Save size={16} /> Save Changes</button></div>
      </section>
    </div>
  )
}
