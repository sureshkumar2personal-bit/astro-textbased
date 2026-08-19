import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, Clock, AlertTriangle } from 'lucide-react'
import { RadioGroup, ChipGroup } from '../components/OptionGroup.jsx'
import UploadField from '../components/UploadField.jsx'
import VoiceTextArea from '../components/VoiceTextArea.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import { categories } from '../data/mockData.js'
import { mockAstrologers } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

const RAISED_FOR = ['Myself', 'Others']
const LANGUAGES = ['Tamil', 'Tanglish', 'English']
const HOROSCOPE_OPTIONS = ['Use Saved Horoscope', 'Upload Horoscope']
const QUESTION_CHAR_LIMIT = 500
const SPEECH_LANG_BY_LANGUAGE = { Tamil: 'ta-IN', Tanglish: 'en-IN', English: 'en-IN' }
const EDIT_TIME_LIMIT_MS = 30 * 60 * 1000
const DELETE_TIME_LIMIT_MS = 60 * 60 * 1000

function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Expired'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function AskQuestion() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { campaigns, questions, purchasedSlots, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const editQuestionId = searchParams.get('editQuestionId')
  const viewQuestionId = searchParams.get('viewQuestionId')
  const useDiscount = searchParams.get('useDiscount') === '1'
  const discountQuestionId = searchParams.get('discountQuestionId')
  const requestedPriceType = searchParams.get('priceType')
  const editingQuestion = useMemo(() => questions.find((q) => q.id === editQuestionId) || null, [questions, editQuestionId])
  const viewingQuestion = useMemo(() => questions.find((q) => q.id === viewQuestionId) || null, [questions, viewQuestionId])
  const isEditing = Boolean(editingQuestion)
  const isViewing = Boolean(viewingQuestion) && !isEditing
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
  const [selectedAstrologerName, setSelectedAstrologerName] = useState('')
  const [selectedAstrologerId, setSelectedAstrologerId] = useState('')
  const [showQuestionForm, setShowQuestionForm] = useState(Boolean(editQuestionId || useDiscount))
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)

  const viewingQuestionSubmittedAt = viewingQuestion?.submittedAt ? new Date(viewingQuestion.submittedAt).getTime() : null
  const viewingQuestionCampaign = viewingQuestion?.campaignId ? campaigns.find((c) => c.id === viewingQuestion.campaignId) : null
  const viewingQuestionAstrologer = viewingQuestion?.astrologerId ? mockAstrologers.find((a) => a.id === viewingQuestion.astrologerId) : null

  const purchasedCampaigns = useMemo(() => campaigns.map((campaign) => {
    const balance = purchasedSlots.find((slot) => slot.userId === currentUser?.id && slot.campaignId === campaign.id)
    if (!balance) return null
    const generalPurchased = Number(balance.generalPurchased) || 0
    const generalUsed = Number(balance.generalUsed) || 0
    const personalPurchased = Number(balance.personalPurchased) || 0
    const personalUsed = Number(balance.personalUsed) || 0
    if (generalPurchased <= generalUsed && personalPurchased <= personalUsed) return null
    const astrologer = mockAstrologers.find((a) => a.id === balance.astrologerId) || null
    return {
      ...campaign,
      slotBalance: {
        generalPurchased,
        generalUsed,
        personalPurchased,
        personalUsed,
        astrologerId: balance.astrologerId,
        astrologerName: astrologer?.name || 'Astrologer',
      },
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
  const isQuestionFormOpen = showQuestionForm || isEditing || discountActive

  const editTimeRemaining = useMemo(() => {
    if (!viewingQuestionSubmittedAt) return 0
    return Math.max(0, EDIT_TIME_LIMIT_MS - (Date.now() - viewingQuestionSubmittedAt))
  }, [viewingQuestionSubmittedAt, timeElapsed])

  const deleteTimeRemaining = useMemo(() => {
    if (!viewingQuestionSubmittedAt) return 0
    return Math.max(0, DELETE_TIME_LIMIT_MS - (Date.now() - viewingQuestionSubmittedAt))
  }, [viewingQuestionSubmittedAt, timeElapsed])

  const isEditEnabled = editTimeRemaining > 0
  const isDeleteEnabled = deleteTimeRemaining > 0

  useEffect(() => {
    if (!isViewing || !viewingQuestionSubmittedAt) return
    const interval = setInterval(() => {
      setTimeElapsed(Date.now() - viewingQuestionSubmittedAt)
    }, 1000)
    return () => clearInterval(interval)
  }, [isViewing, viewingQuestionSubmittedAt])

  const closeQuestionForm = () => {
    if (isEditing || discountActive) {
      navigate(routes.trackQuestions)
      return
    }
    setShowQuestionForm(false)
  }

  const closeViewForm = () => {
    navigate(routes.trackQuestions)
  }

  const selectPurchasedCampaign = (campaign, type, astrologerName, astrologerId) => {
    setSelectedCampaignId(campaign.id)
    setSelectedAstrologerName(astrologerName || '')
    setSelectedAstrologerId(astrologerId || '')
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
    if (generalRemaining > 0) cards.push({ campaign, type: 'General', purchased: balance.generalPurchased, used: balance.generalUsed, remaining: generalRemaining, astrologerName: balance.astrologerName, astrologerId: balance.astrologerId })
    if (personalRemaining > 0) cards.push({ campaign, type: 'Individual', purchased: balance.personalPurchased, used: balance.personalUsed, remaining: personalRemaining, astrologerName: balance.astrologerName, astrologerId: balance.astrologerId })
    return cards
  }), [purchasedCampaigns])

  const handleSubmit = () => {
    if (isEditing) {
      actions.editQuestion(editingQuestion.id, {
        type: questionType.startsWith('General') ? 'General' : 'Personal',
        category,
        questionFor: raisedFor === 'Others' && otherPersonName.trim() ? otherPersonName.trim() : raisedFor,
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
        astrologerId: selectedAstrologerId || selectedCampaign?.astrologerId || null,
        type: questionType.startsWith('General') ? 'General' : 'Personal',
        category,
        questionFor: raisedFor === 'Others' && otherPersonName.trim() ? otherPersonName.trim() : raisedFor,
        language,
        question,
        horoscopeMode: questionType.startsWith('General') ? 'Continue Without Horoscope' : horoscope,
        purchaseType,
        purchaseAmount,
        slotType: applyingPurchasedSlot ? (questionType.startsWith('General') ? 'General' : 'Personal') : undefined,
      })
    }
    setSubmitted(true)
    setShowQuestionForm(false)
  }

  const handleEdit = () => {
    if (!isEditEnabled || !viewingQuestion) return
    setSelectedCampaignId(viewingQuestion.campaignId)
    setSelectedAstrologerName(viewingQuestionAstrologer?.name || '')
    setSelectedAstrologerId(viewingQuestion.astrologerId || '')
    setQuestionType(viewingQuestion.type === 'General' ? 'General Question' : 'Individual (Personal) Question')
    setCategory(viewingQuestion.category)
    setLanguage(viewingQuestion.language)
    setQuestion(viewingQuestion.question)
    setHoroscope(viewingQuestion.horoscopeMode)
    setRaisedFor(viewingQuestion.questionFor)
    setShowQuestionForm(true)
    navigate(`${routes.askQuestion}?editQuestionId=${viewingQuestion.id}`)
  }

  const handleDelete = () => {
    if (!isDeleteEnabled || !viewingQuestion) return
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (viewingQuestion) {
      actions.revokeQuestion(viewingQuestion.id)
    }
    setShowDeleteConfirm(false)
    navigate(routes.trackQuestions)
  }

  return (
    <div>
      <PageHeader eyebrow="User portal" title={isEditing ? 'Edit Question' : 'Ask a Question'} showBack backTo={routes.trackQuestions} />

      {!isEditing && !discountActive && !isViewing && (
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
                    <div className="font-bold text-[color:var(--text-primary)]">{slot.astrologerName}</div>
                    <span className="rounded-full bg-[color:var(--primary-bg)] px-3 py-1 text-xs font-bold text-[color:var(--primary)]">{slot.type}</span>
                  </div>
                  <div className="muted mt-1 text-sm">{campaign.name}</div>
                  <div className="muted mt-3 flex flex-1 flex-col gap-2 text-sm">
                    <span>{campaign.date} – {campaign.endDate}</span>
                    <span>Purchased: {slot.purchased} slots</span>
                    <span>Used: {slot.used} · Remaining: {slot.remaining}</span>
                  </div>
                  <button type="button" className="btn btn-primary mt-5 w-full" onClick={() => selectPurchasedCampaign(campaign, slot.type, slot.astrologerName, slot.astrologerId)}>
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

      {isViewing && createPortal((
        <div className="modal-overlay user-modal-overlay" onClick={closeViewForm}>
          <div
            className="modal-card user-modal-card user-modal-card--scroll"
            style={{ width: 'min(760px, calc(100vw - 32px))' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-question-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="user-modal-card__header flex items-center justify-between gap-4">
              <div>
                <div id="view-question-title" className="section-title" style={{ marginBottom: 0 }}>Ask a Question</div>
                {viewingQuestionCampaign && <div className="muted" style={{ marginTop: 4 }}>{viewingQuestionCampaign.name} · {viewingQuestion.type} Question</div>}
              </div>
              <div className="flex items-center gap-3">
                {viewingQuestionAstrologer?.name && <span className="section-title" style={{ marginBottom: 0 }}>{viewingQuestionAstrologer.name}</span>}
                <button type="button" className="icon-btn" aria-label="Close" onClick={closeViewForm}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="user-modal-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Card>
                <div className="muted text-sm" style={{ marginBottom: 8 }}>Your Question</div>
                <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 15 }}>"{viewingQuestion.question}"</div>
                <div className="muted text-sm" style={{ marginTop: 12 }}>Category: {viewingQuestion.category}</div>
                <div className="muted text-sm">Language: {viewingQuestion.language}</div>
                {viewingQuestion.submittedAt && (
                  <div className="muted text-sm" style={{ marginTop: 12 }}>Submitted at {formatTime(viewingQuestion.submittedAt)}</div>
                )}
              </Card>

              {viewingQuestionSubmittedAt && (
                <Card>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className={isEditEnabled ? 'text-[color:var(--primary)]' : 'text-[color:var(--text-muted)]'} />
                      <span className={isEditEnabled ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--text-muted)]'}>
                        Edit available for {formatTimeRemaining(editTimeRemaining)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className={isDeleteEnabled ? 'text-[color:var(--primary)]' : 'text-[color:var(--text-muted)]'} />
                      <span className={isDeleteEnabled ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--text-muted)]'}>
                        Delete available for {formatTimeRemaining(deleteTimeRemaining)}
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleEdit}
                  disabled={!isEditEnabled}
                  style={{ opacity: isEditEnabled ? 1 : 0.5 }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={!isDeleteEnabled}
                  style={{ opacity: isDeleteEnabled ? 1 : 0.5 }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {isQuestionFormOpen && createPortal((
        <div className="modal-overlay user-modal-overlay" onClick={closeQuestionForm}>
          <div
            className="modal-card user-modal-card user-modal-card--scroll"
            style={{ width: 'min(760px, calc(100vw - 32px))' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ask-question-popup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="user-modal-card__header flex items-center justify-between gap-4">
              <div>
                <div id="ask-question-popup-title" className="section-title" style={{ marginBottom: 0 }}>{isEditing ? 'Edit Question' : 'Ask a Question'}</div>
                {selectedCampaign && <div className="muted" style={{ marginTop: 4 }}>{selectedCampaign.name} · {questionType}</div>}
              </div>
              <div className="flex items-center gap-3">
                {selectedAstrologerName && <span className="section-title" style={{ marginBottom: 0 }}>{selectedAstrologerName}</span>}
                <button type="button" className="icon-btn" aria-label="Close ask question popup" onClick={closeQuestionForm}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="user-modal-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Card>
                <div className="section-title" style={{ fontSize: 15, marginBottom: 10 }}>Category</div>
                <ChipGroup options={categoryOptions} value={category} onChange={setCategory} />
              </Card>

              {discountActive && discountPrice && (
                <Card>
                  <div className="section-title" style={{ fontSize: 15 }}>Discount Question Applied</div>
                  <div style={{ display: 'grid', gap: 12, maxWidth: 360, marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Normal Price ({category})</span><strong>₹{discountPrice.normalPrice}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subscriber Discount</span><strong>{discountPrice.discountPercent}%</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount</span><strong>-₹{discountPrice.discountAmount}</strong></div>
                    <div className="divider" style={{ margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}><span>You Pay</span><strong>₹{discountPrice.youPay}</strong></div>
                  </div>
                </Card>
              )}

              {questionType.startsWith('General') ? (
                <Card>
                  <div className="section-title" style={{ fontSize: 15 }}>General Question</div>
                  <div className="muted" style={{ marginBottom: 12 }}>Simple layout for general questions. Add the minimum required details and submit.</div>
                  <div className="field-group"><label className="field-label-top">Preferred Language</label><select className="select-input" value={language} onChange={(event) => setLanguage(event.target.value)}>{LANGUAGES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                  <VoiceTextArea placeholder="Type your general question here, or tap the mic to speak it..." value={question} onChange={setQuestion} maxLength={QUESTION_CHAR_LIMIT} lang={SPEECH_LANG_BY_LANGUAGE[language]} />
                </Card>
              ) : (
                <>
                  <Card>
                    <div className="section-title" style={{ fontSize: 15 }}>Question Raised For</div>
                    <RadioGroup name="raised-for" options={RAISED_FOR} value={raisedFor} onChange={setRaisedFor} />
                    {raisedFor === 'Others' && <div className="field-group" style={{ marginTop: 16, marginBottom: 0 }}><label className="field-label-top">Person's Name</label><input type="text" className="text-input" placeholder="Enter their name" value={otherPersonName} onChange={(event) => setOtherPersonName(event.target.value)} /></div>}
                  </Card>
                  <Card><div className="section-title" style={{ fontSize: 15 }}>Preferred Language</div><RadioGroup name="language" options={LANGUAGES} value={language} onChange={setLanguage} /></Card>
                  <Card>
                    <div className="section-title" style={{ fontSize: 15 }}>Personal Question</div>
                    <div className="muted" style={{ marginBottom: 12 }}>Detailed layout for personal questions. Add horoscope and supporting files.</div>
                    <RadioGroup name="horoscope" options={HOROSCOPE_OPTIONS} value={horoscope} onChange={setHoroscope} />
                    <div style={{ marginTop: 16 }}><UploadField label="Upload horoscope file" accept=".pdf,.jpg,.jpeg,.png" /></div>
                    <div style={{ marginTop: 16 }}><VoiceTextArea placeholder="Describe your question in detail, or tap the mic to speak it..." value={question} onChange={setQuestion} maxLength={QUESTION_CHAR_LIMIT} lang={SPEECH_LANG_BY_LANGUAGE[language]} /></div>
                  </Card>
                </>
              )}
            </div>

            <div className="user-modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={closeQuestionForm}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>{isEditing ? 'Update Question' : 'Submit Question'}</button>
            </div>
          </div>
        </div>
      ), document.body)}

      {showDeleteConfirm && createPortal((
        <div className="modal-overlay user-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
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
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setShowDeleteConfirm(false)}>
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
              <button type="button" className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>Delete Question</button>
            </div>
          </div>
        </div>
      ), document.body)}

      {submitted && (
        <SuccessAlert
          variant="user"
          message={successMessage}
          onDismiss={() => setSubmitted(false)}
          actionLabel="view status"
          onAction={() => {
            setSubmitted(false)
            navigate(routes.trackQuestions)
          }}
        />
      )}
    </div>
  )
}
