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
  { key: 'follow', label: 'Follow' },
  { key: 'offers', label: 'Offers' },
]

export const mockAstrologers = [
  {
    id: 'astrologer-demo',
    name: 'Dr. Rani',
    specialization: 'Marriage, Career, Business',
    experience: '8 years',
    rating: '4.9 / 5',
    reviews: '2,345 reviews',
    bio: 'Dr. Rani blends traditional Vedic astrology with modern counselling to guide you through marriage, career, and business decisions.',
    followers: 8420,
  },
  {
    id: 'acharya-meena',
    name: 'Acharya Meena',
    specialization: 'Health, Family, Remedies',
    experience: '12 years',
    rating: '4.8 / 5',
    reviews: '1,980 reviews',
    bio: 'Acharya Meena specialises in health and family remedies, combining horoscope readings with practical guidance.',
    followers: 6210,
  },
]

export const mockAppointments = [
  {
    id: 'apt-1',
    astrologerId: 'astrologer-demo',
    astrologer: 'Dr. Rani',
    type: 'Video Consultation',
    date: '25 Jul 2026',
    time: '10:00 AM',
    status: 'Confirmed',
  },
  {
    id: 'apt-2',
    astrologerId: 'acharya-meena',
    astrologer: 'Acharya Meena',
    type: 'Voice Consultation',
    date: '26 Jul 2026',
    time: '05:30 PM',
    status: 'Rescheduled',
  },
]

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
]
