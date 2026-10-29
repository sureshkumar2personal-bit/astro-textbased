import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { X, Clock, AlertTriangle, Languages, Layers, Sparkles, Star, Check, ChevronDown, ChevronUp, UserRound, CheckCircle2, Heart, GraduationCap, Briefcase, Activity, Home, Sun, Baby, Package } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import QuestionFormModal from '../components/user/QuestionFormModal.jsx'
import Section from '../components/ui/Section.jsx'
import CampaignCard, {
  CampaignEmptyState,
  CampaignStatusChip,
  OfferChip,
} from '../components/campaigns/CampaignCard.jsx'
import { campaignCardStatusStyle, campaignCardToneStyle, inr } from '../components/campaigns/campaignCardTokens.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import { categories } from '../data/mockData.js'
import { getSuggestedAstrologers, mockAstrologers } from '../data/notificationData.js'
import { consultationAstrologers } from '../data/consultationAstrologers.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { getCampaignQuestionTypes, getEffectiveCampaignStatus, getQuestionPricing } from '../utils/questions.js'
import {
  HOROSCOPE_MODE_NONE,
  HOROSCOPE_MODE_SAVED,
  HOROSCOPE_MODE_UPLOAD,
  buildQuestionHoroscope,
  getDefaultHoroscopeMode,
  readSavedHoroscope,
  validateHoroscopeSelection,
} from '../utils/horoscope.js'
import { validateAttachmentFile } from '../utils/answer.js'
import {
  QUESTION_CREDIT_AVAILABLE,
  QUESTION_CREDIT_WINDOW_DAYS,
  findQuestionCreditForSubmission,
  getQuestionCreditsForUser,
} from '../utils/questionCredits.js'
import { getSlotPricingView } from '../utils/purchasedSlots.js'
import { paginateViewMore } from '../utils/pagination.js'
import './askquestion-astrologers.css'

const QUESTION_CHAR_LIMIT = 500
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

const ASTROLOGER_PHOTOS = new Map(consultationAstrologers.map((astrologer) => [astrologer.id, astrologer.profileImage]))

