import { mockAstrologers } from '../data/notificationData.js'
import { sortByDateDesc } from './date.js'

// Pure selectors for the Admin -> Disputes module.
//
// This app has no standalone dispute store. A dispute is an object attached to
// the question it was raised against, which is how RaiseDispute.jsx and
// DisputeManagement.jsx already read and write it. This module reads that same
// data and does not create a second model or reimplement raise/respond logic.

const ASTROLOGER_NAMES = new Map(mockAstrologers.map((astrologer) => [astrologer.id, astrologer.name]))

// Flattens the disputes that exist on the questions store into plain rows. Every
// field is read from the record; nothing is derived or filled in.
export function selectAdminDisputes(questions) {
  return (Array.isArray(questions) ? questions : [])
    .filter((question) => question?.dispute)
    .map((question) => ({
      key: question.id,
      dispute: question.dispute,
      questionId: question.id,
      userName: question.user || question.submittedByEmail || '',
      astrologerName: ASTROLOGER_NAMES.get(question.astrologerId) || question.astrologer || '',
      relatedLabel: question.category ? `Question · ${question.category}` : 'Question',
      // Only the dispute's own timestamp is a dispute date. The question's
      // raisedAt is a different event, so it is never used as a substitute.
      createdAt: question.dispute.raisedAt || '',
      status: String(question.dispute.status || '').trim(),
    }))
    .sort((a, b) => sortByDateDesc(a, b, (row) => row.createdAt))
}

// Dispute records carry no id of their own, so the related question id is used.
export function getDisputeId(dispute) {
  return String(dispute?.dispute?.id || '').trim()
}

export function selectDisputeStatusFilters(disputes) {
  const statuses = new Set()
  for (const dispute of Array.isArray(disputes) ? disputes : []) {
    if (dispute.status) statuses.add(dispute.status)
  }
  return ['All', ...Array.from(statuses).sort((a, b) => a.localeCompare(b))]
}

export function matchesDisputeQuery(dispute, query) {
  const search = String(query || '').trim().toLowerCase()
  if (!search) return true
  const fields = [dispute.questionId, getDisputeId(dispute), dispute.userName, dispute.astrologerName, dispute.relatedLabel]
  return fields.some((field) => String(field || '').toLowerCase().includes(search))
}

export function filterAdminDisputes(disputes, { query = '', status = 'All' } = {}) {
  return (Array.isArray(disputes) ? disputes : []).filter((dispute) => {
    if (!matchesDisputeQuery(dispute, query)) return false
    if (status && status !== 'All' && dispute.status !== status) return false
    return true
  })
}

export function findAdminDispute(disputes, key) {
  return (Array.isArray(disputes) ? disputes : []).find((dispute) => dispute.key === key) || null
}
