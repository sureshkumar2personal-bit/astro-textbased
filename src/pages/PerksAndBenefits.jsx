import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  Gift,
  SlidersHorizontal,
  Send,
  History,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Trash2,
  FileText,
  Mic,
  Video,
  Sparkles,
  Search,
  Check,
  HelpCircle,
  Calendar,
  CalendarDays,
  AlertCircle,
  Info,
  Layers,
  Tag,
  ArrowRight,
  Filter,
  DollarSign
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'

// Predefined Content Categories as per prompt requirements
const INITIAL_CATEGORIES = [
  'Daily Prediction',
  'Weekly Prediction',
  'Monthly Prediction',
  'Guru Peyarchi Prediction',
  'Sani Peyarchi Prediction',
  'Rahu Peyarchi Prediction',
  'Ketu Peyarchi Prediction',
  'Festival / Special Event Prediction',
  'Customized Event',
]

const BENEFIT_TEMPLATES = [
  {
    id: 'follower-basic',
    tier: 'Followers',
    name: 'Follower Basic',
    benefits: ['Free tier', 'Weekly Predictions', 'Monthly Predictions', 'No subscription price'],
    freeQuestions: 0,
    categories: ['Weekly Prediction', 'Monthly Prediction'],
    price: 0,
  },
  {
    id: 'silver-standard',
    tier: 'Silver',
    name: 'Silver Standard',
    benefits: ['2 Free Text Questions', 'Weekly Predictions', 'Monthly Predictions'],
    freeQuestions: 2,
    categories: ['Weekly Prediction', 'Monthly Prediction'],
  },
  {
    id: 'gold-premium',
    tier: 'Gold',
    name: 'Gold Premium',
    benefits: ['5 Free Text Questions', 'Weekly Predictions', 'Monthly Predictions', 'Special Event Predictions'],
    freeQuestions: 5,
    categories: ['Weekly Prediction', 'Monthly Prediction', 'Special Event Prediction'],
  },
]

// Mock Customer Data across Followers, Silver, and Gold
const INITIAL_CUSTOMERS = [
  {
    id: 'cust-1',
    name: 'Priya V.',
    type: 'Follower',
    regDate: '12 Jan 2026',
    subDate: '—',
    amountSpent: 500,
    status: 'Active Follower',
    usedQuestions: 0,
    allocatedQuestions: 0,
  },
  {
    id: 'cust-2',
    name: 'Arjun D.',
    type: 'Silver',
    regDate: '05 Feb 2026',
    subDate: '10 Feb 2026',
    amountSpent: 1490,
    status: 'Active (Silver)',
    usedQuestions: 1,
    allocatedQuestions: 2,
    latestQuestionId: 'QTN-2026-000123',
  },
  {
    id: 'cust-3',
    name: 'Meena R.',
    type: 'Gold',
    regDate: '20 Nov 2025',
    subDate: '01 Dec 2025',
    amountSpent: 3890,
    status: 'Active (Gold)',
    usedQuestions: 2,
    allocatedQuestions: 5,
    latestQuestionId: 'QTN-2026-001247',
  },
  {
    id: 'cust-4',
    name: 'Kannan S.',
    type: 'Follower',
    regDate: '18 Mar 2026',
    subDate: '—',
    amountSpent: 200,
    status: 'Active Follower',
    usedQuestions: 0,
    allocatedQuestions: 0,
  },
  {
    id: 'cust-5',
    name: 'Devi K.',
    type: 'Silver',
    regDate: '01 Apr 2026',
    subDate: '15 Apr 2026',
    amountSpent: 890,
    status: 'Active (Silver)',
    usedQuestions: 0,
    allocatedQuestions: 2,
  },
  {
    id: 'cust-6',
    name: 'Rajesh Kumar',
    type: 'Gold',
    regDate: '14 Feb 2026',
    subDate: '01 Mar 2026',
    amountSpent: 4200,
    status: 'Active (Gold)',
    usedQuestions: 1,
    allocatedQuestions: 5,
    latestQuestionId: 'QTN-2026-001248',
  },
  {
    id: 'cust-7',
    name: 'Ananya Sharma',
    type: 'Follower',
    regDate: '10 May 2026',
    subDate: '—',
    amountSpent: 0,
    status: 'Active Follower',
    usedQuestions: 0,
    allocatedQuestions: 0,
  },
  {
    id: 'cust-8',
    name: 'Vikram Seth',
    type: 'Silver',
    regDate: '22 Jun 2026',
    subDate: '01 Jul 2026',
    amountSpent: 1190,
    status: 'Active (Silver)',
    usedQuestions: 2,
    allocatedQuestions: 2,
  },
]

// Initial Content Delivery Deliveries
const INITIAL_DELIVERIES = [
  {
    id: 'CNT-2026-089',
    title: 'Weekly Vedic Guidance - Sep Week 1',
    format: 'Text',
    category: 'Weekly Prediction',
    targetTiers: ['Silver', 'Gold'],
    publishDate: '02 Sep 2026',
    status: 'Published',
    content: 'This week highlights clarity in decision making and spiritual alignment. Focus on inner peace.',
  },
  {
    id: 'CNT-2026-085',
    title: 'Monthly Transit Overview September 2026',
    format: 'Video',
    category: 'Monthly Prediction',
    targetTiers: ['Silver', 'Gold'],
    publishDate: '01 Sep 2026',
    status: 'Published',
    content: 'Video recording covering major planetary shifts for Jupiter & Saturn in September.',
  },
  {
    id: 'CNT-2026-092',
    title: 'Special Event - Ganesha Chaturthi Auspicious Timing',
    format: 'Audio',
    category: 'Festival / Special Event Prediction',
    targetTiers: ['Gold'],
    publishDate: '05 Sep 2026',
    status: 'Published',
    content: 'Audio guide for Ganesha Chaturthi rituals and optimal muhurat hours.',
  },
  {
    id: 'CNT-2026-098',
    title: 'Daily Morning Reflection & Horoscope',
    format: 'Text',
    category: 'Daily Prediction',
    targetTiers: ['Followers', 'Silver', 'Gold'],
    publishDate: '08 Sep 2026',
    status: 'Published',
    content: 'Start your day with positive planetary vibrations and mindful actions.',
  },
  {
    id: 'CNT-2026-099',
    title: 'Guru Peyarchi Transit Audio Insights',
    format: 'Audio',
    category: 'Guru Peyarchi Prediction',
    targetTiers: ['Gold'],
    publishDate: '08 Sep 2026',
    status: 'Published',
    content: 'Detailed audio analysis of Jupiter transit impact on birth charts.',
  },
  {
    id: 'CNT-2026-102',
    title: 'Weekly Vedic Guidance - Sep Week 2',
    format: 'Text',
    category: 'Weekly Prediction',
    targetTiers: ['Silver', 'Gold'],
    publishDate: '09 Sep 2026',
    status: 'Published',
    content: 'Key planetary aspects for mid-September and career recommendations.',
  },
]

