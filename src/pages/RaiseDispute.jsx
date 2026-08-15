import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RadioGroup } from '../components/OptionGroup.jsx'
import UploadField from '../components/UploadField.jsx'
import { disputeReasons, platformDisputeReasons } from '../data/mockData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'

export default function RaiseDispute() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { questions, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const questionId = searchParams.get('questionId') || 'QTN-2026-001245'
  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === questionId) || questions.find((question) => question.status === 'Answered') || questions[0],
    [questionId, questions],
  )
  const [target, setTarget] = useState('Astrologer')
  const [reason, setReason] = useState(selectedQuestion?.dispute?.reason || '')
  const [description, setDescription] = useState(selectedQuestion?.dispute?.description || '')
  const alreadyRaised = Boolean(selectedQuestion?.dispute)
  const [popupOpen, setPopupOpen] = useState(false)
  const reasonOptions = target === 'Platform Support' ? platformDisputeReasons : disputeReasons

  useEffect(() => {
    if (!alreadyRaised) {
      return
    }
    setPopupOpen(true)
  }, [alreadyRaised])

  const handleSubmit = () => {
    if (alreadyRaised) {
      navigate(routes.trackQuestions)
      return
    }

    actions.raiseDispute(selectedQuestion.id, {
      target,
      reason,
      description,
      attachment: 'Screenshot.pdf',
    })
    navigate(routes.trackQuestions)
  }

  return (
    <div>
      <PageHeader eyebrow="User portal" title="Raise Dispute" showBack backTo={routes.trackQuestions} />

      <Card className="section" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ lineHeight: 1.7 }}>
          <div>Question ID: {selectedQuestion.id}</div>
          <div className="muted">Answered on {selectedQuestion.raised}</div>
        </div>
        <div className="badge badge-red">Dispute eligible</div>
      </Card>

      <Card className="section">
        <div className="section-title">Question Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div><strong>Category</strong><div className="muted">{selectedQuestion.category}</div></div>
          <div><strong>Question Type</strong><div className="muted">{selectedQuestion.type}</div></div>
          <div><strong>Status</strong><div className="muted">{selectedQuestion.status}</div></div>
          <div><strong>Answered On</strong><div className="muted">{selectedQuestion.raised}</div></div>
        </div>
      </Card>

      <Card className="section">
        <div className="section-title">Your Question</div>
        <div style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink)' }}>"{selectedQuestion.question}"</div>
      </Card>

      <Card className="section">
        <div className="section-title">Astrologer&apos;s Answer</div>
        <div style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink)' }}>"{selectedQuestion.answer}"</div>
      </Card>

      <Card
        className="section"
        style={{
          borderColor: 'var(--danger)',
          background: 'linear-gradient(180deg, var(--danger-bg), rgba(255, 255, 255, 0.98))',
        }}
      >
        <div className="section-title" style={{ color: 'var(--danger)' }}>Important</div>
        <div style={{ color: 'var(--danger)', fontWeight: 700 }}>
          You can only raise a dispute one time.
        </div>
      </Card>

      <Card className="section">
        <div className="section-title">Raise Dispute To</div>
        <RadioGroup
          name="dispute-target"
          options={['Astrologer', 'Platform Support']}
          value={target}
          onChange={(value) => {
            setTarget(value)
            setReason('')
          }}
        />
      </Card>

      <Card className="section">
        <div className="section-title">Dispute Reason</div>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="select-input">
          <option value="">Select Reason</option>
          {reasonOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Card>

      <Card className="section">
        <div className="section-title">Dispute Description</div>
        <textarea
          className="textarea-box"
          placeholder="Explain your issue in detail..."
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>Characters: {description.length} / 1000</div>
      </Card>

      <Card className="section">
        <div className="section-title">Attachments (Optional)</div>
        <UploadField label="Upload screenshot, image, or PDF" accept=".pdf,.jpg,.jpeg,.png" />
      </Card>

      <div className="section" style={{ display: 'flex', justifyContent: 'center' }}>
        {!alreadyRaised ? (
          <button className="btn btn-primary" onClick={handleSubmit}>
            Submit
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => navigate(routes.trackQuestions)}>
            Go to Track My Questions
          </button>
        )}
      </div>

      {popupOpen && (
        <div className="modal-overlay" onClick={() => setPopupOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="section-title">Dispute already raised</div>
            <div className="muted" style={{ marginBottom: 16 }}>
              You can raise only one dispute for this question. After the astrologer resolves it, use Track My Questions to view the response.
            </div>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={() => navigate(routes.trackQuestions)}>
                Go to Track My Questions
              </button>
              <button className="btn btn-ghost" onClick={() => setPopupOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
