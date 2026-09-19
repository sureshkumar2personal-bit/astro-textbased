import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Flame,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  Search,
  Check,
  Clock,
  Star,
  FileText,
  Camera,
  Video,
  Mic,
  Eye,
  Sparkles,
  Copy,
  Tag,
  ArrowUp,
  ArrowDown,
  Info,
  ListChecks,
  Flower2,
  Users,
  ShieldCheck,
  CalendarDays,
  ClipboardList,
  Edit3,
  X,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'

const RITUAL_TYPES = [
  { id: 'pooja', label: 'Pooja', icon: '🪔' },
  { id: 'archana', label: 'Archana', icon: '📿' },
  { id: 'abhishekam', label: 'Abhishekam', icon: '🙏' },
  { id: 'deepam', label: 'Deepam', icon: '🔥' },
  { id: 'homam', label: 'Homam', icon: '🏺' },
  { id: 'sankalpam', label: 'Sankalpam', icon: '🎯' },
  { id: 'mantra-japam', label: 'Mantra Japam', icon: '🕉️' },
  { id: 'annadhanam', label: 'Annadhanam', icon: '🍚' },
  { id: 'temple-donation', label: 'Temple Donation', icon: '🏛️' },
  { id: 'offering', label: 'Offering', icon: '🌺' },
  { id: 'vratham', label: 'Vratham', icon: '📿' },
  { id: 'custom', label: 'Custom Ritual', icon: '✨' },
]

const LAMP_TYPES = ['Ghee', 'Sesame Oil', 'Coconut Oil', 'Custom']
const WICK_TYPES = ['Cotton Wick', 'Geeta Wick', 'Special Wick']
const LIGHTING_METHODS = ['Single Wick', 'Double Wick', 'Multi Wick']
const DIRECTIONS = ['East', 'West', 'North', 'South', 'Northeast', 'Custom']
const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'One-time']
const PREFERRED_TIMES = ['Morning', 'Afternoon', 'Evening', 'Night', 'Brahma Muhurta']
const POOJA_TYPES = ['Lakshmi Pooja', 'Ganesh Pooja', 'Navagraha Pooja', 'Rudra Abhishekam', 'Satyanarayana Pooja', 'Custom']
const CUSTOMER_FIELDS = [
  { id: 'name', label: 'Name' },
  { id: 'dob', label: 'Date of Birth' },
  { id: 'birth-time', label: 'Birth Time' },
  { id: 'birth-place', label: 'Birth Place' },
  { id: 'rashi', label: 'Rashi' },
  { id: 'nakshatra', label: 'Nakshatra' },
  { id: 'gotra', label: 'Gotra' },
  { id: 'family', label: 'Family Member Details' },
  { id: 'special-request', label: 'Special Request' },
]
const PROOF_TYPES = [
  { id: 'photo', label: 'Photo', icon: Camera },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'audio-sankalpam', label: 'Audio Sankalpam', icon: Mic },
  { id: 'temple-receipt', label: 'Temple Receipt', icon: FileText },
]

const CATEGORIES = ['All', 'Dosha', 'Marriage', 'Career', 'Finance', 'Family', 'General']
const ADD_CATEGORY_VALUE = '__add-category__'

