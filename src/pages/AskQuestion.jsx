import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RadioGroup, ChipGroup } from '../components/OptionGroup.jsx'
import UploadField from '../components/UploadField.jsx'
import VoiceTextArea from '../components/VoiceTextArea.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import { categories } from '../data/mockData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

const QUESTION_TYPES = ['General Question', 'Individual (Personal) Question']
const RAISED_FOR = ['Myself', 'Family Member', 'Friend / Other Person']
const LANGUAGES = ['Tamil', 'Tanglish', 'English']
const HOROSCOPE_OPTIONS = ['Use Saved Horoscope', 'Upload Horoscope']
const QUESTION_CHAR_LIMIT = 500
const SPEECH_LANG_BY_LANGUAGE = { Tamil: 'ta-IN', Tanglish: 'en-IN', English: 'en-IN' }

export default function AskQuestion() {
  const [searchParams] = useSearchParams()
  const { campaigns, questions, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const editQuestionId = searchParams.get('editQuestionId')
  const editingQuestion = useMemo(() => questions.find((q) => q.id === editQuestionId) || null, [questions, editQuestionId])
  const isEditing = Boolean(editingQuestion)
  const [questionType, setQuestionType] = useState(editingQuestion?.type === 'General' ? 'General Question' : 'Individual (Personal) Question')
  const [category, setCategory] = useState(editingQuestion?.category || categories[0])
  const [raisedFor, setRaisedFor] = useState(editingQuestion?.questionFor || 'Myself')
  const [otherPersonName, setOtherPersonName] = useState('')
  const [language, setLanguage] = useState(editingQuestion?.language || 'Tamil')
  const [question, setQuestion] = useState(editingQuestion?.question || '')
  const [horoscope, setHoroscope] = useState(editingQuestion?.horoscopeMode || 'Use Saved Horoscope')
  const [submitted, setSubmitted] = useState(false)
  const [successMessage, setSuccessMessage] = useState('Your question has been submitted successfully.')
  const campaignId = searchParams.get('campaignId') || editingQuestion?.campaignId || campaigns[0]?.id
  const selectedCampaign = useMemo(() => campaigns.find((campaign) => campaign.id === campaignId) || campaigns[0], [campaignId, campaigns])

  const activeDiscount = actions.getActiveDiscountQuestion(currentUser?.id)
  const discountActive = Boolean(activeDiscount)
  const categoryOptions =
    discountActive && selectedCampaign?.categories?.length
      ? selectedCampaign.categories.map((cat) => cat.name)
      : categories
  const discountPrice = discountActive ? actions.getDiscountPrice(selectedCampaign?.id, category) : null

  const handleSubmit = () => {
    if (isEditing) {
      actions.editQuestion(editingQuestion.id, {
        type: questionType.startsWith('General') ? 'General' : 'Personal',
        category,
        questionFor: raisedFor === 'Friend / Other Person' && otherPersonName.trim() ? otherPersonName.trim() : raisedFor,
        language,
        question,
        horoscopeMode: questionType.startsWith('General') ? 'Continue Without Horoscope' : horoscope,
        purchaseType: questionType.startsWith('General') ? 'Free' : 'Paid',
      })
      setSuccessMessage('Your question has been updated successfully.')
    } else {
      const applyingDiscount = discountActive && Boolean(discountPrice)
      const purchaseType = applyingDiscount ? 'Paid' : (questionType.startsWith('General') ? 'Free' : 'Paid')
      const purchaseAmount = applyingDiscount ? discountPrice.youPay : 0
      if (applyingDiscount) {
        actions.useDiscountQuestion(currentUser?.id)
        setSuccessMessage('Your Discount Question was used. The question was submitted at the discounted price.')
      } else {
        setSuccessMessage('Your question has been submitted successfully.')
      }
      actions.createQuestion({
        userName: currentUser?.name,
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        campaignId: selectedCampaign?.id,
        campaignName: selectedCampaign?.name,
        type: questionType.startsWith('General') ? 'General' : 'Personal',
        category,
        questionFor: raisedFor === 'Friend / Other Person' && otherPersonName.trim() ? otherPersonName.trim() : raisedFor,
        language,
        question,
        horoscopeMode: questionType.startsWith('General') ? 'Continue Without Horoscope' : horoscope,
        purchaseType,
        purchaseAmount,
      })
    }
    setSubmitted(true)
  }

  return (
    <div>
      <PageHeader eyebrow="User portal" title={isEditing ? 'Edit Question' : 'Ask a Question'} showBack backTo={routes.trackQuestions} />

      {selectedCampaign && (
        <Card className="section" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="section-title" style={{ marginBottom: 10 }}>Selected Package</div>
            <div style={{ lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{selectedCampaign.name}</div>
              <div className="muted">Questions purchased: {selectedCampaign.purchasedGeneral + selectedCampaign.purchasedPersonal}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            {discountActive && discountPrice && (
              <div className="badge badge-green">🎁 Discount Question active</div>
            )}
            <div className="badge badge-green">Simple layout for General · Detailed layout for Personal</div>
          </div>
        </Card>
      )}

      <Section title="Question Type">
        <Card>
          <RadioGroup name="question-type" options={QUESTION_TYPES} value={questionType} onChange={setQuestionType} />
        </Card>
      </Section>

      <Card className="section" style={{ padding: '16px 20px' }}>
        <div className="section-title" style={{ fontSize: 15, marginBottom: 10 }}>Category</div>
        <ChipGroup options={categoryOptions} value={category} onChange={setCategory} />
      </Card>

      {discountActive && discountPrice && (
        <Section title="Subscriber Discount">
          <Card>
            <div className="section-title" style={{ fontSize: 15 }}>Discount Question Applied</div>
            <div style={{ display: 'grid', gap: 12, maxWidth: 360, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Normal Price ({category})</span>
                <strong>₹{discountPrice.normalPrice}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subscriber Discount</span>
                <strong>{discountPrice.discountPercent}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount</span>
                <strong>-₹{discountPrice.discountAmount}</strong>
              </div>
              <div className="divider" style={{ margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                <span>You Pay</span>
                <strong>₹{discountPrice.youPay}</strong>
              </div>
            </div>
          </Card>
        </Section>
      )}

      {questionType.startsWith('General') ? (
        <Section title="General Question">
          <Card>
            <div className="muted" style={{ marginBottom: 12 }}>Simple layout for general questions. Add the minimum required details and submit.</div>
            <div className="field-group">
              <label className="field-label-top">Preferred Language</label>
              <select className="select-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <VoiceTextArea
              placeholder="Type your general question here, or tap the mic to speak it..."
              value={question}
              onChange={setQuestion}
              maxLength={QUESTION_CHAR_LIMIT}
              lang={SPEECH_LANG_BY_LANGUAGE[language]}
            />
          </Card>
        </Section>
      ) : (
        <>
          <Section title="Question Raised For">
            <Card>
              <RadioGroup name="raised-for" options={RAISED_FOR} value={raisedFor} onChange={setRaisedFor} />
              {raisedFor === 'Friend / Other Person' && (
                <div className="field-group" style={{ marginTop: 16, marginBottom: 0 }}>
                  <label className="field-label-top">Person's Name</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Enter their name"
                    value={otherPersonName}
                    onChange={(e) => setOtherPersonName(e.target.value)}
                  />
                </div>
              )}
            </Card>
          </Section>

          <Section title="Preferred Language">
            <Card>
              <RadioGroup name="language" options={LANGUAGES} value={language} onChange={setLanguage} />
            </Card>
          </Section>

          <Section title="Personal Question">
            <Card>
              <div className="muted" style={{ marginBottom: 12 }}>Detailed layout for personal questions. Add horoscope and supporting files.</div>
              <RadioGroup name="horoscope" options={HOROSCOPE_OPTIONS} value={horoscope} onChange={setHoroscope} />
              <div style={{ marginTop: 16 }}>
                <UploadField label="Upload horoscope file" accept=".pdf,.jpg,.jpeg,.png" />
              </div>
              <div style={{ marginTop: 16 }}>
                <VoiceTextArea
                  placeholder="Describe your question in detail, or tap the mic to speak it..."
                  value={question}
                  onChange={setQuestion}
                  maxLength={QUESTION_CHAR_LIMIT}
                  lang={SPEECH_LANG_BY_LANGUAGE[language]}
                />
              </div>
            </Card>
          </Section>
        </>
      )}

      <div className="section" style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={handleSubmit}>
          {isEditing ? 'Update Question' : 'Submit Question'}
        </button>
      </div>

      {submitted && (
        <SuccessAlert message={successMessage} onDismiss={() => setSubmitted(false)} />
      )}
    </div>
  )
}
