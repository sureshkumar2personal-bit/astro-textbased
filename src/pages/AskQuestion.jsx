import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { X, Clock, AlertTriangle, Languages, Layers, Sparkles, Star, Check, ChevronDown, ChevronUp, UserRound, CheckCircle2, FileText } from 'lucide-react'
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
import {
  HOROSCOPE_MODE_NONE,
  HOROSCOPE_MODE_SAVED,
  HOROSCOPE_MODE_UPLOAD,
  buildQuestionHoroscope,
  getDefaultHoroscopeMode,
  getSavedHoroscopeLabel,
  getSavedHoroscopeSummary,
  readSavedHoroscope,
  validateHoroscopeSelection,
} from '../utils/horoscope.js'
import { formatFileSize, validateAttachmentFile } from '../utils/answer.js'
import {
  QUESTION_CREDIT_AVAILABLE,
  QUESTION_CREDIT_WINDOW_DAYS,
  findQuestionCreditForSubmission,
  getQuestionCreditDaysRemaining,
  getQuestionCreditOfferLabel,
  getQuestionCreditsForUser,
} from '../utils/questionCredits.js'
import { paginateViewMore } from '../utils/pagination.js'
import './askquestion-astrologers.css'

const RAISED_FOR = ['Myself', 'Others']
const LANGUAGES = ['Tamil', 'Tanglish', 'English']
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

// The compact chooser offers the question type on the campaign card itself, so
// the label only has to say which type it is - General or Personal.
const FLOW_STEPS = ['Choose Astrologer', 'Campaign & Type', 'Question']
const questionTypePillLabel = (type) => (type === 'General' ? 'General' : 'Personal')
const questionTypePillHint = (type) => (type === 'General' ? 'Any topic' : 'About a person')

// Step 1 renders a short first page instead of every eligible astrologer. The
// counts stay driven by the existing lists, so the two sections grow and shrink
// with the data.
const SUBSCRIBED_INITIAL_COUNT = 6
const RECOMMENDED_INITIAL_COUNT = 6

// Presentation-only offer badge for a chooser card.
//
// The percentage is read from the astrologer existing Active campaign, and the
// "First Question" chip reflects an unused subscriber discount question. The
// fallback chip is a demo label for the demo UI. None of these values are read
// by the price / offer summary or by handleSubmit, so the badge never changes
// what the user is charged.
function getAstrologerOfferBadge(astrologerId, { campaigns = [], subscriptions = [], userId } = {}) {
  const hasDiscountQuestion = subscriptions.some((subscription) => (
    subscription.userId === userId
    && subscription.astrologerId === astrologerId
    && (subscription.discountQuestions || []).some((item) => item.status === 'Available')
  ))
  if (hasDiscountQuestion) {
    return { label: 'First Question', tone: 'first', hint: 'Your first subscriber question' }
  }

  const offer = campaigns.find((campaign) => (
    campaign.astrologerId === astrologerId
    && getEffectiveCampaignStatus(campaign) === 'Active'
    && campaign.offerEnabled !== false
    && (Number(campaign.discountPercent) || 0) > 0
  ))
  if (offer) {
    return {
      label: `${Number(offer.discountPercent)}% OFF`,
      tone: 'offer',
      hint: `Live offer on ${offer.name}`,
    }
  }

  return { label: 'Special Offer', tone: 'demo', hint: 'Demo badge for presentation only', demo: true }
}

// One compact chooser card, shared by the subscribed and recommended lists so
// heights, avatar size and action buttons line up row by row.
function AstrologerChoiceCard({ astrologer, badges = [], meta, actionLabel, selected = false, onAction }) {
  return (
    <article className={`aq-astro-card${selected ? ' is-selected' : ''}`}>
      <span className="aq-astro-card__accent" aria-hidden="true" />
      <div className="aq-astro-card__head">
        <AstrologerAvatar name={astrologer.name} size="h-11 w-11" />
        <div className="aq-astro-card__ident">
          <h3 className="aq-astro-card__name" title={astrologer.name}>{astrologer.name}</h3>
          <div className="aq-astro-card__spec" title={astrologer.specialization}>{astrologer.specialization}</div>
        </div>
      </div>
      <div className="aq-astro-card__badges">
        {badges.map((badge) => (
          <span
            key={badge.label}
            className={`aq-astro-card__badge aq-astro-card__badge--${badge.tone}`}
            title={badge.hint}
            data-demo-offer={badge.demo ? 'true' : undefined}
          >
            {badge.icon}
            {badge.label}
          </span>
        ))}
      </div>
      <div className="aq-astro-card__meta">{meta}</div>
      <button
        type="button"
        aria-pressed={selected}
        className={`btn ${selected ? 'btn-primary' : 'btn-outline'} aq-astro-card__action`}
        onClick={onAction}
      >
        {selected && <Check size={14} aria-hidden="true" />}
        {actionLabel}
      </button>
    </article>
  )
}

