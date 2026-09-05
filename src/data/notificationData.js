export const NOTIFICATION_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'follow', label: 'Follow' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'questions', label: 'Questions' },
  { key: 'pooja', label: 'Pooja' },
  { key: 'live', label: 'Live' },
  { key: 'offers', label: 'Offers' },
]

export const ASTROLOGER_NOTIFICATION_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'questions', label: 'Questions' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'consultations', label: 'Consultations' },
  { key: 'follow', label: 'Follow' },
  { key: 'offers', label: 'Offers' },
]

// Kept separate from the booking UI so package prices can be updated without
// changing the page component.
export const CALL_PACKAGES = [
  { id: 'call-5', duration: 5, total: 75, rate: 15 },
  { id: 'call-10', duration: 10, total: 120, rate: 12, bestValue: true },
  { id: 'call-30', duration: 30, total: 450, rate: 15 },
]

export const CHAT_PACKAGES = [
  { id: 'chat-10', duration: 10, total: 75, rate: '7.50' },
  { id: 'chat-15', duration: 15, total: 150, rate: '10' },
]

const suggestedAstrologerProfiles = [
  { id: 'astrologer-15', name: 'Ishita Sen', specialization: 'Vedic Astrology', type: 'Career, Education, Timing', experience: '8 years', availability: 'Online', languages: ['English', 'Bengali', 'Hindi'], rating: '4.7 / 5', reviews: '1,340 reviews', bio: 'Ishita offers thoughtful Vedic astrology guidance for career, education, and major life transitions.', followers: 2930, subscribers: 175 },
  { id: 'astrologer-16', name: 'Kiran Patel', specialization: 'Numerology', type: 'Names, Business, Life Path', experience: '10 years', availability: 'Offline', languages: ['English', 'Gujarati', 'Hindi'], rating: '4.8 / 5', reviews: '2,040 reviews', bio: 'Kiran uses numerology to help people find confidence in names, business decisions, and life direction.', followers: 3650, subscribers: 240 },
  { id: 'astrologer-17', name: 'Aditi Menon', specialization: 'Tarot Reading', type: 'Relationships, Confidence, Clarity', experience: '6 years', availability: 'Online', languages: ['English', 'Malayalam', 'Hindi'], rating: '4.6 / 5', reviews: '1,110 reviews', bio: 'Aditi combines intuitive tarot readings with clear, practical guidance for everyday decisions.', followers: 2140, subscribers: 145 },
  { id: 'astrologer-18', name: 'Harish Kulkarni', specialization: 'Vastu Shastra', type: 'Home, Office, New Beginnings', experience: '13 years', availability: 'Online', languages: ['English', 'Marathi', 'Hindi'], rating: '4.9 / 5', reviews: '3,280 reviews', bio: 'Harish gives accessible Vastu guidance for homes, offices, and important new beginnings.', followers: 4890, subscribers: 320 },
  { id: 'astrologer-19', name: 'Leela Raman', specialization: 'Nadi Astrology', type: 'Marriage, Family, Remedies', experience: '15 years', availability: 'Offline', languages: ['Tamil', 'English'], rating: '4.8 / 5', reviews: '2,790 reviews', bio: 'Leela provides warm and detailed Nadi astrology consultations for family and relationship questions.', followers: 4120, subscribers: 285 },
  { id: 'astrologer-20', name: 'Vivek Arora', specialization: 'Western Astrology', type: 'Transits, Compatibility, Growth', experience: '7 years', availability: 'Online', languages: ['English', 'Hindi'], rating: '4.5 / 5', reviews: '870 reviews', bio: 'Vivek makes Western astrology practical with guidance based on transits, compatibility, and growth.', followers: 1760, subscribers: 105 },
  { id: 'astrologer-21', name: 'Bhavana Joshi', specialization: 'Palmistry', type: 'Career, Finance, Life Changes', experience: '9 years', availability: 'Online', languages: ['English', 'Kannada', 'Hindi'], rating: '4.7 / 5', reviews: '1,680 reviews', bio: 'Bhavana reads the patterns in your palms to offer perspective on career, finances, and change.', followers: 2510, subscribers: 160 },
  { id: 'astrologer-22', name: 'Armaan Singh', specialization: 'KP Astrology', type: 'Love, Work, Decision Making', experience: '12 years', availability: 'Offline', languages: ['English', 'Hindi', 'Punjabi'], rating: '4.8 / 5', reviews: '2,460 reviews', bio: 'Armaan applies KP astrology to love, work, and the choices that shape your next chapter.', followers: 3390, subscribers: 225 },
  { id: 'astrologer-23', name: 'Tara Mukherjee', specialization: 'Crystal Healing', type: 'Wellbeing, Balance, Reflection', experience: '5 years', availability: 'Online', languages: ['English', 'Bengali'], rating: '4.6 / 5', reviews: '740 reviews', bio: 'Tara supports personal reflection and wellbeing through gentle crystal healing practices.', followers: 1430, subscribers: 90 },
  { id: 'astrologer-24', name: 'Gautam Reddy', specialization: 'Vedic Astrology', type: 'Finance, Property, Business', experience: '16 years', availability: 'Online', languages: ['English', 'Telugu', 'Hindi'], rating: '4.9 / 5', reviews: '4,120 reviews', bio: 'Gautam offers experienced Vedic astrology guidance for finance, property, and business questions.', followers: 6080, subscribers: 410 },
  { id: 'astrologer-25', name: 'Neha Sood', specialization: 'Tarot Reading', type: 'Self Discovery, Love, Career', experience: '8 years', availability: 'Offline', languages: ['English', 'Hindi'], rating: '4.7 / 5', reviews: '1,520 reviews', bio: 'Neha uses tarot to create a calm space for self-discovery, love, and career conversations.', followers: 2270, subscribers: 150 },
  { id: 'astrologer-26', name: 'Suresh Pillai', specialization: 'Astro Remedies', type: 'Remedies, Health, Peace of Mind', experience: '18 years', availability: 'Online', languages: ['English', 'Tamil', 'Malayalam'], rating: '4.9 / 5', reviews: '4,680 reviews', bio: 'Suresh recommends traditional astro remedies to support health, balance, and peace of mind.', followers: 7020, subscribers: 460 },
]

