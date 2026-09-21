import { useState } from 'react'
import { ArrowRight, BadgePercent, Check, Crown, DollarSign, Eye, Gem, Save, Settings2, ShieldCheck, Sparkles, Users } from 'lucide-react'
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

function PlanCard({ plan, config }) {
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
        <div><span>Emergency</span><strong>{config.discounts.emergency}% OFF</strong></div>
        <div><span>Live Access</span><strong>{config.access.live}</strong></div>
      </div>
    </Card>
  )
}

export default function PerksSettings({ tierConfigs, onSave, onManageBenefits }) {
  const [settings, setSettings] = useState(() => Object.fromEntries(DEFAULT_SETTINGS.map(([key, , , enabled]) => [key, enabled])))

  const toggleSetting = (key) => setSettings((current) => ({ ...current, [key]: !current[key] }))
  const goldQuestionDiscount = Number(tierConfigs.Gold.discounts.questions || 0)
  const goldQuestionPrice = 399 * (1 - goldQuestionDiscount / 100)

  return (
    <div className="perks-settings-redesign">
      <section className="subscriber-program-section" aria-labelledby="subscriber-program-title">
        <div className="perks-section-heading"><div><span className="perks-section-eyebrow">SUBSCRIBER PROGRAM</span><h2 id="subscriber-program-title">Your subscriber program at a glance</h2><p>Overview of your current subscriber base.</p></div><span className="perks-heading-mark"><Sparkles size={18} /></span></div>
        <div className="subscriber-metrics-grid">
          {PROGRAM_METRICS.map(({ label, value, hint, icon: Icon }) => <Card className="subscriber-metric-card" key={label}><span className="subscriber-metric-card__icon"><Icon size={17} /></span><span className="subscriber-metric-card__label">{label}</span><strong>{value}</strong><small>{hint}</small></Card>)}
        </div>
      </section>

      <section className="perks-settings-section" aria-labelledby="subscription-plans-title">
        <div className="perks-section-heading"><div><span className="perks-section-eyebrow">SUBSCRIPTION PLANS</span><h2 id="subscription-plans-title">Plans built around paid services</h2><p>Your available subscriber plans and their core value.</p></div></div>
        <div className="subscriber-plans-grid">{PLAN_DEFINITIONS.map((plan) => <PlanCard key={plan.key} plan={plan} config={tierConfigs[plan.key]} />)}</div>
        <p className="paid-services-note"><BadgePercent size={15} /> Subscriptions provide discounts and access benefits. Questions and consultations remain paid services.</p>
      </section>

      <section className="perks-settings-section benefits-flow-section" aria-labelledby="benefits-flow-title">
        <div className="perks-section-heading"><div><span className="perks-section-eyebrow">HOW BENEFITS WORK</span><h2 id="benefits-flow-title">Discounts are applied to your normal price</h2><p>Subscribers receive value through discounts, while every service remains paid.</p></div></div>
        <div className="benefits-flow"><div><DollarSign size={17} /><strong>Normal Price</strong><span>₹399 Question</span></div><ArrowRight className="benefits-flow__arrow" size={18} /><div><Crown size={17} /><strong>Subscriber Plan</strong><span>Gold Subscriber</span></div><ArrowRight className="benefits-flow__arrow" size={18} /><div><BadgePercent size={17} /><strong>Discount Applied</strong><span>{goldQuestionDiscount}% Discount</span></div><ArrowRight className="benefits-flow__arrow" size={18} /><div className="benefits-flow__result"><Check size={17} /><strong>Customer Pays</strong><span>₹{goldQuestionPrice.toFixed(2)}</span></div></div>
      </section>

      <section className="perks-settings-section" aria-labelledby="benefit-policy-title">
        <div className="perks-section-heading perks-section-heading--inline"><div><span className="perks-section-eyebrow">YOUR BENEFIT POLICY</span><h2 id="benefit-policy-title">Current subscriber benefits</h2><p>Current benefits available across your subscriber plans.</p></div><button type="button" className="btn btn-outline perks-manage-btn" onClick={onManageBenefits}>Manage Benefits <ArrowRight size={15} /></button></div>
        <div className="subscriber-policy-table-wrap"><table className="subscriber-policy-table"><thead><tr><th>Service</th><th>Silver</th><th>Gold</th><th>Platinum</th><th>Status</th></tr></thead><tbody>{[
          ['Text Question', 'questions'],
          ['Audio Call', 'audio'],
          ['Appointment', 'appointments'],
          ['Emergency Consultation', 'emergency'],
          ['Live Session', 'live'],
        ].map(([label, key]) => <tr key={label}><th scope="row">{label}</th>{['Silver', 'Gold', 'Platinum'].map((tier) => <td key={`${label}-${tier}`}>{key === 'live' ? tierConfigs[tier].access.live : `${tierConfigs[tier].discounts[key]}%`}</td>)}<td><span className="subscriber-policy-status"><Check size={12} /> Active</span></td></tr>)}</tbody></table></div>
      </section>

      <section className="perks-settings-section program-settings-section" aria-labelledby="program-settings-title">
        <div className="perks-section-heading"><div><span className="perks-section-eyebrow">PROGRAM SETTINGS</span><h2 id="program-settings-title">Control benefit visibility</h2><p>Control how subscriber benefits are presented to your customers.</p></div><span className="perks-heading-mark"><Settings2 size={18} /></span></div>
        <div className="program-settings-list">{DEFAULT_SETTINGS.map(([key, label, description, , Icon]) => <div className="program-setting-row" key={key}><span className="program-setting-icon"><Icon size={16} /></span><div><strong>{label}</strong><p>{description}</p></div><button type="button" role="switch" aria-checked={settings[key]} className={`program-setting-toggle${settings[key] ? ' is-on' : ''}`} onClick={() => toggleSetting(key)}><span>{settings[key] ? 'ON' : 'OFF'}</span><i /></button></div>)}</div>
        <div className="program-settings-actions"><button type="button" className="btn btn-primary" onClick={onSave}><Save size={16} /> Save Changes</button></div>
      </section>
    </div>
  )
}
