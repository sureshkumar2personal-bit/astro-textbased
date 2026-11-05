import { useState } from 'react'
import { BadgePercent, BarChart3, Check, Crown, DollarSign, Edit2, Eye, Gem, Save, Settings2, ShieldCheck, Users, X } from 'lucide-react'
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

function PlanCard({ plan, config, isEditing, draft, onEdit, onChange, onDiscountChange, onCancel, onSave }) {
  const Icon = plan.icon
  const defaultChat = plan.key === 'Silver' ? 10 : plan.key === 'Gold' ? 20 : 25

  if (isEditing && draft) {
    return (
      <Card className={`subscriber-plan-card subscriber-plan-card--${plan.tone} is-editing`}>
        <div className="subscriber-plan-card__header">
          <div className="subscriber-plan-card__identity">
            <span className="subscriber-plan-card__icon"><Icon size={18} /></span>
            <div><span className="subscriber-plan-card__eyebrow">EDITING {plan.key.toUpperCase()}</span><h3>{plan.key}</h3></div>
          </div>
          <span className="subscriber-plan-card__status subscriber-plan-card__status--editing"><Edit2 size={12} /> Editing</span>
        </div>

        <div className="subscriber-plan-card__price subscriber-plan-card__price--editing">
          <span>₹</span>
          <input
            type="number"
            min="0"
            step="1"
            value={draft.price}
            onChange={(event) => onChange('price', event.target.value)}
            aria-label="Monthly price"
          />
          <small>/ month</small>
        </div>

        <div className="subscriber-plan-card__benefits subscriber-plan-card__benefits--editing">
          <div>
            <span>Text Questions</span>
            <div className="subscriber-plan-card__row-input">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={draft.discounts?.questions ?? ''}
                onChange={(event) => onDiscountChange('questions', event.target.value)}
                aria-label="Text Questions discount"
              />
              <strong>% OFF</strong>
            </div>
          </div>

          <div>
            <span>Instant Chat</span>
            <div className="subscriber-plan-card__row-input">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={draft.discounts?.chat ?? defaultChat}
                onChange={(event) => onDiscountChange('chat', event.target.value)}
                aria-label="Instant Chat discount"
              />
              <strong>% OFF</strong>
            </div>
          </div>

          <div>
            <span>Instant Call</span>
            <div className="subscriber-plan-card__row-input">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={draft.discounts?.audio ?? ''}
                onChange={(event) => onDiscountChange('audio', event.target.value)}
                aria-label="Instant Call discount"
              />
              <strong>% OFF</strong>
            </div>
          </div>

          <div>
            <span>Appointments</span>
            <div className="subscriber-plan-card__row-input">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={draft.discounts?.appointments ?? ''}
                onChange={(event) => onDiscountChange('appointments', event.target.value)}
                aria-label="Appointments discount"
              />
              <strong>% OFF</strong>
            </div>
          </div>

          <div>
            <span>Live Access</span>
            <select
              className="subscriber-plan-card__row-select"
              value={draft.access?.live || 'Standard Access'}
              onChange={(event) => onChange('live', event.target.value)}
              aria-label="Live Access"
            >
              <option>Standard Access</option>
              <option>Early Access</option>
              <option>Priority Access</option>
            </select>
          </div>
        </div>

        <div className="subscriber-plan-card__edit-actions">
          <button type="button" className="subscriber-plan-card__btn-cancel" onClick={onCancel}>
            <X size={14} /> Cancel
          </button>
          <button type="button" className="subscriber-plan-card__btn-save" onClick={onSave}>
            <Save size={14} /> Save
          </button>
        </div>
      </Card>
    )
  }

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
        <div><span>Text Questions</span><strong>{config.discounts?.questions ?? 0}% OFF</strong></div>
        <div><span>Instant Chat</span><strong>{config.discounts?.chat ?? defaultChat}% OFF</strong></div>
        <div><span>Instant Call</span><strong>{config.discounts?.audio ?? 0}% OFF</strong></div>
        <div><span>Appointments</span><strong>{config.discounts?.appointments ?? 0}% OFF</strong></div>
        <div><span>Live Access</span><strong>{config.access?.live || 'Standard Access'}</strong></div>
      </div>
      <button type="button" className="subscriber-plan-card__edit" onClick={() => onEdit(plan.key)}><Edit2 size={14} /> Edit {plan.key}</button>
    </Card>
  )
}