export const mockAstrologers = [
  {
    id: 'astrologer-demo',
    name: 'Dr. Rani',
    specialization: 'Vedic Astrology',
    type: 'Marriage, Career, Business',
    experience: '8 years',
    availability: 'Online',
    languages: ['English', 'Tamil', 'Hindi'],
    rating: '4.9 / 5',
    reviews: '2,345 reviews',
    bio: 'Dr. Rani blends traditional Vedic astrology with modern counselling to guide you through marriage, career, and business decisions.',
    followers: 8420,
    subscribers: 350,
  },
  {
    id: 'acharya-meena',
    name: 'Acharya Meena',
    specialization: 'Vedic Astrology',
    type: 'Health, Family, Remedies',
    experience: '12 years',
    availability: 'Offline',
    languages: ['English', 'Malayalam', 'Hindi'],
    rating: '4.8 / 5',
    reviews: '1,980 reviews',
    bio: 'Acharya Meena specialises in health and family remedies, combining horoscope readings with practical guidance.',
    followers: 6210,
    subscribers: 280,
  },
  {
    id: 'astrologer-demo-3',
    name: 'Arjun Sharma',
    specialization: 'Numerology',
    type: 'Personal Guidance',
    experience: '5 years',
    availability: 'Online',
    languages: ['English', 'French'],
    rating: '4.5 / 5',
    reviews: '500 reviews',
    bio: 'Expert in numerology and life path readings.',
    followers: 1200,
    subscribers: 100,
  },
  {
    id: 'astrologer-4',
    name: 'Kavitha Iyer',
    specialization: 'Palmistry',
    type: 'Fortune Reading',
    experience: '6 years',
    availability: 'Online',
    languages: ['English', 'German'],
    rating: '4.3 / 5',
    reviews: '350 reviews',
    bio: 'Expert palm reader revealing life secrets and destiny patterns.',
    followers: 950,
    subscribers: 80,
  },
  {
    id: 'astrologer-5',
    name: 'Rahul Verma',
    specialization: 'Tarot Reading',
    type: 'Future Prediction',
    experience: '3 years',
    availability: 'Online',
    languages: ['English', 'Spanish'],
    rating: '4.6 / 5',
    reviews: '420 reviews',
    bio: 'Professional tarot card reader offering guidance and insights.',
    followers: 780,
    subscribers: 65,
  },
  {
    id: 'astrologer-6',
    name: 'Priya Nair',
    specialization: 'Crystal Healing',
    type: 'Energy Balancing',
    experience: '10 years',
    availability: 'Offline',
    languages: ['English', 'Arabic'],
    rating: '4.9 / 5',
    reviews: '3,100 reviews',
    bio: 'Certified crystal healer and energy work practitioner.',
    followers: 2100,
    subscribers: 180,
  },
  {
    id: 'astrologer-7',
    name: 'Sanjay Rao',
    specialization: 'Vastu Shastra',
    type: 'Home & Architecture',
    experience: '15 years',
    availability: 'Online',
    languages: ['English', 'French', 'German'],
    rating: '4.7 / 5',
    reviews: '1,550 reviews',
    bio: 'Vastu expert harmonizing living spaces and work environments.',
    followers: 1650,
    subscribers: 140,
  },
  {
    id: 'astrologer-8',
    name: 'Ananya Krishnan',
    specialization: 'Numerology',
    type: 'Life Path',
    experience: '7 years',
    availability: 'Offline',
    languages: ['English', 'Italian'],
    rating: '4.4 / 5',
    reviews: '890 reviews',
    bio: 'Numerologist analyzing life paths and destiny numbers.',
    followers: 1100,
    subscribers: 95,
  },
  {
    id: 'astrologer-9',
    name: 'Vikram Joshi',
    specialization: 'Chinese Astrology',
    type: 'Zodiac Compatibility',
    experience: '9 years',
    availability: 'Online',
    languages: ['English', 'Mandarin'],
    rating: '4.5 / 5',
    reviews: '1,250 reviews',
    bio: 'Chinese astrology specialist for compatibility and timing.',
    followers: 1350,
    subscribers: 110,
  },
  {
    id: 'astrologer-10',
    name: 'Nandini Kapoor',
    specialization: 'KP Astrology',
    type: 'Career, Relationships, Timing',
    experience: '11 years',
    availability: 'Online',
    consultationRate: 20,
    languages: ['English', 'Hindi', 'Punjabi'],
    rating: '4.8 / 5',
    reviews: '2,120 reviews',
    bio: 'Nandini uses KP astrology to offer practical clarity on career choices, relationships, and important life timings.',
    followers: 3240,
    subscribers: 210,
  },
  {
    id: 'astrologer-11',
    name: 'Dev Malhotra',
    specialization: 'Western Astrology',
    type: 'Birth Charts, Transits, Compatibility',
    experience: '9 years',
    availability: 'Online',
    consultationRate: 15,
    languages: ['English', 'Hindi'],
    rating: '4.6 / 5',
    reviews: '1,420 reviews',
    bio: 'Dev interprets birth charts and planetary transits to make everyday decisions feel more grounded.',
    followers: 2780,
    subscribers: 165,
  },
  {
    id: 'astrologer-13',
    name: 'Priya Sharma',
    specialization: 'Vedic Astrology',
    type: 'Career, Relationships, Timing',
    experience: '7 years',
    availability: 'Online',
    consultationRate: 18,
    chatAvailable: true,
    languages: ['English', 'Tamil', 'Hindi'],
    rating: '4.7 / 5',
    reviews: '1,380 reviews',
    bio: 'Priya offers practical Vedic astrology guidance for career decisions, relationships, and personal growth.',
    followers: 4100,
    subscribers: 235,
  },
  {
    id: 'astrologer-12',
    name: 'Sowmya Lakshmi',
    specialization: 'Nadi Astrology',
    type: 'Family, Marriage, Spiritual Guidance',
    experience: '14 years',
    availability: 'Online',
    languages: ['Tamil', 'English', 'Telugu'],
    rating: '4.9 / 5',
    reviews: '3,560 reviews',
    bio: 'Sowmya provides compassionate Nadi astrology guidance for family, marriage, and spiritual questions.',
    followers: 5160,
    subscribers: 390,
  },
  {
    id: 'astrologer-13',
    name: 'Rohit Bansal',
    specialization: 'Vastu Shastra',
    type: 'Homes, Workspaces, Prosperity',
    experience: '7 years',
    availability: 'Online',
    languages: ['English', 'Hindi'],
    rating: '4.5 / 5',
    reviews: '960 reviews',
    bio: 'Rohit helps create harmonious homes and workspaces through accessible Vastu recommendations.',
    followers: 1880,
    subscribers: 120,
  },
  {
    id: 'astrologer-14',
    name: 'Meera Desai',
    specialization: 'Tarot Reading',
    type: 'Love, Career, Personal Insight',
    experience: '6 years',
    availability: 'Offline',
    languages: ['English', 'Gujarati', 'Hindi'],
    rating: '4.7 / 5',
    reviews: '1,710 reviews',
    bio: 'Meera combines intuitive tarot readings with practical next steps for love, career, and personal growth.',
    followers: 2450,
    subscribers: 190,
  },
  ...suggestedAstrologerProfiles,
]

