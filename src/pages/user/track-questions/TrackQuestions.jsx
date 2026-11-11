import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, Clock, AlertTriangle, ChevronDown, Star } from 'lucide-react'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { ChipGroup } from '../../../components/OptionGroup.jsx'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import Card from '../../../components/ui/Card.jsx'
import Section from '../../../components/ui/Section.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'

const STATUS_FILTERS = ['All', 'Pending', 'Dispute', 'Answered']
const EDIT_TIME_LIMIT_MS = 30 * 60 * 1000
const DELETE_TIME_LIMIT_MS = 60 * 60 * 1000

function normalizeStatusFilter(value) {
  if (STATUS_FILTERS.includes(value)) return value
  if (value === 'Paid') return 'All'
  if (value === 'Submitted') return 'Answered'
  return 'All'
}

function getWordPreview(content) {
  const text = String(content || '').trim()
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length <= 4) return { preview: text, isTruncated: false }

  return {
    preview: words.slice(0, 4).join(' '),
    isTruncated: true,
  }
}

function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Expired'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function ContentPreview({ content, title, onViewFull, quoted = false, className = 'muted' }) {
  const { preview, isTruncated } = getWordPreview(content)

  return (
    <div className={className}>
      {quoted ? `\u201C${preview}\u201D` : preview}
      {isTruncated && <button type="button" className="link-btn ml-1" aria-label={`See full ${title.toLowerCase()}`} onClick={() => onViewFull({ title, content })}>See more…</button>}
    </div>
  )
}

