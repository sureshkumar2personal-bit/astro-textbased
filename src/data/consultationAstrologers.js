import { mockAstrologers } from './notificationData.js'

const CONSULTATION_OVERRIDES = {
  'astrologer-demo': {
    chatStatus: 'Available',
    callStatus: 'Available',
    chatRate: 18,
    callRate: 22,
    responseTime: '1 min',
    tagline: 'Best for marriage, career, and business timing',
  },
  'acharya-meena': {
    chatStatus: 'Busy',
    callStatus: 'Available',
    chatRate: 20,
    callRate: 24,
    responseTime: '5 min',
    tagline: 'Health, family, and remedies',
  },
  'astrologer-demo-3': {
    chatStatus: 'Offline',
    callStatus: 'Busy',
    chatRate: 16,
    callRate: 20,
    responseTime: '12 min',
    tagline: 'Numerology and life path readings',
  },
  'astrologer-4': {
    chatStatus: 'Busy',
    callStatus: 'Offline',
    chatRate: 19,
    callRate: 23,
    responseTime: '9 min',
    tagline: 'Fortune reading and quick clarity',
  },
  'astrologer-5': {
    chatStatus: 'Available',
    callStatus: 'Busy',
    chatRate: 15,
    callRate: 19,
    responseTime: '2 min',
    tagline: 'Tarot guidance for decisions and relationships',
  },
  'astrologer-6': {
    chatStatus: 'Offline',
    callStatus: 'Available',
    chatRate: 21,
    callRate: 25,
    responseTime: '7 min',
    tagline: 'Crystal healing and energy balancing',
  },
  'astrologer-7': {
    chatStatus: 'Available',
    callStatus: 'Busy',
    chatRate: 17,
    callRate: 21,
    responseTime: '3 min',
    tagline: 'Vastu and home harmony',
  },
  'astrologer-8': {
    chatStatus: 'Offline',
    callStatus: 'Offline',
    chatRate: 14,
    callRate: 18,
    responseTime: '15 min',
    tagline: 'Life path numerology',
  },
  'astrologer-9': {
    chatStatus: 'Busy',
    callStatus: 'Available',
    chatRate: 18,
    callRate: 22,
    responseTime: '6 min',
    tagline: 'Compatibility and timing questions',
  },
  'astrologer-10': {
    chatStatus: 'Available',
    callStatus: 'Available',
    chatRate: 19,
    callRate: 24,
    responseTime: '4 min',
    tagline: 'Career and relationship clarity',
  },
  'astrologer-11': {
    chatStatus: 'Busy',
    callStatus: 'Available',
    chatRate: 17,
    callRate: 21,
    responseTime: '8 min',
    tagline: 'Transits and practical planning',
  },
  'astrologer-12': {
    chatStatus: 'Available',
    callStatus: 'Offline',
    chatRate: 16,
    callRate: 20,
    responseTime: '2 min',
    tagline: 'Family, marriage, and spiritual guidance',
  },
  'astrologer-13': {
    chatStatus: 'Available',
    callStatus: 'Busy',
    chatRate: 18,
    callRate: 23,
    responseTime: '5 min',
    tagline: 'Career, relationships, and timing',
  },
  'astrologer-14': {
    chatStatus: 'Offline',
    callStatus: 'Available',
    chatRate: 15,
    callRate: 19,
    responseTime: '10 min',
    tagline: 'Tarot guidance for love and career',
  },
  'astrologer-15': {
    chatStatus: 'Available',
    callStatus: 'Available',
    chatRate: 18,
    callRate: 22,
    responseTime: '1 min',
    tagline: 'Career and education timing',
  },
  'astrologer-16': {
    chatStatus: 'Busy',
    callStatus: 'Offline',
    chatRate: 16,
    callRate: 20,
    responseTime: '11 min',
    tagline: 'Business numerology',
  },
  'astrologer-17': {
    chatStatus: 'Available',
    callStatus: 'Available',
    chatRate: 15,
    callRate: 19,
    responseTime: '2 min',
    tagline: 'Relationships and confidence',
  },
  'astrologer-18': {
    chatStatus: 'Available',
    callStatus: 'Busy',
    chatRate: 19,
    callRate: 24,
    responseTime: '3 min',
    tagline: 'Home, office, and new beginnings',
  },
  'astrologer-19': {
    chatStatus: 'Offline',
    callStatus: 'Available',
    chatRate: 20,
    callRate: 25,
    responseTime: '8 min',
    tagline: 'Family and marriage remedies',
  },
  'astrologer-20': {
    chatStatus: 'Available',
    callStatus: 'Available',
    chatRate: 17,
    callRate: 21,
    responseTime: '4 min',
    tagline: 'Western astrology and growth',
  },
  'astrologer-21': {
    chatStatus: 'Busy',
    callStatus: 'Available',
    chatRate: 18,
    callRate: 22,
    responseTime: '6 min',
    tagline: 'Career and finance readings',
  },
  'astrologer-22': {
    chatStatus: 'Available',
    callStatus: 'Offline',
    chatRate: 19,
    callRate: 23,
    responseTime: '5 min',
    tagline: 'KP astrology and decision making',
  },
  'astrologer-23': {
    chatStatus: 'Offline',
    callStatus: 'Busy',
    chatRate: 14,
    callRate: 18,
    responseTime: '14 min',
    tagline: 'Crystal healing and calm guidance',
  },
  'astrologer-24': {
    chatStatus: 'Available',
    callStatus: 'Available',
    chatRate: 20,
    callRate: 25,
    responseTime: '2 min',
    tagline: 'Finance, property, and business guidance',
  },
  'astrologer-25': {
    chatStatus: 'Busy',
    callStatus: 'Offline',
    chatRate: 15,
    callRate: 19,
    responseTime: '9 min',
    tagline: 'Tarot for self-discovery and clarity',
  },
  'astrologer-26': {
    chatStatus: 'Available',
    callStatus: 'Available',
    chatRate: 21,
    callRate: 26,
    responseTime: '1 min',
    tagline: 'Remedies for peace of mind',
  },
}