// The shortened flow is: astrologer -> campaign + question type -> form. The
// step rail makes that explicit so the removed intermediate step stays removed.
function FlowSteps({ current }) {
  return (
    <ol className="aq-flow-steps" aria-label="Ask a Question steps">
      {FLOW_STEPS.map((label, index) => {
        const step = index + 1
        const state = step === current ? ' is-active' : step < current ? ' is-done' : ''
        return (
          <li key={label} className={`aq-flow-step${state}`} aria-current={step === current ? 'step' : undefined}>
            <span className="aq-flow-step__num" aria-hidden="true">{step}</span>
            {label}
          </li>
        )
      })}
    </ol>
  )
}

// Campaign / Open Question + question type on one control. Selecting a type
// marks the choice on the card; the action bar underneath then offers the two
// purchase actions (Ask Now / Pay & Ask Later).
function QuestionTypePicker({ sourceName, types, renderPill }) {
  return (
    <div className="aq-type-picker">
      <div className="aq-type-picker__label">
        Question Type
        <span className="aq-type-picker__hint">Pick General or Personal</span>
      </div>
      <div className="aq-type-picker__options" role="group" aria-label={`${sourceName} question type`}>
        {types.map((type) => renderPill(type, questionTypePillLabel(type), questionTypePillHint(type)))}
      </div>
    </div>
  )
}

// Compact horoscope block shared by General and Personal questions.
//
// Optional by default: it only appears when the user asks for it, and the only
// thing it rejects is a choice that cannot be fulfilled (picking the saved
// horoscope with nothing saved, or picking upload without choosing a file).
function HoroscopeSection({ savedHoroscope, mode, uploadedFile, onSelectMode, onFileSelected, onRemoveFile, disabled = false }) {
  const hasSaved = Boolean(savedHoroscope?.exists)
  const isSaved = mode === HOROSCOPE_MODE_SAVED && hasSaved
  const isUpload = mode === HOROSCOPE_MODE_UPLOAD

  const options = [
    { value: HOROSCOPE_MODE_SAVED, label: 'Use Saved Horoscope', disabled: !hasSaved, hint: hasSaved ? getSavedHoroscopeLabel(savedHoroscope) : 'No saved horoscope' },
    { value: HOROSCOPE_MODE_UPLOAD, label: 'Upload Horoscope', disabled: false, hint: 'Attach a file for this question' },
    { value: HOROSCOPE_MODE_NONE, label: HOROSCOPE_MODE_NONE, disabled: false, hint: 'Not required for this question' },
  ]

  return (
    <Card>
      <div className="section-title" style={{ fontSize: 15 }}>Horoscope</div>
      <div className="muted" style={{ marginBottom: 12, marginTop: -6 }}>
        Optional. {hasSaved
          ? 'Use the horoscope already saved in your profile, or attach a new one for this question.'
          : 'No horoscope is saved in your profile yet. Save one in My Account, or attach a file for this question.'}
      </div>

      <div className="aq-horoscope-options" role="group" aria-label="Horoscope source">
        {options.map((option) => {
          const active = mode === option.value
          return (
            <button
              key={option.value}
              type="button"
              className={`aq-horoscope-option${active ? ' is-active' : ''}`}
              disabled={disabled || option.disabled}
              title={option.disabled ? 'Save your birth details in My Account to use this' : option.hint}
              onClick={() => onSelectMode(option.value)}
            >
              <span className="aq-horoscope-option__label">{option.label}</span>
              <span className="aq-horoscope-option__hint">{option.hint}</span>
            </button>
          )
        })}
      </div>

      {isSaved && (
        <div className="aq-horoscope-selected">
          <CheckCircle2 size={16} aria-hidden="true" />
          <div style={{ minWidth: 0 }}>
            <div className="aq-horoscope-selected__title">{getSavedHoroscopeLabel(savedHoroscope)}</div>
            <div className="aq-horoscope-selected__meta">{getSavedHoroscopeSummary(savedHoroscope)}</div>
          </div>
          <span className="aq-horoscope-selected__state">Selected</span>
        </div>
      )}

      {isUpload && (
        <div style={{ marginTop: 12 }}>
          {uploadedFile ? (
            <div className="aq-horoscope-selected">
              <FileText size={16} aria-hidden="true" />
              <div style={{ minWidth: 0 }}>
                <div className="aq-horoscope-selected__title">{uploadedFile.name}</div>
                <div className="aq-horoscope-selected__meta">{formatFileSize(uploadedFile.size)} · ready to send with this question</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onRemoveFile}>Remove</button>
            </div>
          ) : (
            <UploadField
              label="Upload horoscope file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onFileSelect={onFileSelected}
              hint="PDF or image, up to 5 MB. It is attached to this question only."
            />
          )}
        </div>
      )}
    </Card>
  )
}

