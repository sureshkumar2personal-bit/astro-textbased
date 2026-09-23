const ACTIVITY_TYPES = {
  QUESTION: 'question',
  ANSWER: 'answer',
  DISPUTE: 'dispute',
  CONSULTATION: 'consultation',
  WALLET: 'wallet',
}

const HIDDEN_ACTIVITY_STORAGE_KEY = 'astroconnect-hidden-user-activities'

function questionUserId(question) {
  return question.submittedByUserId || question.userId || null
}

function consultationUserId(session) {
  return session.userId || session.customerId || null
}

function appointmentActivityDate(appointment) {
  if (appointment.bookedAt || appointment.createdAt) return appointment.bookedAt || appointment.createdAt

  const bookingDate = String(appointment.bookingDate || '')
  const numericDate = bookingDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (numericDate) {
    const [, day, month, year] = numericDate
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`
  }

  return appointment.bookingDate || appointment.date
}

function toTimestamp(value) {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function walletActivityDate(transaction) {
  const date = String(transaction.date || '').trim()
  const time = String(transaction.time || '').trim()
  if (!date) return null
  if (!time || /^just now$/i.test(time)) return date
  return `${date} ${time}`
}

export function getHiddenUserActivityIds(userId) {
  if (!userId || typeof window === 'undefined') return []
  try {
    const stored = JSON.parse(window.localStorage.getItem(HIDDEN_ACTIVITY_STORAGE_KEY) || '{}')
    return Array.isArray(stored[userId]) ? stored[userId] : []
  } catch {
    return []
  }
}

export function saveHiddenUserActivityIds(userId, activityIds) {
  if (!userId || typeof window === 'undefined') return
  try {
    const stored = JSON.parse(window.localStorage.getItem(HIDDEN_ACTIVITY_STORAGE_KEY) || '{}')
    stored[userId] = activityIds
    window.localStorage.setItem(HIDDEN_ACTIVITY_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Activity hiding is a convenience preference; the page remains usable if storage is unavailable.
  }
}

function sortByRecent(first, second) {
  return toTimestamp(second.occurredAt) - toTimestamp(first.occurredAt)
}

export function getMemberCommunicationActivity({ questions = [], consultationHistory = [], appointments = [], walletTransactions = [], userId, astrologerId }) {
  if (!userId || (!astrologerId && !walletTransactions.length)) return []

  const activity = []
  questions
    .filter((question) => questionUserId(question) === userId && question.astrologerId === astrologerId)
    .forEach((question) => {
      activity.push({
        id: `${question.id}-question`,
        type: ACTIVITY_TYPES.QUESTION,
        title: 'Question submitted',
        summary: question.question,
        status: question.status,
        occurredAt: question.raisedAt || question.raised,
        metadata: question.id,
        sourceType: 'question',
        sourceId: question.id,
      })
      if (question.answer) {
        activity.push({
          id: `${question.id}-answer`,
          type: ACTIVITY_TYPES.ANSWER,
          title: 'Answer provided',
          summary: question.answer,
          status: 'Answered',
          occurredAt: question.answeredAt || question.raisedAt || question.raised,
          metadata: question.id,
          sourceType: 'answer',
          sourceId: question.id,
        })
      }
      if (question.dispute) {
        activity.push({
          id: `${question.id}-dispute`,
          type: ACTIVITY_TYPES.DISPUTE,
          title: 'Dispute activity',
          summary: question.dispute.reason || question.dispute.description || 'A dispute was raised for this question.',
          status: question.dispute.status || 'Open',
          occurredAt: question.dispute.raisedAt || question.raisedAt || question.raised,
          metadata: question.id,
          sourceType: 'dispute',
          sourceId: question.id,
        })
      }
    })

  consultationHistory
    .filter((session) => consultationUserId(session) === userId && session.astrologerId === astrologerId)
    .forEach((session) => {
      activity.push({
        id: session.id,
        type: ACTIVITY_TYPES.CONSULTATION,
        title: `${session.type} consultation`,
        summary: session.messages?.at(-1)?.text || `${session.durationMinutes} minute consultation completed.`,
        status: session.status,
        occurredAt: session.startedAt,
        metadata: `${session.durationMinutes} min`,
        sessionType: session.type,
        sourceType: String(session.type || '').toLowerCase().includes('chat') ? 'chat' : 'call',
        sourceId: session.id,
      })
    })

  appointments
    .filter((appointment) => appointment.userId === userId && appointment.astrologerId === astrologerId)
    .forEach((appointment) => {
      activity.push({
        id: `${appointment.id}-appointment`,
        type: ACTIVITY_TYPES.CONSULTATION,
        title: `${appointment.type || 'Appointment'} consultation`,
        summary: appointment.topic ? `Topic: ${appointment.topic}` : 'Appointment consultation.',
        status: appointment.status,
        occurredAt: appointmentActivityDate(appointment),
        metadata: appointment.orderId,
        sessionType: appointment.type,
        sourceType: 'appointment',
        sourceId: appointment.id,
      })
    })

  if (!astrologerId) {
    walletTransactions.forEach((transaction) => {
      const isTopUp = transaction.type === 'topup'
      const isRefund = transaction.type === 'refund'
      activity.push({
        id: `${transaction.id}-wallet`,
        type: ACTIVITY_TYPES.WALLET,
        title: transaction.label || (isTopUp ? 'Wallet top-up' : isRefund ? 'Wallet refund' : 'Wallet transaction'),
        summary: transaction.amount ? `${transaction.amount}${transaction.label ? ` · ${transaction.label}` : ''}` : 'Wallet activity recorded.',
        status: isRefund ? 'Refunded' : 'Completed',
        occurredAt: walletActivityDate(transaction),
        metadata: transaction.amount,
        sourceType: ACTIVITY_TYPES.WALLET,
        sourceId: transaction.id,
      })
    })
  }

  return activity.sort(sortByRecent)
}

export function getUserCommunicationActivity({ questions = [], consultationHistory = [], appointments = [], walletTransactions = [], userId }) {
  if (!userId) return []

  const astrologerIds = new Set([
    ...questions.filter((item) => questionUserId(item) === userId).map((item) => item.astrologerId),
    ...consultationHistory.filter((item) => consultationUserId(item) === userId).map((item) => item.astrologerId),
    ...appointments.filter((item) => item.userId === userId).map((item) => item.astrologerId),
  ].filter(Boolean))

  return Array.from(astrologerIds)
    .flatMap((astrologerId) => getMemberCommunicationActivity({ questions, consultationHistory, appointments, userId, astrologerId, walletTransactions: [] }))
    .concat(getMemberCommunicationActivity({ questions: [], consultationHistory: [], appointments: [], userId, astrologerId: null, walletTransactions }))
    .sort(sortByRecent)
}

export { ACTIVITY_TYPES }