// Historical monthly commitment records
const HISTORICAL_MONTHS = [
  {
    month: 'September 2026',
    isCurrent: true,
    total: 10,
    fulfilled: 8,
    pending: 1,
    missed: 1,
    percentage: 80,
    records: [
      {
        id: 'COM-2026-09-01',
        benefit: 'Weekly Prediction (Week 1)',
        tier: 'Silver & Gold',
        expectedDate: '07 Sep 2026',
        deliveredDate: '02 Sep 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-089',
      },
      {
        id: 'COM-2026-09-02',
        benefit: 'Monthly Prediction',
        tier: 'Silver & Gold',
        expectedDate: '05 Sep 2026',
        deliveredDate: '01 Sep 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-085',
      },
      {
        id: 'COM-2026-09-03',
        benefit: 'Special Event Prediction',
        tier: 'Gold',
        expectedDate: '06 Sep 2026',
        deliveredDate: '05 Sep 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-092',
      },
      {
        id: 'COM-2026-09-04',
        benefit: 'Daily Prediction',
        tier: 'Followers',
        expectedDate: '08 Sep 2026',
        deliveredDate: '08 Sep 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-098',
      },
      {
        id: 'COM-2026-09-05',
        benefit: 'Free Text Questions (Silver)',
        tier: 'Silver',
        expectedDate: '15 Sep 2026',
        deliveredDate: '03 Sep 2026',
        status: 'Fulfilled',
        ref: 'QTN-2026-000123',
      },
      {
        id: 'COM-2026-09-06',
        benefit: 'Free Text Questions (Gold)',
        tier: 'Gold',
        expectedDate: '15 Sep 2026',
        deliveredDate: '04 Sep 2026',
        status: 'Fulfilled',
        ref: 'QTN-2026-001247',
      },
      {
        id: 'COM-2026-09-07',
        benefit: 'Guru Peyarchi Prediction',
        tier: 'Gold',
        expectedDate: '12 Sep 2026',
        deliveredDate: '08 Sep 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-099',
      },
      {
        id: 'COM-2026-09-08',
        benefit: 'Weekly Prediction (Week 2)',
        tier: 'Silver & Gold',
        expectedDate: '14 Sep 2026',
        deliveredDate: '09 Sep 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-102',
      },
      {
        id: 'COM-2026-09-09',
        benefit: 'Weekly Prediction (Week 3)',
        tier: 'Silver & Gold',
        expectedDate: '21 Sep 2026',
        deliveredDate: '—',
        status: 'Pending',
        ref: '—',
      },
      {
        id: 'COM-2026-09-10',
        benefit: 'Sani Peyarchi Prediction',
        tier: 'Gold',
        expectedDate: '04 Sep 2026',
        deliveredDate: '—',
        status: 'Missed',
        ref: '—',
      },
    ],
  },
  {
    month: 'August 2026',
    isCurrent: false,
    total: 10,
    fulfilled: 8,
    pending: 0,
    missed: 2,
    percentage: 80,
    records: [
      {
        id: 'COM-2026-08-01',
        benefit: 'Weekly Prediction (Week 1)',
        tier: 'Silver & Gold',
        expectedDate: '07 Aug 2026',
        deliveredDate: '05 Aug 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-041',
      },
      {
        id: 'COM-2026-08-02',
        benefit: 'Monthly Prediction',
        tier: 'Silver & Gold',
        expectedDate: '05 Aug 2026',
        deliveredDate: '02 Aug 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-039',
      },
      {
        id: 'COM-2026-08-03',
        benefit: 'Special Event Prediction',
        tier: 'Gold',
        expectedDate: '15 Aug 2026',
        deliveredDate: '14 Aug 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-048',
      },
      {
        id: 'COM-2026-08-04',
        benefit: 'Daily Prediction',
        tier: 'Followers',
        expectedDate: '20 Aug 2026',
        deliveredDate: '20 Aug 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-052',
      },
      {
        id: 'COM-2026-08-05',
        benefit: 'Free Text Questions (Silver)',
        tier: 'Silver',
        expectedDate: '15 Aug 2026',
        deliveredDate: '10 Aug 2026',
        status: 'Fulfilled',
        ref: 'QTN-2026-000980',
      },
      {
        id: 'COM-2026-08-06',
        benefit: 'Free Text Questions (Gold)',
        tier: 'Gold',
        expectedDate: '15 Aug 2026',
        deliveredDate: '12 Aug 2026',
        status: 'Fulfilled',
        ref: 'QTN-2026-000985',
      },
      {
        id: 'COM-2026-08-07',
        benefit: 'Weekly Prediction (Week 2)',
        tier: 'Silver & Gold',
        expectedDate: '14 Aug 2026',
        deliveredDate: '13 Aug 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-045',
      },
      {
        id: 'COM-2026-08-08',
        benefit: 'Weekly Prediction (Week 3)',
        tier: 'Silver & Gold',
        expectedDate: '21 Aug 2026',
        deliveredDate: '20 Aug 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-055',
      },
      {
        id: 'COM-2026-08-09',
        benefit: 'Rahu Peyarchi Prediction',
        tier: 'Gold',
        expectedDate: '10 Aug 2026',
        deliveredDate: '—',
        status: 'Missed',
        ref: '—',
      },
      {
        id: 'COM-2026-08-10',
        benefit: 'Ketu Peyarchi Prediction',
        tier: 'Gold',
        expectedDate: '25 Aug 2026',
        deliveredDate: '—',
        status: 'Missed',
        ref: '—',
      },
    ],
  },
  {
    month: 'July 2026',
    isCurrent: false,
    total: 10,
    fulfilled: 10,
    pending: 0,
    missed: 0,
    percentage: 100,
    records: [
      {
        id: 'COM-2026-07-01',
        benefit: 'Weekly Prediction (Week 1)',
        tier: 'Silver & Gold',
        expectedDate: '07 Jul 2026',
        deliveredDate: '06 Jul 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-011',
      },
      {
        id: 'COM-2026-07-02',
        benefit: 'Monthly Prediction',
        tier: 'Silver & Gold',
        expectedDate: '05 Jul 2026',
        deliveredDate: '01 Jul 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-009',
      },
      {
        id: 'COM-2026-07-03',
        benefit: 'Special Event Prediction',
        tier: 'Gold',
        expectedDate: '12 Jul 2026',
        deliveredDate: '11 Jul 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-015',
      },
      {
        id: 'COM-2026-07-04',
        benefit: 'Daily Prediction',
        tier: 'Followers',
        expectedDate: '18 Jul 2026',
        deliveredDate: '18 Jul 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-020',
      },
      {
        id: 'COM-2026-07-05',
        benefit: 'Free Text Questions (Silver)',
        tier: 'Silver',
        expectedDate: '15 Jul 2026',
        deliveredDate: '10 Jul 2026',
        status: 'Fulfilled',
        ref: 'QTN-2026-000720',
      },
      {
        id: 'COM-2026-07-06',
        benefit: 'Free Text Questions (Gold)',
        tier: 'Gold',
        expectedDate: '15 Jul 2026',
        deliveredDate: '08 Jul 2026',
        status: 'Fulfilled',
        ref: 'QTN-2026-000725',
      },
      {
        id: 'COM-2026-07-07',
        benefit: 'Weekly Prediction (Week 2)',
        tier: 'Silver & Gold',
        expectedDate: '14 Jul 2026',
        deliveredDate: '13 Jul 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-018',
      },
      {
        id: 'COM-2026-07-08',
        benefit: 'Weekly Prediction (Week 3)',
        tier: 'Silver & Gold',
        expectedDate: '21 Jul 2026',
        deliveredDate: '19 Jul 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-022',
      },
      {
        id: 'COM-2026-07-09',
        benefit: 'Weekly Prediction (Week 4)',
        tier: 'Silver & Gold',
        expectedDate: '28 Jul 2026',
        deliveredDate: '27 Jul 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-028',
      },
      {
        id: 'COM-2026-07-10',
        benefit: 'Guru Peyarchi Prediction',
        tier: 'Gold',
        expectedDate: '30 Jul 2026',
        deliveredDate: '29 Jul 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-030',
      },
    ],
  },
  {
    month: 'June 2026',
    isCurrent: false,
    total: 10,
    fulfilled: 9,
    pending: 0,
    missed: 1,
    percentage: 90,
    records: [
      {
        id: 'COM-2026-06-01',
        benefit: 'Weekly Prediction (Week 1)',
        tier: 'Silver & Gold',
        expectedDate: '07 Jun 2026',
        deliveredDate: '05 Jun 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-001',
      },
      {
        id: 'COM-2026-06-02',
        benefit: 'Monthly Prediction',
        tier: 'Silver & Gold',
        expectedDate: '05 Jun 2026',
        deliveredDate: '02 Jun 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-002',
      },
      {
        id: 'COM-2026-06-03',
        benefit: 'Special Event Prediction',
        tier: 'Gold',
        expectedDate: '15 Jun 2026',
        deliveredDate: '14 Jun 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-003',
      },
      {
        id: 'COM-2026-06-04',
        benefit: 'Daily Prediction',
        tier: 'Followers',
        expectedDate: '20 Jun 2026',
        deliveredDate: '20 Jun 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-004',
      },
      {
        id: 'COM-2026-06-05',
        benefit: 'Free Text Questions (Silver)',
        tier: 'Silver',
        expectedDate: '15 Jun 2026',
        deliveredDate: '12 Jun 2026',
        status: 'Fulfilled',
        ref: 'QTN-2026-000500',
      },
      {
        id: 'COM-2026-06-06',
        benefit: 'Free Text Questions (Gold)',
        tier: 'Gold',
        expectedDate: '15 Jun 2026',
        deliveredDate: '11 Jun 2026',
        status: 'Fulfilled',
        ref: 'QTN-2026-000505',
      },
      {
        id: 'COM-2026-06-07',
        benefit: 'Weekly Prediction (Week 2)',
        tier: 'Silver & Gold',
        expectedDate: '14 Jun 2026',
        deliveredDate: '13 Jun 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-005',
      },
      {
        id: 'COM-2026-06-08',
        benefit: 'Weekly Prediction (Week 3)',
        tier: 'Silver & Gold',
        expectedDate: '21 Jun 2026',
        deliveredDate: '20 Jun 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-006',
      },
      {
        id: 'COM-2026-06-09',
        benefit: 'Weekly Prediction (Week 4)',
        tier: 'Silver & Gold',
        expectedDate: '28 Jun 2026',
        deliveredDate: '27 Jun 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-007',
      },
      {
        id: 'COM-2026-06-10',
        benefit: 'Customized Event Prediction',
        tier: 'Gold',
        expectedDate: '24 Jun 2026',
        deliveredDate: '—',
        status: 'Missed',
        ref: '—',
      },
    ],
  },
]

