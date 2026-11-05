import { useMemo, useState } from 'react'
import {
  Award,
  BarChart3,
  Calendar,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
  Eye,
  FileText,
  Gift,
  GitMerge,
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
  Star,
  Tag,
  Trash2,
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
    stars: [
      { name: 'Ashwini', ta: 'அஸ்வினி' },
      { name: 'Bharani (Parani)', ta: 'பரணி' },
      { name: 'Krittika (1)', ta: 'கிருத்திகை 1' },
    ],
    starsShort: 'Ashwini · Parani · Krittika',
  },
  {
    id: 'taurus',
    name: 'Taurus',
    ta: 'ரிஷபம்',
    symbol: '♉',
    stars: [
      { name: 'Krittika (2-4)', ta: 'கிருத்திகை' },
      { name: 'Rohini', ta: 'ரோகிணி' },
      { name: 'Mrigashira (1-2)', ta: 'மிருகசீரிஷம்' },
    ],
    starsShort: 'Krittika · Rohini · Mrigashira',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    ta: 'மிதுனம்',
    symbol: '♊',
    stars: [
      { name: 'Mrigashira (3-4)', ta: 'மிருகசீரிஷம்' },
      { name: 'Ardra (Thiruvathirai)', ta: 'திருவாதிரை' },
      { name: 'Punarvasu (1-3)', ta: 'புனர்பூசம்' },
    ],
    starsShort: 'Mrigashira · Ardra · Punarvasu',
  },
  {
    id: 'cancer',
    name: 'Cancer',
    ta: 'கடகம்',
    symbol: '♋',
    stars: [
      { name: 'Punarvasu (4)', ta: 'புனர்பூசம் 4' },
      { name: 'Pushya (Poosam)', ta: 'பூசம்' },
      { name: 'Ashlesha (Ayilyam)', ta: 'ஆயில்யம்' },
    ],
    starsShort: 'Punarvasu · Pushya · Ashlesha',
  },
  {
    id: 'leo',
    name: 'Leo',
    ta: 'சிம்மம்',
    symbol: '♌',
    stars: [
      { name: 'Magha (Makam)', ta: 'மகம்' },
      { name: 'Purva Phalguni (Pooram)', ta: 'பூரம்' },
      { name: 'Uttara Phalguni (1)', ta: 'உத்திரம் 1' },
    ],
    starsShort: 'Magha · Pooram · Uthiram',
  },
  {
    id: 'virgo',
    name: 'Virgo',
    ta: 'கன்னி',
    symbol: '♍',
    stars: [
      { name: 'Uttara Phalguni (2-4)', ta: 'உத்திரம்' },
      { name: 'Hasta (Hastham)', ta: 'அஸ்தம்' },
      { name: 'Chitra (1-2)', ta: 'சித்திரை' },
    ],
    starsShort: 'Uthiram · Hasta · Chitra',
  },
  {
    id: 'libra',
    name: 'Libra',
    ta: 'துலாம்',
    symbol: '♎',
    stars: [
      { name: 'Chitra (3-4)', ta: 'சித்திரை' },
      { name: 'Swati', ta: 'சுவாதி' },
      { name: 'Vishakha (1-3)', ta: 'விசாகம்' },
    ],
    starsShort: 'Chitra · Swati · Vishakha',
  },
  {
    id: 'scorpio',
    name: 'Scorpio',
    ta: 'விருச்சிகம்',
    symbol: '♏',
    stars: [
      { name: 'Vishakha (4)', ta: 'விசாகம் 4' },
      { name: 'Anuradha (Anusham)', ta: 'அனுஷம்' },
      { name: 'Jyeshtha (Kettai)', ta: 'கேட்டை' },
    ],
    starsShort: 'Vishakha · Anuradha · Jyeshtha',
  },
  {
    id: 'sagittarius',
    name: 'Sagittarius',
    ta: 'தனுசு',
    symbol: '♐',
    stars: [
      { name: 'Mula (Moolam)', ta: 'மூலம்' },
      { name: 'Purva Ashadha (Pooradam)', ta: 'பூராடம்' },
      { name: 'Uttara Ashadha (1)', ta: 'உத்திராடம் 1' },
    ],
    starsShort: 'Mula · Pooradam · Uthiradam',
  },
  {
    id: 'capricorn',
    name: 'Capricorn',
    ta: 'மகரம்',
    symbol: '♑',
    stars: [
      { name: 'Uttara Ashadha (2-4)', ta: 'உத்திராடம்' },
      { name: 'Shravana (Thiruvonam)', ta: 'திருவோணம்' },
      { name: 'Dhanishta (1-2)', ta: 'அவிட்டம்' },
    ],
    starsShort: 'Uthiradam · Shravana · Dhanishta',
  },
  {
    id: 'aquarius',
    name: 'Aquarius',
    ta: 'கும்பம்',
    symbol: '♒',
    stars: [
      { name: 'Dhanishta (3-4)', ta: 'அவிட்டம்' },
      { name: 'Shatabhisha (Sadhayam)', ta: 'சதயம்' },
      { name: 'Purva Bhadrapada (1-3)', ta: 'பூரட்டாதி' },
    ],
    starsShort: 'Dhanishta · Shatabhisha · Poorattathi',
  },
  {
    id: 'pisces',
    name: 'Pisces',
    ta: 'மீனம்',
    symbol: '♓',
    stars: [
      { name: 'Purva Bhadrapada (4)', ta: 'பூரட்டாதி 4' },
      { name: 'Uttara Bhadrapada (Uthirattathi)', ta: 'உத்திரட்டாதி' },
      { name: 'Revati (Revathi)', ta: 'ரேவதி' },
    ],
    starsShort: 'Poorattathi · Uthirattathi · Revati',
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

  // 12 Rasis storage state
  const [rasiStore, setRasiStore] = useState(() => {
    const initial = {}
    RASIS.forEach((r) => {
      initial[r.id] = {
        text: '',
        rating: '85%',
        color: 'Yellow / Gold',
        number: '3, 9',
        remedy: 'Chant Lord Shiva stotram for peace and prosperity.',
        suitedStars: r.stars.map((s) => s.name),
        filled: false,
      }
    })
    return initial
  })

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => {
      setToastMsg('')
    }, 3200)
  }

  // Active Rasi data
  const activeRasi = RASIS[currentRasiIndex]
  const currentRasiData = rasiStore[activeRasi.id] || {}

  const filledRasiCount = useMemo(() => {
    return Object.values(rasiStore).filter((entry) => entry.filled).length
  }, [rasiStore])

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
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, discount: Number(newDiscount) } : s))
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
    setRasiStore((prev) => {
      const current = prev[activeRasi.id] || {}
      const updated = { ...current, [field]: value }
      if (field === 'text') {
        updated.filled = String(value).trim().length > 5
      }
      return { ...prev, [activeRasi.id]: updated }
    })
  }

  const navigateRasi = (direction) => {
    let next = currentRasiIndex + direction
    if (next < 0) next = 11
    if (next > 11) next = 0
    setCurrentRasiIndex(next)
  }

  const autoFillSampleData = () => {
    const samples = [
      'Excellent period for career growth and unexpected gains. Focus on new ventures.',
      'High energy levels. Important decisions regarding property and family will be favorable.',
      'Exercise mild caution in conversations at work. Evening brings positive news.',
      'Support from seniors and elders. Overdue financial payments will clear up today.',
      'Favorable day for travel and creative tasks. Health remains robust.',
      'Financial stability improves. Meditation and spiritual activities bring inner peace.',
    ]

    setRasiStore((prev) => {
      const nextStore = { ...prev }
      RASIS.forEach((r, idx) => {
        const sampleText = samples[idx % samples.length]
        const isSpecial = contentCategory === 'special'
        const transitTitle = isSpecial ? specialTransit : 'Horoscope Prediction'

        nextStore[r.id] = {
          text: `[${transitTitle}] For ${r.name} (${r.ta}): ${sampleText}`,
          rating: `${80 + ((idx * 2) % 20)}%`,
          color: 'Yellow / Gold',
          number: `${idx + 1}, ${idx + 5}`,
          remedy: 'Morning prayer and offering prayers to Sun God brings luck.',
          suitedStars: r.stars.map((s) => s.name),
          filled: true,
        }
      })
      return nextStore
    })

    showToast('All 12 Rasis populated with sample predictions!')
  }

  const publishAllRasis = () => {
    if (filledRasiCount < 12) {
      showToast(`Warning: Only ${filledRasiCount}/12 signs completed! Complete all 12 signs.`)
    } else {
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
            <div className="lg:col-span-2 space-y-4">
              {/* 4 Service Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((svc) => {
                  const Icon = svc.icon
                  return (
                    <div key={svc.id} className="perks-service-item space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-[color:var(--bl-primary-bg)] text-[color:var(--bl-primary)]">
                            <Icon size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-[color:var(--bl-ink)]">
                              {svc.name}
                            </h4>
                            <p className="text-[11px] text-[color:var(--bl-muted)]">
                              Base: <b>₹{svc.base} / {svc.unit}</b>
                            </p>
                          </div>
                        </div>

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

                      <div className="space-y-2 pt-2 border-t border-[color:var(--bl-line)]">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[color:var(--bl-muted)]">Discount:</span>
                          <span className="font-bold text-[color:var(--bl-primary)] text-sm">
                            {svc.discount}% OFF
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="80"
                          step="5"
                          value={svc.discount}
                          onChange={(e) => handleDiscountChange(svc.id, e.target.value)}
                          className="perks-range-slider"
                        />

                        <div className="pt-1">
                          <label className="text-[11px] text-[color:var(--bl-muted)] block mb-1">
                            Target Audience Tier:
                          </label>
                          <select
                            value={svc.target}
                            onChange={(e) => handleTargetChange(svc.id, e.target.value)}
                            className="perks-engine-select"
                          >
                            <option value="All Users">All App Users</option>
                            <option value="Followers">Followers Only</option>
                            <option value="Subscribers">Paid Subscribers Only</option>
                            <option value="VIPs">VIPs & Public Figures</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetPerks}
                  className="perks-btn-secondary"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={savePerks}
                  className="perks-btn-primary"
                >
                  <Check size={16} />
                  <span>Save & Sync Perks Live</span>
                </button>
              </div>
            </div>

            {/* Right Side 1 Col: Summary & Engagement */}
            <div className="space-y-4">
              <div className="perks-engine-card perks-engine-card--active space-y-4">
                <h4 className="text-sm font-bold text-[color:var(--bl-ink)] flex items-center gap-2 pb-3 border-b border-[color:var(--bl-line)]">
                  <Award size={18} className="text-[color:var(--bl-primary)]" />
                  Active Perks Live Summary
                </h4>

                <div className="space-y-2.5">
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

                <div className="pt-3 border-t border-[color:var(--bl-line)] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[color:var(--bl-muted)]">Estimated Engagement:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">+38% Higher Volume</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[color:var(--bl-primary-bg)] text-xs text-[color:var(--bl-primary-dark)] leading-relaxed">
                    💡 <b>Pro Tip:</b> Offering 20%+ discounts on Text Questions drives 3.5x higher question volume from regular Followers.
                  </div>
                </div>
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
              <p className="text-[11px] text-[color:var(--bl-muted)]">Before discounts & platform split</p>
            </div>

            <div className="perks-kpi-card perks-kpi-card--amber space-y-1">
              <div className="flex items-center justify-between text-xs text-[color:var(--bl-muted)]">
                <span>Perks Discount Savings</span>
                <Tag size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-300">
                ₹{Math.round(financials.discountTotal).toLocaleString()}
              </div>
              <p className="text-[11px] text-[color:var(--bl-muted)] font-semibold">
                Avg {financials.avgDiscPct.toFixed(1)}% savings across users
              </p>
            </div>

            <div className="perks-kpi-card perks-kpi-card--emerald space-y-1">
              <div className="flex items-center justify-between text-xs text-[color:var(--bl-muted)]">
                <span>Astrologer Net Payout (80%)</span>
                <Wallet size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{Math.round(financials.netPayoutTotal).toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400/80">Direct payout after 20% commission</p>
            </div>

            <div className="perks-kpi-card perks-kpi-card--purple space-y-1">
              <div className="flex items-center justify-between text-xs text-[color:var(--bl-muted)]">
                <span>Platform Commission (20%)</span>
                <PieChart size={16} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-300">
                ₹{Math.round(financials.commissionTotal).toLocaleString()}
              </div>
              <p className="text-[11px] text-[color:var(--bl-muted)]">Covers hosting, video/audio & marketing</p>
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
                <p className="text-xs text-[color:var(--bl-muted)]">
                  Detailed financial analysis of how perks affect your net earnings
                </p>
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
          <div className="perks-engine-card flex flex-wrap items-center justify-between gap-4">
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
              <input
                type="date"
                value={contentDate}
                onChange={(e) => setContentDate(e.target.value)}
                className="perks-engine-input text-xs"
              />
            </div>
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

          {/* Visual 4-Step Workflow Process Map */}
          <div className="perks-engine-card space-y-3">
            <h4 className="text-xs font-bold text-[color:var(--bl-ink)] uppercase tracking-wider flex items-center gap-2">
              <GitMerge size={16} className="text-[color:var(--bl-primary)]" />
              Horoscope Publishing Workflow Process Map
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="perks-workflow-step flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 rounded-full bg-[color:var(--bl-primary-bg)] text-[color:var(--bl-primary)] text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <Calendar size={16} className="text-[color:var(--bl-muted)]" />
                  </div>
                  <h5 className="text-xs font-bold text-[color:var(--bl-ink)]">
                    Category Selection
                  </h5>
                  <p className="text-[11px] text-[color:var(--bl-muted)] mt-0.5">
                    {contentCategory.toUpperCase()} mode active
                  </p>
                </div>
                <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle size={12} /> Active Mode Ready
                </div>
              </div>

              <div className="perks-workflow-step flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 rounded-full bg-[color:var(--bl-primary-bg)] text-[color:var(--bl-primary)] text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <Edit3 size={16} className="text-[color:var(--bl-muted)]" />
                  </div>
                  <h5 className="text-xs font-bold text-[color:var(--bl-ink)]">
                    12 Rasis Batch Entry
                  </h5>
                  <p className="text-[11px] text-[color:var(--bl-muted)] mt-0.5">
                    Write or record predictions
                  </p>
                </div>
                <div className="mt-2 text-[10px] text-[color:var(--bl-primary)] flex items-center gap-1 font-semibold">
                  <Clock size={12} /> {filledRasiCount}/12 Completed
                </div>
              </div>

              <div className="perks-workflow-step flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 rounded-full bg-[color:var(--bl-primary-bg)] text-[color:var(--bl-primary)] text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <Star size={16} className="text-[color:var(--bl-muted)]" />
                  </div>
                  <h5 className="text-xs font-bold text-[color:var(--bl-ink)]">
                    Remedies & Ratings
                  </h5>
                  <p className="text-[11px] text-[color:var(--bl-muted)] mt-0.5">
                    Colors, numbers & Pariharams
                  </p>
                </div>
                <div className="mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold">
                  <CheckCircle size={12} /> Configured
                </div>
              </div>

              <div className="perks-workflow-step flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">
                      4
                    </span>
                    <Send size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h5 className="text-xs font-bold text-[color:var(--bl-ink)]">
                    App Broadcast & Push
                  </h5>
                  <p className="text-[11px] text-[color:var(--bl-muted)] mt-0.5">
                    Publish feed to followers
                  </p>
                </div>
                <button
                  type="button"
                  onClick={publishAllRasis}
                  className="mt-2 w-full py-1.5 rounded-lg bg-[color:var(--bl-primary)] text-white text-[11px] font-bold text-center transition hover:opacity-90"
                >
                  Publish Content Now
                </button>
              </div>
            </div>
          </div>

          {/* 12 Rasis Batch Editor Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 5 Cols: 12 Rasis Grid */}
            <div className="lg:col-span-5 space-y-4">
              <div className="perks-engine-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[color:var(--bl-ink)] flex items-center gap-1.5">
                    <Grid size={16} className="text-[color:var(--bl-primary)]" />
                    Select Rasi to Edit (12 Signs)
                  </h4>
                  <button
                    type="button"
                    onClick={autoFillSampleData}
                    className="text-[11px] px-2.5 py-1 bg-[color:var(--bl-primary-bg)] text-[color:var(--bl-primary)] rounded-lg hover:opacity-90 transition flex items-center gap-1 font-semibold"
                  >
                    <Wand2 size={12} /> Fill 12 Signs Sample
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {RASIS.map((r, idx) => {
                    const isCurrent = idx === currentRasiIndex
                    const isFilled = rasiStore[r.id]?.filled

                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setCurrentRasiIndex(idx)}
                        className={`perks-rasi-btn ${isCurrent ? 'is-active' : ''}`}
                      >
                        <span className="text-2xl">{r.symbol}</span>
                        <span className="text-xs font-bold">
                          {r.name}
                        </span>
                        <span className="text-[10px] text-[color:var(--bl-muted)]">
                          {r.ta}
                        </span>
                        <span className="text-[9px] text-amber-700 dark:text-amber-300 font-medium truncate max-w-full px-1">
                          {r.starsShort}
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
                    <span className="text-3xl">{activeRasi.symbol}</span>
                    <div>
                      <h4 className="font-bold text-base text-[color:var(--bl-ink)]">
                        {activeRasi.name} ({activeRasi.ta})
                      </h4>
                      <p className="text-xs text-[color:var(--bl-muted)]">
                        Editing Prediction for {contentCategory.toUpperCase()} Horoscope
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
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-[color:var(--bl-ink)] flex items-center gap-1">
                      <FileText size={14} className="text-[color:var(--bl-primary)]" />
                      Prediction Content & Details:
                    </label>
                    <button
                      type="button"
                      onClick={() => setAudioAttached(!audioAttached)}
                      className="text-[11px] text-[color:var(--bl-primary)] hover:underline flex items-center gap-1 font-medium"
                    >
                      <Mic size={14} /> {audioAttached ? 'Remove Voice Note' : 'Attach Voice Note (Audio)'}
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
                        const data = rasiStore[r.id]
                        return (
                          <div
                            key={r.id}
                            className="simulator-card space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[color:var(--bl-primary)]">
                                {r.symbol} {r.name} ({r.ta})
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                                {data.rating}
                              </span>
                            </div>
                            <p className="text-xs text-[color:var(--bl-ink)] leading-relaxed">
                              {data.text || 'Prediction pending entry by astrologer...'}
                            </p>
                            <div className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/40 flex items-center gap-1 font-medium">
                              <Star size={10} className="fill-amber-500 text-amber-500 shrink-0" />
                              <span className="truncate"><b>Suited Stars:</b> {data.suitedStars?.join(', ') || r.starsShort}</span>
                            </div>
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
                          <span className="font-bold text-sm text-[color:var(--bl-primary)]">
                            {activeRasi.symbol} {activeRasi.name} ({activeRasi.ta})
                          </span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded">
                            {currentRasiData.rating}
                          </span>
                        </div>
                        <p className="text-xs text-[color:var(--bl-ink)] leading-relaxed">
                          {currentRasiData.text || 'Prediction pending entry...'}
                        </p>
                        <div className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded border border-amber-200/60 dark:border-amber-800/40 flex items-center gap-1 font-medium">
                          <Star size={11} className="fill-amber-500 text-amber-500 shrink-0" />
                          <span><b>Suited Stars:</b> {currentRasiData.suitedStars?.join(', ') || activeRasi.starsShort}</span>
                        </div>
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
