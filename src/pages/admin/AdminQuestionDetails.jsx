import { useMemo } from 'react'
import { MessageCircle } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import {
  findAdminQuestion,
  getQuestionAskedAt,
  getQuestionAstrologerName,
  getQuestionResponse,
  getQuestionUserName,
} from '../../utils/adminQuestions.js'

// Admin -> Text-Based Question details.
//
// Read-only. Answering, refunding, resolving, cancelling and disputing all
// happen in their own modules; none of that behaviour is touched from here.
function DetailField({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value || '—'}</div>
    </div>
  )
}

export default function AdminQuestionDetails() {
  const { questionId } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const { questions } = useAppData()

  const question = useMemo(() => findAdminQuestion(questions, questionId), [questions, questionId])

  if (!question) {
    return <Navigate to={`${routes.base}/text-based-questions`} replace />
  }

  const response = getQuestionResponse(question)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title={question.id || 'Question'}
        subtitle={question.category ? `Category: ${question.category}` : 'No category on record'}
        actions={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`${routes.base}/text-based-questions`)}
          >
            Back to Questions
          </button>
        }
      />

      <Section title="Question" icon={MessageCircle} className="!mt-4">
        <Card>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 18,
            }}
          >
            <DetailField label="User" value={getQuestionUserName(question)} />
            <DetailField label="Astrologer" value={getQuestionAstrologerName(question) || question.astrologerId} />
            <DetailField label="Asked" value={formatDisplayDate(getQuestionAskedAt(question))} />
            <DetailField label="Status" value={<StatusBadge label={question.status} />} />
          </div>
          <div style={{ marginTop: 20 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Question</div>
            <div style={{ marginTop: 4 }}>{question.question || 'Not available'}</div>
          </div>
        </Card>
      </Section>

      <Section title="Response" icon={MessageCircle} className="!mt-5">
        <Card>
          {response ? (
            <div style={{ marginTop: 0 }}>{response}</div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>No records found.</p>
          )}
        </Card>
      </Section>
    </div>
  )
}
