import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { Search, X, Paperclip } from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import TextBasedQuestionsModuleTabs from '../components/TextBasedQuestionsModuleTabs.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import DisputeDetailsModal from '../components/DisputeDetailsModal.jsx'
import AnswerAttachmentPanel from '../components/AnswerAttachmentPanel.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import {
  filterAnswerQuestions,
  formatAnswerDate,
  getAnswerDeadlineLabel,
  getAnswerEditWindowLabel,
  getAnswerSummary,
  getQuestionAnswerDeadline,
  getQuestionDueState,
  getQuestionTypeLabel,
  hasOpenDispute,
  isQuestionAnswered,
  sortAnswerQueue,
  ANSWER_CHAR_LIMIT,
  canEditQuestionAnswer,
} from '../utils/answer.js'
import {
  TempleArchIcon,
  TempleLampIcon,
  TempleLotusIcon,
  TempleReturnIcon,
  TempleScrollIcon,
} from '../components/TempleIcons.jsx'

const DUE_FILTERS = ['All', 'Pending', 'Due Soon', 'Overdue', 'Answered', 'Disputed']

const DUE_FILTER_KEY = {
  'Pending': 'pending',
  'Due Soon': 'dueSoon',
  'Overdue': 'overdue',
  'Answered': 'answered',
  'Disputed': 'disputed',
}

const TYPE_OPTIONS = ['All', 'General Pending', 'Personal']

const TYPE_FILTER_KEY = {
  'General Pending': 'generalPending',
  'Personal': 'personalPending',
}

const DUE_PILL_STYLE = {
  pending: { background: 'var(--warning-bg)', color: 'var(--amber-600)', border: 'rgba(217, 119, 6, 0.30)' },
  dueSoon: { background: 'var(--coral-100)', color: 'var(--coral-600)', border: 'rgba(242, 102, 42, 0.32)' },
  overdue: { background: 'var(--danger-bg)', color: 'var(--red-600)', border: 'rgba(239, 68, 68, 0.30)' },
  answered: { background: 'var(--success-bg)', color: 'var(--green-600)', border: 'rgba(16, 185, 129, 0.30)' },
  disputed: { background: '#FFF7ED', color: '#EA580C', border: 'rgba(234, 88, 12, 0.32)' },
  inProgress: { background: 'var(--primary-bg)', color: 'var(--primary)', border: 'rgba(91, 33, 182, 0.26)' },
  closed: { background: 'var(--neutral-bg)', color: 'var(--muted)', border: 'rgba(100, 116, 139, 0.25)' },
}

const DUE_PILL_LABEL = {
  pending: 'Pending',
  dueSoon: 'Due Soon',
  overdue: 'Overdue',
  answered: 'Answered',
  disputed: 'Dispute',
  inProgress: 'In Progress',
  closed: 'Closed',
}

const CARD_TONE = {
  pending: '#D97706',
  dueSoon: '#F2662A',
  overdue: '#DC2626',
  answered: '#10B981',
  disputed: '#EA580C',
  inProgress: '#5B21B6',
  closed: '#64748B',
}

