/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { sortByDateDesc } from '../utils/date.js'
import { ROLES } from '../utils/roleRoutes.js'
import { mockAppointments, mockAstrologers, mockLiveSessions, mockPoojas } from '../data/notificationData.js'

const AppDataContext = createContext(null)

const DEFAULT_CAMPAIGN_CATEGORIES = [
  { name: 'Marriage', normalPrice: 200, discountPercent: 70, compulsoryQuestions: 150 },
  { name: 'Career', normalPrice: 200, discountPercent: 80, compulsoryQuestions: 150 },
  { name: 'Love', normalPrice: 200, discountPercent: 90, compulsoryQuestions: 150 },
  { name: 'Study', normalPrice: 200, discountPercent: 40, compulsoryQuestions: 150 },
]

const HEALTH_CAMPAIGN_CATEGORIES = [
  { name: 'Health', normalPrice: 200, discountPercent: 70, compulsoryQuestions: 150 },
]

const CAREER_CAMPAIGN_CATEGORIES = [
  { name: 'Career', normalPrice: 200, discountPercent: 80, compulsoryQuestions: 150 },
]

const ANSWER_REVIEW_WINDOW_MS = 5 * 60 * 60 * 1000

const initialCampaigns = [
  {
    id: 'july-premium',
    categories: HEALTH_CAMPAIGN_CATEGORIES,
    name: 'Health Campaign',
    date: '31 Jul 2026',
    endDate: '31 Aug 2026',
    priority: 'High',
    status: 'Active',
    discountPercent: 70,
    generalOffer: true,
    personalOffer: true,
    generalPrice: 100,
    personalPrice: 250,
    packagePrice: 2000,
    purchasedGeneral: 12,
    purchasedPersonal: 6,
    totalLimit: 30,
    generalLimit: 18,
    personalLimit: 12,
  },
  {
    id: 'festival-special',
    categories: CAREER_CAMPAIGN_CATEGORIES,
    name: 'Career Campaign',
    date: '15 Aug 2026',
    endDate: '20 Sep 2026',
    priority: 'Medium',
    status: 'Draft',
    discountPercent: 80,
    generalOffer: true,
    personalOffer: false,
    generalPrice: 120,
    personalPrice: 275,
    packagePrice: 2400,
    purchasedGeneral: 4,
    purchasedPersonal: 1,
    totalLimit: 20,
    generalLimit: 10,
    personalLimit: 10,
  },
  {
    id: 'vip-subscribers',
    categories: DEFAULT_CAMPAIGN_CATEGORIES,
    name: 'VIP Subscribers',
    date: '05 Sep 2026',
    endDate: '05 Oct 2026',
    priority: 'Low',
    status: 'Closed',
    discountPercent: 0,
    generalOffer: false,
    personalOffer: true,
    generalPrice: 150,
    personalPrice: 300,
    packagePrice: 2600,
    purchasedGeneral: 0,
    purchasedPersonal: 0,
    totalLimit: 10,
    generalLimit: 5,
    personalLimit: 5,
  },
]

const initialPurchasedSlots = initialCampaigns
  .filter((campaign) => campaign.purchasedGeneral > 0 || campaign.purchasedPersonal > 0)
  .map((campaign) => ({
    id: `slots-user-demo-${campaign.id}`,
    userId: 'user-demo',
    campaignId: campaign.id,
    generalPurchased: campaign.purchasedGeneral,
    generalUsed: 0,
    personalPurchased: campaign.purchasedPersonal,
    personalUsed: 0,
  }))

