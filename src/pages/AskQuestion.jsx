import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { X, Clock, AlertTriangle, Languages, Layers, Sparkles, UserRound } from 'lucide-react'
import { RadioGroup, ChipGroup } from '../components/OptionGroup.jsx'
import UploadField from '../components/UploadField.jsx'
import VoiceTextArea from '../components/VoiceTextArea.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import { categories } from '../data/mockData.js'
import { getSuggestedAstrologers, mockAstrologers } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { getCampaignQuestionTypes, getDiscountPreview, getEffectiveCampaignStatus } from '../utils/questions.js'

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

// A subscription is usable while it has not lapsed. Mirrors the same expiry
// rule the astrologer profile uses (expiresAt, falling back to the granted
// discount-question validity) so both screens agree on who is subscribed.
function getSubscriptionExpiry(subscription) {
  return subscription?.expiresAt || subscription?.discountQuestions?.[0]?.validUntil
}

function getSubscriptionDaysRemaining(subscription) {
  const expiry = getSubscriptionExpiry(subscription)
  const expiryTime = new Date(expiry).getTime()
  if (!Number.isFinite(expiryTime) || expiryTime <= Date.now()) return 0
  return Math.max(Math.ceil((expiryTime - Date.now()) / (24 * 60 * 60 * 1000)), 0)
}

// Text-based questions are delivered through campaigns, so an astrologer
// supports them once they own at least one campaign that is currently Active.
// Reuses the shared campaign status rule rather than introducing a second one.
function getTextQuestionAstrologerIds(campaigns) {
  const ids = new Set()
  campaigns.forEach((campaign) => {
    if (!campaign?.astrologerId) return
    if (getEffectiveCampaignStatus(campaign) !== 'Active') return
    ids.add(campaign.astrologerId)
  })
  return ids
}