const DEADLINE_TONE_STATES = ['pending', 'dueSoon', 'overdue']

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const day = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${day} · ${time}`
}

function DeadlinePill({ dueState, label }) {
  const style = DUE_PILL_STYLE[dueState] || DUE_PILL_STYLE.pending
  const text = label || DUE_PILL_LABEL[dueState] || 'Pending'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        padding: '3px 10px',
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        background: style.background,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: style.color, flex: 'none' }} />
      {text}
    </span>
  )
}

function TypeBadge({ type }) {
  const isPersonal = getQuestionTypeLabel({ type }) === 'Personal'
  return <span className={isPersonal ? 'badge badge-blue' : 'badge badge-violet'}>{getQuestionTypeLabel({ type })}</span>
}

function SummaryCard({ label, value, hint, background, color, border }) {
  return (
    <Card style={{ padding: 16 }}>
      <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}>
        <div
          className="text-center"
          style={{
            padding: '4px 8px 14px',
            borderRadius: 18,
            background,
            border: `1px solid ${border}`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color }}>{label}</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.15, marginTop: 6 }}>{value}</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{hint}</div>
        </div>
      </div>
    </Card>
  )
}

function QuestionCard({ question, nowMs, onAnswer, onViewDispute }) {
  const dueState = getQuestionDueState(question, nowMs)
  const deadline = getAnswerDeadlineLabel(question, nowMs)
  const typeLabel = getQuestionTypeLabel(question)
  const received = formatDateTime(question.receivedAt || question.raisedAt || question.submittedAt || question.raised)
  const deadlineDate = formatAnswerDate(getQuestionAnswerDeadline(question))
  const accent = CARD_TONE[dueState] || CARD_TONE.pending
  const isPending = DEADLINE_TONE_STATES.includes(dueState)
  const pillLabel = isPending ? deadline?.label : undefined
  const canEditAnswered = dueState === 'answered' && canEditQuestionAnswer(question, nowMs)
  const isDisputed = dueState === 'disputed'
  const isAnswered = dueState === 'answered'

  const remainingLine = isPending
    ? <span style={{ color: accent, fontWeight: 700 }}>{deadline?.label}</span>
    : isAnswered
      ? <span style={{ color: 'var(--green-600)', fontWeight: 700 }}>Answered {formatAnswerDate(question.answeredAt || question.answerDeliveredAt) || ''}</span>
      : isDisputed
        ? <span style={{ color: '#EA580C', fontWeight: 700 }}>Under dispute</span>
        : <span className="muted">Closed</span>

  const actionLabel = isDisputed ? 'View Dispute' : isAnswered ? (canEditAnswered ? 'Edit Answer' : 'View Answer') : 'Answer Now'
  const handleOpen = () => (isDisputed ? onViewDispute(question.id) : onAnswer(question.id))

  return (
    <div
      className="card card-hover"
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleOpen()
        }
      }}
      style={{
        background: 'var(--surface-strong, #fff)',
        border: '1px solid var(--surface-border)',
        borderTop: `3px solid ${accent}`,
        borderRadius: 16,
        padding: 18,
        boxShadow: 'var(--shadow-card)',
        cursor: 'pointer',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {question.user}
            </span>
            <span className="badge badge-gray">{question.submittedByUserId || 'user-demo'}</span>
            <TypeBadge type={typeLabel} />
          </div>
          <div className="muted" style={{ marginTop: 6, fontSize: 12.5 }}>
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{question.id}</span> · {question.campaignName || 'Open Question'} · {question.category || 'Others'}
          </div>
        </div>
        <div style={{ flex: 'none' }}>
          <DeadlinePill dueState={dueState} label={pillLabel} />
        </div>
      </div>

      <div
        style={{
          color: 'var(--ink)',
          fontStyle: 'italic',
          fontSize: 13,
          marginTop: 12,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: 1.5,
        }}
      >
        “{question.question}”
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid var(--surface-border)',
        }}
      >
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
          <div>Received: {received || '—'} · Answer by: {deadlineDate || '—'}</div>
          <div style={{ marginTop: 2 }}>{remainingLine}</div>
        </div>
        <button
          type="button"
          className={isDisputed ? 'btn btn-outline btn-sm' : isAnswered && !canEditAnswered ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm'}
          style={isDisputed ? { color: '#EA580C', borderColor: 'rgba(234, 88, 12, 0.4)' } : isAnswered && !canEditAnswered ? { color: 'var(--green-600)', borderColor: 'rgba(16, 185, 129, 0.4)' } : undefined}
          onClick={(event) => {
            event.stopPropagation()
            handleOpen()
          }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  )
}

function AnswerModal({ question, nowMs, onClose, onSaveDraft, onSubmit, onSaveCorrection, onViewHoroscope }) {
  const answered = isQuestionAnswered(question)
  const disputed = hasOpenDispute(question)
  const canEdit = answered && canEditQuestionAnswer(question, nowMs)
  const dueState = getQuestionDueState(question, nowMs)
  const deadline = getAnswerDeadlineLabel(question, nowMs)
  const editWindow = getAnswerEditWindowLabel(question, nowMs)
  const birthDetails = question?.customer || null
  const received = formatDateTime(question.receivedAt || question.raisedAt || question.submittedAt || question.raised)
  const deadlineDate = formatAnswerDate(getQuestionAnswerDeadline(question))
  const remaining = dueState === 'answered'
    ? `Answered ${formatAnswerDate(question.answeredAt || question.answerDeliveredAt) || '—'}`
    : dueState === 'disputed'
      ? 'Under dispute'
      : deadline?.label || '—'
  const pillLabel = DEADLINE_TONE_STATES.includes(dueState) ? deadline?.label : undefined

  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(question?.draftAnswer || question?.answer || '')
  const [attachments, setAttachments] = useState(() => (answered ? question?.answerAttachments || [] : question?.draftAttachments || []))
  const [links, setLinks] = useState(() => (answered ? question?.referenceLinks || [] : question?.draftReferenceLinks || []))

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  const saveDraft = () => {
    if (!text.trim()) return
    onSaveDraft(question.id, text, attachments, links)
  }

  const submit = () => {
    if (!text.trim()) return
    onSubmit(question.id, text, attachments, links)
  }

  const saveCorrection = () => {
    if (!text.trim()) return
    const saved = onSaveCorrection(question.id, text, attachments, links)
    if (saved) setEditing(false)
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--scroll" style={{ width: 'min(820px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-card__header flex items-center justify-between gap-4">
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div className="astrologer-modal-title">Answer Question</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {question.campaignName || 'Open Question'} · {question.id}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
            <StatusBadge label={question.status} />
            <DeadlinePill dueState={dueState} label={pillLabel} />
            <button type="button" className="icon-btn" aria-label="Close answer modal" onClick={onClose} style={{ width: 32, height: 32, minWidth: 32 }}><X size={16} /></button>
          </div>
        </div>

        <div className="modal-card__content astrologer-modal-content">
          <div className="astrologer-modal-section">
            <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleArchIcon size={14} />Question Summary</div>
            <div className="astrologer-modal-highlight astrologer-modal-details-grid">
              <div><strong>Customer Name</strong><div className="muted">{question.user}</div></div>
              <div><strong>User ID</strong><div className="muted">{question.submittedByUserId || question.userId || '—'}</div></div>
              <div><strong>Question Type</strong><div className="muted">{question.type}</div></div>
              <div><strong>Campaign Name</strong><div className="muted">{question.campaignName || 'Open Question'}</div></div>
              <div><strong>Received Date</strong><div className="muted">{received || '—'}</div></div>
              <div><strong>Answer Deadline</strong><div className="muted">{deadlineDate || '—'}</div></div>
              <div><strong>Remaining</strong><div className="muted" style={dueState === 'overdue' ? { color: 'var(--red-600)', fontWeight: 700 } : dueState === 'dueSoon' ? { color: 'var(--coral-600)', fontWeight: 700 } : undefined}>{remaining}</div></div>
              <div><strong>Current Status</strong><div className="muted">{question.status}</div></div>
            </div>
          </div>

          <div className="astrologer-modal-section">
            <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleScrollIcon size={14} />Customer Question</div>
            <div className="astrologer-modal-highlight astrologer-modal-question" style={{ whiteSpace: 'pre-wrap' }}>{question.question}</div>
          </div>

          {question.type === 'Personal' && !birthDetails && (
            <div className="astrologer-modal-section">
              <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleLotusIcon size={14} />Horoscope Details</div>
              <div className="option-list" style={{ gap: 10 }}>
                <div className="option-pill selected">
                  <span className="option-mark">✓</span>
                  {question.horoscopeMode || 'Continue Without Horoscope'}
                </div>
                {Array.isArray(question.attachments) && question.attachments.map((file) => (
                  <button key={file} className="option-pill" type="button" onClick={() => window.alert(`Opening ${file}`)}>
                    <span className="option-mark"><TempleScrollIcon size={14} /></span>
                    {file}
                  </button>
                ))}
              </div>
            </div>
          )}

          {question.type === 'Personal' && birthDetails && (
            <div className="astrologer-modal-section">
              <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleLotusIcon size={14} />Horoscope Details</div>
              <div className="astrologer-modal-highlight astrologer-modal-details-grid">
                <div><strong>Name</strong><div className="muted">{birthDetails.name || question.user}</div></div>
                <div><strong>DOB</strong><div className="muted">{birthDetails.dateOfBirth || '—'}</div></div>
                <div><strong>Birth Time</strong><div className="muted">{birthDetails.timeOfBirth || '—'}</div></div>
                <div><strong>Birth Place</strong><div className="muted">{birthDetails.birthPlace || '—'}</div></div>
                {birthDetails.rasi && <div><strong>Zodiac / Rashi</strong><div className="muted">{birthDetails.rasi}</div></div>}
                {birthDetails.nakshatra && <div><strong>Nakshatra</strong><div className="muted">{birthDetails.nakshatra}</div></div>}
                {birthDetails.lagna && <div><strong>Lagna</strong><div className="muted">{birthDetails.lagna}</div></div>}
              </div>
              {(birthDetails.horoscopeDetails || birthDetails.horoscope) && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => onViewHoroscope({
                      title: `${birthDetails.name || question.user}'s Horoscope`,
                      content: birthDetails.horoscopeDetails || birthDetails.horoscope,
                    })}
                  >
                    View Horoscope
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="astrologer-modal-section">
            <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleLampIcon size={14} />Your Answer</div>

            {disputed && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: '1px solid rgba(234, 88, 12, 0.30)',
                  background: '#FFF7ED',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: '#C2410C' }}>This question is under dispute</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  The customer raised a dispute for this answer. Review the concern and respond via View Dispute.
                </div>
              </div>
            )}

            {answered && !editing && (
              <div className="astrologer-modal-highlight astrologer-modal-question" style={{ whiteSpace: 'pre-wrap', marginBottom: 10 }}>
                {question.answer || '—'}
              </div>
            )}

            {answered && (
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                Answered {formatDateTime(question.answeredAt || question.answerDeliveredAt)}
                {canEdit ? ` · ${editWindow?.label || 'Editable for a limited time'}` : ' · Answer locked (24-hour edit window ended)'}
              </div>
            )}

            {!answered && !disputed && (
              <>
                <textarea
                  className="textarea-box"
                  style={{ width: '100%', minHeight: 150 }}
                  placeholder="Write your answer here..."
                  maxLength={ANSWER_CHAR_LIMIT}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Characters: {text.length} / {ANSWER_CHAR_LIMIT}
                  {question.draftAnswer ? ' · Draft autosaved — continue where you left off.' : ''}
                </div>
              </>
            )}

            {answered && canEdit && editing && (
              <>
                <textarea
                  className="textarea-box"
                  style={{ width: '100%', minHeight: 150 }}
                  placeholder="Update your answer..."
                  maxLength={ANSWER_CHAR_LIMIT}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>Characters: {text.length} / {ANSWER_CHAR_LIMIT}</div>
              </>
            )}

            {answered && !canEdit && (
              <div className="muted" style={{ fontSize: 13 }}>
                {disputed
                  ? 'The answer is final while the dispute is being resolved.'
                  : 'This answer is final and can no longer be edited.'}
              </div>
            )}
          </div>

          {!disputed && (
            <div className="astrologer-modal-section">
              <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Paperclip size={14} />Attachments &amp; References</div>
              {answered && !editing ? (
                <>
                  <AnswerAttachmentPanel
                    attachments={question.answerAttachments || []}
                    links={question.referenceLinks || []}
                    readOnly
                  />
                  {canEdit && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                      Click Edit Answer to add or remove attachments before saving.
                    </div>
                  )}
                </>
              ) : (
                <AnswerAttachmentPanel
                  attachments={attachments}
                  links={links}
                  onChange={({ attachments: nextAttachments, links: nextLinks }) => {
                    setAttachments(nextAttachments)
                    setLinks(nextLinks)
                  }}
                />
              )}
            </div>
          )}
        </div>

        <div className="modal-card__footer astrologer-modal-footer-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {!answered && !disputed && (
            <>
              <button className="btn btn-outline" disabled={!text.trim()} onClick={saveDraft}>Save Draft</button>
              <button className="btn btn-primary" disabled={!text.trim()} onClick={submit}>Submit Answer</button>
            </>
          )}
          {answered && canEdit && !editing && <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit Answer</button>}
          {answered && canEdit && editing && <button className="btn btn-primary" disabled={!text.trim()} onClick={saveCorrection}>Save Updated Answer</button>}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function AnswerQuestion() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { questions, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const astrologerId = currentUser?.id || 'astrologer-demo'
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined

  const [dueFilter, setDueFilter] = useState('All')
  const [typeOption, setTypeOption] = useState('All')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [answerId, setAnswerId] = useState(null)
  const [disputeId, setDisputeId] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [alert, setAlert] = useState(null)
  const [fullContent, setFullContent] = useState(null)
  const bootRef = useRef(false)

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  const myQuestions = useMemo(
    () => questions.filter((question) => (question.astrologerId || 'astrologer-demo') === astrologerId),
    [questions, astrologerId],
  )

  useEffect(() => {
    if (bootRef.current) return
    bootRef.current = true
    const id = searchParams.get('questionId')
    if (!id) return
    const question = myQuestions.find((item) => item.id === id)
    if (!question) return
    if (hasOpenDispute(question)) setDisputeId(id)
    else setAnswerId(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myQuestions])

  const queue = useMemo(() => sortAnswerQueue(myQuestions), [myQuestions])

  const summary = useMemo(() => getAnswerSummary(myQuestions, nowMs), [myQuestions, nowMs])

  const filteredQuestions = useMemo(() => {
    const statusDue = DUE_FILTERS.includes(dueFilter)
      ? DUE_FILTER_KEY[dueFilter] || 'All'
      : 'All'
    const typeDue = typeOption === 'All' ? 'All' : TYPE_FILTER_KEY[typeOption] || 'All'
    const due = typeDue !== 'All' ? typeDue : statusDue
    return filterAnswerQuestions(queue, { due, search: appliedSearch }, nowMs)
  }, [queue, dueFilter, typeOption, appliedSearch, nowMs])

  const answerQuestion = useMemo(
    () => (answerId ? myQuestions.find((question) => question.id === answerId) || null : null),
    [answerId, myQuestions],
  )

  const disputeQuestion = useMemo(
    () => (disputeId ? myQuestions.find((question) => question.id === disputeId) || null : null),
    [disputeId, myQuestions],
  )

  const setQuestionParam = useCallback((id) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('questionId', id)
      return next
    })
actions.viewQuestion(id)
  }, [setSearchParams])

  const clearQuestionParam = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('questionId')
      return next
    })
  }, [setSearchParams])

  const openAnswer = useCallback((id) => {
    setAnswerId(id)
    setDisputeId(null)
    setQuestionParam(id)
  }, [setQuestionParam])

  const closeAnswer = useCallback(() => {
    setAnswerId(null)
    clearQuestionParam()
  }, [clearQuestionParam])

  const openDispute = useCallback((id) => {
    setDisputeId(id)
    setAnswerId(null)
    setQuestionParam(id)
  }, [setQuestionParam])

  const closeDispute = useCallback(() => {
    setDisputeId(null)
    clearQuestionParam()
  }, [clearQuestionParam])

  const handleSaveDraft = useCallback((id, draft, attachments = [], referenceLinks = []) => {
    actions.saveQuestionDraft(id, draft, attachments, referenceLinks)
    setAlert('Draft saved. You can continue anytime before the answer deadline.')
  }, [actions])

  const handleSubmit = useCallback((id, answerText, attachments = [], referenceLinks = []) => {
    actions.submitQuestionAnswer(id, answerText, attachments, referenceLinks)
    closeAnswer()
    setAlert('Answer submitted. The customer can now view it and you can edit it for the next 24 hours.')
  }, [actions, closeAnswer])

  const handleSaveCorrection = useCallback((id, updatedAnswer, attachments = [], referenceLinks = []) => {
    const saved = actions.editSubmittedQuestionAnswer(id, updatedAnswer, attachments, referenceLinks)
    if (saved) setAlert('Answer updated. The corrected answer is now visible to the customer.')
    return saved
  }, [actions])

  return (
    <div>
      <PageHeader
        eyebrow="Astrologer"
        title="Answer Questions"
        subtitle="Answer received questions within 30 days, oldest first."
        showBack
        backTo={routes.textBasedQuestions}
        backIcon={backIcon}
      />

      <TextBasedQuestionsModuleTabs />

      <Section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <SummaryCard label="General Pending" value={summary.generalPending} hint={`${summary.inProgress} in progress`} background="var(--primary-bg)" color="var(--primary)" border="rgba(91, 33, 182, 0.20)" />
          <SummaryCard label="Personal Pending" value={summary.personalPending} hint={`${summary.needsAnswer} awaiting answers`} background="var(--sky-bg)" color="var(--sky-600)" border="rgba(2, 132, 199, 0.20)" />
          <SummaryCard label="Due Soon" value={summary.dueSoon} hint="Within 7 days of deadline" background="var(--coral-100)" color="var(--coral-600)" border="rgba(242, 102, 42, 0.24)" />
          <SummaryCard label="Overdue" value={summary.overdue} hint={`${summary.answered} answered · ${summary.disputed} disputed`} background="var(--danger-bg)" color="var(--red-600)" border="rgba(239, 68, 68, 0.24)" />
          <SummaryCard label="Disputed" value={summary.disputed} hint="Dispute Raised" background="#FFF7ED" color="#EA580C" border="rgba(234, 88, 12, 0.32)" />
        </div>
      </Section>

      <Section>
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group" style={{ gap: 10 }}>
              <div className="search-bar">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by customer, user ID, question ID, category, or keyword"
                  className="text-input search-bar__input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setAppliedSearch(search)
                  }}
                />
                <button type="button" className="icon-btn" aria-label="Search" onClick={() => setAppliedSearch(search)}>
                  <Search size={18} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2" style={{ alignItems: 'center' }}>
              {DUE_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`btn btn-sm ${dueFilter === filter ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setDueFilter(filter)}
                >
                  {filter}
                  {filter !== 'All' && (
                    <span style={{ opacity: 0.75 }}>
                      {' '}
                      ({filterAnswerQuestions(queue, { due: DUE_FILTER_KEY[filter] || 'All' }, nowMs).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2" style={{ alignItems: 'center', marginTop: 12 }}>
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`btn btn-sm ${typeOption === option ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTypeOption(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>
      </Section>

      <Section
        title="Questions"
        icon={TempleScrollIcon}
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({filteredQuestions.length} {dueFilter !== 'All' ? ` · ${dueFilter.toLowerCase()}` : 'total'})</span>}
      >
        {filteredQuestions.length === 0 && (
          <Card>
            <div className="muted">No matching questions found. Try a different search term or filter.</div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              nowMs={nowMs}
              onAnswer={openAnswer}
              onViewDispute={openDispute}
            />
          ))}
        </div>
      </Section>

      {answerQuestion && (
        <AnswerModal
          key={answerQuestion.id}
          question={answerQuestion}
          nowMs={nowMs}
          onClose={closeAnswer}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
          onSaveCorrection={handleSaveCorrection}
          onViewHoroscope={setFullContent}
        />
      )}

      {disputeQuestion && (
        <DisputeDetailsModal
          question={disputeQuestion}
          onClose={closeDispute}
          onResponded={() => setAlert('Response submitted successfully.')}
        />
      )}

      {alert && (
        <SuccessAlert message={alert} onDismiss={() => setAlert(null)} />
      )}

      {fullContent && createPortal(
        <div className="modal-overlay" style={{ zIndex: 70 }} onClick={() => setFullContent(null)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(640px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="astrologer-modal-title">{fullContent.title}</div>
              <button type="button" className="icon-btn" aria-label="Close full content" onClick={() => setFullContent(null)} style={{ width: 32, height: 32, minWidth: 32 }}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="astrologer-modal-highlight astrologer-modal-question" style={{ whiteSpace: 'pre-wrap' }}>{fullContent.content}</div>
            </div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-primary" onClick={() => setFullContent(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}