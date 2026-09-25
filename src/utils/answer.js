import { parseDisplayDate } from './date.js'

export const ANSWER_DEADLINE_DAYS = 30
export const ANSWER_DEADLINE_MS = ANSWER_DEADLINE_DAYS * 24 * 60 * 60 * 1000
export const DUE_SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
export const ANSWER_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000
export const ANSWER_CHAR_LIMIT = 3000
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024
export const PDF_ALLOWED_TYPES = ['application/pdf']
export const IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function getQuestionTypeLabel(question = {}) {
  const raw = String(question.type || question.questionType || '').trim().toLowerCase()
  if (raw.includes('personal') || raw === 'individual') return 'Personal'
  return 'General'
}

export function getQuestionReceivedAt(question = {}) {
  const raw = question.receivedAt || question.raisedAt || question.submittedAt || question.raised
  if (raw == null || raw === '') return null
  const date = parseDisplayDate(raw)
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return null
  return date
}

export function getQuestionAnswerDeadline(question = {}) {
  const received = getQuestionReceivedAt(question)
  if (!received) return null
  return new Date(received.getTime() + ANSWER_DEADLINE_MS)
}

export function hasOpenDispute(question = {}) {
  if (!question.dispute) return false
  return String(question.dispute.status || 'Open').toLowerCase() !== 'resolved'
}

export function isQuestionAnswered(question = {}) {
  return question.status === 'Answered' || Boolean(String(question.answer || '').trim())
}

export function isQuestionNeedingAnswer(question = {}) {
  return !isQuestionAnswered(question) && !hasOpenDispute(question) && String(question.status || '') !== 'Closed'
}

export function getQuestionDueState(question = {}, nowMs = Date.now()) {
  const status = String(question.status || '').trim()
  if (status === 'Closed') return 'closed'
  if (hasOpenDispute(question)) return 'disputed'
  if (isQuestionAnswered(question)) return 'answered'
  const deadline = getQuestionAnswerDeadline(question)
  if (!deadline) return 'pending'
  const remaining = deadline.getTime() - nowMs
  if (remaining < 0) return 'overdue'
  if (remaining <= DUE_SOON_WINDOW_MS) return 'dueSoon'
  return 'pending'
}