function AstrologerAvatar({ astrologer, size = 'h-14 w-14' }) {
  const name = astrologer?.name || ''
  const photo = astrologer?.photo || astrologer?.profileImage || ASTROLOGER_PHOTOS.get(astrologer?.id)
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] font-bold text-white`}>
      {photo ? <img src={photo} alt={`${name} profile`} className="h-full w-full object-cover" /> : getInitials(name)}
    </div>
  )
}

const QUESTION_TYPE_LABELS = { General: 'General Question', Personal: 'Personal Question' }

// The compact chooser offers the question type on the campaign card itself, so
// the label only has to say which type it is - General or Personal.
const FLOW_STEPS = ['Choose Astrologer', 'Campaign & Type', 'Question']
const questionTypePillLabel = (type) => (type === 'General' ? 'General' : 'Personal')
// Concise helper text that keeps the two question types meaningful. A campaign
// is the topic (Marriage, Career, Health...); General vs Personal only describes
// how the question is asked, so neither hint relies on a topic list.
const questionTypePillHint = (type) => (type === 'General'
  ? 'Ask a general question about this topic.'
  : 'Ask a question about your own circumstances related to this topic.')

// The Ask Anything (Open Question) option is topic-free: it must not reuse the
// campaign hint ("about this topic") because there is no topic to ask about.
// The label and wording stay distinct from campaign General / Personal while
// still offering the same two ways of asking.
const ASK_ANYTHING_LABEL = 'Ask Anything'
const openQuestionPillHint = (type) => (type === 'General'
  ? 'Ask any question about any topic.'
  : 'Ask a question about your own circumstances, on any topic.')

// ---- Demo topic campaigns for the Campaign Type step -----------------------
//
// Presentation/demo data only. Each chosen astrologer is stamped with the same
// set of realistic topic campaigns so the page always shows ~7-8 campaigns with
// distinct titles, descriptions, colours and offers, instead of the handful of
// real Active campaigns the seeded store happens to hold. Every generated
// record is a full campaign object with real pricing and offer rules, so
// "Ask Now" and "Pay & Ask Later" charge exactly what the card shows - but the
// records are never written to the shared campaigns state, purchased slots,
// credits or wallets, and they carry no purchased quantities.
const DEMO_TOPIC_CAMPAIGNS = [
  {
    key: 'marriage',
    name: 'Marriage & Relationships',
    topics: ['marriage', 'relationship'],
    tone: 'rose',
    priority: 'High',
    icon: Heart,
    categories: [
      { name: 'Marriage', normalPrice: 200, discountPercent: 70, compulsoryQuestions: 150 },
      { name: 'Love', normalPrice: 200, discountPercent: 90, compulsoryQuestions: 150 },
    ],
    shortDescription: 'Live marriage timing, own-compatibility and partner questions.',
    description: 'Ask about marriage timing, partner compatibility, relationship challenges and Manglik dosha.',
    generalPrice: 100,
    personalPrice: 250,
    offerPercent: 60,
  },
  {
    key: 'career',
    name: 'Career & Education',
    topics: ['career', 'education'],
    tone: 'violet',
    priority: 'High',
    icon: GraduationCap,
    categories: [
      { name: 'Career', normalPrice: 200, discountPercent: 80, compulsoryQuestions: 150 },
      { name: 'Study', normalPrice: 200, discountPercent: 40, compulsoryQuestions: 150 },
    ],
    shortDescription: 'Live job, promotion, exam and admission guidance.',
    description: 'Ask about job changes, promotions, exam results, admissions and study focus.',
    generalPrice: 120,
    personalPrice: 275,
    offerPercent: 0,
  },
  {
    key: 'business',
    name: 'Business & Finance',
    topics: ['business', 'finance', 'wealth'],
    tone: 'gold',
    priority: 'Medium',
    icon: Briefcase,
    categories: [{ name: 'Finance', normalPrice: 200, discountPercent: 60, compulsoryQuestions: 150 }],
    shortDescription: 'Live wealth periods, investments and income questions.',
    description: 'Ask about wealth periods, safe investments, clearing debts and income growth.',
    generalPrice: 110,
    personalPrice: 260,
    offerPercent: 0,
  },
  {
    key: 'health',
    name: 'Health & Wellbeing',
    topics: ['health', 'wellbeing'],
    tone: 'green',
    priority: 'High',
    icon: Activity,
    categories: [{ name: 'Health', normalPrice: 200, discountPercent: 70, compulsoryQuestions: 150 }],
    shortDescription: 'Live health, dosha and wellbeing questions for subscribers.',
    description: 'Ask about recurring health issues, dosha balance, diet and remedies.',
    generalPrice: 100,
    personalPrice: 250,
    offerPercent: 90,
  },
  {
    key: 'love',
    name: 'Love & Compatibility',
    topics: ['love', 'compatibility'],
    tone: 'orange',
    priority: 'Medium',
    icon: Heart,
    categories: [{ name: 'Love', normalPrice: 200, discountPercent: 90, compulsoryQuestions: 150 }],
    shortDescription: 'Live love compatibility and commitment timing questions.',
    description: 'Ask about love compatibility, commitment timing and moving on from past relationships.',
    generalPrice: 130,
    personalPrice: 300,
    offerPercent: 0,
  },
  {
    key: 'property',
    name: 'Property & Home',
    topics: ['property', 'home', 'vastu'],
    tone: 'sky',
    priority: 'Medium',
    icon: Home,
    categories: [{ name: 'Property', normalPrice: 200, discountPercent: 60, compulsoryQuestions: 150 }],
    shortDescription: 'Live property, construction and Vastu questions.',
    description: 'Ask about property purchases, selling at the right time and Vastu remedies.',
    generalPrice: 110,
    personalPrice: 260,
    offerPercent: 0,
  },
  {
    key: 'family',
    name: 'Family & Children',
    topics: ['family', 'child', 'children'],
    tone: 'teal',
    priority: 'Medium',
    icon: Baby,
    categories: [
      { name: 'Family', normalPrice: 200, discountPercent: 50, compulsoryQuestions: 150 },
      { name: 'Health', normalPrice: 200, discountPercent: 70, compulsoryQuestions: 150 },
    ],
    shortDescription: 'Live timing-of-children, studies and family harmony questions.',
    description: "Ask about the right time for a child, children's studies and health, and family harmony.",
    generalPrice: 100,
    personalPrice: 240,
    offerPercent: 75,
  },
  {
    key: 'growth',
    name: 'Personal Growth & Self-Development',
    topics: ['personal', 'growth', 'self'],
    tone: 'slate',
    priority: 'Low',
    icon: Sun,
    categories: [
      { name: 'Career', normalPrice: 200, discountPercent: 80, compulsoryQuestions: 150 },
      { name: 'Study', normalPrice: 200, discountPercent: 40, compulsoryQuestions: 150 },
    ],
    shortDescription: 'Live guidance for life direction and self-improvement.',
    description: 'Ask about your strengths, life direction, habits and making steady personal progress.',
    generalPrice: 100,
    personalPrice: 220,
    offerPercent: 0,
  },
]

const DEMO_TOPIC_CAMPAIGN_DATE = (() => {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return { month, date: iso(first), endDate: iso(last) }
})()

// Builds the full campaign record for one topic template. The astrologer's name
// and specialisation are woven into the description so the same template reads
// differently per astrologer while staying clearly built from demo data.
function buildDemoTopicCampaign(astrologer, template, index) {
  const Icon = template.icon
  return {
    id: `demo-topic-${astrologer.id}-${template.key}-${index}`,
    name: template.name,
    month: DEMO_TOPIC_CAMPAIGN_DATE.month,
    date: DEMO_TOPIC_CAMPAIGN_DATE.date,
    endDate: DEMO_TOPIC_CAMPAIGN_DATE.endDate,
    priority: template.priority,
    status: 'Active',
    categories: template.categories,
    shortDescription: `${template.shortDescription} ${astrologer.name} answers with ${astrologer.specialization}.`,
    description: `${template.description} ${astrologer.name} answers with ${astrologer.specialization}.`,
    questionTypes: ['General', 'Personal'],
    offerEnabled: Number(template.offerPercent) > 0,
    discountPercent: Number(template.offerPercent) || 0,
    generalOffer: Number(template.offerPercent) > 0,
    personalOffer: Number(template.offerPercent) > 0,
    generalPrice: template.generalPrice,
    personalPrice: template.personalPrice,
    packagePrice: 2000,
    purchasedGeneral: 0,
    purchasedPersonal: 0,
    totalLimit: 30,
    generalLimit: 18,
    personalLimit: 12,
    astrologerId: astrologer.id,
    icon: Icon,
    tone: template.tone,
  }
}

// Full template set per astrologer, keyed once at module scope. Used both to
// paint the Campaign Type step and to resolve a demo campaign id for view /
// edit / credit flows (a real user may open one of these later).
const DEMO_TOPIC_CAMPAIGNS_BY_ASTROLOGER = new Map(
  mockAstrologers.map((astrologer) => [
    astrologer.id,
    DEMO_TOPIC_CAMPAIGNS.map((template, index) => buildDemoTopicCampaign(astrologer, template, index)),
  ]),
)
const DEMO_TOPIC_CAMPAIGN_BY_ID = new Map(
  [...DEMO_TOPIC_CAMPAIGNS_BY_ASTROLOGER.values()]
    .flat()
    .map((campaign) => [campaign.id, campaign]),
)

function friendlyTopicWords(campaignName = '') {
  return String(campaignName).toLowerCase().split(/\W+/).filter((word) => word.length > 2)
}

// A template campaign is skipped when a real Active campaign for the same
// astrologer already covers its topic, so the page never shows two cards for
// the same subject (for example the seeded "Marriage & Relationships" and the
// identical demo template).
function demoTopicOverlapsReal(allTemplates, realCampaigns) {
  const realWords = new Set(realCampaigns.flatMap((campaign) => friendlyTopicWords(campaign.name)))
  return allTemplates.filter((campaign) => {
    const template = DEMO_TOPIC_CAMPAIGNS.find((item) =>
      campaign.id.includes(`-${item.key}-`),
    )
    return !template || !template.topics.some((topic) => realWords.has(topic))
  })
}

// Selects the demo campaigns shown for an astrologer: the full template set less
// any topic a real Active campaign already owns, capped so real + demo stays
// around 7-8 cards per page.
function pickDemoTopicCampaigns(astrologerId, realActiveCampaigns) {
  const all = (DEMO_TOPIC_CAMPAIGNS_BY_ASTROLOGER.get(astrologerId) || []).slice()
  const allowed = 8 - realActiveCampaigns.length
  if (allowed <= 0) return []
  const withoutOverlap = demoTopicOverlapsReal(all, realActiveCampaigns)
  return withoutOverlap.slice(0, allowed)
}

// ---- Demo question packages (Purchased Question Slots section) -------------
//
// Presentation/demo offers only. Each package shows clear quantities and a price
// computed from General + Personal per-question rates, and the only action it
// wires up is the existing purchase flow - it never fabricates slot balances,
// credits or payments, so nothing here can be spent as a fake slot.
const DEMO_QUESTION_PACKAGES = [
  {
    id: 'demo-package-starter',
    name: 'Starter Package',
    tone: 'green',
    icon: Package,
    generalQty: 5,
    personalQty: 2,
    generalPrice: 100,
    personalPrice: 250,
    tagline: 'For trying a new astrologer',
    description: 'A light starter pack of bought questions before you commit further.',
  },
  {
    id: 'demo-package-popular',
    name: 'Popular Package',
    tone: 'orange',
    icon: Package,
    generalQty: 10,
    personalQty: 5,
    generalPrice: 110,
    personalPrice: 260,
    tagline: 'Best value for regular questions',
    description: 'The most-picked mix for people who ask across more than one topic.',
  },
  {
    id: 'demo-package-family',
    name: 'Family Package',
    tone: 'violet',
    icon: Package,
    generalQty: 15,
    personalQty: 8,
    generalPrice: 100,
    personalPrice: 250,
    tagline: 'For guidance on loved ones',
    description: 'Extra personal questions for timelines about your family and children.',
  },
]

// Step 1 shows at least eight subscribed cards before the View More toggle, so
// the two sections grow and shrink with the data but never open on an empty or
// cramped first page.
const SUBSCRIBED_INITIAL_COUNT = 8
const RECOMMENDED_INITIAL_COUNT = 6

// Presentation-only first-question offers for the demo. These percentages are
// deliberately varied so cards do not all repeat one number, and they are never
// read by the price / offer summary or by handleSubmit - they only paint the
// chooser badge, exactly like the "Special Offer" placeholder that came before.
const DEMO_FIRST_QUESTION_OFFERS = [60, 75, 80, 90]
function getDemoFirstQuestionOffer(demoIndex = 0) {
  const index = Math.abs(Number(demoIndex) || 0) % DEMO_FIRST_QUESTION_OFFERS.length
  return DEMO_FIRST_QUESTION_OFFERS[index]
}

// Presentation-only offer badge for a chooser card.
//
// It always resolves to a percentage on the first question. Real percentage
// data wins where it exists (an Active campaign offer, or an unused subscriber
// discount question), otherwise a varied demo percentage is used. None of these
// values are read by the price / offer summary or by handleSubmit, so the badge
// never changes what the user is charged, and the "First Question" wording
// keeps it clear the discount is a one-time offer, not a repeatable one.
function getAstrologerOfferBadge(astrologerId, { campaigns = [], subscriptions = [], userId, demoIndex = 0 } = {}) {
  const hasDiscountQuestion = subscriptions.some((subscription) => (
    subscription.userId === userId
    && subscription.astrologerId === astrologerId
    && (subscription.discountQuestions || []).some((item) => item.status === 'Available')
  ))

  const offer = campaigns.find((campaign) => (
    campaign.astrologerId === astrologerId
    && getEffectiveCampaignStatus(campaign) === 'Active'
    && campaign.offerEnabled !== false
    && (Number(campaign.discountPercent) || 0) > 0
  ))

  const offerPercent = offer ? Number(offer.discountPercent) : getDemoFirstQuestionOffer(demoIndex)
  const label = `${offerPercent}% OFF on First Question`

  if (hasDiscountQuestion) {
    return {
      label,
      tone: 'first',
      hint: offer
        ? `First-question offer · live on ${offer.name}`
        : `${offerPercent}% off your first question with this astrologer · demo offer, presentation only`,
      demo: offer ? undefined : true,
    }
  }

  if (offer) {
    return {
      label,
      tone: 'offer',
      hint: `First-question offer · live on ${offer.name}`,
    }
  }

  return {
    label,
    tone: 'demo',
    hint: `${offerPercent}% off your first question with this astrologer · demo offer, presentation only`,
    demo: true,
  }
}

// One compact chooser card, shared by the subscribed and recommended lists so
// heights, avatar size and action buttons line up row by row.
function AstrologerChoiceCard({ astrologer, badges = [], meta, actionLabel, selected = false, subscribed = false, onAction, onCardClick, cardAriaLabel }) {
  const clickableCard = Boolean(onCardClick)
  const handleCardKeyDown = (event) => {
    if (!clickableCard) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onCardClick(event)
    }
  }
  return (
    <article
      className={`aq-astro-card${selected ? ' is-selected' : ''}${clickableCard ? ' is-clickable' : ''}${subscribed ? ' is-subscribed' : ''}${String(astrologer.availability || '').toLowerCase() === 'offline' ? ' is-offline' : ''}`}
      tabIndex={clickableCard ? 0 : undefined}
      role={clickableCard ? 'button' : undefined}
      aria-label={clickableCard ? cardAriaLabel : undefined}
      onClick={clickableCard ? onCardClick : undefined}
      onKeyDown={handleCardKeyDown}
    >
      <span className="aq-astro-card__accent" aria-hidden="true" />
      {subscribed && <span className="aq-astro-card__ribbon">Subscribed</span>}
      <div className="aq-astro-card__head">
        <AstrologerAvatar astrologer={astrologer} size="h-11 w-11" />
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
      {actionLabel ? (
        <button
          type="button"
          aria-pressed={selected}
          className={`btn ${selected ? 'btn-primary' : 'btn-outline'} aq-astro-card__action`}
          onClick={(event) => {
            if (clickableCard) event.stopPropagation()
            if (onAction) onAction(event)
          }}
        >
          {selected && <Check size={14} aria-hidden="true" />}
          {actionLabel}
        </button>
      ) : null}
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

// One selectable box for a question type, using the modern option-block look
// from the Astrologer Create Campaign design: a light surface by default, then
// the primary border, tinted background, soft shadow and filled checkbox once
// selected. isSelected only mirrors the current choice so returning from the
// form never makes the user re-pick it.
function QuestionTypeBox({ type, label, hint, price, offerText, isSelected = false, onSelect }) {
  return (
    <button
      type="button"
      className={`aq-type-box${isSelected ? ' is-active' : ''}`}
      onClick={onSelect}
      data-question-type={type}
      aria-pressed={isSelected}
    >
      <span className="aq-type-box__head">
        <span className="option-mark checkbox" aria-hidden="true">{isSelected ? '✓' : null}</span>
        <span className="aq-type-box__title">{label} Question</span>
        <span className="aq-type-box__price">{price}</span>
      </span>
      <span className="aq-type-box__hint">{hint}</span>
      {offerText ? <span className="aq-type-box__offer">{offerText}</span> : null}
    </button>
  )
}

// The two purchase actions for the chosen campaign + question type. Nothing is
// invented here: "Ask This Question" runs the existing submit flow, and
// "Pay & Ask Later" stores the same paid amount as a credit on the existing
// purchased-slot record so the question itself can be written later.
//
// The bar is sticky while the campaign cards are being browsed, so the action
// for the current selection is always visible without scrolling through the
// whole grid. The selection is a single source + question type, and the bar
// summarises both (plus the offer) so multiple cards can never leave the
// purchase state ambiguous.
function PurchaseActionBar({ summary, onAskNow, onPayLater, onCancel }) {
  return (
    <div className="aq-purchase-bar">
      <div className="aq-purchase-bar__summary">
        <span className="aq-purchase-bar__selected">Selected</span>
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
        <button type="button" className="btn btn-primary" onClick={onAskNow}>
          <CheckCircle2 size={14} aria-hidden="true" />
          Ask This Question
        </button>
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
  // UI-only demo payment flow for the Ask This Question form: an interstitial
  // "Review & Payment" screen that never charges real money. null = not active,
  // 'review' = payment breakdown shown, 'success' = demo payment simulated.
  const [demoPaymentStep, setDemoPaymentStep] = useState(null)
  // Which purchase the demo payment is confirming: 'ask' completes a question
  // now, 'later' records a paid-but-unwritten credit. Both go through the same
  // explicit Review & Payment confirmation, so neither can finalise silently.
  const [demoPaymentIntent, setDemoPaymentIntent] = useState('ask')
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
    return mockAstrologers
      .filter((astrologer) => {
        if (seen.has(astrologer.id)) return false
        if (!subscribedAstrologerIds.has(astrologer.id)) return false
        if (!textQuestionAstrologerIds.has(astrologer.id)) return false
        seen.add(astrologer.id)
        return true
      })
      .sort((a, b) => {
        const aOnline = String(a?.availability || '').trim().toLowerCase() === 'online'
        const bOnline = String(b?.availability || '').trim().toLowerCase() === 'online'
        if (aOnline === bOnline) return 0
        return aOnline ? -1 : 1
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

  // First-question offer badges for both lists. The index drives the varied
  // demo percentage fallback; the value is presentation-only either way.
  const offerBadgeByAstrologerId = useMemo(() => {
    const badges = new Map()
    subscribedTextAstrologers.forEach((astrologer, index) => {
      badges.set(
        astrologer.id,
        getAstrologerOfferBadge(astrologer.id, { campaigns, subscriptions, userId: currentUser?.id, demoIndex: index }),
      )
    })
    recommendedAstrologers.forEach((astrologer, index) => {
      if (badges.has(astrologer.id)) return
      badges.set(
        astrologer.id,
        getAstrologerOfferBadge(astrologer.id, { campaigns, subscriptions, userId: currentUser?.id, demoIndex: index }),
      )
    })
    return badges
  }, [campaigns, currentUser?.id, recommendedAstrologers, subscribedTextAstrologers, subscriptions])

  const visibleSubscribedAstrologers = useMemo(
    () => paginateViewMore(subscribedTextAstrologers, { expanded: subscribedExpanded, pageSize: SUBSCRIBED_INITIAL_COUNT }),
    [subscribedExpanded, subscribedTextAstrologers],
  )

  const visibleRecommendedAstrologers = useMemo(
    () => paginateViewMore(recommendedAstrologers, { expanded: recommendedExpanded, pageSize: RECOMMENDED_INITIAL_COUNT }),
    [recommendedAstrologers, recommendedExpanded],
  )

  // Clicking a subscribed astrologer card goes straight to that astrologer's
  // campaign page - the intermediate Select/Continue step is gone, but the
  // chosen id is still handed to the slot filter exactly as before.
  const continueWithAstrologer = (astrologer) => {
    const astro = astrologer || chosenAstrologer
    if (!astro) return
    setChosenAstrologerId(astro.id)
    setSelectedAstrologerId(astro.id)
    setSelectedAstrologerName(astro.name)
    setShowAstrologerStep(false)
  }

  // Resolves a campaign id to a real (shared) campaign or a presentation-only
  // demo topic campaign. The demo records stay out of the shared campaigns state
  // but a question created from one still needs its campaign resolved for view /
  // edit / credit flows, so the lookup falls back to the demo map by id.
  const resolveCampaignById = useCallback(
    (id) => {
      if (!id) return null
      const real = campaigns.find((campaign) => campaign.id === id)
      return real || DEMO_TOPIC_CAMPAIGN_BY_ID.get(id) || null
    },
    [campaigns],
  )

  const viewingQuestionSubmittedAt = viewingQuestion?.submittedAt ? new Date(viewingQuestion.submittedAt).getTime() : null
  const viewingQuestionCampaign = useMemo(
    () => (viewingQuestion?.campaignId ? resolveCampaignById(viewingQuestion.campaignId) : null),
    [resolveCampaignById, viewingQuestion?.campaignId],
  )
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
        astrologerName: balance.astrologerName || astrologer?.name || 'Astrologer',
        // The recorded receipt for this package. Null on legacy records that
        // predate pricing, so the UI can say "not recorded" instead of ₹0.
        pricing: getSlotPricingView(balance),
        demo: Boolean(balance.demo) || Boolean(balance.pricing?.isDemo),
      },
    }
  }).filter(Boolean), [campaigns, currentUser?.id, purchasedSlots, chosenAstrologerId])

  // Step 2: the chosen astrologer's Active Astro Ledger campaigns plus a
  // presentation-only set of demo topic campaigns, so every astrologer shows a
  // realistic 7-8 topied cards. Open Question is offered through the same
  // General / Personal choice, so it renders in the same list rather than
  // becoming a separate flow. All sources resolve their question types and
  // pricing from the existing campaign / open-question configuration.
  const questionSources = useMemo(() => {
    if (!chosenAstrologerId) return []
    const realActive = campaigns
      .filter((campaign) => campaign.astrologerId === chosenAstrologerId)
      .filter((campaign) => getEffectiveCampaignStatus(campaign) === 'Active')
      .map((campaign) => ({
        id: campaign.id,
        campaign,
        isOpenQuestion: false,
        isDemoCampaign: false,
        name: campaign.name,
        subtitle: `${campaign.date} – ${campaign.endDate}`,
        description: campaign.shortDescription || campaign.description || '',
        offerEnabled: campaign.offerEnabled !== false,
        discountPercent: Number(campaign.discountPercent) || 0,
        questionTypes: getCampaignQuestionTypes(campaign),
      }))

    const demoCampaigns = pickDemoTopicCampaigns(chosenAstrologerId, realActive.map((source) => source.campaign))
    const sources = [
      ...realActive,
      ...demoCampaigns.map((campaign) => ({
        id: campaign.id,
        campaign,
        isOpenQuestion: false,
        isDemoCampaign: true,
        name: campaign.name,
        subtitle: `${campaign.date} – ${campaign.endDate}`,
        description: campaign.shortDescription || campaign.description || '',
        offerEnabled: campaign.offerEnabled !== false,
        discountPercent: Number(campaign.discountPercent) || 0,
        questionTypes: getCampaignQuestionTypes(campaign),
      })),
    ]

    const openTypes = [
      openQuestionSettings.generalEnabled === false ? null : 'General',
      openQuestionSettings.personalEnabled === false ? null : 'Personal',
    ].filter(Boolean)
    if (openTypes.length) {
      sources.push({
        id: '',
        campaign: null,
        isOpenQuestion: true,
        name: ASK_ANYTHING_LABEL,
        subtitle: 'Any topic · no campaign needed',
        description: 'Ask any question about any topic.',
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

  const selectedCampaign = useMemo(() => resolveCampaignById(selectedCampaignId), [resolveCampaignById, selectedCampaignId])

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
    const pricing = getQuestionPricing({ price, discountPercent, offerEnabled })
    return {
      astrologerName: selectedAstrologerName,
      sourceLabel: selectedCampaign ? selectedCampaign.name : ASK_ANYTHING_LABEL,
      isOpenQuestion: !selectedCampaign,
      typeLabel: QUESTION_TYPE_LABELS[type],
      price: pricing.originalPrice,
      offer: pricing.discountAmount > 0
        ? { discountPercent: pricing.discountPercent, discountAmount: pricing.discountAmount, offerPrice: pricing.payablePrice }
        : null,
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
      ? resolveCampaignById(redeemingCredit.campaignId) || null
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
  }, [actions, category, redeemingCredit, resolveCampaignById])

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

  // "Ask This Question" from the purchase action bar: pay first. It commits the
  // selection and opens the Review & Payment screen immediately - the question
  // form is not opened until the demo payment is confirmed. pendingPurchase is
  // kept so closing the review returns to the same highlighted campaign and
  // question type.
  const askNowWithPendingPurchase = () => {
    if (!pendingPurchase || !chosenAstrologer) return
    const { source, type } = pendingPurchase
    applyQuestionSelection(source.campaign, type, chosenAstrologer.name, chosenAstrologer.id)
    setDemoPaymentIntent('ask')
    beginDemoPayment()
  }

  // "Pay & Ask Later": pay now, write the question later. Like "Ask This
  // Question" it goes through the same explicit Review & Payment confirmation,
  // so no credit is recorded until the user actually confirms the demo payment.
  const payNowAndAskLater = () => {
    if (!pendingPurchase || !chosenAstrologer) return
    const { source, type } = pendingPurchase
    applyQuestionSelection(source.campaign, type, chosenAstrologer.name, chosenAstrologer.id)
    setDemoPaymentIntent('later')
    beginDemoPayment()
  }

  // Records the paid-but-unwritten question as a credit on the existing
  // purchased-slot record. Called only after the demo payment is confirmed, so
  // payment status and entitlement status stay in step.
  const createQuestionCredit = (source, type, astrologer) => {
    if (!source || !type || !astrologer) return null
    const pricing = getQuestionPricing({
      price: questionTypePrice(source, type),
      discountPercent: source.discountPercent,
      offerEnabled: source.offerEnabled,
    })
    const subscriptionId = subscriptions.find((subscription) => (
      subscription.userId === currentUser?.id && subscription.astrologerId === astrologer.id
    ))?.id || ''

    return actions.purchaseQuestionCredit({
      userId: currentUser?.id,
      userEmail: currentUser?.email,
      astrologerId: astrologer.id,
      astrologerName: astrologer.name,
      subscriptionId,
      // Open Question keeps a null campaignId, the same convention a submitted
      // Open Question uses.
      campaignId: source.campaign?.id || null,
      campaignName: source.campaign?.name || null,
      questionType: type,
      originalPrice: pricing.originalPrice,
      paidPrice: pricing.payablePrice,
      offerEnabled: source.offerEnabled !== false,
      discountPercent: pricing.discountPercent,
      discountAmount: pricing.discountAmount,
    })
  }

  // Open Question carries no campaignId - that is exactly how the rest of the
  // app already models it (see getQuestionSourceLabel), so it needs no new flag.
  // This commits the campaign/type to state without opening the form, so the
  // demo-payment path can show Review & Payment first.
  const applyQuestionSelection = (campaign, type, astrologerName, astrologerId) => {
    setSelectedCampaignId(campaign?.id || null)
    setSelectedAstrologerName(astrologerName || '')
    setSelectedAstrologerId(astrologerId || '')
    if (campaign?.id) actions.selectCampaign(campaign.id)
    // Start from a category the chosen campaign actually sells.
    const options = getCategoryOptions(campaign, categories)
    setCategory(options.includes(category) ? category : options[0])
    setQuestionType(type === 'General' ? 'General Question' : 'Individual (Personal) Question')
    setFormError('')
    setSubmitted(false)
  }

  // Purchased slots are already paid for, so picking one still opens the
  // question form directly and skips the demo payment step.
  const selectPurchasedCampaign = (campaign, type, astrologerName, astrologerId) => {
    applyQuestionSelection(campaign, type, astrologerName, astrologerId)
    setShowQuestionForm(true)
  }

  const purchasedSlotCards = useMemo(() => purchasedCampaigns.flatMap((campaign) => {
    const balance = campaign.slotBalance
    const cards = []
    const generalRemaining = Math.max(balance.generalPurchased - balance.generalUsed, 0)
    const personalRemaining = Math.max(balance.personalPurchased - balance.personalUsed, 0)
    const shared = {
      pricing: balance.pricing,
      demo: balance.demo,
      campaignName: campaign.name,
      astrologerName: balance.astrologerName,
      astrologerId: balance.astrologerId,
      schedule: `${campaign.date} – ${campaign.endDate}`,
    }
    if (generalRemaining > 0) cards.push({ campaign, type: 'General', purchased: balance.generalPurchased, used: balance.generalUsed, remaining: generalRemaining, ...shared })
    if (personalRemaining > 0) cards.push({ campaign, type: 'Individual', purchased: balance.personalPurchased, used: balance.personalUsed, remaining: personalRemaining, ...shared })
    return cards
  }), [purchasedCampaigns])

  // Matches the current campaign (or no campaign, for Open Question) against the
  // General/Individual question type actually selected in the form.
  const purchasedSlotForSelection = useMemo(() => purchasedSlotCards.find((slot) => {
    if ((slot.campaign?.id || null) !== (selectedCampaign?.id || null)) return false
    return slot.type === (questionType.startsWith('General') ? 'General' : 'Individual')
  }) || null, [purchasedSlotCards, selectedCampaign?.id, questionType])

  // "Use a Slot" from the consolidated Purchase Slots view deep-links here with
  // the campaign + type. It reuses selectPurchasedCampaign, so the slot is
  // consumed by the normal submit path - no separate redemption logic.
  const useSlotCampaignId = searchParams.get('useSlotCampaignId')
  const useSlotType = searchParams.get('useSlotType')
  const appliedSlotLinkRef = useRef('')
  useEffect(() => {
    if (!useSlotCampaignId || !useSlotType) return
    const linkKey = `${useSlotCampaignId}:${useSlotType}`
    if (appliedSlotLinkRef.current === linkKey) return
    const slot = purchasedSlotCards.find((card) => (
      (card.campaign?.id || '') === useSlotCampaignId && card.type === useSlotType
    ))
    if (!slot) return
    appliedSlotLinkRef.current = linkKey
    setChosenAstrologerId(slot.astrologerId)
    setSelectedAstrologerId(slot.astrologerId)
    setSelectedAstrologerName(slot.astrologerName)
    setShowAstrologerStep(false)
    selectPurchasedCampaign(slot.campaign, slot.type, slot.astrologerName, slot.astrologerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasedSlotCards, useSlotCampaignId, useSlotType])

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

  // "Ask This Question" entry point: opens the demo Review & Payment screen for
  // the selection already committed by applyQuestionSelection. The question has
  // not been written yet, so there is nothing to validate here. Editing, an
  // applied Discount Question, and already-paid paths (Pay & Ask Later credit or
  // a purchased slot) never reach this screen - their form submits directly.
  // This is a UI simulation only - no payment gateway and no real money.
  const beginDemoPayment = () => {
    setFormError('')
    setHoroscopeError('')
    setDemoPaymentStep('review')
  }

  // Confirm the demo payment. For "Ask This Question" this only advances to the
  // success screen; the question is not submitted until the user writes it. For
  // "Pay & Ask Later" this is the moment the paid-but-unwritten credit is
  // recorded - never before, so an abandoned checkout leaves no purchase.
  const confirmDemoPayment = () => {
    if (demoPaymentIntent === 'later') {
      const creditId = createQuestionCredit(pendingPurchase?.source, pendingPurchase?.type, chosenAstrologer)
      if (!creditId) return
      setPendingPurchase(null)
      setDemoPaymentStep('success')
      return
    }
    setDemoPaymentStep('success')
  }

  // Close the demo payment screen and return to the untouched form.
  const closeDemoPayment = () => setDemoPaymentStep(null)

  // Demo payment confirmed: open the question form so the user can write the
  // question, pick a language and attach a horoscope. Nothing is submitted here -
  // the normal "Submit Question" button runs handleSubmit exactly once when the
  // user is ready, so no empty question is ever created.
  const openQuestionFormAfterDemoPayment = () => {
    setDemoPaymentStep(null)
    setShowQuestionForm(true)
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
                    const subscriptionDays = subscriptionDaysByAstrologerId.get(astrologer.id) || 0
                    return (
                      <AstrologerChoiceCard
                        key={astrologer.id}
                        astrologer={astrologer}
                        subscribed
                        cardAriaLabel={`Ask a question with ${astrologer.name} (subscribed)`}
                        onCardClick={() => continueWithAstrologer(astrologer)}
                        badges={[
                          offerBadgeByAstrologerId.get(astrologer.id),
                          astrologer.rating ? { label: astrologer.rating, tone: 'soft', icon: <Star size={11} aria-hidden="true" />, hint: astrologer.reviews || 'Rating' } : null,
                          astrologer.availability ? { label: astrologer.availability, tone: 'neutral', hint: 'Current availability' } : null,
                        ].filter(Boolean)}
                        meta={(
                          <>
                            <Clock size={13} aria-hidden="true" />
                            <span className="truncate">Subscription valid for {subscriptionDays} more days</span>
                          </>
                        )}
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
                  // Recommended astrologers are not selectable for asking a
                  // question: the card browses their profile, and only the
                  // Subscribe action begins the subscription flow.
                  <AstrologerChoiceCard
                    key={astrologer.id}
                    astrologer={astrologer}
                    cardAriaLabel={`View ${astrologer.name}'s profile`}
                    onCardClick={() => navigate(`${routes.base}/astrologer/${encodeURIComponent(astrologer.id)}`)}
                    actionLabel="Subscribe"
                    badges={[
                      offerBadgeByAstrologerId.get(astrologer.id),
                      { label: `${astrologer.rating || '—'}`, tone: 'soft', icon: <Star size={11} aria-hidden="true" />, hint: astrologer.reviews || 'Rating' },
                      { label: `${astrologer.experience || 'Verified'} experience`, tone: 'neutral', hint: 'Astrologer experience' },
                    ].filter(Boolean)}
                    meta={(
                      <>
                        <Languages size={13} aria-hidden="true" />
                        <span className="truncate">{astrologer.languages?.join(' · ') || 'Languages available on profile'}</span>
                      </>
                    )}
                    onAction={() => navigate(`${routes.base}/astrologer/${encodeURIComponent(astrologer.id)}?subscribe=1`)}
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
            <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {questionSources.map((source) => {
                const preview = (type) => {
                  const pricing = getQuestionPricing({
                    price: questionTypePrice(source, type),
                    discountPercent: source.discountPercent,
                    offerEnabled: source.offerEnabled,
                  })
                  return {
                    price: pricing.originalPrice,
                    discountPercent: pricing.discountPercent,
                    discountAmount: pricing.discountAmount,
                    offerPrice: pricing.payablePrice,
                  }
                }
                const status = source.isOpenQuestion ? 'Open' : 'Active'
                const tone = source.isDemoCampaign ? source.campaign.tone : undefined
                const cardStyle = tone
                  ? campaignCardToneStyle(tone) || campaignCardStatusStyle(status)
                  : campaignCardStatusStyle(status)
                const chips = [
                  ...source.questionTypes.map((type) => (
                    <CampaignStatusChip
                      key={type}
                      style={{ background: cardStyle.softBg, color: cardStyle.accent, border: `1px solid ${cardStyle.border}` }}
                    >
                      {questionTypePillLabel(type)}
                    </CampaignStatusChip>
                  )),
                  ...(source.offerEnabled && source.discountPercent > 0
                    ? [<OfferChip key="offer">First Question Offer · {source.discountPercent}% OFF</OfferChip>]
                    : []),
                ]
                const details = [
                  ...(source.questionTypes.includes('General')
                    ? [{ label: 'General price', value: `₹${inr(questionTypePrice(source, 'General'))}` }]
                    : []),
                  ...(source.questionTypes.includes('Personal')
                    ? [{ label: 'Personal price', value: `₹${inr(questionTypePrice(source, 'Personal'))}` }]
                    : []),
                  { label: 'Schedule', value: source.isOpenQuestion ? 'Any time' : source.subtitle },
                ]
                return (
                  <CampaignCard
                    key={source.id || 'open-question'}
                    status={status}
                    tone={tone}
                    icon={source.isOpenQuestion
                      ? <Sparkles size={22} aria-hidden="true" />
                      : source.campaign?.icon
                        ? <source.campaign.icon size={22} aria-hidden="true" />
                        : undefined}
                    name={source.name}
                    subtitle={source.isOpenQuestion
                      ? source.subtitle
                      : source.campaign?.priority ? `Priority · ${source.campaign.priority}` : undefined}
                    description={source.description}
                    chips={chips}
                    details={details}
                    footer={(
                      <QuestionTypePicker
                        sourceName={source.name}
                        types={source.questionTypes}
                        renderPill={(type, label, hint) => {
                          const { price, discountPercent, discountAmount, offerPrice } = preview(type)
                          const hasOffer = Number.isFinite(discountPercent) && discountPercent > 0
                          return (
                            <QuestionTypeBox
                              key={type}
                              type={type}
                              label={label}
                              hint={source.isOpenQuestion ? openQuestionPillHint(type) : hint}
                              price={`₹${offerPrice ?? price}`}
                              offerText={hasOffer ? `${discountPercent}% off · saves ₹${discountAmount}` : ''}
                              isSelected={pendingPurchase?.source === source && pendingPurchase?.type === type}
                              onSelect={() => setPendingPurchase({ source, type })}
                            />
                          )
                        }}
                      />
                    )}
                  />
                )
              })}
            </div>
          ) : (
            <CampaignEmptyState
              icon={<Layers size={26} aria-hidden="true" />}
              title="No active campaign"
              message={`${chosenAstrologer.name} has no active text-based question campaigns right now.`}
              action={(
                <button type="button" className="btn btn-outline" onClick={() => changeAstrologer()}>
                  Change Astrologer
                </button>
              )}
            />
          )}

          {pendingPurchase && (() => {
            const { source, type } = pendingPurchase
            const pricing = getQuestionPricing({
              price: questionTypePrice(source, type),
              discountPercent: source.discountPercent,
              offerEnabled: source.offerEnabled,
            })
            return (
              <PurchaseActionBar
                summary={{
                  sourceName: source.name,
                  typeLabel: questionTypePillLabel(type),
                  paidPrice: pricing.payablePrice.toLocaleString('en-IN'),
                  offerText: pricing.discountAmount > 0
                    ? `${pricing.discountPercent}% OFF · saves ₹${pricing.discountAmount}`
                    : '',
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
        <Section>
          {/* Presentation-only demo packages: clear quantities and a price
              computed from the per-question rates, with the only action wired to
              the existing purchase flow. Selecting one never creates a slot,
              credit or payment - it only opens the purchase page. */}
          <div className="aq-packages">
            <div className="aq-packages__label">
              Available Question Packages
              <span className="aq-packages__note">Demo offers · buy through the existing purchase flow</span>
            </div>
            <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {DEMO_QUESTION_PACKAGES.map((pkg) => {
                const pkgStyle = campaignCardToneStyle(pkg.tone) || campaignCardStatusStyle('Active')
                const generalTotal = pkg.generalQty * pkg.generalPrice
                const personalTotal = pkg.personalQty * pkg.personalPrice
                const total = generalTotal + personalTotal
                const Icon = pkg.icon
                return (
                  <CampaignCard
                    key={pkg.id}
                    status="Active"
                    tone={pkg.tone}
                    icon={<Icon size={22} aria-hidden="true" />}
                    name={pkg.name}
                    subtitle={pkg.tagline}
                    description={pkg.description}
                    chips={[
                      <CampaignStatusChip key="general" style={{ background: pkgStyle.softBg, color: pkgStyle.accent, border: `1px solid ${pkgStyle.border}` }}>
                        {pkg.generalQty} General
                      </CampaignStatusChip>,
                      <CampaignStatusChip key="personal" style={{ background: pkgStyle.softBg, color: pkgStyle.accent, border: `1px solid ${pkgStyle.border}` }}>
                        {pkg.personalQty} Personal
                      </CampaignStatusChip>,
                    ]}
                    details={[
                      { label: 'General total', value: `${pkg.generalQty} × ₹${inr(pkg.generalPrice)} · ₹${inr(generalTotal)}` },
                      { label: 'Personal total', value: `${pkg.personalQty} × ₹${inr(pkg.personalPrice)} · ₹${inr(personalTotal)}` },
                      { label: 'Package price', value: `₹${inr(total)}` },
                    ]}
                    footer={(
                      <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate(routes.purchasePackage)}>
                        <Package size={14} aria-hidden="true" />
                        Buy for ₹{inr(total)}
                      </button>
                    )}
                  />
                )
              })}
            </div>
          </div>

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

      {isQuestionFormOpen && !demoPaymentStep && (
        <QuestionFormModal
          isEditing={isEditing}
          title={isEditing ? 'Edit Question' : 'Ask a Question'}
          astrologerName={selectedAstrologerName}
          summary={selectedQuestionSummary}
          category={category}
          creditForSelection={creditForSelection}
          purchasedSlotForSelection={purchasedSlotForSelection}
          showDiscount={discountActive}
          discountPrice={discountPrice}
          formError={formError}
          horoscopeError={horoscopeError}
          isGeneral={questionType.startsWith('General')}
          language={language}
          onLanguageChange={setLanguage}
          question={question}
          onQuestionChange={setQuestion}
          raisedFor={raisedFor}
          onRaisedForChange={setRaisedFor}
          otherPersonName={otherPersonName}
          onOtherPersonNameChange={setOtherPersonName}
          savedHoroscope={savedHoroscope}
          horoscopeMode={horoscope}
          horoscopeFile={horoscopeFile}
          onSelectHoroscopeMode={selectHoroscopeMode}
          onHoroscopeFileSelected={handleHoroscopeFile}
          onRemoveHoroscopeFile={() => { setHoroscopeFile(null); setHoroscopeError('') }}
          onClose={closeQuestionForm}
          onSubmit={handleSubmit}
          submitLabel={isEditing ? 'Update Question' : 'Submit Question'}
        />
      )}

      {/* Demo Review & Payment screen for "Ask This Question". It reuses the
          already-resolved selectedQuestionSummary for every amount, so the
          price, discount and payable total always match the form. This is a UI
          simulation only - no gateway, no card details, no real money. */}
      {demoPaymentStep === 'review' && createPortal((
        <div className="modal-overlay user-modal-overlay" onClick={closeDemoPayment}>
          <div
            className="modal-card user-modal-card user-modal-card--scroll user-modal-card--ask aq-review-modal"
            style={{ width: 'min(560px, calc(100vw - 32px))' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-payment-review-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="user-modal-card__header aq-review-modal__header">
              <div>
                <div id="demo-payment-review-title" className="section-title" style={{ marginBottom: 0 }}>Review &amp; Payment</div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {demoPaymentIntent === 'later'
                    ? 'Confirm this purchase and demo payment to save it for later.'
                    : 'Confirm your question and demo payment to continue.'}
                </div>
              </div>
              <button type="button" className="icon-btn" aria-label="Close review and payment" onClick={closeDemoPayment}>
                <X size={16} />
              </button>
            </div>

            <div className="user-modal-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <section className="aq-form-section">
                <h2 className="aq-form-section__title">Your Selection</h2>
                <div className="aq-summary">
                  <div className="aq-summary-row"><span>Astrologer</span><strong>{selectedQuestionSummary.astrologerName || '—'}</strong></div>
                  <div className="aq-summary-row"><span>Source</span><strong>{selectedQuestionSummary.sourceLabel}</strong></div>
                  <div className="aq-summary-row"><span>Question Type</span><strong>{selectedQuestionSummary.typeLabel}</strong></div>
                </div>
              </section>

              {question.trim() && (
                <section className="aq-form-section">
                  <h2 className="aq-form-section__title">Question Summary</h2>
                  <p className="aq-review-modal__question">{question.trim()}</p>
                  <div className="aq-review-modal__tags">
                    <span className="aq-review-modal__tag">{category}</span>
                    <span className="aq-review-modal__tag">{language}</span>
                  </div>
                </section>
              )}

              <section className="aq-form-section">
                <h2 className="aq-form-section__title">Payment Summary</h2>
                <div className="aq-summary">
                  <div className="aq-summary-row">
                    <span>{selectedQuestionSummary.isOpenQuestion ? 'Ask Anything Price' : 'Campaign Price'}</span>
                    <strong>₹{selectedQuestionSummary.price}</strong>
                  </div>
                  {selectedQuestionSummary.offer && (
                    <div className="aq-summary-row">
                      <span>Offer ({selectedQuestionSummary.offer.discountPercent}% off)</span>
                      <strong>-₹{selectedQuestionSummary.offer.discountAmount}</strong>
                    </div>
                  )}
                  <div className="aq-summary-rule" />
                  <div className="aq-summary-row aq-summary-row--total">
                    <span>Payable Amount</span>
                    <strong>₹{selectedQuestionSummary.offer?.offerPrice ?? selectedQuestionSummary.price}</strong>
                  </div>
                </div>
                <p className="aq-review-modal__note">Demo checkout · no real payment is charged and no card details are collected.</p>
              </section>
            </div>

            <div className="user-modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={closeDemoPayment}>Back</button>
              <button type="button" className="btn btn-primary" onClick={confirmDemoPayment}>
                Pay ₹{selectedQuestionSummary.offer?.offerPrice ?? selectedQuestionSummary.price} (Demo)
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Demo Payment Successful confirmation. "Enter Your Question" opens the
          question form via openQuestionFormAfterDemoPayment; nothing is
          submitted until the user fills the form and presses Submit Question.
          Closing returns to the campaign selection via closeDemoPayment, with
          the selected campaign and question type still preserved. */}
      {demoPaymentStep === 'success' && createPortal((
        <div className="modal-overlay user-modal-overlay" onClick={closeDemoPayment}>
          <div
            className="modal-card user-modal-card user-modal-card--scroll user-modal-card--ask aq-success-modal"
            style={{ width: 'min(480px, calc(100vw - 32px))' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-payment-success-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="user-modal-card__content aq-success-modal__body">
              <span className="aq-success-modal__icon">
                <CheckCircle2 size={30} aria-hidden="true" />
              </span>
              <div className="aq-success-modal__heading">
                <span className="aq-success-modal__demo-tag">Demo</span>
                <h2 id="demo-payment-success-title" className="section-title aq-success-modal__title">
                  {demoPaymentIntent === 'later' ? 'Demo Payment Successful' : 'Payment Successful'}
                </h2>
              </div>
              <p className="aq-success-modal__message">
                {demoPaymentIntent === 'later'
                  ? `Your paid question is saved. This is a demo checkout — no real money was charged and no card details were collected. Write the question from Purchased Questions within ${QUESTION_CREDIT_WINDOW_DAYS} days.`
                  : 'This is a demo checkout — no real money was charged and no card details were collected.'}
              </p>

              <div className="aq-summary aq-success-modal__summary">
                <div className="aq-summary-row"><span>Astrologer</span><strong>{selectedQuestionSummary.astrologerName || '—'}</strong></div>
                <div className="aq-summary-row"><span>Source</span><strong>{selectedQuestionSummary.sourceLabel}</strong></div>
                <div className="aq-summary-row"><span>Question Type</span><strong>{selectedQuestionSummary.typeLabel}</strong></div>
                <div className="aq-summary-rule" />
                <div className="aq-summary-row aq-summary-row--total">
                  <span>Paid (Demo)</span>
                  <strong>₹{selectedQuestionSummary.offer?.offerPrice ?? selectedQuestionSummary.price}</strong>
                </div>
              </div>
            </div>

            <div className="user-modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={closeDemoPayment}>Back</button>
              {demoPaymentIntent === 'later' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    closeDemoPayment()
                    navigate(`${routes.askQuestion}/purchased`)
                  }}
                >
                  View Purchased Questions
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={openQuestionFormAfterDemoPayment}>
                  Enter Your Question
                </button>
              )}
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
