import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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

const RAISED_FOR = ['Myself', 'Family Member', 'Friend / Other Person']
const LANGUAGES = ['Tamil', 'Tanglish', 'English']
const HOROSCOPE_OPTIONS = ['Use Saved Horoscope', 'Upload Horoscope']
const QUESTION_CHAR_LIMIT = 500
const SPEECH_LANG_BY_LANGUAGE = { Tamil: 'ta-IN', Tanglish: 'en-IN', English: 'en-IN' }

export default function AskQuestion() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { campaigns, questions, purchasedSlots, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const editQuestionId = searchParams.get('editQuestionId')
  const useDiscount = searchParams.get('useDiscount') === '1'
  const discountQuestionId = searchParams.get('discountQuestionId')
  const requestedPriceType = searchParams.get('priceType')
  const editingQuestion = useMemo(() => questions.find((q) => q.id === editQuestionId) || null, [questions, editQuestionId])
  const isEditing = Boolean(editingQuestion)
  const [questionType, setQuestionType] = useState(
    editingQuestion?.type === 'General' || requestedPriceType === 'general' ? 'General Question' : 'Individual (Personal) Question',
  )
  const [category, setCategory] = useState(editingQuestion?.category || categories[0])
  const [raisedFor, setRaisedFor] = useState(editingQuestion?.questionFor || 'Myself')
  const [otherPersonName, setOtherPersonName] = useState('')
  const [language, setLanguage] = useState(editingQuestion?.language || 'Tamil')
  const [question, setQuestion] = useState(editingQuestion?.question || '')
  const [horoscope, setHoroscope] = useState(editingQuestion?.horoscopeMode || 'Use Saved Horoscope')
  const [submitted, setSubmitted] = useState(false)
  const [successMessage, setSuccessMessage] = useState('Your question has been submitted successfully.')
  const requestedCampaignId = searchParams.get('campaignId')
  const [selectedCampaignId, setSelectedCampaignId] = useState(requestedCampaignId || editingQuestion?.campaignId || null)
  const [showQuestionForm, setShowQuestionForm] = useState(Boolean(editQuestionId || useDiscount))
  const purchasedCampaigns = useMemo(() => campaigns.map((campaign) => {
    const balance = purchasedSlots.find((slot) => slot.userId === currentUser?.id && slot.campaignId === campaign.id)
    if (!balance) return null
    const generalPurchased = Number(balance.generalPurchased) || 0
    const generalUsed = Number(balance.generalUsed) || 0
    const personalPurchased = Number(balance.personalPurchased) || 0
    const personalUsed = Number(balance.personalUsed) || 0
    if (generalPurchased <= generalUsed && personalPurchased <= personalUsed) return null
    return {
      ...campaign,
      slotBalance: { generalPurchased, generalUsed, personalPurchased, personalUsed },
    }
  }).filter(Boolean), [campaigns, currentUser?.id, purchasedSlots])
  const selectedCampaign = useMemo(() => campaigns.find((campaign) => campaign.id === selectedCampaignId) || null, [campaigns, selectedCampaignId])

  const activeDiscount = actions.getActiveDiscountQuestion(currentUser?.id, discountQuestionId)
  const discountActive = useDiscount && Boolean(activeDiscount)
  const categoryOptions =
    discountActive && selectedCampaign?.categories?.length
      ? selectedCampaign.categories.map((cat) => cat.name)
      : categories
  const discountPrice = discountActive ? actions.getDiscountPrice(selectedCampaign?.id, category) : null

  const selectPurchasedCampaign = (campaign, type) => {
    setSelectedCampaignId(campaign.id)
    actions.selectCampaign(campaign.id)
    setQuestionType(type === 'General' ? 'General Question' : 'Individual (Personal) Question')
    setShowQuestionForm(true)
    setSubmitted(false)
  }

  const purchasedSlotCards = useMemo(() => purchasedCampaigns.flatMap((campaign) => {
    const balance = campaign.slotBalance
    const cards = []
    const generalRemaining = Math.max(balance.generalPurchased - balance.generalUsed, 0)
    const personalRemaining = Math.max(balance.personalPurchased - balance.personalUsed, 0)
    if (generalRemaining > 0) cards.push({ campaign, type: 'General', purchased: balance.generalPurchased, used: balance.generalUsed, remaining: generalRemaining })
    if (personalRemaining > 0) cards.push({ campaign, type: 'Individual', purchased: balance.personalPurchased, used: balance.personalUsed, remaining: personalRemaining })
    return cards
  }), [purchasedCampaigns])

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
      const applyingPurchasedSlot = !applyingDiscount && showQuestionForm
      const purchaseType = applyingDiscount ? 'Paid' : applyingPurchasedSlot ? 'Purchased Slot' : (questionType.startsWith('General') ? 'Free' : 'Paid')
      const purchaseAmount = applyingDiscount ? discountPrice.youPay : 0
      if (applyingDiscount) {
        actions.useDiscountQuestion(currentUser?.id, discountQuestionId)
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
        slotType: applyingPurchasedSlot ? (questionType.startsWith('General') ? 'General' : 'Personal') : undefined,
      })
    }
    setSubmitted(true)
  }

  return (
    <div>
      <PageHeader eyebrow="User portal" title={isEditing ? 'Edit Question' : 'Ask a Question'} showBack backTo={routes.trackQuestions} />

      {!isEditing && !discountActive && (
        <Section title="Purchased Question Slots">
          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
            {purchasedSlotCards.map((slot) => {
              const { campaign } = slot
              return (
                <Card
                  key={`${campaign.id}-${slot.type}`}
                  hover
                  className="flex h-full flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-bold text-[color:var(--text-primary)]">{campaign.name}</div>
                    <span className="rounded-full bg-[color:var(--primary-bg)] px-3 py-1 text-xs font-bold text-[color:var(--primary)]">{slot.type}</span>
                  </div>
                  <div className="muted mt-3 flex flex-1 flex-col gap-2 text-sm">
                    <span>{campaign.date} – {campaign.endDate}</span>
                    <span>Purchased: {slot.purchased} slots</span>
                    <span>Used: {slot.used} · Remaining: {slot.remaining}</span>
                  </div>
                  <button type="button" className="btn btn-primary mt-5 w-full" onClick={() => selectPurchasedCampaign(campaign, slot.type)}>
                    Ask Question
                  </button>
                </Card>
              )
            })}
          </div>

          {!purchasedSlotCards.length && (
            <Card>
              <div className="muted">You do not have any purchased question slots yet.</div>
              <button type="button" className="btn btn-primary mt-4" onClick={() => navigate(routes.purchasePackage)}>
                Purchase Question Package
              </button>
            </Card>
          )}

        </Section>
      )}

      {selectedCampaign && (showQuestionForm || isEditing || discountActive) && (
        <Card className="section" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="section-title" style={{ marginBottom: 10 }}>Selected Package</div>
            <div style={{ lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{selectedCampaign.name}</div>
              <div className="muted">Question type: {questionType}</div>
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

      {showQuestionForm && !isEditing && !discountActive && (
        <div className="section" style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setShowQuestionForm(false)}>← Back to Purchased Slots</button>
        </div>
      )}

      {(showQuestionForm || isEditing || discountActive) && <Card className="section" style={{ padding: '16px 20px' }}>
        <div className="section-title" style={{ fontSize: 15, marginBottom: 10 }}>Category</div>
        <ChipGroup options={categoryOptions} value={category} onChange={setCategory} />
      </Card>}

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

      {(showQuestionForm || isEditing || discountActive) && (questionType.startsWith('General') ? (
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
      ))}

      {(showQuestionForm || isEditing || discountActive) && <div className="section" style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitted}>
          {isEditing ? 'Update Question' : submitted && useDiscount ? 'Discount Question Submitted' : 'Submit Question'}
        </button>
      </div>}

      {submitted && (
        <SuccessAlert message={successMessage} onDismiss={() => setSubmitted(false)} />
      )}
    </div>
  )
}
