export const PROFILE_FOLLOWERS = [
  { id: 'follower-priya', name: 'Priya V.', username: 'priya.v', bio: 'Astro Connect member exploring guidance for life, career, and relationships.' },
  { id: 'follower-kannan', name: 'Kannan', username: 'kannan.astro', bio: 'Interested in practical astrology and thoughtful consultations.' },
  { id: 'follower-devi', name: 'Devi', username: 'devi.guidance', bio: 'Following astrology insights and live sessions.' },
  { id: 'follower-arun', name: 'Arun', username: 'arun.connect', bio: 'Astro Connect community member.' },
]

export const PROFILE_SUBSCRIBERS = [
  { id: 'subscriber-meena', name: 'Meena R.', username: 'meena.guidance', bio: 'Astro Connect subscriber following astrology guidance and live sessions.', tier: 'Gold' },
  { id: 'subscriber-arjun', name: 'Arjun D.', username: 'arjun.astro', bio: 'Subscriber interested in practical guidance for career and family decisions.', tier: 'Silver' },
]

export const TIER_PRICES = {
  Silver: 199,
  Gold: 399,
  Platinum: 699,
}

export function accountHandle(member) {
  const source = member?.username || member?.id || 'account'
  return String(source).toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._-]+/g, '-')
}
