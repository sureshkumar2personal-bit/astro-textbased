/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { sortByDateDesc } from '../utils/date.js'
import { isCancelledStatus } from '../utils/appointments.js'
import { applyRunningBalances, buildSeedAstrologerWallet, computeWalletSummary, payoutDisplayLabel } from '../utils/wallet.js'
import { ROLES } from '../utils/roleRoutes.js'
import { mockAppointments, mockAppointmentHistory, mockConsultations, mockAstrologerPosts, mockAstrologers, mockLiveSessions, mockPoojas, subscribedAstrologers } from '../data/notificationData.js'
import { TIER_PRICES } from '../data/audienceMembers.js'
import { initialAtonements } from '../data/atonementData.js'
import { createAtonementRecord, normalizeAtonement, updateAtonementDay } from '../utils/atonements.js'
import { LIVE_SESSION_MAX_DURATION_MS, getLiveSessionExpiry, hasLiveSessionExpired } from '../utils/liveSessions.js'
import { useAuth } from './AuthContext.jsx'
import { recordUserActivity } from '../utils/userActivityLog.js'

const AppDataContext = createContext(null)

const QUESTIONS_DEMO_NOW = Date.now()
const questionsDemoIso = (millisAgo) => new Date(QUESTIONS_DEMO_NOW - millisAgo).toISOString()
const DAY_MS = 24 * 60 * 60 * 1000


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
    astrologerId: 'astrologer-demo',
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
    astrologerId: 'acharya-meena',
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
    astrologerId: 'astrologer-demo',
  },
]

const initialPurchasedSlots = initialCampaigns
  .filter((campaign) => campaign.purchasedGeneral > 0 || campaign.purchasedPersonal > 0)
  .map((campaign) => ({
    id: `slots-user-demo-${campaign.id}`,
    userId: 'user-demo',
    campaignId: campaign.id,
    astrologerId: 'astrologer-demo',
    generalPurchased: campaign.purchasedGeneral,
    generalUsed: 0,
    personalPurchased: campaign.purchasedPersonal,
    personalUsed: 0,
  }))

