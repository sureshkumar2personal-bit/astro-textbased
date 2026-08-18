import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import { ChipGroup } from '../components/OptionGroup.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import {
  TempleArchIcon,
  TempleBellIcon,
  TempleDonationBoxIcon,
  TempleLampIcon,
  TempleLotusIcon,
  TempleReturnIcon,
  TempleScrollIcon,
} from '../components/TempleIcons.jsx'

const STATUSES = ['All', 'Pending', 'Answered', 'Disputed']
const ACTIVE_STATUSES = ['Pending', 'Queued', 'In Progress', 'Under Review']

function getWordPreview(content) {
  const text = String(content || '').trim()
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length <= 4) return { preview: text, isTruncated: false }

  return {
    preview: words.slice(0, 4).join(' '),
    isTruncated: true,
  }
}

export default function TextBasedQuestions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { questions, liveStreamOpen, setLiveStreamOpen, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [panelQuestionId, setPanelQuestionId] = useState(searchParams.get('questionId'))
  const [answer, setAnswer] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [editingSubmittedAnswer, setEditingSubmittedAnswer] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [fullContent, setFullContent] = useState(null)

  const filteredQuestions = useMemo(() => {
    const term = appliedSearch.trim().toLowerCase()
    return questions
      .filter((question) => {
        const searchable = [
          question.id,
          question.user,
          question.campaignName,
          question.category,
          question.type,
          question.question,
          question.status,
        ].join(' ').toLowerCase()
        return (!term || searchable.includes(term))
          && (statusFilter === 'All'
            || (statusFilter === 'Pending' && ACTIVE_STATUSES.includes(question.status))
            || question.status === statusFilter)
      })
      .sort((a, b) => new Date(b.raisedAt || b.raised) - new Date(a.raisedAt || a.raised))
  }, [questions, appliedSearch, statusFilter])

  const panelQuestion = useMemo(
    () => questions.find((question) => question.id === panelQuestionId) || null,
    [questions, panelQuestionId],
  )
  const panelAnswer = panelQuestion?.draftAnswer || panelQuestion?.answer || ''

  const totalCount = questions.length
  const pendingCount = questions.filter((question) => ACTIVE_STATUSES.includes(question.status)).length
  const inProgressCount = questions.filter((question) => question.status === 'In Progress').length
  const answeredCount = questions.filter((question) => question.status === 'Answered').length
  const disputedCount = questions.filter((question) => question.status === 'Disputed').length

  useEffect(() => {
    const questionId = searchParams.get('questionId')
    if (questionId && questions.some((question) => question.id === questionId)) {
      setPanelQuestionId(questionId)
    }
  }, [questions, searchParams])

  useEffect(() => {
    setAnswer(panelAnswer)
    setEditingSubmittedAnswer(false)
  }, [panelQuestion?.id, panelAnswer])

  useEffect(() => {
    setDraftSaved(false)
  }, [panelQuestion?.id])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  const openQuestion = (id) => {
    setPanelQuestionId(id)
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('questionId', id)
      return next
    })
  }

  const closePanel = () => {
    setPanelQuestionId(null)
    setFullContent(null)
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.delete('questionId')
      return next
    })
  }

  const saveDraft = () => {
    if (!panelQuestion || panelQuestion.status === 'Under Review' || !answer.trim()) return
    actions.saveQuestionDraft(panelQuestion.id, answer)
    setDraftSaved(true)
  }

  const submitAnswer = () => {
    if (!panelQuestion || !answer.trim()) return
    actions.submitQuestionAnswer(panelQuestion.id, answer)
    closePanel()
    setJustSubmitted(true)
  }

  const isUnderReview = panelQuestion?.status === 'Under Review'
  const reviewActive = isUnderReview && panelQuestion?.answerReviewUntil > now
  const canEditSubmittedAnswer = reviewActive && !panelQuestion?.answerEditUsed
  const answerIsReadOnly = panelQuestion?.status === 'Answered' || (isUnderReview && !editingSubmittedAnswer)
  const saveCorrection = () => {
    if (!panelQuestion || !answer.trim()) return
    const saved = actions.editSubmittedQuestionAnswer(panelQuestion.id, answer)
    if (saved) setEditingSubmittedAnswer(false)
  }

  const statCards = [
    { label: 'Total Questions', value: totalCount, icon: TempleScrollIcon, tone: 'tone-violet' },
    { label: 'Pending Queue', value: pendingCount, icon: TempleDonationBoxIcon, tone: 'tone-gold' },
    { label: 'In Progress', value: inProgressCount, icon: TempleLampIcon, tone: 'tone-sky' },
    { label: 'Answered', value: answeredCount, icon: TempleLotusIcon, tone: 'tone-green' },
    { label: 'Disputed', value: disputedCount, icon: TempleArchIcon, tone: 'tone-red' },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Astrologer"
        title="Text Based Questions"
        showBack
        backTo={routes.dashboard}
        backIcon={backIcon}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} style={{ padding: 16 }}>
            <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}>
              <div className={`stat-icon ${tone}`}><Icon size={18} /></div>
              <div>
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Section title="Search & Filter">
        <Card>
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') setAppliedSearch(search)
                }}
                placeholder="Search question ID, user, campaign, category, or question"
                className="text-input"
                style={{ flex: '1 1 280px', minWidth: 220 }}
              />
              <button className="btn btn-primary" onClick={() => setAppliedSearch(search)}>Search</button>
              {appliedSearch && (
                <button className="btn btn-outline" onClick={() => { setSearch(''); setAppliedSearch('') }}>Clear</button>
              )}
            </div>
            <div>
              <div className="field-label-top">Status</div>
              <ChipGroup options={STATUSES} value={statusFilter} onChange={setStatusFilter} />
            </div>
          </div>
        </Card>
      </Section>

      <Section
        title="Question Queue"
        icon={TempleScrollIcon}
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>{filteredQuestions.length} questions</span>}
      >
        {filteredQuestions.length === 0 ? (
          <Card><div className="muted">No matching questions found. Adjust your search or status filter.</div></Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredQuestions.map((question) => (
              <Card
                key={question.id}
                hover
                onClick={() => openQuestion(question.id)}
                style={{ cursor: 'pointer', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{question.user}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{question.id}</div>
                  </div>
                  <StatusBadge label={question.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-violet">{question.campaignName || 'No campaign'}</span>
                  <span className="badge badge-blue">{question.category}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{question.type}</span>
                </div>
                <div style={{ color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  “{question.question}”
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 'auto' }}>Submitted: {question.raised}</div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={(event) => { event.stopPropagation(); openQuestion(question.id) }}
                >
                  {question.status === 'Answered' ? 'View Answer' : 'Answer Question'}
                </button>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title="Live Streaming" icon={TempleBellIcon}>
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div className="muted">Keep your live schedule visible while managing the question queue.</div>
          <button className="btn btn-gold" onClick={() => setLiveStreamOpen(!liveStreamOpen)}>
            {liveStreamOpen ? 'Hide Live Schedule' : 'Show Live Schedule'}
          </button>
        </Card>
      </Section>

      {liveStreamOpen && (
        <Section title="Live Schedule">
          <Card>
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="badge badge-violet" style={{ width: 'fit-content' }}>08:00 AM - Tamil General Reading</div>
              <div className="badge badge-green" style={{ width: 'fit-content' }}>10:30 AM - Business Strategy Session</div>
              <div className="badge badge-blue" style={{ width: 'fit-content' }}>06:00 PM - Personal Guidance Live</div>
            </div>
          </Card>
        </Section>
      )}

      {panelQuestion && createPortal(
        <div className="modal-overlay" onClick={closePanel}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(680px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div style={{ minWidth: 0 }}>
                <div className="astrologer-modal-title">Question Details</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{panelQuestion.user} · {panelQuestion.id}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <StatusBadge label={panelQuestion.status} />
                <button type="button" className="icon-btn" aria-label="Close" onClick={closePanel}><X size={16} /></button>
              </div>
            </div>

            <div className="modal-card__content astrologer-modal-content">
              <div className="astrologer-modal-highlight astrologer-modal-details-grid">
                <div><strong>User</strong><div className="muted">{panelQuestion.user}</div></div>
                <div><strong>Campaign</strong><div className="muted">{panelQuestion.campaignName || 'No campaign'}</div></div>
                <div><strong>Category</strong><div className="muted">{panelQuestion.category}</div></div>
                <div><strong>Type</strong><div className="muted">{panelQuestion.type}</div></div>
                <div><strong>Question For</strong><div className="muted">{panelQuestion.questionFor}</div></div>
                <div><strong>Language</strong><div className="muted">{panelQuestion.language}</div></div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleScrollIcon size={14} />User Question</div>
                <div className="astrologer-modal-highlight astrologer-modal-question">
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
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleLampIcon size={14} />Answer</div>
                {answerIsReadOnly ? (
                  <div className="astrologer-modal-highlight astrologer-modal-question">
                    {(() => {
                      const fullAnswer = answer || 'No answer was provided.'
                      const { preview, isTruncated } = getWordPreview(fullAnswer)
                      return <>
                        “{preview}”
                        {isTruncated && <button type="button" className="link-btn ml-1" aria-label="See full astrologer answer" onClick={() => setFullContent({ title: 'Astrologer Answer', content: fullAnswer })}>See more…</button>}
                      </>
                    })()}
                  </div>
                ) : <>
                  <textarea
                    className="textarea-box"
                    style={{ width: '100%' }}
                    placeholder="Type your answer here..."
                    maxLength={3000}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                  />
                  <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>Characters: {answer.length} / 3000</div>
                </>}
                {isUnderReview && (
                  <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                    {reviewActive
                      ? canEditSubmittedAnswer
                        ? 'Answer held for review. One correction is available before delivery.'
                        : 'Correction saved. The answer is locked until automatic delivery.'
                      : 'Review window ended. The answer will be delivered automatically.'}
                  </div>
                )}
                {draftSaved && <div style={{ color: 'var(--green-600)', fontSize: 13, marginTop: 6 }}>Draft saved.</div>}
              </div>
            </div>

            <div className="modal-card__footer astrologer-modal-footer-actions">
              {panelQuestion.status === 'Answered' && <span style={{ color: 'var(--green-600)', fontSize: 13, fontWeight: 600, marginRight: 'auto' }}>Submitted Successfully</span>}
              <button className="btn btn-ghost" onClick={closePanel}>Close</button>
              {isUnderReview && canEditSubmittedAnswer && !editingSubmittedAnswer && (
                <button className="btn btn-outline" onClick={() => setEditingSubmittedAnswer(true)}>Enable One-Time Edit</button>
              )}
              {isUnderReview && editingSubmittedAnswer && (
                <button className="btn btn-primary" disabled={!answer.trim()} onClick={saveCorrection}>Save Correction</button>
              )}
              {panelQuestion.status !== 'Answered' && !isUnderReview && (
                <>
                  <button className="btn btn-outline" disabled={!answer.trim()} onClick={saveDraft}>Save Draft</button>
                  <button className="btn btn-primary" disabled={!answer.trim()} onClick={submitAnswer}>Submit Answer</button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {justSubmitted && <SuccessAlert message="Answer submitted successfully." onDismiss={() => setJustSubmitted(false)} />}

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