// The subscribed list is intentionally separate from the user's followed IDs.
// Additional catalog entries can be followed without appearing in this list.
export const subscribedAstrologers = mockAstrologers.slice(0, 9)
export const suggestedAstrologerIds = suggestedAstrologerProfiles.map((astrologer) => astrologer.id)

export function getSuggestedAstrologers({ followedAstrologerIds = [], subscribedAstrologerIds = [], preferencesEnabled = false, preferences = {} } = {}) {
  const excludedIds = new Set([
    ...subscribedAstrologers.map((astrologer) => astrologer.id),
    ...followedAstrologerIds,
    ...subscribedAstrologerIds,
  ])

  const defaultCandidates = mockAstrologers.filter((astrologer) => suggestedAstrologerIds.includes(astrologer.id) && !excludedIds.has(astrologer.id))
  const candidates = preferencesEnabled ? mockAstrologers.filter((astrologer) => !excludedIds.has(astrologer.id)) : defaultCandidates
  if (!preferencesEnabled) return candidates
  const normalize = (value) => String(value).trim().toLowerCase()
  const selected = {
    languages: (preferences.languages || []).map(normalize),
    methods: (preferences.astrologerTypes || preferences.methods || []).map(normalize),
    topics: (preferences.consultationTitles || preferences.topics || []).map(normalize),
  }
  const hasPreferences = Object.values(selected).some((values) => values.length)
  if (!hasPreferences) return defaultCandidates
  const ranked = candidates.map((astrologer, index) => {
    const methodScore = selected.methods.some((method) => normalize(astrologer.specialization) === method) ? 2 : 0
    const topicScore = selected.topics.filter((topic) => astrologer.type.split(',').map((item) => normalize(item)).includes(topic)).length * 2
    const languageScore = selected.languages.filter((language) => astrologer.languages.some((item) => normalize(item) === language)).length
    return { astrologer, score: methodScore + topicScore + languageScore, index }
  }).sort((a, b) => b.score - a.score || a.index - b.index)
    .filter((entry) => entry.score > 0)
    .map(({ astrologer }) => astrologer)
  return ranked.length ? ranked : defaultCandidates
}