function readJSON(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function atonementStorageKey(userId, bucket) {
  return `astroconnect:atonement:${userId || 'guest'}:${bucket}`
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function uniqueByName(categories) {
  const seen = new Set()
  return categories.filter((category) => {
    const name = typeof category === 'string' ? category : category?.name
    const key = String(name || '').trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function createRitualConfig(id) {
  if (id === 'deepam') {
    return { lampType: '', count: '', wickType: '', lightingMethod: '', direction: '', frequency: '', duration: '', preferredTime: '', instructions: '' }
  }
  if (id === 'mantra-japam') {
    return { name: '', text: '', repetitions: '', days: '', preferredTime: '', instructions: '' }
  }
  if (id === 'abhishekam') {
    return { deity: '', abhishekamType: '', materials: '', quantity: '', duration: '', instructions: '' }
  }
  if (id === 'pooja') {
    return { deity: '', poojaType: '', materials: '', quantity: '', times: '', instructions: '' }
  }
  if (id === 'archana') {
    return { deity: '', archanaType: '', numberOfNames: '', offerings: '', instructions: '' }
  }
  if (id === 'homam') {
    return { deity: '', homamType: '', samagri: '', offerings: '', duration: '', preferredTime: '', instructions: '' }
  }
  if (id === 'sankalpam') {
    return { sankalpamFor: '', priestName: '', gotraRequired: true, language: '', time: '', instructions: '' }
  }
  if (id === 'annadhanam') {
    return { beneficiaryCount: '', mealType: '', location: '', date: '', sponsorName: '', instructions: '' }
  }
  if (id === 'temple-donation') {
    return { templeName: '', donationPurpose: '', amount: '', receiptRequired: true, donationDate: '', instructions: '' }
  }
  if (id === 'offering') {
    return { offeringType: '', deity: '', quantity: '', frequency: '', preferredTime: '', instructions: '' }
  }
  if (id === 'vratham') {
    return { vrathamName: '', numberOfDays: '', fastingMethod: '', startDate: '', endDate: '', instructions: '' }
  }
  if (id === 'custom') {
    return {
      ritualName: '',
      category: '',
      shortDescription: '',
      detailedInstructions: '',
      duration: '',
      frequency: '',
      preferredTime: '',
      materials: [],
      additionalDetails: [],
    }
  }
  return { instructions: '' }
}

function createRitualFromType(ritualType, duplicateCount = 0) {
  return {
    instanceId: createId('ritual'),
    name: duplicateCount ? `${ritualType.label} ${duplicateCount + 1}` : ritualType.label,
    label: ritualType.label,
    id: ritualType.id,
    icon: ritualType.icon,
    enabled: true,
    config: createRitualConfig(ritualType.id),
  }
}

function findRitualType(ritualName) {
  const name = String(ritualName || '').toLowerCase()
  return RITUAL_TYPES.find((type) => type.label.toLowerCase() === name)
    || RITUAL_TYPES.find((type) => name.includes(type.id.replace('-', ' ')))
    || null
}

function createBlankCustomRitualDraft(overrides = {}) {
  return {
    ritualName: '',
    category: '',
    shortDescription: '',
    detailedInstructions: '',
    duration: '',
    frequency: '',
    preferredTime: '',
    materials: [],
    additionalDetails: [],
    ...overrides,
  }
}

function createBlankCustomMaterial() {
  return { name: '', quantity: '', unit: '', required: 'required', instructions: '' }
}

function createBlankCustomDetail() {
  return { label: '', value: '' }
}

function customDraftFromRitual(ritual) {
  const config = ritual?.config || {}
  return createBlankCustomRitualDraft({
    ritualName: config.ritualName || ritual?.name || '',
    category: config.category || '',
    shortDescription: config.shortDescription || config.description || '',
    detailedInstructions: config.detailedInstructions || config.instructions || '',
    duration: config.duration || '',
    frequency: config.frequency || '',
    preferredTime: config.preferredTime || '',
    materials: Array.isArray(config.materials) ? config.materials : [],
    additionalDetails: Array.isArray(config.additionalDetails) ? config.additionalDetails : [],
  })
}

function createCustomRitualFromDraft(draft, existing = null) {
  const cleanName = draft.ritualName.trim()
  return {
    instanceId: existing?.instanceId || createId('ritual'),
    name: cleanName,
    label: 'Custom Ritual',
    id: 'custom',
    icon: '✨',
    enabled: true,
    customByAstrologer: true,
    config: createBlankCustomRitualDraft({
      ...draft,
      ritualName: cleanName,
      materials: draft.materials.filter((item) => item.name.trim() || item.quantity.trim() || item.instructions.trim()),
      additionalDetails: draft.additionalDetails.filter((item) => item.label.trim() || item.value.trim()),
    }),
  }
}

function normalizeAtonementForm(form) {
  const next = { ...createDefaultAtonement(), ...(form || {}) }
  next.rituals = Array.isArray(next.rituals)
    ? next.rituals.map((ritual, index) => ({
      ...ritual,
      instanceId: ritual.instanceId || createId(`ritual-${index}`),
      label: ritual.label || ritual.name,
      customByAstrologer: Boolean(ritual.customByAstrologer || ritual.id === 'custom'),
      config: ritual.id === 'custom'
        ? customDraftFromRitual(ritual)
        : { ...createRitualConfig(ritual.id), ...(ritual.config || {}) },
    }))
    : []
  next.steps = Array.isArray(next.steps) ? next.steps : []
  next.materials = Array.isArray(next.materials) ? next.materials : []
  next.customerFields = Array.isArray(next.customerFields) ? next.customerFields : []
  next.proof = { ...(next.proof || {}) }
  delete next.proof['completion-cert']
  next.availability = { ...createDefaultAtonement().availability, ...(next.availability || {}) }
  next.instructions = { ...createDefaultAtonement().instructions, ...(next.instructions || {}) }
  return next
}

const DEFAULT_ATONEMENTS = [
  {
    id: 'rahu-dosha',
    name: 'Rahu Dosha Pariharam',
    purpose: 'Neutralize the adverse effects of Rahu in the birth chart',
    duration: '7 days',
    rituals: ['Sankalpam', 'Rahu Abhishekam', 'Mantra Japam', 'Deepam', 'Annadhanam'],
    category: 'Dosha',
    badge: 'Platform Default',
  },
  {
    id: 'ketu-dosha',
    name: 'Ketu Dosha Pariharam',
    purpose: 'Remedy the malefic effects of Ketu for spiritual growth',
    duration: '9 days',
    rituals: ['Sankalpam', 'Abhishekam', 'Homam', 'Mantra Japam', 'Offering'],
    category: 'Dosha',
    badge: 'Platform Default',
  },
  {
    id: 'shani-dosha',
    name: 'Shani Dosha Pariharam',
    purpose: 'Mitigate Saturn-related delays and obstacles in life',
    duration: '11 days',
    rituals: ['Sankalpam', 'Shani Abhishekam', 'Deepam', 'Mantra Japam', 'Temple Donation'],
    category: 'Dosha',
    badge: 'Platform Default',
  },
  {
    id: 'kuja-dosha',
    name: 'Kuja Dosha Pariharam',
    purpose: 'Remove Mars-related obstacles especially in marriage',
    duration: '7 days',
    rituals: ['Sankalpam', 'Mars Abhishekam', 'Archana', 'Deepam', 'Annadhanam'],
    category: 'Dosha',
    badge: 'Platform Default',
  },
  {
    id: 'kala-sarpa',
    name: 'Kala Sarpa Dosha Pariharam',
    purpose: 'Counteract the Kala Sarpa Dosha for overall well-being',
    duration: '9 days',
    rituals: ['Sankalpam', 'Naga Abhishekam', 'Homam', 'Mantra Japam', 'Deepam'],
    category: 'Dosha',
    badge: 'Platform Default',
  },
  {
    id: 'navagraha',
    name: 'Navagraha Pariharam',
    purpose: 'Balance the effects of all nine planetary influences',
    duration: '11 days',
    rituals: ['Sankalpam', 'Navagraha Abhishekam', 'Archana', 'Homam', 'Mantra Japam', 'Deepam'],
    category: 'Dosha',
    badge: 'Platform Default',
  },
  {
    id: 'marriage-obstacle',
    name: 'Marriage Obstacle Pariharam',
    purpose: 'Remove obstacles delaying marriage and find the right match',
    duration: '7 days',
    rituals: ['Sankalpam', 'Lakshmi Pooja', 'Abhishekam', 'Deepam', 'Mantra Japam'],
    category: 'Marriage',
    badge: 'Platform Default',
  },
  {
    id: 'career-obstacle',
    name: 'Career Obstacle Pariharam',
    purpose: 'Overcome professional setbacks and career stagnation',
    duration: '5 days',
    rituals: ['Sankalpam', 'Ganesh Pooja', 'Abhishekam', 'Deepam', 'Temple Donation'],
    category: 'Career',
    badge: 'Platform Default',
  },
  {
    id: 'financial-pariharam',
    name: 'Financial Pariharam',
    purpose: 'Attract financial stability and remove monetary blocks',
    duration: '9 days',
    rituals: ['Sankalpam', 'Lakshmi Abhishekam', 'Deepam', 'Mantra Japam', 'Annadhanam'],
    category: 'Finance',
    badge: 'Platform Default',
  },
  {
    id: 'graha-shanti',
    name: 'Graha Shanti',
    purpose: 'Peace ceremony to pacify all planetary doshas',
    duration: '7 days',
    rituals: ['Sankalpam', 'Navagraha Abhishekam', 'Homam', 'Archana', 'Deepam', 'Mantra Japam'],
    category: 'General',
    badge: 'Platform Default',
  },
  {
    id: 'lakshmi-pariharam',
    name: 'Lakshmi Pariharam',
    purpose: 'Invoke Goddess Lakshmi for prosperity and abundance',
    duration: '5 days',
    rituals: ['Sankalpam', 'Lakshmi Pooja', 'Deepam', 'Offering', 'Annadhanam'],
    category: 'Finance',
    badge: 'Platform Default',
  },
  {
    id: 'education-pariharam',
    name: 'Education Pariharam',
    purpose: 'Enhance academic performance and knowledge acquisition',
    duration: '7 days',
    rituals: ['Sankalpam', 'Saraswati Pooja', 'Abhishekam', 'Mantra Japam', 'Temple Donation'],
    category: 'Career',
    badge: 'Platform Default',
  },
  {
    id: 'general-shanti',
    name: 'General Shanti Pariharam',
    purpose: 'Overall peace, harmony, and protection from negativity',
    duration: '3 days',
    rituals: ['Sankalpam', 'Ganesh Pooja', 'Deepam', 'Mantra Japam', 'Offering'],
    category: 'General',
    badge: 'Platform Default',
  },
]

function createDefaultAtonement() {
  return {
    name: '',
    category: '',
    purpose: '',
    shortDescription: '',
    detailedDescription: '',
    rituals: [],
    steps: [],
    deepam: { lampType: '', count: '', wickType: '', lightingMethod: '', direction: '', frequency: '', duration: '', preferredTime: '', instructions: '' },
    mantra: { name: '', text: '', repetitions: '', duration: '', days: '', timing: '', instructions: '' },
    pooja: { deity: '', poojaType: '', materials: '', quantity: '', times: '', date: '', instructions: '' },
    materials: [],
    customerFields: [],
    proof: {},
    availability: { active: true, startDate: '', endDate: '', maxOrders: '', dailyLimit: '', advanceRequired: false, sameDay: false },
    instructions: { before: '', during: '', after: '' },
  }
}

function cloneAtonement(defaultAton) {
  const base = createDefaultAtonement()
  // Keep the template identity and duration with the astrologer's independent copy.
  // These fields are metadata only; the platform template is never changed.
  base.sourceDefaultId = defaultAton.id
  base.templateDuration = defaultAton.duration
  base.name = defaultAton.name
  base.category = defaultAton.category
  base.purpose = defaultAton.purpose
  base.shortDescription = defaultAton.purpose
  base.rituals = defaultAton.rituals.map((r) => {
    const type = findRitualType(r)
    if (type) return { ...createRitualFromType(type), name: r }
    const id = r.toLowerCase().replace(/\s+/g, '-')
    return { instanceId: createId('ritual'), name: r, label: r, id, icon: '✨', enabled: true, config: createRitualConfig(id) }
  })
  base.steps = defaultAton.rituals.map((r, i) => ({ step: i + 1, name: r, description: '' }))
  if (base.rituals.some((r) => r.id === 'deepam')) {
    base.rituals = base.rituals.map((ritual) => ritual.id === 'deepam'
      ? { ...ritual, config: { ...ritual.config, lampType: 'Sesame Oil', count: '9', wickType: 'Cotton Wick', lightingMethod: 'Single Wick', direction: 'East', frequency: 'Daily', duration: defaultAton.duration, preferredTime: 'Evening', instructions: 'Light 9 sesame oil lamps with cotton wicks, single wick, in the east direction during the evening for the full duration.' } }
      : ritual)
  }
  if (base.rituals.some((r) => r.id === 'mantra-japam')) {
    base.rituals = base.rituals.map((ritual) => ritual.id === 'mantra-japam'
      ? { ...ritual, config: { ...ritual.config, repetitions: '108 times', days: defaultAton.duration.includes('day') ? defaultAton.duration.match(/\d+/)?.[0] || '7' : '7', timing: 'morning', instructions: 'Chant the mantra with proper pronunciation, maintaining focus and devotion.' } }
      : ritual)
  }
  if (base.rituals.some((r) => ['pooja', 'abhishekam', 'archana'].includes(r.id))) {
    base.rituals = base.rituals.map((ritual) => ['pooja', 'abhishekam', 'archana'].includes(ritual.id)
      ? { ...ritual, config: { ...ritual.config, poojaType: ritual.id === 'abhishekam' ? undefined : 'Navagraha Pooja', abhishekamType: ritual.id === 'abhishekam' ? 'Traditional Abhishekam' : ritual.config.abhishekamType, materials: 'Milk, Curd, Honey, Ghee, Panchamritam', quantity: '1 litre each', times: 'Once daily', instructions: 'Perform with devotion following the traditional procedures.' } }
      : ritual)
  }
  base.materials = [
    { name: 'Sesame Oil', quantity: '250', unit: 'ml', required: 'required', purpose: 'For deepam lighting' },
    { name: 'Ghee', quantity: '100', unit: 'ml', required: 'required', purpose: 'For pooja and lamps' },
    { name: 'Cotton Wick', quantity: '9', unit: 'pcs', required: 'required', purpose: 'For deepam' },
    { name: 'Flowers', quantity: '1', unit: 'set', required: 'optional', purpose: 'For archana and offering' },
    { name: 'Coconut', quantity: '2', unit: 'pcs', required: 'optional', purpose: 'For pooja ritual' },
    { name: 'Betel Leaves', quantity: '5', unit: 'pcs', required: 'optional', purpose: 'For ritual offering' },
  ]
  base.customerFields = ['name', 'dob', 'birth-time', 'birth-place', 'rashi', 'nakshatra', 'gotra']
  base.proof = { photo: 'required', video: 'optional', 'audio-sankalpam': 'optional', 'temple-receipt': 'optional' }
  base.availability = { active: true, startDate: '', endDate: '', maxOrders: '50', dailyLimit: '5', advanceRequired: true, sameDay: false }
  base.instructions = {
    before: 'Provide your birth details, rashi and nakshatra at the time of booking. Keep the required materials ready.',
    during: 'Be present during the scheduled ritual timings. Follow the instructions of the astrologer.',
    after: 'Receive the ritual proof after completion. Share feedback on the atonement experience.',
  }
  return base
}

function AtonementSection({ title, icon: Icon, children, defaultOpen = true, number, forceOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => {
    if (forceOpen) setOpen(true)
  }, [forceOpen])
  return (
    <div className="atonement-section">
      <button type="button" className="atonement-section-header" onClick={() => setOpen(!open)}>
        <div className="atonement-section-header-left">
          {number && <span className="atonement-section-number">{number}</span>}
          {Icon && <Icon size={18} />}
          <span>{title}</span>
        </div>
        <ChevronDown size={16} className={`atonement-chevron${open ? ' open' : ''}`} />
      </button>
      {open && <div className="atonement-section-body">{children}</div>}
    </div>
  )
}

function FormField({ label, children, className = '' }) {
  return (
    <div className={`atonement-field${className ? ` ${className}` : ''}`}>
      <label className="atonement-field-label">{label}</label>
      {children}
    </div>
  )
}

function RitualConfigFields({ ritual, onConfigChange }) {
  const config = ritual.config || {}
  const updateConfig = (key, value) => onConfigChange({ ...config, [key]: value })

  if (ritual.id === 'deepam') {
    return (
      <div className="atonement-form-grid atonement-ritual-config-grid">
        <FormField label="Lamp Type">
          <select value={config.lampType || ''} onChange={(e) => updateConfig('lampType', e.target.value)}>
            <option value="">Select</option>
            {LAMP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Number of Lamps">
          <input type="number" value={config.count || ''} onChange={(e) => updateConfig('count', e.target.value)} placeholder="e.g. 9" />
        </FormField>
        <FormField label="Wick Type">
          <select value={config.wickType || ''} onChange={(e) => updateConfig('wickType', e.target.value)}>
            <option value="">Select</option>
            {WICK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Lighting Method">
          <select value={config.lightingMethod || ''} onChange={(e) => updateConfig('lightingMethod', e.target.value)}>
            <option value="">Select</option>
            {LIGHTING_METHODS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Direction">
          <select value={config.direction || ''} onChange={(e) => updateConfig('direction', e.target.value)}>
            <option value="">Select</option>
            {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </FormField>
        <FormField label="Frequency">
          <select value={config.frequency || ''} onChange={(e) => updateConfig('frequency', e.target.value)}>
            <option value="">Select</option>
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </FormField>
        <FormField label="Duration">
          <input type="text" value={config.duration || ''} onChange={(e) => updateConfig('duration', e.target.value)} placeholder="e.g. 9 days" />
        </FormField>
        <FormField label="Preferred Time">
          <select value={config.preferredTime || ''} onChange={(e) => updateConfig('preferredTime', e.target.value)}>
            <option value="">Select</option>
            {PREFERRED_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Instructions" className="atonement-field--full">
          <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder="Instructions for this Deepam component..." rows={3} />
        </FormField>
      </div>
    )
  }

  if (ritual.id === 'mantra-japam') {
    return (
      <div className="atonement-form-grid atonement-ritual-config-grid">
        <FormField label="Mantra Name">
          <input type="text" value={config.name || ''} onChange={(e) => updateConfig('name', e.target.value)} placeholder="e.g. Rahu Beej Mantra" />
        </FormField>
        <FormField label="Mantra Text">
          <textarea value={config.text || ''} onChange={(e) => updateConfig('text', e.target.value)} placeholder="Enter mantra text..." rows={3} />
        </FormField>
        <FormField label="Repetition Count">
          <input type="text" value={config.repetitions || ''} onChange={(e) => updateConfig('repetitions', e.target.value)} placeholder="e.g. 108 times" />
        </FormField>
        <FormField label="Number of Days">
          <input type="text" value={config.days || ''} onChange={(e) => updateConfig('days', e.target.value)} placeholder="e.g. 9 days" />
        </FormField>
        <FormField label="Preferred Time">
          <select value={config.preferredTime || config.timing || ''} onChange={(e) => updateConfig('preferredTime', e.target.value)}>
            <option value="">Select</option>
            {PREFERRED_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Instructions" className="atonement-field--full">
          <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder="Instructions for the mantra chanting..." rows={3} />
        </FormField>
      </div>
    )
  }

  if (ritual.id === 'abhishekam') {
    return (
      <div className="atonement-form-grid atonement-ritual-config-grid">
        <FormField label="Deity">
          <input type="text" value={config.deity || ''} onChange={(e) => updateConfig('deity', e.target.value)} placeholder="e.g. Lord Shiva" />
        </FormField>
        <FormField label="Abhishekam Type">
          <input type="text" value={config.abhishekamType || ''} onChange={(e) => updateConfig('abhishekamType', e.target.value)} placeholder="e.g. Rudra Abhishekam" />
        </FormField>
        <FormField label="Materials">
          <input type="text" value={config.materials || ''} onChange={(e) => updateConfig('materials', e.target.value)} placeholder="e.g. Milk, Honey, Curd" />
        </FormField>
        <FormField label="Quantity">
          <input type="text" value={config.quantity || ''} onChange={(e) => updateConfig('quantity', e.target.value)} placeholder="e.g. 1 litre each" />
        </FormField>
        <FormField label="Duration">
          <input type="text" value={config.duration || ''} onChange={(e) => updateConfig('duration', e.target.value)} placeholder="e.g. 60 minutes" />
        </FormField>
        <FormField label="Instructions" className="atonement-field--full">
          <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder="Instructions for this Abhishekam component..." rows={3} />
        </FormField>
      </div>
    )
  }

  if (ritual.id === 'pooja') {
    return (
      <div className="atonement-form-grid atonement-ritual-config-grid">
        <FormField label="Deity">
          <input type="text" value={config.deity || ''} onChange={(e) => updateConfig('deity', e.target.value)} placeholder="e.g. Lord Shiva" />
        </FormField>
        <FormField label={ritual.id === 'archana' ? 'Archana Type' : 'Pooja Type'}>
          <select value={config.poojaType || ''} onChange={(e) => updateConfig('poojaType', e.target.value)}>
            <option value="">Select</option>
            {POOJA_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </FormField>
        <FormField label="Materials">
          <input type="text" value={config.materials || ''} onChange={(e) => updateConfig('materials', e.target.value)} placeholder="e.g. Milk, Honey, Curd" />
        </FormField>
        <FormField label="Quantity">
          <input type="text" value={config.quantity || ''} onChange={(e) => updateConfig('quantity', e.target.value)} placeholder="e.g. 1 litre each" />
        </FormField>
        <FormField label="Number of Times">
          <input type="text" value={config.times || ''} onChange={(e) => updateConfig('times', e.target.value)} placeholder="e.g. Once daily" />
        </FormField>
        <FormField label="Instructions" className="atonement-field--full">
          <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder="Instructions for this component..." rows={3} />
        </FormField>
      </div>
    )
  }

  if (ritual.id === 'archana') {
    return (
      <div className="atonement-form-grid atonement-ritual-config-grid">
        <FormField label="Deity">
          <input type="text" value={config.deity || ''} onChange={(e) => updateConfig('deity', e.target.value)} placeholder="e.g. Lord Vishnu" />
        </FormField>
        <FormField label="Archana Type">
          <input type="text" value={config.archanaType || config.poojaType || ''} onChange={(e) => updateConfig('archanaType', e.target.value)} placeholder="e.g. Ashtottara Archana" />
        </FormField>
        <FormField label="Number Of Names">
          <input type="number" value={config.numberOfNames || ''} onChange={(e) => updateConfig('numberOfNames', e.target.value)} placeholder="e.g. 108" />
        </FormField>
        <FormField label="Offerings">
          <input type="text" value={config.offerings || ''} onChange={(e) => updateConfig('offerings', e.target.value)} placeholder="e.g. Flowers, kumkum" />
        </FormField>
        <FormField label="Instructions" className="atonement-field--full">
          <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder="Instructions for this Archana component..." rows={3} />
        </FormField>
      </div>
    )
  }

  if (ritual.id === 'homam') {
    return (
      <div className="atonement-form-grid atonement-ritual-config-grid">
        <FormField label="Deity">
          <input type="text" value={config.deity || ''} onChange={(e) => updateConfig('deity', e.target.value)} placeholder="e.g. Lord Ganesha" />
        </FormField>
        <FormField label="Homam Type">
          <input type="text" value={config.homamType || ''} onChange={(e) => updateConfig('homamType', e.target.value)} placeholder="e.g. Ganapathi Homam" />
        </FormField>
        <FormField label="Samagri">
          <input type="text" value={config.samagri || ''} onChange={(e) => updateConfig('samagri', e.target.value)} placeholder="Required homam materials" />
        </FormField>
        <FormField label="Offerings">
          <input type="text" value={config.offerings || ''} onChange={(e) => updateConfig('offerings', e.target.value)} placeholder="e.g. Ghee, herbs, grains" />
        </FormField>
        <FormField label="Duration">
          <input type="text" value={config.duration || ''} onChange={(e) => updateConfig('duration', e.target.value)} placeholder="e.g. 90 minutes" />
        </FormField>
        <FormField label="Preferred Time">
          <select value={config.preferredTime || ''} onChange={(e) => updateConfig('preferredTime', e.target.value)}>
            <option value="">Select</option>
            {PREFERRED_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Instructions" className="atonement-field--full">
          <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder="Instructions for this Homam component..." rows={3} />
        </FormField>
      </div>
    )
  }

  if (ritual.id === 'sankalpam') {
    return (
      <div className="atonement-form-grid atonement-ritual-config-grid">
        <FormField label="Sankalpam For">
          <input type="text" value={config.sankalpamFor || ''} onChange={(e) => updateConfig('sankalpamFor', e.target.value)} placeholder="e.g. Customer and family" />
        </FormField>
        <FormField label="Priest Name">
          <input type="text" value={config.priestName || ''} onChange={(e) => updateConfig('priestName', e.target.value)} placeholder="Optional priest name" />
        </FormField>
        <FormField label="Gotra Required">
          <div className="atonement-toggle-row">
            <span className={`atonement-toggle${config.gotraRequired ? ' on' : ''}`} onClick={() => updateConfig('gotraRequired', !config.gotraRequired)}>
              <span className="atonement-toggle-knob" />
            </span>
            <span>{config.gotraRequired ? 'Yes' : 'No'}</span>
          </div>
        </FormField>
        <FormField label="Language">
          <input type="text" value={config.language || ''} onChange={(e) => updateConfig('language', e.target.value)} placeholder="e.g. Sanskrit / Tamil" />
        </FormField>
        <FormField label="Time">
          <input type="text" value={config.time || ''} onChange={(e) => updateConfig('time', e.target.value)} placeholder="e.g. Before main ritual" />
        </FormField>
        <FormField label="Instructions" className="atonement-field--full">
          <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder="Instructions for this Sankalpam component..." rows={3} />
        </FormField>
      </div>
    )
  }

  if (ritual.id === 'annadhanam') {
    return (
      <div className="atonement-form-grid atonement-ritual-config-grid">
        <FormField label="Beneficiary Count">
          <input type="number" value={config.beneficiaryCount || ''} onChange={(e) => updateConfig('beneficiaryCount', e.target.value)} placeholder="e.g. 25" />
        </FormField>
        <FormField label="Meal Type">
          <input type="text" value={config.mealType || ''} onChange={(e) => updateConfig('mealType', e.target.value)} placeholder="e.g. Full meal / prasadam" />
        </FormField>
        <FormField label="Location">
          <input type="text" value={config.location || ''} onChange={(e) => updateConfig('location', e.target.value)} placeholder="Temple or service location" />
        </FormField>
        <FormField label="Date">
          <input type="date" value={config.date || ''} onChange={(e) => updateConfig('date', e.target.value)} />
        </FormField>
        <FormField label="Sponsor Name">
          <input type="text" value={config.sponsorName || ''} onChange={(e) => updateConfig('sponsorName', e.target.value)} placeholder="Name to include in sankalpam" />
        </FormField>
        <FormField label="Instructions" className="atonement-field--full">
          <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder="Instructions for Annadhanam..." rows={3} />
        </FormField>
      </div>
    )
  }

  if (ritual.id === 'temple-donation') {
    return (
      <div className="atonement-form-grid atonement-ritual-config-grid">
        <FormField label="Temple Name">
          <input type="text" value={config.templeName || ''} onChange={(e) => updateConfig('templeName', e.target.value)} placeholder="e.g. Navagraha temple" />
        </FormField>
        <FormField label="Donation Purpose">
          <input type="text" value={config.donationPurpose || ''} onChange={(e) => updateConfig('donationPurpose', e.target.value)} placeholder="e.g. Oil donation / archana" />
        </FormField>
        <FormField label="Amount">
          <input type="number" value={config.amount || ''} onChange={(e) => updateConfig('amount', e.target.value)} placeholder="Donation amount" />
        </FormField>
        <FormField label="Receipt Required">
          <div className="atonement-toggle-row">
            <span className={`atonement-toggle${config.receiptRequired ? ' on' : ''}`} onClick={() => updateConfig('receiptRequired', !config.receiptRequired)}>
              <span className="atonement-toggle-knob" />
            </span>
            <span>{config.receiptRequired ? 'Yes' : 'No'}</span>
          </div>
        </FormField>
        <FormField label="Donation Date">
          <input type="date" value={config.donationDate || ''} onChange={(e) => updateConfig('donationDate', e.target.value)} />
        </FormField>
        <FormField label="Instructions" className="atonement-field--full">
          <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder="Instructions for temple donation..." rows={3} />
        </FormField>
      </div>
    )
  }

  if (ritual.id === 'offering') {
    return (
      <div className="atonement-form-grid atonement-ritual-config-grid">
        <FormField label="Offering Type">
          <input type="text" value={config.offeringType || ''} onChange={(e) => updateConfig('offeringType', e.target.value)} placeholder="e.g. Flowers, coconut, vastram" />
        </FormField>
        <FormField label="Deity">
          <input type="text" value={config.deity || ''} onChange={(e) => updateConfig('deity', e.target.value)} placeholder="e.g. Goddess Lakshmi" />
        </FormField>
        <FormField label="Quantity">
          <input type="text" value={config.quantity || ''} onChange={(e) => updateConfig('quantity', e.target.value)} placeholder="e.g. 2 coconuts" />
        </FormField>
        <FormField label="Frequency">
          <select value={config.frequency || ''} onChange={(e) => updateConfig('frequency', e.target.value)}>
            <option value="">Select</option>
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </FormField>
        <FormField label="Preferred Time">
          <select value={config.preferredTime || ''} onChange={(e) => updateConfig('preferredTime', e.target.value)}>
            <option value="">Select</option>
            {PREFERRED_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Instructions" className="atonement-field--full">
          <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder="Instructions for this offering..." rows={3} />
        </FormField>
      </div>
    )
  }

  if (ritual.id === 'vratham') {
    return (
      <div className="atonement-form-grid atonement-ritual-config-grid">
        <FormField label="Vratham Name">
          <input type="text" value={config.vrathamName || ''} onChange={(e) => updateConfig('vrathamName', e.target.value)} placeholder="e.g. Pradosha Vratham" />
        </FormField>
        <FormField label="Number of Days">
          <input type="text" value={config.numberOfDays || ''} onChange={(e) => updateConfig('numberOfDays', e.target.value)} placeholder="e.g. 3 days" />
        </FormField>
        <FormField label="Fasting Method">
          <input type="text" value={config.fastingMethod || ''} onChange={(e) => updateConfig('fastingMethod', e.target.value)} placeholder="e.g. Fruits only / partial fast" />
        </FormField>
        <FormField label="Start Date">
          <input type="date" value={config.startDate || ''} onChange={(e) => updateConfig('startDate', e.target.value)} />
        </FormField>
        <FormField label="End Date">
          <input type="date" value={config.endDate || ''} onChange={(e) => updateConfig('endDate', e.target.value)} />
        </FormField>
        <FormField label="Instructions" className="atonement-field--full">
          <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder="Instructions for this Vratham..." rows={3} />
        </FormField>
      </div>
    )
  }

  if (ritual.id === 'custom') {
    return (
      <div className="atonement-form-grid atonement-ritual-config-grid">
        <FormField label="Ritual Name">
          <input type="text" value={config.ritualName || ''} onChange={(e) => updateConfig('ritualName', e.target.value)} placeholder="Custom ritual name" />
        </FormField>
        <FormField label="Description">
          <textarea value={config.description || ''} onChange={(e) => updateConfig('description', e.target.value)} placeholder="Describe this ritual..." rows={3} />
        </FormField>
        <FormField label="Duration">
          <input type="text" value={config.duration || ''} onChange={(e) => updateConfig('duration', e.target.value)} placeholder="e.g. 45 minutes" />
        </FormField>
        <FormField label="Materials">
          <input type="text" value={config.materials || ''} onChange={(e) => updateConfig('materials', e.target.value)} placeholder="Materials needed" />
        </FormField>
        <FormField label="Instructions" className="atonement-field--full">
          <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder="Instructions for this custom ritual..." rows={3} />
        </FormField>
      </div>
    )
  }

  return (
    <div className="atonement-form-grid atonement-ritual-config-grid">
      <FormField label="Instructions" className="atonement-field--full">
        <textarea value={config.instructions || ''} onChange={(e) => updateConfig('instructions', e.target.value)} placeholder={`Instructions for ${ritual.label || ritual.name}...`} rows={3} />
      </FormField>
    </div>
  )
}

function ritualSummary(ritual) {
  const config = ritual.config || {}
  if (ritual.id === 'deepam') return [config.count ? `${config.count} Lamps` : '', config.duration].filter(Boolean).join(' • ')
  if (ritual.id === 'mantra-japam') return [config.repetitions, config.days ? `${config.days} Days` : ''].filter(Boolean).join(' • ')
  if (ritual.id === 'abhishekam') return [config.deity, config.duration || config.times].filter(Boolean).join(' • ')
  if (ritual.id === 'archana') return [config.deity, config.numberOfNames ? `${config.numberOfNames} Names` : ''].filter(Boolean).join(' • ')
  if (ritual.id === 'pooja') return [config.deity, config.poojaType].filter(Boolean).join(' • ')
  if (ritual.id === 'homam') return [config.homamType, config.duration].filter(Boolean).join(' • ')
  if (ritual.id === 'sankalpam') return [config.sankalpamFor, config.time].filter(Boolean).join(' • ')
  if (ritual.id === 'annadhanam') return [config.beneficiaryCount ? `${config.beneficiaryCount} People` : '', config.mealType].filter(Boolean).join(' • ')
  if (ritual.id === 'temple-donation') return [config.templeName, config.amount ? `₹${config.amount}` : ''].filter(Boolean).join(' • ')
  if (ritual.id === 'offering') return [config.offeringType, config.quantity].filter(Boolean).join(' • ')
  if (ritual.id === 'vratham') return [config.vrathamName, config.numberOfDays ? `${config.numberOfDays} Days` : ''].filter(Boolean).join(' • ')
  if (ritual.id === 'custom') return [config.duration, config.preferredTime].filter(Boolean).join(' • ')
  return ''
}

function RitualRow({ ritual, onUpdate, onRemove, onMoveUp, onMoveDown, onEditCustom, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false)
  const summary = ritualSummary(ritual)
  const isCustom = ritual.id === 'custom'
  return (
    <div className="atonement-ritual-row">
      <div className="atonement-ritual-row-header">
        <GripVertical size={14} className="atonement-drag-handle" />
        <span className="atonement-ritual-icon">{ritual.icon || '✨'}</span>
        <div className="atonement-ritual-copy">
          <span className="atonement-ritual-label">{ritual.name}</span>
          <small>{isCustom ? 'Custom by Astrologer' : 'Platform Component'}{summary ? ` • ${summary}` : ''}</small>
        </div>
        <div className="atonement-chip-actions">
          {!isFirst && <button type="button" onClick={onMoveUp} className="atonement-chip-btn" aria-label="Move ritual up"><ArrowUp size={12} /></button>}
          {!isLast && <button type="button" onClick={onMoveDown} className="atonement-chip-btn" aria-label="Move ritual down"><ArrowDown size={12} /></button>}
          <button type="button" onClick={() => isCustom ? onEditCustom() : setExpanded(!expanded)} className="atonement-chip-btn" aria-label={expanded ? 'Collapse ritual' : 'Edit ritual'}>
            {expanded ? <ChevronDown size={12} className="open" /> : <Edit3 size={12} />}
          </button>
          <button type="button" onClick={onRemove} className="atonement-chip-btn atonement-chip-btn--danger" aria-label="Delete ritual"><Trash2 size={12} /></button>
        </div>
      </div>
      {expanded && (
        <div className="atonement-ritual-row-body">
          <FormField label="Component Name">
            <input type="text" value={ritual.name} onChange={(e) => onUpdate({ ...ritual, name: e.target.value })} />
          </FormField>
          <RitualConfigFields ritual={ritual} onConfigChange={(config) => onUpdate({ ...ritual, config })} />
        </div>
      )}
    </div>
  )
}

function StepItem({ step, index, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="atonement-step">
      <div className="atonement-step-header">
        <span className="atonement-step-number">{index + 1}</span>
        <span className="atonement-step-name">{step.name || 'New Step'}</span>
        <div className="atonement-step-actions">
          {!isFirst && <button type="button" onClick={onMoveUp} className="atonement-chip-btn"><ArrowUp size={12} /></button>}
          {!isLast && <button type="button" onClick={onMoveDown} className="atonement-chip-btn"><ArrowDown size={12} /></button>}
          <button type="button" onClick={() => setExpanded(!expanded)} className="atonement-chip-btn"><ChevronDown size={12} className={expanded ? 'open' : ''} /></button>
          <button type="button" onClick={onRemove} className="atonement-chip-btn atonement-chip-btn--danger"><Trash2 size={12} /></button>
        </div>
      </div>
      {expanded && (
        <div className="atonement-step-body">
          <FormField label="Step Name">
            <input type="text" value={step.name} onChange={(e) => onUpdate({ ...step, name: e.target.value })} placeholder="e.g. Sankalpam" />
          </FormField>
          <FormField label="Description">
            <textarea value={step.description} onChange={(e) => onUpdate({ ...step, description: e.target.value })} placeholder="Describe this step..." rows={2} />
          </FormField>
        </div>
      )}
    </div>
  )
}

function MaterialRow({ material, onUpdate, onRemove }) {
  return (
    <div className="atonement-material-row">
      <FormField label="Name" className="atonement-material-name">
        <input type="text" value={material.name} onChange={(e) => onUpdate({ ...material, name: e.target.value })} placeholder="e.g. Sesame Oil" />
      </FormField>
      <FormField label="Quantity">
        <input type="text" value={material.quantity} onChange={(e) => onUpdate({ ...material, quantity: e.target.value })} placeholder="e.g. 250" />
      </FormField>
      <FormField label="Unit">
        <select value={material.unit} onChange={(e) => onUpdate({ ...material, unit: e.target.value })}>
          <option value="">Select</option>
          <option value="ml">ml</option>
          <option value="ltr">Ltr</option>
          <option value="g">g</option>
          <option value="kg">Kg</option>
          <option value="pcs">Pcs</option>
          <option value="set">Set</option>
          <option value="pair">Pair</option>
        </select>
      </FormField>
      <FormField label="Type">
        <select value={material.required} onChange={(e) => onUpdate({ ...material, required: e.target.value })}>
          <option value="required">Required</option>
          <option value="optional">Optional</option>
        </select>
      </FormField>
      <FormField label="Purpose" className="atonement-material-purpose">
        <input type="text" value={material.purpose} onChange={(e) => onUpdate({ ...material, purpose: e.target.value })} placeholder="Purpose / Instructions" />
      </FormField>
      <button type="button" onClick={onRemove} className="atonement-remove-material"><Trash2 size={14} /></button>
    </div>
  )
}

function CustomRitualModal({ draft, setDraft, categories, error, isEditing, onClose, onSubmit }) {
  const updateDraft = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }))
  const updateMaterial = (index, value) => setDraft((prev) => {
    const materials = [...prev.materials]
    materials[index] = value
    return { ...prev, materials }
  })
  const updateDetail = (index, value) => setDraft((prev) => {
    const additionalDetails = [...prev.additionalDetails]
    additionalDetails[index] = value
    return { ...prev, additionalDetails }
  })

  return (
    <div className="atonement-modal-backdrop" role="dialog" aria-modal="true" aria-label="Create Custom Ritual" onClick={onClose}>
      <div className="atonement-custom-modal" onClick={(event) => event.stopPropagation()}>
        <div className="atonement-ritual-picker-modal-header">
          <div>
            <h3>Create Custom Ritual</h3>
            <p>Add your own ritual details and instructions.</p>
          </div>
          <button type="button" className="atonement-modal-close" onClick={onClose} aria-label="Close custom ritual form"><X size={16} /></button>
        </div>

        <div className="atonement-form-grid atonement-custom-form-grid">
          <FormField label="Ritual Name *">
            <input className={error ? 'atonement-input-error' : ''} type="text" value={draft.ritualName} onChange={(e) => updateDraft('ritualName', e.target.value)} placeholder="Enter ritual name" />
            {error && <span className="atonement-field-error">{error}</span>}
          </FormField>
          <FormField label="Ritual Category">
            <select value={draft.category} onChange={(e) => updateDraft('category', e.target.value)}>
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}
            </select>
          </FormField>
          <FormField label="Short Description" className="atonement-field--full">
            <input type="text" value={draft.shortDescription} onChange={(e) => updateDraft('shortDescription', e.target.value)} placeholder="Brief description" />
          </FormField>
          <FormField label="Detailed Instructions" className="atonement-field--full">
            <textarea value={draft.detailedInstructions} onChange={(e) => updateDraft('detailedInstructions', e.target.value)} placeholder="Describe how this ritual should be performed..." rows={4} />
          </FormField>
          <FormField label="Duration">
            <input type="text" value={draft.duration} onChange={(e) => updateDraft('duration', e.target.value)} placeholder="e.g. 9 days" />
          </FormField>
          <FormField label="Frequency">
            <select value={draft.frequency} onChange={(e) => updateDraft('frequency', e.target.value)}>
              <option value="">Select</option>
              <option value="One Time">One Time</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Custom">Custom</option>
            </select>
          </FormField>
          <FormField label="Preferred Time">
            <select value={draft.preferredTime} onChange={(e) => updateDraft('preferredTime', e.target.value)}>
              <option value="">Select</option>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
              <option value="Custom">Custom</option>
            </select>
          </FormField>
        </div>

        <div className="atonement-custom-section">
          <div className="atonement-custom-section-head">
            <strong>Required Materials</strong>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => updateDraft('materials', [...draft.materials, createBlankCustomMaterial()])}><Plus size={13} /> Add Material</button>
          </div>
          <div className="atonement-custom-list">
            {draft.materials.map((material, index) => (
              <div className="atonement-custom-material-row" key={index}>
                <FormField label="Material Name">
                  <input type="text" value={material.name} onChange={(e) => updateMaterial(index, { ...material, name: e.target.value })} placeholder="Sesame Oil" />
                </FormField>
                <FormField label="Quantity">
                  <input type="text" value={material.quantity} onChange={(e) => updateMaterial(index, { ...material, quantity: e.target.value })} placeholder="250" />
                </FormField>
                <FormField label="Unit">
                  <input type="text" value={material.unit} onChange={(e) => updateMaterial(index, { ...material, unit: e.target.value })} placeholder="ml" />
                </FormField>
                <FormField label="Type">
                  <select value={material.required} onChange={(e) => updateMaterial(index, { ...material, required: e.target.value })}>
                    <option value="required">Required</option>
                    <option value="optional">Optional</option>
                  </select>
                </FormField>
                <FormField label="Instructions" className="atonement-custom-material-instructions">
                  <input type="text" value={material.instructions} onChange={(e) => updateMaterial(index, { ...material, instructions: e.target.value })} placeholder="Any material-specific note" />
                </FormField>
                <button type="button" className="atonement-remove-material" onClick={() => updateDraft('materials', draft.materials.filter((_, i) => i !== index))} aria-label="Remove material"><Trash2 size={14} /></button>
              </div>
            ))}
            {!draft.materials.length && <div className="atonement-empty-msg">No materials added yet.</div>}
          </div>
        </div>

        <div className="atonement-custom-section">
          <div className="atonement-custom-section-head">
            <strong>Additional Ritual Details</strong>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => updateDraft('additionalDetails', [...draft.additionalDetails, createBlankCustomDetail()])}><Plus size={13} /> Add Detail</button>
          </div>
          <div className="atonement-custom-list">
            {draft.additionalDetails.map((detail, index) => (
              <div className="atonement-custom-detail-row" key={index}>
                <FormField label="Field / Detail">
                  <input type="text" value={detail.label} onChange={(e) => updateDetail(index, { ...detail, label: e.target.value })} placeholder="e.g. Number of lamps" />
                </FormField>
                <FormField label="Value">
                  <input type="text" value={detail.value} onChange={(e) => updateDetail(index, { ...detail, value: e.target.value })} placeholder="e.g. 9" />
                </FormField>
                <button type="button" className="atonement-remove-material" onClick={() => updateDraft('additionalDetails', draft.additionalDetails.filter((_, i) => i !== index))} aria-label="Remove detail"><Trash2 size={14} /></button>
              </div>
            ))}
            {!draft.additionalDetails.length && <div className="atonement-empty-msg">Add only the details relevant to this ritual.</div>}
          </div>
        </div>

        <div className="atonement-custom-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={onSubmit}>{isEditing ? 'Update Ritual' : 'Add Ritual'}</button>
        </div>
      </div>
    </div>
  )
}

function CreateTab({
  form,
  setForm,
  categories,
  onAddCategory,
  onSaveDraft,
  onPublish,
  saving,
  publishing,
  errors,
  isSavedMethod = false,
}) {
  const [ritualPickerOpen, setRitualPickerOpen] = useState(false)
  const [customRitualOpen, setCustomRitualOpen] = useState(false)
  const [customRitualDraft, setCustomRitualDraft] = useState(() => createBlankCustomRitualDraft())
  const [customRitualEditIndex, setCustomRitualEditIndex] = useState(null)
  const [customRitualError, setCustomRitualError] = useState('')
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [categoryDraft, setCategoryDraft] = useState({ name: '', description: '' })
  const [categoryError, setCategoryError] = useState('')

  const update = useCallback((path, value) => {
    setForm((prev) => {
      const next = { ...prev }
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] }
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
      return next
    })
  }, [setForm])

  const addRitual = useCallback((ritualType) => {
    if (ritualType.id === 'custom') {
      setCustomRitualDraft(createBlankCustomRitualDraft())
      setCustomRitualEditIndex(null)
      setCustomRitualError('')
      setRitualPickerOpen(false)
      setCustomRitualOpen(true)
      return
    }
    setForm((prev) => {
      const duplicateCount = prev.rituals.filter((ritual) => ritual.id === ritualType.id).length
      return {
        ...prev,
        rituals: [...prev.rituals, createRitualFromType(ritualType, duplicateCount)],
      }
    })
    setRitualPickerOpen(false)
  }, [setForm])

  const openCustomRitualCreator = useCallback(() => {
    setCustomRitualDraft(createBlankCustomRitualDraft())
    setCustomRitualEditIndex(null)
    setCustomRitualError('')
    setRitualPickerOpen(false)
    setCustomRitualOpen(true)
  }, [])

  const openCustomRitualEditor = useCallback((index) => {
    const ritual = form.rituals[index]
    setCustomRitualDraft(customDraftFromRitual(ritual))
    setCustomRitualEditIndex(index)
    setCustomRitualError('')
    setCustomRitualOpen(true)
  }, [form.rituals])

  const closeCustomRitualModal = useCallback(() => {
    setCustomRitualOpen(false)
    setCustomRitualEditIndex(null)
    setCustomRitualDraft(createBlankCustomRitualDraft())
    setCustomRitualError('')
  }, [])

  const submitCustomRitual = useCallback(() => {
    if (!customRitualDraft.ritualName.trim()) {
      setCustomRitualError('Ritual name is required.')
      return
    }
    setForm((prev) => {
      const rituals = [...prev.rituals]
      const existing = customRitualEditIndex === null ? null : rituals[customRitualEditIndex]
      const ritual = createCustomRitualFromDraft(customRitualDraft, existing)
      if (customRitualEditIndex === null) rituals.push(ritual)
      else rituals[customRitualEditIndex] = ritual
      return { ...prev, rituals }
    })
    closeCustomRitualModal()
  }, [closeCustomRitualModal, customRitualDraft, customRitualEditIndex, setForm])

  const updateRitual = useCallback((index, value) => {
    setForm((prev) => {
      const rituals = [...prev.rituals]
      rituals[index] = value
      return { ...prev, rituals }
    })
  }, [setForm])

  const removeRitual = useCallback((index) => {
    setForm((prev) => ({ ...prev, rituals: prev.rituals.filter((_, i) => i !== index) }))
  }, [setForm])

  const moveRitual = useCallback((index, direction) => {
    setForm((prev) => {
      const arr = [...prev.rituals]
      const target = index + direction
      if (target < 0 || target >= arr.length) return prev
      ;[arr[index], arr[target]] = [arr[target], arr[index]]
      return { ...prev, rituals: arr }
    })
  }, [setForm])

  const addStep = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      steps: [...prev.steps, { step: prev.steps.length + 1, name: '', description: '' }],
    }))
  }, [setForm])

  const updateStep = useCallback((index, value) => {
    setForm((prev) => {
      const steps = [...prev.steps]
      steps[index] = value
      return { ...prev, steps }
    })
  }, [setForm])

  const removeStep = useCallback((index) => {
    setForm((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }))
  }, [setForm])

  const moveStep = useCallback((index, direction) => {
    setForm((prev) => {
      const arr = [...prev.steps]
      const target = index + direction
      if (target < 0 || target >= arr.length) return prev
      ;[arr[index], arr[target]] = [arr[target], arr[index]]
      return { ...prev, steps: arr }
    })
  }, [setForm])

  const addMaterial = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      materials: [...prev.materials, { name: '', quantity: '', unit: '', required: 'required', purpose: '' }],
    }))
  }, [setForm])

  const updateMaterial = useCallback((index, value) => {
    setForm((prev) => {
      const materials = [...prev.materials]
      materials[index] = value
      return { ...prev, materials }
    })
  }, [setForm])

  const removeMaterial = useCallback((index) => {
    setForm((prev) => ({ ...prev, materials: prev.materials.filter((_, i) => i !== index) }))
  }, [setForm])

  const toggleCustomerField = useCallback((fieldId) => {
    setForm((prev) => {
      const exists = prev.customerFields.includes(fieldId)
      return { ...prev, customerFields: exists ? prev.customerFields.filter((f) => f !== fieldId) : [...prev.customerFields, fieldId] }
    })
  }, [setForm])

  const toggleProof = useCallback((proofId) => {
    setForm((prev) => {
      const current = prev.proof[proofId]
      const next = { ...prev.proof }
      if (!current) {
        next[proofId] = 'required'
      } else if (current === 'required') {
        next[proofId] = 'optional'
      } else {
        delete next[proofId]
      }
      return { ...prev, proof: next }
    })
  }, [setForm])

  const usedRitualIds = useMemo(() => new Set(form.rituals.map((r) => r.id)), [form.rituals])

  const submitCategory = useCallback(() => {
    const name = categoryDraft.name.trim()
    const description = categoryDraft.description.trim()
    if (!name) {
      setCategoryError('Enter a category name.')
      return
    }
    const result = onAddCategory({ name, description })
    if (!result.ok) {
      setCategoryError(result.message)
      return
    }
    update('category', name)
    setCategoryDraft({ name: '', description: '' })
    setCategoryError('')
    setCategoryFormOpen(false)
  }, [categoryDraft, onAddCategory, update])

  const handleCategoryChange = (event) => {
    const value = event.target.value
    if (value === ADD_CATEGORY_VALUE) {
      setCategoryFormOpen(true)
      return
    }
    update('category', value)
  }

  return (
    <div className="atonement-create">
      <AtonementSection title="Basic Information" number="1" icon={Info}>
        <div className="atonement-form-grid">
          <FormField label="Atonement Name">
            <input className={errors.name ? 'atonement-input-error' : ''} type="text" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Rahu Dosha Pariharam" />
            {errors.name && <span className="atonement-field-error">{errors.name}</span>}
          </FormField>
          <FormField label="Category">
            <select className={errors.category ? 'atonement-input-error' : ''} value={form.category} onChange={handleCategoryChange}>
              <option value="">Select Category</option>
              {categories.map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}
              <option value={ADD_CATEGORY_VALUE}>+ Add New Category</option>
            </select>
            {errors.category && <span className="atonement-field-error">{errors.category}</span>}
            {categoryFormOpen && (
              <div className="atonement-inline-panel">
                <FormField label="Category Name">
                  <input type="text" value={categoryDraft.name} onChange={(e) => { setCategoryDraft((prev) => ({ ...prev, name: e.target.value })); setCategoryError('') }} placeholder="e.g. Health Remedies" />
                </FormField>
                <FormField label="Optional Description">
                  <textarea value={categoryDraft.description} onChange={(e) => setCategoryDraft((prev) => ({ ...prev, description: e.target.value }))} rows={2} placeholder="Short internal note for this category" />
                </FormField>
                {categoryError && <span className="atonement-field-error">{categoryError}</span>}
                <div className="atonement-inline-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCategoryFormOpen(false); setCategoryError(''); setCategoryDraft({ name: '', description: '' }) }}>Cancel</button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={submitCategory}>Add Category</button>
                </div>
              </div>
            )}
          </FormField>
          <FormField label="Purpose / Concern">
            <input className={errors.purpose ? 'atonement-input-error' : ''} type="text" value={form.purpose} onChange={(e) => update('purpose', e.target.value)} placeholder="e.g. Neutralize the adverse effects of Rahu" />
            {errors.purpose && <span className="atonement-field-error">{errors.purpose}</span>}
          </FormField>
          <FormField label="Short Description">
            <input type="text" value={form.shortDescription} onChange={(e) => update('shortDescription', e.target.value)} placeholder="Brief description of this atonement" />
          </FormField>
          <FormField label="Detailed Description" className="atonement-field--full">
            <textarea value={form.detailedDescription} onChange={(e) => update('detailedDescription', e.target.value)} placeholder="Provide a comprehensive description of this atonement service..." rows={4} />
          </FormField>
        </div>
      </AtonementSection>

      <AtonementSection title={`Atonement Type (${form.rituals.length} ${form.rituals.length === 1 ? 'Component' : 'Components'})`} number="2" icon={Flame} defaultOpen={false} forceOpen={Boolean(errors.rituals)}>
        <p className="atonement-section-desc">Add ritual components for this atonement.</p>
        <div className="atonement-rituals-list">
          {form.rituals.map((ritual, i) => (
            <RitualRow
              key={ritual.instanceId || `${ritual.id}-${i}`}
              ritual={ritual}
              onUpdate={(val) => updateRitual(i, val)}
              onRemove={() => removeRitual(i)}
              onMoveUp={() => moveRitual(i, -1)}
              onMoveDown={() => moveRitual(i, 1)}
              onEditCustom={() => openCustomRitualEditor(i)}
              isFirst={i === 0}
              isLast={i === form.rituals.length - 1}
            />
          ))}
        </div>
        {errors.rituals && <span className="atonement-field-error">{errors.rituals}</span>}
        <div className="atonement-add-ritual-wrap">
          <button type="button" className="btn btn-outline atonement-add-btn" onClick={() => setRitualPickerOpen(!ritualPickerOpen)}>
            <Plus size={15} /> Add Ritual / Add Component
          </button>
        </div>
      </AtonementSection>

      <AtonementSection title="Step-by-Step Procedure" number="3" icon={ListChecks} defaultOpen={false}>
        <p className="atonement-section-desc">Add, reorder and configure the ritual procedure steps.</p>
        <div className="atonement-steps-list">
          {form.steps.map((step, i) => (
            <StepItem
              key={i}
              step={step}
              index={i}
              onUpdate={(val) => updateStep(i, val)}
              onRemove={() => removeStep(i)}
              onMoveUp={() => moveStep(i, -1)}
              onMoveDown={() => moveStep(i, 1)}
              isFirst={i === 0}
              isLast={i === form.steps.length - 1}
            />
          ))}
        </div>
        <button type="button" className="btn btn-outline atonement-add-btn" onClick={addStep}>
          <Plus size={15} /> Add Step
        </button>
      </AtonementSection>

      <AtonementSection title="Materials / Offerings" number="4" icon={Flower2} defaultOpen={false}>
        <div className="atonement-materials-list">
          {form.materials.map((mat, i) => (
            <MaterialRow key={i} material={mat} onUpdate={(val) => updateMaterial(i, val)} onRemove={() => removeMaterial(i)} />
          ))}
        </div>
        <button type="button" className="btn btn-outline atonement-add-btn" onClick={addMaterial}>
          <Plus size={15} /> Add Material
        </button>
      </AtonementSection>

      <AtonementSection title="Customer Information Required" number="5" icon={Users} defaultOpen={false}>
        <div className="atonement-checkbox-grid">
          {CUSTOMER_FIELDS.map((field) => (
            <label key={field.id} className={`atonement-checkbox${form.customerFields.includes(field.id) ? ' checked' : ''}`}>
              <input type="checkbox" checked={form.customerFields.includes(field.id)} onChange={() => toggleCustomerField(field.id)} />
              <span className="atonement-checkbox-mark">{form.customerFields.includes(field.id) && <Check size={12} />}</span>
              <span>{field.label}</span>
            </label>
          ))}
        </div>
      </AtonementSection>

      <AtonementSection title="Ritual Proof" number="6" icon={ShieldCheck} defaultOpen={false}>
        <div className="atonement-proof-grid">
          {PROOF_TYPES.map((proof) => {
            const status = form.proof[proof.id]
            const Icon = proof.icon
            return (
              <button key={proof.id} type="button" className={`atonement-proof-card${status ? ' active' : ''}${status === 'required' ? ' required' : ''}`} onClick={() => toggleProof(proof.id)}>
                <Icon size={20} />
                <span className="atonement-proof-label">{proof.label}</span>
                <span className="atonement-proof-status">
                  {!status && 'Off'}
                  {status === 'required' && 'Required'}
                  {status === 'optional' && 'Optional'}
                </span>
              </button>
            )
          })}
        </div>
      </AtonementSection>

      <AtonementSection title="Availability" number="7" icon={CalendarDays} defaultOpen={false}>
        <div className="atonement-form-grid">
          <FormField label="Status">
            <div className="atonement-toggle-row">
              <span className={`atonement-toggle${form.availability.active ? ' on' : ''}`} onClick={() => update('availability.active', !form.availability.active)}>
                <span className="atonement-toggle-knob" />
              </span>
              <span>{form.availability.active ? 'Active' : 'Inactive'}</span>
            </div>
          </FormField>
          <FormField label="Start Date">
            <input type="date" value={form.availability.startDate} onChange={(e) => update('availability.startDate', e.target.value)} />
          </FormField>
          <FormField label="End Date">
            <input type="date" value={form.availability.endDate} onChange={(e) => update('availability.endDate', e.target.value)} />
          </FormField>
          <FormField label="Maximum Orders">
            <input type="number" value={form.availability.maxOrders} onChange={(e) => update('availability.maxOrders', e.target.value)} placeholder="e.g. 100" />
          </FormField>
          <FormField label="Daily Order Limit">
            <input type="number" value={form.availability.dailyLimit} onChange={(e) => update('availability.dailyLimit', e.target.value)} placeholder="e.g. 10" />
          </FormField>
          <FormField label="Advance Booking Required">
            <div className="atonement-toggle-row">
              <span className={`atonement-toggle${form.availability.advanceRequired ? ' on' : ''}`} onClick={() => update('availability.advanceRequired', !form.availability.advanceRequired)}>
                <span className="atonement-toggle-knob" />
              </span>
              <span>{form.availability.advanceRequired ? 'Yes' : 'No'}</span>
            </div>
          </FormField>
          <FormField label="Same-day Booking">
            <div className="atonement-toggle-row">
              <span className={`atonement-toggle${form.availability.sameDay ? ' on' : ''}`} onClick={() => update('availability.sameDay', !form.availability.sameDay)}>
                <span className="atonement-toggle-knob" />
              </span>
              <span>{form.availability.sameDay ? 'Enabled' : 'Disabled'}</span>
            </div>
          </FormField>
        </div>
      </AtonementSection>

      <AtonementSection title="Customer Instructions" number="8" icon={ClipboardList} defaultOpen={false}>
        <div className="atonement-form-grid">
          <FormField label="Before Ritual" className="atonement-field--full">
            <textarea value={form.instructions.before} onChange={(e) => update('instructions.before', e.target.value)} placeholder="Instructions for the customer before the ritual begins..." rows={3} />
          </FormField>
          <FormField label="During Ritual" className="atonement-field--full">
            <textarea value={form.instructions.during} onChange={(e) => update('instructions.during', e.target.value)} placeholder="Instructions for the customer during the ritual..." rows={3} />
          </FormField>
          <FormField label="After Ritual" className="atonement-field--full">
            <textarea value={form.instructions.after} onChange={(e) => update('instructions.after', e.target.value)} placeholder="Instructions for the customer after the ritual is completed..." rows={3} />
          </FormField>
        </div>
      </AtonementSection>

      <div className="atonement-form-actions">
        <button type="button" className="btn btn-ghost" onClick={onSaveDraft} disabled={saving}>
          {saving ? 'Saving...' : isSavedMethod ? 'Save Changes' : 'Save Draft'}
        </button>
        <button type="button" className="btn btn-primary" onClick={onPublish} disabled={publishing}>
          <Flame size={15} /> {publishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>

      {ritualPickerOpen && (
        <div className="atonement-modal-backdrop" role="dialog" aria-modal="true" aria-label="Select ritual component" onClick={() => setRitualPickerOpen(false)}>
          <div className="atonement-ritual-picker-modal" onClick={(event) => event.stopPropagation()}>
            <div className="atonement-ritual-picker-modal-header">
              <div>
                <h3>Select Ritual Component</h3>
                <p>Add one or more components to this atonement.</p>
              </div>
              <button type="button" className="atonement-modal-close" onClick={() => setRitualPickerOpen(false)} aria-label="Close component selector"><X size={16} /></button>
            </div>
            <div className="atonement-ritual-picker-grid">
              {RITUAL_TYPES.map((ritual) => (
                <button key={ritual.id} type="button" className={`atonement-ritual-option${usedRitualIds.has(ritual.id) ? ' already-added' : ''}`} onClick={() => addRitual(ritual)}>
                  <span className="atonement-ritual-option-icon">{ritual.icon}</span>
                  <span>{ritual.label}</span>
                  {usedRitualIds.has(ritual.id) && <small>Add again</small>}
                </button>
              ))}
            </div>
            <button type="button" className="atonement-create-custom-btn" onClick={openCustomRitualCreator}>
              <Plus size={15} /> Create Custom Ritual
            </button>
          </div>
        </div>
      )}
      {customRitualOpen && (
        <CustomRitualModal
          draft={customRitualDraft}
          setDraft={setCustomRitualDraft}
          categories={categories}
          error={customRitualError}
          isEditing={customRitualEditIndex !== null}
          onClose={closeCustomRitualModal}
          onSubmit={submitCustomRitual}
        />
      )}
    </div>
  )
}

