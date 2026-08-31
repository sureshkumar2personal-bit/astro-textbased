import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import Card from '../../../components/ui/Card.jsx'
import Section from '../../../components/ui/Section.jsx'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import SuccessAlert from '../../../components/ui/SuccessAlert.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'


import {
  TempleArchIcon,
  TempleLampIcon,
  TempleLotusIcon,
  TempleReturnIcon,
  TempleScrollIcon,
} from '../../../components/TempleIcons.jsx'

const PAGE_SIZE = 6

function getWordPreview(content) {
  const text = String(content || '').trim()
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length <= 4) return { preview: text, isTruncated: false }

  return {
    preview: words.slice(0, 4).join(' '),
    isTruncated: true,
  }
}

export default function AnswerQuestion() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { questions, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const questionIdParam = searchParams.get('questionId')
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [panelQuestionId, setPanelQuestionId] = useState(questionIdParam || null)
  const [answer, setAnswer] = useState('')
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [editingSubmittedAnswer, setEditingSubmittedAnswer] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [fullContent, setFullContent] = useState(null)

  const filteredQuestions = useMemo(() => {
    const term = appliedSearch.trim().toLowerCase()
    return questions
      .filter((question) => {
        const searchable = [question.id, question.user, question.category, question.type, question.question, question.status]
          .join(' ')
          .toLowerCase()
        return !term || searchable.includes(term)
      })
      .sort((a, b) => new Date(b.raisedAt || b.raised) - new Date(a.raisedAt || a.raised))
  }, [questions, appliedSearch])

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedQuestions = filteredQuestions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [appliedSearch])

  const panelQuestion = useMemo(
    () => questions.find((question) => question.id === panelQuestionId) || null,
    [questions, panelQuestionId],
  )

  useEffect(() => {
    setAnswer(panelQuestion?.draftAnswer || panelQuestion?.answer || '')
    setEditingSubmittedAnswer(false)
  }, [panelQuestion?.id, panelQuestion?.draftAnswer, panelQuestion?.answer])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  const openQuestion = (id) => {
    setPanelQuestionId(id)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('questionId', id)
      return next
    })
  }

  const closePanel = () => {
    setPanelQuestionId(null)
    setFullContent(null)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('questionId')
      return next
    })
  }

  const isAnswered = panelQuestion?.status === 'Answered'
  const isUnderReview = panelQuestion?.status === 'Under Review'
  const reviewActive = isUnderReview && panelQuestion?.answerReviewUntil > now
  const canEditSubmittedAnswer = reviewActive && !panelQuestion?.answerEditUsed

  const handleSaveCorrection = () => {
    if (!panelQuestion || !answer.trim()) return
    const saved = actions.editSubmittedQuestionAnswer(panelQuestion.id, answer)
    if (saved) setEditingSubmittedAnswer(false)
  }

  const handleSubmitAnswer = () => {
    if (!panelQuestion) return
    actions.submitQuestionAnswer(panelQuestion.id, answer)
    closePanel()
    setJustSubmitted(true)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Astrologer"
        title="Answer Question"
        showBack
        backTo={routes.textBasedQuestions}
        backIcon={backIcon}
      />

      <Section>
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group">
              <div className="search-bar">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by user name, question ID, category, status, or keyword"
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
          </div>
        </Card>
      </Section>

      <Section title="Questions" icon={TempleScrollIcon} titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({filteredQuestions.length})</span>}>
        {pagedQuestions.length === 0 && (
          <Card>
            <div className="muted">No matching questions found. Try a different search term.</div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pagedQuestions.map((question) => (
            <Card
              key={question.id}
              hover
              style={{ cursor: 'pointer', padding: 16 }}
              onClick={() => openQuestion(question.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{question.user}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{question.id}</span>
                  </div>
                  <div style={{ color: 'var(--ink)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
                    "{question.question}"
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-violet">{question.type}</span>
                    <span className="muted" style={{ fontSize: 12 }}>Submitted: {question.raised}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 18 }}>
            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <span className="muted" style={{ fontSize: 13 }}>Page {currentPage} of {totalPages}</span>
            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        )}
      </Section>

      {panelQuestion && createPortal(
        <div className="modal-overlay" onClick={closePanel}>
          <div
            className="modal-card modal-card--scroll"
            style={{ width: 'min(640px, calc(100vw - 32px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div className="astrologer-modal-title">Answer Question</div>
                <div
                  className="muted"
                  style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {panelQuestion.campaignName} · {panelQuestion.id}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Close"
                  onClick={closePanel}
                  style={{ width: 32, height: 32, minWidth: 32 }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="modal-card__content astrologer-modal-content">
              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TempleArchIcon size={14} />User Details
                </div>
                <div
                  className="astrologer-modal-highlight astrologer-modal-details-grid"
                >
                  <div><strong>Name</strong><div className="muted">{panelQuestion.user}</div></div>
                  <div><strong>Question Type</strong><div className="muted">{panelQuestion.type}</div></div>
                  <div><strong>Category</strong><div className="muted">{panelQuestion.category}</div></div>
                  <div><strong>Question For</strong><div className="muted">{panelQuestion.questionFor}</div></div>
                  <div><strong>Language</strong><div className="muted">{panelQuestion.language}</div></div>
                </div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TempleScrollIcon size={14} />User Question
                </div>
                <div
                  className="astrologer-modal-highlight astrologer-modal-question"
                >
                  {(() => {
                    const { preview, isTruncated } = getWordPreview(panelQuestion.question)
                    return <>
                      “{preview}”
                      {isTruncated && <button type="button" className="link-btn ml-1" aria-label="See full user question" onClick={() => setFullContent({ title: 'User Question', content: panelQuestion.question })}>See more…</button>}
                    </>
                  })()}
                </div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TempleLotusIcon size={14} />Horoscope Details
                </div>
                <div className="option-list" style={{ gap: 10 }}>
                  <div className="option-pill selected">
                    <span className="option-mark">✓</span>
                    {panelQuestion.horoscopeMode}
                  </div>
                  {panelQuestion.attachments.map((file) => (
                    <button key={file} className="option-pill" type="button" onClick={() => window.alert(`Opening ${file}`)}>
                      <span className="option-mark"><TempleScrollIcon size={14} /></span>
                      {file}
                    </button>
                  ))}
                </div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TempleLampIcon size={14} />Answer
                </div>
                <textarea
                  className="textarea-box"
                  style={{ width: '100%' }}
                  placeholder="Type your answer here..."
                  maxLength={3000}
                  value={answer}
                  readOnly={isAnswered || (isUnderReview && !editingSubmittedAnswer)}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>Characters: {answer.length} / 3000</div>
                {isUnderReview && (
                  <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                    {reviewActive
                      ? canEditSubmittedAnswer
                        ? 'Answer is held for review. You can enable one correction before it is delivered.'
                        : 'Correction saved. The answer is locked until automatic delivery.'
                      : 'Review window ended. The answer will be delivered automatically.'}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-card__footer astrologer-modal-footer-actions">
              {isAnswered && (
                <span style={{ color: 'var(--green-600)', fontSize: 13, fontWeight: 600, marginRight: 'auto' }}>
                  Submitted Successfully
                </span>
              )}
              <button className="btn btn-ghost" onClick={closePanel}>Cancel</button>
              {isUnderReview && canEditSubmittedAnswer && !editingSubmittedAnswer && (
                <button className="btn btn-outline" onClick={() => setEditingSubmittedAnswer(true)}>Enable One-Time Edit</button>
              )}
              {isUnderReview && editingSubmittedAnswer && (
                <button className="btn btn-primary" disabled={!answer.trim()} onClick={handleSaveCorrection}>Save Correction</button>
              )}
              {!isAnswered && !isUnderReview && (
                <button
                  className="btn btn-primary"
                  disabled={!answer.trim()}
                  onClick={handleSubmitAnswer}
                >
                  Submit Answer
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {justSubmitted && (
        <SuccessAlert message="Answer submitted successfully." onDismiss={() => setJustSubmitted(false)} />
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