function TimeLimitBadge({ label, timeRemaining, tooltip, isEnabled }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
          isEnabled
            ? 'bg-[color:var(--primary-bg)] text-[color:var(--primary)]'
            : 'bg-[color:var(--surface-soft)] text-[color:var(--text-muted)]'
        }`}
      >
        <Clock size={12} />
        {label}: {formatTimeRemaining(timeRemaining)}
      </span>
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[color:var(--ink)] px-3 py-2 text-xs text-white shadow-lg"
          style={{ pointerEvents: 'none' }}
        >
          {tooltip}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[color:var(--ink)]" />
        </div>
      )}
    </div>
  )
}

function InteractiveStarRating({ question, onRate }) {
  const [hoverValue, setHoverValue] = useState(0)
  const [justSaved, setJustSaved] = useState(false)
  const currentRating = question.answerRating || question.rating || 0
  const activeRating = hoverValue || currentRating

  const handleSelect = (val, event) => {
    event?.stopPropagation?.()
    if (onRate) onRate(val)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2400)
  }

  return (
    <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center space-x-0.5" role="radiogroup" aria-label="Rate astrologer answer">
        {[1, 2, 3, 4, 5].map((val) => {
          const isFilled = val <= activeRating
          return (
            <button
              key={val}
              type="button"
              role="radio"
              aria-checked={currentRating === val}
              aria-label={`Rate ${val} star${val === 1 ? '' : 's'}`}
              className="p-1 rounded hover:scale-125 focus:outline-none cursor-pointer border-0 bg-transparent transition-transform"
              onMouseEnter={() => setHoverValue(val)}
              onMouseLeave={() => setHoverValue(0)}
              onClick={(e) => handleSelect(val, e)}
            >
              <Star
                size={16}
                className={`transition-colors duration-150 ${
                  isFilled
                    ? 'fill-amber-400 text-amber-500'
                    : 'fill-transparent text-slate-300 dark:text-slate-600 hover:text-amber-400'
                }`}
              />
            </button>
          )
        })}
      </div>
      <span className="text-xs font-semibold ml-1">
        {justSaved ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold transition-all">
            ✓ Rated {currentRating}/5
          </span>
        ) : currentRating > 0 ? (
          <span className="text-slate-600 dark:text-slate-300">
            (Rated {currentRating}/5)
          </span>
        ) : (
          <span className="text-purple-600 dark:text-purple-400 font-medium">
            (Click stars to rate)
          </span>
        )}
      </span>
    </div>
  )
}

export default function TrackQuestions({ embedded = false }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { questions, questionPreviewId, setQuestionPreviewId, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => normalizeStatusFilter(searchParams.get('status') || 'All'))
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [expandedQuestionIds, setExpandedQuestionIds] = useState(() => new Set())

  const matchesStatusFilter = useCallback((question) => {
    if (statusFilter === 'All') return true
    if (statusFilter === 'Pending') return question.status === 'Pending'
    if (statusFilter === 'Dispute') return question.status === 'Disputed'
    if (statusFilter === 'Answered') return question.status === 'Answered'
    return false
  }, [statusFilter])
  const matchesSearchFilter = useCallback((question) => {
    const term = appliedSearch.trim().toLowerCase()
    if (!term) return true
    if (term.includes('paid')) return question.purchaseType === 'Paid'
    if (term.includes('individual') || term.includes('personal')) return question.type === 'Personal'
    if (term.includes('general')) return question.type === 'General'
    return false
  }, [appliedSearch])
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [ratingSaved, setRatingSaved] = useState(false)
  const [fullContent, setFullContent] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const ownedQuestions = useMemo(() => {
    const scope = questions.filter((question) => {
      const isOwnQuestion =
        currentUser?.role !== 'user' ||
        (!currentUser?.id && !currentUser?.email) ||
        (currentUser?.id && question.submittedByUserId === currentUser.id) ||
        !question.submittedByEmail ||
        question.submittedByEmail === currentUser.email
      return isOwnQuestion
    })

    const source = currentUser?.role === 'user' && scope.length === 0 ? questions : scope

    const base = source.filter((question) => {
      return matchesSearchFilter(question) && matchesStatusFilter(question)
    })

    return base.sort((a, b) => new Date(b.raisedAt || b.raised) - new Date(a.raisedAt || a.raised))
  }, [currentUser?.email, currentUser?.id, currentUser?.role, questions, matchesSearchFilter, matchesStatusFilter])

  const visibleQuestions = ownedQuestions

  const selectedQuestion = detailsOpen
    ? visibleQuestions.find((question) => question.id === questionPreviewId) || null
    : null

  const selectedDisputeStatus = selectedQuestion?.dispute?.status || null
  const showRaiseDispute = selectedQuestion?.status === 'Answered' && !selectedQuestion?.dispute
  const showViewDispute = selectedDisputeStatus === 'Resolved'
  const ratingMode =
    selectedQuestion?.dispute?.status === 'Resolved'
      ? 'dispute'
      : selectedQuestion?.status === 'Answered'
        ? 'answer'
        : null

  const getQuestionTimeLimits = useCallback((question) => {
    if (!question.submittedAt) return { editTimeRemaining: 0, deleteTimeRemaining: 0, isEditEnabled: false, isDeleteEnabled: false }
    const submittedAt = new Date(question.submittedAt).getTime()
    const editTimeRemaining = Math.max(0, EDIT_TIME_LIMIT_MS - (Date.now() - submittedAt))
    const deleteTimeRemaining = Math.max(0, DELETE_TIME_LIMIT_MS - (Date.now() - submittedAt))
    return {
      editTimeRemaining,
      deleteTimeRemaining,
      isEditEnabled: editTimeRemaining > 0,
      isDeleteEnabled: deleteTimeRemaining > 0,
    }
  }, [])

  useEffect(() => {
    if (!visibleQuestions.some((q) => q.status === 'Pending' && q.submittedAt)) return
    const interval = setInterval(() => {
      setTimeElapsed(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [visibleQuestions])

  useEffect(() => {
    if (!selectedQuestion) {
      setRating(0)
      setReview('')
      setRatingSaved(false)
      return
    }

    if (selectedQuestion.dispute?.status === 'Resolved') {
      setRating(selectedQuestion.dispute.rating || selectedQuestion.disputeRating || 0)
      setReview('')
      setRatingSaved(Boolean(selectedQuestion.dispute.rating || selectedQuestion.disputeRating))
      return
    }

    if (selectedQuestion.status === 'Answered') {
      setRating(selectedQuestion.answerRating || 0)
      setReview(selectedQuestion.answerReview || '')
      setRatingSaved(Boolean(selectedQuestion.answerRating))
      return
    }

    setRating(0)
    setReview('')
    setRatingSaved(false)
  }, [selectedQuestion, selectedQuestion?.answerRating, selectedQuestion?.answerReview, selectedQuestion?.dispute?.rating, selectedQuestion?.dispute?.status, selectedQuestion?.disputeRating, selectedQuestion?.id, selectedQuestion?.status])

  const openQuestion = (questionId) => {
    setQuestionPreviewId(questionId)
    setFullContent(null)
    setDetailsOpen(true)
  }

  const closeQuestion = useCallback(() => {
    setDetailsOpen(false)
    setQuestionPreviewId(null)
    setFullContent(null)
  }, [setQuestionPreviewId])

  const confirmDelete = (questionId) => {
    actions.revokeQuestion(questionId)
    setDeleteConfirmId(null)
  }

  useEffect(() => {
    if (!detailsOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (fullContent) {
        setFullContent(null)
        return
      }
      closeQuestion()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [closeQuestion, detailsOpen, fullContent, selectedQuestion])

  return (
    <div>
      {!embedded && (
        <PageHeader eyebrow="User portal" title="Track My Questions" showBack backTo={routes.askQuestion} />
      )}

      <Section>
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group">
              <div className="search-filter-row__heading">Search</div>
              <div className="search-bar-wrapper">
                <div className="search-bar-container">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setAppliedSearch(search)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="search-btn"
                    aria-label="Search"
                    onClick={() => setAppliedSearch(search)}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.34-4.34"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="search-filter-row__group search-filter-row__status">
              <div className="search-filter-row__heading">Status</div>
              <ChipGroup options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
            </div>
          </div>
        </Card>
      </Section>

      <div className="section">
        <Card style={{ marginTop: 0 }}>
          <div className="section-title">My Questions</div>
          {visibleQuestions.length === 0 && (
            <div className="mb-4 rounded-[14px] border border-[color:var(--border)] bg-white/90 px-4 py-3 text-sm text-[color:var(--muted)]">
              No matching questions found. Clear filters or submit a question from the Ask Question page.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {visibleQuestions.map((question) => {
              const isExpanded = expandedQuestionIds.has(question.id)
              const toggleExpand = (event) => {
                event?.stopPropagation()
                setExpandedQuestionIds((prev) => {
                  const next = new Set(prev)
                  if (next.has(question.id)) next.delete(question.id)
                  else next.add(question.id)
                  return next
                })
              }

              const isAnswered = question.status === 'Answered'
              const isPending = question.status === 'Pending'
              const isDisputed = question.status === 'Disputed'
              const { editTimeRemaining, deleteTimeRemaining, isEditEnabled, isDeleteEnabled } = getQuestionTimeLimits(question)

              const borderAccent = isDisputed
                ? 'border-l-rose-500'
                : isAnswered
                  ? 'border-l-emerald-500'
                  : 'border-l-indigo-500'

              return (
                <div key={question.id} className={`glass-card rounded-2xl p-5 md:p-6 border border-slate-200 dark:border-slate-800 border-l-4 ${borderAccent} transition hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md mb-3`}>
                  <div className="flex justify-between items-start gap-4 cursor-pointer" onClick={toggleExpand}>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">{question.id}</span>
                        {isAnswered ? (
                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[11px] px-3 py-0.5 rounded-full font-bold">
                            🟢 Answered
                          </span>
                        ) : isPending ? (
                          <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 text-[11px] px-3 py-0.5 rounded-full font-bold">
                            🔵 Waiting for Answer
                          </span>
                        ) : isDisputed ? (
                          <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[11px] px-3 py-0.5 rounded-full font-bold">
                            🔴 Disputed
                          </span>
                        ) : (
                          <StatusBadge label={question.status} />
                        )}
                        <span className="bg-purple-50 text-purple-600 text-[11px] px-3 py-0.5 rounded-full font-bold">
                          {question.type}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          Paid: {question.purchaseAmount ? `₹${question.purchaseAmount}` : (question.purchaseType || 'Free')}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 line-clamp-2">
                        {question.question}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {question.astrologerName || 'Dr. Rani'} • {question.campaignName || question.category || 'Health Campaign'} • {question.raised || '05 Nov 2026'}
                        {isPending && ' (Day 3 of 30 Guarantee)'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={toggleExpand}
                      aria-label={isExpanded ? 'Collapse answer' : 'Expand answer'}
                      className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 dark:hover:text-purple-400 transition flex-shrink-0 cursor-pointer border-0"
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Dropdown Content */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      {isAnswered && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                            <strong className="text-purple-600 dark:text-purple-400">Astrologer's Detailed Answer:</strong>{' '}
                            {question.answer || 'Your Saturn transit is currently shifting. Rest assured, by next Tuesday, your vitality will recover significantly. Perform Surya Namaskar daily.'}
                          </p>

                          {/* Audio Player Widget */}
                          <div className="flex items-center space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <button
                              type="button"
                              className="w-8 h-8 rounded-full emerald-gradient text-white flex items-center justify-center text-xs shadow cursor-pointer border-0"
                            >
                              ▶
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="w-1/2 h-full bg-emerald-500"></div>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                <span>Voice Report (0:35)</span>
                                <span>1:10</span>
                              </div>
                            </div>
                          </div>

                          {/* Attachments */}
                          <div className="flex items-center space-x-3 pt-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Attachments:</span>
                            <span className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 font-semibold flex items-center space-x-1">
                              📄 <span>{question.horoscopeAttachment || question.attachmentNames?.[0] || 'Horoscope_Chart.pdf'}</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {isPending && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                          Question under review by astrologer. Guaranteed reply within 30 days or wallet refund.
                          {(isEditEnabled || isDeleteEnabled) && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {isEditEnabled && (
                                <TimeLimitBadge
                                  label="Edit"
                                  timeRemaining={editTimeRemaining}
                                  tooltip="You can edit this question within 30 minutes."
                                  isEnabled={isEditEnabled}
                                />
                              )}
                              {isDeleteEnabled && (
                                <TimeLimitBadge
                                  label="Delete"
                                  timeRemaining={deleteTimeRemaining}
                                  tooltip="You can delete this question within 1 hour."
                                  isEnabled={isDeleteEnabled}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
                        {isAnswered ? (
                          <InteractiveStarRating
                            question={question}
                            onRate={(val) => actions.rateQuestionAnswer(question.id, val, '')}
                          />
                        ) : (
                          <div className="text-xs text-slate-400">
                            {isPending ? 'Answer pending from astrologer' : `Status: ${question.status}`}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {isAnswered && !question.dispute && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                navigate(`${routes.raiseDispute}?questionId=${question.id}`)
                              }}
                              className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              🚩 Raise a Dispute
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              openQuestion(question.id)
                            }}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer border-0"
                          >
                            Full Details
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {detailsOpen && selectedQuestion && createPortal(
        <div className="modal-overlay user-modal-overlay" onClick={closeQuestion}>
          <div
            className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll"
            style={{ width: 'min(820px, calc(100vw - 32px))' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div style={{ minWidth: 0 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>Question Details</div>
                <div
                  className="muted"
                  style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {selectedQuestion.campaignName || 'User question'} · {selectedQuestion.id}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <StatusBadge label={selectedQuestion.status} />
                <button type="button" className="icon-btn" aria-label="Close question details" onClick={closeQuestion}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="modal-card__content user-modal-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Question Details</div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                    gap: 14,
                    background: 'var(--violet-50)',
                    borderRadius: 'var(--radius-s)',
                    padding: 14,
                    fontSize: 14,
                  }}
                >
                  <div><strong>ID</strong><div className="muted">{selectedQuestion.id}</div></div>
                  <div><strong>User</strong><div className="muted">{selectedQuestion.user}</div></div>
                  <div><strong>Campaign</strong><div className="muted">{selectedQuestion.campaignName || 'No campaign'}</div></div>
                  <div><strong>Category</strong><div className="muted">{selectedQuestion.category}</div></div>
                  <div><strong>Type</strong><div className="muted">{selectedQuestion.type}</div></div>
                  <div><strong>Status</strong><div className="muted">{selectedQuestion.status}</div></div>
                </div>
              </div>

              <div>
                <div className="field-label-top" style={{ marginBottom: 8 }}>Your Question</div>
                <div style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14 }}>
                  <ContentPreview content={selectedQuestion.question} title="Your Question" quoted className="text-[color:var(--ink)]" onViewFull={setFullContent} />
                </div>
              </div>

              {selectedQuestion.status === 'Answered' && (
                <div>
                  <div className="field-label-top" style={{ marginBottom: 8 }}>Astrologer's Answer</div>
                  <div style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14 }}>
                    <ContentPreview content={selectedQuestion.answer || 'No answer yet.'} title="Astrologer's Answer" quoted className="text-[color:var(--ink)]" onViewFull={setFullContent} />
                  </div>
                </div>
              )}

              {selectedQuestion.status === 'Pending' && selectedQuestion.submittedAt && (
                <div>
                  <div className="field-label-top" style={{ marginBottom: 8 }}>Time Limits</div>
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const { editTimeRemaining, deleteTimeRemaining, isEditEnabled, isDeleteEnabled } = getQuestionTimeLimits(selectedQuestion)
                      return (
                        <>
                          <TimeLimitBadge
                            label="Edit"
                            timeRemaining={editTimeRemaining}
                            tooltip="You can edit this question within 30 minutes."
                            isEnabled={isEditEnabled}
                          />
                          <TimeLimitBadge
                            label="Delete"
                            timeRemaining={deleteTimeRemaining}
                            tooltip="You can delete this question within 1 hour."
                            isEnabled={isDeleteEnabled}
                          />
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}

              {selectedQuestion.dispute && (
                <Card style={{ padding: 14, display: 'grid', gap: 10 }}>
                  <div className="section-title" style={{ marginBottom: 2 }}>Dispute</div>
                  <div><strong>Target</strong><div className="muted">{selectedQuestion.dispute.target}</div></div>
                  <div><strong>Reason</strong><ContentPreview content={selectedQuestion.dispute.reason} title="Dispute Reason" onViewFull={setFullContent} /></div>
                  {selectedQuestion.dispute.description ? <div><strong>Description</strong><ContentPreview content={selectedQuestion.dispute.description} title="Dispute Description" onViewFull={setFullContent} /></div> : null}
                  <div><strong>Attachment</strong><div className="muted">{selectedQuestion.dispute.attachment || 'Attachment.pdf'}</div></div>
                  <div><strong>Dispute Status</strong><StatusBadge label={selectedQuestion.dispute.status || 'Open'} /></div>
                  <div><strong>Astrologer Response</strong><ContentPreview content={selectedQuestion.dispute.response || 'Waiting for astrologer update.'} title="Astrologer Response" onViewFull={setFullContent} /></div>
                </Card>
              )}

              {ratingMode && (
                <Card style={{ padding: 14, display: 'grid', gap: 12 }}>
                  <div className="section-title" style={{ marginBottom: 0 }}>
                    {ratingMode === 'dispute' ? 'Rate Dispute Resolution' : 'Rate & Review the Astrologer'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`btn ${rating >= value ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setRating(value)}
                        aria-label={`${value} star${value === 1 ? '' : 's'}`}
                      >
                        ★ {value}
                      </button>
                    ))}
                  </div>
                  <div className="muted">
                    {rating ? `Selected rating: ${rating} star${rating === 1 ? '' : 's'}` : 'Select a star rating and save it.'}
                  </div>
                  {ratingMode === 'answer' && (
                    <div className="field-group" style={{ marginBottom: 0 }}>
                      <label className="field-label-top">Your Feedback (Optional)</label>
                      <textarea
                        className="textarea-box"
                        style={{ minHeight: 80 }}
                        placeholder="Share your experience with the astrologer's answer..."
                        maxLength={500}
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="btn-row">
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        if (!rating) return
                        if (ratingMode === 'dispute') {
                          actions.rateDisputeResolution(selectedQuestion.id, rating)
                        } else {
                          actions.rateQuestionAnswer(selectedQuestion.id, rating, review)
                        }
                        setRatingSaved(true)
                      }}
                    >
                      Save Rating
                    </button>
                  </div>
                  {ratingSaved && (
                    <div className="badge badge-green" style={{ width: 'fit-content' }}>
                      {ratingMode === 'answer' ? 'Rating & feedback saved successfully' : 'Rating saved successfully'}
                    </div>
                  )}
                </Card>
              )}
            </div>
            <div className="modal-card__footer user-modal-card__footer">
              {selectedQuestion.status === 'Pending' && selectedQuestion.submittedAt && (() => {
                const { isEditEnabled, isDeleteEnabled } = getQuestionTimeLimits(selectedQuestion)
                return (
                  <>
                    {isEditEnabled && (
                      <button className="btn btn-outline" onClick={() => { closeQuestion(); navigate(`${routes.askQuestion}?editQuestionId=${selectedQuestion.id}`) }}>
                        Edit
                      </button>
                    )}
                    {isDeleteEnabled && (
                      <button className="btn btn-danger" onClick={() => setDeleteConfirmId(selectedQuestion.id)}>
                        Delete
                      </button>
                    )}
                  </>
                )
              })()}
              {showRaiseDispute && (
                <button className="btn btn-primary" onClick={() => navigate(`${routes.raiseDispute}?questionId=${selectedQuestion.id}`)}>
                  Raise Dispute
                </button>
              )}
              {showViewDispute && (
                <button className="btn btn-primary" onClick={() => openQuestion(selectedQuestion.id)}>
                  View
                </button>
              )}
              <button className="btn btn-ghost" onClick={closeQuestion}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {deleteConfirmId && createPortal(
        <div className="modal-overlay user-modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div
            className="modal-card user-modal-card"
            style={{ width: 'min(400px, calc(100vw - 32px))' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="user-modal-card__header flex items-center justify-between gap-4">
              <div id="delete-confirm-title" className="section-title" style={{ marginBottom: 0 }}>Delete Question?</div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setDeleteConfirmId(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="user-modal-card__content">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-[color:var(--red-500)] mt-0.5" />
                <div>
                  <div>Are you sure you want to delete this question?</div>
                  <div className="muted text-sm" style={{ marginTop: 8 }}>This action cannot be undone.</div>
                </div>
              </div>
            </div>
            <div className="user-modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={() => confirmDelete(deleteConfirmId)}>Delete Question</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {fullContent && createPortal(
        <div className="modal-overlay user-modal-overlay" style={{ zIndex: 10000 }} onClick={() => setFullContent(null)}>
          <div className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll" style={{ width: 'min(640px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>{fullContent.title}</div>
              <button type="button" className="icon-btn" aria-label="Close full content" onClick={() => setFullContent(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content user-modal-card__content">
              <div style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14, whiteSpace: 'pre-wrap' }}>{fullContent.content}</div>
            </div>
            <div className="modal-card__footer user-modal-card__footer">
              <button type="button" className="btn btn-primary" onClick={() => setFullContent(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