function durationInDays(duration) {
  return Math.max(1, Number.parseInt(String(duration || '').match(/\d+/)?.[0] || '1', 10))
}

function configuredRitualFields(ritual) {
  const config = ritual.config || {}
  const fieldsByType = {
    deepam: [['Lamp Type', config.lampType], ['Number of Lamps', config.count], ['Wick Type', config.wickType], ['Lighting Method', config.lightingMethod], ['Direction', config.direction], ['Time', config.preferredTime], ['Frequency', config.frequency], ['Duration', config.duration], ['Instructions', config.instructions]],
    'mantra-japam': [['Mantra Name', config.name], ['Mantra Text', config.text], ['Repetition Count', config.repetitions], ['Time', config.preferredTime || config.timing], ['Number of Days', config.days], ['Instructions', config.instructions]],
    abhishekam: [['Deity', config.deity], ['Abhishekam Type', config.abhishekamType], ['Materials', config.materials], ['Quantity', config.quantity], ['Number of Times', config.times], ['Instructions', config.instructions]],
    archana: [['Deity', config.deity], ['Archana Type', config.archanaType], ['Offerings', config.offerings], ['Number of repetitions', config.numberOfNames], ['Instructions', config.instructions]],
  }
  const fields = fieldsByType[ritual.id] || Object.entries(config)
    .filter(([key]) => !['receiptRequired', 'gotraRequired'].includes(key))
    .map(([key, value]) => [key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()), value])
  return fields.filter(([, value]) => value !== '' && value !== undefined && value !== null)
}

