const ACTIVITY_TYPES = {
  QUESTION: 'question',
  ANSWER: 'answer',
  DISPUTE: 'dispute',
  CONSULTATION: 'consultation',
}

function questionUserId(question) {
  return question.userId || question.submittedByUserId || null
}

function consultationUserId(session) {
  return session.userId || session.customerId || null
}

function toTimestamp(value) {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export function getMemberCommunicationActivity({ questions = [], consultationHistory = [], userId, astrologerId }) {
  if (!userId || !astrologerId) return []

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
      })
    })

  return activity.sort((a, b) => toTimestamp(b.occurredAt) - toTimestamp(a.occurredAt))
}

export { ACTIVITY_TYPES }