const initialQuestions = [
  {
    id: 'QTN-2026-000123',
    user: 'Priya V.',
    submittedByUserId: 'user-demo',
    submittedByEmail: 'user@astroconnect.com',
    category: 'Health',
    type: 'Personal',
    purchaseType: 'Paid',
    purchaseAmount: 250,
    refundAmount: 0,
    refundStatus: 'None',
    questionFor: 'Self',
    language: 'Tamil',
    status: 'In Progress',
    priority: 'High',
    campaignId: 'july-premium',
    campaignName: 'Health Campaign',
    raised: '21-Jul-2026 10:30 AM',
    question: 'When is the right time for my marriage?',
    answer: '',
    draftAnswer: 'Looking at your chart, the next supportive period is...',
    horoscopeMode: 'Use Saved Horoscope',
    attachments: ['BirthChart.pdf'],
    previousQuestions: ['Marriage Question - Answered', 'Career Question - Closed'],
    dispute: null,
    history: ['Created by user', 'Assigned to astrologer'],
    raisedAt: '2026-07-21T10:30:00+05:30',
  },
  {
    id: 'QTN-2026-000124',
    user: 'Kannan',
    submittedByUserId: 'user-demo',
    submittedByEmail: 'user@astroconnect.com',
    category: 'Health',
    type: 'General',
    purchaseType: 'Free',
    purchaseAmount: 0,
    refundAmount: 0,
    refundStatus: 'None',
    questionFor: 'Business',
    language: 'English',
    status: 'Pending',
    priority: 'Medium',
    campaignId: 'july-premium',
    campaignName: 'Health Campaign',
    raised: '22-Jul-2026 01:15 PM',
    question: 'Should I expand my business this quarter?',
    answer: '',
    draftAnswer: '',
    horoscopeMode: 'Continue Without Horoscope',
    attachments: [],
    previousQuestions: ['Business Question - Pending'],
    dispute: null,
    history: ['Queued for review'],
    raisedAt: '2026-07-22T13:15:00+05:30',
  },
  {
    id: 'QTN-2026-000125',
    user: 'Devi',
    submittedByUserId: 'user-demo',
    submittedByEmail: 'user@astroconnect.com',
    category: 'Career',
    type: 'Personal',
    purchaseType: 'Paid',
    purchaseAmount: 250,
    refundAmount: 0,
    refundStatus: 'None',
    questionFor: 'Friend / Other Person',
    language: 'Tanglish',
    status: 'Answered',
    priority: 'High',
    campaignId: 'festival-special',
    campaignName: 'Career Campaign',
    raised: '18-Jul-2026 06:45 PM',
    question: 'Will my interview go well next week?',
    answer: 'Yes. Prepare for the first 48 hours of the week and keep your documents ready.',
    draftAnswer: '',
    horoscopeMode: 'Upload Horoscope',
    attachments: ['InterviewNotes.pdf'],
    previousQuestions: ['Health Question - Closed'],
    dispute: null,
    history: ['Answered by astrologer'],
    raisedAt: '2026-07-18T18:45:00+05:30',
  },
  {
    id: 'QTN-2026-001245',
    user: 'Priya V.',
    submittedByUserId: 'user-demo',
    submittedByEmail: 'user@astroconnect.com',
    category: 'Health',
    type: 'Personal',
    purchaseType: 'Paid',
    purchaseAmount: 250,
    refundAmount: 0,
    refundStatus: 'None',
    questionFor: 'Self',
    language: 'Tamil',
    status: 'Disputed',
    priority: 'High',
    campaignId: 'july-premium',
    campaignName: 'Health Campaign',
    raised: '21-Jul-2026 10:30 AM',
    question: 'When is the right time for my marriage? I would like to know which months are most favorable. Please consider whether family discussions will be supportive. I am also worried about delays caused by my career plans. Could you suggest how I should prepare for this period?',
    answer: 'Based on your horoscope, the favorable period begins in the coming months. The most supportive window appears after you complete an important work commitment. Family conversations should become easier when you approach them calmly and with clear expectations. Avoid making a rushed decision during the current period of uncertainty. A more detailed consultation can help you review the timing with your full birth details.',
    draftAnswer: '',
    horoscopeMode: 'Use Saved Horoscope',
    attachments: ['Screenshot.pdf'],
    previousQuestions: ['Marriage Question - Answered', 'Career Question - Closed'],
    dispute: {
      target: 'Astrologer',
      reason: 'The response feels too generic and lacks personalization.',
      description: 'I expected guidance that related more directly to my situation. The answer did not explain why the coming months are favorable. It also did not address the work commitment that may delay my plans. I would like clearer advice about how to speak with my family. Please provide a more specific response using my horoscope details.',
      response: '',
      status: 'Open',
      attachment: 'Screenshot.pdf',
    },
    history: ['User raised dispute', 'Awaiting astrologer response'],
    raisedAt: '2026-07-21T10:30:00+05:30',
  },
  {
    id: 'QTN-2026-001246',
    user: 'Arun',
    submittedByUserId: 'user-demo',
    submittedByEmail: 'user@astroconnect.com',
    category: 'Career',
    type: 'General',
    purchaseType: 'Paid',
    purchaseAmount: 100,
    refundAmount: 0,
    refundStatus: 'None',
    questionFor: 'Self',
    language: 'English',
    status: 'In Progress',
    priority: 'Low',
    campaignId: 'festival-special',
    campaignName: 'Career Campaign',
    raised: '20-Jul-2026 04:20 PM',
    question: 'Can I switch jobs this month?',
    answer: '',
    draftAnswer: 'I need to review the timing of your transits.',
    horoscopeMode: 'Continue Without Horoscope',
    attachments: [],
    previousQuestions: ['Job Question - Pending'],
    dispute: null,
    history: ['Assigned to astrologer'],
    raisedAt: '2026-07-20T16:20:00+05:30',
  },
]

const initialNotifications = [
  {
    id: 'n1',
    title: 'New question assigned',
    detail: 'QTN-2026-000124 is waiting for review.',
    time: '10m ago',
    route: '/astrologer/answer-question?questionId=QTN-2026-000124',
    audience: ROLES.ASTROLOGER,
    category: 'questions',
    read: false,
  },
  {
    id: 'n2',
    title: 'Dispute awaiting response',
    detail: 'QTN-2026-001245 needs clarification.',
    time: '1h ago',
    route: '/astrologer/dispute-management?questionId=QTN-2026-001245',
    audience: ROLES.ASTROLOGER,
    category: 'questions',
    read: false,
  },
  {
    id: 'n3',
    title: 'Package purchased',
    detail: 'A new purchase was recorded for Health Campaign.',
    time: '3h ago',
    route: '/astrologer/sales-management',
    audience: ROLES.ASTROLOGER,
    category: 'offers',
    read: true,
  },
  {
    id: 'n4',
    title: `${mockAstrologers[0].name} posted a new update`,
    detail: "New article: 'Navigating Saturn Transit in 2026'.",
    time: '25m ago',
    route: `/user/astrologer-profile?id=${mockAstrologers[0].id}`,
    audience: ROLES.USER,
    category: 'follow',
    read: false,
  },
  {
    id: 'n5',
    title: `${mockAstrologers[1].name} is now available for live chat`,
    detail: 'Availability window opened for the next 2 hours.',
    time: '2h ago',
    route: `/user/astrologer-profile?id=${mockAstrologers[1].id}`,
    audience: ROLES.USER,
    category: 'follow',
    read: true,
  },
  {
    id: 'n6',
    title: 'Appointment confirmed',
    detail: `Your video consultation with ${mockAppointments[0].astrologer} is confirmed for ${mockAppointments[0].date}.`,
    time: '40m ago',
    route: `/user/appointment-details?id=${mockAppointments[0].id}`,
    audience: ROLES.USER,
    category: 'appointments',
    read: false,
  },
  {
    id: 'n7',
    title: 'Appointment reminder',
    detail: `Your appointment with ${mockAppointments[0].astrologer} starts at ${mockAppointments[0].time} tomorrow.`,
    time: '1h ago',
    route: `/user/appointment-details?id=${mockAppointments[0].id}`,
    audience: ROLES.USER,
    category: 'appointments',
    read: false,
  },
  {
    id: 'n8',
    title: 'Appointment rescheduled',
    detail: `Your session with ${mockAppointments[1].astrologer} was moved to ${mockAppointments[1].date}, ${mockAppointments[1].time}.`,
    time: 'Yesterday',
    route: `/user/appointment-details?id=${mockAppointments[1].id}`,
    audience: ROLES.USER,
    category: 'appointments',
    read: true,
  },
  {
    id: 'n9',
    title: 'Astrologer requested more details',
    detail: 'QTN-2026-000124 needs more context before it can be answered.',
    time: '35m ago',
    route: '/user/track-questions?questionId=QTN-2026-000124',
    audience: ROLES.USER,
    category: 'questions',
    read: false,
  },
  {
    id: 'n10',
    title: 'Question closed',
    detail: 'QTN-2026-000125 has been marked as closed.',
    time: '5h ago',
    route: '/user/track-questions?questionId=QTN-2026-000125',
    audience: ROLES.USER,
    category: 'questions',
    read: true,
  },
  {
    id: 'n11',
    title: 'Pooja booking confirmed',
    detail: `${mockPoojas[0].name} is booked for ${mockPoojas[0].date}, ${mockPoojas[0].time}.`,
    time: '3h ago',
    route: `/user/pooja-details?id=${mockPoojas[0].id}`,
    audience: ROLES.USER,
    category: 'pooja',
    read: false,
  },
  {
    id: 'n12',
    title: 'Live pooja starting soon',
    detail: `${mockPoojas[0].name} goes live in 30 minutes.`,
    time: '15m ago',
    route: `/user/pooja-details?id=${mockPoojas[0].id}`,
    audience: ROLES.USER,
    category: 'pooja',
    read: false,
  },
  {
    id: 'n13',
    title: 'Prasadam dispatched',
    detail: `Prasadam for ${mockPoojas[1].name} has been dispatched to your address.`,
    time: '2 days ago',
    route: `/user/pooja-details?id=${mockPoojas[1].id}`,
    audience: ROLES.USER,
    category: 'pooja',
    read: true,
  },
  {
    id: 'n14',
    title: `${mockLiveSessions[0].astrologer} is live now`,
    detail: mockLiveSessions[0].title,
    time: '12m ago',
    route: `/user/live-session?id=${mockLiveSessions[0].id}`,
    audience: ROLES.USER,
    category: 'live',
    read: false,
  },
  {
    id: 'n15',
    title: 'Upcoming live session',
    detail: `${mockLiveSessions[1].astrologer}: ${mockLiveSessions[1].title} at ${mockLiveSessions[1].time}.`,
    time: '4h ago',
    route: `/user/live-session?id=${mockLiveSessions[1].id}`,
    audience: ROLES.USER,
    category: 'live',
    read: true,
  },
  {
    id: 'n16',
    title: 'Career Campaign is live',
    detail: 'New career question packages are now available.',
    time: '6h ago',
    route: '/user/purchase-package?campaignId=festival-special',
    audience: ROLES.USER,
    category: 'offers',
    read: false,
  },
  {
    id: 'n17',
    title: '20% off on Health packages',
    detail: 'Limited-time discount on Health Campaign.',
    time: '1 day ago',
    route: '/user/purchase-package?campaignId=july-premium',
    audience: ROLES.USER,
    category: 'offers',
    read: true,
  },
]