// One compact type option: name, price and any live offer, all on the same pill.
// isSelected only mirrors the current choice so returning from the form never
// makes the user re-pick it.
function QuestionTypePill({ type, label, hint, price, offerText, isSelected = false, onSelect }) {
  return (
    <button
      type="button"
      className={`aq-type-pill${isSelected ? ' is-active' : ''}`}
      onClick={onSelect}
      data-question-type={type}
      aria-pressed={isSelected}
    >
      <span className="aq-type-pill__top">
        <span className="aq-type-pill__label">{label}</span>
        <span className="aq-type-pill__price">{price}</span>
      </span>
      <span className="aq-type-pill__bottom">
        <span>{hint}</span>
        {offerText ? <span className="aq-type-pill__offer">{offerText}</span> : null}
      </span>
    </button>
  )
}

// The two purchase actions for the chosen campaign + question type. Nothing is
// invented here: "Ask Now" runs the existing submit flow, and "Pay & Ask Later"
// stores the same paid amount as a credit on the existing purchased-slot record
// so the question itself can be written later.
function PurchaseActionBar({ summary, onAskNow, onPayLater, onCancel }) {
  return (
    <div className="aq-purchase-bar">
      <div className="aq-purchase-bar__summary">
        <span className="aq-purchase-bar__source">{summary.sourceName}</span>
        <span className="aq-purchase-bar__type">{summary.typeLabel}</span>
        <span className="aq-purchase-bar__price">You pay ₹{summary.paidPrice}</span>
        {summary.offerText ? <span className="aq-purchase-bar__offer">{summary.offerText}</span> : null}
        <span className="aq-purchase-bar__note">Ask now, or pay now and write the question later within {QUESTION_CREDIT_WINDOW_DAYS} days.</span>
      </div>
      <div className="aq-purchase-bar__actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-outline" onClick={onPayLater}>
          <Clock size={14} aria-hidden="true" />
          Pay &amp; Ask Later
        </button>
        <button type="button" className="btn btn-primary" onClick={onAskNow}>Ask Now</button>
      </div>
    </div>
  )
}

// View More toggle shared by both chooser lists. It only appears when the list
// is longer than the first page, and it never re-derives the list - it just
// reveals the records that were already there.
function ChooserViewMore({ total, shown, expanded, initialCount, onToggle }) {
  if (total <= initialCount) return null

  return (
    <div className="aq-astro-viewmore">
      <button type="button" className="btn btn-outline btn-sm" onClick={onToggle}>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Show Less' : `View More (${Math.max(total - shown, 0)} more)`}
      </button>
    </div>
  )
}

// A campaign only sells the categories it configured; Open Question keeps the
// shared category list.
function getCategoryOptions(campaign, allCategories) {
  return campaign?.categories?.length ? campaign.categories.map((cat) => cat.name) : allCategories
}

