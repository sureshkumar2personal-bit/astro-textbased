import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BadgePercent, CalendarDays, Check, ChevronRight, Crown, DollarSign, Gem, Headphones, ListChecks, Radio, RefreshCcw, Save, ShieldCheck, Sparkles, Video, Zap } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'

const CATEGORIES = [
  { key: 'questions', label: 'Questions', icon: ListChecks },
  { key: 'audio', label: 'Audio Calls', icon: Headphones },
  { key: 'appointments', label: 'Appointments', icon: CalendarDays },
  { key: 'emergency', label: 'Emergency', icon: Zap },
  { key: 'live', label: 'Live Sessions', icon: Radio },
  { key: 'content', label: 'Content', icon: Video },
]

const PLAN_META = {
  Silver: { tone: 'silver', icon: ShieldCheck },
  Gold: { tone: 'gold', icon: Crown },
  Platinum: { tone: 'platinum', icon: Gem },
}

const CONTENT_CATEGORIES = ['Daily Prediction', 'Weekly Prediction', 'Monthly Prediction', 'Guru Peyarchi', 'Sani Peyarchi', 'Rahu Peyarchi', 'Ketu Peyarchi', 'Festival / Special Event']

const SERVICE_COPY = {
  questions: { eyebrow: 'TEXT QUESTIONS', title: 'Paid question discounts', description: 'Subscribers receive a discount on your normal question price. The question remains paid.', price: 399, priceLabel: 'Normal Question Price' },
  audio: { eyebrow: 'AUDIO CALL BENEFITS', title: 'Paid audio-call discounts', description: 'Apply subscriber discounts to your existing audio-call pricing.', price: 25, priceLabel: 'Normal Audio Call Price', suffix: ' / min' },
  appointments: { eyebrow: 'APPOINTMENT BENEFITS', title: 'Discounts and booking priority', description: 'Offer a clear discount alongside the booking priority available to each plan.' },
  emergency: { eyebrow: 'EMERGENCY CONSULTATION', title: 'Emergency consultation benefits', description: 'Emergency benefits may affect priority handling, subject to your availability.' },
  live: { eyebrow: 'LIVE SESSION ACCESS', title: 'Access levels for live sessions', description: 'Set the access level each subscriber plan receives for your live sessions.' },
  content: { eyebrow: 'CONTENT ACCESS', title: 'Subscriber content access', description: 'Give subscribers clear access levels to your published astrology content.' },
}

function cloneConfig(config) {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => [key, { ...value, discounts: { ...value.discounts }, access: { ...value.access }, categories: [...(value.categories || [])] }]))
}

function PlanIdentity({ tier }) {
  const meta = PLAN_META[tier]
  const Icon = meta.icon
  return <div className="benefit-plan-identity"><span className={`benefit-plan-icon benefit-plan-icon--${meta.tone}`}><Icon size={16} /></span><div><strong>{tier}</strong><small>Subscriber plan</small></div></div>
}

function DiscountEditor({ config, field, onChange }) {
  return <div className="benefit-edit-row"><PlanIdentity tier={config.key} /><label><span className="sr-only">{config.key} discount</span><input type="number" min="0" max="100" value={config.discounts[field]} onChange={(event) => onChange(Number(event.target.value))} /><b>%</b></label></div>
}

function DiscountPanel({ config, field, price, suffix = '' }) {
  const discount = Number(config.Gold.discounts[field] || 0)
  const customerPays = Math.max(0, price * (1 - discount / 100))
  return <Card className="benefit-preview-card"><div className="benefit-preview-heading"><span><DollarSign size={15} /> Customer Price Preview</span><small>Gold example</small></div><div className="benefit-preview-values"><div><span>Normal price</span><strong>₹{price.toFixed(2)}{suffix}</strong></div><ArrowRight size={16} /><div><span>{discount}% discount</span><strong>− ₹{(price * discount / 100).toFixed(2)}{suffix}</strong></div><ArrowRight size={16} /><div className="benefit-preview-result"><span>Customer pays</span><strong>₹{customerPays.toFixed(2)}{suffix}</strong></div></div></Card>
}

function DiscountCategory({ category, draft, updateDiscount }) {
  const copy = SERVICE_COPY[category]
  const field = category === 'questions' ? 'questions' : category
  const price = copy.price
  return <div className="benefit-management-panel"><div className="benefit-panel-heading"><div><span className="perks-section-eyebrow">{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.description}</p></div><span className="benefit-panel-mark"><BadgePercent size={18} /></span></div>{price && <div className="benefit-normal-price"><span>{copy.priceLabel}</span><strong>₹{price}{copy.suffix || ''}</strong></div>}<div className="benefit-editor-list">{['Silver', 'Gold', 'Platinum'].map((tier) => <DiscountEditor key={tier} config={{ ...draft[tier], key: tier }} field={field} onChange={(value) => updateDiscount(tier, field, value)} />)}</div>{price && <DiscountPanel config={draft} field={field} price={price} suffix={copy.suffix || ''} />}</div>
}