function getInitials(name = '') {
  return String(name).split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function AstrologerAvatar({ name, size = 'h-14 w-14' }) {
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] font-bold text-white`}>
      {getInitials(name)}
    </div>
  )
}

const QUESTION_TYPE_LABELS = { General: 'General Question', Personal: 'Personal Question' }

// A campaign only sells the categories it configured; Open Question keeps the
// shared category list.
function getCategoryOptions(campaign, allCategories) {
  return campaign?.categories?.length ? campaign.categories.map((cat) => cat.name) : allCategories
}

export default function AskQuestion() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { campaigns, questions, purchasedSlots, subscriptions, followedAstrologerIds, openQuestionSettings, actions } = useAppData()
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
  // Step 1 of the Text-based Question flow: pick an astrologer before choosing
  // a purchased slot. Edit / view / discount deep-links skip it because they
  // already arrive with an astrologer and campaign resolved.
  const [showAstrologerStep, setShowAstrologerStep] = useState(true)
  const [chosenAstrologerId, setChosenAstrologerId] = useState('')
  const [formError, setFormError] = useState('')

  const subscribedAstrologerIds = useMemo(
    () => new Set(
      subscriptions
        .filter((subscription) => subscription.userId === currentUser?.id && getSubscriptionDaysRemaining(subscription) > 0)
        .map((subscription) => subscription.astrologerId)
        .filter(Boolean),
    ),
    [subscriptions, currentUser?.id],
  )

  const textQuestionAstrologerIds = useMemo(() => getTextQuestionAstrologerIds(campaigns), [campaigns])

  // Step 1: only subscribed astrologers who actually support Text-based
  // Questions can be selected for asking a question.
  const subscribedTextAstrologers = useMemo(() => {
    const seen = new Set()
    return mockAstrologers.filter((astrologer) => {
      if (seen.has(astrologer.id)) return false
      if (!subscribedAstrologerIds.has(astrologer.id)) return false
      if (!textQuestionAstrologerIds.has(astrologer.id)) return false
      seen.add(astrologer.id)
      return true
    })
  }, [subscribedAstrologerIds, textQuestionAstrologerIds])

  const subscriptionDaysByAstrologerId = useMemo(() => {
    const map = new Map()
    subscriptions
      .filter((subscription) => subscription.userId === currentUser?.id)
      .forEach((subscription) => {
        const days = getSubscriptionDaysRemaining(subscription)
        if (!map.has(subscription.astrologerId) || days > map.get(subscription.astrologerId)) {
          map.set(subscription.astrologerId, days)
        }
      })
    return map
  }, [subscriptions, currentUser?.id])

  // Step 2: everyone else is a recommendation only. They are never selectable
  // for asking a question - the user has to subscribe first.
  const recommendedAstrologers = useMemo(() => {
    const seen = new Set(subscribedTextAstrologers.map((astrologer) => astrologer.id))
    return getSuggestedAstrologers({
      followedAstrologerIds,
      subscribedAstrologerIds: Array.from(subscribedAstrologerIds),
    }).filter((astrologer) => {
      if (seen.has(astrologer.id)) return false
      seen.add(astrologer.id)
      return true
    })
  }, [followedAstrologerIds, subscribedAstrologerIds, subscribedTextAstrologers])

  const chosenAstrologer = useMemo(
    () => mockAstrologers.find((astrologer) => astrologer.id === chosenAstrologerId) || null,
    [chosenAstrologerId],
  )

  // "Continue" hands the chosen astrologer to the existing slot-picking step.
  const continueWithAstrologer = () => {
    if (!chosenAstrologer) return
    setSelectedAstrologerId(chosenAstrologer.id)
    setSelectedAstrologerName(chosenAstrologer.name)
    setShowAstrologerStep(false)
  }

  const viewingQuestionSubmittedAt = viewingQuestion?.submittedAt ? new Date(viewingQuestion.submittedAt).getTime() : null
  const viewingQuestionCampaign = viewingQuestion?.campaignId ? campaigns.find((c) => c.id === viewingQuestion.campaignId) : null
  const viewingQuestionAstrologer = viewingQuestion?.astrologerId ? mockAstrologers.find((a) => a.id === viewingQuestion.astrologerId) : null

  // Once an astrologer is chosen in step 1, the slot list narrows to that
  // astrologer so the next step is unambiguous.
  const purchasedCampaigns = useMemo(() => campaigns.map((campaign) => {
    const balance = purchasedSlots.find((slot) => slot.userId === currentUser?.id && slot.campaignId === campaign.id)
    if (!balance) return null
    if (chosenAstrologerId && balance.astrologerId !== chosenAstrologerId) return null
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
  }).filter(Boolean), [campaigns, currentUser?.id, purchasedSlots, chosenAstrologerId])

  // Step 2: the chosen astrologer's Active Astro Ledger campaigns, plus Open
  // Question. Both resolve their available question types and pricing from the
  // existing campaign / open-question configuration - nothing is hardcoded.
  const questionSources = useMemo(() => {
    if (!chosenAstrologerId) return []
    const sources = campaigns
      .filter((campaign) => campaign.astrologerId === chosenAstrologerId)
      .filter((campaign) => getEffectiveCampaignStatus(campaign) === 'Active')
      .map((campaign) => ({
        id: campaign.id,
        campaign,
        isOpenQuestion: false,
        name: campaign.name,
        subtitle: `${campaign.date} – ${campaign.endDate}`,
        description: campaign.shortDescription || campaign.description || '',
        offerEnabled: campaign.offerEnabled !== false,
        discountPercent: Number(campaign.discountPercent) || 0,
        questionTypes: getCampaignQuestionTypes(campaign),
      }))

    // Open Question is offered through the same General / Personal choice, so
    // it renders in the same list rather than becoming a separate flow.
    const openTypes = [
      openQuestionSettings.generalEnabled === false ? null : 'General',
      openQuestionSettings.personalEnabled === false ? null : 'Personal',
    ].filter(Boolean)
    if (openTypes.length) {
      sources.push({
        id: '',
        campaign: null,
        isOpenQuestion: true,
        name: 'Open Question',
        subtitle: 'Ask outside any campaign',
        description: 'Flexible questions answered without joining a campaign.',
        offerEnabled: Boolean(openQuestionSettings.offerEnabled),
        discountPercent: Number(openQuestionSettings.discountPercent) || 0,
        questionTypes: openTypes,
      })
    }
    return sources
  }, [campaigns, chosenAstrologerId, openQuestionSettings])

  const questionTypePrice = (source, type) => {
    const settings = source.isOpenQuestion ? openQuestionSettings : source.campaign
    return Number(type === 'General' ? settings?.generalPrice : settings?.personalPrice) || 0
  }

  const selectedCampaign = useMemo(() => campaigns.find((campaign) => campaign.id === selectedCampaignId) || null, [campaigns, selectedCampaignId])

  const activeDiscount = actions.getActiveDiscountQuestion(currentUser?.id, discountQuestionId)
  const discountActive = useDiscount && Boolean(activeDiscount)
  // A campaign only sells the categories it configured; Open Question keeps the
  // shared category list.
  const categoryOptions = getCategoryOptions(selectedCampaign, categories)
  const discountPrice = discountActive ? actions.getDiscountPrice(selectedCampaign?.id, category) : null
  const isQuestionFormOpen = showQuestionForm || isEditing || discountActive

  // Single source of truth for what the form is actually submitting: the chosen
  // astrologer, the campaign (or Open Question), the question type and the
  // resulting price/offer. Everything below reads from here.
  const selectedQuestionSummary = useMemo(() => {
    const type = questionType.startsWith('General') ? 'General' : 'Personal'
    if (discountActive) {
      return {
        astrologerName: selectedAstrologerName,
        sourceLabel: 'Discount Question',
        isOpenQuestion: false,
        typeLabel: QUESTION_TYPE_LABELS[type],
        price: discountPrice?.youPay ?? 0,
        offer: null,
      }
    }
    const settings = selectedCampaign || openQuestionSettings
    const price = Number(type === 'General' ? settings?.generalPrice : settings?.personalPrice) || 0
    const offerEnabled = selectedCampaign ? selectedCampaign.offerEnabled !== false : Boolean(openQuestionSettings.offerEnabled)
    const discountPercent = Number(selectedCampaign ? selectedCampaign.discountPercent : openQuestionSettings.discountPercent) || 0
    const preview = offerEnabled && discountPercent > 0 ? getDiscountPreview(price, discountPercent) : null
    return {
      astrologerName: selectedAstrologerName,
      sourceLabel: selectedCampaign ? selectedCampaign.name : 'Open Question',
      isOpenQuestion: !selectedCampaign,
      typeLabel: QUESTION_TYPE_LABELS[type],
      price,
      offer: preview ? { discountPercent: preview.discountPercent, discountAmount: preview.discountAmount, offerPrice: preview.offerPrice } : null,
    }
  }, [discountActive, discountPrice, questionType, selectedAstrologerName, selectedCampaign, openQuestionSettings])

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

  // Open Question carries no campaignId - that is exactly how the rest of the
  // app already models it (see getQuestionSourceLabel), so it needs no new flag.
  const selectPurchasedCampaign = (campaign, type, astrologerName, astrologerId) => {
    setSelectedCampaignId(campaign?.id || null)
    setSelectedAstrologerName(astrologerName || '')
    setSelectedAstrologerId(astrologerId || '')
    if (campaign?.id) actions.selectCampaign(campaign.id)
    // Start from a category the chosen campaign actually sells.
    const options = getCategoryOptions(campaign, categories)
    setCategory(options.includes(category) ? category : options[0])
    setQuestionType(type === 'General' ? 'General Question' : 'Individual (Personal) Question')
    setFormError('')
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

  // Matches the current campaign (or no campaign, for Open Question) against the
  // General/Individual question type actually selected in the form.
  const purchasedSlotForSelection = useMemo(() => purchasedSlotCards.find((slot) => {
    if ((slot.campaign?.id || null) !== (selectedCampaign?.id || null)) return false
    return slot.type === (questionType.startsWith('General') ? 'General' : 'Individual')
  }) || null, [purchasedSlotCards, selectedCampaign?.id, questionType])

  // Required-field checks for the question form. Uses the same rules the form
  // itself implies: a question must be written, and a personal question raised
  // for someone else needs that person's name (otherwise questionFor would be
  // recorded as the literal string "Others").
  const validateQuestionForm = () => {
    if (!question.trim()) return 'Enter your question before submitting.'
    if (question.trim().length > QUESTION_CHAR_LIMIT) return `Keep your question under ${QUESTION_CHAR_LIMIT} characters.`
    if (!questionType.startsWith('General') && raisedFor === 'Others' && !otherPersonName.trim()) return "Enter the person's name for a personal question."
    return ''
  }

  const handleSubmit = () => {
    if (!isEditing) {
      const validationError = validateQuestionForm()
      if (validationError) {
        setFormError(validationError)
        return
      }
    }
    setFormError('')
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
      // A purchased slot only applies when the user actually has a remaining
      // slot for this campaign *and* question type. Previously this keyed off
      // the form simply being open, so every campaign/Open Question selection
      // was recorded as "Purchased Slot" and consumed a slot that may not exist.
      const applyingPurchasedSlot = !applyingDiscount && Boolean(purchasedSlotForSelection)
      const purchaseType = applyingDiscount ? 'Paid' : applyingPurchasedSlot ? 'Purchased Slot' : (questionType.startsWith('General') ? 'Free' : 'Paid')
      const purchaseAmount = applyingPurchasedSlot ? 0 : (selectedQuestionSummary.offer?.offerPrice ?? selectedQuestionSummary.price)
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

  const showAstrologerChooser = showAstrologerStep && !isEditing && !isViewing && !discountActive

  return (
    <div>
      <PageHeader
        eyebrow="User portal"
        title={isEditing ? 'Edit Question' : 'Ask a Question'}
        showBack
        backTo={location.state?.from === 'dashboard' ? routes.dashboard : routes.trackQuestions}
        backLabel={location.state?.from === 'dashboard' ? 'Back to Dashboard' : 'Back'}
      />

      {showAstrologerChooser && (
        <>
          <Section title="Choose Astrologer" icon={UserRound}>
            {subscribedTextAstrologers.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {subscribedTextAstrologers.map((astrologer) => {
                    const isSelected = chosenAstrologerId === astrologer.id
                    return (
                      <Card key={astrologer.id} hover className={`flex h-full flex-col ${isSelected ? 'border-[color:var(--primary)]' : ''}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <AstrologerAvatar name={astrologer.name} />
                            <div>
                              <h2 className="text-lg font-bold">{astrologer.name}</h2>
                              <div className="muted" style={{ marginTop: 4 }}>{astrologer.specialization}</div>
                            </div>
                          </div>
                          {astrologer.availability && <StatusBadge label={astrologer.availability} />}
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
                          <Languages size={15} /> {astrologer.languages?.join(' · ') || 'Languages available on profile'}
                        </div>
                        <div className="mt-3 text-sm font-semibold text-[color:var(--accent-dark)]">
                          Subscription valid for {subscriptionDaysByAstrologerId.get(astrologer.id) || 0} more days
                        </div>
                        <button
                          type="button"
                          className={isSelected ? 'btn btn-primary mt-5 w-full' : 'btn btn-outline mt-5 w-full'}
                          onClick={() => setChosenAstrologerId(isSelected ? '' : astrologer.id)}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </Card>
                    )
                  })}
                </div>
                <div className="mt-5 flex justify-end">
                  <button type="button" className="btn btn-primary" disabled={!chosenAstrologer} onClick={continueWithAstrologer}>
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <Card>
                <div className="flex items-start gap-3">
                  <Sparkles size={20} className="text-[color:var(--primary)] mt-0.5" />
                  <div>
                    <div className="font-bold text-[color:var(--text-primary)]">No subscribed astrologer accepts Text-based Questions right now</div>
                    <div className="muted mt-1 text-sm">Subscribe to an astrologer who is running a text-based question campaign to ask a question.</div>
                  </div>
                </div>
              </Card>
            )}
          </Section>

          {recommendedAstrologers.length > 0 && (
            <Section title="Recommended Astrologers" icon={Sparkles} className="mt-6">
              <div className="muted mb-4 text-sm">Subscribe to one of these astrologers to unlock asking them a text-based question.</div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {recommendedAstrologers.map((astrologer) => (
                  <Card key={astrologer.id} className="flex h-full flex-col">
                    <div className="flex items-start gap-3">
                      <AstrologerAvatar name={astrologer.name} size="h-12 w-12" />
                      <div>
                        <h3 className="text-base font-bold">{astrologer.name}</h3>
                        <div className="muted text-sm">{astrologer.specialization}</div>
                      </div>
                    </div>
                    <div className="muted mt-3 flex flex-1 flex-col gap-1 text-sm">
                      <span>{astrologer.rating} · {astrologer.reviews || `${astrologer.subscribers || 0} subscribers`}</span>
                      <span className="flex items-center gap-2"><Languages size={14} /> {astrologer.languages?.join(' · ')}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline mt-5 w-full"
                      onClick={() => navigate(`${routes.base}/astrologer/${encodeURIComponent(astrologer.id)}`)}
                    >
                      Subscribe
                    </button>
                  </Card>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {!showAstrologerChooser && !isEditing && !discountActive && !isViewing && chosenAstrologer && (
        <Section
          title={`Campaigns · ${chosenAstrologer.name}`}
          icon={Layers}
          titleRight={<button type="button" className="btn btn-ghost" onClick={() => setShowAstrologerStep(true)}>Change Astrologer</button>}
        >
          {questionSources.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {questionSources.map((source) => {
                const preview = (type) => {
                  const price = questionTypePrice(source, type)
                  if (!source.offerEnabled || source.discountPercent <= 0) return { price }
                  return { price, ...getDiscountPreview(price, source.discountPercent) }
                }
                return (
                  <Card key={source.id || 'open-question'} hover className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold">{source.name}</h3>
                        <div className="muted mt-1 text-sm">{source.subtitle}</div>
                      </div>
                      <StatusBadge label={source.isOpenQuestion ? 'Open' : 'Active'} />
                    </div>
                    {source.description && <div className="muted mt-3 text-sm">{source.description}</div>}
                    <div className="mt-4 flex flex-1 flex-col gap-3">
                      {source.questionTypes.map((type) => {
                        const { price, discountPercent, discountAmount, offerPrice } = preview(type)
                        const hasOffer = Number.isFinite(discountPercent) && discountPercent > 0
                        return (
                          <div key={type} className="rounded-[14px] bg-[color:var(--surface-soft)] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold">{QUESTION_TYPE_LABELS[type]}</span>
                              <strong>₹{offerPrice ?? price}</strong>
                            </div>
                            {hasOffer && (
                              <div className="muted mt-1 text-xs">₹{price} · {discountPercent}% off · saves ₹{discountAmount}</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-5 grid gap-2">
                      {source.questionTypes.map((type) => (
                        <button
                          key={`${source.id || 'open-question'}-${type}`}
                          type="button"
                          className="btn btn-primary w-full"
                          onClick={() => selectPurchasedCampaign(source.campaign, type, chosenAstrologer.name, chosenAstrologer.id)}
                        >
                          Ask {QUESTION_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <div className="muted">{chosenAstrologer.name} has no active text-based question campaigns right now.</div>
              <button type="button" className="btn btn-outline mt-4" onClick={() => setShowAstrologerStep(true)}>
                Change Astrologer
              </button>
            </Card>
          )}
        </Section>
      )}

      {!showAstrologerChooser && !isEditing && !discountActive && !isViewing && (
        <Section title={chosenAstrologer ? `Purchased Question Slots · ${chosenAstrologer.name}` : 'Purchased Question Slots'}>
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
              <div className="muted">
                {chosenAstrologer
                  ? `You do not have any purchased question slots with ${chosenAstrologer.name} yet.`
                  : 'You do not have any purchased question slots yet.'}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {chosenAstrologer && (
                  <button type="button" className="btn btn-outline" onClick={() => setShowAstrologerStep(true)}>
                    Change Astrologer
                  </button>
                )}
                <button type="button" className="btn btn-primary" onClick={() => navigate(routes.purchasePackage)}>
                  Purchase Question Package
                </button>
              </div>
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
                <div className="muted" style={{ marginTop: 4 }}>
                  {[
                    selectedQuestionSummary.astrologerName,
                    selectedQuestionSummary.sourceLabel,
                    selectedQuestionSummary.typeLabel,
                  ].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedAstrologerName && <span className="section-title" style={{ marginBottom: 0 }}>{selectedAstrologerName}</span>}
                <button type="button" className="icon-btn" aria-label="Close ask question popup" onClick={closeQuestionForm}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="user-modal-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {!isEditing && (
                <Card>
                  <div className="section-title" style={{ fontSize: 15 }}>Your Selection</div>
                  <div style={{ display: 'grid', gap: 12, maxWidth: 420, marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Astrologer</span><strong>{selectedQuestionSummary.astrologerName || '—'}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Source</span><strong>{selectedQuestionSummary.sourceLabel}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Question Type</span><strong>{selectedQuestionSummary.typeLabel}</strong></div>
                    <div className="divider" style={{ margin: '4px 0' }} />
                    {purchasedSlotForSelection ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Purchased Slots Left</span><strong>{purchasedSlotForSelection.remaining}</strong></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}><span>You Pay</span><strong>₹0</strong></div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="muted">{selectedQuestionSummary.isOpenQuestion ? 'Open Question Price' : 'Campaign Price'}</span>
                          <strong>₹{selectedQuestionSummary.price}</strong>
                        </div>
                        {selectedQuestionSummary.offer && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Offer</span><strong>{selectedQuestionSummary.offer.discountPercent}% off</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Discount</span><strong>-₹{selectedQuestionSummary.offer.discountAmount}</strong></div>
                          </>
                        )}
                        <div className="divider" style={{ margin: '4px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}><span>You Pay</span><strong>₹{selectedQuestionSummary.offer?.offerPrice ?? selectedQuestionSummary.price}</strong></div>
                      </>
                    )}
                  </div>
                </Card>
              )}

              {formError && (
                <div role="alert" className="text-sm font-semibold text-[color:var(--red-600)]">{formError}</div>
              )}

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
