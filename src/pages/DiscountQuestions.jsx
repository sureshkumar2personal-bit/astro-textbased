import { useMemo, useState } from 'react'
import { ArrowLeft, CalendarClock, Gift, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

function getRemainingDays(validUntil) {
  return Math.max(0, Math.ceil((validUntil - Date.now()) / (24 * 60 * 60 * 1000)))
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DiscountQuestions() {
  const { actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const availableQuestions = actions.getAvailableDiscountQuestions(currentUser?.id)
  const [selectedId, setSelectedId] = useState(availableQuestions[0]?.id || null)
  const selectedQuestion = useMemo(
    () => availableQuestions.find((question) => question.id === selectedId) || availableQuestions[0],
    [availableQuestions, selectedId],
  )

  return (
    <div>
      <PageHeader
        eyebrow="User portal"
        title="Available Discount Questions"
        subtitle="Choose one available discount question to review before asking it."
        actions={<Link to={routes.dashboard} className="btn btn-outline"><ArrowLeft size={15} />Back to Dashboard</Link>}
      />

      {!availableQuestions.length ? (
        <Card>
          <div className="flex items-center gap-3">
            <Gift className="text-[color:var(--primary)]" />
            <div>
              <div className="font-bold text-[color:var(--text-primary)]">No available discount questions</div>
              <div className="muted" style={{ marginTop: 4 }}>Your next discount question will appear here when it becomes available.</div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]">
          <Section title={`Available (${availableQuestions.length})`} icon={Gift}>
            <div className="grid gap-3">
              {availableQuestions.map((discountQuestion) => (
                <button
                  type="button"
                  key={discountQuestion.id}
                  className={`card text-left transition ${discountQuestion.id === selectedQuestion?.id ? 'border-[color:var(--primary)] bg-[color:var(--primary-bg)]' : ''}`}
                  onClick={() => setSelectedId(discountQuestion.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-[color:var(--text-primary)]">Discount Question</div>
                      <div className="muted" style={{ marginTop: 5 }}>{discountQuestion.astrologerName}</div>
                    </div>
                    <span className="badge badge-green">Available</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--accent-dark)]">
                    <CalendarClock size={15} /> {getRemainingDays(discountQuestion.validUntil)} days remaining
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {selectedQuestion && (
            <Section title="Discount Question Details" icon={Gift}>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="page-eyebrow">Subscriber benefit</div>
                    <h2 className="text-xl font-bold">One Discount Question</h2>
                  </div>
                  <span className="badge badge-green">Available</span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-[14px] bg-[color:var(--surface-soft)] p-4">
                    <div className="muted text-xs font-semibold uppercase tracking-wide">Astrologer</div>
                    <div className="mt-1 flex items-center gap-2 font-bold text-[color:var(--text-primary)]">
                      <UserRound size={16} /> {selectedQuestion.astrologerName}
                    </div>
                  </div>
                  <div className="rounded-[14px] bg-[color:var(--surface-soft)] p-4">
                    <div className="muted text-xs font-semibold uppercase tracking-wide">Remaining validity</div>
                    <div className="mt-1 flex items-center gap-2 font-bold text-[color:var(--accent-dark)]">
                      <CalendarClock size={16} /> {getRemainingDays(selectedQuestion.validUntil)} days
                    </div>
                  </div>
                  <div className="field-group" style={{ margin: 0 }}>
                    <span className="field-label-top">Granted Date</span>
                    <div className="text-input">{formatDate(selectedQuestion.grantedAt)}</div>
                  </div>
                  <div className="field-group" style={{ margin: 0 }}>
                    <span className="field-label-top">Valid Until</span>
                    <div className="text-input">{formatDate(selectedQuestion.validUntil)}</div>
                  </div>
                </div>

                <div className="mt-5 rounded-[14px] border border-[color:var(--primary)] bg-[color:var(--primary-bg)] p-4 text-sm leading-6">
                  This benefit can be used once for one question. Select your question details on the next page and submit it before the validity period ends.
                </div>

                <button
                  type="button"
                  className="btn btn-primary mt-5 w-full"
                  onClick={() => navigate(`${routes.askQuestion}?useDiscount=1&discountQuestionId=${encodeURIComponent(selectedQuestion.id)}`)}
                >
                  Ask Question
                </button>
              </Card>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