const initialAstrologerWallet = {
  balance: 34650,
  holdDays: 7,
  escrow: 8500,
  earnings: 52150,
  withdrawn: 18000,
  transactions: [
    { id: 'aw1', label: 'Question package sale - Health', amount: '+₹2,000', time: 'Today', date: '2026-07-27', type: 'earning' },
    { id: 'aw2', label: 'Personal question - Marriage', amount: '+₹250', time: 'Yesterday', date: '2026-07-26', type: 'earning' },
    { id: 'aw3', label: 'Consultation payout - Video call', amount: '+₹4,000', time: '24 Jul 2026', date: '2026-07-24', type: 'earning' },
    { id: 'aw4', label: 'General question - Business', amount: '+₹100', time: '23 Jul 2026', date: '2026-07-23', type: 'earning' },
    { id: 'aw5', label: 'Withdrawal to bank', amount: '-₹8,000', time: '22 Jul 2026', date: '2026-07-22', type: 'withdrawal' },
    { id: 'aw6', label: 'Escrow hold - QTN-2026-000123', amount: '+₹250', time: '21 Jul 2026', date: '2026-07-21', type: 'escrow' },
    { id: 'aw7', label: 'Escrow hold - QTN-2026-001245', amount: '+₹250', time: '21 Jul 2026', date: '2026-07-21', type: 'escrow' },
    { id: 'aw8', label: 'Escrow release - QTN-2026-000125', amount: '+₹250', time: '20 Jul 2026', date: '2026-07-20', type: 'escrow_release' },
    { id: 'aw9', label: 'Personal question - Career', amount: '+₹250', time: '19 Jul 2026', date: '2026-07-19', type: 'earning' },
    { id: 'aw10', label: 'Withdrawal to bank', amount: '-₹10,000', time: '18 Jul 2026', date: '2026-07-18', type: 'withdrawal' },
    { id: 'aw11', label: 'Consultation payout - Chat', amount: '+₹2,500', time: '14 Jul 2026', date: '2026-07-14', type: 'earning' },
    { id: 'aw12', label: 'General question - Job', amount: '+₹100', time: '13 Jul 2026', date: '2026-07-13', type: 'earning' },
  ],
}

const initialUserWallet = {
  balance: 4500,
  toppedUp: 10000,
  spent: 5500,
  refunded: 0,
  transactions: [
    { id: 'uw1', label: 'Wallet top-up', amount: '+₹5,000', time: '25 Jul 2026', date: '2026-07-25', type: 'topup' },
    { id: 'uw2', label: 'Personal question - Marriage', amount: '-₹250', time: '21 Jul 2026', date: '2026-07-21', type: 'purchase' },
    { id: 'uw3', label: 'Personal question - Marriage', amount: '-₹250', time: '21 Jul 2026', date: '2026-07-21', type: 'purchase' },
    { id: 'uw4', label: 'Wallet top-up', amount: '+₹5,000', time: '20 Jul 2026', date: '2026-07-20', type: 'topup' },
    { id: 'uw5', label: 'Personal question - Job/Health', amount: '-₹250', time: '18 Jul 2026', date: '2026-07-18', type: 'purchase' },
    { id: 'uw6', label: 'General question - Business', amount: '-₹100', time: '17 Jul 2026', date: '2026-07-17', type: 'purchase' },
    { id: 'uw7', label: 'Personal question - Job', amount: '-₹250', time: '16 Jul 2026', date: '2026-07-16', type: 'purchase' },
    { id: 'uw8', label: 'Wallet top-up', amount: '+₹5,000', time: '15 Jul 2026', date: '2026-07-15', type: 'topup' },
  ],
}

const initialProfile = {
  name: 'Dr. Rani',
  role: 'Astrologer',
  rating: '4.9 / 5',
  reviews: '2,345 reviews',
  email: 'dr.rani@astroconnect.com',
  phone: '+91 98765 43210',
}

