export const ROLES = {
  USER: 'user',
  ASTROLOGER: 'astrologer',
}

export function getRoleBasePath(role) {
  return role === ROLES.USER ? '/user' : '/astrologer'
}

export function getRoleRoutes(role) {
  const base = getRoleBasePath(role)
  return {
    base,
    dashboard: base,
    walletHistory: `${base}/wallet-history`,
    purchasePackage: `${base}/purchase-package`,
    askQuestion: `${base}/ask-question`,
    trackQuestions: `${base}/track-questions`,
    raiseDispute: `${base}/raise-dispute`,
    textBasedQuestions: `${base}/text-based-questions`,
    salesManagement: `${base}/sales-management`,
    campaigns: `${base}/campaigns`,
    answerQuestion: `${base}/answer-question`,
    disputeManagement: `${base}/dispute-management`,
    astrologerProfile: `${base}/astrologer-profile`,
    astrologers: `${base}/astrologers`,
    discountQuestions: `${base}/discount-questions`,
    rewards: `${base}/rewards`,
    profile: `${base}/profile`,
    appointmentDetails: `${base}/appointment-details`,
    poojaDetails: `${base}/pooja-details`,
    liveSession: `${base}/live-session`,
  }
}

export function inferRoleFromEmail(email) {
  const normalized = String(email || '').trim().toLowerCase()
  const [localPart, domain = ''] = normalized.split('@')

  if (!domain.endsWith('.com')) return null
  if (localPart.startsWith('astro')) return ROLES.ASTROLOGER
  if (normalized) return ROLES.USER
  return null
}