const initialQuestions = [
  {
    id: 'QTN-2026-000123',
    userId: 'customer-priya',
    astrologerId: 'astrologer-demo',
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
    userId: 'customer-kannan',
    astrologerId: 'astrologer-demo',
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
    userId: 'customer-devi',
    astrologerId: 'astrologer-demo',
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
    userId: 'customer-priya',
    astrologerId: 'astrologer-demo',
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
    userId: 'customer-arun',
    astrologerId: 'astrologer-demo',
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
  {
    id: 'QTN-2026-001247',
    userId: 'customer-meena',
    astrologerId: 'astrologer-demo',
    user: 'Meena R.',
    submittedByUserId: 'user-demo',
    submittedByEmail: 'user@astroconnect.com',
    category: 'Family',
    type: 'Personal',
    purchaseType: 'Paid',
    purchaseAmount: 250,
    refundAmount: 0,
    refundStatus: 'None',
    questionFor: 'Self',
    language: 'English',
    status: 'Answered',
    priority: 'Medium',
    campaignId: 'july-premium',
    campaignName: 'Health Campaign',
    raised: '16-Jul-2026 11:10 AM',
    question: 'How can I bring more peace into my family relationships?',
    answer: 'Start with calm conversations and give each person room to be heard. The next few weeks are better for rebuilding trust slowly.',
    answeredAt: '2026-07-16T14:30:00+05:30',
    draftAnswer: '',
    horoscopeMode: 'Use Saved Horoscope',
    attachments: [],
    previousQuestions: [],
    dispute: null,
    history: ['Created by user', 'Answered by astrologer'],
    raisedAt: '2026-07-16T11:10:00+05:30',
  },
  {
    id: 'QTN-2026-001248',
    userId: 'customer-arjun-subscriber',
    astrologerId: 'astrologer-demo',
    user: 'Arjun D.',
    submittedByUserId: 'user-demo',
    submittedByEmail: 'user@astroconnect.com',
    category: 'Career',
    type: 'General',
    purchaseType: 'Free',
    purchaseAmount: 0,
    refundAmount: 0,
    refundStatus: 'None',
    questionFor: 'Self',
    language: 'English',
    status: 'Disputed',
    priority: 'Medium',
    campaignId: 'festival-special',
    campaignName: 'Career Campaign',
    raised: '14-Jul-2026 03:20 PM',
    question: 'Is this a good time to accept a new role?',
    answer: 'The opportunity looks promising, but review the responsibilities carefully before deciding.',
    answeredAt: '2026-07-14T17:00:00+05:30',
    draftAnswer: '',
    horoscopeMode: 'Continue Without Horoscope',
    attachments: [],
    previousQuestions: [],
    dispute: {
      target: 'Astrologer',
      reason: 'Please clarify the timing and responsibilities.',
      description: 'The answer was helpful but I would like more specific guidance.',
      response: '',
      status: 'Open',
      raisedAt: '2026-07-15T09:00:00+05:30',
    },
    history: ['Created by user', 'Answered by astrologer', 'User raised dispute'],
    raisedAt: '2026-07-14T15:20:00+05:30',
  },
  // --- Recent answered questions (last 7 days) for the My Activity / Recent Activity feeds ---
  {
    id: 'QTN-2026-002001',
    userId: 'customer-neha',
    astrologerId: 'astrologer-demo',
    user: 'Neha S.',
    submittedByUserId: 'user-demo',
    submittedByEmail: 'user@astroconnect.com',
    category: 'Career',
    type: 'Personal',
    purchaseType: 'Paid',
    purchaseAmount: 250,
    refundAmount: 0,
    refundStatus: 'None',
    questionFor: 'Self',
    language: 'English',
    status: 'Answered',
    priority: 'Medium',
    campaignId: 'festival-special',
    campaignName: 'Career Campaign',
    raised: '1 day ago',
    question: 'Is this the right time to switch to a new company?',
    answer: 'The coming weeks favor a considered move. Negotiate the offer carefully and confirm the start date after mid next month for the smoothest transition.',
    answeredAt: questionsDemoIso(1 * DAY_MS),
    answerDeliveredAt: questionsDemoIso(1 * DAY_MS),
    draftAnswer: '',
    horoscopeMode: 'Use Saved Horoscope',
    attachments: [],
    previousQuestions: [],
    dispute: null,
    history: ['Created by user', 'Answered by astrologer'],
    raisedAt: questionsDemoIso(1 * DAY_MS + 3 * 60 * 60 * 1000),
  },
  {
    id: 'QTN-2026-002002',
    userId: 'customer-ravi',
    astrologerId: 'astrologer-demo',
    user: 'Ravi K.',
    submittedByUserId: 'user-demo',
    submittedByEmail: 'user@astroconnect.com',
    category: 'Marriage',
    type: 'Personal',
    purchaseType: 'Paid',
    purchaseAmount: 250,
    refundAmount: 0,
    refundStatus: 'None',
    questionFor: 'Self',
    language: 'Hindi',
    status: 'Answered',
    priority: 'High',
    campaignId: 'july-premium',
    campaignName: 'Health Campaign',
    raised: '2 days ago',
    question: 'When will my marriage proposal be finalized?',
    answer: 'Your chart shows a supportive window opening soon. Family discussions held with patience in the next two weeks should lead to a positive outcome.',
    answeredAt: questionsDemoIso(2 * DAY_MS),
    answerDeliveredAt: questionsDemoIso(2 * DAY_MS),
    draftAnswer: '',
    horoscopeMode: 'Upload Horoscope',
    attachments: ['Horoscope.pdf'],
    previousQuestions: [],
    dispute: null,
    history: ['Created by user', 'Answered by astrologer'],
    raisedAt: questionsDemoIso(2 * DAY_MS + 5 * 60 * 60 * 1000),
  },
  {
    id: 'QTN-2026-002003',
    userId: 'customer-fatima',
    astrologerId: 'astrologer-demo',
    user: 'Fatima R.',
    submittedByUserId: 'user-demo',
    submittedByEmail: 'user@astroconnect.com',
    category: 'Health',
    type: 'General',
    purchaseType: 'Free',
    purchaseAmount: 0,
    refundAmount: 0,
    refundStatus: 'None',
    questionFor: 'Self',
    language: 'English',
    status: 'Answered',
    priority: 'Low',
    campaignId: 'july-premium',
    campaignName: 'Health Campaign',
    raised: '4 days ago',
    question: 'Are there any remedies for recurring headaches based on my chart?',
    answer: 'A simple daily practice of calm breathing before sunrise, along with staying consistent with your sleep schedule, should ease the pattern over the next few weeks.',
    answeredAt: questionsDemoIso(4 * DAY_MS),
    answerDeliveredAt: questionsDemoIso(4 * DAY_MS),
    draftAnswer: '',
    horoscopeMode: 'Continue Without Horoscope',
    attachments: [],
    previousQuestions: [],
    dispute: null,
    history: ['Created by user', 'Answered by astrologer'],
    raisedAt: questionsDemoIso(4 * DAY_MS + 2 * 60 * 60 * 1000),
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
    route: '/user/astrologers',
    audience: ROLES.USER,
    category: 'follow',
    read: false,
  },
  {
    id: 'n5',
    title: `${mockAstrologers[1].name} is now available for live chat`,
    detail: 'Availability window opened for the next 2 hours.',
    time: '2h ago',
    route: '/user/astrologers',
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

const ASTROLOGER_WALLET_STORAGE_KEY = 'astroconnect-app-data-astrologer-wallet'
const ASTROLOGER_PAYOUT_METHODS_STORAGE_KEY = 'astroconnect-app-data-astrologer-payout-methods'

const initialPayoutMethods = [
  { id: 'pm-hdfc', type: 'bank', bankName: 'HDFC Bank', accountNumber: '4589', ifsc: 'HDFC0001234', accountHolder: 'Dr. Rani', isDefault: true },
  { id: 'pm-sbi', type: 'bank', bankName: 'State Bank of India', accountNumber: '2567', ifsc: 'SBIN0005678', accountHolder: 'Dr. Rani', isDefault: false },
  { id: 'pm-upi', type: 'upi', upiId: 'rani@upi', isDefault: false },
]

function loadAstrologerWallet() {
  const stored = loadFromStorage(ASTROLOGER_WALLET_STORAGE_KEY, null)
  if (stored && Array.isArray(stored.ledger) && stored.ledger.length) {
    return {
      holdDays: stored.holdDays ?? 7,
      ledger: stored.ledger,
      pendingPayments: Array.isArray(stored.pendingPayments) ? stored.pendingPayments : [],
      heldPayments: Array.isArray(stored.heldPayments) ? stored.heldPayments : [],
      settlementSchedule: stored.settlementSchedule || null,
    }
  }
  return buildSeedAstrologerWallet()
}

function maskPayoutLabel(method) {
  try {
    return payoutDisplayLabel(method)
  } catch {
    return 'Saved payment method'
  }
}

const initialUserWallet = {
  seedVersion: 2,
  balance: 18239,
  toppedUp: 29000,
  spent: 11210,
  refunded: 449,
  transactions: [
    { id: 'uw1', label: 'Wallet top-up', amount: '+₹1,500', time: '09:30 AM', date: '2026-09-08', type: 'topup' },
    { id: 'uw2', label: 'Audio call consultation - Relationship', amount: '-₹750', time: '10:15 AM', date: '2026-09-08', type: 'purchase' },
    { id: 'uw3', label: 'Chat consultation - Career', amount: '-₹349', time: '11:40 AM', date: '2026-09-08', type: 'purchase' },
    { id: 'uw4', label: 'Wallet top-up', amount: '+₹3,000', time: '10:15 AM', date: '2026-09-07', type: 'topup' },
    { id: 'uw5', label: 'Audio call consultation - Career', amount: '-₹850', time: '08:45 PM', date: '2026-09-07', type: 'purchase' },
    { id: 'uw6', label: 'Appointment consultation - Health', amount: '-₹799', time: '11:30 AM', date: '2026-09-06', type: 'purchase' },
    { id: 'uw7', label: 'Chat consultation - Relationship', amount: '-₹299', time: '09:05 PM', date: '2026-09-05', type: 'purchase' },
    { id: 'uw8', label: 'Wallet top-up', amount: '+₹2,000', time: '04:20 PM', date: '2026-09-04', type: 'topup' },
    { id: 'uw9', label: 'General question - Business', amount: '-₹100', time: '01:10 PM', date: '2026-09-03', type: 'purchase' },
    { id: 'uw10', label: 'Appointment consultation - Finance', amount: '-₹499', time: '06:00 PM', date: '2026-09-02', type: 'purchase' },
    { id: 'uw11', label: 'Personal question - Health', amount: '-₹250', time: '10:00 AM', date: '2026-09-01', type: 'purchase' },
    { id: 'uw12', label: 'General question - Relationship', amount: '-₹100', time: '03:15 PM', date: '2026-09-01', type: 'purchase' },
    { id: 'uw13', label: 'Wallet top-up', amount: '+₹1,000', time: '06:40 PM', date: '2026-08-30', type: 'topup' },
    { id: 'uw14', label: 'Personal question - Marriage', amount: '-₹250', time: '07:40 PM', date: '2026-08-28', type: 'purchase' },
    { id: 'uw15', label: 'Wallet top-up', amount: '+₹5,000', time: '12:00 PM', date: '2026-08-25', type: 'topup' },
    { id: 'uw16', label: 'Audio call consultation - Finance', amount: '-₹699', time: '08:20 PM', date: '2026-08-22', type: 'purchase' },
    { id: 'uw17', label: 'Refund - Chat consultation (cancelled)', amount: '+₹249', time: '05:30 PM', date: '2026-08-19', type: 'refund' },
    { id: 'uw18', label: 'Appointment consultation - Vastu', amount: '-₹599', time: '10:00 AM', date: '2026-08-18', type: 'purchase' },
    { id: 'uw19', label: 'Wallet top-up', amount: '+₹2,500', time: '03:30 PM', date: '2026-08-15', type: 'topup' },
    { id: 'uw20', label: 'Chat consultation - Career', amount: '-₹249', time: '09:10 PM', date: '2026-08-12', type: 'purchase' },
    { id: 'uw21', label: 'Appointment consultation - Love', amount: '-₹899', time: '02:25 PM', date: '2026-08-11', type: 'purchase' },
    { id: 'uw22', label: 'Refund - Audio call (disconnected)', amount: '+₹200', time: '02:50 PM', date: '2026-08-09', type: 'refund' },
    { id: 'uw23', label: 'Pooja booking - Ganapathi Homam', amount: '-₹1,500', time: '11:45 AM', date: '2026-08-05', type: 'purchase' },
    { id: 'uw24', label: 'Personal question - Family', amount: '-₹250', time: '06:30 PM', date: '2026-07-28', type: 'purchase' },
    { id: 'uw25', label: 'Wallet top-up', amount: '+₹5,000', time: '10:50 AM', date: '2026-07-20', type: 'topup' },
    { id: 'uw26', label: 'General question - Health', amount: '-₹120', time: '05:15 PM', date: '2026-07-18', type: 'purchase' },
    { id: 'uw27', label: 'Audio call consultation - Love', amount: '-₹650', time: '09:00 PM', date: '2026-07-10', type: 'purchase' },
    { id: 'uw28', label: 'Wallet top-up', amount: '+₹4,000', time: '07:00 PM', date: '2026-06-25', type: 'topup' },
    { id: 'uw29', label: 'Audio call consultation - Career', amount: '-₹750', time: '08:05 PM', date: '2026-06-18', type: 'purchase' },
    { id: 'uw30', label: 'Appointment consultation - Health', amount: '-₹599', time: '12:30 PM', date: '2026-05-20', type: 'purchase' },
    { id: 'uw31', label: 'Wallet top-up', amount: '+₹3,000', time: '11:00 AM', date: '2026-05-10', type: 'topup' },
    { id: 'uw32', label: 'Chat consultation - Relationship', amount: '-₹299', time: '09:25 PM', date: '2026-04-15', type: 'purchase' },
    { id: 'uw33', label: 'Personal question - Marriage', amount: '-₹250', time: '06:10 PM', date: '2026-03-22', type: 'purchase' },
    { id: 'uw34', label: 'General question - Business', amount: '-₹100', time: '04:45 PM', date: '2026-02-14', type: 'purchase' },
    { id: 'uw35', label: 'Wallet top-up', amount: '+₹2,000', time: '12:15 PM', date: '2026-01-30', type: 'topup' },
  ],
}
const USER_WALLET_STORAGE_KEY = 'astroconnect-app-data-user-wallet'

function loadUserWallet() {
  const stored = loadFromStorage(USER_WALLET_STORAGE_KEY, null)
  if (stored && typeof stored === 'object' && stored.seedVersion === initialUserWallet.seedVersion) {
    return stored
  }
  return initialUserWallet
}

const USER_PAYMENT_METHODS_STORAGE_KEY = 'astroconnect-user-payment-methods'
const USER_AUTOPAYS_STORAGE_KEY = 'astroconnect-user-autopays'
const USER_WITHDRAWALS_STORAGE_KEY = 'astroconnect-user-withdrawals'

const initialUserPaymentMethods = [
  { id: 'upm-hdfc', type: 'bank', bankName: 'HDFC Bank', accountNumber: '98765432104589', ifsc: 'HDFC0001234', accountHolder: 'Priya V.', accountType: 'Savings', isDefault: true },
  { id: 'upm-gpay', type: 'upi', upiId: 'priya@upi', upiProvider: 'Google Pay', isDefault: false },
  { id: 'upm-visa', type: 'card', cardHolder: 'Priya V.', cardNumber: '4111111111118821', cardNetwork: 'Visa', cardType: 'Credit', expiryMonth: '12', expiryYear: '2027', isDefault: false },
]

const initialUserAutopays = [
  { id: 'uap-1', type: 'subscription', paymentMethodId: 'upm-hdfc', amount: 499, frequency: 'monthly', status: 'active', triggerThreshold: null, nextRunAt: '2026-10-08T10:00:00+05:30', createdAt: '2026-08-01T10:00:00+05:30' },
  { id: 'uap-2', type: 'low-balance', paymentMethodId: 'upm-gpay', amount: 500, frequency: null, status: 'active', triggerThreshold: 200, nextRunAt: null, createdAt: '2026-08-15T10:00:00+05:30' },
]

const initialUserWithdrawals = []

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

function loadFromStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function saveToStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function normalizeVisibility(value) {
  return ['public', 'followers', 'subscribers', 'private'].includes(value) ? value : 'public'
}

export function normalizeInteractionAccess(post = {}) {
  const legacyCommentsEnabled = post.commentsEnabled !== false
  const access = post.interactionAccess || {}
  return {
    like: access.like !== false,
    comment: access.comment !== undefined ? access.comment !== false : legacyCommentsEnabled,
    share: access.share !== false,
    save: access.save !== false,
  }
}

export function normalizePost(post) {
  const now = new Date().toISOString()
  const media = Array.isArray(post.media)
    ? post.media
      .filter((item) => item && typeof item.dataUrl === 'string' && (item.type?.startsWith('image/') || item.type?.startsWith('video/')))
      .map((item) => ({
        id: item.id || crypto.randomUUID(),
        name: String(item.name || 'Media file'),
        type: item.type,
        dataUrl: item.dataUrl,
      }))
    : []
  return {
    id: post.id || crypto.randomUUID(),
    astrologerId: post.astrologerId || 'astrologer-demo',
    tone: post.tone || 'violet',
    title: String(post.title || '').trim(),
    body: String(post.body || '').trim(),
    likeCount: Number(post.likeCount) || 0,
    media,
    visibility: normalizeVisibility(post.visibility),
    commentsEnabled: post.commentsEnabled !== false,
    interactionAccess: normalizeInteractionAccess(post),
    createdAt: post.createdAt || now,
    updatedAt: post.updatedAt || post.createdAt || now,
  }
}

export function selectVisiblePosts(posts, { userId, followedAstrologerIds = [], subscriptions = [], astrologerId } = {}) {
  const followed = new Set(followedAstrologerIds)
  const now = Date.now()
  const subscribed = new Set(subscriptions
    .filter((subscription) => subscription.userId === userId && (!subscription.expiresAt || new Date(subscription.expiresAt).getTime() > now))
    .map((subscription) => subscription.astrologerId))

  return posts.filter((post) => {
    if (astrologerId && post.astrologerId !== astrologerId) return false
    if (post.visibility === 'public') return true
    if (post.visibility === 'followers') return followed.has(post.astrologerId)
    if (post.visibility === 'subscribers') return subscribed.has(post.astrologerId) && Boolean(userId)
    return post.astrologerId === userId
  })
}

const LIVE_AUDIENCES = ['public', 'followers', 'subscribers']

export function sessionAudiences(session) {
  const audiences = Array.isArray(session.audiences) && session.audiences.length
    ? session.audiences.filter((audience) => LIVE_AUDIENCES.includes(audience))
    : LIVE_AUDIENCES.includes(session.audience)
      ? [session.audience]
      : ['public']
  return audiences.length ? audiences : ['public']
}

function toNonNegativeNumber(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0
}

export function audienceAccessDefaults(session) {
  const audiences = sessionAudiences(session)
  const values = []
  if (audiences.includes('public')) {
    values.push('public', 'followers', 'subscribers')
  } else if (audiences.includes('followers')) {
    values.push('followers', 'subscribers')
  } else if (audiences.includes('subscribers')) {
    values.push('subscribers')
  }
  if (audiences.includes('subscribers') && session.subscriberTier) values.push(session.subscriberTier)
  return Array.from(new Set(values))
}

export function normalizeLiveSession(session) {
  const now = new Date().toISOString()
  const audiences = sessionAudiences(session)
  const defaultAccess = audienceAccessDefaults(session)
  const validAccess = ['public', 'followers', 'subscribers', 'silver', 'gold', 'pro']
  const normalizedAccess = (values) => Array.isArray(values)
    ? Array.from(new Set(values.filter((value) => validAccess.includes(value))))
    : []
  const startedAt = session.startedAt || null
  const endedAt = session.endedAt || null
  const expired = session.status === 'live' && hasLiveSessionExpired({ startedAt })
  return {
    id: session.id || crypto.randomUUID(),
    astrologerId: session.astrologerId || 'astrologer-demo',
    title: String(session.title || '').trim(),
    description: String(session.description || '').trim(),
    category: String(session.category || 'Vedic Astrology'),
    freeQuestions: session.freeQuestions !== false,
    premiumQueue: session.premiumQueue !== false,
    rate: String(session.rate || '45'),
    visibility: normalizeVisibility(session.visibility),
    audiences,
    audience: audiences[0],
    subscriberTier: ['silver', 'gold', 'pro'].includes(String(session.subscriberTier || '').toLowerCase())
      ? String(session.subscriberTier).toLowerCase()
      : '',
    commentAccess: normalizedAccess(session.commentAccess).length
      ? normalizedAccess(session.commentAccess)
      : defaultAccess,
    recordAccess: normalizedAccess(session.recordAccess).length
      ? normalizedAccess(session.recordAccess)
      : defaultAccess,
    joinedPublic: toNonNegativeNumber(session.joinedPublic),
    joinedFollowers: toNonNegativeNumber(session.joinedFollowers),
    joinedSubscribers: toNonNegativeNumber(session.joinedSubscribers),
    earnings: toNonNegativeNumber(session.earnings),
    scheduledStartAt: session.scheduledStartAt || now,
    scheduledEndAt: session.scheduledEndAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: expired ? 'past' : (['upcoming', 'live', 'past'].includes(session.status) ? session.status : 'upcoming'),
    startedAt,
    endedAt: expired ? new Date(getLiveSessionExpiry({ startedAt })).toISOString() : endedAt,
    createdAt: session.createdAt || now,
  }
}

const QUESTIONS_STORAGE_KEY = 'astroconnect-questions'
const ASTROLOGER_SERVICES_STORAGE_KEY = 'astroconnect-astrologer-services'
const ASTROLOGER_POSTS_STORAGE_KEY = 'astroconnect-astrologer-posts'
const ASTROLOGER_LIVE_SESSIONS_STORAGE_KEY = 'astroconnect-astrologer-live-sessions-v3'
const APPOINTMENT_AVAILABILITY_STORAGE_KEY = 'astroconnect-appointment-availability'
const APPOINTMENTS_STORAGE_KEY = 'astroconnect-appointments'
const CONSULTATIONS_STORAGE_KEY = 'astroconnect-appointment-consultations'
const APPOINTMENT_CALLS_STORAGE_KEY = 'astroconnect-appointment-calls'
const POST_INTERACTIONS_STORAGE_KEY = 'astroconnect-post-interactions'
const POST_COMMENTS_STORAGE_KEY = 'astroconnect-post-comments'
const LIVE_REMINDERS_STORAGE_KEY = 'astroconnect-user-live-reminders-v1'
const FAMILY_HOROSCOPES_STORAGE_KEY = 'astroconnect-family-horoscopes'
const ATONEMENTS_STORAGE_KEY = 'astroconnect-atonements'
const ASTROLOGER_ACTIVITY_LOG_STORAGE_KEY = 'astroconnect-astrologer-activity-log'

const APPOINTMENT_WEEKDAYS = [
  { dayIndex: 0, label: 'Sun' },
  { dayIndex: 1, label: 'Mon' },
  { dayIndex: 2, label: 'Tue' },
  { dayIndex: 3, label: 'Wed' },
  { dayIndex: 4, label: 'Thu' },
  { dayIndex: 5, label: 'Fri' },
  { dayIndex: 6, label: 'Sat' },
]

const DEFAULT_APPOINTMENT_SLOT_WINDOWS = {
  0: [],
  1: [
    { start: '09:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  2: [
    { start: '09:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  3: [
    { start: '09:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  4: [
    { start: '09:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  5: [
    { start: '09:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  6: [
    { start: '10:00', end: '14:00' },
  ],
}

function monthKeyFromDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function monthLabelFromKey(monthKey) {
  if (!monthKey) return 'Not available'
  const [year, month] = String(monthKey).split('-').map(Number)
  if (!year || !month) return 'Not available'
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function normalizeAppointmentSlot(slot) {
  const validTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  const start = validTime(slot?.start) ? slot.start : '09:00'
  const end = validTime(slot?.end) ? slot.end : '10:00'
  return { start, end }
}

function normalizeAppointmentScheduleDay(day, dayIndex) {
  const fallbackSlots = DEFAULT_APPOINTMENT_SLOT_WINDOWS[dayIndex] || []
  const slots = Array.isArray(day?.slots) && day.slots.length
    ? day.slots.map(normalizeAppointmentSlot)
    : fallbackSlots.map(normalizeAppointmentSlot)
  return {
    dayIndex,
    enabled: day?.enabled !== false && slots.length > 0,
    slots,
    breaks: Array.isArray(day?.breaks)
      ? day.breaks.map(normalizeAppointmentSlot).filter((slot) => slot.start < slot.end)
      : [],
    continueWithoutBreak: Boolean(day?.continueWithoutBreak),
  }
}

function normalizeAppointmentDateOverride(override) {
  if (!override || typeof override !== 'object') return null
  const status = ['Available', 'Unavailable', 'Leave', 'Dyaan'].includes(override.status) ? override.status : 'Available'
  const windows = Array.isArray(override.windows)
    ? override.windows.map(normalizeAppointmentSlot).filter((slot) => slot.start < slot.end)
    : []
  const breaks = Array.isArray(override.breaks)
    ? override.breaks.map(normalizeAppointmentSlot).filter((slot) => slot.start < slot.end)
    : []
  const bookedSlots = Array.isArray(override.bookedSlots)
    ? override.bookedSlots.filter((n) => Number.isFinite(Number(n))).map((n) => Number(n))
    : []
  return { status, windows, breaks, bookedSlots, continueWithoutBreak: Boolean(override.continueWithoutBreak) }
}

// Normalize an { start, end } ISO date range. Invalid or missing ranges fall
// back to the provided default (which itself defaults to today → +90 days).
function normalizeAvailabilityPeriod(period, fallback) {
  const isoDay = (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value
      : null
  const start = isoDay(period?.start)
  const fallbackStart = isoDay(fallback?.start)
  if (!start && !fallbackStart) return { start: null, end: null }
  if (!start) return fallback
  const end = isoDay(period?.end)
  return {
    start,
    end: end && end >= start ? end : fallbackStart,
  }
}

function createDefaultAppointmentAvailabilityTemplate(astrologerId, monthKey, status = 'Draft') {
  const normalizedMonthKey = monthKey || monthKeyFromDate(new Date())
  const today = new Date()
  const start = today.toISOString().slice(0, 10)
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 90)
  return {
    id: `appointment-availability-${astrologerId || 'astrologer'}-${normalizedMonthKey}`,
    astrologerId: astrologerId || 'astrologer-demo',
    monthKey: normalizedMonthKey,
    monthLabel: monthLabelFromKey(normalizedMonthKey),
    timezone: 'Asia/Kolkata',
    appointmentDuration: 30,
    appointmentPrice: 799,
    appointmentBuffer: 5,
    status,
    publishedAt: null,
    updatedAt: new Date().toISOString(),
    availabilityPeriod: { start, end: endDate.toISOString().slice(0, 10) },
    dateOverrides: {},
    weeklySchedule: APPOINTMENT_WEEKDAYS.map((day) => normalizeAppointmentScheduleDay(null, day.dayIndex)),
    // Snapshot of the config that was last published. Kept immutable so saved
    // edits never change what users see until Publish Availability runs again.
    publishedWeeklySchedule: null,
    publishedDateOverrides: null,
    publishedAppointmentDuration: null,
    publishedAppointmentPrice: null,
    publishedAppointmentBuffer: null,
    publishedAvailabilityPeriod: null,
  }
}

function normalizeAppointmentAvailabilityTemplate(template) {
  if (!template || typeof template !== 'object') return null
  const monthKey = template.monthKey || monthKeyFromDate(new Date())
  const normalized = createDefaultAppointmentAvailabilityTemplate(template.astrologerId, monthKey, template.status === 'Published' ? 'Published' : 'Draft')
  const weeklySchedule = Array.isArray(template.weeklySchedule)
    ? APPOINTMENT_WEEKDAYS.map((day) => normalizeAppointmentScheduleDay(template.weeklySchedule.find((item) => Number(item?.dayIndex) === day.dayIndex), day.dayIndex))
    : normalized.weeklySchedule
  const dateOverrides = template.dateOverrides && typeof template.dateOverrides === 'object'
    ? Object.fromEntries(Object.entries(template.dateOverrides)
      .map(([dateIso, override]) => [dateIso, normalizeAppointmentDateOverride(override)])
      .filter(([, override]) => override))
    : {}
  const publishedWeeklySchedule = Array.isArray(template.publishedWeeklySchedule)
    ? APPOINTMENT_WEEKDAYS.map((day) => normalizeAppointmentScheduleDay(template.publishedWeeklySchedule.find((item) => Number(item?.dayIndex) === day.dayIndex), day.dayIndex))
    : null
  const publishedDateOverrides = template.publishedDateOverrides && typeof template.publishedDateOverrides === 'object'
    ? Object.fromEntries(Object.entries(template.publishedDateOverrides)
      .map(([dateIso, override]) => [dateIso, normalizeAppointmentDateOverride(override)])
      .filter(([, override]) => override))
    : null
  const availabilityPeriod = normalizeAvailabilityPeriod(template.availabilityPeriod, normalized.availabilityPeriod)
  const publishedAvailabilityPeriod = normalizeAvailabilityPeriod(template.publishedAvailabilityPeriod)
  return {
    ...normalized,
    ...template,
    id: template.id || normalized.id,
    astrologerId: template.astrologerId || normalized.astrologerId,
    monthKey,
    monthLabel: monthLabelFromKey(monthKey),
    status: template.status === 'Published' ? 'Published' : 'Draft',
    publishedAt: template.publishedAt || null,
    updatedAt: template.updatedAt || normalized.updatedAt,
    availabilityPeriod,
    publishedAvailabilityPeriod,
    reminderDismissedForMonthKey: template.reminderDismissedForMonthKey || null,
    appointmentDuration: [15, 30].includes(
      Number(template.appointmentDuration),
    )
      ? Number(template.appointmentDuration)
      : 30,
    appointmentPrice: Number.isFinite(Number(template.appointmentPrice)) && Number(template.appointmentPrice) >= 0
      ? Number(template.appointmentPrice)
      : 799,
    publishedAppointmentDuration: [15, 30].includes(
      Number(template.publishedAppointmentDuration),
    )
      ? Number(template.publishedAppointmentDuration)
      : null,
    publishedAppointmentPrice: Number.isFinite(Number(template.publishedAppointmentPrice))
      ? Number(template.publishedAppointmentPrice)
      : null,
    appointmentBuffer: Number.isFinite(Number(template.appointmentBuffer)) && Number(template.appointmentBuffer) >= 0
      ? Math.round(Number(template.appointmentBuffer))
      : 5,
    publishedAppointmentBuffer: Number.isFinite(Number(template.publishedAppointmentBuffer)) && Number(template.publishedAppointmentBuffer) >= 0
      ? Math.round(Number(template.publishedAppointmentBuffer))
      : null,
    dateOverrides,
    weeklySchedule,
    publishedWeeklySchedule,
    publishedDateOverrides,
  }
}

const initialAstrologerPosts = [
  { id: 'post-rani-1', astrologerId: 'astrologer-demo', tone: 'violet', title: 'Understanding the right time to begin', body: 'Timing becomes clearer when preparation and patience work together. Look for the small signs that your next step is ready.', visibility: 'public', likeCount: 128, comments: [{ id: 'comment-rani-1', author: 'Priya V.', text: 'This was exactly what I needed today.' }], createdAt: '2026-08-24T10:00:00+05:30', updatedAt: '2026-08-24T10:00:00+05:30' },
  { id: 'post-rani-2', astrologerId: 'astrologer-demo', tone: 'coral', title: 'A simple weekly reflection', body: 'Write down one question, one intention, and one action for the week ahead. Clarity grows through consistent reflection.', visibility: 'followers', likeCount: 94, comments: [], createdAt: '2026-08-21T10:00:00+05:30', updatedAt: '2026-08-21T10:00:00+05:30' },
  { id: 'post-rani-3', astrologerId: 'astrologer-demo', tone: 'gold', title: 'Your chart is a guide', body: 'Astrology can help you understand patterns, but your choices give those patterns direction.', visibility: 'subscribers', likeCount: 0, comments: [], createdAt: '2026-08-18T10:00:00+05:30', updatedAt: '2026-08-18T10:00:00+05:30' },
]

const DEMO_NOW = new Date()
const demoIso = (millisAgo) => new Date(DEMO_NOW.getTime() - millisAgo).toISOString()

const initialAstrologerLiveSessions = [
  { id: 'live-now-1', astrologerId: 'astrologer-demo', title: 'Career & Marriage Live Q&A', description: 'Ask questions about timing, relationships, and career decisions.', category: 'Vedic Astrology', freeQuestions: true, premiumQueue: true, rate: '45', visibility: 'public', audience: 'public', subscriberTier: '', scheduledStartAt: demoIso(75 * 60 * 1000), scheduledEndAt: demoIso(-45 * 60 * 1000), status: 'live', startedAt: demoIso(50 * 60 * 1000), endedAt: null, createdAt: demoIso(90 * 60 * 1000) },
  { id: 'live-now-2', astrologerId: 'acharya-meena', title: 'Marriage Match & Delay Remedies', description: 'Live guidance on marriage delays, kundli matching, and remedies for happy relationships.', category: 'Tarot Card Reading', freeQuestions: true, premiumQueue: true, rate: '60', visibility: 'followers', audience: 'followers', subscriberTier: '', scheduledStartAt: demoIso(60 * 60 * 1000), scheduledEndAt: demoIso(-60 * 60 * 1000), status: 'live', startedAt: demoIso(40 * 60 * 1000), endedAt: null, createdAt: demoIso(80 * 60 * 1000) },
  { id: 'live-now-3', astrologerId: 'astrologer-demo-3', title: 'Child Education & Career Choice', description: 'Choose the right stream, manage education stress, and plan your child’s career path.', category: 'Numerology', freeQuestions: false, premiumQueue: true, rate: '55', visibility: 'public', audience: 'public', subscriberTier: '', scheduledStartAt: demoIso(30 * 60 * 1000), scheduledEndAt: demoIso(-90 * 60 * 1000), status: 'live', startedAt: demoIso(28 * 60 * 1000), endedAt: null, createdAt: demoIso(60 * 60 * 1000) },
  { id: 'live-1', astrologerId: 'astrologer-demo', title: 'Marriage & Career Live Q&A', description: 'Ask questions about timing, relationships, and career decisions.', category: 'Vedic Astrology', freeQuestions: true, premiumQueue: true, rate: '45', visibility: 'public', audience: 'public', subscriberTier: '', scheduledStartAt: '2026-08-24T10:00:00+05:30', scheduledEndAt: '2026-08-24T11:00:00+05:30', status: 'past', startedAt: '2026-08-24T10:00:00+05:30', endedAt: '2026-08-24T11:00:00+05:30', createdAt: '2026-08-20T10:00:00+05:30', joinedPublic: 320, joinedFollowers: 0, joinedSubscribers: 0, earnings: 4200 },
  { id: 'live-2', astrologerId: 'astrologer-demo', title: 'Health & Remedies Live Session', description: 'A practical session on health-focused astrology and remedies.', category: 'Vedic Astrology', freeQuestions: true, premiumQueue: true, rate: '45', visibility: 'subscribers', audience: 'subscribers', subscriberTier: 'gold', scheduledStartAt: '2026-08-28T18:00:00+05:30', scheduledEndAt: '2026-08-28T19:00:00+05:30', status: 'past', startedAt: '2026-08-28T18:00:00+05:30', endedAt: '2026-08-28T19:00:00+05:30', createdAt: '2026-08-21T10:00:00+05:30', joinedPublic: 0, joinedFollowers: 0, joinedSubscribers: 24, earnings: 5200 },
  { id: 'live-3', astrologerId: 'astrologer-demo', title: 'Career & Marriage Live Q&A', description: 'Professional guidance on career moves, business timing, and married life.', category: 'Vedic Astrology', freeQuestions: true, premiumQueue: true, rate: '50', visibility: 'public', audiences: ['public', 'followers', 'subscribers'], audience: 'public', subscriberTier: 'gold', scheduledStartAt: '2026-09-05T10:30:00+05:30', scheduledEndAt: '2026-09-05T11:30:00+05:30', status: 'past', startedAt: '2026-09-05T10:30:00+05:30', endedAt: '2026-09-05T11:30:00+05:30', createdAt: '2026-09-01T10:00:00+05:30', joinedPublic: 210, joinedFollowers: 64, joinedSubscribers: 18, earnings: 4800 },
  { id: 'live-4', astrologerId: 'astrologer-demo', title: 'Tarot Party: Love & Relationship Predictions', description: 'Playful tarot drills on love, timing, and compatibility for early risers.', category: 'Tarot Card Reading', freeQuestions: false, premiumQueue: true, rate: '55', visibility: 'subscribers', audiences: ['followers', 'subscribers'], audience: 'followers', subscriberTier: 'silver', scheduledStartAt: '2026-09-12T06:30:00+05:30', scheduledEndAt: '2026-09-12T07:30:00+05:30', status: 'past', startedAt: '2026-09-12T06:32:00+05:30', endedAt: '2026-09-12T07:28:00+05:30', createdAt: '2026-09-10T18:00:00+05:30', joinedPublic: 0, joinedFollowers: 88, joinedSubscribers: 41, earnings: 3650 },
  { id: 'live-upcoming-1', astrologerId: 'astrologer-demo', title: 'Love & Career Predictions: Weekend Special', description: 'A relaxed Q&A on love, timing of marriage, and career moves for the coming months.', category: 'Vedic Astrology', freeQuestions: true, premiumQueue: true, rate: '48', visibility: 'public', audience: 'public', subscriberTier: '', scheduledStartAt: demoIso(-26 * 60 * 60 * 1000), scheduledEndAt: demoIso(-25 * 60 * 60 * 1000), status: 'upcoming', startedAt: null, endedAt: null, createdAt: demoIso(-30 * 60 * 60 * 1000), joinedPublic: 0, joinedFollowers: 0, joinedSubscribers: 0, earnings: 0 },
]

const initialConsultationHistory = [
  {
    id: 'consult-chat-001',
    userId: 'customer-priya',
    astrologerId: 'astrologer-demo',
    customerId: 'customer-priya',
    customerName: 'Priya V.',
    type: 'Chat',
    startedAt: '2026-08-20T10:30:00+05:30',
    durationMinutes: 24,
    pricePerMinute: 15,
    amount: 360,
    status: 'Completed',
    messages: [
      { id: 'consult-chat-001-1', sender: 'user', text: 'I have been feeling uncertain about my career direction. Should I consider a change this year?', sentAt: '2026-08-20T10:31:00+05:30' },
      { id: 'consult-chat-001-2', sender: 'astrologer', text: 'Your chart shows a period of exploration before the next strong growth phase. Take time to compare options rather than making a rushed move.', sentAt: '2026-08-20T10:34:00+05:30' },
      { id: 'consult-chat-001-3', sender: 'user', text: 'Would the second half of the year be more supportive?', sentAt: '2026-08-20T10:41:00+05:30' },
      { id: 'consult-chat-001-4', sender: 'astrologer', text: 'Yes. July onward looks more supportive for interviews, networking, and a deliberate transition.', sentAt: '2026-08-20T10:45:00+05:30' },
    ],
  },
  { id: 'consult-audio-001', userId: 'customer-priya', astrologerId: 'astrologer-demo', customerId: 'customer-priya', customerName: 'Priya V.', type: 'Audio Call', startedAt: '2026-08-18T18:15:00+05:30', durationMinutes: 32, pricePerMinute: 25, amount: 800, status: 'Completed' },
  {
    id: 'consult-chat-002',
    userId: 'customer-kannan',
    astrologerId: 'astrologer-demo',
    customerId: 'customer-kannan',
    customerName: 'Kannan',
    type: 'Chat',
    startedAt: '2026-08-19T14:10:00+05:30',
    durationMinutes: 18,
    pricePerMinute: 15,
    amount: 270,
    status: 'Completed',
    messages: [
      { id: 'consult-chat-002-1', sender: 'user', text: 'Is this a good time to expand my business?', sentAt: '2026-08-19T14:11:00+05:30' },
      { id: 'consult-chat-002-2', sender: 'astrologer', text: 'The coming months are better for preparation and strengthening your current foundation. Expand in phases and keep your cash flow protected.', sentAt: '2026-08-19T14:15:00+05:30' },
      { id: 'consult-chat-002-3', sender: 'user', text: 'I will start with a smaller expansion first. Thank you.', sentAt: '2026-08-19T14:24:00+05:30' },
    ],
  },
  { id: 'consult-audio-002', userId: 'customer-kannan', astrologerId: 'astrologer-demo', customerId: 'customer-kannan', customerName: 'Kannan', type: 'Audio Call', startedAt: '2026-08-16T09:00:00+05:30', durationMinutes: 20, pricePerMinute: 25, amount: 500, status: 'Completed' },
  {
    id: 'consult-chat-003',
    userId: 'customer-devi',
    astrologerId: 'astrologer-demo',
    customerId: 'customer-devi',
    customerName: 'Devi',
    type: 'Chat',
    startedAt: '2026-08-17T20:45:00+05:30',
    durationMinutes: 41,
    pricePerMinute: 15,
    amount: 615,
    status: 'Completed',
    messages: [
      { id: 'consult-chat-003-1', sender: 'user', text: 'I am waiting for an important interview result. Do you see a positive outcome?', sentAt: '2026-08-17T20:46:00+05:30' },
      { id: 'consult-chat-003-2', sender: 'astrologer', text: 'There is encouraging movement around your career prospects. Stay prepared and follow up calmly if you do not hear back immediately.', sentAt: '2026-08-17T20:52:00+05:30' },
      { id: 'consult-chat-003-3', sender: 'user', text: 'Should I continue applying for other roles while I wait?', sentAt: '2026-08-17T21:04:00+05:30' },
      { id: 'consult-chat-003-4', sender: 'astrologer', text: 'Yes, keep your options open. A second opportunity may give you a stronger choice and better timing.', sentAt: '2026-08-17T21:12:00+05:30' },
      { id: 'consult-chat-003-5', sender: 'user', text: 'That gives me clarity. Thank you for the guidance.', sentAt: '2026-08-17T21:25:00+05:30' },
    ],
  },
  { id: 'consult-audio-003', userId: 'customer-arun', astrologerId: 'astrologer-demo', customerId: 'customer-arun', customerName: 'Arun', type: 'Audio Call', startedAt: '2026-08-15T16:20:00+05:30', durationMinutes: 28, pricePerMinute: 25, amount: 700, status: 'Completed' },
  {
    id: 'consult-chat-004',
    userId: 'customer-meena',
    astrologerId: 'astrologer-demo',
    customerId: 'customer-meena',
    customerName: 'Meena R.',
    type: 'Chat',
    startedAt: '2026-08-14T12:00:00+05:30',
    durationMinutes: 26,
    pricePerMinute: 15,
    amount: 390,
    status: 'Completed',
    messages: [
      { id: 'consult-chat-004-1', sender: 'user', text: 'I want to understand how to handle a family decision.', sentAt: '2026-08-14T12:01:00+05:30' },
      { id: 'consult-chat-004-2', sender: 'astrologer', text: 'Take the decision step by step and allow space for everyone’s perspective.', sentAt: '2026-08-14T12:20:00+05:30' },
    ],
  },
  { id: 'consult-audio-004', userId: 'customer-arjun-subscriber', astrologerId: 'astrologer-demo', customerId: 'customer-arjun-subscriber', customerName: 'Arjun D.', type: 'Audio Call', startedAt: '2026-08-12T17:30:00+05:30', durationMinutes: 35, pricePerMinute: 25, amount: 875, status: 'Completed' },
  { id: 'consult-chat-user-004', userId: 'user-demo', astrologerId: 'astrologer-demo', customerId: 'user-demo', customerName: 'Priya V.', type: 'Chat', startedAt: '2026-08-21T12:15:00+05:30', durationMinutes: 18, pricePerMinute: 15, amount: 270, status: 'Completed', messages: [{ id: 'consult-chat-user-004-1', sender: 'user', text: 'I would like some guidance about my next career step.', sentAt: '2026-08-21T12:16:00+05:30' }, { id: 'consult-chat-user-004-2', sender: 'astrologer', text: 'This is a good time to focus on preparation and choose the opportunity that gives you steady growth.', sentAt: '2026-08-21T12:21:00+05:30' }] },
  { id: 'consult-chat-user-006', userId: 'user-demo', astrologerId: 'astrologer-demo', customerId: 'user-demo', customerName: 'Priya V.', type: 'Chat', startedAt: '2026-08-24T19:10:00+05:30', durationMinutes: 26, pricePerMinute: 15, amount: 390, status: 'Completed', messages: [{ id: 'consult-chat-user-006-1', sender: 'user', text: 'I have been seeing repeated changes at work. How should I approach them?', sentAt: '2026-08-24T19:11:00+05:30' }, { id: 'consult-chat-user-006-2', sender: 'astrologer', text: 'Take each change one step at a time and keep your long-term priorities visible while you adapt.', sentAt: '2026-08-24T19:18:00+05:30' }] },
  { id: 'consult-audio-user-004', userId: 'user-demo', astrologerId: 'astrologer-demo', customerId: 'user-demo', customerName: 'Priya V.', type: 'Audio Call', startedAt: '2026-08-23T10:00:00+05:30', durationMinutes: 30, pricePerMinute: 25, amount: 750, status: 'Completed' },
  { id: 'consult-audio-user-006', userId: 'user-demo', astrologerId: 'astrologer-demo', customerId: 'user-demo', customerName: 'Priya V.', type: 'Audio Call', startedAt: '2026-08-26T09:30:00+05:30', durationMinutes: 30, pricePerMinute: 25, amount: 750, status: 'Completed' },
  // --- Recent instant calls & chats (last 7 days) for the My Activity / Recent Activity feeds ---
  { id: 'consult-audio-recent-001', userId: 'customer-vikram', astrologerId: 'astrologer-demo', customerId: 'customer-vikram', customerName: 'Vikram S.', type: 'Audio Call', startedAt: questionsDemoIso(1 * DAY_MS + 2 * 60 * 60 * 1000), durationMinutes: 22, pricePerMinute: 25, amount: 550, status: 'Completed' },
  { id: 'consult-audio-recent-002', userId: 'customer-anjali', astrologerId: 'astrologer-demo', customerId: 'customer-anjali', customerName: 'Anjali M.', type: 'Audio Call', startedAt: questionsDemoIso(3 * DAY_MS + 6 * 60 * 60 * 1000), durationMinutes: 30, pricePerMinute: 25, amount: 750, status: 'Completed' },
  { id: 'consult-audio-recent-003', userId: 'customer-suresh2', astrologerId: 'astrologer-demo', customerId: 'customer-suresh2', customerName: 'Suresh P.', type: 'Audio Call', startedAt: questionsDemoIso(5 * DAY_MS + 1 * 60 * 60 * 1000), durationMinutes: 15, pricePerMinute: 25, amount: 375, status: 'Completed' },
  {
    id: 'consult-chat-recent-001',
    userId: 'customer-divya2',
    astrologerId: 'astrologer-demo',
    customerId: 'customer-divya2',
    customerName: 'Divya T.',
    type: 'Chat',
    startedAt: questionsDemoIso(2 * DAY_MS + 4 * 60 * 60 * 1000),
    durationMinutes: 20,
    pricePerMinute: 15,
    amount: 300,
    status: 'Completed',
    messages: [
      { id: 'consult-chat-recent-001-1', sender: 'user', text: 'Is this a good time to start a new business venture?', sentAt: questionsDemoIso(2 * DAY_MS + 4 * 60 * 60 * 1000) },
      { id: 'consult-chat-recent-001-2', sender: 'astrologer', text: 'Yes, the next few weeks are favorable. Start with a small pilot before scaling up.', sentAt: questionsDemoIso(2 * DAY_MS + 4 * 60 * 60 * 1000 - 5 * 60 * 1000) },
    ],
  },
  {
    id: 'consult-chat-recent-002',
    userId: 'customer-rohan',
    astrologerId: 'astrologer-demo',
    customerId: 'customer-rohan',
    customerName: 'Rohan B.',
    type: 'Chat',
    startedAt: questionsDemoIso(4 * DAY_MS + 8 * 60 * 60 * 1000),
    durationMinutes: 16,
    pricePerMinute: 15,
    amount: 240,
    status: 'Completed',
    messages: [
      { id: 'consult-chat-recent-002-1', sender: 'user', text: 'Will I get good results in my upcoming exams?', sentAt: questionsDemoIso(4 * DAY_MS + 8 * 60 * 60 * 1000) },
      { id: 'consult-chat-recent-002-2', sender: 'astrologer', text: 'Your chart favors consistent preparation. Focus on revision in the final week for the best outcome.', sentAt: questionsDemoIso(4 * DAY_MS + 8 * 60 * 60 * 1000 - 6 * 60 * 1000) },
    ],
  },
  {
    id: 'consult-chat-recent-003',
    userId: 'customer-sanjana',
    astrologerId: 'astrologer-demo',
    customerId: 'customer-sanjana',
    customerName: 'Sanjana K.',
    type: 'Chat',
    startedAt: questionsDemoIso(6 * DAY_MS + 3 * 60 * 60 * 1000),
    durationMinutes: 12,
    pricePerMinute: 15,
    amount: 180,
    status: 'Completed',
    messages: [
      { id: 'consult-chat-recent-003-1', sender: 'user', text: 'How can I improve my relationship with my in-laws?', sentAt: questionsDemoIso(6 * DAY_MS + 3 * 60 * 60 * 1000) },
      { id: 'consult-chat-recent-003-2', sender: 'astrologer', text: 'Approach conversations with patience and small gestures of care. Trust will build gradually over the coming month.', sentAt: questionsDemoIso(6 * DAY_MS + 3 * 60 * 60 * 1000 - 7 * 60 * 1000) },
    ],
  },
]

export const DEFAULT_ASTROLOGER_SERVICES = {
  isOnline: true,
  callEnabled: true,
  chatEnabled: true,
  dndEnabled: false,
  callPricePerMinute: 25,
  chatPricePerMinute: 15,
}

function normalizeAstrologerServices(value) {
  const source = value && typeof value === 'object' ? value : {}
  const toPrice = (input, fallback) => {
    const price = Number(input)
    return Number.isFinite(price) && price >= 0 ? price : fallback
  }

  return {
    isOnline: source.isOnline !== false,
    callEnabled: source.callEnabled !== false,
    chatEnabled: source.chatEnabled !== false,
    dndEnabled: source.dndEnabled === true,
    callPricePerMinute: toPrice(source.callPricePerMinute, DEFAULT_ASTROLOGER_SERVICES.callPricePerMinute),
    chatPricePerMinute: toPrice(source.chatPricePerMinute, DEFAULT_ASTROLOGER_SERVICES.chatPricePerMinute),
  }
}

export function getEffectiveAstrologerServices(settings, presenceActive = undefined) {
  const normalized = normalizeAstrologerServices(settings)
  const isPresent = presenceActive === undefined ? normalized.isOnline : presenceActive
  return {
    ...normalized,
    isOnline: isPresent,
    available: isPresent && !normalized.dndEnabled,
    callAvailable: isPresent && !normalized.dndEnabled && normalized.callEnabled,
    chatAvailable: isPresent && !normalized.dndEnabled && normalized.chatEnabled,
  }
}

export function AppDataProvider({ children }) {
  const { currentUser } = useAuth()
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [questions, setQuestions] = useState(() => {
    const stored = loadFromStorage(QUESTIONS_STORAGE_KEY, null)
    if (!Array.isArray(stored)) return initialQuestions
    const storedIds = new Set(stored.map((question) => question.id))
    return [...stored, ...initialQuestions.filter((question) => !storedIds.has(question.id))]
  })
  const [notifications, setNotifications] = useState(initialNotifications)
  const [astrologerWallet, setAstrologerWallet] = useState(loadAstrologerWallet)
  const [userWallet, setUserWallet] = useState(() => loadUserWallet())
  const [profile] = useState(initialProfile)
  const [selectedCampaignId, setSelectedCampaignId] = useState(initialCampaigns[0].id)
  const [liveStreamOpen, setLiveStreamOpen] = useState(false)
  const [questionPreviewId, setQuestionPreviewId] = useState(null)
  const [appointments, setAppointments] = useState(() => {
    const stored = loadFromStorage(APPOINTMENTS_STORAGE_KEY, null)
    const seed = [...mockAppointmentHistory, ...mockAppointments]
    if (!Array.isArray(stored) || !stored.length) return seed
    const storedIds = new Set(stored.map((appointment) => appointment.id))
    return [...stored, ...seed.filter((appointment) => !storedIds.has(appointment.id))]
  })
  const [consultations, setConsultations] = useState(() => {
    const stored = loadFromStorage(CONSULTATIONS_STORAGE_KEY, null)
    if (Array.isArray(stored) && stored.length) return stored
    return mockConsultations
  })
  const [appointmentCalls, setAppointmentCalls] = useState(() => loadFromStorage(APPOINTMENT_CALLS_STORAGE_KEY, []))
  const [atonements, setAtonements] = useState(() => {
    const stored = loadFromStorage(ATONEMENTS_STORAGE_KEY, null)
    const seed = initialAtonements.map(normalizeAtonement)
    if (!Array.isArray(stored) || !stored.length) return seed
    const storedIds = new Set(stored.map((atonement) => atonement.id))
    return [...stored.map(normalizeAtonement), ...seed.filter((atonement) => !storedIds.has(atonement.id))]
  })
  const [followedAstrologerIds, setFollowedAstrologerIds] = useState(['astrologer-demo', 'astrologer-10', 'astrologer-11', 'astrologer-13', 'astrologer-4', 'astrologer-5', 'astrologer-6'])
  const [subscriptions, setSubscriptions] = useState(() => {
    if (currentUser?.role !== ROLES.USER || !currentUser?.id) return []
    return subscribedAstrologers.map((astrologer, index) => ({
      id: `demo-subscription-${astrologer.id}`,
      userId: currentUser.id,
      userName: currentUser.name || currentUser.id,
      astrologerId: astrologer.id,
      astrologerName: astrologer.name,
      tier: index % 3 === 0 ? 'Gold' : 'Silver',
      subscribedAt: new Date().toISOString(),
      expiresAt: addDaysMs(30),
      discountQuestions: [],
    }))
  })
  const [blockedUserIds, setBlockedUserIds] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [purchasedSlots, setPurchasedSlots] = useState(initialPurchasedSlots)
  const [payoutMethods, setPayoutMethods] = useState(() => loadFromStorage(ASTROLOGER_PAYOUT_METHODS_STORAGE_KEY, initialPayoutMethods))
  const [activityLog, setActivityLog] = useState(() => loadFromStorage(ASTROLOGER_ACTIVITY_LOG_STORAGE_KEY, []))
  const [consultationHistory] = useState(initialConsultationHistory)
  const [postLikes, setPostLikes] = useState(() => loadFromStorage(`${POST_INTERACTIONS_STORAGE_KEY}-likes-${currentUser?.id || 'guest'}`, {}))
  const [savedPostIds, setSavedPostIds] = useState(() => loadFromStorage(`${POST_INTERACTIONS_STORAGE_KEY}-saved-${currentUser?.id || 'guest'}`, []))
  const [postComments, setPostComments] = useState(() => loadFromStorage(
    POST_COMMENTS_STORAGE_KEY,
    Object.fromEntries(mockAstrologerPosts.map((post) => [post.id, post.comments || []])),
  ))
  const [presenceActive, setPresenceActive] = useState(false)
  const [userPaymentMethods, setUserPaymentMethods] = useState(() => loadFromStorage(USER_PAYMENT_METHODS_STORAGE_KEY, initialUserPaymentMethods))
  const [userAutopays, setUserAutopays] = useState(() => loadFromStorage(USER_AUTOPAYS_STORAGE_KEY, initialUserAutopays))
  const [userWithdrawals, setUserWithdrawals] = useState(() => loadFromStorage(USER_WITHDRAWALS_STORAGE_KEY, initialUserWithdrawals))
  const [familyHoroscopes, setFamilyHoroscopes] = useState(() => loadFromStorage(FAMILY_HOROSCOPES_STORAGE_KEY, []))
  const [astrologerServices, setAstrologerServices] = useState(() => normalizeAstrologerServices(
    loadFromStorage(ASTROLOGER_SERVICES_STORAGE_KEY, DEFAULT_ASTROLOGER_SERVICES),
  ))
  const [astrologerPosts, setAstrologerPosts] = useState(() => {
    const stored = loadFromStorage(ASTROLOGER_POSTS_STORAGE_KEY, initialAstrologerPosts)
    return Array.isArray(stored) ? stored.map(normalizePost) : initialAstrologerPosts.map(normalizePost)
  })
  const [astrologerLiveSessions, setAstrologerLiveSessions] = useState(() => {
    const stored = loadFromStorage(ASTROLOGER_LIVE_SESSIONS_STORAGE_KEY, initialAstrologerLiveSessions)
    return Array.isArray(stored) ? stored.map(normalizeLiveSession) : initialAstrologerLiveSessions.map(normalizeLiveSession)
  })
  const [liveReminders, setLiveReminders] = useState(() => {
    const stored = loadFromStorage(LIVE_REMINDERS_STORAGE_KEY, [])
    return Array.isArray(stored)
      ? stored.filter((reminder) => reminder && reminder.sessionId)
      : []
  })
  const [appointmentAvailabilityTemplates, setAppointmentAvailabilityTemplates] = useState(() => {
    const stored = loadFromStorage(APPOINTMENT_AVAILABILITY_STORAGE_KEY, [])
    return Array.isArray(stored) ? stored.map(normalizeAppointmentAvailabilityTemplate).filter(Boolean) : []
  })

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

  useEffect(() => {
    const closeExpiredLiveSessions = () => {
      const now = Date.now()
      setAstrologerLiveSessions((prev) => {
        let changed = false
        const next = prev.map((session) => {
          if (session.status !== 'live' || !hasLiveSessionExpired(session, now)) return session
          changed = true
          return {
            ...session,
            status: 'past',
            endedAt: new Date(now).toISOString(),
            scheduledEndAt: new Date(now).toISOString(),
          }
        })
        return changed ? next : prev
      })
    }

    closeExpiredLiveSessions()
    const timer = window.setInterval(closeExpiredLiveSessions, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    saveToStorage(QUESTIONS_STORAGE_KEY, questions)
  }, [questions])

  useEffect(() => {
    saveToStorage(USER_WALLET_STORAGE_KEY, userWallet)
  }, [userWallet])

  useEffect(() => {
    saveToStorage(ASTROLOGER_WALLET_STORAGE_KEY, astrologerWallet)
  }, [astrologerWallet])

  useEffect(() => {
    saveToStorage(ASTROLOGER_PAYOUT_METHODS_STORAGE_KEY, payoutMethods)
  }, [payoutMethods])

  useEffect(() => {
    saveToStorage(ASTROLOGER_ACTIVITY_LOG_STORAGE_KEY, activityLog)
  }, [activityLog])

  useEffect(() => {
    saveToStorage(ASTROLOGER_SERVICES_STORAGE_KEY, astrologerServices)
  }, [astrologerServices])

  useEffect(() => {
    saveToStorage(ASTROLOGER_POSTS_STORAGE_KEY, astrologerPosts)
  }, [astrologerPosts])

  useEffect(() => {
    const userKey = currentUser?.id || 'guest'
    setPostLikes(loadFromStorage(`${POST_INTERACTIONS_STORAGE_KEY}-likes-${userKey}`, {}))
    setSavedPostIds(loadFromStorage(`${POST_INTERACTIONS_STORAGE_KEY}-saved-${userKey}`, []))
  }, [currentUser?.id])

  useEffect(() => {
    const userKey = currentUser?.id || 'guest'
    saveToStorage(`${POST_INTERACTIONS_STORAGE_KEY}-likes-${userKey}`, postLikes)
    saveToStorage(`${POST_INTERACTIONS_STORAGE_KEY}-saved-${userKey}`, savedPostIds)
  }, [currentUser?.id, postLikes, savedPostIds])

  useEffect(() => {
    saveToStorage(POST_COMMENTS_STORAGE_KEY, postComments)
  }, [postComments])

  useEffect(() => {
    saveToStorage(LIVE_REMINDERS_STORAGE_KEY, liveReminders)
  }, [liveReminders])

  useEffect(() => {
    saveToStorage(ASTROLOGER_LIVE_SESSIONS_STORAGE_KEY, astrologerLiveSessions)
  }, [astrologerLiveSessions])

  useEffect(() => {
    saveToStorage(APPOINTMENT_AVAILABILITY_STORAGE_KEY, appointmentAvailabilityTemplates)
  }, [appointmentAvailabilityTemplates])

  useEffect(() => {
    saveToStorage(APPOINTMENTS_STORAGE_KEY, appointments)
  }, [appointments])

  useEffect(() => {
    saveToStorage(CONSULTATIONS_STORAGE_KEY, consultations)
  }, [consultations])

  useEffect(() => {
    saveToStorage(APPOINTMENT_CALLS_STORAGE_KEY, appointmentCalls)
  }, [appointmentCalls])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === APPOINTMENT_CALLS_STORAGE_KEY && e.newValue) {
        try { setAppointmentCalls(JSON.parse(e.newValue) || []) } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    const poll = window.setInterval(() => {
      const raw = loadFromStorage(APPOINTMENT_CALLS_STORAGE_KEY, null)
      if (Array.isArray(raw)) {
        const cur = JSON.stringify(raw)
        const prev = JSON.stringify(appointmentCalls)
        if (cur !== prev) setAppointmentCalls(raw)
      }
    }, 1000)
    return () => { window.removeEventListener('storage', onStorage); window.clearInterval(poll) }
  }, [appointmentCalls])

  useEffect(() => {
    const missedThresholdMs = 45 * 1000
    const now = Date.now()
    const toMiss = appointmentCalls.filter((c) => c.status === 'ringing' && now - new Date(c.createdAt).getTime() > missedThresholdMs)
    if (!toMiss.length) return
    setAppointmentCalls((prev) => prev.map((c) => toMiss.some((m) => m.id === c.id) ? { ...c, status: 'missed', missedAt: new Date().toISOString() } : c))
    toMiss.forEach((call) => {
      const appointment = appointments.find((a) => a.id === call.appointmentId)
      setNotifications((prev) => [{
        id: `acall-missed-${call.id}`,
        title: `Missed call from ${call.astrologerName || appointment?.astrologer || 'your astrologer'}`,
        detail: `You missed a call for ${appointment?.time || ''} ${appointment?.date || ''}. Tap to call back or view appointment.`,
        time: 'just now',
        route: `/user/incoming/${call.appointmentId}`,
        audience: ROLES.USER,
        category: 'appointments',
        read: false,
        appointmentId: call.appointmentId,
        callId: call.id,
      }, ...prev])
    })
  }, [appointmentCalls, appointments])

  useEffect(() => {
    saveToStorage(ATONEMENTS_STORAGE_KEY, atonements)
  }, [atonements])

  useEffect(() => {
    saveToStorage(USER_PAYMENT_METHODS_STORAGE_KEY, userPaymentMethods)
  }, [userPaymentMethods])

  useEffect(() => {
    saveToStorage(USER_AUTOPAYS_STORAGE_KEY, userAutopays)
  }, [userAutopays])

  useEffect(() => {
    saveToStorage(USER_WITHDRAWALS_STORAGE_KEY, userWithdrawals)
  }, [userWithdrawals])

  useEffect(() => {
    saveToStorage(FAMILY_HOROSCOPES_STORAGE_KEY, familyHoroscopes)
  }, [familyHoroscopes])

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || campaigns[0]
  const selectedQuestion = questionPreviewId ? questions.find((question) => question.id === questionPreviewId) : null

  // Appends an entry to the astrologer's "My Activity" audit log.
  // This only ever records that an action happened — it never touches a
  // record's own business status, which each module continues to own.
  function logActivity({ astrologerId, kind, type, title, description, relatedId, customerName, amount, moduleStatus }) {
    // The demo astrologer account's currentUser.id is 'astrologer-demo-alias',
    // while every seeded record uses 'astrologer-demo' — normalize the same
    // way the rest of the app does so activity always lands on the right feed.
    const actingAstrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
    setActivityLog((prev) => [
      {
        id: `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        astrologerId: astrologerId || actingAstrologerId || 'astrologer-demo',
        kind,
        type,
        title,
        description: description || '',
        relatedId: relatedId || null,
        customerName: customerName || null,
        amount: amount != null ? Number(amount) : null,
        moduleStatus: moduleStatus || null,
      },
      ...prev,
    ])
  }

  const actions = useMemo(() => ({
    createAtonement(payload) {
      const record = createAtonementRecord(payload)
      setAtonements((prev) => [record, ...prev.filter((item) => item.id !== record.id)])
      return record
    },
    updateAtonementDay(atonementId, dayIndex, completed) {
      let updated = null
      setAtonements((prev) => prev.map((record) => {
        if (record.id !== atonementId) return record
        updated = updateAtonementDay(record, dayIndex, completed)
        return updated
      }))
      return updated
    },
    togglePostLike(postId) {
      const post = astrologerPosts.find((entry) => entry.id === postId)
      if (post?.interactionAccess?.like === false) return
      setPostLikes((prev) => ({ ...prev, [postId]: !prev[postId] }))
    },
    toggleSavedPost(postId) {
      const post = astrologerPosts.find((entry) => entry.id === postId)
      if (post?.interactionAccess?.save === false) return
      setSavedPostIds((prev) => prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId])
    },
    addPostComment(postId, text, author = 'You') {
      const trimmed = String(text || '').trim()
      if (!trimmed) return
      const post = astrologerPosts.find((entry) => entry.id === postId)
      if (post && post.interactionAccess?.comment === false) return
      setPostComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), { id: `comment-${Date.now()}`, author, userId: currentUser?.id || null, text: trimmed }] }))
    },
    selectCampaign: setSelectedCampaignId,
    setLiveStreamOpen,
    setQuestionPreviewId,
    debitUserWallet({ amount, astrologer, duration, service = 'Call', transactionId }) {
      setUserWallet((prev) => {
        if (transactionId && prev.transactions.some((transaction) => transaction.id === transactionId)) return prev
        const value = Number(amount) || 0
        return {
          ...prev,
          balance: prev.balance - value,
          spent: (prev.spent || 0) + value,
          transactions: [
            {
              id: transactionId || crypto.randomUUID(),
              label: `${service} with ${astrologer}`,
              amount: `-₹${value.toLocaleString('en-IN')}`,
              time: 'just now',
              date: new Date().toISOString(),
              type: 'purchase',
              duration,
            },
            ...prev.transactions,
          ],
        }
      })
    },
    topUpUserWallet(amount) {
      const value = Number(amount) || 0
      if (value <= 0) return
      setUserWallet((prev) => ({
        ...prev,
        balance: prev.balance + value,
        toppedUp: (prev.toppedUp || 0) + value,
        transactions: [{ id: crypto.randomUUID(), label: 'Wallet top-up', amount: `+₹${value.toLocaleString('en-IN')}`, time: 'just now', date: new Date().toISOString(), type: 'topup' }, ...prev.transactions],
      }))
    },
    updateAstrologerServices(patch) {
      setAstrologerServices((previous) => normalizeAstrologerServices({ ...previous, ...patch }))
    },
    setAstrologerPresence(active) {
      setPresenceActive(Boolean(active))
    },
    createIncomingRequest(payload) {
      const isSubscriber = subscriptions.some((subscription) => subscription.userId === payload.userId && subscription.astrologerId === payload.astrologerId)
      const relationship = payload.relationship || (isSubscriber ? 'subscriber' : followedAstrologerIds.includes(payload.astrologerId) ? 'follower' : 'user')
      const subscription = subscriptions.find((entry) => entry.userId === payload.userId && entry.astrologerId === payload.astrologerId)
      const request = {
        id: crypto.randomUUID(),
        type: payload.type === 'call' ? 'call' : 'chat',
        userId: payload.userId,
        userName: payload.userName || 'Astro Connect user',
        userUsername: payload.userUsername || payload.userId || 'user',
        astrologerId: payload.astrologerId,
        relationship,
        subscriberTier: payload.subscriberTier || subscription?.tier || null,
        subscriptionPrice: payload.subscriptionPrice || (subscription ? TIER_PRICES[subscription.tier] : null),
        status: 'pending',
        createdAt: new Date().toISOString(),
        message: payload.message || '',
        messages: [],
        notificationsSaved: false,
      }
      setIncomingRequests((prev) => [request, ...prev])
      return request
    },
    acceptIncomingRequest(requestId) {
      setIncomingRequests((prev) => prev.map((request) => request.id === requestId ? { ...request, status: 'accepted', acceptedAt: new Date().toISOString() } : request))
    },
    declineIncomingRequest(requestId) {
      setIncomingRequests((prev) => prev.map((request) => request.id === requestId ? { ...request, status: 'declined', declinedAt: new Date().toISOString() } : request))
    },
    saveIncomingRequestNotification(requestId) {
      const request = incomingRequests.find((entry) => entry.id === requestId)
      if (!request || request.notificationsSaved || request.status !== 'pending') return
      setIncomingRequests((prev) => prev.map((entry) => entry.id === requestId ? { ...entry, notificationsSaved: true } : entry))
      setNotifications((prev) => [{
        id: `incoming-${request.id}`,
        title: `New ${request.type} request from ${request.userName}`,
        detail: `${request.relationship === 'subscriber' ? `${request.subscriberTier || 'Subscriber'} subscriber` : request.relationship} request waiting for your response.`,
        time: 'just now',
        route: `/astrologer?incomingRequestId=${request.id}`,
        audience: ROLES.ASTROLOGER,
        category: 'consultations',
        read: false,
        incomingRequestId: request.id,
      }, ...prev])
    },
    sendIncomingMessage(requestId, message) {
      const text = String(message || '').trim()
      if (!text) return
      setIncomingRequests((prev) => prev.map((request) => request.id === requestId
        ? { ...request, messages: [...(request.messages || []), { id: crypto.randomUUID(), sender: 'astrologer', text, sentAt: new Date().toISOString() }] }
        : request))
    },
    createPost(payload) {
      const now = new Date().toISOString()
      const post = normalizePost({
        ...payload,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      })
      setAstrologerPosts((prev) => [post, ...prev])
      return post
    },
    updatePost(postId, patch) {
      const now = new Date().toISOString()
      setAstrologerPosts((prev) => prev.map((post) => post.id === postId
        ? normalizePost({ ...post, ...patch, id: post.id, updatedAt: now })
        : post))
    },
    deletePost(postId) {
      setAstrologerPosts((prev) => prev.filter((post) => post.id !== postId))
    },
    createLiveSession(payload) {
      const session = normalizeLiveSession({
        ...payload,
        id: crypto.randomUUID(),
        status: 'upcoming',
        startedAt: null,
        endedAt: null,
        createdAt: new Date().toISOString(),
      })
      setAstrologerLiveSessions((prev) => [session, ...prev])
      logActivity({
        astrologerId: session.astrologerId,
        kind: 'live',
        type: 'live-session-scheduled',
        title: 'Live Session Scheduled',
        description: `Scheduled the live session "${session.title || 'Untitled session'}"`,
        relatedId: session.id,
        moduleStatus: 'upcoming',
      })
      return session
    },
    updateLiveSession(sessionId, patch) {
      setAstrologerLiveSessions((prev) => prev.map((session) => session.id === sessionId
        ? normalizeLiveSession({ ...session, ...patch, id: session.id })
        : session))
    },
    deleteLiveSession(sessionId) {
      const session = astrologerLiveSessions.find((item) => item.id === sessionId)
      setAstrologerLiveSessions((prev) => prev.filter((session) => session.id !== sessionId))
      if (session) {
        logActivity({
          astrologerId: session.astrologerId,
          kind: 'live',
          type: 'live-session-deleted',
          title: 'Live Session Deleted',
          description: `Deleted the live session "${session.title || 'Untitled session'}"`,
          relatedId: sessionId,
          moduleStatus: 'Deleted',
        })
      }
    },
    startLiveSession(sessionId) {
      const startedAt = new Date()
      const scheduledEndAt = new Date(startedAt.getTime() + LIVE_SESSION_MAX_DURATION_MS).toISOString()
      setAstrologerLiveSessions((prev) => prev.map((session) => session.id === sessionId
        ? { ...session, status: 'live', startedAt: startedAt.toISOString(), endedAt: null, scheduledEndAt }
        : session))
      const session = astrologerLiveSessions.find((item) => item.id === sessionId)
      logActivity({
        astrologerId: session?.astrologerId,
        kind: 'live',
        type: 'live-session-started',
        title: 'Live Session Started',
        description: `Went live${session?.title ? ` with "${session.title}"` : ''}`,
        relatedId: sessionId,
        moduleStatus: 'live',
      })
    },
    // `summary` carries the earnings/viewer count accumulated in the live
    // room UI, which otherwise only lived in local component state and was
    // never persisted onto the session record.
    endLiveSession(sessionId, summary = {}) {
      const endedAt = new Date().toISOString()
      const patch = { status: 'past', endedAt }
      if (summary.earnings != null) patch.earnings = summary.earnings
      if (summary.viewerCount != null) patch.joinedPublic = summary.viewerCount
      setAstrologerLiveSessions((prev) => prev.map((session) => session.id === sessionId
        ? { ...session, ...patch }
        : session))
      const session = astrologerLiveSessions.find((item) => item.id === sessionId)
      logActivity({
        astrologerId: session?.astrologerId,
        kind: 'live',
        type: 'live-session-ended',
        title: 'Live Session Ended',
        description: `Ended the live session${session?.title ? ` "${session.title}"` : ''}`,
        relatedId: sessionId,
        amount: summary.earnings ?? session?.earnings ?? null,
        moduleStatus: 'past',
      })
    },
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
        if (campaign && availabilityChanged && patch.status === 'Closed') {
          logActivity({
            kind: 'campaigns',
            type: 'campaign-frozen',
            title: 'Campaign Frozen',
            description: `Froze the "${campaign.name}" campaign`,
            relatedId: campaignId,
            moduleStatus: 'Closed',
          })
        } else if (campaign && discountChanged) {
          logActivity({
            kind: 'campaigns',
            type: 'campaign-discount-updated',
            title: 'Campaign Discount Updated',
            description: `Updated the subscriber discount on "${campaign.name}" to ${Number(patch.discountPercent) || 0}%`,
            relatedId: campaignId,
            amount: Number(patch.discountPercent) || 0,
            moduleStatus: campaign.status,
          })
        }
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
      const campaign = campaigns.find((item) => item.id === campaignId)
      setCampaigns((prev) => prev.filter((campaign) => campaign.id !== campaignId))
      setSelectedCampaignId((currentId) => {
        if (currentId !== campaignId) return currentId
        const remainingCampaign = campaigns.find((campaign) => campaign.id !== campaignId)
        return remainingCampaign?.id || null
      })
      if (campaign) {
        logActivity({
          kind: 'campaigns',
          type: 'campaign-deleted',
          title: 'Campaign Deleted',
          description: `Deleted the "${campaign.name}" campaign`,
          relatedId: campaignId,
          moduleStatus: 'Deleted',
        })
      }
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
      logActivity({
        kind: 'campaigns',
        type: 'campaign-created',
        title: campaign.status === 'Active'
          ? 'Campaign Created & Published'
          : campaign.status === 'Scheduled'
            ? 'Campaign Scheduled'
            : 'Campaign Created (Draft)',
        description: `Created the "${campaign.name}" campaign`,
        relatedId: campaign.id,
        amount: campaign.generalPrice || campaign.personalPrice || campaign.packagePrice || null,
        moduleStatus: campaign.status,
      })
      return campaign
    },
    publishCampaign(campaignId) {
      setCampaigns((prev) =>
        prev.map((campaign) => (campaign.id === campaignId ? { ...campaign, status: 'Active' } : campaign)),
      )
      const campaign = campaigns.find((item) => item.id === campaignId)
      if (campaign) {
        logActivity({
          kind: 'campaigns',
          type: 'campaign-published',
          title: 'Campaign Published',
          description: `Published the "${campaign.name}" campaign`,
          relatedId: campaignId,
          amount: campaign.generalPrice || campaign.personalPrice || campaign.packagePrice || null,
          moduleStatus: 'Active',
        })
      }
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
            astrologerId: purchase.astrologerId || 'astrologer-demo',
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
    // Viewing a question is an astrologer action worth remembering, but it
    // must never change the question's own business status (stays Pending
    // until an answer is actually submitted).
    viewQuestion(questionId) {
      const question = questions.find((item) => item.id === questionId)
      if (!question) return
      logActivity({
        astrologerId: question.astrologerId,
        kind: 'questions',
        type: 'question-viewed',
        title: 'Question Viewed',
        description: `Viewed ${question.user || 'a user'}'s ${question.category || ''} question`.trim(),
        relatedId: questionId,
        customerName: question.user,
        amount: question.purchaseAmount,
        moduleStatus: question.status,
      })
    },
    saveQuestionDraft(questionId, draftAnswer) {
      const question = questions.find((item) => item.id === questionId)
      setQuestions((prev) =>
        updateQuestion(prev, questionId, (question) => ({
          ...question,
          draftAnswer,
          status: 'In Progress',
          history: [...question.history, 'Draft saved'],
        })),
      )
      if (question) {
        logActivity({
          astrologerId: question.astrologerId,
          kind: 'questions',
          type: 'question-draft-saved',
          title: 'Question Draft Saved',
          description: `Saved a draft answer for ${question.user || 'a user'}'s question`,
          relatedId: questionId,
          customerName: question.user,
          amount: question.purchaseAmount,
          moduleStatus: 'In Progress',
        })
      }
    },
    submitQuestionAnswer(questionId, answer) {
      const question = questions.find((item) => item.id === questionId)
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
      if (question) {
        logActivity({
          astrologerId: question.astrologerId,
          kind: 'questions',
          type: 'question-answered',
          title: 'Question Answered',
          description: `Submitted an answer to ${question.user || 'a user'}'s ${question.category || ''} question`.trim(),
          relatedId: questionId,
          customerName: question.user,
          amount: question.purchaseAmount,
          moduleStatus: 'Under Review',
        })
      }
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
      logActivity({
        astrologerId: question.astrologerId,
        kind: 'questions',
        type: 'question-answer-corrected',
        title: 'Answer Corrected',
        description: `Made a one-time correction to the answer for ${question.user || 'a user'}`,
        relatedId: questionId,
        customerName: question.user,
        amount: question.purchaseAmount,
        moduleStatus: 'Answered',
      })
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
      const nextId = `QTN-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`
      const submittedAt = new Date().toISOString()
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
          astrologerId: payload.astrologerId || null,
          raised: 'Just now',
          raisedAt: submittedAt,
          submittedAt,
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
      const question = questions.find((item) => item.id === questionId)
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
      if (question) {
        logActivity({
          astrologerId: question.astrologerId,
          kind: 'disputes',
          type: 'dispute-responded',
          title: status === 'Closed' ? 'Dispute Closed' : 'Dispute Resolved',
          description: `${status === 'Closed' ? 'Closed' : 'Resolved'} the dispute raised by ${question.user || 'a user'} on question ${questionId}`,
          relatedId: questionId,
          customerName: question.user,
          amount: question.purchaseAmount,
          moduleStatus: status,
        })
      }
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
      const question = questions.find((entry) => entry.id === questionId)
      if (currentUser?.role === ROLES.USER && (question?.submittedByUserId || question?.userId) === currentUser.id) {
        recordUserActivity({ userId: currentUser.id, type: 'review', title: 'Answer rated', summary: review || `You rated the answer ${rating} star${rating === 1 ? '' : 's'}.`, metadata: `${rating}/5` })
      }
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
      const question = questions.find((entry) => entry.id === questionId)
      if (currentUser?.role === ROLES.USER && (question?.submittedByUserId || question?.userId) === currentUser.id) {
        recordUserActivity({ userId: currentUser.id, type: 'review', title: 'Dispute resolution rated', summary: `You rated the dispute resolution ${rating} star${rating === 1 ? '' : 's'}.`, metadata: `${rating}/5` })
      }
    },
    bookAppointment(payload) {
      const appointment = {
        id: `apt-${Date.now().toString(36)}`,
        astrologerId: payload.astrologerId,
        astrologer: payload.astrologerName,
        type: payload.type || 'Audio Consultation',
        date: payload.date,
        time: payload.time,
        price: Number(payload.price) || 499,
        amount: Number(payload.amount ?? payload.price) || 499,
        duration: payload.duration || '30 Minutes',
        package: payload.package || '30 Min Consultation',
        bookingGroup: payload.bookingGroup || null,
        bookingSequence: payload.bookingSequence || 1,
        orderId: payload.orderId || payload.bookingGroup || null,
        paymentStatus: payload.paymentStatus || 'Paid',
        paymentMethod: payload.paymentMethod || 'Wallet',
        transactionId: payload.transactionId || null,
        bookedAt: payload.bookedAt || new Date().toISOString(),
        bookingDate: payload.bookingDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        questionDetails: payload.questionDetails || null,
        horoscope: payload.horoscope || null,
        dateIso: payload.dateIso || payload.date || null,
        start: payload.start || null,
        end: payload.end || null,
        userId: payload.userId || null,
        customerName: payload.customerName || null,
        status: 'Booked',
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
    setAppointmentStatus(appointmentId, status, meta = {}) {
      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment.id === appointmentId ? { ...appointment, status, ...meta } : appointment,
        ),
      )
    },
    refundAppointment(appointmentId, meta = {}) {
      setAppointments((prev) => prev.map((appointment) => {
        if (appointment.id !== appointmentId) return appointment
        const keepLifecycleStatus = appointment.status === 'Cancelled' ||
          isCancelledStatus(appointment.status) ||
          appointment.status === 'Rescheduled'
        return {
          ...appointment,
          status: keepLifecycleStatus ? appointment.status : 'Refunded',
          refundStatus: 'Completed',
          paymentStatus: 'Refunded',
          refundAmount: Number(meta.amount ?? appointment.amount ?? appointment.price) || 0,
          refundedAt: meta.refundedAt || new Date().toISOString(),
        }
      }))
      return appointmentId
    },
    // Viewing an appointment (from Appointment History) is the only thing
    // that should ever put an appointment into "My Activity" — booking one
    // must never create an entry by itself, and viewing never changes the
    // appointment's own status.
    viewAppointment(appointmentId) {
      const appointment = appointments.find((item) => item.id === appointmentId)
      if (!appointment) return
      const when = [appointment.date || appointment.dateIso, appointment.time].filter(Boolean).join(', ')
      logActivity({
        astrologerId: appointment.astrologerId,
        kind: 'appointments',
        type: 'appointment-viewed',
        title: 'Appointment Viewed',
        description: `Viewed the ${appointment.type || 'appointment'} with ${appointment.customerName || 'a customer'}${when ? ` scheduled for ${when}` : ''}`,
        relatedId: appointmentId,
        customerName: appointment.customerName,
        amount: appointment.amount ?? appointment.price,
        moduleStatus: appointment.status,
      })
    },
    cancelAppointmentByAstrologer(appointmentId, meta = {}) {
      const target = appointments.find((item) => item.id === appointmentId)
      if (!target) return null
      if (target.status !== 'Booked') return null
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === appointmentId
            ? {
                ...item,
                status: 'Cancelled by Astrologer',
                cancelledBy: 'Astrologer',
                cancelledAt: new Date().toISOString(),
                cancellationReason: meta.reason || null,
              }
            : item,
        ),
      )
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: 'Appointment cancelled by astrologer',
          detail: `Your ${(target.type || 'appointment').toLowerCase()} with ${target.astrologer} on ${target.date}, ${target.time} was cancelled by the astrologer. A refund or reschedule can be arranged.`,
          time: 'just now',
          route: `/user/appointment-details?id=${appointmentId}`,
          audience: ROLES.USER,
          category: 'appointments',
          read: false,
        },
        ...prev,
      ])
      logActivity({
        astrologerId: target.astrologerId,
        kind: 'appointments',
        type: 'appointment-cancelled',
        title: 'Appointment Cancelled',
        description: `Cancelled the appointment with ${target.customerName || 'a customer'}${meta.reason ? ` (${meta.reason})` : ''}`,
        relatedId: appointmentId,
        customerName: target.customerName,
        amount: target.amount ?? target.price,
        moduleStatus: 'Cancelled by Astrologer',
      })
      return target
    },
    saveConsultation({ appointmentId, notes, fileName, fileType, fileSize, attachments, atonement, send }) {
      if (!appointmentId) return null
      const appointment = appointments.find((item) => item.id === appointmentId)
      const existing = consultations.find((consultation) => consultation.appointmentId === appointmentId)
      const wasAlreadySent = Boolean(existing?.sent)
      const astrologerId = appointment?.astrologerId || 'astrologer-demo'
      const astrologerName = mockAstrologers.find((item) => item.id === astrologerId)?.name || 'Your astrologer'
      const record = {
        id: existing?.id || `cons-${appointmentId}-${Date.now()}`,
        appointmentId,
        astrologerId,
        astrologerName,
        userId: appointment?.userId || null,
        customerName: appointment?.customerName || null,
        notes: notes ?? '',
        fileName: fileName ?? '',
        fileType: fileType ?? '',
        fileSize: fileSize ?? '',
        attachments: attachments ?? existing?.attachments ?? [],
        atonement: atonement ? {
          ...atonement,
          dueAt: atonement.startAt && atonement.completionDays ? new Date(new Date(atonement.startAt).getTime() + atonement.completionDays * 86400000).toISOString() : null,
          status: existing?.atonement?.completedAt ? 'Completed' : 'Pending',
          completedAt: existing?.atonement?.completedAt || null,
        } : existing?.atonement || null,
        sent: send ? true : Boolean(existing?.sent),
        sentAt: send ? new Date().toISOString() : existing?.sentAt || null,
        sentToUser: send ? true : Boolean(existing?.sentToUser),
        updatedAt: new Date().toISOString(),
      }
      setConsultations((prev) => {
        const idx = prev.findIndex((consultation) => consultation.appointmentId === appointmentId)
        if (idx === -1) return [record, ...prev]
        const next = prev.slice()
        next[idx] = record
        return next
      })
      if (send) {
        const astrologer = mockAstrologers.find((item) => item.id === record.astrologerId)
        const attachmentTypes = [...new Set((record.attachments || []).map((item) => item.type || 'File'))]
        setNotifications((prev) => [{
          id: `consultation-${record.id}-${Date.now()}`,
          title: wasAlreadySent ? 'Consultation Updated' : 'New Consultation Received',
          detail: wasAlreadySent
            ? `${astrologer?.name || 'Your astrologer'} updated your consultation.`
            : `You have received a consultation from ${astrologer?.name || 'your astrologer'}.`,
          time: 'Just now',
          audience: ROLES.USER,
          userId: record.userId,
          category: 'consultations',
          consultationId: record.id,
          consultationTitle: (record.notes || 'Consultation summary').slice(0, 90),
          consultationSentAt: record.sentAt,
          attachmentCount: (record.attachments || []).length,
          attachmentTypes,
          read: false,
        }, ...prev])
        this.updateAppointment(appointmentId, {
          consultationFollowUpRequired: false,
          consultationSentAt: record.sentAt,
        })
      }
      logActivity({
        astrologerId,
        kind: 'appointments',
        type: send ? 'consultation-sent' : 'consultation-draft-saved',
        title: send ? 'Consultation Sent' : 'Consultation Draft Saved',
        description: send
          ? `Sent consultation notes to ${record.customerName || 'the customer'}`
          : `Saved a draft of consultation notes for ${record.customerName || 'the customer'}`,
        relatedId: record.id,
        customerName: record.customerName,
        moduleStatus: send ? 'Sent' : 'Draft',
      })
      return record
    },
    sendConsultation(appointmentId) {
      setConsultations((prev) =>
        prev.map((consultation) =>
          consultation.appointmentId === appointmentId
            ? { ...consultation, sent: true, sentToUser: true, sentAt: new Date().toISOString() }
            : consultation,
        ),
      )
      this.updateAppointment(appointmentId, {
        consultationFollowUpRequired: false,
        consultationSentAt: new Date().toISOString(),
      })
    },
    completeAtonement(consultationId) {
      const completedAt = new Date().toISOString()
      setConsultations((prev) => prev.map((consultation) => consultation.id === consultationId && consultation.atonement
        ? { ...consultation, atonement: { ...consultation.atonement, status: 'Completed', completedAt } }
        : consultation))
    },
    updateAppointment(appointmentId, patch = {}) {
      setAppointments((prev) =>
        prev.map((item) => (item.id === appointmentId ? { ...item, ...patch } : item)),
      )
      return patch
    },
    savePrivateNotes(appointmentId, privateNotes) {
      this.updateAppointment(appointmentId, { privateNotes: privateNotes ?? '' })
      const appointment = appointments.find((item) => item.id === appointmentId)
      logActivity({
        astrologerId: appointment?.astrologerId,
        kind: 'appointments',
        type: 'appointment-notes-saved',
        title: 'Call Notes Saved',
        description: `Saved private call notes for ${appointment?.customerName || 'a customer'}`,
        relatedId: appointmentId,
        customerName: appointment?.customerName,
        moduleStatus: appointment?.status,
      })
    },
    savePreCallAnalysis(appointmentId, preCallAnalysis) {
      this.updateAppointment(appointmentId, { preCallAnalysis: preCallAnalysis ?? '' })
      const appointment = appointments.find((item) => item.id === appointmentId)
      logActivity({
        astrologerId: appointment?.astrologerId,
        kind: 'appointments',
        type: 'appointment-precall-saved',
        title: 'Pre-Call Analysis Saved',
        description: `Saved pre-call analysis for ${appointment?.customerName || 'a customer'}`,
        relatedId: appointmentId,
        customerName: appointment?.customerName,
        moduleStatus: appointment?.status,
      })
    },
    saveHoroscopeAttachment(appointmentId, horoscope) {
      this.updateAppointment(appointmentId, { horoscope: horoscope || null })
      const appointment = appointments.find((item) => item.id === appointmentId)
      logActivity({
        astrologerId: appointment?.astrologerId,
        kind: 'appointments',
        type: 'appointment-horoscope-attached',
        title: 'Horoscope Attached',
        description: `Attached a horoscope for ${appointment?.customerName || 'a customer'}`,
        relatedId: appointmentId,
        customerName: appointment?.customerName,
        moduleStatus: appointment?.status,
      })
    },
    completeAppointmentCall(appointmentId, { callDurationSeconds, endedAt, privateNotes } = {}) {
      const appointment = appointments.find((item) => item.id === appointmentId)
      const patch = {
        status: 'Completed',
        completedAt: endedAt || new Date().toISOString(),
        callDurationSeconds: callDurationSeconds || 0,
        consultationFollowUpRequired: true,
      }
      if (privateNotes != null) patch.privateNotes = privateNotes
      this.updateAppointment(appointmentId, patch)
      setAppointmentCalls((prev) => prev.map((c) => c.appointmentId === appointmentId && (c.status === 'ringing' || c.status === 'accepted') ? { ...c, status: 'ended', endedAt: new Date().toISOString(), durationSeconds: callDurationSeconds || 0 } : c))
      logActivity({
        astrologerId: appointment?.astrologerId,
        kind: 'appointments',
        type: 'appointment-completed',
        title: 'Appointment Completed',
        description: `Completed the appointment with ${appointment?.customerName || 'a customer'}`,
        relatedId: appointmentId,
        customerName: appointment?.customerName,
        amount: appointment?.amount ?? appointment?.price,
        moduleStatus: 'Completed',
      })
    },
    initiateAppointmentCall(appointmentId) {
      const appointment = appointments.find((item) => item.id === appointmentId)
      if (!appointment) return null
      const existing = appointmentCalls.find((c) => c.appointmentId === appointmentId && c.status === 'ringing')
      if (existing) return existing
      const call = {
        id: `acall-${Date.now().toString(36)}`,
        appointmentId,
        astrologerId: appointment.astrologerId,
        astrologerName: appointment.astrologer,
        userId: appointment.userId,
        customerName: appointment.customerName,
        status: 'ringing',
        createdAt: new Date().toISOString(),
        rating: null,
        feedback: '',
      }
      setAppointmentCalls((prev) => [call, ...prev])
      setNotifications((prev) => [{
        id: `acall-notif-${call.id}`,
        title: `Incoming call from ${appointment.astrologer}`,
        detail: `Your appointment at ${appointment.time} is starting.`,
        time: 'just now',
        route: `/user/incoming/${appointmentId}`,
        audience: ROLES.USER,
        category: 'appointments',
        read: false,
        appointmentId,
        callId: call.id,
      }, ...prev])
      return call
    },
    acceptAppointmentCall(callId) {
      setAppointmentCalls((prev) => prev.map((c) => c.id === callId ? { ...c, status: 'accepted', acceptedAt: new Date().toISOString() } : c))
    },
    declineAppointmentCall(callId) {
      setAppointmentCalls((prev) => prev.map((c) => c.id === callId ? { ...c, status: 'declined', endedAt: new Date().toISOString() } : c))
    },
    endAppointmentCall(callId, { durationSeconds } = {}) {
      setAppointmentCalls((prev) => prev.map((c) => c.id === callId ? { ...c, status: 'ended', endedAt: new Date().toISOString(), durationSeconds: durationSeconds || 0 } : c))
    },
    rateAppointmentCall(callId, rating, feedback) {
      setAppointmentCalls((prev) => prev.map((c) => c.id === callId ? { ...c, rating, feedback, ratedAt: new Date().toISOString() } : c))
      const call = appointmentCalls.find((c) => c.id === callId)
      if (call && currentUser?.role === ROLES.USER) {
        recordUserActivity({ userId: currentUser.id, type: 'review', title: 'Call rated', summary: `You rated the call with ${call.astrologerName} ${rating} stars.`, metadata: feedback || `${rating}/5` })
      }
    },
    rescheduleAppointment({ originalId, date, dateIso, time, start, end }) {
      const original = appointments.find((item) => item.id === originalId)
      if (!original) return null
      // Only eligible Booked appointments can be rescheduled. Completed,
      // Cancelled, No-show, Auto-cancelled and already-rescheduled originals
      // are never candidates.
      if ((original.status || 'Booked') !== 'Booked') return null
      if (isCancelledStatus(original.status)) return null
      if (original.rescheduledTo || original.rescheduledFrom) return null
      logActivity({
        astrologerId: original.astrologerId,
        kind: 'appointments',
        type: 'appointment-rescheduled',
        title: 'Appointment Rescheduled',
        description: `Rescheduled the appointment with ${original.customerName || 'a customer'} to ${date || dateIso}, ${time || ''}`.trim(),
        relatedId: originalId,
        customerName: original.customerName,
        amount: original.amount ?? original.price,
        moduleStatus: 'Rescheduled',
      })
      setAppointments((prev) => {
        return prev.map((item) => item.id === originalId
          ? {
              ...item,
              date,
              dateIso,
              time,
              start,
              end,
              status: 'Rescheduled',
              rescheduledAt: new Date().toISOString(),
              note: 'Appointment time changed without creating a second booking.',
            }
          : item)
      })
      return originalId
    },
    saveAppointmentAvailabilityTemplate(template) {
      const normalized = normalizeAppointmentAvailabilityTemplate(template)
      if (!normalized) return null
      const existing = appointmentAvailabilityTemplates.find((item) =>
        item.id === normalized.id ||
        (item.astrologerId === normalized.astrologerId && item.monthKey === normalized.monthKey),
      )
      // Saving edits must never discard the published snapshot. While a
      // snapshot exists the template stays "Published" (with possible
      // unpublished changes); Publish is what replaces the snapshot.
      const retained = existing?.publishedWeeklySchedule || existing?.publishedAt
        ? {
            status: 'Published',
            publishedAt: existing.publishedAt || null,
            publishedWeeklySchedule: existing.publishedWeeklySchedule || null,
            publishedDateOverrides: existing.publishedDateOverrides || null,
            publishedAvailabilityPeriod: existing.publishedAvailabilityPeriod || null,
            publishedAppointmentDuration: existing.publishedAppointmentDuration != null
              ? existing.publishedAppointmentDuration
              : null,
            publishedAppointmentPrice: existing.publishedAppointmentPrice != null
              ? existing.publishedAppointmentPrice
              : null,
            publishedAppointmentBuffer: existing.publishedAppointmentBuffer != null
              ? existing.publishedAppointmentBuffer
              : null,
          }
        : {}
      const merged = { ...normalized, ...retained }
      setAppointmentAvailabilityTemplates((prev) => {
        const existing2 = prev.find((item) =>
          item.id === normalized.id ||
          (item.astrologerId === normalized.astrologerId && item.monthKey === normalized.monthKey),
        )
        const retained2 = existing2?.publishedWeeklySchedule || existing2?.publishedAt
          ? {
              status: 'Published',
              publishedAt: existing2.publishedAt || null,
              publishedWeeklySchedule: existing2.publishedWeeklySchedule || null,
              publishedDateOverrides: existing2.publishedDateOverrides || null,
              publishedAvailabilityPeriod: existing2.publishedAvailabilityPeriod || null,
              publishedAppointmentDuration: existing2.publishedAppointmentDuration != null
                ? existing2.publishedAppointmentDuration
                : null,
              publishedAppointmentPrice: existing2.publishedAppointmentPrice != null
                ? existing2.publishedAppointmentPrice
                : null,
              publishedAppointmentBuffer: existing2.publishedAppointmentBuffer != null
                ? existing2.publishedAppointmentBuffer
                : null,
            }
          : {}
        const merged2 = { ...normalized, ...retained2 }
        const policy = {
          appointmentDuration: merged2.appointmentDuration,
          appointmentPrice: merged2.appointmentPrice,
          appointmentBuffer: merged2.appointmentBuffer,
        }
        const withPolicy = prev.map((item) => item.astrologerId === merged2.astrologerId ? { ...item, ...policy } : item)
        const index = withPolicy.findIndex((item) =>
          item.id === merged2.id ||
          (item.astrologerId === merged2.astrologerId && item.monthKey === merged2.monthKey),
        )
        if (index === -1) return [merged2, ...withPolicy]
        const next = withPolicy.slice()
        next[index] = merged2
        return next
      })
      return merged
    },
    publishAppointmentAvailabilityTemplate(template) {
      const normalized = normalizeAppointmentAvailabilityTemplate(template)
      if (!normalized) return null
      const cloneWindow = (item) => (item ? { start: item.start, end: item.end } : { start: '09:00', end: '16:00' })
      const published = {
        ...normalized,
        status: 'Published',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedWeeklySchedule: (normalized.weeklySchedule || []).map((day) => ({
          ...day,
          slots: (day.slots || []).map(cloneWindow),
          breaks: (day.breaks || []).map(cloneWindow),
        })),
        publishedDateOverrides: Object.fromEntries(
          Object.entries(normalized.dateOverrides || {}).map(([dateIso, override]) => [
            dateIso,
            {
              ...override,
              windows: (override.windows || []).map(cloneWindow),
              breaks: (override.breaks || []).map(cloneWindow),
              bookedSlots: Array.isArray(override.bookedSlots) ? override.bookedSlots.slice() : [],
            },
          ]),
        ),
        publishedAppointmentDuration: normalized.appointmentDuration,
        publishedAppointmentPrice: normalized.appointmentPrice,
        publishedAppointmentBuffer: normalized.appointmentBuffer,
        publishedAvailabilityPeriod: normalized.availabilityPeriod
          ? { start: normalized.availabilityPeriod.start, end: normalized.availabilityPeriod.end }
          : null,
      }
      setAppointmentAvailabilityTemplates((prev) => {
        const policy = { appointmentDuration: published.appointmentDuration, appointmentPrice: published.appointmentPrice, appointmentBuffer: published.appointmentBuffer }
        const withPolicy = prev.map((item) => item.astrologerId === published.astrologerId ? { ...item, ...policy } : item)
        const index = withPolicy.findIndex((item) =>
          item.id === published.id ||
          (item.astrologerId === published.astrologerId && item.monthKey === published.monthKey),
        )
        if (index === -1) return [published, ...withPolicy]
        const next = withPolicy.slice()
        next[index] = published
        return next
      })
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: 'Availability published',
          detail: `Your appointment availability for ${published.monthLabel} is now published.`,
          time: 'just now',
          route: '/astrologer/appointments',
          audience: ROLES.ASTROLOGER,
          category: 'appointments',
          read: false,
        },
        ...prev,
      ])
      logActivity({
        astrologerId: published.astrologerId,
        kind: 'appointments',
        type: 'availability-published',
        title: 'Availability Published',
        description: `Published appointment availability for ${published.monthLabel}`,
        relatedId: published.id,
        amount: published.appointmentPrice,
        moduleStatus: 'Published',
      })
      return published
    },
    toggleFollow(astrologerId, astrologerName, isCurrentlyFollowing) {
      setFollowedAstrologerIds((prev) =>
        isCurrentlyFollowing ? prev.filter((id) => id !== astrologerId) : [...prev, astrologerId],
      )
      if (currentUser?.role === ROLES.USER) {
        recordUserActivity({ userId: currentUser.id, type: 'follow', title: isCurrentlyFollowing ? 'Astrologer unfollowed' : 'Astrologer followed', summary: `${isCurrentlyFollowing ? 'You stopped following' : 'You started following'} ${astrologerName}.`, metadata: astrologerName })
      }
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
    toggleUserBlock(userId, userName) {
      if (!userId) return
      const wasBlocked = blockedUserIds.includes(userId)
      setBlockedUserIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId])
      logActivity({
        kind: 'audience',
        type: wasBlocked ? 'follower-unblocked' : 'follower-blocked',
        title: wasBlocked ? 'Follower Unblocked' : 'Follower Blocked',
        description: `${wasBlocked ? 'Unblocked' : 'Blocked'} ${userName || 'a follower'}`,
        relatedId: userId,
        customerName: userName || userId,
        moduleStatus: wasBlocked ? 'Unblocked' : 'Blocked',
      })
    },
    subscribeToAstrologer(astrologerId, astrologerName, userId, userName, tier = 'Silver', opts = {}) {
      if (!userId) return null
      const existing = subscriptions.find((sub) => sub.userId === userId && sub.astrologerId === astrologerId)
      if (existing) return existing
      const normalizedTier = ['Silver', 'Gold', 'Platinum'].includes(tier) ? tier : 'Silver'
      const subscription = {
        userId,
        userName: userName || userId || 'Subscriber',
        astrologerId,
        astrologerName,
        tier: normalizedTier,
        subscribedAt: new Date().toISOString(),
        expiresAt: addDaysMs(30),
        price: opts.price ?? 499,
        paymentMethodId: opts.paymentMethodId || null,
        autopayEnabled: Boolean(opts.autopayEnabled),
        autopayId: opts.autopayId || null,
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
      if (currentUser?.role === ROLES.USER && userId === currentUser.id) {
        recordUserActivity({ userId, type: 'subscription', title: 'Subscription started', summary: `You subscribed to ${astrologerName} using your wallet.`, metadata: `${normalizedTier} plan · ₹${subscription.price}${subscription.autopayEnabled ? ' · Autopay enabled' : ''}` })
      }
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
    renewAstrologerSubscription(astrologerId, userId) {
      if (!userId) return null
      const existing = subscriptions.find((sub) => sub.userId === userId && sub.astrologerId === astrologerId)
      if (!existing) return null
      const updated = {
        ...existing,
        subscribedAt: new Date().toISOString(),
        expiresAt: addDaysMs(30),
        autopayEnabled: true,
      }
      setSubscriptions((prev) => prev.map((sub) => (sub === existing ? updated : sub)))
      if (currentUser?.role === ROLES.USER && userId === currentUser.id) {
        recordUserActivity({ userId, type: 'subscription', title: 'Subscription renewed', summary: `Your subscription to ${existing.astrologerName} was renewed.`, metadata: existing.tier || 'Subscription' })
      }
      return updated
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
    toggleLiveReminder(sessionId) {
      const hasReminder = liveReminders.some((reminder) => reminder.sessionId === sessionId)
      const nextReminders = hasReminder
        ? liveReminders.filter((reminder) => reminder.sessionId !== sessionId)
        : [...liveReminders, { sessionId, createdAt: new Date().toISOString() }]
      setLiveReminders(nextReminders)

      if (!hasReminder) {
        const session = astrologerLiveSessions.find((item) => item.id === sessionId)
        const astrologer = mockAstrologers.find((item) => item.id === session?.astrologerId)
        setNotifications((prev) => [
          {
            id: crypto.randomUUID(),
            title: 'Reminder set for live session',
            detail: `We'll notify you when "${session?.title || 'this live session'}"${astrologer ? ` by ${astrologer.name}` : ''} goes live.`,
            time: 'just now',
            route: `/user/live-session?id=${sessionId}`,
            audience: ROLES.USER,
            category: 'live',
            read: false,
          },
          ...prev,
        ])
      }
    },
    addPayoutMethod(payload) {
      const method = {
        id: `pm-${Date.now().toString(36)}`,
        type: payload.type || 'bank',
        isDefault: payoutMethods.length === 0,
        ...payload,
      }
      setPayoutMethods((prev) => [...prev, method])
      logActivity({
        kind: 'wallet',
        type: 'payout-method-added',
        title: 'Payout Method Added',
        description: `Added a ${method.type} payout method`,
        relatedId: method.id,
        moduleStatus: 'Active',
      })
      return method
    },
    updatePayoutMethod(methodId, patch) {
      setPayoutMethods((prev) => prev.map((m) => (m.id === methodId ? { ...m, ...patch } : m)))
      logActivity({
        kind: 'wallet',
        type: 'payout-method-updated',
        title: 'Payout Method Updated',
        description: 'Updated a payout method',
        relatedId: methodId,
        moduleStatus: 'Active',
      })
    },
    removePayoutMethod(methodId) {
      setPayoutMethods((prev) => {
        const remaining = prev.filter((m) => m.id !== methodId)
        if (remaining.length && !remaining.some((m) => m.isDefault)) {
          remaining[0].isDefault = true
        }
        return remaining
      })
      logActivity({
        kind: 'wallet',
        type: 'payout-method-removed',
        title: 'Payout Method Removed',
        description: 'Removed a payout method',
        relatedId: methodId,
        moduleStatus: 'Removed',
      })
    },
    setDefaultPayoutMethod(methodId) {
      setPayoutMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === methodId })))
      logActivity({
        kind: 'wallet',
        type: 'payout-method-default-changed',
        title: 'Default Payout Method Changed',
        description: 'Set a new default payout method',
        relatedId: methodId,
        moduleStatus: 'Default',
      })
    },
    initiateWithdrawal(amount, payoutMethodId) {
      const summary = computeWalletSummary(astrologerWallet)
      const value = Number(amount)
      if (!value || value <= 0 || value > summary.availableBalance) return null
      const payout = payoutMethods.find((method) => method.id === payoutMethodId) || payoutMethods.find((method) => method.isDefault) || null
      const txn = {
        id: `TXN-${String(Date.now()).slice(-4)}`,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: 'withdrawal',
        status: 'Processing',
        description: `Withdrawal to ${maskPayoutLabel(payout || {})}`,
        amount: -value,
        payoutLabel: maskPayoutLabel(payout || {}),
      }
      setAstrologerWallet((prev) => ({
        ...prev,
        ledger: applyRunningBalances([...(prev.ledger || []), txn]),
      }))
      logActivity({
        kind: 'wallet',
        type: 'withdrawal-requested',
        title: 'Withdrawal Requested',
        description: `Requested a withdrawal to ${txn.payoutLabel}`,
        relatedId: txn.id,
        amount: value,
        moduleStatus: 'Processing',
      })
      return txn
    },

    // Family Horoscopes
    addFamilyHoroscope(payload) {
      const entry = {
        id: crypto.randomUUID(),
        userId: currentUser?.id || 'guest',
        ...payload,
      }
      setFamilyHoroscopes((prev) => [...prev, entry])
      return entry
    },
    updateFamilyHoroscope(id, patch) {
      setFamilyHoroscopes((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
    },
    deleteFamilyHoroscope(id) {
      setFamilyHoroscopes((prev) => prev.filter((entry) => entry.id !== id))
    },

    // User Payment Methods
    addUserPaymentMethod(payload) {
      const method = {
        id: `upm-${Date.now().toString(36)}`,
        ...payload,
        isDefault: payload.isDefault || userPaymentMethods.length === 0,
      }
      if (method.isDefault) {
        setUserPaymentMethods((prev) => [...prev.map((m) => ({ ...m, isDefault: false })), method])
      } else {
        setUserPaymentMethods((prev) => [...prev, method])
      }
      if (currentUser?.role === ROLES.USER) recordUserActivity({ userId: currentUser.id, type: 'payment-method', title: 'Payment method added', summary: 'A new payment method was saved to your account.', metadata: method.type })
      return method
    },
    updateUserPaymentMethod(methodId, patch) {
      setUserPaymentMethods((prev) => prev.map((m) => (m.id === methodId ? { ...m, ...patch } : m)))
      if (currentUser?.role === ROLES.USER) recordUserActivity({ userId: currentUser.id, type: 'payment-method', title: 'Payment method updated', summary: 'A saved payment method was updated.', metadata: methodId })
    },
    removeUserPaymentMethod(methodId) {
      setUserPaymentMethods((prev) => {
        const remaining = prev.filter((m) => m.id !== methodId)
        if (remaining.length && !remaining.some((m) => m.isDefault)) {
          remaining[0].isDefault = true
        }
        return remaining
      })
      if (currentUser?.role === ROLES.USER) recordUserActivity({ userId: currentUser.id, type: 'payment-method', title: 'Payment method removed', summary: 'A saved payment method was removed.', metadata: methodId })
    },
    setDefaultUserPaymentMethod(methodId) {
      setUserPaymentMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === methodId })))
      if (currentUser?.role === ROLES.USER) recordUserActivity({ userId: currentUser.id, type: 'payment-method', title: 'Default payment method changed', summary: 'Your default payment method was changed.', metadata: methodId })
    },

    // User Autopays
    createUserAutopay(payload) {
      const autopay = {
        id: `uap-${Date.now().toString(36)}`,
        ...payload,
        createdAt: new Date().toISOString(),
      }
      setUserAutopays((prev) => [autopay, ...prev])
      if (currentUser?.role === ROLES.USER) recordUserActivity({ userId: currentUser.id, type: 'autopay', title: 'Autopay created', summary: 'A new automatic payment rule was created.', metadata: autopay.type })
      return autopay
    },
    updateUserAutopay(autopayId, patch) {
      setUserAutopays((prev) => prev.map((a) => (a.id === autopayId ? { ...a, ...patch } : a)))
      if (currentUser?.role === ROLES.USER) recordUserActivity({ userId: currentUser.id, type: 'autopay', title: 'Autopay updated', summary: 'An automatic payment rule was updated.', metadata: patch.status || autopayId })
    },
    deleteUserAutopay(autopayId) {
      setUserAutopays((prev) => prev.filter((a) => a.id !== autopayId))
      if (currentUser?.role === ROLES.USER) recordUserActivity({ userId: currentUser.id, type: 'autopay', title: 'Autopay removed', summary: 'An automatic payment rule was removed.', metadata: autopayId })
    },

    // User Withdrawals
    createWithdrawal(payload) {
      const withdrawal = {
        id: `WD-${Date.now().toString(36)}`,
        ...payload,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        status: 'Processing',
      }
      setUserWithdrawals((prev) => [withdrawal, ...prev])
      return withdrawal
    },
  }), [astrologerPosts, appointments, appointmentCalls, campaigns, consultations, currentUser?.id, followedAstrologerIds, incomingRequests, payoutMethods, questions, subscriptions, astrologerWallet, userPaymentMethods, astrologerLiveSessions, liveReminders])

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
    consultations,
    appointmentCalls,
    followedAstrologerIds,
    subscriptions,
    blockedUserIds,
    incomingRequests,
    purchasedSlots,
    consultationHistory,
    atonements,
    payoutMethods,
    activityLog,
    postLikes,
    savedPostIds,
    postComments,
    presenceActive,
    astrologerPosts,
    astrologerLiveSessions,
    liveReminders,
    familyHoroscopes,
    appointmentAvailabilityTemplates,
    userPaymentMethods,
    userAutopays,
    withdrawals: userWithdrawals,
    astrologerServices: getEffectiveAstrologerServices(astrologerServices, presenceActive),
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
    consultations,
    followedAstrologerIds,
    subscriptions,
    blockedUserIds,
    incomingRequests,
    purchasedSlots,
    consultationHistory,
    atonements,
    payoutMethods,
    activityLog,
    postLikes,
    savedPostIds,
    postComments,
    presenceActive,
    astrologerPosts,
    astrologerLiveSessions,
    liveReminders,
    familyHoroscopes,
    appointmentAvailabilityTemplates,
    astrologerServices,
    userPaymentMethods,
    userAutopays,
    userWithdrawals,
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