function updateQuestion(list, id, updater) {
  return list.map((question) => (question.id === id ? updater(question) : question))
}

function createCampaignId(name) {
  const slug = String(name || 'campaign')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'campaign'}-${Date.now().toString(36)}`
}

function formatCampaignDate(input) {
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return input
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function startOfMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function addDaysMs(days) {
  return Date.now() + days * 24 * 60 * 60 * 1000
}

function firstOfNextMonthMs() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
}

function updatePurchasedSlotBalance(list, userId, campaignId, slotType, amount) {
  return list.map((slot) => {
    if (slot.userId !== userId || slot.campaignId !== campaignId) return slot
    if (slotType === 'General') {
      return amount < 0
        ? { ...slot, generalUsed: Math.min(slot.generalPurchased, slot.generalUsed - amount) }
        : { ...slot, generalPurchased: slot.generalPurchased + amount }
    }
    return amount < 0
      ? { ...slot, personalUsed: Math.min(slot.personalPurchased, slot.personalUsed - amount) }
      : { ...slot, personalPurchased: slot.personalPurchased + amount }
  })
}

export function AppDataProvider({ children }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [questions, setQuestions] = useState(initialQuestions)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [astrologerWallet, setAstrologerWallet] = useState(initialAstrologerWallet)
  const [userWallet, setUserWallet] = useState(initialUserWallet)
  const [profile] = useState(initialProfile)
  const [selectedCampaignId, setSelectedCampaignId] = useState(initialCampaigns[0].id)
  const [liveStreamOpen, setLiveStreamOpen] = useState(false)
  const [questionPreviewId, setQuestionPreviewId] = useState(null)
  const [appointments, setAppointments] = useState(mockAppointments)
  const [followedAstrologerIds, setFollowedAstrologerIds] = useState(['astrologer-demo'])
  const [subscriptions, setSubscriptions] = useState([])
  const [purchasedSlots, setPurchasedSlots] = useState(initialPurchasedSlots)

  useEffect(() => {
    setCampaigns((prev) => prev.map((campaign) => {
      if (campaign.id === 'july-premium') return { ...campaign, name: 'Health Campaign', categories: HEALTH_CAMPAIGN_CATEGORIES }
      if (campaign.id === 'festival-special') return { ...campaign, name: 'Career Campaign', categories: CAREER_CAMPAIGN_CATEGORIES }
      return campaign
    }))
    setQuestions((prev) => prev.map((question) => {
      if (question.campaignId === 'july-premium') return { ...question, category: 'Health', campaignName: 'Health Campaign' }
      if (question.campaignId === 'festival-special') return { ...question, category: 'Career', campaignName: 'Career Campaign' }
      return question
    }))
    setNotifications((prev) => prev.map((notification) => notification.id === 'n16'
      ? { ...notification, title: 'Career Campaign is live', detail: 'New career question packages are now available.' }
      : notification))
  }, [])

  useEffect(() => {
    const publishScheduledCampaigns = () => {
      const now = Date.now()
      setCampaigns((prev) => {
        const dueIds = new Set(prev
          .filter((campaign) => campaign.status === 'Scheduled' && campaign.scheduledPublishAt && new Date(campaign.scheduledPublishAt).getTime() <= now)
          .map((campaign) => campaign.id))
        if (!dueIds.size) return prev
        return prev.map((campaign) => dueIds.has(campaign.id)
          ? { ...campaign, status: 'Active', scheduledPublishAt: null }
          : campaign)
      })
    }

    publishScheduledCampaigns()
    const timer = window.setInterval(publishScheduledCampaigns, 30 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || campaigns[0]
  const selectedQuestion = questionPreviewId ? questions.find((question) => question.id === questionPreviewId) : null

  const actions = useMemo(() => ({
    selectCampaign: setSelectedCampaignId,
    setLiveStreamOpen,
    setQuestionPreviewId,
    toggleCampaignOffer(campaignId, offerKey) {
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId ? { ...campaign, [offerKey]: !campaign[offerKey] } : campaign,
        ),
      )
    },
    updateCampaign(campaignId, patch) {
      setCampaigns((prev) => prev.map((campaign) => (campaign.id === campaignId ? { ...campaign, ...patch } : campaign)))
      const discountChanged = Object.prototype.hasOwnProperty.call(patch, 'discountPercent')
      const availabilityChanged = Object.prototype.hasOwnProperty.call(patch, 'status')
      const priceChanged = Object.prototype.hasOwnProperty.call(patch, 'generalPrice') || Object.prototype.hasOwnProperty.call(patch, 'personalPrice')
      if (discountChanged || availabilityChanged || priceChanged) {
        const campaign = campaigns.find((item) => item.id === campaignId)
        if (campaign && subscriptions.length) {
          const nextDiscount = discountChanged ? Number(patch.discountPercent) || 0 : campaign.discountPercent || 0
          const nextStatus = patch.status || campaign.status
          setNotifications((prev) => [
            ...subscriptions.map(() => ({
              id: crypto.randomUUID(),
              title: 'Subscribed campaign updated',
              detail: `${campaign.name} changed${discountChanged ? ` to ${nextDiscount}% subscriber discount` : ''}${priceChanged ? ' with updated pricing' : ''}${availabilityChanged ? ` and is now ${nextStatus}` : ''}.`,
              time: 'just now',
              route: '/user/discount-questions',
              audience: ROLES.USER,
              category: 'offers',
              read: false,
            })),
            ...prev,
          ])
        }
      }
    },
    consumePurchasedSlot(userId, campaignId, slotType) {
      setPurchasedSlots((prev) => updatePurchasedSlotBalance(prev, userId, campaignId, slotType, -1))
    },
    deleteCampaign(campaignId) {
      setCampaigns((prev) => prev.filter((campaign) => campaign.id !== campaignId))
      setSelectedCampaignId((currentId) => {
        if (currentId !== campaignId) return currentId
        const remainingCampaign = campaigns.find((campaign) => campaign.id !== campaignId)
        return remainingCampaign?.id || null
      })
    },
    createCampaign(payload) {
      const discountPercent = payload.discountEnabled ? Number(payload.discountPercent) || 0 : 0
      const campaign = {
        id: createCampaignId(payload.name),
        name: payload.name.trim(),
        date: formatCampaignDate(payload.date),
        endDate: formatCampaignDate(payload.endDate),
        priority: payload.priority || 'Medium',
        status: payload.status || 'Draft',
        scheduledPublishAt: payload.scheduledPublishAt || null,
        categories: Array.isArray(payload.categories)
          ? payload.categories
          : DEFAULT_CAMPAIGN_CATEGORIES.map((category) => ({ ...category, discountPercent })),
        discountPercent,
        generalOffer: Boolean(payload.discountEnabled ?? payload.generalOffer),
        personalOffer: Boolean(payload.discountEnabled ?? payload.personalOffer),
        generalPrice: Number(payload.generalPrice) || 0,
        personalPrice: Number(payload.personalPrice) || 0,
        packagePrice: Number(payload.packagePrice) || 0,
        purchasedGeneral: 0,
        purchasedPersonal: 0,
        totalLimit: Number(payload.totalLimit) || 0,
        generalLimit: Number(payload.generalLimit) || 0,
        personalLimit: Number(payload.personalLimit) || 0,
      }

      setCampaigns((prev) => [campaign, ...prev])
      setSelectedCampaignId(campaign.id)
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: 'Campaign created',
          detail: `${campaign.name} was created from Sales Management.`,
          time: 'just now',
          route: '/astrologer/sales-management',
          audience: ROLES.ASTROLOGER,
          category: 'offers',
          read: false,
        },
        {
          id: crypto.randomUUID(),
          title: 'New campaign available',
          detail: `${campaign.name} was just added by your astrologer.`,
          time: 'just now',
          route: `/user/purchase-package?campaignId=${campaign.id}`,
          audience: ROLES.USER,
          category: 'offers',
          read: false,
        },
        ...(subscriptions.length
          ? [{
              id: crypto.randomUUID(),
              title: 'New campaign available for subscribers',
              detail: 'A new campaign is now available with subscriber pricing.',
              time: 'just now',
              route: '/user/discount-questions',
              audience: ROLES.USER,
              category: 'offers',
              read: false,
            }]
          : []),
        ...prev,
      ])
      return campaign
    },
    publishCampaign(campaignId) {
      setCampaigns((prev) =>
        prev.map((campaign) => (campaign.id === campaignId ? { ...campaign, status: 'Active' } : campaign)),
      )
      const campaign = campaigns.find((item) => item.id === campaignId)
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: 'Campaign published',
          detail: 'A campaign was published from Sales Management.',
          time: 'just now',
          route: '/astrologer/sales-management',
          audience: ROLES.ASTROLOGER,
          category: 'offers',
          read: false,
        },
        ...(campaign && subscriptions.length
          ? subscriptions.map(() => ({
              id: crypto.randomUUID(),
              title: 'Subscribed campaign is now available',
              detail: `${campaign.name} is now active with ${campaign.discountPercent || 0}% subscriber discount.`,
              time: 'just now',
              route: '/user/discount-questions',
              audience: ROLES.USER,
              category: 'offers',
              read: false,
            }))
          : []),
        ...prev,
      ])
    },
    purchasePackage(campaignId, purchase) {
      if (purchase.userId && purchase.source !== 'astrologer') {
        setPurchasedSlots((prev) => {
          const existing = prev.find((slot) => slot.userId === purchase.userId && slot.campaignId === campaignId)
          if (existing) {
            return updatePurchasedSlotBalance(
              prev,
              purchase.userId,
              campaignId,
              'General',
              purchase.generalQty || 0,
            ).map((slot) => slot.userId === purchase.userId && slot.campaignId === campaignId
              ? { ...slot, personalPurchased: slot.personalPurchased + (purchase.personalQty || 0) }
              : slot)
          }
          return [...prev, {
            id: crypto.randomUUID(),
            userId: purchase.userId,
            campaignId,
            generalPurchased: purchase.generalQty || 0,
            generalUsed: 0,
            personalPurchased: purchase.personalQty || 0,
            personalUsed: 0,
          }]
        })
      }
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId
            ? {
                ...campaign,
                purchasedGeneral: campaign.purchasedGeneral + purchase.generalQty,
                purchasedPersonal: campaign.purchasedPersonal + purchase.personalQty,
              }
            : campaign,
        ),
      )
      const setWallet = purchase.source === 'astrologer' ? setAstrologerWallet : setUserWallet
      setWallet((prev) => ({
        ...prev,
        balance: prev.balance + purchase.totalAmount,
        transactions: [
          {
            id: crypto.randomUUID(),
            label: `${purchase.campaignName} purchase`,
            amount: `+₹${purchase.totalAmount.toLocaleString('en-IN')}`,
            time: 'just now',
            date: new Date().toISOString(),
            type: purchase.source === 'astrologer' ? 'earning' : 'purchase',
          },
          ...prev.transactions,
        ],
      }))
      const purchaseDetail = `${purchase.generalQty} general and ${purchase.personalQty} personal questions were purchased.`
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: 'Package purchased',
          detail: purchaseDetail,
          time: 'just now',
          route:
            purchase.source === 'astrologer'
              ? '/astrologer/sales-management'
              : `/user/ask-question?campaignId=${campaignId}`,
          audience: purchase.source === 'astrologer' ? ROLES.ASTROLOGER : ROLES.USER,
          category: 'offers',
          read: false,
        },
        ...(purchase.source === 'astrologer'
          ? []
          : [
              {
                id: crypto.randomUUID(),
                title: 'New purchase completed',
                detail: `${purchase.campaignName}: ${purchaseDetail}`,
                time: 'just now',
                route: '/astrologer/sales-management',
                audience: ROLES.ASTROLOGER,
                category: 'offers',
                read: false,
              },
            ]),
        ...prev,
      ])
    },
    saveQuestionDraft(questionId, draftAnswer) {
      setQuestions((prev) =>
        updateQuestion(prev, questionId, (question) => ({
          ...question,
          draftAnswer,
          status: 'In Progress',
          history: [...question.history, 'Draft saved'],
        })),
      )
    },
    submitQuestionAnswer(questionId, answer) {
      setQuestions((prev) =>
        updateQuestion(prev, questionId, (question) => ({
          ...question,
          answer,
          draftAnswer: '',
          status: 'Under Review',
          answerReviewStartedAt: Date.now(),
          answerReviewUntil: Date.now() + ANSWER_REVIEW_WINDOW_MS,
          answerEditUsed: false,
          answerDeliveredAt: null,
          history: [...question.history, 'Answer submitted for five-hour review'],
        })),
      )
    },
    editSubmittedQuestionAnswer(questionId, answer) {
      const question = questions.find((item) => item.id === questionId)
      if (!question || question.status !== 'Under Review' || question.answerEditUsed || !question.answerReviewUntil || question.answerReviewUntil <= Date.now()) return false
      setQuestions((prev) =>
        updateQuestion(prev, questionId, (currentQuestion) => ({
          ...currentQuestion,
          answer,
          status: 'Answered',
          answerReviewUntil: null,
          answerEditUsed: true,
          answerDeliveredAt: Date.now(),
          history: [...currentQuestion.history, 'One-time answer correction saved', 'Corrected answer delivered to user'],
        })),
      )
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: 'Corrected answer delivered',
          detail: `Question ${questionId} has been updated and delivered to the user.`,
          time: 'just now',
          route: `/user/track-questions?questionId=${questionId}`,
          audience: ROLES.USER,
          category: 'questions',
          read: false,
        },
        ...prev,
      ])
      return true
    },
    deliverDueQuestionAnswers() {
      const now = Date.now()
      const dueQuestions = questions.filter((question) => question.status === 'Under Review' && question.answerReviewUntil && question.answerReviewUntil <= now)
      if (!dueQuestions.length) return
      setQuestions((prev) => prev.map((question) => dueQuestions.some((dueQuestion) => dueQuestion.id === question.id)
        ? { ...question, status: 'Answered', answerDeliveredAt: now, history: [...question.history, 'Answer automatically delivered to user'] }
        : question))
      setNotifications((prev) => [
        ...dueQuestions.map((question) => ({
          id: crypto.randomUUID(),
          title: 'Answer delivered',
          detail: `Question ${question.id} has been answered and delivered to the user.`,
          time: 'just now',
          route: `/user/track-questions?questionId=${question.id}`,
          audience: ROLES.USER,
          category: 'questions',
          read: false,
        })),
        ...prev,
      ])
    },
    updateQuestionStatus(questionId, status) {
      setQuestions((prev) =>
        updateQuestion(prev, questionId, (question) => ({
          ...question,
          status,
          history: [...question.history, `Status changed to ${status}`],
        })),
      )
    },
    createQuestion(payload) {
      const nextId = `QTN-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
      setQuestions((prev) => [
        {
          id: nextId,
          user: payload.userName || 'You',
          submittedByUserId: payload.userId || '',
          submittedByEmail: payload.userEmail || '',
          category: payload.category || 'Others',
          type: payload.type || 'General',
          purchaseType: payload.purchaseType || 'Free',
          questionFor: payload.questionFor || 'Myself',
          language: payload.language || 'English',
          status: 'Pending',
          priority: 'Medium',
          campaignId: payload.campaignId || campaigns[0]?.id,
          campaignName: payload.campaignName || campaigns[0]?.name || 'Campaign',
          raised: 'Just now',
          raisedAt: new Date().toISOString(),
          question: payload.question,
          answer: '',
          draftAnswer: '',
          answerRating: null,
          answerReview: '',
          disputeRating: null,
          horoscopeMode: payload.horoscopeMode || 'Continue Without Horoscope',
          attachments: [],
          previousQuestions: [],
          dispute: null,
          history: ['Question created'],
        },
        ...prev,
      ])
      if (payload.purchaseType === 'Purchased Slot' && payload.slotType) {
        setPurchasedSlots((prev) => updatePurchasedSlotBalance(prev, payload.userId, payload.campaignId, payload.slotType, -1))
      }
      setQuestionPreviewId(nextId)
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: 'Question submitted',
          detail: 'A new question was submitted from the user portal.',
          time: 'just now',
          route: `/user/track-questions?questionId=${nextId}`,
          audience: ROLES.USER,
          category: 'questions',
          read: false,
        },
        {
          id: crypto.randomUUID(),
          title: 'New question assigned',
          detail: `${payload.category || 'A question'} from ${payload.userName || 'a user'} is ready for review.`,
          time: 'just now',
          route: `/astrologer/answer-question?questionId=${nextId}`,
          audience: ROLES.ASTROLOGER,
          category: 'questions',
          read: false,
        },
        ...prev,
      ])
      return nextId
    },
    editQuestion(questionId, patch) {
      setQuestions((prev) =>
        updateQuestion(prev, questionId, (question) => ({
          ...question,
          ...patch,
          history: [...question.history, 'Question edited'],
        })),
      )
    },
    revokeQuestion(questionId) {
      setQuestions((prev) =>
        updateQuestion(prev, questionId, (question) => {
          const refundAmount = question.purchaseType === 'Paid' ? question.purchaseAmount : 0
          return {
            ...question,
            status: 'Closed',
            refundAmount,
            refundStatus: refundAmount > 0 ? 'Completed' : 'None',
            history: [...question.history, 'Question revoked', refundAmount > 0 ? `Refund of ₹${refundAmount} processed` : ''],
          }
        }),
      )
      const questionToUpdate = questions.find((q) => q.id === questionId)
      if (questionToUpdate?.purchaseType === 'Paid' && questionToUpdate?.purchaseAmount > 0) {
        const refundAmount = questionToUpdate.purchaseAmount
        setUserWallet((prev) => ({
          ...prev,
          balance: prev.balance + refundAmount,
          refunded: (prev.refunded || 0) + refundAmount,
          transactions: [
            {
              id: crypto.randomUUID(),
              label: `Refund - ${questionToUpdate.id}`,
              amount: `+₹${refundAmount.toLocaleString('en-IN')}`,
              time: 'just now',
              date: new Date().toISOString(),
              type: 'refund',
            },
            ...prev.transactions,
          ],
        }))
        setNotifications((prev) => [
          {
            id: crypto.randomUUID(),
            title: 'Refund processed',
            detail: `₹${refundAmount} has been refunded to your wallet for question ${questionId}.`,
            time: 'just now',
            route: '/user/wallet-history',
            audience: ROLES.USER,
            category: 'questions',
            read: false,
          },
          ...prev,
        ])
      }
    },
    raiseDispute(questionId, payload) {
      setQuestions((prev) =>
        updateQuestion(prev, questionId, (question) => {
          if (question.dispute) {
            return question
          }

          return {
            ...question,
            status: 'Disputed',
            dispute: {
              target: payload.target,
              reason: payload.reason,
              description: payload.description,
              response: '',
              status: 'Open',
              attachment: payload.attachment || 'Attachment.pdf',
            },
            history: [...question.history, 'Dispute raised'],
          }
        }),
      )
      setQuestionPreviewId(questionId)
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: 'Dispute raised',
          detail: `Question ${questionId} is now in dispute.`,
          time: 'just now',
          route: `/user/raise-dispute?questionId=${questionId}`,
          audience: ROLES.USER,
          category: 'questions',
          read: false,
        },
        {
          id: crypto.randomUUID(),
          title: 'Dispute raised by user',
          detail: `A user raised a dispute on question ${questionId}. Please review and respond.`,
          time: 'just now',
          route: `/astrologer/dispute-management?questionId=${questionId}`,
          audience: ROLES.ASTROLOGER,
          category: 'questions',
          read: false,
        },
        ...prev,
      ])
    },
    respondToDispute(questionId, response, status) {
      setQuestions((prev) =>
        updateQuestion(prev, questionId, (question) => ({
          ...question,
          dispute: question.dispute
            ? {
                ...question.dispute,
                response,
                status,
              }
            : question.dispute,
          history: [...question.history, `Dispute ${status.toLowerCase()}`],
        })),
      )
      setQuestionPreviewId(questionId)

      const statusLabel = status.toLowerCase()
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: `Dispute ${statusLabel}`,
          detail: response
            ? `Your dispute on question ${questionId} was ${statusLabel}: "${response}"`
            : `Your dispute on question ${questionId} status changed to ${status}.`,
          time: 'just now',
          route: `/user/raise-dispute?questionId=${questionId}`,
          audience: ROLES.USER,
          category: 'questions',
          read: false,
        },
        ...prev,
      ])
    },
    rateQuestionAnswer(questionId, rating, review) {
      setQuestions((prev) =>
        updateQuestion(prev, questionId, (question) => ({
          ...question,
          answerRating: rating,
          answerReview: review || '',
          history: [...question.history, `Answer rated ${rating} star${rating === 1 ? '' : 's'}`],
        })),
      )
    },
    rateDisputeResolution(questionId, rating) {
      setQuestions((prev) =>
        updateQuestion(prev, questionId, (question) => ({
          ...question,
          dispute: question.dispute
            ? {
                ...question.dispute,
                rating,
              }
            : question.dispute,
          disputeRating: rating,
          history: [...question.history, `Dispute resolution rated ${rating} star${rating === 1 ? '' : 's'}`],
        })),
      )
    },
    bookAppointment(payload) {
      const appointment = {
        id: `apt-${Date.now().toString(36)}`,
        astrologerId: payload.astrologerId,
        astrologer: payload.astrologerName,
        type: payload.type || 'Video Consultation',
        date: payload.date,
        time: payload.time,
        status: 'Confirmed',
      }
      setAppointments((prev) => [appointment, ...prev])
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: 'Appointment booked',
          detail: `Your ${appointment.type.toLowerCase()} with ${appointment.astrologer} is confirmed for ${appointment.date}, ${appointment.time}.`,
          time: 'just now',
          route: `/user/appointment-details?id=${appointment.id}`,
          audience: ROLES.USER,
          category: 'appointments',
          read: false,
        },
        {
          id: crypto.randomUUID(),
          title: 'New appointment booked',
          detail: `A user booked a ${appointment.type.toLowerCase()} with you for ${appointment.date}, ${appointment.time}.`,
          time: 'just now',
          route: '/astrologer',
          audience: ROLES.ASTROLOGER,
          category: 'appointments',
          read: false,
        },
        ...prev,
      ])
      return appointment.id
    },
    cancelAppointment(appointmentId, meta) {
      setAppointments((prev) =>
        prev.map((appointment) => (appointment.id === appointmentId ? { ...appointment, status: 'Cancelled' } : appointment)),
      )
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: 'Appointment cancelled',
          detail: `Your ${(meta?.type || 'appointment').toLowerCase()} with ${meta?.astrologer || 'your astrologer'} has been cancelled.`,
          time: 'just now',
          route: `/user/appointment-details?id=${appointmentId}`,
          audience: ROLES.USER,
          category: 'appointments',
          read: false,
        },
        {
          id: crypto.randomUUID(),
          title: 'Appointment cancelled by user',
          detail: `A user cancelled their ${(meta?.type || 'appointment').toLowerCase()} scheduled for ${meta?.date || 'an upcoming date'}, ${meta?.time || ''}.`.trim(),
          time: 'just now',
          route: '/astrologer',
          audience: ROLES.ASTROLOGER,
          category: 'appointments',
          read: false,
        },
        ...prev,
      ])
    },
    toggleFollow(astrologerId, astrologerName, isCurrentlyFollowing) {
      setFollowedAstrologerIds((prev) =>
        isCurrentlyFollowing ? prev.filter((id) => id !== astrologerId) : [...prev, astrologerId],
      )
      if (!isCurrentlyFollowing) {
        setNotifications((prev) => [
          {
            id: crypto.randomUUID(),
            title: 'New follower',
            detail: `A user started following ${astrologerName}.`,
            time: 'just now',
            route: '/astrologer',
            audience: ROLES.ASTROLOGER,
            category: 'follow',
            read: false,
          },
          ...prev,
        ])
      }
    },
    subscribeToAstrologer(astrologerId, astrologerName, userId, userName) {
      if (!userId) return null
      const existing = subscriptions.find((sub) => sub.userId === userId && sub.astrologerId === astrologerId)
      if (existing) return existing
      const subscription = {
        userId,
        userName: userName || userId || 'Subscriber',
        astrologerId,
        astrologerName,
        subscribedAt: new Date().toISOString(),
        discountQuestions: [
          {
            id: crypto.randomUUID(),
            status: 'Available',
            grantedAt: Date.now(),
            validUntil: addDaysMs(15),
            monthKey: startOfMonthKey(),
          },
        ],
      }
      setSubscriptions((prev) => [...prev, subscription])
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: 'Subscription successful',
          detail: `You are now a subscriber of ${astrologerName}. You received 1 Discount Question valid for 15 days.`,
          time: 'just now',
          route: '/user/dashboard',
          audience: ROLES.USER,
          category: 'offers',
          read: false,
        },
        {
          id: crypto.randomUUID(),
          title: 'New subscriber',
          detail: `${userName || 'A user'} subscribed to your profile.`,
          time: 'just now',
          route: '/astrologer',
          audience: ROLES.ASTROLOGER,
          category: 'follow',
          read: false,
        },
        ...prev,
      ])
      return subscription
    },
    getAvailableDiscountQuestions(userId) {
      if (!userId) return []
      return subscriptions
        .filter((sub) => sub.userId === userId)
        .flatMap((sub) => sub.discountQuestions
          .filter((dq) => dq.status === 'Available' && dq.validUntil >= Date.now())
          .map((dq) => ({ ...dq, astrologerId: sub.astrologerId, astrologerName: sub.astrologerName })))
    },
    getActiveDiscountQuestion(userId, discountQuestionId) {
      if (!userId) return null
      const sub = subscriptions.find((s) => s.userId === userId)
      if (!sub) return null
      return (
        sub.discountQuestions.find((dq) =>
          dq.status === 'Available' &&
          dq.validUntil >= Date.now() &&
          (!discountQuestionId || dq.id === discountQuestionId),
        ) || null
      )
    },
    getDiscountStatus(userId) {
      if (!userId) return { state: 'none' }
      const sub = subscriptions.find((s) => s.userId === userId)
      if (!sub) return { state: 'none' }
      const now = Date.now()
      const active = sub.discountQuestions.find((dq) => dq.status === 'Available' && dq.validUntil >= now)
      if (active) {
        return { state: 'available', validUntil: active.validUntil, subscription: sub }
      }
      const used = [...sub.discountQuestions]
        .sort((a, b) => b.grantedAt - a.grantedAt)
        .find((dq) => dq.status === 'Used')
      if (used) {
        return { state: 'used', nextAvailable: firstOfNextMonthMs() }
      }
      return { state: 'expired' }
    },
    markExpiredDiscountQuestions(userId) {
      if (!userId) return
      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.userId === userId
            ? {
                ...sub,
                discountQuestions: sub.discountQuestions.map((dq) =>
                  dq.status === 'Available' && dq.validUntil < Date.now() ? { ...dq, status: 'Expired' } : dq,
                ),
              }
            : sub,
        ),
      )
    },
    renewMonthlyDiscountQuestions(userId) {
      if (!userId) return
      const monthKey = startOfMonthKey()
      setSubscriptions((prev) =>
        prev.map((sub) => {
          if (sub.userId !== userId) return sub
          if (sub.discountQuestions.some((dq) => dq.monthKey === monthKey)) return sub
          return {
            ...sub,
            discountQuestions: [
              ...sub.discountQuestions,
              {
                id: crypto.randomUUID(),
                status: 'Available',
                grantedAt: Date.now(),
                validUntil: addDaysMs(15),
                monthKey,
              },
            ],
          }
        }),
      )
    },
    useDiscountQuestion(userId, discountQuestionId) {
      if (!userId) return null
      let used = null
      setSubscriptions((prev) =>
        prev.map((sub) => {
          if (sub.userId !== userId) return sub
          const target = sub.discountQuestions.find((dq) =>
            dq.status === 'Available' &&
            dq.validUntil >= Date.now() &&
            (!discountQuestionId || dq.id === discountQuestionId),
          )
          if (!target) return sub
          used = target
          return {
            ...sub,
            discountQuestions: sub.discountQuestions.map((dq) =>
              dq.id === target.id ? { ...dq, status: 'Used', usedAt: Date.now() } : dq,
            ),
          }
        }),
      )
      return used
    },
    getDiscountPrice(campaignId, categoryName) {
      const campaign = campaigns.find((c) => c.id === campaignId)
      if (!campaign || !Array.isArray(campaign.categories)) return null
      const cat = campaign.categories.find((c) => c.name === categoryName)
      if (!cat) return null
      const normalPrice = Number(cat.normalPrice) || 0
      const discountPercent = Number(cat.discountPercent) || 0
      const discountAmount = Math.round((normalPrice * discountPercent) / 100)
      const youPay = normalPrice - discountAmount
      return { normalPrice, discountPercent, discountAmount, youPay }
    },
    markNotificationRead(notificationId) {
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification)),
      )
    },
    markAllNotificationsRead(role) {
      setNotifications((prev) =>
        prev.map((notification) => (notification.audience === role ? { ...notification, read: true } : notification)),
      )
    },
  }), [campaigns, questions, subscriptions])

  useEffect(() => {
    const deliverDueAnswers = () => actions.deliverDueQuestionAnswers()
    deliverDueAnswers()
    const timer = window.setInterval(deliverDueAnswers, 30 * 1000)
    return () => window.clearInterval(timer)
  }, [actions])

  const value = useMemo(() => ({
    campaigns,
    questions,
    notifications,
    wallet: astrologerWallet,
    userWallet,
    astrologerWallet,
    profile,
    selectedCampaignId,
    selectedCampaign,
    selectedQuestion,
    liveStreamOpen,
    questionPreviewId,
    appointments,
    followedAstrologerIds,
    subscriptions,
    purchasedSlots,
    setSelectedCampaignId,
    setLiveStreamOpen,
    setQuestionPreviewId,
    actions,
    activeQuestions: questions.filter((question) => question.status !== 'Closed'),
    dashboardQuestions: questions
      .filter((question) => question.status !== 'Closed')
      .slice()
      .sort((a, b) => sortByDateDesc(a, b, (item) => item.raisedAt || item.raised)),
  }), [
    campaigns,
    questions,
    notifications,
    astrologerWallet,
    userWallet,
    profile,
    selectedCampaignId,
    selectedCampaign,
    selectedQuestion,
    liveStreamOpen,
    questionPreviewId,
    appointments,
    followedAstrologerIds,
    subscriptions,
    purchasedSlots,
    actions,
  ])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const value = useContext(AppDataContext)
  if (!value) {
    throw new Error('useAppData must be used within AppDataProvider')
  }
  return value
}