// `embedded` renders this page as the "Ask New" section of the Ask a Question
// dashboard, where the dashboard already shows the page header and the tabs.
export default function AskQuestion({ embedded = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { campaigns, questions, purchasedSlots, subscriptions, followedAstrologerIds, openQuestionSettings, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  // The user's own saved horoscope, read with the same precedence the profile
  // and horoscope pages use. No second horoscope store is introduced.
  const savedHoroscope = useMemo(() => readSavedHoroscope(currentUser), [currentUser])
  const editQuestionId = searchParams.get('editQuestionId')
  const viewQuestionId = searchParams.get('viewQuestionId')
  const useDiscount = searchParams.get('useDiscount') === '1'
  const discountQuestionId = searchParams.get('discountQuestionId')
  const requestedPriceType = searchParams.get('priceType')
  const redeemCreditId = searchParams.get('redeemCreditId')
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
  const [horoscope, setHoroscope] = useState(() => (
    editingQuestion?.horoscopeMode
      || getDefaultHoroscopeMode({ questionType, savedHoroscope })
  ))
  const [horoscopeFile, setHoroscopeFile] = useState(null)
  const [horoscopeError, setHoroscopeError] = useState('')
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
  // Campaign + question type picked on step 2, waiting for the user to choose
  // between "Ask Now" and "Pay & Ask Later". Only a reference to data that is
  // already loaded - no payment or question state is held here.
  const [pendingPurchase, setPendingPurchase] = useState(null)

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

  // Step 1 shows a short first page of each list with a View More toggle. The
  // eligible / recommended lists above are untouched - only the slice that gets
  // painted is limited, and the selection is stored by astrologer id, so it
  // survives expanding or collapsing either list.
  const [subscribedExpanded, setSubscribedExpanded] = useState(false)
  const [recommendedExpanded, setRecommendedExpanded] = useState(false)

  const offerBadgeByAstrologerId = useMemo(() => {
    const badges = new Map()
    subscribedTextAstrologers.forEach((astrologer) => {
      badges.set(
        astrologer.id,
        getAstrologerOfferBadge(astrologer.id, { campaigns, subscriptions, userId: currentUser?.id }),
      )
    })
    return badges
  }, [campaigns, currentUser?.id, subscribedTextAstrologers, subscriptions])

  const visibleSubscribedAstrologers = useMemo(
    () => paginateViewMore(subscribedTextAstrologers, { expanded: subscribedExpanded, pageSize: SUBSCRIBED_INITIAL_COUNT }),
    [subscribedExpanded, subscribedTextAstrologers],
  )

  const visibleRecommendedAstrologers = useMemo(
    () => paginateViewMore(recommendedAstrologers, { expanded: recommendedExpanded, pageSize: RECOMMENDED_INITIAL_COUNT }),
    [recommendedAstrologers, recommendedExpanded],
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

  // "Pay Now, Ask Later" credits for this user. A credit is a paid question that
  // has not been written yet. Declared before the restore effect below so it is
  // never read before it is initialised.
  const questionCredits = useMemo(
    () => getQuestionCreditsForUser(purchasedSlots, currentUser),
    [purchasedSlots, currentUser],
  )
  const redeemingCredit = useMemo(() => {
    if (!redeemCreditId) return null
    return questionCredits.find((credit) => credit.id === redeemCreditId && credit.status === QUESTION_CREDIT_AVAILABLE) || null
  }, [questionCredits, redeemCreditId])

  // "Ask Now" from an Available Question: restore the astrologer, the campaign
  // (or Open Question) and General/Personal from the purchased credit, then open
  // the existing question form. No payment is taken here - the credit already
  // paid for this question.
  const restoredCreditRef = useRef('')
  useEffect(() => {
    if (!redeemingCredit || restoredCreditRef.current === redeemingCredit.id) return
    const campaign = redeemingCredit.campaignId
      ? campaigns.find((item) => item.id === redeemingCredit.campaignId) || null
      : null
    const astrologer = mockAstrologers.find((item) => item.id === redeemingCredit.astrologerId) || null

    restoredCreditRef.current = redeemingCredit.id
    setSelectedCampaignId(redeemingCredit.campaignId || null)
    if (redeemingCredit.campaignId) actions.selectCampaign(redeemingCredit.campaignId)
    setSelectedAstrologerId(redeemingCredit.astrologerId || '')
    setSelectedAstrologerName(redeemingCredit.astrologerName || astrologer?.name || '')
    setQuestionType(redeemingCredit.questionType === 'General' ? 'General Question' : 'Individual (Personal) Question')
    const options = getCategoryOptions(campaign, categories)
    setCategory(options.includes(category) ? category : options[0])
    setFormError('')
    setShowAstrologerStep(false)
    setShowQuestionForm(true)
  }, [actions, campaigns, category, redeemingCredit])

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

  // Back to step 1. Any campaign + question type picked on step 2 is dropped, so a
// stale selection can never be paid for on the next astrologer.
  const changeAstrologer = () => {
    setShowAstrologerStep(true)
    setPendingPurchase(null)
  }

  // "Ask Now" from the purchase action bar: identical to clicking a purchased
  // slot today, it just opens the existing question form.
  const askNowWithPendingPurchase = () => {
    if (!pendingPurchase || !chosenAstrologer) return
    selectPurchasedCampaign(pendingPurchase.source.campaign, pendingPurchase.type, chosenAstrologer.name, chosenAstrologer.id)
    setPendingPurchase(null)
  }

  // "Pay & Ask Later": pay now, write the question later. The paid amount comes
  // from the same campaign/open-question settings and the same discount preview
  // the form uses, so nothing about pricing changes - it is only recorded on a
  // credit instead of on a question.
  const payNowAndAskLater = () => {
    if (!pendingPurchase || !chosenAstrologer) return
    const { source, type } = pendingPurchase
    const originalPrice = questionTypePrice(source, type)
    const hasOffer = source.offerEnabled && source.discountPercent > 0
    const preview = hasOffer ? getDiscountPreview(originalPrice, source.discountPercent) : null
    const subscriptionId = subscriptions.find((subscription) => (
      subscription.userId === currentUser?.id && subscription.astrologerId === chosenAstrologer.id
    ))?.id || ''

    const creditId = actions.purchaseQuestionCredit({
      userId: currentUser?.id,
      userEmail: currentUser?.email,
      astrologerId: chosenAstrologer.id,
      astrologerName: chosenAstrologer.name,
      subscriptionId,
      // Open Question keeps a null campaignId, the same convention a submitted
      // Open Question uses.
      campaignId: source.campaign?.id || null,
      campaignName: source.campaign?.name || null,
      questionType: type,
      originalPrice,
      paidPrice: preview ? preview.offerPrice : originalPrice,
      offerEnabled: source.offerEnabled,
      discountPercent: preview ? preview.discountPercent : 0,
      discountAmount: preview ? preview.discountAmount : 0,
    })

    if (!creditId) return
    setPendingPurchase(null)
    setSelectedCampaignId(source.campaign?.id || null)
    actions.selectCampaign(source.campaign?.id || null)
    setSubmitted(true)
    setShowQuestionForm(false)
    setSuccessMessage(`Payment successful. Your ${questionTypePillLabel(type).toLowerCase()} question with ${chosenAstrologer.name} is saved. Submit it from Available Questions within ${QUESTION_CREDIT_WINDOW_DAYS} days.`)
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

  // Matches the current selection against an already-paid credit so submitting
  // consumes it instead of charging again.
  const creditForSelection = useMemo(() => {
    const matched = redeemingCredit
      || findQuestionCreditForSubmission(questionCredits, {
        userId: currentUser?.id,
        campaignId: selectedCampaign?.id || null,
        questionType: questionType.startsWith('General') ? 'General' : 'Personal',
      })
    return matched || null
  }, [currentUser?.id, questionCredits, questionType, redeemingCredit, selectedCampaign?.id])
  // A submission covered by an already-paid credit must not be charged again, so
  // the form shows the paid amount and "You Pay ₹0" instead of a fresh price.
  const isPaidByCredit = Boolean(creditForSelection)
  const isPaidBySlot = !isPaidByCredit && Boolean(purchasedSlotForSelection)

  // Horoscope: optional for both question types. The default follows the
  // existing rules - a General question continues without one, a Personal
  // question uses the saved horoscope when there is one.
  const selectHoroscopeMode = (mode) => {
    setHoroscope(mode)
    setHoroscopeError('')
    if (mode !== HOROSCOPE_MODE_UPLOAD) setHoroscopeFile(null)
  }

  // Safety net for a record that already claims the saved horoscope (edit mode,
  // or a saved horoscope removed while the form was open): the question must
  // never claim a horoscope that does not exist.
  useEffect(() => {
    if (horoscope === HOROSCOPE_MODE_SAVED && !savedHoroscope?.exists) setHoroscope(HOROSCOPE_MODE_NONE)
  }, [horoscope, savedHoroscope])

  const handleHoroscopeFile = (file) => {
    if (!file) {
      setHoroscopeFile(null)
      return
    }
    // Same validation the answer attachment panel uses.
    const result = validateAttachmentFile(file, 'image')
    const pdfResult = result.ok ? result : validateAttachmentFile(file, 'pdf')
    if (!pdfResult.ok) {
      setHoroscopeError(pdfResult.error)
      return
    }
    const kind = result.ok ? 'image' : 'pdf'
    setHoroscopeError('')
    const reader = new FileReader()
    reader.onload = () => setHoroscopeFile({
      id: `horoscope-${Date.now()}`,
      kind,
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl: reader.result,
    })
    reader.readAsDataURL(file)
  }

  const buildHoroscopePayload = () => buildQuestionHoroscope({
    mode: horoscope,
    savedHoroscope,
    uploadedFile: horoscopeFile,
    userId: currentUser?.id || '',
  })

  // Required-field checks for the question form. Uses the same rules the form
  // itself implies: a question must be written, and a personal question raised
  // for someone else needs that person's name (otherwise questionFor would be
  // recorded as the literal string "Others").
  const validateQuestionForm = () => {
    if (!question.trim()) return 'Enter your question before submitting.'
    if (question.trim().length > QUESTION_CHAR_LIMIT) return `Keep your question under ${QUESTION_CHAR_LIMIT} characters.`
    if (!questionType.startsWith('General') && raisedFor === 'Others' && !otherPersonName.trim()) return "Enter the person's name for a personal question."
    // Horoscope stays optional; only an impossible explicit choice is rejected.
    return validateHoroscopeSelection({ mode: horoscope, savedHoroscope, uploadedFile: horoscopeFile })
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
    setHoroscopeError('')
    const horoscopePayload = buildHoroscopePayload()
    if (isEditing) {
      actions.editQuestion(editingQuestion.id, {
        type: questionType.startsWith('General') ? 'General' : 'Personal',
        category,
        questionFor: raisedFor === 'Others' && otherPersonName.trim() ? otherPersonName.trim() : raisedFor,
        language,
        question,
        horoscopeMode: horoscopePayload.horoscopeMode,
        horoscopeSource: horoscopePayload.horoscopeSource,
        horoscopeReference: horoscopePayload.horoscopeReference,
        horoscopeAttachment: horoscopePayload.horoscopeAttachment,
        customer: horoscopePayload.customer || editingQuestion.customer || null,
        attachments: horoscopePayload.attachmentNames.length
          ? horoscopePayload.attachmentNames
          : editingQuestion.attachments || [],
        purchaseType: questionType.startsWith('General') ? 'Free' : 'Paid',
      })
      setSuccessMessage('Your question has been updated successfully.')
    } else {
      const applyingDiscount = discountActive && Boolean(discountPrice)
      // A purchased slot only applies when the user actually has a remaining
      // slot for this campaign *and* question type. Previously this keyed off
      // the form simply being open, so every campaign/Open Question selection
      // was recorded as "Purchased Slot" and consumed a slot that may not exist.
      // A "Pay Now, Ask Later" credit counts the same way: the payment already
      // happened, so this submission only fills in the question.
      const applyingPurchasedSlot = !applyingDiscount && (isPaidByCredit || isPaidBySlot)
      const purchaseType = applyingDiscount ? 'Paid' : applyingPurchasedSlot ? 'Purchased Slot' : (questionType.startsWith('General') ? 'Free' : 'Paid')
      const purchaseAmount = applyingPurchasedSlot ? 0 : (selectedQuestionSummary.offer?.offerPrice ?? selectedQuestionSummary.price)
      if (applyingDiscount) {
        actions.useDiscountQuestion(currentUser?.id, discountQuestionId)
        setSuccessMessage('Your Discount Question was used. The question was submitted at the discounted price.')
      } else if (isPaidByCredit) {
        setSuccessMessage('Your question has been submitted using your purchased question.')
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
        horoscopeMode: horoscopePayload.horoscopeMode,
        horoscopeSource: horoscopePayload.horoscopeSource,
        horoscopeReference: horoscopePayload.horoscopeReference,
        horoscopeAttachment: horoscopePayload.horoscopeAttachment,
        customer: horoscopePayload.customer,
        attachmentNames: horoscopePayload.attachmentNames,
        purchaseType,
        purchaseAmount,
        slotType: applyingPurchasedSlot ? (questionType.startsWith('General') ? 'General' : 'Personal') : undefined,
        // The credit this submission consumed. createQuestion marks it Used and
        // stamps the resulting questionId; it is left untouched when absent.
        creditId: isPaidByCredit ? creditForSelection.id : undefined,
        // Kept separate from campaignId so an Open Question credit (no campaign)
        // still finds its own record.
        creditCampaignId: selectedCampaign?.id || null,
      })
      if (isPaidByCredit) setSearchParams({}, { replace: true })
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
      {!embedded && (
        <PageHeader
          eyebrow="User portal"
          title={isEditing ? 'Edit Question' : 'Ask a Question'}
          showBack
          backTo={location.state?.from === 'dashboard' ? routes.dashboard : routes.trackQuestions}
          backLabel={location.state?.from === 'dashboard' ? 'Back to Dashboard' : 'Back'}
        />
      )}

      {!isEditing && !discountActive && !isViewing && (
        <FlowSteps current={showAstrologerChooser ? 1 : isQuestionFormOpen ? 3 : 2} />
      )}

      {showAstrologerChooser && (
        <>
          <Section title="Choose Astrologer" icon={UserRound}>
            {subscribedTextAstrologers.length > 0 ? (
              <>
                <div className="aq-astro-chooser-head">
                  <div className="muted text-sm">Astrologers you are subscribed to and who accept Text-based Questions.</div>
                  <span className="aq-astro-count">Showing {visibleSubscribedAstrologers.length} of {subscribedTextAstrologers.length}</span>
                </div>
                <div className="aq-astro-grid">
                  {visibleSubscribedAstrologers.map((astrologer) => {
                    const isSelected = chosenAstrologerId === astrologer.id
                    const subscriptionDays = subscriptionDaysByAstrologerId.get(astrologer.id) || 0
                    return (
                      <AstrologerChoiceCard
                        key={astrologer.id}
                        astrologer={astrologer}
                        selected={isSelected}
                        actionLabel={isSelected ? 'Selected' : 'Select'}
                        badges={[
                          offerBadgeByAstrologerId.get(astrologer.id),
                          astrologer.availability ? { label: astrologer.availability, tone: 'soft', hint: 'Current availability' } : null,
                        ].filter(Boolean)}
                        meta={(
                          <>
                            <Clock size={13} aria-hidden="true" />
                            <span className="truncate">Subscription valid for {subscriptionDays} more days</span>
                          </>
                        )}
                        onAction={() => setChosenAstrologerId(isSelected ? '' : astrologer.id)}
                      />
                    )
                  })}
                </div>
                <ChooserViewMore
                  total={subscribedTextAstrologers.length}
                  shown={visibleSubscribedAstrologers.length}
                  expanded={subscribedExpanded}
                  initialCount={SUBSCRIBED_INITIAL_COUNT}
                  onToggle={() => setSubscribedExpanded((value) => !value)}
                />
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
              <div className="aq-astro-chooser-head">
                <div className="muted text-sm">Subscribe to one of these astrologers to unlock asking them a text-based question.</div>
                <span className="aq-astro-count">Showing {visibleRecommendedAstrologers.length} of {recommendedAstrologers.length}</span>
              </div>
              <div className="aq-astro-grid">
                {visibleRecommendedAstrologers.map((astrologer) => (
                  // Recommended astrologers are never selectable for asking a
                  // question: only the Subscribe action is interactive here.
                  <AstrologerChoiceCard
                    key={astrologer.id}
                    astrologer={astrologer}
                    actionLabel="Subscribe"
                    badges={[
                      { label: `${astrologer.rating || '—'}`, tone: 'soft', icon: <Star size={11} aria-hidden="true" />, hint: astrologer.reviews || 'Rating' },
                      { label: `${astrologer.experience || 'Verified'} experience`, tone: 'neutral', hint: 'Astrologer experience' },
                    ]}
                    meta={(
                      <>
                        <Languages size={13} aria-hidden="true" />
                        <span className="truncate">{astrologer.languages?.join(' · ') || 'Languages available on profile'}</span>
                      </>
                    )}
                    onAction={() => navigate(`${routes.base}/astrologer/${encodeURIComponent(astrologer.id)}`)}
                  />
                ))}
              </div>
              <ChooserViewMore
                total={recommendedAstrologers.length}
                shown={visibleRecommendedAstrologers.length}
                expanded={recommendedExpanded}
                initialCount={RECOMMENDED_INITIAL_COUNT}
                onToggle={() => setRecommendedExpanded((value) => !value)}
              />
            </Section>
          )}
        </>
      )}

      {!showAstrologerChooser && !isEditing && !discountActive && !isViewing && chosenAstrologer && (
        <Section
          title={`Campaigns · ${chosenAstrologer.name}`}
          icon={Layers}
          titleRight={<button type="button" className="btn btn-ghost" onClick={() => changeAstrologer()}>Change Astrologer</button>}
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
                    {/* Campaign + question type live on the same card. Choosing a
                        type continues straight into the question form. */}
                    <div className="mt-4 flex flex-1 flex-col">
                      <QuestionTypePicker
                        sourceName={source.name}
                        types={source.questionTypes}
                        renderPill={(type, label, hint) => {
                          const { price, discountPercent, discountAmount, offerPrice } = preview(type)
                          const hasOffer = Number.isFinite(discountPercent) && discountPercent > 0
                          return (
                            <QuestionTypePill
                              key={type}
                              type={type}
                              label={label}
                              hint={hint}
                              price={`₹${offerPrice ?? price}`}
                              offerText={hasOffer ? `${discountPercent}% off · saves ₹${discountAmount}` : ''}
                              isSelected={pendingPurchase?.source === source && pendingPurchase?.type === type}
                              onSelect={() => setPendingPurchase({ source, type })}
                            />
                          )
                        }}
                      />
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <div className="muted">{chosenAstrologer.name} has no active text-based question campaigns right now.</div>
              <button type="button" className="btn btn-outline mt-4" onClick={() => changeAstrologer()}>
                Change Astrologer
              </button>
            </Card>
          )}

          {pendingPurchase && (() => {
            const { source, type } = pendingPurchase
            const originalPrice = questionTypePrice(source, type)
            const hasOffer = source.offerEnabled && source.discountPercent > 0
            const preview = hasOffer ? getDiscountPreview(originalPrice, source.discountPercent) : null
            return (
              <PurchaseActionBar
                summary={{
                  sourceName: source.name,
                  typeLabel: questionTypePillLabel(type),
                  paidPrice: (preview ? preview.offerPrice : originalPrice).toLocaleString('en-IN'),
                  offerText: preview ? `${preview.discountPercent}% OFF · saves ₹${preview.discountAmount}` : '',
                }}
                onAskNow={askNowWithPendingPurchase}
                onPayLater={payNowAndAskLater}
                onCancel={() => setPendingPurchase(null)}
              />
            )
          })()}
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
                    <span className="rounded-full bg-[color:var(--primary-bg)] px-3 py-1 text-xs font-bold text-[color:var(--primary)]">{questionTypePillLabel(slot.type)}</span>
                  </div>
                  <div className="muted mt-1 text-sm">{campaign.name}</div>
                  <div className="muted mt-3 flex flex-1 flex-col gap-2 text-sm">
                    <span>{campaign.date} – {campaign.endDate}</span>
                    <span>Purchased: {slot.purchased} slots</span>
                    <span>Used: {slot.used} · Remaining: {slot.remaining}</span>
                  </div>
                  <div className="mt-4">
                    <QuestionTypePicker
                      sourceName={campaign.name}
                      types={[slot.type]}
                      renderPill={(type, label, hint) => (
                        <QuestionTypePill
                          key={type}
                          type={type}
                          label={label}
                          hint={hint}
                          price={`${slot.remaining} left`}
                          isSelected={Boolean(isQuestionFormOpen
                            && purchasedSlotForSelection?.campaign?.id === campaign.id
                            && purchasedSlotForSelection.type === slot.type)}
                          onSelect={() => selectPurchasedCampaign(campaign, slot.type, slot.astrologerName, slot.astrologerId)}
                        />
                      )}
                    />
                  </div>
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
                  <button type="button" className="btn btn-outline" onClick={() => changeAstrologer()}>
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
                    {creditForSelection ? (
                      // Paid earlier through "Pay & Ask Later": the amount was
                      // already paid, so nothing is charged again here.
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="muted">Purchased Question</span>
                          <strong>₹{creditForSelection.paidPrice?.toLocaleString('en-IN')}</strong>
                        </div>
                        {getQuestionCreditOfferLabel(creditForSelection) ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="muted">Offer</span>
                            <strong>{getQuestionCreditOfferLabel(creditForSelection)}</strong>
                          </div>
                        ) : null}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="muted">Expires in</span>
                          <strong>{getQuestionCreditDaysRemaining(creditForSelection)} days</strong>
                        </div>
                        <div className="divider" style={{ margin: '4px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}><span>You Pay</span><strong>₹0</strong></div>
                      </>
                    ) : purchasedSlotForSelection ? (
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

              {horoscopeError && (
                <div role="alert" className="text-sm font-semibold text-[color:var(--red-600)]">{horoscopeError}</div>
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
                <>
                  <Card>
                    <div className="section-title" style={{ fontSize: 15 }}>General Question</div>
                    <div className="muted" style={{ marginBottom: 12 }}>Simple layout for general questions. Add the minimum required details and submit.</div>
                    <div className="field-group"><label className="field-label-top">Preferred Language</label><select className="select-input" value={language} onChange={(event) => setLanguage(event.target.value)}>{LANGUAGES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                    <VoiceTextArea placeholder="Type your general question here, or tap the mic to speak it..." value={question} onChange={setQuestion} maxLength={QUESTION_CHAR_LIMIT} lang={SPEECH_LANG_BY_LANGUAGE[language]} />
                  </Card>
                  <HoroscopeSection
                    savedHoroscope={savedHoroscope}
                    mode={horoscope}
                    uploadedFile={horoscopeFile}
                    onSelectMode={selectHoroscopeMode}
                    onFileSelected={handleHoroscopeFile}
                    onRemoveFile={() => { setHoroscopeFile(null); setHoroscopeError('') }}
                  />
                </>
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
                    <VoiceTextArea placeholder="Describe your question in detail, or tap the mic to speak it..." value={question} onChange={setQuestion} maxLength={QUESTION_CHAR_LIMIT} lang={SPEECH_LANG_BY_LANGUAGE[language]} />
                  </Card>
                  <HoroscopeSection
                    savedHoroscope={savedHoroscope}
                    mode={horoscope}
                    uploadedFile={horoscopeFile}
                    onSelectMode={selectHoroscopeMode}
                    onFileSelected={handleHoroscopeFile}
                    onRemoveFile={() => { setHoroscopeFile(null); setHoroscopeError('') }}
                  />
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