function hashString(value) {
  return String(value || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function initials(name) {
  return String(name || 'Astrologer')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function avatarDataUri(name, from, to) {
  const safeName = initials(name)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${name}">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${from}" />
          <stop offset="100%" stop-color="${to}" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#g)" />
      <circle cx="60" cy="48" r="24" fill="rgba(255,255,255,0.22)" />
      <path d="M24 100c8-18 22-26 36-26s28 8 36 26" fill="rgba(255,255,255,0.22)" />
      <text x="50%" y="68" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="#fff">${safeName}</text>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function resolvePalette(seed) {
  const palettes = [
    ['#6D28D9', '#FF8A4C'],
    ['#7C3AED', '#F97316'],
    ['#4F46E5', '#FB7185'],
    ['#0EA5E9', '#8B5CF6'],
    ['#D97706', '#C084FC'],
  ]
  return palettes[seed % palettes.length]
}

export const consultationAstrologers = mockAstrologers.map((astrologer, index) => {
  const override = CONSULTATION_OVERRIDES[astrologer.id] || {}
  const palette = resolvePalette(hashString(astrologer.id || index))
  const chatStatus = override.chatStatus || 'Offline'
  const callStatus = override.callStatus || 'Offline'
  const chatRate = override.chatRate ?? astrologer.consultationRate ?? 18
  const callRate = override.callRate ?? Math.max(chatRate + 4, 22)
  const ratingValue = Number(String(astrologer.rating || '4.7').split('/')[0].trim()) || 4.7
  const reviewCount = Number(String(astrologer.reviews || '0').replace(/[^0-9]/g, '')) || 0

  return {
    ...astrologer,
    chatStatus,
    callStatus,
    chatRate,
    callRate,
    responseTime: override.responseTime || '5 min',
    tagline: override.tagline || astrologer.bio,
    ratingValue,
    reviewCount,
    profileImage: avatarDataUri(astrologer.name, palette[0], palette[1]),
  }
})

export function getConsultationAstrologers(kind = 'chat') {
  const statusKey = kind === 'call' ? 'callStatus' : 'chatStatus'
  return consultationAstrologers.filter((astrologer) => astrologer[statusKey] === 'Available')
}

export function getConsultationAvailabilityLabel(kind = 'chat') {
  return kind === 'call' ? 'Available for Call' : 'Available for Chat'
}

export function getConsultationRateLabel(astrologer, kind = 'chat') {
  const rate = kind === 'call' ? astrologer.callRate : astrologer.chatRate
  return `₹${Number(rate || 0).toLocaleString('en-IN')}/min`
}

