import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Eye,
  FileText,
  Gift,
  Grid,
  History,
  LineChart,
  MessageCircle,
  MessageSquare,
  Mic,
  Orbit,
  PhoneCall,
  PieChart,
  Play,
  Send,
  Sparkles,
  Tag,
  Trash2,
  Users,
  Wallet,
  Wand2,
  X,
} from 'lucide-react'
import './benefitManagementLanding.css'

const RASIS = [
  {
    id: 'aries',
    name: 'Aries',
    ta: 'மேஷம்',
    symbol: '♈',
    emoji: '🐏',
    starsDisplay: 'Ashwini, Parani, Krittika (அஸ்வினி, பரணி, கிருத்திகை)',
  },
  {
    id: 'taurus',
    name: 'Taurus',
    ta: 'ரிஷபம்',
    symbol: '♉',
    emoji: '🐂',
    starsDisplay: 'Krittika, Rohini, Mrigashira (கிருத்திகை, ரோகிணி, மிருகசீரிஷம்)',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    ta: 'மிதுனம்',
    symbol: '♊',
    emoji: '👥',
    starsDisplay: 'Mrigashira, Thiruvathirai, Punarvasu (மிருகசீரிஷம், திருவாதிரை, புனர்பூசம்)',
  },
  {
    id: 'cancer',
    name: 'Cancer',
    ta: 'கடகம்',
    symbol: '♋',
    emoji: '🦀',
    starsDisplay: 'Punarvasu, Pushya, Ashlesha (புனர்பூசம், பூசம், ஆயில்யம்)',
  },
  {
    id: 'leo',
    name: 'Leo',
    ta: 'சிம்மம்',
    symbol: '♌',
    emoji: '🦁',
    starsDisplay: 'Makam, Pooram, Uthiram (மகம், பூரம், உத்திரம்)',
  },
  {
    id: 'virgo',
    name: 'Virgo',
    ta: 'கன்னி',
    symbol: '♍',
    emoji: '👧',
    starsDisplay: 'Uthiram, Hastham, Chithirai (உத்திரம், அஸ்தம், சித்திரை)',
  },
  {
    id: 'libra',
    name: 'Libra',
    ta: 'துலாம்',
    symbol: '♎',
    emoji: '⚖️',
    starsDisplay: 'Chithirai, Swati, Visakam (சித்திரை, சுவாதி, விசாகம்)',
  },
  {
    id: 'scorpio',
    name: 'Scorpio',
    ta: 'விருச்சிகம்',
    symbol: '♏',
    emoji: '🦂',
    starsDisplay: 'Visakam, Anusham, Kettai (விசாகம், அனுஷம், கேட்டை)',
  },
  {
    id: 'sagittarius',
    name: 'Sagittarius',
    ta: 'தனுசு',
    symbol: '♐',
    emoji: '🏹',
    starsDisplay: 'Moolam, Pooradam, Uthiradam (மூலம், பூராடம், உத்திராடம்)',
  },
  {
    id: 'capricorn',
    name: 'Capricorn',
    ta: 'மகரம்',
    symbol: '♑',
    emoji: '🐐',
    starsDisplay: 'Uthiradam, Thiruvonam, Avittam (உத்திராடம், திருவோணம், அவிட்டம்)',
  },
  {
    id: 'aquarius',
    name: 'Aquarius',
    ta: 'கும்பம்',
    symbol: '♒',
    emoji: '🏺',
    starsDisplay: 'Avittam, Sadhayam, Poorattathi (அவிட்டம், சதயம், பூரட்டாதி)',
  },
  {
    id: 'pisces',
    name: 'Pisces',
    ta: 'மீனம்',
    symbol: '♓',
    emoji: '🐟',
    starsDisplay: 'Poorattathi, Uthirattathi, Revathi (பூரட்டாதி, உத்திரட்டாதி, ரேவதி)',
  },
]

const BASE_PRICES = {
  'text-q': 200, // ₹200 / question
  appt: 1500, // ₹1,500 / 30m appointment
  call: 30, // ₹30 / min (10 min avg = ₹300)
  chat: 20, // ₹20 / min (15 min avg = ₹300)
}

const ESTIMATED_VOLUMES = {
  'text-q': 120,
  appt: 40,
  call: 80,
  chat: 100,
}

const AUDIENCE_OPTIONS = [
  { value: 'All Users', shortLabel: 'All Users', label: 'All App Users' },
  { value: 'Followers', shortLabel: 'Followers', label: 'Followers Only' },
  { value: 'Subscribers', shortLabel: 'Subscribers', label: 'Paid Subscribers Only' },
  { value: 'VIPs', shortLabel: 'VIPs', label: 'VIPs & Public Figures' },
]

const INITIAL_SERVICES = [
  { id: 'text-q', name: 'Text Question', active: true, discount: 20, target: 'All Users', base: BASE_PRICES['text-q'], multiplier: 1, unit: 'Qn', icon: MessageSquare },
  { id: 'appt', name: 'Full Appointment', active: true, discount: 15, target: 'Subscribers', base: BASE_PRICES.appt, multiplier: 1, unit: '30m', icon: Calendar },
  { id: 'call', name: 'Instant Audio Call', active: true, discount: 30, target: 'VIPs', base: BASE_PRICES.call, multiplier: 10, unit: 'Min', icon: PhoneCall },
  { id: 'chat', name: 'Instant Chat', active: true, discount: 25, target: 'Followers', base: BASE_PRICES.chat, multiplier: 15, unit: 'Min', icon: MessageCircle },
]

