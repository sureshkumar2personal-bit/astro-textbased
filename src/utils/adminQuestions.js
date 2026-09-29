import { mockAstrologers } from '../data/notificationData.js'

// Pure selectors for the Admin -> Text-Based Questions module.
//
// Reads the live questions store already exposed by AppDataContext
// (localStorage key astroconnect-questions, merged with the seed list). No
// question record is created, reshaped or invented here, and no answer, refund
// or dispute behaviour is reimplemented.

// Question records only carry astrologerId. Names come from the same catalog the
// rest of the app uses, so the admin list shows the real astrologer name without
// duplicating that data.
const ASTROLOGER_NAMES = new Map(mockAstrologers.map((astrologer) => [astrologer.id, astrologer.name]))

export function getQuestionAstrologerName(question) {
  return ASTROLOGER_NAMES.get(question?.astrologerId) || question?.astrologer || ''
}

export function getQuestionUserName(question) {
  return question?.user || question?.submittedByEmail || ''
}

// Questions raised in the app store their timestamp as raisedAt; the seed list
// also carries a display string in raised.
export function getQuestionAskedAt(question) {
  return question?.raisedAt || question?.raised || ''
}

// Draft answers are working copy, not a response to the user. Only an answer
// that was actually submitted is treated as the existing response.
export function getQuestionResponse(question) {
  return question?.answer || ''
}

// Filter options are derived from the questions that actually exist, so the
// filter can only ever offer a status the data already contains.
export function selectQuestionStatusFilters(questions) {
  const statuses = new Set()
  for (const question of Array.isArray(questions) ? questions : []) {
    const status = String(question?.status || '').trim()
    if (status) statuses.add(status)
  }
  return ['All', ...Array.from(statuses).sort((a, b) => a.localeCompare(b))]
}

export function matchesQuestionQuery(question, query) {
  const search = String(query || '').trim().toLowerCase()
  if (!search) return true
  const astrologerName = getQuestionAstrologerName(question)
  return [question?.id, getQuestionUserName(question), astrologerName].some((field) =>
    String(field || '').toLowerCase().includes(search),
  )
}

export function filterAdminQuestions(questions, { query = '', status = 'All' } = {}) {
  return (Array.isArray(questions) ? questions : []).filter((question) => {
    if (!matchesQuestionQuery(question, query)) return false
    if (status && status !== 'All' && String(question?.status || '').trim() !== status) return false
    return true
  })
}

export function findAdminQuestion(questions, questionId) {
  return (Array.isArray(questions) ? questions : []).find((question) => question.id === questionId) || null
}
