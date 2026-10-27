import { useState } from 'react'
import { ArrowRight, BadgePercent, Check, Crown, DollarSign, Edit2, Eye, Gem, Save, Settings2, ShieldCheck, Sparkles, Users, X } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'

const PLAN_DEFINITIONS = [
  { key: 'Silver', tone: 'silver', icon: ShieldCheck },
  { key: 'Gold', tone: 'gold', icon: Crown },
  { key: 'Platinum', tone: 'platinum', icon: Gem },
]

const PROGRAM_METRICS = [
  { label: 'Active Subscribers', value: '81', hint: '+12 this month', icon: Users },
  { label: 'Silver', value: '41', hint: '50.6% of active base', icon: ShieldCheck },
  { label: 'Gold', value: '28', hint: '34.6% of active base', icon: Crown },
  { label: 'Platinum', value: '12', hint: '14.8% of active base', icon: Gem },
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

export default function PerksSettings({ tierConfigs, onSave, onTierSave, onManageBenefits }) {
  const [settings, setSettings] = useState(() => Object.fromEntries(DEFAULT_SETTINGS.map(([key, , , enabled]) => [key, enabled])))
  const [selectedPlan, setSelectedPlan] = useState('Silver')
  const [editingPlan, setEditingPlan] = useState(null)
  const [planDraft, setPlanDraft] = useState(null)

  const toggleSetting = (key) => setSettings((current) => ({ ...current, [key]: !current[key] }))
  const startEditing = (plan) => {
    setEditingPlan(plan)
    setPlanDraft({ ...tierConfigs[plan], discounts: { ...tierConfigs[plan].discounts }, access: { ...tierConfigs[plan].access } })
  }
  const updatePlanDiscount = (key, value) => setPlanDraft((current) => ({ ...current, discounts: { ...current.discounts, [key]: value === '' ? '' : Math.max(0, Math.min(100, Number(value) || 0)) } }))
  const savePlan = () => {
    if (!editingPlan || !planDraft) return
    onTierSave?.(editingPlan, { ...planDraft, price: Number(planDraft.price) || 0, discounts: Object.fromEntries(Object.entries(planDraft.discounts).map(([key, value]) => [key, Number(value) || 0])) })
    setEditingPlan(null)
    setPlanDraft(null)
  }
  const goldQuestionDiscount = Number(tierConfigs.Gold.discounts.questions || 0)
  const goldQuestionPrice = 399 * (1 - goldQuestionDiscount / 100)

  return (
    <div className="perks-settings-redesign">
      <section className="subscriber-program-section" aria-labelledby="subscriber-program-title">
        <div className="perks-section-heading"><div><h2 id="subscriber-program-title">Your subscriber program at a glance</h2></div><span className="perks-heading-mark"><Sparkles size={18} /></span></div>
        <div className="subscriber-metrics-grid">
          {PROGRAM_METRICS.map(({ label, value, hint, icon: Icon }) => <Card className="subscriber-metric-card" key={label}><span className="subscriber-metric-card__icon"><Icon size={17} /></span><span className="subscriber-metric-card__label">{label}</span><strong>{value}</strong><small>{hint}</small></Card>)}
        </div>
      </section>

      <section className="perks-settings-section" aria-labelledby="subscription-plans-title">
        <div className="perks-section-heading perks-section-heading--inline"><div><h2 id="subscription-plans-title">Plans built around paid services</h2><p className="perks-section-description">Choose a subscriber plan to review its price and benefits.</p></div><label className="plan-selector"><span>Subscriber plan</span><select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value)} aria-label="Subscriber plan"><option value="Silver">Silver</option><option value="Gold">Gold</option><option value="Platinum">Platinum</option></select></label></div>
        <div className={`subscriber-plan-stage${editingPlan ? ' is-editing' : ''}`}><div className="subscriber-plans-grid">{PLAN_DEFINITIONS.filter((plan) => plan.key === selectedPlan).map((plan) => <PlanCard key={plan.key} plan={plan} config={tierConfigs[plan.key]} onEdit={startEditing} />)}</div>{editingPlan && planDraft && <div className="subscriber-plan-editor" role="dialog" aria-label={`Edit ${editingPlan} plan`}><div className="subscriber-plan-editor__heading"><div><span className="perks-section-eyebrow">EDIT PLAN</span><h3>{editingPlan} subscriber plan</h3></div><button type="button" className="subscriber-plan-editor__close" onClick={() => setEditingPlan(null)} aria-label="Close editor"><X size={16} /></button></div><div className="subscriber-plan-editor__fields"><label>Monthly price<input type="number" min="0" value={planDraft.price} onChange={(event) => setPlanDraft((current) => ({ ...current, price: event.target.value }))} /></label>{[['questions', 'Text questions discount'], ['audio', 'Audio calls discount'], ['appointments', 'Appointments discount']].map(([key, label]) => <label key={key}>{label}<span className="plan-input-with-suffix"><input type="number" min="0" max="100" value={planDraft.discounts[key]} onChange={(event) => updatePlanDiscount(key, event.target.value)} /><span aria-hidden="true">%</span></span></label>)}<label>Appointment access<select value={planDraft.access.booking} onChange={(event) => setPlanDraft((current) => ({ ...current, access: { ...current.access, booking: event.target.value } }))}><option>Standard</option><option>Priority</option><option>Priority+</option></select></label><label>Content access<select value={planDraft.access.content} onChange={(event) => setPlanDraft((current) => ({ ...current, access: { ...current.access, content: event.target.value } }))}><option>Standard</option><option>Early Access</option><option>Premium Access</option></select></label><label>Live access<select value={planDraft.access.live} onChange={(event) => setPlanDraft((current) => ({ ...current, access: { ...current.access, live: event.target.value } }))}><option>Standard Access</option><option>Early Access</option><option>Priority Access</option></select></label></div><div className="subscriber-plan-editor__actions"><button type="button" className="btn btn-ghost" onClick={() => setEditingPlan(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={savePlan}><Save size={15} /> Save plan</button></div></div>}</div>
        <div className="benefits-flow benefits-flow--embedded" aria-labelledby="benefits-flow-title"><div><DollarSign size={17} /><strong id="benefits-flow-title">Normal Price</strong><span>₹399 Question</span></div><ArrowRight className="benefits-flow__arrow" size={18} /><div><Crown size={17} /><strong>Subscriber Plan</strong><span>Gold Subscriber</span></div><ArrowRight className="benefits-flow__arrow" size={18} /><div><BadgePercent size={17} /><strong>Discount Applied</strong><span>{goldQuestionDiscount}% Discount</span></div><ArrowRight className="benefits-flow__arrow" size={18} /><div className="benefits-flow__result"><Check size={17} /><strong>Customer Pays</strong><span>₹{goldQuestionPrice.toFixed(2)}</span></div></div>
      </section>

      <section className="perks-settings-section program-settings-section" aria-labelledby="program-settings-title">
        <div className="perks-section-heading"><div><h2 id="program-settings-title">Control benefit visibility</h2></div><span className="perks-heading-mark"><Settings2 size={18} /></span></div>
        <div className="program-settings-list">{DEFAULT_SETTINGS.map(([key, label, description, , Icon]) => <div className="program-setting-row" key={key}><span className="program-setting-icon"><Icon size={16} /></span><div><strong>{label}</strong><small className="program-setting-description" id={`program-setting-description-${key}`}>{description}</small></div><button type="button" role="switch" aria-checked={settings[key]} aria-describedby={`program-setting-description-${key}`} className={`program-setting-toggle${settings[key] ? ' is-on' : ''}`} onClick={() => toggleSetting(key)}><span>{settings[key] ? 'ON' : 'OFF'}</span><i /></button></div>)}</div>
        <div className="program-settings-actions"><button type="button" className="btn btn-primary" onClick={() => onSave({ ...settings })}><Save size={16} /> Save Changes</button></div>
      </section>
    </div>
  )
}