export function SubscriberProgramGlance({ className = '' }) {
  return (
    <section className={`subscriber-program-section subscriber-program-section--compact ${className}`.trim()} aria-labelledby="subscriber-program-title">
      <div className="subscriber-program-glance-heading">
        <span className="subscriber-program-glance-heading__icon"><BarChart3 size={19} /></span>
        <h2 id="subscriber-program-title">Program at a Glance</h2>
      </div>
      <div className="subscriber-program-metrics">
        {PROGRAM_METRICS.map(({ label, value, hint, icon: Icon }) => (
          <div className="subscriber-program-stat" key={label}>
            <span className="subscriber-program-stat__icon"><Icon size={16} /></span>
            <div>
              <span className="subscriber-program-stat__label">{label}</span>
              <strong>{value}</strong>
              <small>{hint}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function PerksSettings({ tierConfigs, onSave, onTierSave, showGlance = true }) {
  const [settings, setSettings] = useState(() => Object.fromEntries(DEFAULT_SETTINGS.map(([key, , , enabled]) => [key, enabled])))
  const [editingPlan, setEditingPlan] = useState(null)
  const [planDraft, setPlanDraft] = useState(null)

  const toggleSetting = (key) => setSettings((current) => ({ ...current, [key]: !current[key] }))
  const startEditing = (plan) => {
    const currentConfig = tierConfigs[plan] || {}
    const defaultChat = plan === 'Silver' ? 10 : plan === 'Gold' ? 20 : 25
    setEditingPlan(plan)
    setPlanDraft({
      price: currentConfig.price ?? 0,
      discounts: {
        questions: currentConfig.discounts?.questions ?? 0,
        chat: currentConfig.discounts?.chat ?? defaultChat,
        audio: currentConfig.discounts?.audio ?? 0,
        appointments: currentConfig.discounts?.appointments ?? 0,
        ...currentConfig.discounts,
      },
      access: {
        booking: currentConfig.access?.booking || 'Standard',
        content: currentConfig.access?.content || 'Standard',
        live: currentConfig.access?.live || 'Standard Access',
        ...currentConfig.access,
      },
    })
  }
  const updatePlanDiscount = (key, value) => setPlanDraft((current) => ({ ...current, discounts: { ...current.discounts, [key]: value === '' ? '' : Math.max(0, Math.min(100, Number(value) || 0)) } }))
  const updatePlanField = (key, value) => setPlanDraft((current) => ['booking', 'content', 'live'].includes(key) ? ({ ...current, access: { ...current.access, [key]: value } }) : ({ ...current, [key]: value }))
  const savePlan = () => {
    if (!editingPlan || !planDraft) return
    onTierSave?.(editingPlan, { ...planDraft, price: Number(planDraft.price) || 0, discounts: Object.fromEntries(Object.entries(planDraft.discounts).map(([key, value]) => [key, Number(value) || 0])) })
    setEditingPlan(null)
    setPlanDraft(null)
  }

  return (
    <div className="perks-settings-redesign">
      {showGlance && <SubscriberProgramGlance />}

      <section className="perks-settings-section" aria-labelledby="subscription-plans-title">
        <div className="perks-section-heading perks-section-heading--inline"><div><h2 id="subscription-plans-title">Plans built around paid services</h2></div></div>
        <div className="subscriber-plan-stage">
          <div className="subscriber-plans-grid">
            {PLAN_DEFINITIONS.map((plan) => (
              <PlanCard
                key={plan.key}
                plan={plan}
                config={tierConfigs[plan.key]}
                isEditing={editingPlan === plan.key}
                draft={editingPlan === plan.key ? planDraft : null}
                onEdit={startEditing}
                onChange={updatePlanField}
                onDiscountChange={updatePlanDiscount}
                onCancel={() => {
                  setEditingPlan(null)
                  setPlanDraft(null)
                }}
                onSave={savePlan}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="perks-settings-section program-settings-section" aria-labelledby="program-settings-title">
        <div className="perks-section-heading"><div><h2 id="program-settings-title">Control benefit visibility</h2></div><span className="perks-heading-mark"><Settings2 size={18} /></span></div>
        <div className="program-settings-list">{DEFAULT_SETTINGS.map(([key, label, description, , Icon]) => <div className="program-setting-row" key={key}><span className="program-setting-icon"><Icon size={16} /></span><div><strong>{label}</strong><small className="program-setting-description" id={`program-setting-description-${key}`}>{description}</small></div><button type="button" role="switch" aria-checked={settings[key]} aria-describedby={`program-setting-description-${key}`} className={`program-setting-toggle${settings[key] ? ' is-on' : ''}`} onClick={() => toggleSetting(key)}><span>{settings[key] ? 'ON' : 'OFF'}</span><i /></button></div>)}</div>
        <div className="program-settings-actions"><button type="button" className="btn btn-primary" onClick={() => onSave({ ...settings })}><Save size={16} /> Save Changes</button></div>
      </section>
    </div>
  )
}