const SAMPLE_TRANSACTIONS = [
  { id: 'tx-1', user: 'Rajesh K. (Subscriber)', tierColor: 'text-purple-600 dark:text-purple-300', service: 'Appointment (30m)', basePrice: 1500, discount: 15, paid: 1275, appCut: 255, netPayout: 1020 },
  { id: 'tx-2', user: 'Priya M. (Follower)', tierColor: 'text-emerald-600 dark:text-emerald-300', service: 'Text Question', basePrice: 200, discount: 20, paid: 160, appCut: 32, netPayout: 128 },
  { id: 'tx-3', user: 'Vikram Seth (VIP / Public)', tierColor: 'text-amber-600 dark:text-amber-300', service: 'Instant Call (10m)', basePrice: 300, discount: 30, paid: 210, appCut: 42, netPayout: 168 },
  { id: 'tx-4', user: 'Ananya D. (Subscriber)', tierColor: 'text-purple-600 dark:text-purple-300', service: 'Instant Chat (15m)', basePrice: 300, discount: 25, paid: 225, appCut: 45, netPayout: 180 },
]

export default function BenefitManagementLanding({
  benefits = [],
  onView,
  onPreview,
  onDelete,
}) {
  const [activeTab, setActiveTab] = useState('perks')
  const [services, setServices] = useState(INITIAL_SERVICES)
  const [currentRasiIndex, setCurrentRasiIndex] = useState(0)
  const [contentCategory, setContentCategory] = useState('daily')
  const [specialTransit, setSpecialTransit] = useState('Guru Peyarchi (Jupiter Transit 2026)')
  const [contentDate, setContentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [audioAttached, setAudioAttached] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState('ALL')
  const [toastMsg, setToastMsg] = useState('')

  const createInitialRasiStore = () => {
    const initial = {}
    RASIS.forEach((r) => {
      initial[r.id] = {
        text: '',
        rating: '85%',
        color: 'Yellow / Gold',
        number: '3, 9',
        remedy: 'Chant Lord Shiva stotram for peace and prosperity.',
        filled: false,
      }
    })
    return initial
  }

  // Multi-category store (Daily, Weekly, Monthly, Special Transits)
  const [categoryStore, setCategoryStore] = useState(() => ({
    daily: createInitialRasiStore(),
    weekly: createInitialRasiStore(),
    monthly: createInitialRasiStore(),
    special: createInitialRasiStore(),
  }))
  const [isPublished, setIsPublished] = useState(false)
  const [publishWarning, setPublishWarning] = useState(false)

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => {
      setToastMsg('')
    }, 3200)
  }

  // Active Category & Rasi data
  const currentCategoryStore = categoryStore[contentCategory] || {}
  const activeRasi = RASIS[currentRasiIndex]
  const currentRasiData = currentCategoryStore[activeRasi.id] || {}

  const filledRasiCount = useMemo(() => {
    const store = categoryStore[contentCategory] || {}
    return Object.values(store).filter((entry) => entry.filled).length
  }, [categoryStore, contentCategory])

  const categoryStats = useMemo(() => {
    const list = [
      { id: 'daily', label: 'Daily Horoscope' },
      { id: 'weekly', label: 'Weekly Horoscope' },
      { id: 'monthly', label: 'Monthly Horoscope' },
      { id: 'special', label: 'Special Transits & Remedies' },
    ]
    return list.map((cat) => {
      const store = categoryStore[cat.id] || {}
      const filled = Object.values(store).filter((e) => e.filled).length
      return {
        ...cat,
        filled,
        total: 12,
        isComplete: filled === 12,
      }
    })
  }, [categoryStore])

  const incompleteCategories = useMemo(() => {
    return categoryStats.filter((c) => !c.isComplete)
  }, [categoryStats])

  const isAllComplete = incompleteCategories.length === 0

  // Financial calculations
  const financials = useMemo(() => {
    let grossTotal = 0
    let discountTotal = 0
    let netPayoutTotal = 0
    let commissionTotal = 0

    const rows = services.map((s) => {
      const discPct = s.active ? s.discount : 0
      const serviceGross = s.base * s.multiplier * ESTIMATED_VOLUMES[s.id]
      const totalDiscount = serviceGross * (discPct / 100)
      const userPaid = serviceGross - totalDiscount
      const platformCut = userPaid * 0.2 // 20% commission
      const netProfit = userPaid * 0.8 // 80% astrologer payout

      grossTotal += serviceGross
      discountTotal += totalDiscount
      netPayoutTotal += netProfit
      commissionTotal += platformCut

      return {
        ...s,
        discPct,
        serviceGross,
        totalDiscount,
        userPaid,
        platformCut,
        netProfit,
      }
    })

    const avgDiscPct = grossTotal > 0 ? (discountTotal / grossTotal) * 100 : 0

    return {
      rows,
      grossTotal,
      discountTotal,
      netPayoutTotal,
      commissionTotal,
      avgDiscPct,
    }
  }, [services])

  // Service discount modification
  const handleDiscountChange = (id, newDiscount) => {
    const clamped = Math.max(0, Math.min(80, Number(newDiscount) || 0))
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, discount: clamped } : s))
    )
  }

  const handleToggleService = (id) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    )
  }

  const handleTargetChange = (id, newTarget) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, target: newTarget } : s))
    )
  }

  const resetPerks = () => {
    setServices(INITIAL_SERVICES)
    showToast('Perks restored to default levels')
  }

  const savePerks = () => {
    showToast('Perks & Service Discounts updated live on mobile app!')
  }

  // Rasi form updates
  const handleRasiFieldChange = (field, value) => {
    setCategoryStore((prev) => {
      const categoryData = prev[contentCategory] || {}
      const current = categoryData[activeRasi.id] || {}
      const updated = { ...current, [field]: value }
      if (field === 'text') {
        updated.filled = String(value).trim().length > 5
      }
      return {
        ...prev,
        [contentCategory]: {
          ...categoryData,
          [activeRasi.id]: updated,
        },
      }
    })
    setIsPublished(false)
  }

  const navigateRasi = (direction) => {
    let next = currentRasiIndex + direction
    if (next < 0) next = 11
    if (next > 11) next = 0
    setCurrentRasiIndex(next)
  }

  const autoFillSampleData = (fillAll = false) => {
    const samples = [
      'Excellent period for career growth and unexpected gains. Focus on new ventures.',
      'High energy levels. Important decisions regarding property and family will be favorable.',
      'Exercise mild caution in conversations at work. Evening brings positive news.',
      'Support from seniors and elders. Overdue financial payments will clear up today.',
      'Favorable day for travel and creative tasks. Health remains robust.',
      'Financial stability improves. Meditation and spiritual activities bring inner peace.',
    ]

    setCategoryStore((prev) => {
      const nextStore = { ...prev }
      const targets = fillAll ? ['daily', 'weekly', 'monthly', 'special'] : [contentCategory]

      targets.forEach((cat) => {
        nextStore[cat] = { ...nextStore[cat] }
        RASIS.forEach((r, idx) => {
          const sampleText = samples[idx % samples.length]
          const catTitle =
            cat === 'special'
              ? specialTransit
              : `${cat.charAt(0).toUpperCase() + cat.slice(1)} Horoscope`

          nextStore[cat][r.id] = {
            text: `[${catTitle}] For ${r.name} (${r.ta}): ${sampleText}`,
            rating: `${80 + ((idx * 2) % 20)}%`,
            color: 'Yellow / Gold',
            number: `${idx + 1}, ${idx + 5}`,
            remedy: 'Morning prayer and offering prayers to Sun God brings luck.',
            filled: true,
          }
        })
      })
      return nextStore
    })

    setIsPublished(false)
    if (fillAll) {
      showToast('🎉 All 12 Rasis populated across Daily, Weekly, Monthly & Special! Red button is now blinking!')
    } else {
      showToast(`12 Signs populated for ${contentCategory.toUpperCase()} Horoscope!`)
    }
  }

  const publishAllRasis = () => {
    if (!isAllComplete) {
      if (!publishWarning) {
        setPublishWarning(true)
      } else {
        setIsPublished(true)
        setPublishWarning(false)
        showToast('🎉 Content published live to mobile app users!')
      }
    } else {
      setIsPublished(true)
      setPublishWarning(false)
      showToast('🎉 All 12 Rasis predictions published live to app users!')
    }
  }

  return (
    <div className="benefit-landing">
      {/* Navigation Subtabs */}
      <div className="perks-engine-nav">
        <div className="perks-engine-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('perks')}
            className={`perks-engine-tab-btn ${activeTab === 'perks' ? 'is-active' : ''}`}
          >
            <Gift size={16} />
            <span>1. Perks & Offers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`perks-engine-tab-btn ${activeTab === 'analytics' ? 'is-active' : ''}`}
          >
            <LineChart size={16} />
            <span>2. Financials & Commission</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`perks-engine-tab-btn ${activeTab === 'content' ? 'is-active' : ''}`}
          >
            <FileText size={16} />
            <span>3. Horoscope & Transits Engine</span>
          </button>

          {benefits.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`perks-engine-tab-btn ${activeTab === 'history' ? 'is-active' : ''}`}
            >
              <History size={16} />
              <span>4. Saved Guidance ({benefits.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= TAB 1: PERKS & BENEFITS CONFIG ================= */}
      {activeTab === 'perks' && (
        <section className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Service Discounts */}
            <div className="lg:col-span-2">
              {/* 4 Service Cards Grid (21st.dev Inspired Model) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((svc) => {
                  const Icon = svc.icon
                  const discount = svc.active ? Number(svc.discount) || 0 : 0
                  const rawFinalPrice = svc.base * (1 - discount / 100)
                  const finalPrice = Math.round(rawFinalPrice * 100) / 100
                  const rawSaved = svc.base - finalPrice
                  const savedAmount = Math.round(rawSaved * 100) / 100

                  return (
                    <div
                      key={svc.id}
                      className={`perks-service-card space-y-4 ${
                        !svc.active ? 'is-inactive' : ''
                      }`}
                    >
                      {/* Top Row: Service Icon & Title + Active Switch */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[color:var(--bl-primary-bg)] text-[color:var(--bl-primary)] border border-[color:var(--bl-primary)]/20 flex items-center justify-center shrink-0">
                            <Icon size={19} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-[color:var(--bl-ink)] truncate">
                                {svc.name}
                              </h4>
                              {svc.active && discount > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0">
                                  {discount}% OFF
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[color:var(--bl-muted)] mt-0.5">
                              Standard Base: <span className="font-semibold text-[color:var(--bl-ink)]">₹{svc.base}</span> / {svc.unit}
                            </p>
                          </div>
                        </div>

                        {/* Minimalist Active Toggle Switch */}
                        <div className="flex items-center gap-2 shrink-0 pt-0.5">
                          <span
                            className={`text-[11px] font-semibold ${
                              svc.active
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-[color:var(--bl-muted)]'
                            }`}
                          >
                            {svc.active ? 'Active' : 'Paused'}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={svc.active}
                              onChange={() => handleToggleService(svc.id)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-stone-300 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[color:var(--bl-primary)]" />
                          </label>
                        </div>
                      </div>

                      {/* Hero Price & Savings Section (21st.dev Hero Typography) */}
                      <div className="pt-3 border-t border-[color:var(--bl-line)]/70">
                        <div className="flex items-baseline justify-between flex-wrap gap-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[color:var(--bl-ink)]">
                              ₹{svc.active ? finalPrice : svc.base}
                            </span>
                            <span className="text-xs text-[color:var(--bl-muted)] font-medium">
                              / {svc.unit}
                            </span>
                            {svc.active && discount > 0 && (
                              <span className="text-xs text-[color:var(--bl-muted)] line-through">
                                ₹{svc.base}
                              </span>
                            )}
                          </div>

                          {svc.active && discount > 0 ? (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check size={13} className="stroke-[2.5]" /> Saves ₹{savedAmount}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[color:var(--bl-muted)] font-medium">
                              {svc.active ? 'Standard Base Rate' : 'Perk Paused'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Interactive Slider Control (21st.dev Style) */}
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="0"
                          max="80"
                          step="5"
                          disabled={!svc.active}
                          value={svc.active ? svc.discount : 0}
                          onChange={(e) => handleDiscountChange(svc.id, e.target.value)}
                          className="perks-range-slider"
                        />
                        <div className="flex justify-between text-[10px] text-[color:var(--bl-muted)] font-medium px-0.5">
                          <span>0%</span>
                          <span>20%</span>
                          <span>40%</span>
                          <span>60%</span>
                          <span>80% Max</span>
                        </div>
                      </div>

                      {/* Audience Segmented Pill Bar (21st.dev Segmented Control) */}
                      <div className="pt-3 border-t border-[color:var(--bl-line)]/70">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-[color:var(--bl-muted)] flex items-center gap-1">
                            <Users size={12} /> Target Audience:
                          </span>
                          <span className="text-[10px] font-bold text-[color:var(--bl-ink)]">
                            {svc.target}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 p-1 bg-[color:var(--bl-surface-soft)] rounded-xl border border-[color:var(--bl-line)]/80">
                          {AUDIENCE_OPTIONS.map((opt) => {
                            const isSelected = svc.target === opt.value
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={!svc.active}
                                onClick={() => handleTargetChange(svc.id, opt.value)}
                                className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold transition-all truncate text-center ${
                                  isSelected
                                    ? 'bg-[color:var(--bl-primary)] text-white shadow-sm'
                                    : 'text-[color:var(--bl-muted)] hover:text-[color:var(--bl-ink)] hover:bg-[color:var(--bl-surface)]'
                                }`}
                                title={opt.label}
                              >
                                {opt.shortLabel}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Side 1 Col: Summary & Engagement */}
            <div className="flex flex-col justify-between gap-3 h-full">
              <div className="perks-engine-card perks-engine-card--active flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-[color:var(--bl-ink)] flex items-center gap-2 pb-3 border-b border-[color:var(--bl-line)]">
                    <Award size={18} className="text-[color:var(--bl-primary)]" />
                    Active Perks Live Summary
                  </h4>

                  <div className="space-y-3 pt-3">
                    {services
                      .filter((s) => s.active)
                      .map((s) => (
                        <div
                          key={s.id}
                          className="p-3 rounded-xl border border-[color:var(--bl-line)] bg-[color:var(--surface,#ffffff)] flex items-center justify-between"
                        >
                          <div>
                            <h5 className="font-bold text-xs text-[color:var(--bl-ink)]">
                              {s.name}
                            </h5>
                            <span className="text-[10px] text-[color:var(--bl-muted)]">
                              Target: {s.target}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-[color:var(--bl-primary-bg)] text-[color:var(--bl-primary)] font-bold text-xs">
                            {s.discount}% OFF
                          </span>
                        </div>
                      ))}

                    {services.filter((s) => s.active).length === 0 && (
                      <p className="text-xs text-[color:var(--bl-muted)] italic">
                        No active perks enabled.
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[color:var(--bl-line)] space-y-2 mt-auto">
                  <div className="flex justify-between text-xs">
                    <span className="text-[color:var(--bl-muted)]">Estimated Engagement:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">+38% Higher Volume</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[color:var(--bl-primary-bg)] text-xs text-[color:var(--bl-primary-dark)] leading-relaxed">
                    💡 <b>Pro Tip:</b> Offering 20%+ discounts on Text Questions drives 3.5x higher question volume from regular Followers.
                  </div>
                </div>
              </div>

              {/* Action Buttons Under the Active Perks Live Summary Box */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={resetPerks}
                  className="perks-btn-secondary perks-btn-sm flex-1"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={savePerks}
                  className="perks-btn-primary perks-btn-sm flex-1"
                >
                  <Check size={14} className="stroke-[2.5]" />
                  <span>Save & Sync Perks Live</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= TAB 2: FINANCIALS & COMMISSION ANALYTICS ================= */}
      {activeTab === 'analytics' && (
        <section className="space-y-5">
          {/* 4 KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="perks-kpi-card perks-kpi-card--indigo space-y-1">
              <div className="flex items-center justify-between text-xs text-[color:var(--bl-muted)]">
                <span>Gross Service Value</span>
                <DollarSign size={16} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-2xl font-extrabold text-[color:var(--bl-ink)]">
                ₹{financials.grossTotal.toLocaleString()}
              </div>
            </div>

            <div className="perks-kpi-card perks-kpi-card--amber space-y-1">
              <div className="flex items-center justify-between text-xs text-[color:var(--bl-muted)]">
                <span>Perks Discount Savings</span>
                <Tag size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-300">
                ₹{Math.round(financials.discountTotal).toLocaleString()}
              </div>
            </div>

            <div className="perks-kpi-card perks-kpi-card--emerald space-y-1">
              <div className="flex items-center justify-between text-xs text-[color:var(--bl-muted)]">
                <span>Astrologer Net Payout (80%)</span>
                <Wallet size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{Math.round(financials.netPayoutTotal).toLocaleString()}
              </div>
            </div>

            <div className="perks-kpi-card perks-kpi-card--purple space-y-1">
              <div className="flex items-center justify-between text-xs text-[color:var(--bl-muted)]">
                <span>Platform Commission (20%)</span>
                <PieChart size={16} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-300">
                ₹{Math.round(financials.commissionTotal).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Revenue Split Per Service Table */}
          <div className="perks-engine-card space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[color:var(--bl-line)] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[color:var(--bl-ink)] flex items-center gap-2">
                  <BarChart3 size={18} className="text-[color:var(--bl-primary)]" />
                  Revenue & Commission Split Breakdown by Service
                </h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold">
                Astrologer Share: 80% Net
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[color:var(--bl-line)] text-[11px] uppercase tracking-wider text-[color:var(--bl-muted)] bg-[color:var(--bl-surface-soft)]">
                    <th className="p-3">Service Type</th>
                    <th className="p-3">Base Tariff</th>
                    <th className="p-3">Discount Applied</th>
                    <th className="p-3">User Paid (Discounted)</th>
                    <th className="p-3">Platform Cut (20%)</th>
                    <th className="p-3 text-right">Net Astrologer Profit (80%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--bl-line)] text-xs">
                  {financials.rows.map((row) => (
                    <tr key={row.id} className="hover:bg-[color:var(--bl-surface-soft)] transition">
                      <td className="p-3 font-semibold text-[color:var(--bl-ink)]">
                        {row.name}
                      </td>
                      <td className="p-3 text-[color:var(--bl-muted)]">
                        ₹{row.base}
                      </td>
                      <td className="p-3 text-[color:var(--bl-primary)] font-bold">
                        {row.discPct}% OFF (₹{Math.round(row.totalDiscount).toLocaleString()})
                      </td>
                      <td className="p-3 font-semibold text-[color:var(--bl-ink)]">
                        ₹{Math.round(row.userPaid).toLocaleString()}
                      </td>
                      <td className="p-3 text-purple-600 dark:text-purple-300 font-medium">
                        ₹{Math.round(row.platformCut).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{Math.round(row.netProfit).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Sample Transactions Table */}
          <div className="perks-engine-card space-y-4">
            <div className="flex items-center justify-between border-b border-[color:var(--bl-line)] pb-3">
              <h3 className="font-bold text-sm text-[color:var(--bl-ink)] flex items-center gap-2">
                <History size={18} className="text-[color:var(--bl-primary)]" />
                Recent Transactions Log & User Tier Audit
              </h3>
              <span className="text-xs text-[color:var(--bl-muted)]">
                Showing last completed sessions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[color:var(--bl-line)] text-[11px] uppercase tracking-wider text-[color:var(--bl-muted)] bg-[color:var(--bl-surface-soft)]">
                    <th className="p-3">User / Audience Tier</th>
                    <th className="p-3">Service</th>
                    <th className="p-3">Base Price</th>
                    <th className="p-3">Perk Used</th>
                    <th className="p-3">Final Paid</th>
                    <th className="p-3">App Cut (20%)</th>
                    <th className="p-3 text-right">Net Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--bl-line)] text-xs">
                  {SAMPLE_TRANSACTIONS.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[color:var(--bl-surface-soft)] transition">
                      <td className={`p-3 font-semibold ${tx.tierColor}`}>
                        {tx.user}
                      </td>
                      <td className="p-3 text-[color:var(--bl-ink)]">{tx.service}</td>
                      <td className="p-3 text-[color:var(--bl-muted)]">₹{tx.basePrice}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-[color:var(--bl-primary-bg)] text-[color:var(--bl-primary)] font-semibold">
                          {tx.discount}% OFF
                        </span>
                      </td>
                      <td className="p-3 font-bold text-[color:var(--bl-ink)]">₹{tx.paid}</td>
                      <td className="p-3 text-purple-600 dark:text-purple-400">₹{tx.appCut}</td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">₹{tx.netPayout}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ================= TAB 3: HOROSCOPE & TRANSITS WORKFLOW ================= */}
      {activeTab === 'content' && (
        <section className="space-y-5">
          {/* Category Filter Header */}
          <div className="perks-engine-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs text-[color:var(--bl-ink)] font-bold uppercase tracking-wider pr-2">
                  Category:
                </span>
                {[
                  { id: 'daily', label: 'Daily Horoscope' },
                  { id: 'weekly', label: 'Weekly Horoscope' },
                  { id: 'monthly', label: 'Monthly Horoscope' },
                  { id: 'special', label: 'Special Transits & Remedies', icon: Sparkles },
                ].map((cat) => {
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setContentCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        contentCategory === cat.id
                          ? 'bg-[color:var(--bl-primary)] text-white shadow'
                          : 'text-[color:var(--bl-muted)] hover:bg-[color:var(--bl-surface-soft)]'
                      }`}
                    >
                      {Icon && <Icon size={14} />}
                      <span>{cat.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={publishAllRasis}
                  className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-bold transition flex items-center gap-1.5 shadow whitespace-nowrap ${
                    isPublished
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : isAllComplete
                      ? 'perks-publish-btn-blinking'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isPublished ? (
                    <>
                      <Check size={14} className="stroke-[2.5]" />
                      <span>Published Live</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Publish Content Now</span>
                    </>
                  )}
                </button>
                <input
                  type="date"
                  value={contentDate}
                  onChange={(e) => setContentDate(e.target.value)}
                  className="perks-engine-input text-xs"
                />
              </div>
            </div>

            {/* Incomplete Warning Message - Simply Notified Near the Button (No Popup) */}
            {publishWarning && !isAllComplete && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-bold">Still didn't write:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {incompleteCategories.map((cat) => (
                      <span
                        key={cat.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 text-[11px]"
                      >
                        <span>{cat.label}</span>
                        <span className="opacity-75">({cat.filled}/12)</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPublishWarning(false)}
                    className="px-2.5 py-1 rounded-lg border border-[color:var(--bl-line)] text-[11px] font-semibold text-[color:var(--bl-ink)] hover:bg-[color:var(--bl-surface-soft)] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPublished(true)
                      setPublishWarning(false)
                      showToast('🎉 Content published live to mobile app users!')
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow transition flex items-center gap-1"
                  >
                    <Check size={12} />
                    <span>OK Publish</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Special Transit Selector Banner */}
          {contentCategory === 'special' && (
            <div className="perks-engine-card border-l-4 border-l-[color:var(--bl-primary)] space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-[color:var(--bl-ink)] flex items-center gap-2">
                    <Orbit size={18} className="text-[color:var(--bl-primary)]" />
                    Select Planetary Transit or Special Remedy Event
                  </h4>
                  <p className="text-xs text-[color:var(--bl-muted)]">
                    Choose transit event to attach special predictions for all 12 signs
                  </p>
                </div>
                <select
                  value={specialTransit}
                  onChange={(e) => setSpecialTransit(e.target.value)}
                  className="perks-engine-select text-xs font-semibold sm:max-w-xs"
                >
                  <option value="Guru Peyarchi (Jupiter Transit 2026)">Guru Peyarchi (Jupiter Transit)</option>
                  <option value="Sani Peyarchi (Saturn Transit)">Sani Peyarchi (Saturn Transit)</option>
                  <option value="Rahu-Ketu Transit Special">Rahu-Ketu Transit</option>
                  <option value="Dasa Bhukti Specific Remedies">Dasa Bhukti Specific Remedies</option>
                  <option value="Solar / Lunar Eclipse Special">Eclipse Remedies & Chanting</option>
                </select>
              </div>
            </div>
          )}

          {/* 12 Rasis Batch Editor Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 5 Cols: 12 Rasis Grid */}
            <div className="lg:col-span-5 space-y-4">
              <div className="perks-engine-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[color:var(--bl-ink)] flex items-center gap-1.5">
                    <Grid size={16} className="text-[color:var(--bl-primary)]" />
                    <span>Select Rasi to Edit (12 Signs)</span>
                    <span className="text-[11px] font-bold text-[color:var(--bl-primary)] bg-[color:var(--bl-primary-bg)] px-2 py-0.5 rounded-full ml-1">
                      {filledRasiCount}/12
                    </span>
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => autoFillSampleData(false)}
                      className="text-[11px] px-2.5 py-1 bg-[color:var(--bl-primary-bg)] text-[color:var(--bl-primary)] rounded-lg hover:opacity-90 transition flex items-center gap-1 font-semibold"
                    >
                      <Wand2 size={12} /> Fill 12 Signs
                    </button>
                    <button
                      type="button"
                      onClick={() => autoFillSampleData(true)}
                      title="Populate all categories to test red blinking button"
                      className="text-[11px] px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 rounded-lg hover:opacity-90 transition flex items-center gap-1 font-semibold"
                    >
                      <Sparkles size={12} /> Fill All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {RASIS.map((r, idx) => {
                    const isCurrent = idx === currentRasiIndex
                    const isFilled = currentCategoryStore[r.id]?.filled

                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setCurrentRasiIndex(idx)}
                        className={`perks-rasi-btn ${isCurrent ? 'is-active' : ''}`}
                      >
                        <span className="text-2xl">{r.emoji}</span>
                        <span className="text-xs font-bold">
                          {r.name}
                        </span>
                        <span className="text-[10px] text-[color:var(--bl-muted)]">
                          {r.ta}
                        </span>
                        {isFilled && (
                          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Active Rasi Form */}
            <div className="lg:col-span-7 space-y-4">
              <div className="perks-engine-card border-l-4 border-l-[color:var(--bl-primary)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[color:var(--bl-line)]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[color:var(--bl-primary-bg)] border border-[color:var(--bl-primary)]/20 flex items-center justify-center text-2xl shrink-0">
                      <span>{activeRasi.emoji}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-[color:var(--bl-ink)] flex items-center gap-2">
                        <span>{activeRasi.name}</span>
                        <span className="text-xs font-normal text-[color:var(--bl-muted)]">({activeRasi.ta})</span>
                      </h4>
                      <p className="text-xs text-[color:var(--bl-muted)]">
                        {activeRasi.starsDisplay}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                      currentRasiData.filled
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200'
                    }`}
                  >
                    {currentRasiData.filled ? 'Completed' : 'In Draft'}
                  </span>
                </div>

                {/* Prediction Text Area */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-[color:var(--bl-ink)] flex items-center gap-1.5">
                      <FileText size={15} className="text-[color:var(--bl-primary)]" />
                      Prediction Content & Details:
                    </label>
                    <button
                      type="button"
                      onClick={() => setAudioAttached(!audioAttached)}
                      className={`perks-voice-note-btn ${audioAttached ? 'is-active' : ''}`}
                    >
                      <Mic size={14} />
                      <span>{audioAttached ? 'Remove Voice Note' : 'Attach Voice Note (Audio)'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={currentRasiData.text || ''}
                    onChange={(e) => handleRasiFieldChange('text', e.target.value)}
                    placeholder={`Write prediction for ${activeRasi.name}... (e.g. Excellent period for career growth and unexpected gains...)`}
                    className="perks-engine-textarea leading-relaxed"
                  />
                </div>

                {/* Audio Attachment Player Simulation */}
                {audioAttached && (
                  <div className="p-3 bg-[color:var(--bl-primary-bg)] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        className="w-7 h-7 rounded-full bg-[color:var(--bl-primary)] text-white flex items-center justify-center shadow"
                      >
                        <Play size={14} />
                      </button>
                      <span className="text-xs font-medium text-[color:var(--bl-primary-dark)]">
                        {activeRasi.name}_Voice_Prediction.mp3 (0:48)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAudioAttached(false)}
                      className="text-stone-400 hover:text-red-500 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Ratings & Lucky Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-[color:var(--bl-muted)] block mb-1">
                      Luck Rating / Score:
                    </label>
                    <select
                      value={currentRasiData.rating || '85%'}
                      onChange={(e) => handleRasiFieldChange('rating', e.target.value)}
                      className="perks-engine-select font-bold"
                    >
                      <option value="95%">95% (Excellent)</option>
                      <option value="85%">85% (Very Good)</option>
                      <option value="70%">70% (Average)</option>
                      <option value="50%">50% (Caution Recommended)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-[color:var(--bl-muted)] block mb-1">
                      Lucky Color:
                    </label>
                    <input
                      type="text"
                      value={currentRasiData.color || ''}
                      onChange={(e) => handleRasiFieldChange('color', e.target.value)}
                      className="perks-engine-input"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[color:var(--bl-muted)] block mb-1">
                      Lucky Number:
                    </label>
                    <input
                      type="text"
                      value={currentRasiData.number || ''}
                      onChange={(e) => handleRasiFieldChange('number', e.target.value)}
                      className="perks-engine-input"
                    />
                  </div>
                </div>

                {/* Pariharam / Remedy */}
                <div>
                  <label className="text-[11px] text-[color:var(--bl-muted)] block mb-1">
                    Pariharam / Recommended Remedy:
                  </label>
                  <input
                    type="text"
                    value={currentRasiData.remedy || ''}
                    onChange={(e) => handleRasiFieldChange('remedy', e.target.value)}
                    placeholder="e.g. Chant Lord Shiva stotram and offer ghee lamp in the morning."
                    className="perks-engine-input"
                  />
                </div>

                {/* Prev / Next Navigation */}
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => navigateRasi(-1)}
                    className="perks-btn-secondary text-xs"
                  >
                    <ChevronLeft size={16} /> Prev Sign
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateRasi(1)}
                    className="perks-btn-primary text-xs"
                  >
                    Next Sign <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

        {/* ================= TAB 4: SAVED GUIDANCE RECORDS ================= */}
        {activeTab === 'history' && benefits.length > 0 && (
          <section className="perks-engine-card space-y-4">
            <div className="flex items-center justify-between border-b border-[color:var(--bl-line)] pb-3">
              <h3 className="font-bold text-sm text-[color:var(--bl-ink)] flex items-center gap-2">
                <FileText size={18} className="text-[color:var(--bl-primary)]" />
                Published Benefits & Guidance Archive
              </h3>
              <span className="text-xs text-[color:var(--bl-muted)] font-semibold">
                {benefits.length} records
              </span>
            </div>

            <div className="space-y-3">
              {benefits.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-[color:var(--bl-line)] bg-[color:var(--bl-surface-soft)] flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-sm text-[color:var(--bl-ink)]">
                        {b.title}
                      </h5>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {b.status || 'Published'}
                      </span>
                    </div>
                    <p className="text-xs text-[color:var(--bl-muted)] mt-1">
                      {b.content || b.category} • {b.publishDate || 'Recent'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {onView && (
                      <button
                        type="button"
                        onClick={() => onView(b)}
                        className="p-2 text-[color:var(--bl-muted)] hover:text-[color:var(--bl-primary)] rounded-lg transition"
                        title="View"
                        aria-label={`View ${b.title}`}
                      >
                        <Eye size={16} />
                      </button>
                    )}
                    {onPreview && (
                      <button
                        type="button"
                        onClick={() => onPreview(b)}
                        className="p-2 text-[color:var(--bl-muted)] hover:text-[color:var(--bl-primary)] rounded-lg transition"
                        title="Preview"
                        aria-label={`Preview ${b.title}`}
                      >
                        <Sparkles size={16} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(b)}
                        className="p-2 text-[color:var(--bl-muted)] hover:text-red-500 rounded-lg transition"
                        title="Delete"
                        aria-label={`Delete ${b.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================= MOBILE APP SIMULATOR MODAL ================= */}
        {previewModalOpen && (
          <div className="simulator-modal-backdrop" onClick={() => setPreviewModalOpen(false)}>
            <div className="simulator-phone-frame" onClick={(e) => e.stopPropagation()}>
              {/* Simulator Header */}
              <div className="simulator-phone-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src="/astrologer-photos/reference/dr-rani.png"
                      alt="Dr. Rani"
                      className="w-10 h-10 rounded-full border-2 border-[color:var(--bl-gold)] object-cover shadow"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-[color:var(--bl-ink)] leading-tight">Dr. Rani</h4>
                      <p className="text-[11px] text-[color:var(--bl-muted)]">Vedic Astrology • 15+ Yrs Exp</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(false)}
                    className="text-[color:var(--bl-muted)] hover:text-[color:var(--bl-ink)] p-1 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* View Mode Selector */}
                <div className="mt-3 pt-2 border-t border-[color:var(--bl-line)] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[color:var(--bl-muted)]">User App View:</span>
                  <select
                    value={previewMode}
                    onChange={(e) => setPreviewMode(e.target.value)}
                    className="perks-engine-select py-1 px-2 text-xs w-auto"
                  >
                    <option value="ALL">Show ALL 12 Rasis Feed</option>
                    <option value="CURRENT">Show Single Selected Sign</option>
                  </select>
                </div>
              </div>

              {/* Simulator Scrollable Body */}
              <div className="simulator-phone-body">
                {/* Active Perks List */}
                <div>
                  <h5 className="text-[11px] font-bold text-[color:var(--bl-muted)] mb-2 uppercase tracking-wider flex items-center justify-between">
                    <span>Your Perks & Discounts</span>
                    <span className="text-[color:var(--bl-primary)] font-semibold">Active Offers</span>
                  </h5>
                  <div className="space-y-2">
                    {services
                      .filter((s) => s.active)
                      .map((s) => (
                        <div
                          key={s.id}
                          className="simulator-card flex flex-row items-center justify-between"
                        >
                          <div className="text-xs">
                            <div className="font-semibold text-[color:var(--bl-ink)]">{s.name}</div>
                            <div className="text-[10px] text-[color:var(--bl-muted)]">{s.target} Perk</div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-[color:var(--bl-primary-bg)] text-[color:var(--bl-primary)] font-bold text-xs">
                            {s.discount}% OFF
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Horoscope Feed Container */}
                <div className="border-t border-[color:var(--bl-line)] pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-bold text-[color:var(--bl-muted)] uppercase tracking-wider">
                      {previewMode === 'ALL' ? 'All 12 Rasis Feed' : `${activeRasi.name} Prediction`}
                    </h5>
                    <span className="text-[10px] text-[color:var(--bl-primary)] font-semibold">{contentDate}</span>
                  </div>

                  <div className="space-y-3">
                    {previewMode === 'ALL' ? (
                      RASIS.map((r) => {
                        const data = currentCategoryStore[r.id] || {}
                        return (
                          <div
                            key={r.id}
                            className="simulator-card space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[color:var(--bl-primary)] flex items-center gap-1.5">
                                <span>{r.emoji}</span>
                                <span>{r.name} ({r.ta})</span>
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                                {data.rating}
                              </span>
                            </div>
                            <p className="text-xs text-[color:var(--bl-ink)] leading-relaxed">
                              {data.text || 'Prediction pending entry by astrologer...'}
                            </p>
                            <div className="text-[10px] text-[color:var(--bl-muted)] pt-1 border-t border-[color:var(--bl-line)] flex justify-between">
                              <span>
                                <b>Remedy:</b> {data.remedy}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="simulator-card space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[color:var(--bl-primary)] flex items-center gap-1.5">
                            <span className="text-base">{activeRasi.emoji}</span>
                            <span>{activeRasi.name} ({activeRasi.ta})</span>
                          </span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded">
                            {currentRasiData.rating}
                          </span>
                        </div>
                        <p className="text-xs text-[color:var(--bl-ink)] leading-relaxed">
                          {currentRasiData.text || 'Prediction pending entry...'}
                        </p>
                        <div className="text-[11px] text-[color:var(--bl-muted)] pt-2 border-t border-[color:var(--bl-line)] space-y-1">
                          <div>
                            <b>Lucky Color:</b> {currentRasiData.color}
                          </div>
                          <div>
                            <b>Lucky Number:</b> {currentRasiData.number}
                          </div>
                          <div>
                            <b>Pariharam:</b> {currentRasiData.remedy}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Simulator Footer */}
              <div className="simulator-phone-footer">
                <p className="text-[10px] text-[color:var(--bl-muted)]">
                  Previewing layout as viewed by app users & subscribers
                </p>
              </div>
            </div>
          </div>
        )}


        {/* Toast Notification */}
        {toastMsg && (
          <div className="platform-toast">
            <CheckCircle size={18} />
            <span>{toastMsg}</span>
          </div>
        )}
    </div>
  )
}
