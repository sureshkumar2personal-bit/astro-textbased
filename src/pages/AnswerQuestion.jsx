import { useCallback, useEffect, useMemo, useState } from 'react'
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

const ASTROLOGER_PENDING_STATUSES = ['Pending', 'Queued', 'In Progress', 'Under Review']
import {
  TempleArchIcon,
  TempleLampIcon,
  TempleLotusIcon,
  TempleReturnIcon,
  TempleScrollIcon,
} from '../components/TempleIcons.jsx'

const PAGE_SIZE = 6

export default function AnswerQuestion() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { questions, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const questionIdParam = searchParams.get('questionId')
  const statusParam = searchParams.get('status')
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(statusParam || 'All')

  const matchesStatusFilter = useCallback((questionStatus) => {
    if (statusFilter === 'All') return true
    if (statusFilter === 'pending_group') return ASTROLOGER_PENDING_STATUSES.includes(questionStatus)
    return questionStatus === statusFilter
  }, [statusFilter])
  const [page, setPage] = useState(1)
  const [panelQuestionId, setPanelQuestionId] = useState(questionIdParam || null)
  const [answer, setAnswer] = useState('')
  const [justSubmitted, setJustSubmitted] = useState(false)

  const filteredQuestions = useMemo(() => {
    const term = appliedSearch.trim().toLowerCase()
    return questions
      .filter((question) => {
        const matchesSearch = !term || [question.id, question.user, question.category, question.question, question.status]
          .join(' ')
          .toLowerCase()
          .includes(term)
        return matchesSearch && matchesStatusFilter(question.status)
      })
      .sort((a, b) => {
        const dateA = new Date(a.raisedAt || a.raised)
        const dateB = new Date(b.raisedAt || b.raised)
        return dateB - dateA
      })
  }, [questions, appliedSearch, matchesStatusFilter])

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
  }, [panelQuestion?.id, panelQuestion?.draftAnswer, panelQuestion?.answer])

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
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('questionId')
      return next
    })
  }

  const isAnswered = panelQuestion?.status === 'Answered'

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

      <Section title="Search">
        <Card>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user name, question ID, category, or keyword"
              className="text-input"
              style={{ flex: 1, minWidth: 240 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setAppliedSearch(search)
              }}
            />
            <button className="btn btn-primary" onClick={() => setAppliedSearch(search)}>Search</button>
          </div>
        </Card>
      </Section>

      <Section title="Filters">
        <Card>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <div className="field-label-top">Status</div>
              <ChipGroup options={['All', 'Pending', 'Queued', 'In Progress', 'Under Review', 'Answered', 'Disputed', 'Closed']} value={statusFilter} onChange={setStatusFilter} />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="badge badge-violet">Active filter: {statusFilter}</span>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Questions" icon={TempleScrollIcon} titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({filteredQuestions.length})</span>}>
        {pagedQuestions.length === 0 && (
          <Card>
            <div className="muted">No matching questions found. Adjust your search or filters.</div>
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
                <StatusBadge label={question.status} />
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
            className="modal-card"
            style={{ width: 'min(640px, calc(100vw - 32px))', maxHeight: '88vh', overflowY: 'auto', padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px 16px',
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink)' }}>Answer Question</div>
                <div
                  className="muted"
                  style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {panelQuestion.campaignName} · {panelQuestion.id}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
                <StatusBadge label={panelQuestion.status} />
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 24px' }}>
              <div>
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TempleArchIcon size={14} />User Details
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 14,
                    fontSize: 14,
                    background: 'var(--violet-50)',
                    borderRadius: 'var(--radius-s)',
                    padding: 14,
                  }}
                >
                  <div><strong>Name</strong><div className="muted">{panelQuestion.user}</div></div>
                  <div><strong>Question Type</strong><div className="muted">{panelQuestion.type}</div></div>
                  <div><strong>Category</strong><div className="muted">{panelQuestion.category}</div></div>
                  <div><strong>Question For</strong><div className="muted">{panelQuestion.questionFor}</div></div>
                  <div><strong>Language</strong><div className="muted">{panelQuestion.language}</div></div>
                </div>
              </div>

              <div>
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TempleScrollIcon size={14} />User Question
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontStyle: 'italic',
                    color: 'var(--ink)',
                    background: 'var(--violet-50)',
                    borderRadius: 'var(--radius-s)',
                    padding: 14,
                  }}
                >
                  "{panelQuestion.question}"
                </div>
              </div>

              <div>
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

              <div>
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TempleLampIcon size={14} />Answer
                </div>
                <textarea
                  className="textarea-box"
                  style={{ width: '100%' }}
                  placeholder="Type your answer here..."
                  maxLength={3000}
                  value={answer}
                  readOnly={isAnswered}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>Characters: {answer.length} / 3000</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                flexWrap: 'wrap',
                padding: '16px 24px',
                borderTop: '1px solid var(--border)',
              }}
            >
              {isAnswered && (
                <span style={{ color: 'var(--green-600)', fontSize: 13, fontWeight: 600, marginRight: 'auto' }}>
                  Submitted Successfully
                </span>
              )}
              <button className="btn btn-ghost" onClick={closePanel}>Cancel</button>
              {!isAnswered && (
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
    </div>
  )
}