function LevelCategory({ category, draft, updateAccess, updateDiscount }) {
  const copy = SERVICE_COPY[category]
  const accessField = category === 'appointments' ? 'booking' : category === 'live' ? 'live' : 'content'
  const values = category === 'appointments' ? ['Standard', 'Priority', 'Priority+'] : category === 'live' ? ['Standard Access', 'Early Access', 'Priority Access'] : ['Standard', 'Early Access', 'Premium Access']
  return <div className="benefit-management-panel"><div className="benefit-panel-heading"><div><span className="perks-section-eyebrow">{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.description}</p></div><span className="benefit-panel-mark"><Sparkles size={18} /></span></div>{category === 'appointments' && <div className="benefit-editor-list">{['Silver', 'Gold', 'Platinum'].map((tier) => <DiscountEditor key={tier} config={{ ...draft[tier], key: tier }} field="appointments" onChange={(value) => updateDiscount(tier, 'appointments', value)} />)}</div>}<div className="benefit-access-list">{['Silver', 'Gold', 'Platinum'].map((tier) => <div className="benefit-access-row" key={tier}><PlanIdentity tier={tier} /><select value={draft[tier].access[accessField]} onChange={(event) => updateAccess(tier, accessField, event.target.value)}>{values.map((value) => <option key={value}>{value}</option>)}</select></div>)}</div>{category === 'content' && <div className="benefit-content-categories"><strong>Available content categories</strong><div>{CONTENT_CATEGORIES.map((item) => <span key={item}><Check size={12} />{item}</span>)}</div></div>}</div>
}

export default function PerksBenefitManagement({ tierConfigs, onSave, onReset }) {
  const [category, setCategory] = useState('questions')
  const [draft, setDraft] = useState(() => cloneConfig(tierConfigs))
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => setDraft(cloneConfig(tierConfigs)), [tierConfigs])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(tierConfigs), [draft, tierConfigs])
  const updateDiscount = (tier, field, value) => setDraft((current) => ({ ...current, [tier]: { ...current[tier], discounts: { ...current[tier].discounts, [field]: Math.min(100, Math.max(0, value || 0)) } } }))
  const updatePrice = (tier, value) => setDraft((current) => ({ ...current, [tier]: { ...current[tier], price: value === '' ? '' : Math.max(0, Number(value) || 0) } }))
  const updateAccess = (tier, field, value) => setDraft((current) => ({ ...current, [tier]: { ...current[tier], access: { ...current[tier].access, [field]: value } } }))
  const save = () => { onSave(draft); setSavedMessage('Changes saved'); window.setTimeout(() => setSavedMessage(''), 2500) }
  const reset = () => { setDraft(cloneConfig(tierConfigs)); onReset?.(); setSavedMessage('Changes reset') }
  const copy = SERVICE_COPY[category]

  return <div className="benefit-management-redesign"><section className="benefit-program-banner"><div><span className="perks-section-eyebrow">CURRENT SUBSCRIBER PROGRAM</span><h2>One connected benefit configuration</h2><p>These benefits apply to active subscribers. Questions and consultations remain paid services.</p></div><div className="benefit-program-prices">{['Silver', 'Gold', 'Platinum'].map((tier) => <div key={tier}><PlanIdentity tier={tier} /><label className="benefit-price-editor"><span className="sr-only">{tier} monthly price</span><span>₹</span><input type="number" min="0" step="1" value={draft[tier].price} onChange={(event) => updatePrice(tier, event.target.value)} /><small>/month</small></label></div>)}</div></section><div className="benefit-management-layout"><nav className="benefit-category-nav" aria-label="Benefit categories"><span className="benefit-category-nav__label">BENEFIT CATEGORIES</span>{CATEGORIES.map(({ key, label, icon: Icon }) => <button type="button" key={key} className={category === key ? 'is-active' : ''} onClick={() => setCategory(key)}><Icon size={16} /><span>{label}</span><ChevronRight size={14} /></button>)}</nav><section className="benefit-management-content"><div className="benefit-selected-heading"><div><span className="perks-section-eyebrow">SELECTED BENEFIT</span><h1>{copy.title}</h1></div>{dirty && <span className="benefit-unsaved"><span /> Unsaved changes</span>}</div>{category === 'questions' || category === 'audio' || category === 'emergency' ? <DiscountCategory category={category} draft={draft} updateDiscount={updateDiscount} /> : <LevelCategory category={category} draft={draft} updateAccess={updateAccess} updateDiscount={updateDiscount} />}</section></div><div className="benefit-management-actions"><span>{savedMessage || (dirty ? 'Review your changes before saving.' : 'All benefits are up to date.')}</span><div><button type="button" className="btn btn-ghost" onClick={reset} disabled={!dirty}><RefreshCcw size={15} /> Reset</button><button type="button" className="btn btn-primary" onClick={save} disabled={!dirty}><Save size={15} /> Save Changes</button></div></div></div>
}
