import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { CalendarClock, History, Search, X } from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import TextBasedQuestionsModuleTabs from '../components/TextBasedQuestionsModuleTabs.jsx'
import AnswerAttachmentPanel from '../components/AnswerAttachmentPanel.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { getMonthKeyFromDate, getMonthLabel } from '../utils/questions.js'
import {
  formatAnswerDate,
  getAnswerSubmittedAtMs,
  getQuestionReceivedAt,
  getQuestionTypeLabel,
  isQuestionNeedingAnswer,
} from '../utils/answer.js'
import { getQuestionRefundAmount } from '../utils/sales.js'
import { TempleReturnIcon } from '../components/TempleIcons.jsx'

const STATUS_FILTERS = ['All', 'Completed', 'Cancelled', 'Refunded', 'Disputed', 'Resolved']

function inr(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

function getHistoryStatus(question = {}) {
  const refunded = getQuestionRefundAmount(question) > 0 || String(question.refundStatus || '').toLowerCase() === 'completed'
  const dispute = question.dispute
  if (dispute && String(dispute.status || '').toLowerCase() !== 'resolved') return { label: 'Disputed', refunded }
  if (dispute && String(dispute.status || '').toLowerCase() === 'resolved') return { label: 'Resolved', refunded }
  if (refunded) return { label: 'Refunded', refunded }
  if (String(question.status || '') === 'Closed') return { label: 'Cancelled', refunded }
  return { label: 'Completed', refunded }
}

function getRefundResolutionLine(question = {}) {
  const refunded = getQuestionRefundAmount(question) > 0 || String(question.refundStatus || '').toLowerCase() === 'completed'
  const parts = []
  if (refunded) parts.push(`Refunded ₹${inr(getQuestionRefundAmount(question))}`)
  if (question.dispute) parts.push(question.dispute.status === 'Resolved' ? 'Dispute resolved' : 'Dispute open')
  return parts.length ? parts.join(' · ') : '—'
}

function DetailRow({ label, value }) {
  return (
    <div>
      <strong>{label}</strong>
      <div className="muted">{value == null || value === '' ? '—' : value}</div>
    </div>
  )
}

function RecordDetailsModal({ question, onClose }) {
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

  if (!question) return null

  const status = getHistoryStatus(question)
  const receivedAt = getQuestionReceivedAt(question)
  const answeredMs = getAnswerSubmittedAtMs(question)
  const answeredLabel = answeredMs ? formatAnswerDate(new Date(answeredMs)) : ''
  const attachments = Array.isArray(question.answerAttachments) ? question.answerAttachments : []
  const links = Array.isArray(question.referenceLinks) ? question.referenceLinks : []
  const userId = question.userId || question.submittedByUserId || ''

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--scroll" style={{ width: 'min(820px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-card__header flex items-center justify-between gap-4">
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div className="astrologer-modal-title">Record Details</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {question.campaignName || 'Open Question'} · {question.id}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
            <StatusBadge label={status.label} />
            <button type="button" className="icon-btn" aria-label="Close record details" onClick={onClose} style={{ width: 32, height: 32, minWidth: 32 }}><X size={16} /></button>
          </div>
        </div>

        <div className="modal-card__content astrologer-modal-content">
          <div className="astrologer-modal-section">
            <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarClock size={14} />Question Overview</div>
            <div className="astrologer-modal-highlight astrologer-modal-details-grid">
              <DetailRow label="Customer Name" value={question.user || question.userName} />
              <DetailRow label="User ID" value={userId} />
              <DetailRow label="Question Type" value={getQuestionTypeLabel(question)} />
              <DetailRow label="Category" value={question.category} />
              <DetailRow label="Received Date" value={receivedAt ? formatAnswerDate(receivedAt) : question.raised} />
              <DetailRow label="Answer Submitted" value={answeredLabel} />
              <DetailRow label="Amount" value={`₹${inr(question.purchaseAmount)}`} />
              <DetailRow label="Refund / Resolution" value={getRefundResolutionLine(question)} />
            </div>
          </div>

          <div className="astrologer-modal-section">
            <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Question</div>
            <div className="astrologer-modal-highlight astrologer-modal-question" style={{ whiteSpace: 'pre-wrap' }}>{question.question || '—'}</div>
          </div>

          {question.answer ? (
            <>
              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Astrologer's Answer</div>
                <div className="astrologer-modal-highlight astrologer-modal-question" style={{ whiteSpace: 'pre-wrap' }}>{question.answer}</div>
              </div>
              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Attachments & Reference Links</div>
                <div className="astrologer-modal-highlight">
                  <AnswerAttachmentPanel attachments={attachments} links={links} readOnly />
                </div>
              </div>
            </>
          ) : null}

          {question.dispute && (
            <div className="astrologer-modal-section">
              <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Dispute Status</div>
              <div className="astrologer-modal-highlight" style={{ display: 'grid', gap: 12 }}>
                <div className="astrologer-modal-details-grid">
                  <DetailRow label="Target" value={question.dispute.target} />
                  <DetailRow label="Status" value={question.dispute.status} />
                  <DetailRow label="Attachment" value={question.dispute.attachment} />
                </div>
                <DetailRow label="Reason" value={question.dispute.reason} />
                {question.dispute.description ? <DetailRow label="Description" value={question.dispute.description} /> : null}
                <DetailRow label="Astrologer Response" value={question.dispute.response || 'No response provided yet'} />
              </div>
            </div>
          )}

          {Array.isArray(question.history) && question.history.length > 0 && (
            <div className="astrologer-modal-section">
              <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Record Timeline</div>
              <div className="astrologer-modal-highlight" style={{ display: 'grid', gap: 8 }}>
                {question.history.map((entry, index) => (
                  <div key={`${entry}-${index}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                    <span style={{ color: 'var(--primary)', flex: 'none', marginTop: 2 }}>•</span>
                    <span className="muted">{entry}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-card__footer astrologer-modal-footer-actions">
          <span style={{ color: 'var(--muted)', fontSize: 13, marginRight: 'auto' }}>Final outcome · {status.label}</span>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function TextBasedQuestionHistory() {
  const { questions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const [searchParams] = useSearchParams()

  const astrologerId = currentUser?.id || 'astrologer-demo'

  const myQuestions = useMemo(
    () => questions.filter((question) => (question.astrologerId || 'astrologer-demo') === astrologerId),
    [questions, astrologerId],
  )

  const historyRecords = useMemo(() => myQuestions.filter((question) => !isQuestionNeedingAnswer(question)), [myQuestions])

  const monthKeys = useMemo(() => {
    const keys = new Set()
    for (const question of historyRecords) {
      const received = getQuestionReceivedAt(question)
      const key = received ? getMonthKeyFromDate(received) : null
      if (key) keys.add(key)
    }
    return [...keys].sort((a, b) => (a < b ? 1 : -1))
  }, [historyRecords])

  const focusId = searchParams.get('questionId') || null

  const initialMonth = useMemo(() => {
    if (focusId) {
      const focused = historyRecords.find((question) => question.id === focusId)
      const received = focused ? getQuestionReceivedAt(focused) : null
      const key = received ? getMonthKeyFromDate(received) : null
      if (key && monthKeys.includes(key)) return key
    }
    return monthKeys[0] || null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, monthKeys, historyRecords])

  const [selectedMonth, setSelectedMonth] = useState(initialMonth)
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [detailsId, setDetailsId] = useState(focusId)
  const [detailsOpen, setDetailsOpen] = useState(Boolean(focusId))

  useEffect(() => {
    if (!focusId) return
    const focused = historyRecords.find((question) => question.id === focusId)
    if (!focused) return
    const received = getQuestionReceivedAt(focused)
    const key = received ? getMonthKeyFromDate(received) : null
    if (key) setSelectedMonth(key)
    setDetailsId(focusId)
    setDetailsOpen(true)
  }, [focusId, historyRecords])

  const monthRecords = useMemo(() => {
    const base = historyRecords.filter((question) => {
      if (!selectedMonth) return false
      const received = getQuestionReceivedAt(question)
      return received ? getMonthKeyFromDate(received) === selectedMonth : false
    })
    const term = String(search).trim().toLowerCase()
    return base.filter((question) => {
      if (statusFilter !== 'All' && getHistoryStatus(question).label !== statusFilter) return false
      if (!term) return true
      const searchable = [question.id, question.user, question.userName, question.userId, question.submittedByUserId, question.category, getQuestionTypeLabel(question), question.campaignName]
        .join(' ')
        .toLowerCase()
      return searchable.includes(term)
    })
  }, [historyRecords, selectedMonth, statusFilter, search])

  const summary = useMemo(() => {
    const counts = { 'Completed': 0, 'Cancelled': 0, 'Refunded': 0, 'Disputed': 0, 'Resolved': 0 }
    const monthRecordsAll = historyRecords.filter((question) => {
      if (!selectedMonth) return false
      const received = getQuestionReceivedAt(question)
      return received ? getMonthKeyFromDate(received) === selectedMonth : false
    })
    for (const question of monthRecordsAll) {
      const label = getHistoryStatus(question).label
      counts[label] = (counts[label] || 0) + 1
    }
    return { total: monthRecordsAll.length, ...counts }
  }, [historyRecords, selectedMonth])

  const selectedRecord = detailsId ? monthRecords.find((question) => question.id === detailsId) || historyRecords.find((question) => question.id === detailsId) || null : null

  return (
    <div>
      <PageHeader eyebrow="Astrologer workspace" title="Text-Based Question History" showBack backTo={routes.dashboard} backIcon={currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined} />

      <TextBasedQuestionsModuleTabs />

      <Card className="section">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="section-title" style={{ marginBottom: 0 }}><History size={18} />Question History</div>
          <label className="field-group" style={{ marginBottom: 0, flex: '1 1 200px', maxWidth: 260 }}>
            <select className="select-input" value={selectedMonth || ''} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Select month">
              {monthKeys.length === 0 ? <option value="">No history</option> : monthKeys.map((key) => <option key={key} value={key}>{getMonthLabel(key)}</option>)}
            </select>
          </label>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          Review completed question records for {selectedMonth ? getMonthLabel(selectedMonth) : 'the selected month'}. Disputes are resolved from the Answer Questions queue.
        </p>

        <div className="stat-grid" style={{ marginTop: 18 }}>
          {STATUS_FILTERS.map((label) => (
            <button key={label} className="stat-card stat-card-clickable" onClick={() => setStatusFilter(label)} style={statusFilter === label ? { background: 'var(--primary-bg)', borderRadius: 'var(--radius-m)' } : {}}>
              <div className={`stat-icon ${label === 'Disputed' || label === 'Cancelled' ? 'tone-red' : label === 'Resolved' || label === 'Completed' ? 'tone-green' : 'tone-violet'}`}><History size={20} /></div>
              <div className="stat-card-body"><div className="stat-value">{label === 'All' ? summary.total : summary[label]}</div><div className="stat-label">{label}</div></div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="section">
        <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Records in {selectedMonth ? getMonthLabel(selectedMonth) : 'Month'}</div>
          <label className="field-group" style={{ marginBottom: 0, position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input className="text-input" style={{ paddingLeft: 34 }} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" aria-label="Search records" />
          </label>
        </div>

        {monthRecords.length === 0 ? (
          <div className="muted" style={{ padding: '16px 0' }}>No question records found for this month.</div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {monthRecords.map((question) => {
              const status = getHistoryStatus(question)
              const receivedAt = getQuestionReceivedAt(question)
              const answeredMs = getAnswerSubmittedAtMs(question)
              const answeredLabel = answeredMs ? formatAnswerDate(new Date(answeredMs)) : ''
              const userId = question.userId || question.submittedByUserId || ''
              return (
                <button type="button" key={question.id} className="card flex h-full flex-col text-left transition hover:-translate-y-1 hover:border-[color:var(--secondary)]" onClick={() => { setDetailsId(question.id); setDetailsOpen(true) }}>
                  <div className="flex items-start justify-between gap-3"><div className="font-bold text-[color:var(--text-primary)]">{question.id}</div><StatusBadge label={status.label} /></div>
                  <div className="muted mt-3 flex flex-1 flex-col gap-2 text-sm">
                    <span>{question.user || question.userName} · User ID {userId}</span>
                    <span>{getQuestionTypeLabel(question)} · {question.campaignName || 'Open Question'} · {question.category}</span>
                    <span>Received: {receivedAt ? formatAnswerDate(receivedAt) : question.raised}</span>
                    <span>Answer submitted: {answeredLabel || 'Not answered'}</span>
                    <span>Amount: ₹{inr(question.purchaseAmount)} · {getRefundResolutionLine(question)}</span>
                  </div>
                  <div className="mt-4 font-semibold text-[color:var(--primary)]">View Record →</div>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      {detailsOpen && selectedRecord && (
        <RecordDetailsModal
          question={selectedRecord}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </div>
  )
}