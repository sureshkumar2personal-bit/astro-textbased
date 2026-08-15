/**
 * @typedef {'question_new'|'question_expiring'|'booking_new'|'booking_cancelled'
 *   |'live_soon'|'client_message'|'payout'|'review'|'follower'|'sales_summary'|'system'} NotifType
 *
 * @typedef {Object} Notification
 * @property {string} id
 * @property {NotifType} type
 * @property {'work'|'money'|'clients'|'system'} category
 * @property {string} title
 * @property {string} [subtitle]
 * @property {number} [amount]
 * @property {string} [expiresAt] ISO string, only for question_new / question_expiring
 * @property {string} createdAt ISO string
 * @property {boolean} read
 * @property {number} [groupCount]
 * @property {('reply'|'accept'|'decline'|'join')[]} [actions]
 * @property {string} [actorName]
 * @property {string} [actorAvatarUrl]
 * @property {string} deepLink
 */

function minutesFrom(base, minutes) {
  return new Date(base + minutes * 60_000).toISOString()
}

/** Builds a fresh set of mock notifications with timestamps relative to "now". */
export function createMockNotifications() {
  const now = Date.now()

  return [
    {
      id: 'n-question-new-1',
      type: 'question_new',
      category: 'work',
      title: 'New personal question from Ananya',
      subtitle: 'Career change timing this year',
      createdAt: minutesFrom(now, -5),
      read: false,
      actions: ['accept', 'decline'],
      deepLink: '/astrologer/answer-question?questionId=QTN-1001',
    },
    {
      id: 'n-question-expiring-urgent',
      type: 'question_expiring',
      category: 'work',
      title: 'Answer expiring soon',
      subtitle: 'General question from Rahul K.',
      expiresAt: minutesFrom(now, 2),
      createdAt: minutesFrom(now, -58),
      read: false,
      actions: ['reply'],
      deepLink: '/astrologer/answer-question?questionId=QTN-1002',
    },
    {
      id: 'n-question-expiring-normal',
      type: 'question_expiring',
      category: 'work',
      title: 'Answer expiring soon',
      subtitle: 'Personal question from Divya M.',
      expiresAt: minutesFrom(now, 40),
      createdAt: minutesFrom(now, -20),
      read: false,
      actions: ['reply'],
      deepLink: '/astrologer/answer-question?questionId=QTN-1003',
    },
    {
      id: 'n-booking-new-1',
      type: 'booking_new',
      category: 'work',
      title: 'New consultation booking',
      subtitle: 'Live video call requested for tomorrow',
      createdAt: minutesFrom(now, -12),
      read: false,
      actions: ['accept', 'decline'],
      actorName: 'Meena R.',
      deepLink: '/astrologer/dashboard?bookingId=BKG-2001',
    },
    {
      id: 'n-booking-cancelled-1',
      type: 'booking_cancelled',
      category: 'work',
      title: 'Booking cancelled by client',
      subtitle: 'Consultation on Friday was cancelled',
      createdAt: minutesFrom(now, -190),
      read: true,
      deepLink: '/astrologer/dashboard?bookingId=BKG-1988',
    },
    {
      id: 'n-live-soon-1',
      type: 'live_soon',
      category: 'work',
      title: 'Live session starts soon',
      subtitle: 'Weekly horoscope Q&A in 15 minutes',
      createdAt: minutesFrom(now, -3),
      read: false,
      actions: ['join'],
      deepLink: '/astrologer/dashboard?liveId=LIVE-77',
    },
    {
      id: 'n-client-message-1',
      type: 'client_message',
      category: 'clients',
      title: 'New message from a client',
      subtitle: 'Can we reschedule to next week?',
      createdAt: minutesFrom(now, -8),
      read: false,
      actions: ['reply'],
      actorName: 'Kavita S.',
      deepLink: '/astrologer/dispute-management?questionId=QTN-1010',
    },
    {
      id: 'n-client-message-2',
      type: 'client_message',
      category: 'clients',
      title: 'Message resolved',
      subtitle: 'Thanks for the clarification!',
      createdAt: minutesFrom(now, -260),
      read: true,
      actorName: 'Arjun D.',
      deepLink: '/astrologer/dispute-management?questionId=QTN-1005',
    },
    {
      id: 'n-payout-1',
      type: 'payout',
      category: 'money',
      title: 'Payout processed',
      subtitle: 'Weekly earnings transferred to your account',
      amount: 4500,
      createdAt: minutesFrom(now, -45),
      read: false,
      deepLink: '/astrologer/wallet-history',
    },
    {
      id: 'n-review-1',
      type: 'review',
      category: 'clients',
      title: 'New 5-star review',
      subtitle: '"Extremely accurate and kind, thank you!"',
      createdAt: minutesFrom(now, -320),
      read: true,
      actorName: 'Suresh P.',
      deepLink: '/astrologer/dashboard',
    },
    {
      id: 'n-follower-1',
      type: 'follower',
      category: 'clients',
      title: 'You have a new follower',
      subtitle: 'They will be notified about your live sessions',
      createdAt: minutesFrom(now, -95),
      read: false,
      deepLink: '/astrologer/dashboard',
    },
    {
      id: 'n-sales-summary-1',
      type: 'sales_summary',
      category: 'money',
      title: 'Weekly sales summary',
      subtitle: '18 questions answered, 3 campaigns active',
      amount: 18200,
      createdAt: minutesFrom(now, -400),
      read: true,
      deepLink: '/astrologer/sales-management',
    },
    {
      id: 'n-system-1',
      type: 'system',
      category: 'system',
      title: 'App updated to v2.4',
      subtitle: 'Faster answer sync and bug fixes',
      createdAt: minutesFrom(now, -600),
      read: false,
      deepLink: '/astrologer/dashboard',
    },
    {
      id: 'n-question-group-1',
      type: 'question_new',
      category: 'work',
      title: '3 new questions',
      subtitle: '₹450 total · oldest 12 min ago',
      amount: 450,
      groupCount: 3,
      createdAt: minutesFrom(now, -2),
      read: false,
      deepLink: '/astrologer/text-based-questions',
    },
  ]
}

export const mockNotifications = createMockNotifications()

/** Empty-state preview: a tab / inbox with zero notifications. */
export const mockEmpty = []

/** Error-state preview: shape carried by the screen's error UI. */
export const mockError = { message: 'Could not load notifications. Check your connection and try again.' }
