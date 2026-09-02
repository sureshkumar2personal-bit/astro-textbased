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
    walletManagement: `${base}/wallet`,
    purchasePackage: `${base}/purchase-package`,
    askQuestion: `${base}/ask-question`,
    trackQuestions: `${base}/track-questions`,
    raiseDispute: `${base}/raise-dispute`,
    textBasedQuestions: `${base}/text-based-questions`,
    salesManagement: `${base}/sales-management`,
    campaigns: `${base}/campaigns`,
    answerQuestion: `${base}/answer-question`,
    disputeManagement: `${base}/dispute-management`,
    appointments: `${base}/appointments`,
    appointmentSchedule: `${base}/appointments/schedule`,
    appointmentCalendar: `${base}/appointments/calendar`,
    appointmentHistory: `${base}/appointments/history`,
    consultationHistory: `${base}/consultation-history`,
    astrologerProfile: `${base}/astrologer-profile`,
    astrologers: `${base}/astrologers`,
    astrologersFull: `${base}/astrologers-full`,
    followedAstrologersFull: `${base}/followed-astrologers`,
    suggestedAstrologers: `${base}/suggested-astrologers`,
    callPackages: `${base}/call-packages`,
    walletPayment: `${base}/wallet-payment`,
    call: `${base}/call`,
    chatWalletPayment: `${base}/chat-wallet-payment`,
    chatBooking: `${base}/chat-booking`,
    chat: `${base}/chat`,
    chatDetails: `${base}/chat-details`,
    discountQuestions: `${base}/discount-questions`,
    rewards: `${base}/rewards`,
    myAccount: `${base}/my-account`,
    profile: `${base}/profile`,
    accountProfile: `${base}/account-profile`,
    appointmentDetails: `${base}/appointment-details`,
    poojaDetails: `${base}/pooja-details`,
    liveSession: `${base}/live-session`,
    liveSessionSetup: `${base}/live-session/setup`,
    liveSessionConfigure: `${base}/live-session/configure`,
    liveSessionRoom: `${base}/live-session/room`,
    liveSessionSummary: `${base}/live-session/summary`,
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