export function formatAnswerDate(input) {
  if (input == null || input === '') return ''
  const date = input instanceof Date ? input : parseDisplayDate(input)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function getAnswerDeadlineLabel(question = {}, nowMs = Date.now()) {
  const deadline = getQuestionAnswerDeadline(question)
  if (!deadline) return { label: 'Deadline not set', tone: 'muted', days: null }
  const remaining = deadline.getTime() - nowMs
  const days = remaining >= 0 ? Math.floor(remaining / (24 * 60 * 60 * 1000)) : Math.ceil(remaining / (24 * 60 * 60 * 1000))
  if (remaining < 0) {
    const past = Math.abs(days)
    return { label: `Overdue by ${past} day${past === 1 ? '' : 's'}`, tone: 'overdue', days }
  }
  if (days === 0) return { label: 'Due today', tone: 'dueSoon', days: 0 }
  return { label: `${days} day${days === 1 ? '' : 's'} left`, tone: days <= 7 ? 'dueSoon' : 'pending', days }
}

export function getAnswerSubmittedAtMs(question = {}) {
  const raw = question.answeredAt || question.answerDeliveredAt || question.answerReviewStartedAt
  if (raw == null || raw === '') return null
  const numeric = typeof raw === 'number' ? raw : parseDisplayDate(raw).getTime()
  if (Number.isNaN(numeric) || numeric === 0) return null
  return numeric
}

export function getAnswerEditUntilMs(question = {}) {
  if (typeof question.answerEditUntil === 'number' && !Number.isNaN(question.answerEditUntil)) return question.answerEditUntil
  const submittedAt = getAnswerSubmittedAtMs(question)
  return submittedAt == null ? null : submittedAt + ANSWER_EDIT_WINDOW_MS
}

export function canEditQuestionAnswer(question = {}, nowMs = Date.now()) {
  if (!isQuestionAnswered(question) || hasOpenDispute(question)) return false
  const until = getAnswerEditUntilMs(question)
  return until != null && until > nowMs
}

export function getAnswerEditWindowLabel(question = {}, nowMs = Date.now()) {
  const until = getAnswerEditUntilMs(question)
  if (until == null) return { label: '', tone: 'muted', msLeft: 0 }
  const msLeft = until - nowMs
  if (msLeft <= 0) return { label: 'Answer locked', tone: 'muted', msLeft: 0 }
  const hours = Math.ceil(msLeft / (60 * 60 * 1000))
  return { label: `Editable for ${hours} hour${hours === 1 ? '' : 's'}`, tone: 'dueSoon', msLeft }
}

export function sortAnswerQuestionsFifo(questions = []) {
  return [...questions].sort((a, b) => {
    const receivedA = getQuestionReceivedAt(a)
    const receivedB = getQuestionReceivedAt(b)
    const msA = receivedA ? receivedA.getTime() : Number.MAX_SAFE_INTEGER
    const msB = receivedB ? receivedB.getTime() : Number.MAX_SAFE_INTEGER
    return msA - msB
  })
}

export function sortAnswerQueue(questions = []) {
  const open = questions.filter((question) => isQuestionNeedingAnswer(question))
  const resolved = questions.filter((question) => !isQuestionNeedingAnswer(question))
  return [
    ...sortAnswerQuestionsFifo(open),
    ...resolved.sort((a, b) => {
      const receivedA = getQuestionReceivedAt(a)
      const receivedB = getQuestionReceivedAt(b)
      return (receivedB ? receivedB.getTime() : 0) - (receivedA ? receivedA.getTime() : 0)
    }),
  ]
}

export function matchesDueFilter(question = {}, due = 'All', nowMs = Date.now()) {
  if (due === 'pending') return isQuestionNeedingAnswer(question)
  if (due === 'generalPending') return isQuestionNeedingAnswer(question) && getQuestionTypeLabel(question) === 'General'
  if (due === 'personalPending') return isQuestionNeedingAnswer(question) && getQuestionTypeLabel(question) === 'Personal'
  return getQuestionDueState(question, nowMs) === due
}

export function filterAnswerQuestions(questions = [], { type = 'All', due = 'All', search = '' } = {}, nowMs = Date.now()) {
  const term = String(search || '').trim().toLowerCase()
  return questions.filter((question) => {
    if (type !== 'All' && getQuestionTypeLabel(question) !== type) return false
    if (due !== 'All' && !matchesDueFilter(question, due, nowMs)) return false
    if (!term) return true
    const searchable = [question.id, question.user, question.userName, question.submittedByUserId, question.category, getQuestionTypeLabel(question), question.question, question.status, question.campaignName]
      .join(' ')
      .toLowerCase()
    return searchable.includes(term)
  })
}

export function getAnswerSummary(questions = [], nowMs = Date.now()) {
  let generalPending = 0
  let personalPending = 0
  let inProgress = 0
  let dueSoon = 0
  let overdue = 0
  let answered = 0
  let disputed = 0
  for (const question of questions) {
    const dueState = getQuestionDueState(question, nowMs)
    if (dueState === 'disputed') disputed += 1
    else if (dueState === 'answered') answered += 1
    else if (dueState === 'overdue') overdue += 1
    else if (dueState === 'dueSoon') dueSoon += 1
    if (isQuestionNeedingAnswer(question)) {
      if (question.status === 'In Progress') inProgress += 1
      if (getQuestionTypeLabel(question) === 'Personal') personalPending += 1
      else generalPending += 1
    }
  }
  return {
    total: questions.length,
    generalPending,
    personalPending,
    pending: generalPending + personalPending,
    inProgress,
    dueSoon,
    overdue,
    answered,
    disputed,
    needsAnswer: generalPending + personalPending,
  }
}

function trimNumber(num) {
  const rounded = Math.round(num * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function formatFileSize(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return '0 B'
  if (value < 1024) return `${value} B`
  const kb = value / 1024
  if (kb < 1024) return `${trimNumber(kb)} KB`
  return `${trimNumber(value / (1024 * 1024))} MB`
}

function matchesFileExtension(name, extensions) {
  const ext = String(name || '').toLowerCase().split('.').pop()
  return extensions.includes(ext)
}

export function validateAttachmentFile(file, kind = 'pdf') {
  if (!file) return { ok: false, error: 'No file selected.' }
  const name = String(file.name || '')
  const type = String(file.type || '').toLowerCase()
  const isImage = kind === 'image'
  const allowedTypes = isImage ? IMAGE_ALLOWED_TYPES : PDF_ALLOWED_TYPES
  const extensions = isImage ? ['jpg', 'jpeg', 'png', 'webp'] : ['pdf']
  const typeValid = allowedTypes.some((allowed) => allowed.toLowerCase() === type || (type === '' && matchesFileExtension(name, extensions)))
  if (!typeValid) {
    return { ok: false, error: isImage ? 'Unsupported file type. Only JPG, PNG, or WEBP images are allowed.' : 'Unsupported file type. Only PDF files are allowed.' }
  }
  if ((Number(file.size) || 0) > ATTACHMENT_MAX_BYTES) {
    return { ok: false, error: `"${name}" is too large. Maximum allowed size is ${formatFileSize(ATTACHMENT_MAX_BYTES)}.` }
  }
  return { ok: true, file }
}

export function validateReferenceLink(value) {
  const raw = String(value || '').trim()
  if (!raw) return { ok: false, error: 'Enter a link URL.' }
  let url
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, error: 'Enter a valid URL, for example https://youtube.com/...' }
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { ok: false, error: 'Reference links must start with http:// or https://.' }
  }
  if (!url.hostname || !url.hostname.includes('.')) {
    return { ok: false, error: 'Enter a valid URL, for example https://youtube.com/...' }
  }
  return { ok: true, url: url.href }
}

function normalizeAttachmentList(list) {
  return Array.isArray(list) ? list.filter((item) => item && item.name && item.kind) : []
}

function normalizeLinkList(list) {
  return Array.isArray(list) ? list.filter((item) => item && item.url) : []
}

export const ANSWER_DUE_STATE_META = {
  pending: { label: 'Pending', background: 'var(--warning-bg)', color: 'var(--amber-600)', border: 'rgba(217, 119, 6, 0.30)' },
  dueSoon: { label: 'Due Soon', background: 'var(--coral-100)', color: 'var(--coral-600)', border: 'rgba(242, 102, 42, 0.32)' },
  overdue: { label: 'Overdue', background: 'var(--danger-bg)', color: 'var(--red-600)', border: 'rgba(239, 68, 68, 0.30)' },
  answered: { label: 'Answered', background: 'var(--success-bg)', color: 'var(--green-600)', border: 'rgba(16, 185, 129, 0.30)' },
  disputed: { label: 'Dispute', background: '#FFF7ED', color: '#EA580C', border: 'rgba(234, 88, 12, 0.32)' },
  inProgress: { label: 'In Progress', background: 'var(--primary-bg)', color: 'var(--primary)', border: 'rgba(91, 33, 182, 0.26)' },
  closed: { label: 'Closed', background: 'var(--neutral-bg)', color: 'var(--muted)', border: 'rgba(100, 116, 139, 0.25)' },
}

export function applyQuestionDraft(question = {}, draftAnswer, attachments = [], referenceLinks = []) {
  if (isQuestionAnswered(question) || hasOpenDispute(question) || String(question.status || '') === 'Closed') return question
  return {
    ...question,
    draftAnswer: String(draftAnswer || ''),
    draftAttachments: normalizeAttachmentList(attachments),
    draftReferenceLinks: normalizeLinkList(referenceLinks),
    status: 'In Progress',
    history: [...(question.history || []), 'Draft saved'],
  }
}

export function applyAnswerSubmit(question = {}, answer, nowMs = Date.now(), attachments = [], referenceLinks = []) {
  const submittedAt = typeof nowMs === 'number' ? nowMs : Date.now()
  return {
    ...question,
    answer: String(answer || ''),
    draftAnswer: '',
    draftAttachments: [],
    draftReferenceLinks: [],
    answerAttachments: normalizeAttachmentList(attachments),
    referenceLinks: normalizeLinkList(referenceLinks),
    status: 'Answered',
    answeredAt: new Date(submittedAt).toISOString(),
    answerDeliveredAt: submittedAt,
    answerEditUntil: submittedAt + ANSWER_EDIT_WINDOW_MS,
    answerEditUsed: false,
    answerReviewStartedAt: null,
    answerReviewUntil: null,
    history: [...(question.history || []), 'Answer submitted to user'],
  }
}

export function applyAnswerEdit(question = {}, answer, nowMs = Date.now(), attachments = [], referenceLinks = []) {
  if (!canEditQuestionAnswer(question, nowMs)) return question
  return {
    ...question,
    answer: String(answer || ''),
    answerAttachments: normalizeAttachmentList(attachments),
    referenceLinks: normalizeLinkList(referenceLinks),
    answerEditUsed: true,
    history: [...(question.history || []), 'Answer corrected'],
  }
}