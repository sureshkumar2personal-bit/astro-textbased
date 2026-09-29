import { useMemo, useState } from 'react'
import { Eye, MessageCircle, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import {
  filterAdminQuestions,
  getQuestionAskedAt,
  getQuestionAstrologerName,
  getQuestionUserName,
  selectQuestionStatusFilters,
} from '../../utils/adminQuestions.js'

// Admin -> Text-Based Questions list.
//
// Reads the existing questions store from AppDataContext. Read-only: there is no
// answer, refund, resolve or cancel action here.
export default function AdminQuestions() {
  const { questions } = useAppData()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')

  const statusFilters = useMemo(() => selectQuestionStatusFilters(questions), [questions])
  const visibleQuestions = useMemo(() => filterAdminQuestions(questions, { query, status }), [questions, query, status])

  const openQuestion = (questionId) => navigate(`${routes.base}/text-based-questions/${questionId}`)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Text-Based Questions"
        subtitle="Every question raised through the text question flow. Open a question to review its details."
      />

      <Section className="!mt-4">
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group">
              <div className="search-bar">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by user, astrologer, or question ID"
                  className="text-input search-bar__input"
                  aria-label="Search questions"
                />
                <button type="button" className="icon-btn" aria-label="Search">
                  <Search size={18} />
                </button>
              </div>
            </div>
            <div className="search-filter-row__group">
              <label className="search-filter-row__heading muted" htmlFor="admin-question-status" style={{ fontSize: 13, fontWeight: 600 }}>
                Status
              </label>
              <select
                id="admin-question-status"
                className="select-input"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {statusFilters.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </Section>

      <Section
        title="Questions"
        icon={MessageCircle}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({visibleQuestions.length})</span>}
      >
        <div className="table-wrap">
          {!questions.length ? (
            <p className="muted">No questions found.</p>
          ) : visibleQuestions.length === 0 ? (
            <p className="muted">No questions match your search.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Question ID</th>
                  <th>User</th>
                  <th>Astrologer</th>
                  <th>Asked</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleQuestions.map((question) => (
                  <tr key={question.id}>
                    <td>{question.id || '—'}</td>
                    <td>{getQuestionUserName(question) || '—'}</td>
                    <td>{getQuestionAstrologerName(question) || question.astrologerId || '—'}</td>
                    <td>{formatDisplayDate(getQuestionAskedAt(question))}</td>
                    <td><StatusBadge label={question.status} /></td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openQuestion(question.id)}>
                        <Eye size={15} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </div>
  )
}