const __now = new Date()
const __pad = (n) => String(n).padStart(2, '0')
const __todayIso = `${__now.getFullYear()}-${__pad(__now.getMonth() + 1)}-${__pad(__now.getDate())}`
const __MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const __displayDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${__MONTHS[m - 1]} ${y}`
}
// Build a live, today-relative appointment window from a minute offset.
const __slot = (minOffset, durationMin, meta) => {
  const s = new Date(__now.getTime() + minOffset * 60000)
  const startMin = s.getHours() * 60 + s.getMinutes()
  const e = new Date(s.getTime() + durationMin * 60000)
  const endMin = e.getHours() * 60 + e.getMinutes()
  const to12h = (mins) => {
    let h = Math.floor(mins / 60)
    const mm = mins % 60
    const period = h >= 12 ? 'PM' : 'AM'
    if (h === 0) h = 12
    else if (h > 12) h -= 12
    return `${h}:${__pad(mm)} ${period}`
  }
  return {
    dateIso: __todayIso,
    date: __displayDate(__todayIso),
    start: `${__pad(Math.floor(startMin / 60))}:${__pad(startMin % 60)}`,
    end: `${__pad(Math.floor(endMin / 60))}:${__pad(endMin % 60)}`,
    time: to12h(startMin),
    duration: `${durationMin} min`,
    ...meta,
  }
}

export const mockAppointments = [
  // ---- Static historical / upcoming appointments (shared with user side) ----
  {
    id: 'apt-1',
    astrologerId: 'astrologer-demo',
    astrologer: 'Dr. Rani',
    type: 'Audio Call',
    callType: 'Audio',
    customerName: 'Aarav Singh',
    customerPhone: '+91 98111 22334',
    orderId: '#A1001',
    amount: 799,
    language: 'Hindi',
    topic: 'Career & Finance',
    duration: '30 min',
    date: '25 Jul 2026',
    dateIso: '2026-07-25',
    time: '10:00 AM',
    start: '10:00',
    end: '10:30',
    status: 'Confirmed',
  },
  {
    id: 'apt-2',
    astrologerId: 'acharya-meena',
    astrologer: 'Acharya Meena',
    type: 'Audio Call',
    callType: 'Audio',
    customerName: 'Meera Nair',
    customerPhone: '+91 98450 11223',
    orderId: '#A1002',
    amount: 699,
    language: 'Malayalam',
    topic: 'Marriage',
    duration: '20 min',
    date: '26 Jul 2026',
    dateIso: '2026-07-26',
    time: '05:30 PM',
    start: '17:30',
    end: '17:50',
    status: 'Rescheduled',
  },
  {
    id: 'apt-3',
    astrologerId: 'astrologer-demo-3',
    astrologer: 'Arjun Sharma',
    type: 'Audio Call',
    callType: 'Audio',
    customerName: 'Kabir Rao',
    customerPhone: '+91 90000 12345',
    orderId: '#A1003',
    amount: 999,
    language: 'English',
    topic: 'Health',
    duration: '45 min',
    date: '27 Aug 2026',
    dateIso: '2026-08-27',
    time: '11:30 AM',
    start: '11:30',
    end: '12:15',
    status: 'Pending',
  },
  {
    id: 'apt-4',
    astrologerId: 'acharya-meena',
    astrologer: 'Acharya Meena',
    type: 'Audio Call',
    callType: 'Audio',
    customerName: 'Sneha Iyer',
    customerPhone: '+91 98402 55667',
    orderId: '#A1004',
    amount: 799,
    language: 'Tamil',
    topic: 'Wealth',
    duration: '30 min',
    date: '28 Aug 2026',
    dateIso: '2026-08-28',
    time: '04:00 PM',
    start: '16:00',
    end: '16:30',
    status: 'Confirmed',
  },
  {
    id: 'apt-5',
    astrologerId: 'astrologer-demo',
    astrologer: 'Dr. Rani',
    type: 'Audio Call',
    callType: 'Audio',
    customerName: 'Rohan Mehta',
    customerPhone: '+91 98200 33445',
    orderId: '#A1005',
    amount: 699,
    language: 'Hindi',
    topic: 'Education',
    duration: '20 min',
    date: '20 Aug 2026',
    dateIso: '2026-08-20',
    time: '09:00 AM',
    start: '09:00',
    end: '09:20',
    status: 'Completed',
  },

  // ---- Live, today-relative appointments for the signed-in astrologer -------
  // Currently in its call window → "Call Now".
  __slot(-4, 30, {
    id: 'apt-live',
    astrologerId: 'astrologer-demo',
    astrologer: 'Dr. Rani',
    topic: 'Career & Finance',
    status: 'Confirmed',
  }),
  // Starts in ~12 minutes → disabled call button with live countdown.
  __slot(12, 30, {
    id: 'apt-soon',
    astrologerId: 'astrologer-demo',
    astrologer: 'Dr. Rani',
    type: 'Audio Call',
    callType: 'Audio',
    customerName: 'Priya Mehta',
    customerPhone: '+91 98120 76543',
    orderId: '#A1288',
    amount: 799,
    language: 'English',
    topic: 'Relationship',
    status: 'Confirmed',
  }),
  // Starts in ~90 minutes → "Starts in 1h 30m".
  __slot(90, 30, {
    id: 'apt-later',
    astrologerId: 'astrologer-demo',
    astrologer: 'Dr. Rani',
    type: 'Text / Chat',
    callType: 'Text',
    customerName: 'Karan Verma',
    customerPhone: '+91 99300 11298',
    orderId: '#A1289',
    amount: 599,
    language: 'Hindi',
    topic: 'Business',
    status: 'Confirmed',
  }),
  // Already completed earlier today.
  __slot(-180, 30, {
    id: 'apt-done-today',
    astrologerId: 'astrologer-demo',
    astrologer: 'Dr. Rani',
    topic: 'Health',
    status: 'Completed',
  }),
  // Pending confirmation (still bookable by customer flow) — shown as Pending.
  __slot(240, 30, {
    id: 'apt-pending',
    astrologerId: 'astrologer-demo',
    astrologer: 'Dr. Rani',
    topic: 'Marriage',
    status: 'Pending',
  }),
]

// ---- Historical appointment records --------------------------------------
// These records are independent of the Schedule calendar. They represent
// appointments that were actually booked and are preserved regardless of any
// later schedule/availability changes. Populated with canonical statuses.
export { mockAppointmentHistory, mockConsultations, appointmentCustomers } from './appointmentHistoryData.js'

export const mockPoojas = [
  {
    id: 'pooja-1',
    name: 'Navagraha Shanti Pooja',
    date: '24 Jul 2026',
    time: '07:00 AM',
    status: 'Live in progress',
    prasadamStatus: 'Preparing',
  },
  {
    id: 'pooja-2',
    name: 'Ganesh Homam',
    date: '20 Jul 2026',
    time: '08:00 AM',
    status: 'Completed',
    prasadamStatus: 'Dispatched',
  },
]

export const mockLiveSessions = [
  {
    id: 'live-1',
    astrologerId: 'astrologer-demo',
    astrologer: 'Dr. Rani',
    title: 'Marriage & Career Live Q&A',
    status: 'Live now',
    time: 'Started 12m ago',
  },
  {
    id: 'live-2',
    astrologerId: 'acharya-meena',
    astrologer: 'Acharya Meena',
    title: 'Health & Remedies Live Session',
    status: 'Upcoming',
    time: 'Today, 06:00 PM',
  },
  { id: 'live-3', astrologerId: 'astrologer-demo', astrologer: 'Dr. Rani', title: 'Weekly Guidance Circle', status: 'Upcoming', time: 'Tomorrow, 07:30 PM' },
  { id: 'live-4', astrologerId: 'astrologer-demo', astrologer: 'Dr. Rani', title: 'Full Moon Reflection', status: 'Past', time: '18 Aug 2026, 08:00 PM' },
  { id: 'live-5', astrologerId: 'acharya-meena', astrologer: 'Acharya Meena', title: 'Remedies for Peace and Balance', status: 'Past', time: '15 Aug 2026, 06:30 PM' },
]

export const mockAstrologerPosts = [
  { id: 'post-rani-1', astrologerId: 'astrologer-demo', title: 'Understanding the right time to begin', body: 'Timing becomes clearer when preparation and patience work together. Look for the small signs that your next step is ready.', tone: 'violet', createdAt: '2026-08-24T10:00:00+05:30', likeCount: 128, comments: [{ id: 'comment-rani-1', author: 'Priya V.', text: 'This was exactly what I needed today.' }] },
  { id: 'post-rani-2', astrologerId: 'astrologer-demo', title: 'A simple weekly reflection', body: 'Write down one question, one intention, and one action for the week ahead. Clarity grows through consistent reflection.', tone: 'coral', createdAt: '2026-08-21T10:00:00+05:30', likeCount: 94, comments: [] },
  { id: 'post-meena-1', astrologerId: 'acharya-meena', title: 'Small rituals for a calmer week', body: 'A few quiet minutes of reflection can help you return to your priorities with steadiness and confidence.', tone: 'gold', createdAt: '2026-08-23T10:00:00+05:30', likeCount: 76, comments: [] },
  { id: 'post-meena-2', astrologerId: 'acharya-meena', title: 'When patience becomes progress', body: 'Not every delay is a setback. Some pauses create the space needed for a stronger beginning.', tone: 'violet', createdAt: '2026-08-19T10:00:00+05:30', likeCount: 61, comments: [] },
  { id: 'post-arjun-1', astrologerId: 'astrologer-demo-3', title: 'Your numbers and your next step', body: 'Use patterns as a prompt for awareness, then let your choices give those patterns direction.', tone: 'coral', createdAt: '2026-08-22T10:00:00+05:30', likeCount: 53, comments: [] },
  { id: 'post-arjun-2', astrologerId: 'astrologer-demo-3', title: 'Three questions for clarity', body: 'Ask what you want, what is possible now, and which small action can move you forward this week.', tone: 'gold', createdAt: '2026-08-16T10:00:00+05:30', likeCount: 48, comments: [] },
  { id: 'post-priya-1', astrologerId: 'astrologer-13', title: 'Understanding Your Career Path Through Astrology', body: 'Your birth chart can reveal important patterns around career growth, opportunities, and decision-making.', tone: 'violet', createdAt: '2026-08-24T10:00:00+05:30', likeCount: 86, comments: [] },
  { id: 'post-nandini-1', astrologerId: 'astrologer-10', title: 'The Importance of Moon Sign', body: 'Your Moon sign helps explain your emotional patterns, instincts, and inner responses.', tone: 'coral', createdAt: '2026-08-23T10:00:00+05:30', likeCount: 73, comments: [] },
  { id: 'post-dev-1', astrologerId: 'astrologer-11', title: 'Planetary Transits This Week', body: "This week's planetary movements may bring changes in communication, relationships, and personal decisions.", tone: 'gold', createdAt: '2026-08-22T10:00:00+05:30', likeCount: 64, comments: [] },
]

export const mockAstrologerAvailability = {
  'astrologer-demo': {
    '2026-09-10': ['10:00 AM', '02:00 PM', '06:00 PM'],
    '2026-08-25': ['10:00 AM', '11:00 AM', '04:00 PM'],
    '2026-08-27': ['09:00 AM', '02:00 PM', '06:00 PM'],
    '2026-08-29': ['11:00 AM', '03:00 PM'],
  },
  'acharya-meena': {
    '2026-08-25': ['10:00 AM', '01:00 PM'],
    '2026-08-26': ['10:00 AM', '01:00 PM'],
    '2026-08-27': ['11:00 AM', '04:00 PM'],
    '2026-08-28': ['11:00 AM', '04:00 PM'],
    '2026-08-29': ['09:00 AM', '02:00 PM'],
    '2026-08-31': ['10:00 AM', '06:00 PM'],
    '2026-09-01': ['11:00 AM', '03:00 PM'],
    '2026-09-02': ['09:00 AM', '06:00 PM'],
    '2026-09-04': ['10:00 AM', '02:00 PM'],
    '2026-09-06': ['11:00 AM', '04:00 PM'],
    '2026-09-08': ['09:00 AM', '01:00 PM'],
    '2026-09-10': ['10:00 AM', '06:00 PM'],
    '2026-09-12': ['11:00 AM', '03:00 PM'],
  },
  'astrologer-demo-3': {
    '2026-08-25': ['12:00 PM', '05:00 PM'],
    '2026-08-30': ['10:00 AM', '02:00 PM'],
  },
  'astrologer-10': {
    '2026-08-27': ['10:00 AM', '03:00 PM'],
    '2026-09-01': ['11:00 AM', '05:00 PM'],
  },
  'astrologer-11': {
    '2026-08-26': ['09:00 AM', '04:00 PM'],
    '2026-08-29': ['01:00 PM', '06:00 PM'],
  },
  'astrologer-13': {
    '2026-08-25': ['10:00 AM', '02:00 PM'],
    '2026-08-28': ['09:00 AM', '05:00 PM'],
  },
}