export default function PerksAndBenefits({ defaultTab }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { questions } = useAppData()

  const computeTab = () => {
    if (defaultTab) return defaultTab
    if (location.pathname.endsWith('/delivery')) return 'delivery'
    if (location.pathname.endsWith('/history')) return 'history'
    if (location.pathname.endsWith('/settings')) return 'settings'
    const qTab = searchParams.get('tab')
    if (qTab && ['settings', 'delivery', 'history'].includes(qTab)) return qTab
    return 'settings'
  }

  // Main Section Tab state
  const [activeTab, setActiveTab] = useState(computeTab)
  const [configurationTab, setConfigurationTab] = useState('pricing')

  useEffect(() => {
    setActiveTab(computeTab())
  }, [defaultTab, location.pathname, searchParams])

  // Categories list (Expandable)
  const [categories, setCategories] = useState(INITIAL_CATEGORIES)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)

  // Tier Benefit Configurations State
  const [tierConfigs, setTierConfigs] = useState({
    Followers: {
      freeQuestions: 0,
      formats: ['Text'],
      categories: ['Daily Prediction'],
      price: 0,
    },
    Silver: {
      freeQuestions: 2,
      formats: ['Text', 'Audio'],
      categories: ['Weekly Prediction', 'Monthly Prediction'],
      price: 199,
    },
    Gold: {
      freeQuestions: 5,
      formats: ['Text', 'Audio', 'Video'],
      categories: ['Weekly Prediction', 'Monthly Prediction', 'Special Event Prediction', 'Guru Peyarchi Prediction'],
      price: 499,
    },
  })

  // Customer Overview State
  const [customerFilter, setCustomerFilter] = useState('All')
  const [customerSearch, setCustomerSearch] = useState('')

  // Modals & Feedback
  const [showSaveSummaryModal, setShowSaveSummaryModal] = useState(false)
  const [saveSuccessAlert, setSaveSuccessAlert] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState(null)

  // Deliveries & Content Creation State
  const [deliveries, setDeliveries] = useState(INITIAL_DELIVERIES)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creatingCategory, setCreatingCategory] = useState('')
  const [contentForm, setContentForm] = useState({
    title: '',
    format: 'Text',
    category: '',
    targetTier: 'Silver & Gold',
    publishDate: new Date().toISOString().slice(0, 10),
    content: '',
    status: 'Published',
  })

  // History State
  const [historyMonths, setHistoryMonths] = useState(HISTORICAL_MONTHS)
  const [selectedMonthName, setSelectedMonthName] = useState('September 2026')
  const [historyStatusFilter, setHistoryStatusFilter] = useState('All')
  const [historySearch, setHistorySearch] = useState('')

  // Calculated active commitment categories (from Settings)
  const activeCommittedCategories = useMemo(() => {
    const set = new Set()
    Object.values(tierConfigs).forEach((config) => {
      config.categories.forEach((cat) => set.add(cat))
    })
    return Array.from(set)
  }, [tierConfigs])

  const displayedCommitmentCategories = useMemo(() => {
    const referenceOrder = [
      'Weekly Prediction',
      'Monthly Prediction',
      'Special Event Prediction',
      'Guru Peyarchi Prediction',
    ]
    return referenceOrder.filter((category) => activeCommittedCategories.includes(category))
  }, [activeCommittedCategories])

  // Filtered customers list
  const filteredCustomers = useMemo(() => {
    return INITIAL_CUSTOMERS.filter((cust) => {
      const matchesTier = customerFilter === 'All' || cust.type === customerFilter
      const term = customerSearch.toLowerCase().trim()
      const matchesSearch = !term || cust.name.toLowerCase().includes(term) || cust.id.toLowerCase().includes(term)
      return matchesTier && matchesSearch
    })
  }, [customerFilter, customerSearch])

  // Customer counts
  const customerCounts = useMemo(() => {
    return {
      All: INITIAL_CUSTOMERS.length,
      Followers: INITIAL_CUSTOMERS.filter((c) => c.type === 'Follower').length,
      Silver: INITIAL_CUSTOMERS.filter((c) => c.type === 'Silver').length,
      Gold: INITIAL_CUSTOMERS.filter((c) => c.type === 'Gold').length,
    }
  }, [])

  // Apply predefined template helper
  const applyTemplate = (template) => {
    setTierConfigs((prev) => ({
      ...prev,
      [template.tier]: {
        ...prev[template.tier],
        freeQuestions: Math.min(5, template.freeQuestions),
        categories: template.categories,
        ...(typeof template.price === 'number' ? { price: template.price } : {}),
      },
    }))
    setPendingTemplate(null)
  }

  // Handle Free Question Count changes (max 5)
  const handleQuestionCountChange = (tier, delta) => {
    setTierConfigs((prev) => {
      const current = prev[tier].freeQuestions
      const next = Math.max(0, Math.min(5, current + delta))
      return {
        ...prev,
        [tier]: {
          ...prev[tier],
          freeQuestions: next,
        },
      }
    })
  }

  // Toggle Category selection for a Tier
  const toggleTierCategory = (tier, category) => {
    setTierConfigs((prev) => {
      const current = prev[tier].categories
      const exists = current.includes(category)
      const next = exists ? current.filter((c) => c !== category) : [...current, category]
      return {
        ...prev,
        [tier]: {
          ...prev[tier],
          categories: next,
        },
      }
    })
  }

  // Toggle Format for a Tier
  const toggleTierFormat = (tier, format) => {
    setTierConfigs((prev) => {
      const current = prev[tier].formats
      if (current.includes(format) && current.length === 1) return prev // keep at least 1
      const exists = current.includes(format)
      const next = exists ? current.filter((f) => f !== format) : [...current, format]
      return {
        ...prev,
        [tier]: {
          ...prev[tier],
          formats: next,
        },
      }
    })
  }

  // Handle Pricing changes
  const handlePriceChange = (tier, value) => {
    const val = Math.max(0, parseInt(value, 10) || 0)
    setTierConfigs((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        price: val,
      },
    }))
  }

  // Add custom category handler
  const handleAddCustomCategory = () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    if (!categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed])
    }
    setNewCategoryName('')
    setShowAddCategoryModal(false)
  }

  // Save Settings Changes Action
  const handleConfirmSave = () => {
    setShowSaveSummaryModal(false)
    setSaveSuccessAlert(true)

    // Automatically update current month's commitment list in History
    const newCommitmentRecords = []
    let idCounter = 1

    if (tierConfigs.Followers.categories.length > 0) {
      newCommitmentRecords.push({
        id: `COM-2026-09-${String(idCounter++).padStart(2, '0')}`,
        benefit: `Follower Perk (${tierConfigs.Followers.categories.join(', ')})`,
        tier: 'Followers',
        expectedDate: '10 Sep 2026',
        deliveredDate: '08 Sep 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-098',
      })
    }

    tierConfigs.Silver.categories.forEach((cat) => {
      newCommitmentRecords.push({
        id: `COM-2026-09-${String(idCounter++).padStart(2, '0')}`,
        benefit: cat,
        tier: 'Silver & Gold',
        expectedDate: '14 Sep 2026',
        deliveredDate: '09 Sep 2026',
        status: 'Fulfilled',
        ref: 'CNT-2026-102',
      })
    })

    if (tierConfigs.Silver.freeQuestions > 0) {
      newCommitmentRecords.push({
        id: `COM-2026-09-${String(idCounter++).padStart(2, '0')}`,
        benefit: `Free Text Questions (${tierConfigs.Silver.freeQuestions}/5)`,
        tier: 'Silver',
        expectedDate: '15 Sep 2026',
        deliveredDate: '03 Sep 2026',
        status: 'Fulfilled',
        ref: 'QTN-2026-000123',
      })
    }

    tierConfigs.Gold.categories.forEach((cat) => {
      if (!tierConfigs.Silver.categories.includes(cat)) {
        newCommitmentRecords.push({
          id: `COM-2026-09-${String(idCounter++).padStart(2, '0')}`,
          benefit: cat,
          tier: 'Gold',
          expectedDate: '18 Sep 2026',
          deliveredDate: '05 Sep 2026',
          status: 'Fulfilled',
          ref: 'CNT-2026-092',
        })
      }
    })

    if (tierConfigs.Gold.freeQuestions > 0) {
      newCommitmentRecords.push({
        id: `COM-2026-09-${String(idCounter++).padStart(2, '0')}`,
        benefit: `Free Text Questions (${tierConfigs.Gold.freeQuestions}/5)`,
        tier: 'Gold',
        expectedDate: '15 Sep 2026',
        deliveredDate: '04 Sep 2026',
        status: 'Fulfilled',
        ref: 'QTN-2026-001247',
      })
    }

    // Pending item for remaining month
    newCommitmentRecords.push({
      id: `COM-2026-09-${String(idCounter++).padStart(2, '0')}`,
      benefit: 'Weekly Prediction (Week 3)',
      tier: 'Silver & Gold',
      expectedDate: '21 Sep 2026',
      deliveredDate: '—',
      status: 'Pending',
      ref: '—',
    })

    const fulfilledCount = newCommitmentRecords.filter((r) => r.status === 'Fulfilled').length
    const pendingCount = newCommitmentRecords.filter((r) => r.status === 'Pending').length
    const missedCount = newCommitmentRecords.filter((r) => r.status === 'Missed').length
    const totalCount = newCommitmentRecords.length
    const pct = Math.round((fulfilledCount / (totalCount || 1)) * 100)

    setHistoryMonths((prev) =>
      prev.map((m) =>
        m.isCurrent
          ? {
              ...m,
              total: totalCount,
              fulfilled: fulfilledCount,
              pending: pendingCount,
              missed: missedCount,
              percentage: pct,
              records: newCommitmentRecords,
            }
          : m,
      ),
    )
  }

  // Open Create Content Modal for a specific category
  const openCreateContentModal = (categoryName) => {
    setCreatingCategory(categoryName)
    setContentForm({
      title: `${categoryName} - ${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
      format: 'Text',
      category: categoryName,
      targetTier: 'Silver & Gold',
      publishDate: new Date().toISOString().slice(0, 10),
      content: '',
      status: 'Published',
    })
    setShowCreateModal(true)
  }

  // Create & Publish Content handler
  const handlePublishContent = (e) => {
    e.preventDefault()
    if (!contentForm.title.trim()) return

    const newId = `CNT-2026-${String(Math.floor(Math.random() * 900) + 100)}`
    const newDeliveryItem = {
      id: newId,
      title: contentForm.title.trim(),
      format: contentForm.format,
      category: contentForm.category || creatingCategory,
      targetTiers: Array.isArray(contentForm.targetTier) ? contentForm.targetTier : [contentForm.targetTier],
      publishDate: contentForm.publishDate,
      status: contentForm.status,
      content: contentForm.content || 'Content published successfully.',
    }

    setDeliveries((prev) => [newDeliveryItem, ...prev])

    // Update history commitments if status is Published
    if (contentForm.status === 'Published') {
      setHistoryMonths((prev) =>
        prev.map((m) => {
          if (!m.isCurrent) return m
          const updatedRecords = m.records.map((rec) => {
            if (rec.status === 'Pending' && (rec.benefit.includes(creatingCategory) || rec.benefit.includes(contentForm.category))) {
              return {
                ...rec,
                status: 'Fulfilled',
                deliveredDate: contentForm.publishDate,
                ref: newId,
              }
            }
            return rec
          })

          const ful = updatedRecords.filter((r) => r.status === 'Fulfilled').length
          const pen = updatedRecords.filter((r) => r.status === 'Pending').length
          const mis = updatedRecords.filter((r) => r.status === 'Missed').length
          const tot = updatedRecords.length
          const pct = Math.round((ful / (tot || 1)) * 100)

          return {
            ...m,
            fulfilled: ful,
            pending: pen,
            missed: mis,
            percentage: pct,
            records: updatedRecords,
          }
        }),
      )
    }

    setShowCreateModal(false)
  }

  // Selected History Month Object
  const currentSelectedMonth = useMemo(() => {
    return historyMonths.find((m) => m.month === selectedMonthName) || historyMonths[0]
  }, [historyMonths, selectedMonthName])

  // Filtered History Records
  const filteredHistoryRecords = useMemo(() => {
    if (!currentSelectedMonth) return []
    const searchTerm = historySearch.trim().toLowerCase()
    return currentSelectedMonth.records.filter((record) => {
      const matchesStatus = historyStatusFilter === 'All' || record.status === historyStatusFilter
      const matchesSearch = !searchTerm || [record.benefit, record.tier, record.ref].some((value) => value.toLowerCase().includes(searchTerm))
      return matchesStatus && matchesSearch
    })
  }, [currentSelectedMonth, historyStatusFilter, historySearch])

  return (
    <div className="perks-benefits-page">
      <PageHeader
        eyebrow="Astrologer Workspace"
        title="Perks & Benefits"
        subtitle="Manage customer benefits, free perks, subscription plans, and monthly commitments."
      />

      {/* Main Tab Navigation */}
      <Section className="mt-4">
        <div className="perks-tab-navigation">
          <button
            type="button"
            className={`perks-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SlidersHorizontal size={18} />
            <span>1. Settings</span>
          </button>
          <button
            type="button"
            className={`perks-tab-btn ${activeTab === 'delivery' ? 'active' : ''}`}
            onClick={() => setActiveTab('delivery')}
          >
            <Send size={18} />
            <span>2. Benefit Management</span>
            {deliveries.length > 0 && <span className="tab-pill-count">{activeCommittedCategories.length} Active</span>}
          </button>
          <button
            type="button"
            className={`perks-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={18} />
            <span>3. History</span>
            <span className="tab-pill-badge">{currentSelectedMonth?.percentage}% Fulfilled</span>
          </button>
        </div>
      </Section>

      {/* ========================================================================= */}
      {/* 1. PERKS & BENEFITS SETTINGS TAB                                         */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="perks-settings-flow">
          {/* A. CUSTOMER OVERVIEW */}
          <Section title="Customer Overview & Subscription Breakdown" icon={Users}>
            <Card>
              <div className="search-filter-row">
                <div className="search-filter-row__group">
                  <div className="customer-overview-tabs">
                    {['All', 'Followers', 'Silver', 'Gold'].map((filterItem) => (
                      <button
                        key={filterItem}
                        type="button"
                        className={`customer-tab-chip ${customerFilter === filterItem ? 'active' : ''}`}
                        onClick={() => setCustomerFilter(filterItem)}
                      >
                        {filterItem}
                        <span className="customer-tab-count">{customerCounts[filterItem]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="search-bar" style={{ maxWidth: 320 }}>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by customer name or ID..."
                    className="text-input search-bar__input"
                  />
                  <Search size={16} className="muted" style={{ position: 'absolute', right: 12, top: 12 }} />
                </div>
              </div>

              {/* Customer Table */}
              <div className="table-wrapper mt-4">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Customer Type</th>
                      <th>Registration Date</th>
                      <th>Subscription Date</th>
                      <th>Amount Spent</th>
                      <th>Subscription Status</th>
                      <th>Free Questions Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center muted py-6">
                          No matching customers found for this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust) => (
                        <tr key={cust.id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="avatar-circle-sm">
                                {cust.name.split(' ').map((n) => n[0]).join('')}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{cust.name}</div>
                                <div className="muted" style={{ fontSize: 12 }}>ID: {cust.id}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                cust.type === 'Gold'
                                  ? 'badge-gold'
                                  : cust.type === 'Silver'
                                  ? 'badge-blue'
                                  : 'badge-gray'
                              }`}
                            >
                              {cust.type}
                            </span>
                          </td>
                          <td>{cust.regDate}</td>
                          <td>{cust.subDate}</td>
                          <td style={{ fontWeight: 600 }}>₹{cust.amountSpent.toLocaleString('en-IN')}</td>
                          <td>
                            <StatusBadge label={cust.status} />
                          </td>
                          <td>
                            {cust.allocatedQuestions > 0 ? (
                              <div className="flex flex-col">
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                                  {cust.usedQuestions} / {cust.allocatedQuestions} Used
                                </span>
                                <span className="muted" style={{ fontSize: 11 }}>
                                  ({cust.allocatedQuestions - cust.usedQuestions} Remaining)
                                </span>
                                {cust.latestQuestionId && (
                                  <button
                                    type="button"
                                    className="link-btn text-left mt-0.5"
                                    onClick={() => navigate(`/astrologer/text-based-questions?questionId=${cust.latestQuestionId}`)}
                                    style={{ fontSize: 11 }}
                                  >
                                    View Qtn ({cust.latestQuestionId})
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="muted" style={{ fontSize: 13 }}>0 Allocated (Free)</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </Section>

        </div>
      )}

      {activeTab === 'settings' && (
        <div className="perks-settings-flow">
          <Section
            title="Benefit Configuration"
            icon={Gift}
          >
            <div className="benefit-configuration-tabs" role="tablist" aria-label="Benefit configuration">
              {[
                ['pricing', 'Subscription Pricing'],
                ['templates', 'Benefit Templates'],
                ['questions', 'Free Questions'],
                ['formats', 'Content Formats'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={configurationTab === id}
                  className={`benefit-configuration-tab${configurationTab === id ? ' active' : ''}`}
                  onClick={() => setConfigurationTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Quick Template Selector */}
            {configurationTab === 'templates' && (
            <div className="template-banner-card mb-6">
              <div className="flex items-center gap-3">
                <div className="template-icon-circle">
                  <Sparkles size={22} color="var(--violet-600)" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Predefined Benefit Templates</h3>
                  <p className="muted" style={{ fontSize: 13 }}>
                    Apply a tier preset, then review and customize it before saving your configuration.
                  </p>
                </div>
              </div>
              <div className="benefit-template-grid mt-4">
                {BENEFIT_TEMPLATES.map((template) => (
                  <div className="benefit-template-option" key={template.id}>
                    <h4>{template.name}</h4>
                    <ul>
                      {template.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
                    </ul>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => setPendingTemplate(template)}>
                      <Check size={14} /> Apply {template.name.split(' ')[0]} Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Tier Configuration Cards Grid */}
            {configurationTab === 'pricing' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* FOLLOWERS TIER */}
              <Card className="tier-config-card">
                <div className="tier-card-header tier-card-header--followers">
                  <div>
                    <span className="badge badge-gray mb-1">FREE TIER</span>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Followers</h3>
                  </div>
                  <div className="tier-price-tag font-bold text-lg">₹0 / month</div>
                </div>

                <div className="tier-card-body">
                  {/* Free Text Questions */}
                  <div className="tier-section">
                    <label className="field-label-top flex items-center justify-between">
                      <span>Free Text Questions</span>
                      <strong className="text-violet">{tierConfigs.Followers.freeQuestions} / 5</strong>
                    </label>
                    <div className="counter-control-row">
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() => handleQuestionCountChange('Followers', -1)}
                        disabled={tierConfigs.Followers.freeQuestions <= 0}
                      >
                        -
                      </button>
                      <span className="counter-display">{tierConfigs.Followers.freeQuestions}</span>
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() => handleQuestionCountChange('Followers', 1)}
                        disabled={tierConfigs.Followers.freeQuestions >= 5}
                      >
                        +
                      </button>
                    </div>
                    <span className="muted" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                      Max 5 allowed per tier. Reuses Text Based Questions queue.
                    </span>
                  </div>

                  {/* Free Content Formats */}
                  <div className="tier-section mt-4">
                    <label className="field-label-top">Free Content Formats</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {['Text', 'Audio', 'Video'].map((fmt) => {
                        const isChecked = tierConfigs.Followers.formats.includes(fmt)
                        return (
                          <button
                            key={fmt}
                            type="button"
                            className={`format-chip ${isChecked ? 'active' : ''}`}
                            onClick={() => toggleTierFormat('Followers', fmt)}
                          >
                            {fmt === 'Text' && <FileText size={14} />}
                            {fmt === 'Audio' && <Mic size={14} />}
                            {fmt === 'Video' && <Video size={14} />}
                            <span>{fmt}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Content Categories */}
                  <div className="tier-section mt-4">
                    <label className="field-label-top">Eligible Content Categories</label>
                    <div className="category-checklist mt-2">
                      {categories.map((cat) => {
                        const checked = tierConfigs.Followers.categories.includes(cat)
                        return (
                          <label key={cat} className="category-check-item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTierCategory('Followers', cat)}
                            />
                            <span>{cat}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Card>

              {/* SILVER SUBSCRIBERS TIER */}
              <Card className="tier-config-card tier-config-card--silver">
                <div className="tier-card-header tier-card-header--silver">
                  <div>
                    <span className="badge badge-blue mb-1">PAID / LOWER PRICE</span>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Silver Subscribers</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: 14, fontWeight: 600 }}>₹</span>
                    <input
                      type="number"
                      value={tierConfigs.Silver.price}
                      onChange={(e) => handlePriceChange('Silver', e.target.value)}
                      className="price-input"
                    />
                    <span style={{ fontSize: 12 }} className="muted">/ mo</span>
                  </div>
                </div>

                <div className="tier-card-body">
                  {/* Free Text Questions */}
                  <div className="tier-section">
                    <label className="field-label-top flex items-center justify-between">
                      <span>Free Text Questions</span>
                      <strong className="text-blue">{tierConfigs.Silver.freeQuestions} / 5</strong>
                    </label>
                    <div className="counter-control-row">
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() => handleQuestionCountChange('Silver', -1)}
                        disabled={tierConfigs.Silver.freeQuestions <= 0}
                      >
                        -
                      </button>
                      <span className="counter-display">{tierConfigs.Silver.freeQuestions}</span>
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() => handleQuestionCountChange('Silver', 1)}
                        disabled={tierConfigs.Silver.freeQuestions >= 5}
                      >
                        +
                      </button>
                    </div>
                    <span className="muted" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                      Allocated free questions: {tierConfigs.Silver.freeQuestions} / 5 max
                    </span>
                  </div>

                  {/* Free Content Formats */}
                  <div className="tier-section mt-4">
                    <label className="field-label-top">Free Content Formats</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {['Text', 'Audio', 'Video'].map((fmt) => {
                        const isChecked = tierConfigs.Silver.formats.includes(fmt)
                        return (
                          <button
                            key={fmt}
                            type="button"
                            className={`format-chip ${isChecked ? 'active' : ''}`}
                            onClick={() => toggleTierFormat('Silver', fmt)}
                          >
                            {fmt === 'Text' && <FileText size={14} />}
                            {fmt === 'Audio' && <Mic size={14} />}
                            {fmt === 'Video' && <Video size={14} />}
                            <span>{fmt}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Content Categories */}
                  <div className="tier-section mt-4">
                    <label className="field-label-top">Eligible Content Categories</label>
                    <div className="category-checklist mt-2">
                      {categories.map((cat) => {
                        const checked = tierConfigs.Silver.categories.includes(cat)
                        return (
                          <label key={cat} className="category-check-item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTierCategory('Silver', cat)}
                            />
                            <span>{cat}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Card>

              {/* GOLD SUBSCRIBERS TIER */}
              <Card className="tier-config-card tier-config-card--gold">
                <div className="tier-card-header tier-card-header--gold">
                  <div>
                    <span className="badge badge-gold mb-1">PAID / HIGHER PRICE</span>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Gold Subscribers</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: 14, fontWeight: 600 }}>₹</span>
                    <input
                      type="number"
                      value={tierConfigs.Gold.price}
                      onChange={(e) => handlePriceChange('Gold', e.target.value)}
                      className="price-input"
                    />
                    <span style={{ fontSize: 12 }} className="muted">/ mo</span>
                  </div>
                </div>

                <div className="tier-card-body">
                  {/* Free Text Questions */}
                  <div className="tier-section">
                    <label className="field-label-top flex items-center justify-between">
                      <span>Free Text Questions</span>
                      <strong className="text-gold">{tierConfigs.Gold.freeQuestions} / 5</strong>
                    </label>
                    <div className="counter-control-row">
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() => handleQuestionCountChange('Gold', -1)}
                        disabled={tierConfigs.Gold.freeQuestions <= 0}
                      >
                        -
                      </button>
                      <span className="counter-display">{tierConfigs.Gold.freeQuestions}</span>
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() => handleQuestionCountChange('Gold', 1)}
                        disabled={tierConfigs.Gold.freeQuestions >= 5}
                      >
                        +
                      </button>
                    </div>
                    <span className="muted" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                      Allocated free questions: {tierConfigs.Gold.freeQuestions} / 5 max
                    </span>
                  </div>

                  {/* Free Content Formats */}
                  <div className="tier-section mt-4">
                    <label className="field-label-top">Free Content Formats</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {['Text', 'Audio', 'Video'].map((fmt) => {
                        const isChecked = tierConfigs.Gold.formats.includes(fmt)
                        return (
                          <button
                            key={fmt}
                            type="button"
                            className={`format-chip ${isChecked ? 'active' : ''}`}
                            onClick={() => toggleTierFormat('Gold', fmt)}
                          >
                            {fmt === 'Text' && <FileText size={14} />}
                            {fmt === 'Audio' && <Mic size={14} />}
                            {fmt === 'Video' && <Video size={14} />}
                            <span>{fmt}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Content Categories */}
                  <div className="tier-section mt-4">
                    <label className="field-label-top">Eligible Content Categories</label>
                    <div className="category-checklist mt-2">
                      {categories.map((cat) => {
                        const checked = tierConfigs.Gold.categories.includes(cat)
                        return (
                          <label key={cat} className="category-check-item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTierCategory('Gold', cat)}
                            />
                            <span>{cat}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            )}

            {configurationTab === 'questions' && (
              <div className="benefit-configuration-control-grid">
                {['Followers', 'Silver', 'Gold'].map((tier) => (
                  <Card key={tier} className="benefit-configuration-control-card">
                    <h3>{tier === 'Followers' ? 'Followers' : `${tier} Subscribers`}</h3>
                    <label className="field-label-top flex items-center justify-between">
                      <span>Free Text Questions</span>
                      <strong>{tierConfigs[tier].freeQuestions} / 5</strong>
                    </label>
                    <div className="counter-control-row">
                      <button type="button" className="counter-btn" onClick={() => handleQuestionCountChange(tier, -1)} disabled={tierConfigs[tier].freeQuestions <= 0}>-</button>
                      <span className="counter-display">{tierConfigs[tier].freeQuestions}</span>
                      <button type="button" className="counter-btn" onClick={() => handleQuestionCountChange(tier, 1)} disabled={tierConfigs[tier].freeQuestions >= 5}>+</button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {configurationTab === 'formats' && (
              <div className="benefit-configuration-control-grid">
                {['Followers', 'Silver', 'Gold'].map((tier) => (
                  <Card key={tier} className="benefit-configuration-control-card">
                    <h3>{tier === 'Followers' ? 'Followers' : `${tier} Subscribers`}</h3>
                    <label className="field-label-top">Free Content Formats</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['Text', 'Audio', 'Video'].map((format) => {
                        const isChecked = tierConfigs[tier].formats.includes(format)
                        return <button key={format} type="button" className={`format-chip ${isChecked ? 'active' : ''}`} onClick={() => toggleTierFormat(tier, format)}>{format === 'Text' && <FileText size={14} />}{format === 'Audio' && <Mic size={14} />}{format === 'Video' && <Video size={14} />}<span>{format}</span></button>
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* SAVE BUTTON ROW */}
            {configurationTab !== 'templates' && <div className="flex justify-end mt-6">
              <button
                type="button"
                className="btn btn-primary btn-lg flex items-center gap-2"
                onClick={() => setShowSaveSummaryModal(true)}
              >
                <CheckCircle2 size={18} />
                <span>Save Changes</span>
              </button>
            </div>}
          </Section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CONTENT DELIVERY TAB                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'delivery' && (
        <div className="content-delivery-flow">
          <Section
            title="Active Benefit Commitments for Content Delivery"
            icon={Send}
            subtitle="Only showing content categories configured in Settings."
          >
            {displayedCommitmentCategories.length === 0 ? (
              <Card className="text-center py-8">
                <AlertCircle size={32} className="muted mx-auto mb-2" />
                <h4 style={{ fontWeight: 700 }}>No Benefits Configured Yet</h4>
                <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  Please go to Perks & Benefits Settings and select content categories for Silver or Gold tiers.
                </p>
                <button
                  type="button"
                  className="btn btn-primary mt-4"
                  onClick={() => setActiveTab('settings')}
                >
                  Configure Benefits in Settings
                </button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {displayedCommitmentCategories.map((catName) => {
                  const eligibleTiers = []
                  if (tierConfigs.Followers.categories.includes(catName)) eligibleTiers.push('Followers')
                  if (tierConfigs.Silver.categories.includes(catName)) eligibleTiers.push('Silver')
                  if (tierConfigs.Gold.categories.includes(catName)) eligibleTiers.push('Gold')

                  const matchingDeliveries = deliveries.filter((d) => d.category === catName)
                  const BenefitIcon = catName === 'Weekly Prediction'
                    ? Calendar
                    : catName === 'Monthly Prediction'
                      ? CalendarDays
                      : catName === 'Special Event Prediction'
                        ? Sparkles
                        : FileText

                  return (
                    <Card key={catName} className="delivery-commitment-card">
                      <div className="delivery-commitment-card__header">
                        <div>
                          <span className="badge badge-violet mb-1">COMMITTED BENEFIT</span>
                          <h4 style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{catName}</h4>
                        </div>
                        <div className="delivery-commitment-card__icon"><BenefitIcon size={18} /></div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <span className="muted" style={{ fontSize: 12 }}>Target Tiers:</span>
                        {eligibleTiers.map((t) => (
                          <span
                            key={t}
                            className={`badge ${
                              t === 'Gold' ? 'badge-gold' : t === 'Silver' ? 'badge-blue' : 'badge-gray'
                            }`}
                            style={{ fontSize: 11 }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="delivery-card-footer mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="muted" style={{ fontSize: 12 }}>
                          Deliveries: <strong>{matchingDeliveries.length} Published</strong>
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-600)' }}>
                          Status: Active Commitment
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm flex items-center justify-center gap-1 mt-4 w-full"
                        onClick={() => openCreateContentModal(catName)}
                      >
                        <Plus size={14} /> Create Content
                      </button>
                    </Card>
                  )
                })}
              </div>
            )}
          </Section>

          {/* PUBLISHED / CREATED CONTENT LIST */}
          <Section title="Content Delivery Records & Queue" icon={FileText} className="mt-6">
            <Card>
              {deliveries.length === 0 ? (
                <div className="muted text-center py-6">No content created yet. Click "Create Content" above.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deliveries.map((item) => (
                    <div key={item.id} className="delivery-record-item">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="format-badge-icon">
                            {item.format === 'Text' && <FileText size={16} color="var(--violet-600)" />}
                            {item.format === 'Audio' && <Mic size={16} color="var(--orange-500)" />}
                            {item.format === 'Video' && <Video size={16} color="var(--sky-600)" />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{item.title}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              ID: {item.id} · Category: {item.category}
                            </div>
                          </div>
                        </div>
                        <StatusBadge label={item.status} />
                      </div>

                      <p className="content-preview-text mt-2">“{item.content}”</p>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 muted" style={{ fontSize: 12 }}>
                        <span>Target: {Array.isArray(item.targetTiers) ? item.targetTiers.join(', ') : item.targetTiers}</span>
                        <span>Published: {item.publishDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PERKS & BENEFITS HISTORY TAB                                          */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="perks-history-flow">
          {/* CURRENT / HISTORICAL MONTH SUMMARY HEADER */}
          <Section
            title={<span className="history-summary-heading"><span>{`Commitment Fulfillment Summary — ${currentSelectedMonth.month}`}</span><small>Track your monthly commitment progress and delivery status at a glance.</small></span>}
            icon={History}
            titleRight={
              <div className="history-month-select-card">
                <Calendar size={16} />
                <span>Select Month</span>
                <select
                  value={selectedMonthName}
                  onChange={(e) => setSelectedMonthName(e.target.value)}
                  aria-label="Select month"
                >
                  {historyMonths.map((m) => (
                    <option key={m.month} value={m.month}>
                      {m.month} {m.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            {/* Historical Month Quick Selector Cards */}
            <div className="history-month-grid">
              {historyMonths.map((m) => (
                <button
                  key={m.month}
                  type="button"
                  className={`history-month-card ${m.month === selectedMonthName ? 'active' : ''}`}
                  onClick={() => setSelectedMonthName(m.month)}
                >
                  <div className="history-month-card__top">
                    <Calendar size={17} />
                    {m.isCurrent && <span className="history-month-current-badge">Current</span>}
                  </div>
                  <div className="history-month-card__name">{m.month}</div>
                  <div className="history-month-card__percentage">{m.percentage}%</div>
                  <div className="history-month-card__label">Fulfilled</div>
                </button>
              ))}
            </div>

            <Card className="history-summary-card">
              <div className="history-summary-metric history-summary-metric--rate">
                <span className="history-summary-icon"><History size={17} /></span>
                <div><span>Fulfillment Rate</span><strong>{currentSelectedMonth.percentage}%</strong></div>
                <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${currentSelectedMonth.percentage}%` }} /></div>
              </div>
              <div className="history-summary-metric">
                <span className="history-summary-icon"><FileText size={17} /></span>
                <div><span>Total Commitments</span><strong>{currentSelectedMonth.total}</strong><small>Monthly perks committed</small></div>
              </div>
              <div className="history-summary-metric history-summary-metric--fulfilled">
                <span className="history-summary-icon"><CheckCircle2 size={17} /></span>
                <div><span>Fulfilled</span><strong>{currentSelectedMonth.fulfilled}</strong><small>Delivered on time</small></div>
              </div>
              <div className="history-summary-metric history-summary-metric--pending">
                <span className="history-summary-icon"><Clock size={17} /></span>
                <div><span>Pending</span><strong>{currentSelectedMonth.pending}</strong><small>Within delivery window</small></div>
              </div>
              <div className="history-summary-metric history-summary-metric--missed">
                <span className="history-summary-icon"><AlertCircle size={17} /></span>
                <div><span>Missed</span><strong>{currentSelectedMonth.missed}</strong><small>Past expected deadline</small></div>
              </div>
            </Card>
          </Section>

          {/* COMMITMENT RECORDS TABLE */}
          <Section title="Commitment Records & Delivery Status" icon={CheckCircle2} className="mt-6">
            <Card className="history-records-card">
              <div className="history-records-toolbar">
                <div className="flex items-center gap-2">
                  <span className="muted" style={{ fontSize: 13 }}>Filter Status:</span>
                  {['All', 'Fulfilled', 'Pending', 'Missed'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`status-filter-btn ${historyStatusFilter === st ? 'active' : ''}`}
                      onClick={() => setHistoryStatusFilter(st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <div className="history-records-toolbar__right">
                  <label className="history-records-search">
                    <Search size={16} />
                    <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search records" aria-label="Search records" />
                  </label>
                  <span className="muted" style={{ fontSize: 13 }}>Showing {filteredHistoryRecords.length} records</span>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Committed Benefit</th>
                      <th>Customer Tier</th>
                      <th>Expected Date</th>
                      <th>Delivered Date</th>
                      <th>Status</th>
                      <th>Content / Question Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryRecords.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center muted py-6">
                          No commitment records matching status filter.
                        </td>
                      </tr>
                    ) : (
                      filteredHistoryRecords.map((record) => (
                        <tr key={record.id}>
                          <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{record.benefit}</td>
                          <td>
                            <span
                              className={`badge ${
                                record.tier.includes('Gold')
                                  ? 'badge-gold'
                                  : record.tier.includes('Silver')
                                  ? 'badge-blue'
                                  : 'badge-gray'
                              }`}
                            >
                              {record.tier}
                            </span>
                          </td>
                          <td>{record.expectedDate}</td>
                          <td>{record.deliveredDate}</td>
                          <td>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                record.status === 'Fulfilled'
                                  ? 'bg-[color:var(--success-bg)] text-[color:var(--green-600)]'
                                  : record.status === 'Pending'
                                  ? 'bg-[color:var(--warning-bg)] text-[color:var(--amber-600)]'
                                  : 'bg-[color:var(--danger-bg)] text-[color:var(--red-600)]'
                              }`}
                            >
                              <span className="h-[7px] w-[7px] rounded-full bg-current" />
                              {record.status}
                            </span>
                          </td>
                          <td>
                            {record.ref !== '—' ? (
                              record.ref.startsWith('QTN-') ? (
                                <button
                                  type="button"
                                  className="link-btn"
                                  onClick={() => navigate(`/astrologer/text-based-questions?questionId=${record.ref}`)}
                                >
                                  {record.ref}
                                </button>
                              ) : (
                                <span className="badge badge-violet" style={{ fontSize: 12 }}>
                                  {record.ref}
                                </span>
                              )
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </Section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* SAVE SUMMARY COMPACT MODAL */}
      {showSaveSummaryModal &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowSaveSummaryModal(false)}>
            <div
              className="modal-card modal-card--scroll"
              style={{ width: 'min(580px, calc(100vw - 32px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-card__header flex items-center justify-between">
                <div>
                  <h3 className="astrologer-modal-title">Confirm Monthly Benefit Commitments</h3>
                  <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    Review your updated perk settings before saving.
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowSaveSummaryModal(false)}
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="modal-card__content">
                <div className="summary-compact-box">
                  <div className="summary-row">
                    <span className="muted">Silver Subscription Price:</span>
                    <strong>₹{tierConfigs.Silver.price} / month</strong>
                  </div>
                  <div className="summary-row">
                    <span className="muted">Gold Subscription Price:</span>
                    <strong>₹{tierConfigs.Gold.price} / month</strong>
                  </div>
                  <div className="summary-row">
                    <span className="muted">Followers Free Questions:</span>
                    <strong>{tierConfigs.Followers.freeQuestions} / 5</strong>
                  </div>
                  <div className="summary-row">
                    <span className="muted">Silver Free Questions:</span>
                    <strong>{tierConfigs.Silver.freeQuestions} / 5</strong>
                  </div>
                  <div className="summary-row">
                    <span className="muted">Gold Free Questions:</span>
                    <strong>{tierConfigs.Gold.freeQuestions} / 5</strong>
                  </div>
                  <div className="summary-row">
                    <span className="muted">Selected Content Formats:</span>
                    <strong>
                      {Array.from(
                        new Set([
                          ...tierConfigs.Followers.formats,
                          ...tierConfigs.Silver.formats,
                          ...tierConfigs.Gold.formats,
                        ]),
                      ).join(', ')}
                    </strong>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="field-label-top">Active Committed Categories ({activeCommittedCategories.length}):</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {activeCommittedCategories.map((c) => (
                      <span key={c} className="badge badge-violet">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="muted text-xs mt-4">
                  Saving these choices will make them your official monthly benefit commitments for customer subscribers.
                </p>
              </div>

              <div className="modal-card__footer flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowSaveSummaryModal(false)}
                >
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleConfirmSave}>
                  Confirm & Commit
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* CREATE CONTENT MODAL */}
      {showCreateModal &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div
              className="modal-card modal-card--scroll"
              style={{ width: 'min(620px, calc(100vw - 32px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-card__header flex items-center justify-between">
                <div>
                  <h3 className="astrologer-modal-title">Create & Publish Committed Content</h3>
                  <p className="muted" style={{ fontSize: 12 }}>
                    Category: <strong>{creatingCategory}</strong>
                  </p>
                </div>
                <button type="button" className="icon-btn" onClick={() => setShowCreateModal(false)}>
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handlePublishContent}>
                <div className="modal-card__content grid gap-4">
                  <div>
                    <label className="field-label-top">Content Format</label>
                    <div className="flex gap-3 mt-1">
                      {['Text', 'Audio', 'Video'].map((fmt) => (
                        <label key={fmt} className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                          <input
                            type="radio"
                            name="contentFormat"
                            value={fmt}
                            checked={contentForm.format === fmt}
                            onChange={(e) => setContentForm((prev) => ({ ...prev, format: e.target.value }))}
                          />
                          {fmt === 'Text' && <FileText size={15} />}
                          {fmt === 'Audio' && <Mic size={15} />}
                          {fmt === 'Video' && <Video size={15} />}
                          {fmt}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="field-label-top">Content Title *</label>
                    <input
                      type="text"
                      required
                      value={contentForm.title}
                      onChange={(e) => setContentForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Weekly Prediction for Sep Week 2"
                      className="text-input w-full"
                    />
                  </div>

                  <div>
                    <label className="field-label-top">Target Customer Tier</label>
                    <select
                      value={contentForm.targetTier}
                      onChange={(e) => setContentForm((prev) => ({ ...prev, targetTier: e.target.value }))}
                      className="select-input w-full"
                    >
                      <option value="Followers">Followers Only</option>
                      <option value="Silver">Silver Subscribers Only</option>
                      <option value="Gold">Gold Subscribers Only</option>
                      <option value="Silver & Gold">Silver & Gold (Multiple Tiers)</option>
                      <option value="All Tiers">All Tiers (Followers, Silver & Gold)</option>
                    </select>
                  </div>

                  {contentForm.format === 'Text' && (
                    <div>
                      <label className="field-label-top">Prediction Description / Content</label>
                      <textarea
                        rows={4}
                        value={contentForm.content}
                        onChange={(e) => setContentForm((prev) => ({ ...prev, content: e.target.value }))}
                        placeholder="Write your prediction content here..."
                        className="textarea-box w-full"
                      />
                    </div>
                  )}

                  {contentForm.format === 'Audio' && (
                    <div>
                      <label className="field-label-top">Audio File Upload / Record Option</label>
                      <div className="upload-box-simulated">
                        <Mic size={24} className="muted mb-1" />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Click to Upload MP3 / Record Audio</span>
                        <span className="muted" style={{ fontSize: 11 }}>Max 50MB audio stream format</span>
                      </div>
                    </div>
                  )}

                  {contentForm.format === 'Video' && (
                    <div>
                      <label className="field-label-top">Video File Upload</label>
                      <div className="upload-box-simulated">
                        <Video size={24} className="muted mb-1" />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Click to Upload MP4 / Video Recording</span>
                        <span className="muted" style={{ fontSize: 11 }}>Supported formats: MP4, MOV (Max 200MB)</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label-top">Publish Date</label>
                      <input
                        type="date"
                        value={contentForm.publishDate}
                        onChange={(e) => setContentForm((prev) => ({ ...prev, publishDate: e.target.value }))}
                        className="text-input w-full"
                      />
                    </div>

                    <div>
                      <label className="field-label-top">Status</label>
                      <select
                        value={contentForm.status}
                        onChange={(e) => setContentForm((prev) => ({ ...prev, status: e.target.value }))}
                        className="select-input w-full"
                      >
                        <option value="Published">Published (Marks Commitment Fulfilled)</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-card__footer flex justify-end gap-2">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Publish Content
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {pendingTemplate &&
        createPortal(
          <div className="modal-overlay" onClick={() => setPendingTemplate(null)}>
            <div
              className="modal-card"
              style={{ width: 'min(460px, calc(100vw - 32px))' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-card__header">
                <h3 className="astrologer-modal-title">Apply {pendingTemplate.name}?</h3>
              </div>
              <div className="modal-card__content">
                <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                  This will populate the {pendingTemplate.tier} settings. You can review and customize them before saving.
                </p>
                <ul className="benefit-template-confirmation-list">
                  {pendingTemplate.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
                </ul>
              </div>
              <div className="modal-card__footer flex justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setPendingTemplate(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={() => applyTemplate(pendingTemplate)}>Apply Template</button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ADD CUSTOM CATEGORY MODAL */}
      {showAddCategoryModal &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowAddCategoryModal(false)}>
            <div
              className="modal-card"
              style={{ width: 'min(440px, calc(100vw - 32px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-card__header flex items-center justify-between">
                <h3 className="astrologer-modal-title">Add Custom Content Category</h3>
                <button type="button" className="icon-btn" onClick={() => setShowAddCategoryModal(false)}>
                  <XCircle size={18} />
                </button>
              </div>

              <div className="modal-card__content">
                <label className="field-label-top">New Category Name</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Navratri Special, Surya Transit..."
                  className="text-input w-full mt-1"
                />
              </div>

              <div className="modal-card__footer flex justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddCategoryModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!newCategoryName.trim()}
                  onClick={handleAddCustomCategory}
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* SUCCESS ALERT TOAST */}
      {saveSuccessAlert && (
        <SuccessAlert
          message="Perks & Benefits settings saved! Monthly commitments updated."
          onDismiss={() => setSaveSuccessAlert(false)}
        />
      )}
    </div>
  )
}