function buildDayByDayProcedure(form) {
  const totalDays = durationInDays(form.templateDuration)
  const rituals = form.rituals.filter((ritual) => ritual.enabled !== false)
  const opening = rituals.filter((ritual) => ritual.id === 'sankalpam')
  const recurring = rituals.filter((ritual) => ['mantra-japam', 'deepam'].includes(ritual.id))
  const finalRituals = rituals.filter((ritual) => ['annadhanam', 'offering', 'temple-donation'].includes(ritual.id))
  const mainRituals = rituals.filter((ritual) => !opening.includes(ritual) && !recurring.includes(ritual) && !finalRituals.includes(ritual))

  return Array.from({ length: totalDays }, (_, index) => {
    const isFirst = index === 0
    const isFinal = index === totalDays - 1
    const dayRituals = [
      ...(isFirst ? opening : []),
      ...(mainRituals.length ? [mainRituals[index % mainRituals.length]] : []),
      ...recurring,
      ...(isFinal ? finalRituals : []),
    ].filter((ritual, ritualIndex, list) => list.findIndex((item) => item.instanceId === ritual.instanceId) === ritualIndex)
    return { day: index + 1, rituals: dayRituals, isFinal }
  })
}

function AtonementDetailsModal({ atonement, saved = false, added, onAddToMyMethod, onClose }) {
  const [openDay, setOpenDay] = useState(1)
  const form = useMemo(() => saved ? normalizeAtonementForm(atonement.form) : cloneAtonement(atonement), [atonement, saved])
  const days = useMemo(() => buildDayByDayProcedure(form), [form])
  const selectedDay = days.find((day) => day.day === openDay) || days[0]
  const detailName = saved ? form.name : atonement.name
  const detailPurpose = saved ? (form.purpose || form.shortDescription) : atonement.purpose
  const detailDuration = saved ? (form.templateDuration || 'Custom duration') : atonement.duration
  const detailRitualCount = form.rituals.length
  const instructions = [
    ['Before the Ritual', form.instructions.before],
    ['During the Ritual', form.instructions.during],
    ['After the Ritual', form.instructions.after],
  ].filter(([, value]) => value)

  useEffect(() => setOpenDay(1), [atonement.id])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  return createPortal(
    <div className="atonement-modal-backdrop atonement-details-backdrop" role="dialog" aria-modal="true" aria-labelledby="atonement-details-title" onClick={onClose}>
      <div className="atonement-details-modal" onClick={(event) => event.stopPropagation()}>
        <div className="atonement-details-header">
          <div>
            <span className="atonement-card-badge">{saved ? 'My Saved Method' : 'Platform Default'}</span>
            <h2 id="atonement-details-title">{detailName}</h2>
            <strong>{durationInDays(detailDuration)} Day Atonement</strong>
            <p>{detailPurpose}</p>
          </div>
          <button type="button" className="atonement-modal-close" onClick={onClose} aria-label="Close details"><X size={16} /></button>
        </div>
        <div className="atonement-details-body">
          <div className="atonement-details-summary">
            <span><Clock size={15} /> {detailDuration}</span><i>•</i><span><Tag size={15} /> {detailRitualCount} Rituals</span>
          </div>
          <section className="atonement-detail-section atonement-ritual-summary-strip">
            <h3>Rituals Included</h3>
            <div>{form.rituals.map((ritual) => <span key={ritual.instanceId}>{ritual.name}</span>)}</div>
          </section>
          <section className="atonement-detail-section atonement-procedure-section">
            <div className="atonement-procedure-heading"><div><h3>Day-by-Day Procedure</h3><p>Open a day to review the exact ritual plan and instructions.</p></div></div>
            <nav className="atonement-day-nav" aria-label="Day navigation">
              {days.map((day) => <button key={day.day} type="button" className={openDay === day.day ? 'active' : ''} onClick={() => setOpenDay(day.day)}>Day {day.day}</button>)}
            </nav>
            <div className="atonement-day-accordion">
              <div className="atonement-day-item open">
                <div className="atonement-day-trigger">
                  <span><b>Day {selectedDay.day}</b>{selectedDay.isFinal && <em>Final day</em>}</span>
                  <span className="atonement-day-ritual-summary">{selectedDay.rituals.map((ritual) => ritual.name).join('  •  ') || 'Completion'}</span>
                  <small>{selectedDay.rituals.length} Ritual{selectedDay.rituals.length === 1 ? '' : 's'}</small>
                </div>
                <div className="atonement-day-content">
                  {selectedDay.rituals.map((ritual) => (
                    <article key={ritual.instanceId} className="atonement-procedure-ritual">
                      <h4><span>{ritual.icon || '○'}</span>{ritual.name}</h4>
                      {configuredRitualFields(ritual).length ? (
                        <dl>{configuredRitualFields(ritual).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>)}</dl>
                      ) : <p>Perform this ritual according to the prescribed procedure for this atonement.</p>}
                    </article>
                  ))}
                  {selectedDay.isFinal && <div className="atonement-procedure-completion"><Check size={15} /> Complete the ritual and prepare the selected proof for the customer.</div>}
                </div>
              </div>
            </div>
          </section>
          <section className="atonement-detail-section">
            <h3>Materials Required</h3>
            <ul className="atonement-materials-required">
              {form.materials.map((material) => <li key={`${material.name}-${material.quantity}`}><Check size={14} /><span>{material.name}</span><small>{[material.quantity, material.unit].filter(Boolean).join(' ')}</small></li>)}
            </ul>
          </section>
          {instructions.length > 0 && <section className="atonement-detail-section atonement-customer-instructions">
            <h3>Customer Instructions</h3>
            <div>{instructions.map(([label, value]) => <article key={label}><strong>{label}</strong><p>{value}</p></article>)}</div>
          </section>}
        </div>
        <div className="atonement-details-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
          {!saved && <button type="button" className="btn btn-primary" onClick={() => onAddToMyMethod(atonement)}>
            {added ? <Check size={15} /> : <Copy size={15} />} {added ? 'Added to My Method' : 'Add to My Method'}
          </button>}
          {saved && <span className="atonement-saved-detail-state"><Check size={15} /> Saved in My Method</span>}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ChooseTab({ onAddToMyMethod, onEditPlatformDefault, onRemoveSavedMethod, onCreateManually, savedAtonements, initialView = 'platform' }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [viewMode, setViewMode] = useState(initialView)
  const [detailsTarget, setDetailsTarget] = useState(null)
  const [savedDetailsTarget, setSavedDetailsTarget] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)

  const filteredAtonements = useMemo(() => {
    let list = DEFAULT_ATONEMENTS
    if (activeCategory !== 'All') {
      list = list.filter((a) => a.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.purpose.toLowerCase().includes(q))
    }
    return list
  }, [search, activeCategory])

  return (
    <div className="atonement-choose">
      <div className="atonement-choose-source-tabs">
        <button type="button" className={`atonement-source-tab${viewMode === 'platform' ? ' active' : ''}`} onClick={() => setViewMode('platform')}>
          <Sparkles size={15} /> Platform Default
        </button>
        <button type="button" className={`atonement-source-tab${viewMode === 'saved' ? ' active' : ''}`} onClick={() => setViewMode('saved')}>
          <Star size={15} /> My Saved Method
        </button>
        <button type="button" className={`atonement-source-tab${viewMode === 'create' ? ' active' : ''}`} onClick={onCreateManually}>
          <Plus size={15} /> Create Manually
        </button>
      </div>

      {viewMode === 'saved' && (
        savedAtonements.length ? (
          <div className="atonement-cards-grid">
            {savedAtonements.map((atonement) => (
              <div key={atonement.id} className="atonement-card">
                <div className="atonement-card-header">
                  <span className="atonement-card-badge">My Saved Method</span>
                  <span className="atonement-card-category">{atonement.form.category || 'Uncategorized'}</span>
                </div>
                <h3 className="atonement-card-name">{atonement.form.name || 'Untitled Atonement'}</h3>
                <p className="atonement-card-purpose">{atonement.form.purpose || atonement.form.shortDescription || 'No purpose added.'}</p>
                <div className="atonement-card-meta">
                  <span><Clock size={13} /> {atonement.form.templateDuration || 'Custom duration'}</span>
                  <span><Tag size={13} /> {atonement.form.rituals.length} rituals</span>
                </div>
                <div className="atonement-card-rituals">
                  {atonement.form.rituals.slice(0, 3).map((ritual) => (
                    <span key={ritual.instanceId} className="atonement-card-ritual-tag">{ritual.name}</span>
                  ))}
                  {atonement.form.rituals.length > 3 && <span className="atonement-card-ritual-tag atonement-card-ritual-tag--more">+{atonement.form.rituals.length - 3} more</span>}
                </div>
                {atonement.createdAt && <div className="atonement-card-created">Created {new Date(atonement.createdAt).toLocaleDateString('en-IN')}</div>}
                <div className="atonement-card-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setSavedDetailsTarget(atonement)}>
                    <Eye size={14} /> View
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm atonement-remove-btn" onClick={() => setRemoveTarget(atonement)}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="atonement-saved-empty">
            <Star size={32} />
            <h3>No Saved Methods Yet</h3>
            <p>Atonements you add from Platform Default will appear here.</p>
          </div>
        )
      )}

      {viewMode === 'platform' && (
        <>
          <div className="atonement-search-bar">
            <Search size={16} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search atonements..." />
          </div>
          <div className="atonement-category-filter">
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" className={`atonement-cat-btn${activeCategory === cat ? ' active' : ''}`} onClick={() => setActiveCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
          <div className="atonement-cards-grid">
            {filteredAtonements.map((atonement) => (
              <div key={atonement.id} className="atonement-card">
                <div className="atonement-card-header">
                  <span className="atonement-card-badge">{atonement.badge}</span>
                  <span className="atonement-card-category">{atonement.category}</span>
                </div>
                <h3 className="atonement-card-name">{atonement.name}</h3>
                <p className="atonement-card-purpose">{atonement.purpose}</p>
                <div className="atonement-card-meta">
                  <span><Clock size={13} /> {atonement.duration}</span>
                  <span><Tag size={13} /> {atonement.rituals.length} rituals</span>
                </div>
                <div className="atonement-card-rituals">
                  {atonement.rituals.slice(0, 3).map((r) => (
                    <span key={r} className="atonement-card-ritual-tag">{r}</span>
                  ))}
                  {atonement.rituals.length > 3 && (
                    <span className="atonement-card-ritual-tag atonement-card-ritual-tag--more">+{atonement.rituals.length - 3} more</span>
                  )}
                </div>
                <div className="atonement-card-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetailsTarget(atonement)}>
                    <Eye size={14} /> View Details
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => onEditPlatformDefault(atonement)}>
                    <Edit3 size={14} /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {detailsTarget && <AtonementDetailsModal
        atonement={detailsTarget}
        added={savedAtonements.some((saved) => saved.sourceDefaultId === detailsTarget.id)}
        onAddToMyMethod={onAddToMyMethod}
        onClose={() => setDetailsTarget(null)}
      />}
      {savedDetailsTarget && <AtonementDetailsModal
        atonement={savedDetailsTarget}
        saved
        added
        onClose={() => setSavedDetailsTarget(null)}
      />}
      {removeTarget && (
        <div className="atonement-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="remove-saved-method-title" onClick={() => setRemoveTarget(null)}>
          <div className="atonement-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h3 id="remove-saved-method-title">Remove this saved method?</h3>
            <p>Only your saved copy will be removed. The Platform Default atonement will remain unchanged.</p>
            <div className="atonement-confirm-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setRemoveTarget(null)}>Cancel</button>
              <button type="button" className="btn btn-primary atonement-remove-confirm" onClick={() => { onRemoveSavedMethod(removeTarget); setRemoveTarget(null) }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Atonement() {
  const { currentUser } = useAuth()
  const { success, toast } = useToast()
  const userId = currentUser?.id || 'guest'
  const categoryKey = atonementStorageKey(userId, 'categories')
  const draftKey = atonementStorageKey(userId, 'draft')
  const listKey = atonementStorageKey(userId, 'records')
  const [activeTab, setActiveTab] = useState('create')
  const [chooseView, setChooseView] = useState('platform')
  const [form, setForm] = useState(() => normalizeAtonementForm(readJSON(draftKey, createDefaultAtonement())?.form || readJSON(draftKey, createDefaultAtonement())))
  const [source, setSource] = useState('manual')
  const [customCategories, setCustomCategories] = useState(() => uniqueByName(readJSON(categoryKey, [])))
  const [atonementRecords, setAtonementRecords] = useState(() => readJSON(listKey, []))
  const savedDefaultIdsRef = useRef(new Set(atonementRecords
    .filter((record) => record.kind === 'saved-method' && record.sourceDefaultId)
    .map((record) => record.sourceDefaultId)))
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [errors, setErrors] = useState({})

  const categories = useMemo(() => uniqueByName([
    ...CATEGORIES.filter((c) => c !== 'All').map((name) => ({ name, description: '', source: 'platform' })),
    ...customCategories,
  ]), [customCategories])

  const persistRecords = useCallback((records) => {
    setAtonementRecords(records)
    writeJSON(listKey, records)
  }, [listKey])

  const upsertRecord = useCallback((status, currentForm) => {
    const normalized = normalizeAtonementForm(currentForm)
    const now = new Date().toISOString()
    const id = normalized.recordId || createId('atonement')
    const existing = atonementRecords.find((item) => item.id === id)
    const isSavedMethod = existing?.kind === 'saved-method' || Boolean(normalized.sourceDefaultId)
    const record = {
      ...existing,
      id,
      kind: isSavedMethod ? 'saved-method' : existing?.kind,
      sourceDefaultId: normalized.sourceDefaultId || existing?.sourceDefaultId,
      status: isSavedMethod ? 'My Saved Method' : status,
      form: { ...normalized, recordId: id },
      updatedAt: now,
      createdAt: existing?.createdAt || now,
      publishedAt: status === 'Published' ? now : existing?.publishedAt || normalized.publishedAt || null,
      astrologerId: userId,
    }
    const next = [record, ...atonementRecords.filter((item) => item.id !== id)]
    persistRecords(next)
    setForm(record.form)
    return record
  }, [atonementRecords, persistRecords, userId])

  const addCategory = useCallback(({ name, description }) => {
    const cleanName = name.trim()
    const exists = categories.some((category) => category.name.toLowerCase() === cleanName.toLowerCase())
    if (exists) return { ok: false, message: 'This category already exists.' }
    const next = uniqueByName([...customCategories, { name: cleanName, description: description.trim(), source: 'astrologer' }])
    setCustomCategories(next)
    writeJSON(categoryKey, next)
    success('Category added.')
    return { ok: true }
  }, [categories, categoryKey, customCategories, success])

  const validateDraft = useCallback(() => {
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Enter an atonement name to save a draft.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [form.name])

  const validatePublish = useCallback(() => {
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Atonement name is required.'
    if (!form.category.trim()) nextErrors.category = 'Select a category.'
    if (!form.purpose.trim()) nextErrors.purpose = 'Purpose / concern is required.'
    if (!form.rituals.length) nextErrors.rituals = 'Please add at least one ritual component.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [form])

  const handleSaveDraft = useCallback(() => {
    if (saving) return
    if (!validateDraft()) {
      toast('Add the required draft information.', { kind: 'error' })
      return
    }
    setSaving(true)
    try {
      const record = upsertRecord('Draft', form)
      writeJSON(draftKey, { id: record.id, form: record.form, updatedAt: record.updatedAt })
      success(form.sourceDefaultId ? 'Saved method updated.' : 'Atonement saved as draft.')
    } catch {
      toast('Unable to save draft.', { kind: 'error' })
    } finally {
      setSaving(false)
    }
  }, [draftKey, form, saving, success, toast, upsertRecord, validateDraft])

  const handlePublish = useCallback(() => {
    if (publishing) return
    if (!validatePublish()) {
      toast('Complete the required fields before publishing.', { kind: 'error' })
      return
    }
    setPublishing(true)
    try {
      const record = upsertRecord('Published', form)
      writeJSON(draftKey, { id: record.id, form: record.form, updatedAt: record.updatedAt })
      success('Atonement published successfully.')
      setChooseView('saved')
      setActiveTab('choose')
    } catch {
      toast('Unable to publish atonement.', { kind: 'error' })
    } finally {
      setPublishing(false)
    }
  }, [draftKey, form, publishing, success, toast, upsertRecord, validatePublish])

  const handleAddToMyMethod = useCallback((atonement) => {
    const exists = savedDefaultIdsRef.current.has(atonement.id) || atonementRecords.some((record) => record.kind === 'saved-method' && record.sourceDefaultId === atonement.id)
    if (exists) {
      toast('This atonement is already in My Saved Method.', { kind: 'error' })
      return
    }
    // Mark before updating React state so an accidental double-click cannot create two copies.
    savedDefaultIdsRef.current.add(atonement.id)
    try {
      const now = new Date().toISOString()
      const id = createId('atonement')
      const copiedForm = normalizeAtonementForm({ ...cloneAtonement(atonement), recordId: id })
      persistRecords([{
        id,
        kind: 'saved-method',
        sourceDefaultId: atonement.id,
        status: 'My Saved Method',
        form: { ...copiedForm, recordId: id },
        createdAt: now,
        updatedAt: now,
        astrologerId: userId,
      }, ...atonementRecords])
      success('Atonement added to My Saved Method.')
    } catch {
      savedDefaultIdsRef.current.delete(atonement.id)
      toast('Unable to add this atonement.', { kind: 'error' })
    }
  }, [atonementRecords, persistRecords, success, toast, userId])

  const handleEditSavedMethod = useCallback((record) => {
    setForm(normalizeAtonementForm(record.form))
    setSource('saved-method')
    setErrors({})
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [setForm])

  const handleEditPlatformDefault = useCallback((atonement) => {
    const savedCopy = atonementRecords.find((record) => record.kind === 'saved-method' && record.sourceDefaultId === atonement.id)
    if (savedCopy) {
      handleEditSavedMethod(savedCopy)
      return
    }
    setForm(normalizeAtonementForm(cloneAtonement(atonement)))
    setSource('platform-default')
    setErrors({})
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [atonementRecords, handleEditSavedMethod])

  const handleRemoveSavedMethod = useCallback((record) => {
    if (record.sourceDefaultId) savedDefaultIdsRef.current.delete(record.sourceDefaultId)
    persistRecords(atonementRecords.filter((item) => item.id !== record.id))
    success('Saved method removed.')
  }, [atonementRecords, persistRecords, success])

  const handleCreateManually = useCallback(() => {
    setForm(createDefaultAtonement())
    setSource('manual')
    setErrors({})
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [setForm])

  return (
    <div className="atonement-page">
      <PageHeader
        title="Atonement"
        subtitle="Create and manage atonement services"
        actions={null}
      />
      {source === 'platform-default' && (
        <div className="atonement-source-banner">
          <Sparkles size={15} />
          <span>Cloned from a <strong>platform default</strong> atonement — customize every field below, then Save Draft or Publish.</span>
          <button type="button" onClick={() => setActiveTab('choose')}>Choose different ›</button>
        </div>
      )}
      <div className="atonement-tabs">
        <button type="button" className={`atonement-tab${activeTab === 'create' ? ' active' : ''}`} onClick={() => setActiveTab('create')}>
          <Flame size={16} /> Create
        </button>
        <button type="button" className={`atonement-tab${activeTab === 'choose' ? ' active' : ''}`} onClick={() => { setChooseView('platform'); setActiveTab('choose') }}>
          <Sparkles size={16} /> Choose
        </button>
      </div>
      <div className="atonement-tab-content">
        {activeTab === 'create'
          ? (
            <CreateTab
              form={form}
              setForm={setForm}
              categories={categories}
              onAddCategory={addCategory}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
              saving={saving}
              publishing={publishing}
              errors={errors}
            />
          )
          : <ChooseTab
              key={chooseView}
              onAddToMyMethod={handleAddToMyMethod}
              onEditPlatformDefault={handleEditPlatformDefault}
              onRemoveSavedMethod={handleRemoveSavedMethod}
              onCreateManually={handleCreateManually}
              savedAtonements={atonementRecords.filter((record) => record.kind === 'saved-method')}
              initialView={chooseView}
            />}
      </div>
    </div>
  )
}
