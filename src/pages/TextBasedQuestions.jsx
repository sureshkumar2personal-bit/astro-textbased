import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Copy,
  Eye,
  FileText,
  Inbox,
  Layers,
  LayoutGrid,
  Megaphone,
  MessageCircleQuestion,
  Pencil,
  Plus,
  Rocket,
  Search,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import TextBasedQuestionsModuleTabs from '../components/TextBasedQuestionsModuleTabs.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { parseDisplayDate } from '../utils/date.js'
import {
  campaignAppliesToMonth,
  confirmDeleteCampaign,
  countCampaignQuestionsInMonth,
  createReusableCampaignDraft,
  doesAllocationSplitMatch,
  filterCampaignsByStatus,
  getCampaignAllocation,
  getCampaignCalendarMonth,
  getCampaignDateRange,
  getCampaignDependencyState,
  getCampaignDisplayStatus,
  getCampaignAllowedActions,
  getCampaignMetricCounts,
  getCampaignQuestionTypes,
  getDiscountPreview,
  getMonthlyCapacitySummary,
  getMonthKeyFromDate,
  getMonthLabel,
  shiftMonthKey,
  validateCampaignAllocation,
  validateCampaignDateRange,
  validateCapacityAllocation,
} from '../utils/questions.js'
import { CAMPAIGN_TEMPLATES, CREATE_FROM_SCRATCH } from '../utils/campaignTemplates.js'
import {
  TempleDonationBoxIcon,
  TempleLampIcon,
  TempleLotusIcon,
  TempleReturnIcon,
  TempleScrollIcon,
} from '../components/TempleIcons.jsx'

const QUESTION_STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Under Review', 'Answered', 'Disputed', 'Closed']
const DISCOUNT_CHOICES = [40, 50, 60, 70, 80, 90]
const DEFAULT_OPEN_SETTINGS = { generalPrice: 200, personalPrice: 500, capacity: 0, generalEnabled: true, personalEnabled: true }
function getWordPreview(content) {
  const text = String(content || '').trim()
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length <= 4) return { preview: text, isTruncated: false }

  return {
    preview: words.slice(0, 4).join(' '),
    isTruncated: true,
  }
}

function inr(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

function toInputDate(value) {
  const date = parseDisplayDate(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function toInputDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toDisplayDate(value) {
  const date = parseDisplayDate(value)
  if (Number.isNaN(date.getTime())) return value || ''
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function makeCampaignForm(campaign) {
  const editingAllocation = campaign ? getCampaignAllocation(campaign) : 0
  return {
    name: campaign?.name || '',
    month: campaign ? getCampaignCalendarMonth(campaign) : null,
    shortDescription: campaign?.shortDescription || '',
    description: campaign?.description || '',
    whatUsersCanAsk: campaign?.whatUsersCanAsk || '',
    exampleQuestions: Array.isArray(campaign?.exampleQuestions) ? campaign.exampleQuestions.join('\n') : '',
    questionTypes: campaign ? getCampaignQuestionTypes(campaign) : [],
    generalPrice: campaign ? Number(campaign.generalPrice) || 0 : 200,
    personalPrice: campaign ? Number(campaign.personalPrice) || 0 : 500,
    totalLimit: campaign ? editingAllocation : '',
    generalLimit: campaign ? Number(campaign.generalLimit) || 0 : '',
    personalLimit: campaign ? Number(campaign.personalLimit) || 0 : '',
    date: toInputDate(campaign?.date ?? Date.now() + 30 * 24 * 60 * 60 * 1000) || '',
    endDate: toInputDate(campaign?.endDate ?? Date.now() + 60 * 24 * 60 * 60 * 1000) || '',
    offerEnabled: campaign ? Boolean(Number(campaign.discountPercent) > 0 || campaign.offerEnabled) : true,
    discountPercent: campaign ? Number(campaign.discountPercent) || 0 : 70,
    templateId: campaign?.templateId || null,
  }
}

function applySelectedMonth(form, monthKey) {
  const range = getCampaignDateRange(monthKey)
  if (!range) return { ...form, month: monthKey }
  const todayIso = toInputDate(Date.now())
  let start = todayIso && todayIso >= range.min ? todayIso : range.min
  if (start > range.max) start = range.max
  return { ...form, month: monthKey, date: start, endDate: range.max }
}

function CapacityMetric({ label, value, hint, background, color, border }) {
  return (
    <div
      className="text-center"
      style={{
        flex: '1 1 140px',
        minWidth: 104,
        padding: '16px 12px',
        borderRadius: 18,
        background,
        border: `1px solid ${border}`,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.15, marginTop: 6 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{hint}</div>
    </div>
  )
}

function ManageNavCard({ icon: Icon, tone, title, description, action, actionColor, gradient, border, shadow, onClick }) {
  return (
    <button
      type="button"
      className="card text-left transition hover:-translate-y-1"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '22px 22px 20px',
        borderRadius: 22,
        border: `1px solid ${border}`,
        background: gradient,
        boxShadow: shadow,
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <span className={`stat-icon ${tone}`} style={{ width: 48, height: 48, borderRadius: 14 }}><Icon size={22} /></span>
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{title}</div>
        <div className="muted text-sm" style={{ marginTop: 6, lineHeight: 1.55 }}>{description}</div>
      </div>
      <span style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: actionColor }}>
        {action} <ArrowRight size={15} />
      </span>
    </button>
  )
}

const CAMPAIGN_STATUS_STYLE = {
  Active: {
    accent: 'var(--green-600)',
    softBg: 'var(--success-bg)',
    border: 'rgba(16, 185, 129, 0.22)',
    gradient: 'linear-gradient(160deg, #EAF6F0 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(16, 185, 129, 0.10)',
    badge: '',
  },
  Scheduled: {
    accent: 'var(--sky-600)',
    softBg: 'var(--sky-bg)',
    border: 'rgba(2, 132, 199, 0.24)',
    gradient: 'linear-gradient(160deg, #EBF3FE 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(2, 132, 199, 0.10)',
    badge: '!bg-[color:var(--sky-bg)] !text-[color:var(--sky-600)]',
  },
  Draft: {
    accent: 'var(--muted)',
    softBg: 'var(--neutral-bg)',
    border: 'rgba(107, 114, 128, 0.26)',
    gradient: 'linear-gradient(160deg, #F1EFF4 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(107, 114, 128, 0.10)',
    badge: '!bg-[color:var(--neutral-bg)] !text-[color:var(--muted)]',
  },
  Paused: {
    accent: 'var(--amber-600)',
    softBg: 'var(--warning-bg)',
    border: 'rgba(245, 158, 11, 0.26)',
    gradient: 'linear-gradient(160deg, #FCF6E6 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(245, 158, 11, 0.10)',
    badge: '!bg-[color:var(--warning-bg)] !text-[color:var(--amber-600)]',
  },
  Closed: {
    accent: 'var(--muted)',
    softBg: 'var(--neutral-bg)',
    border: 'rgba(107, 114, 128, 0.26)',
    gradient: 'linear-gradient(160deg, #F1EFF4 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(107, 114, 128, 0.10)',
    badge: '!bg-[color:var(--neutral-bg)] !text-[color:var(--muted)]',
  },
  Expired: {
    accent: 'var(--muted)',
    softBg: 'var(--neutral-bg)',
    border: 'rgba(107, 114, 128, 0.26)',
    gradient: 'linear-gradient(160deg, #F1EFF4 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(107, 114, 128, 0.10)',
    badge: '!bg-[color:var(--neutral-bg)] !text-[color:var(--muted)]',
  },
  Completed: {
    accent: 'var(--muted)',
    softBg: 'var(--neutral-bg)',
    border: 'rgba(107, 114, 128, 0.26)',
    gradient: 'linear-gradient(160deg, #F1EFF4 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(107, 114, 128, 0.10)',
    badge: '!bg-[color:var(--neutral-bg)] !text-[color:var(--muted)]',
  },
}

const DEFAULT_CAMPAIGN_STATUS_STYLE = {
  accent: 'var(--primary)',
  softBg: 'var(--primary-bg)',
  border: 'rgba(91, 33, 182, 0.20)',
  gradient: 'linear-gradient(160deg, #ECE5F8 0%, #FFFFFF 100%)',
  shadow: '0 14px 34px rgba(91, 33, 182, 0.10)',
  badge: '',
}

function campaignStatusStyle(status) {
  return CAMPAIGN_STATUS_STYLE[status] || DEFAULT_CAMPAIGN_STATUS_STYLE
}

function OverviewStat({ label, value, icon: Icon, tone, gradient, border, accent = 'var(--primary)', activeGradient, activeBorder, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center gap-3"
      style={{
        width: '100%',
        padding: '16px 18px',
        borderRadius: 18,
        cursor: 'pointer',
        textAlign: 'left',
        border: active ? `2px solid ${activeBorder || accent}` : `1px solid ${border}`,
        background: active && activeGradient ? activeGradient : gradient,
        boxShadow: active ? `0 10px 26px ${activeBorder || border}` : undefined,
        transition: 'border-color 200ms var(--ease-premium), background 200ms var(--ease-premium), box-shadow 200ms var(--ease-premium)',
      }}
    >
      <span className={`stat-icon ${tone}`} style={{ width: 42, height: 42, borderRadius: 12 }}><Icon size={18} /></span>
      <div style={{ minWidth: 0 }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.15, marginTop: 2 }}>{value}</div>
      </div>
      {active && (
        <span
          style={{
            marginLeft: 'auto',
            alignSelf: 'center',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: accent,
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 800,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          ✓
        </span>
      )}
    </button>
  )
}

function MonthSelector({ monthKey, onChange }) {
  const isCurrentMonth = Boolean(monthKey) && getMonthKeyFromDate(new Date()) === monthKey
  return (
    <div
      className="flex items-center gap-1"
      style={{
        padding: '5px 6px 5px 8px',
        borderRadius: 14,
        border: '1px solid var(--surface-border)',
        background: 'var(--surface-strong)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => onChange(shiftMonthKey(monthKey, -1))}><ArrowLeft size={15} /></button>
      <div style={{ minWidth: 132, textAlign: 'center', padding: '0 2px' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{getMonthLabel(monthKey)}</span>
        {isCurrentMonth && (
          <span className="muted" style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 1 }}>This month</span>
        )}
      </div>
      <button type="button" className="icon-btn" aria-label="Next month" onClick={() => onChange(shiftMonthKey(monthKey, 1))}><ArrowRight size={15} /></button>
    </div>
  )
}

function CampaignDetail({ label, children }) {
  return (
    <div style={{ flex: '1 1 130px', minWidth: 0 }}>
      <div className="muted" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginTop: 3, whiteSpace: 'nowrap' }}>{children}</div>
    </div>
  )
}


export default function TextBasedQuestions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    campaigns,
    questions,
    purchasedSlots,
    openQuestionSettings: openSettingsRaw,
    actions,
  } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined
  const openSettings = { ...DEFAULT_OPEN_SETTINGS, ...(openSettingsRaw || {}) }

  const astrologerId = currentUser?.id || 'astrologer-demo'
  const myQuestions = useMemo(() => questions
    .filter((question) => (question.astrologerId || 'astrologer-demo') === astrologerId)
    .sort((a, b) => new Date(b.raisedAt || b.submittedAt || 0) - new Date(a.raisedAt || a.submittedAt || 0)),
  [questions, astrologerId])

  const [view, setView] = useState('overview')
  const [panelQuestionId, setPanelQuestionId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('All')
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => getMonthKeyFromDate(new Date()) || '')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [answer, setAnswer] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [editingSubmittedAnswer, setEditingSubmittedAnswer] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [fullContent, setFullContent] = useState(null)
  const [form, setForm] = useState(() => makeCampaignForm(null))
  const [editingCampaignId, setEditingCampaignId] = useState(null)
  const [campaignModalOpen, setCampaignModalOpen] = useState(false)
  const [campaignViewOnly, setCampaignViewOnly] = useState(false)
  const [reuseSourceName, setReuseSourceName] = useState(null)
  const [deletePendingCampaignId, setDeletePendingCampaignId] = useState(null)
  const [formError, setFormError] = useState('')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDateTime, setScheduleDateTime] = useState(() => toInputDateTime(Date.now() + 60 * 60 * 1000))
  const [openForm, setOpenForm] = useState({ ...openSettings })
  const [openError, setOpenError] = useState('')
  const [openSettingsModalOpen, setOpenSettingsModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const editingCampaign = editingCampaignId ? campaigns.find((campaign) => campaign.id === editingCampaignId) || null : null

  const monthLabel = getMonthLabel(selectedMonthKey)
  const reuseMonthLabel = getMonthLabel(shiftMonthKey(selectedMonthKey, 1))

  const monthSummary = useMemo(
    () => getMonthlyCapacitySummary({
      campaigns,
      openSettings: { ...DEFAULT_OPEN_SETTINGS, ...(openSettingsRaw || {}) },
      questions,
      astrologerId,
      monthKey: selectedMonthKey,
    }),
    [campaigns, openSettingsRaw, questions, astrologerId, selectedMonthKey],
  )

  const currentMonthKey = useMemo(() => getMonthKeyFromDate(new Date()), [])
  const currentMonthLabel = getMonthLabel(currentMonthKey)
  const currentMonthSummary = useMemo(
    () => getMonthlyCapacitySummary({
      campaigns,
      openSettings: { ...DEFAULT_OPEN_SETTINGS, ...(openSettingsRaw || {}) },
      questions,
      astrologerId,
      monthKey: currentMonthKey,
    }),
    [campaigns, openSettingsRaw, questions, astrologerId, currentMonthKey],
  )

  const campaignCounts = useMemo(
    () => getCampaignMetricCounts(campaigns, selectedMonthKey, new Date(now)),
    [campaigns, selectedMonthKey, now],
  )

  const filteredCampaigns = useMemo(
    () => filterCampaignsByStatus(campaigns, campaignStatusFilter, selectedMonthKey, new Date(now)),
    [campaigns, campaignStatusFilter, selectedMonthKey, now],
  )

  const deletePendingCampaign = deletePendingCampaignId
    ? campaigns.find((campaign) => campaign.id === deletePendingCampaignId) || null
    : null

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  const requestedQuestionId = searchParams.get('questionId')
  useEffect(() => {
    if (!requestedQuestionId) return
    const found = questions.some((question) => question.id === requestedQuestionId)
    if (!found) return
    setView('received')
    setStatusFilter('All')
    setPanelQuestionId(requestedQuestionId)
  }, [requestedQuestionId, questions])

  const filteredQuestions = useMemo(() => {
    const term = appliedSearch.trim().toLowerCase()
    return myQuestions.filter((question) => {
      if (statusFilter !== 'All' && question.status !== statusFilter) return false
      if (!term) return true
      const searchable = [question.id, question.user, question.campaignName, question.category, question.type, question.question, question.status]
        .join(' ').toLowerCase()
      return searchable.includes(term)
    })
  }, [myQuestions, appliedSearch, statusFilter])

  const panelQuestion = useMemo(
    () => questions.find((question) => question.id === panelQuestionId) || null,
    [questions, panelQuestionId],
  )
  const panelAnswer = panelQuestion?.draftAnswer || panelQuestion?.answer || ''

  useEffect(() => {
    setAnswer(panelAnswer)
    setEditingSubmittedAnswer(false)
  }, [panelQuestion?.id, panelAnswer])

  useEffect(() => {
    setDraftSaved(false)
  }, [panelQuestion?.id])

  const openQuestion = (id) => {
    setView('received')
    setPanelQuestionId(id)
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('questionId', id)
      return next
    })
    actions.viewQuestion(id)
  }

  const closePanel = () => {
    setPanelQuestionId(null)
    setFullContent(null)
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.delete('questionId')
      return next
    })
  }

  const saveDraft = () => {
    if (!panelQuestion || panelQuestion.status === 'Under Review' || !answer.trim()) return
    actions.saveQuestionDraft(panelQuestion.id, answer)
    setDraftSaved(true)
  }

  const submitAnswer = () => {
    if (!panelQuestion || !answer.trim()) return
    actions.submitQuestionAnswer(panelQuestion.id, answer)
    closePanel()
    setJustSubmitted(true)
  }

  const isUnderReview = panelQuestion?.status === 'Under Review'
  const reviewActive = isUnderReview && panelQuestion?.answerReviewUntil > now
  const canEditSubmittedAnswer = reviewActive && !panelQuestion?.answerEditUsed
  const answerIsReadOnly = panelQuestion?.status === 'Answered' || (isUnderReview && !editingSubmittedAnswer)

  const saveCorrection = () => {
    if (!panelQuestion || !answer.trim()) return
    const saved = actions.editSubmittedQuestionAnswer(panelQuestion.id, answer)
    if (saved) setEditingSubmittedAnswer(false)
  }

  const goToOverview = () => {
    setView('overview')
  }

  const startCreateCampaign = () => {
    setEditingCampaignId(null)
    setCampaignViewOnly(false)
    setReuseSourceName(null)
    setForm(applySelectedMonth(makeCampaignForm(null), selectedMonthKey))
    setFormError('')
    setScheduleOpen(false)
    setScheduleDateTime(toInputDateTime(Date.now() + 60 * 60 * 1000))
    setView('campaigns')
    setCampaignModalOpen(true)
  }

  const startEditCampaign = (campaign) => {
    setEditingCampaignId(campaign.id)
    setCampaignViewOnly(false)
    setReuseSourceName(null)
    setForm(makeCampaignForm(campaign))
    setFormError('')
    setScheduleOpen(false)
    setScheduleDateTime(toInputDateTime(Date.now() + 60 * 60 * 1000))
    setView('campaigns')
    setCampaignModalOpen(true)
  }

  const startViewCampaign = (campaign) => {
    setEditingCampaignId(campaign.id)
    setCampaignViewOnly(true)
    setReuseSourceName(null)
    setForm(makeCampaignForm(campaign))
    setFormError('')
    setScheduleOpen(false)
    setView('campaigns')
    setCampaignModalOpen(true)
  }

  const startReuseCampaign = (campaign) => {
    const draft = createReusableCampaignDraft(campaign, selectedMonthKey)
    setEditingCampaignId(null)
    setCampaignViewOnly(false)
    setReuseSourceName(campaign.name)
    setForm({
      ...makeCampaignForm(null),
      month: draft.month || shiftMonthKey(selectedMonthKey, 1),
      name: draft.name,
      shortDescription: draft.shortDescription,
      description: draft.description,
      whatUsersCanAsk: draft.whatUsersCanAsk,
      exampleQuestions: draft.exampleQuestions.join('\n'),
      questionTypes: [...draft.questionTypes],
      generalPrice: draft.generalPrice,
      personalPrice: draft.personalPrice,
      offerEnabled: draft.offerEnabled,
      discountPercent: draft.discountPercent,
      templateId: draft.templateId,
      totalLimit: '',
      generalLimit: '',
      personalLimit: '',
      date: draft.date,
      endDate: draft.endDate,
    })
    setFormError('')
    setScheduleOpen(false)
    setScheduleDateTime(toInputDateTime(Date.now() + 60 * 60 * 1000))
    setView('campaigns')
    setCampaignModalOpen(true)
  }

  const closeCampaignModal = () => {
    setCampaignModalOpen(false)
    setEditingCampaignId(null)
    setCampaignViewOnly(false)
    setReuseSourceName(null)
    setScheduleOpen(false)
    setFormError('')
  }

  const openOpenSettings = () => {
    setOpenForm({ ...openSettings })
    setOpenError('')
    setOpenSettingsModalOpen(true)
  }

  const closeOpenSettingsModal = () => {
    setOpenSettingsModalOpen(false)
    setOpenError('')
  }

  const toggleOpenType = (type) => {
    const key = type === 'General' ? 'generalEnabled' : 'personalEnabled'
    setOpenForm((prev) => ({ ...prev, [key]: prev[key] === false }))
    setOpenError('')
  }

  useEffect(() => {
    if (!campaignModalOpen && !openSettingsModalOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (campaignModalOpen && scheduleOpen) {
        setScheduleOpen(false)
        return
      }
      if (openSettingsModalOpen) {
        closeOpenSettingsModal()
        return
      }
      closeCampaignModal()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [campaignModalOpen, openSettingsModalOpen, scheduleOpen])

  const toggleQuestionType = (type) => {
    setForm((prev) => {
      const next = prev.questionTypes.includes(type)
        ? prev.questionTypes.filter((item) => item !== type)
        : [...prev.questionTypes, type]
      return { ...prev, questionTypes: next }
    })
  }

  const applyCampaignTemplate = (template) => {
    setForm((prev) => ({
      ...prev,
      name: template.name,
      shortDescription: template.shortDescription,
      description: template.description || '',
      whatUsersCanAsk: template.whatUsersCanAsk,
      exampleQuestions: Array.isArray(template.exampleQuestions) ? template.exampleQuestions.join('\n') : '',
      questionTypes: Array.isArray(template.types) ? [...template.types] : prev.questionTypes,
      generalPrice: template.generalPrice != null ? template.generalPrice : prev.generalPrice,
      personalPrice: template.personalPrice != null ? template.personalPrice : prev.personalPrice,
      totalLimit: '',
      generalLimit: '',
      personalLimit: '',
      templateId: template.id,
    }))
    setFormError('')
  }

  const clearCampaignTemplate = () => {
    setForm((prev) => ({
      ...prev,
      name: '',
      shortDescription: '',
      description: '',
      whatUsersCanAsk: '',
      exampleQuestions: '',
      questionTypes: [],
      totalLimit: '',
      generalLimit: '',
      personalLimit: '',
      templateId: null,
    }))
    setFormError('')
  }

  const ownAllocation = editingCampaign && getCampaignCalendarMonth(editingCampaign) === selectedMonthKey
    ? getCampaignAllocation(editingCampaign)
    : 0
  const editingPublishedStatus = editingCampaign && (editingCampaign.status === 'Active' || editingCampaign.status === 'Published')
    ? editingCampaign.status
    : null
  const committedAllocation = Math.max(monthSummary.allocated - ownAllocation, 0)
  const otherAllocation = Math.max(monthSummary.remainingAllocation + ownAllocation, 0)
  const formDateRange = getCampaignDateRange(form.month)
  const allocationValue = Math.max(Number(form.totalLimit) || 0, 0)
  const generalSlotsValue = Math.max(Number(form.generalLimit) || 0, 0)
  const personalSlotsValue = Math.max(Number(form.personalLimit) || 0, 0)
  const reservableRemaining = Math.max(otherAllocation - allocationValue, 0)
  const splitTotal = generalSlotsValue + personalSlotsValue
  const splitMismatch = !doesAllocationSplitMatch(allocationValue, generalSlotsValue, personalSlotsValue)
  const generalPreview = getDiscountPreview(form.generalPrice, form.offerEnabled ? form.discountPercent : 0)
  const personalPreview = getDiscountPreview(form.personalPrice, form.offerEnabled ? form.discountPercent : 0)
  const availableOpenAllocation = Math.max(monthSummary.capacity - monthSummary.campaignAllocation, 0)
  const openCapacityValue = Math.max(Number(openForm.capacity) || 0, 0)
  const openRemaining = availableOpenAllocation - openCapacityValue

  const validateCampaignForm = () => {
    if (!form.name.trim()) throw new Error('Enter a campaign name.')
    if (!form.date) throw new Error('Select a campaign start date.')
    if (!form.endDate) throw new Error('Select a campaign end date.')
    const dateError = validateCampaignDateRange({ date: form.date, endDate: form.endDate, monthKey: form.month })
    if (dateError) throw new Error(dateError)
    if (form.questionTypes.length === 0) throw new Error('Enable at least one question type.')
    const campaignUsed = editingCampaign
      ? countCampaignQuestionsInMonth(editingCampaign, questions, form.month || getCampaignCalendarMonth(editingCampaign), astrologerId)
      : 0
    const allocationError = validateCampaignAllocation({
      total: allocationValue,
      general: generalSlotsValue,
      personal: personalSlotsValue,
      used: campaignUsed,
    })
    if (allocationError) throw new Error(allocationError)
    const capacityError = validateCapacityAllocation({ baseAllocation: committedAllocation, proposedAllocation: allocationValue })
    if (capacityError) throw new Error(capacityError)
    if (form.offerEnabled && (Number(form.discountPercent) < 0 || Number(form.discountPercent) > 100)) {
      throw new Error('Subscriber discount must be between 0% and 100%.')
    }
  }

  const buildCampaignPayload = (status, scheduledPublishAt) => {
    const generalLimit = form.questionTypes.includes('General') ? generalSlotsValue : 0
    const personalLimit = form.questionTypes.includes('Personal') ? personalSlotsValue : 0
    return {
      name: form.name,
      month: form.month || getCampaignCalendarMonth({ date: form.date, endDate: form.endDate }),
      shortDescription: form.shortDescription,
      description: form.description,
      whatUsersCanAsk: form.whatUsersCanAsk,
      exampleQuestions: form.exampleQuestions.split('\n').map((item) => item.trim()).filter(Boolean),
      questionTypes: form.questionTypes,
      date: form.date,
      endDate: form.endDate,
      totalLimit: allocationValue,
      generalLimit,
      personalLimit,
      generalPrice: form.questionTypes.includes('General') ? Math.max(Number(form.generalPrice) || 0, 0) : 0,
      personalPrice: form.questionTypes.includes('Personal') ? Math.max(Number(form.personalPrice) || 0, 0) : 0,
      offerEnabled: form.offerEnabled,
      discountPercent: form.offerEnabled ? Number(form.discountPercent) || 0 : 0,
      status,
      scheduledPublishAt: scheduledPublishAt || null,
      templateId: form.templateId || null,
    }
  }

  const submitCampaign = (status, scheduledPublishAt) => {
    try {
      setFormError('')
      validateCampaignForm()
      const modified = buildCampaignPayload(status, scheduledPublishAt)
      if (editingCampaign) {
        actions.updateCampaign(editingCampaign.id, {
          name: modified.name,
          shortDescription: modified.shortDescription,
          description: modified.description,
          whatUsersCanAsk: modified.whatUsersCanAsk,
          exampleQuestions: modified.exampleQuestions,
          questionTypes: modified.questionTypes,
          date: toDisplayDate(modified.date),
          endDate: toDisplayDate(modified.endDate),
          totalLimit: modified.totalLimit,
          generalLimit: modified.generalLimit,
          personalLimit: modified.personalLimit,
          generalPrice: modified.generalPrice,
          personalPrice: modified.personalPrice,
          offerEnabled: modified.offerEnabled,
          discountPercent: modified.discountPercent,
          status,
          scheduledPublishAt,
        })
      } else {
        actions.createCampaign(modified)
      }
      setCampaignModalOpen(false)
      setEditingCampaignId(null)
      setScheduleOpen(false)
      setView('campaigns')
      setCampaignStatusFilter('All')
      setSuccessMessage(status === 'Scheduled'
        ? 'Campaign scheduled successfully.'
        : status === 'Active'
          ? 'Campaign published successfully.'
          : 'Campaign draft saved successfully.')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save campaign.')
    }
  }

  const handleSchedule = () => {
    const scheduledAt = new Date(scheduleDateTime)
    if (!scheduleDateTime || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      setFormError('Choose a future date and time for publishing.')
      return
    }
    submitCampaign('Scheduled', scheduledAt.toISOString())
  }

  const requestDeleteCampaign = (campaign) => {
    setDeletePendingCampaignId(campaign.id)
  }

  const confirmDeleteCampaignFlow = () => {
    if (!deletePendingCampaign) return
    const result = confirmDeleteCampaign(deletePendingCampaign, null, {
      confirmed: true,
      questions,
      purchasedSlots: purchasedSlots || [],
    })
    if (!result.ok) {
      setSuccessMessage(result.reason)
      setDeletePendingCampaignId(null)
      return
    }
    actions.deleteCampaign(deletePendingCampaign.id)
    setDeletePendingCampaignId(null)
    setSuccessMessage(`${deletePendingCampaign.name} was deleted.`)
  }

  const saveOpenSettings = () => {
    try {
      setOpenError('')
      if (openForm.generalEnabled === false && openForm.personalEnabled === false) {
        throw new Error('Enable at least one open question type.')
      }
      actions.updateOpenQuestionSettings({
        generalPrice: Math.max(Number(openForm.generalPrice) || 0, 0),
        personalPrice: Math.max(Number(openForm.personalPrice) || 0, 0),
        capacity: Math.max(Number(openForm.capacity) || 0, 0),
        generalEnabled: openForm.generalEnabled !== false,
        personalEnabled: openForm.personalEnabled !== false,
      })
      setSuccessMessage('Open question settings saved successfully.')
      closeOpenSettingsModal()
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Unable to save open question settings.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Astrologer"
        title={view === 'campaigns' ? 'Campaigns' : 'Text Based Questions'}
        showBack
        backTo={routes.dashboard}
        backIcon={backIcon}
        subtitle={view === 'campaigns'
          ? 'Create, manage, and monitor your topic-based question campaigns.'
          : 'Manage campaigns, open questions, and incoming customer questions from one place.'}
        actions={view === 'campaigns' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" className="btn btn-outline" onClick={goToOverview}><ArrowLeft size={15} /> Overview</button>
            <button type="button" className="btn btn-primary" onClick={startCreateCampaign}><Plus size={15} /> Create Campaign</button>
          </div>
        ) : undefined}
      />

      <TextBasedQuestionsModuleTabs />

      {view === 'overview' && (
        <>
          <Section>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 30,
                padding: 'clamp(20px, 3.2vw, 30px)',
                borderRadius: 24,
                border: '1px solid rgba(91, 33, 182, 0.18)',
                background: 'linear-gradient(150deg, #ECE5F8 0%, #F7F2FC 46%, #FFFFFF 100%)',
                boxShadow: '0 22px 48px rgba(91, 33, 182, 0.12)',
              }}
            >
              <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', boxShadow: '0 0 0 4px rgba(91, 33, 182, 0.12)', flexShrink: 0 }} />
                  <span className="muted" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Monthly Question Capacity</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                  <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1 }}>{inr(currentMonthSummary.capacity)}</span>
                  <span className="muted" style={{ fontSize: 15, fontWeight: 700 }}>questions / month</span>
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 10, maxWidth: 340 }}>
                  Maximum questions per astrologer, per calendar month. Metric tiles below reflect <strong style={{ color: 'var(--ink)' }}>{currentMonthLabel}</strong>.
                </div>
              </div>
              <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <CapacityMetric label="Allocated" value={inr(currentMonthSummary.allocated)} hint="Campaign + Open Questions" background="var(--sky-bg)" color="var(--sky-600)" border="rgba(2, 132, 199, 0.22)" />
                  <CapacityMetric label="Used" value={inr(currentMonthSummary.used)} hint={`Consumed in ${currentMonthLabel}`} background="var(--gold-100)" color="var(--accent-dark)" border="rgba(242, 102, 42, 0.24)" />
                  <CapacityMetric label="Remaining" value={inr(currentMonthSummary.remaining)} hint="Unallocated capacity" background="var(--success-bg)" color="var(--green-600)" border="rgba(16, 185, 129, 0.24)" />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Manage Text-Based Questions" icon={LayoutGrid}>
            <p className="muted" style={{ margin: '0 0 18px' }}>Choose what you want to manage.</p>
            <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <ManageNavCard
                icon={Target}
                tone="tone-violet"
                title="Campaigns"
                description="Create and manage topic-based question campaigns."
                action="Manage Campaigns"
                actionColor="var(--primary)"
                gradient="linear-gradient(160deg, #ECE5F8 0%, #FAF7FF 55%, #FFFFFF 100%)"
                border="rgba(91, 33, 182, 0.20)"
                shadow="0 14px 34px rgba(91, 33, 182, 0.10)"
                onClick={() => setView('campaigns')}
              />
              <ManageNavCard
                icon={MessageCircleQuestion}
                tone="tone-teal"
                title="Open Questions"
                description="Manage your flexible question capacity and pricing."
                action="Manage Open Questions"
                actionColor="var(--green-600)"
                gradient="linear-gradient(160deg, #E5F6EE 0%, #F4FBF8 55%, #FFFFFF 100%)"
                border="rgba(16, 185, 129, 0.22)"
                shadow="0 14px 34px rgba(16, 185, 129, 0.10)"
                onClick={openOpenSettings}
              />
              <ManageNavCard
                icon={Inbox}
                tone="tone-gold"
                title="Received Questions"
                description="Review and answer questions submitted by customers."
                action="View Received Questions"
                actionColor="var(--accent-dark)"
                gradient="linear-gradient(160deg, #FFEDE1 0%, #FFF8F2 55%, #FFFFFF 100%)"
                border="rgba(242, 102, 42, 0.24)"
                shadow="0 14px 34px rgba(242, 102, 42, 0.10)"
                onClick={() => { setStatusFilter('All'); setView('received') }}
              />
            </div>
          </Section>
        </>
      )}

      {view === 'campaigns' && (
        <>
          <Section>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                Showing {filteredCampaigns.length} of {campaigns.length} campaigns · {monthLabel}
              </span>
              <MonthSelector monthKey={selectedMonthKey} onChange={setSelectedMonthKey} />
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <OverviewStat
                label="Total Campaigns"
                value={campaignCounts.total}
                icon={Layers}
                tone="tone-violet"
                accent="var(--primary)"
                gradient="linear-gradient(150deg, #F1EBFA 0%, #FFFFFF 100%)"
                border="rgba(91, 33, 182, 0.16)"
                activeGradient="linear-gradient(150deg, #E2D6F6 0%, #FFFFFF 100%)"
                activeBorder="rgba(91, 33, 182, 0.55)"
                active={campaignStatusFilter === 'All'}
                onClick={() => setCampaignStatusFilter('All')}
              />
              <OverviewStat
                label="Active"
                value={campaignCounts.active}
                icon={Activity}
                tone="tone-green"
                accent="var(--green-600)"
                gradient="linear-gradient(150deg, #EAF7F1 0%, #FFFFFF 100%)"
                border="rgba(16, 185, 129, 0.18)"
                activeGradient="linear-gradient(150deg, #D6F1E4 0%, #FFFFFF 100%)"
                activeBorder="rgba(16, 185, 129, 0.55)"
                active={campaignStatusFilter === 'Active'}
                onClick={() => setCampaignStatusFilter('Active')}
              />
              <OverviewStat
                label="Scheduled"
                value={campaignCounts.scheduled}
                icon={CalendarClock}
                tone="tone-sky"
                accent="var(--sky-600)"
                gradient="linear-gradient(150deg, #EBF3FE 0%, #FFFFFF 100%)"
                border="rgba(2, 132, 199, 0.18)"
                activeGradient="linear-gradient(150deg, #D6E9FD 0%, #FFFFFF 100%)"
                activeBorder="rgba(2, 132, 199, 0.55)"
                active={campaignStatusFilter === 'Scheduled'}
                onClick={() => setCampaignStatusFilter('Scheduled')}
              />
              <OverviewStat
                label="Draft"
                value={campaignCounts.draft}
                icon={FileText}
                tone="tone-neutral"
                accent="var(--muted)"
                gradient="linear-gradient(150deg, #F1EFF4 0%, #FFFFFF 100%)"
                border="rgba(107, 114, 128, 0.18)"
                activeGradient="linear-gradient(150deg, #E2DFE9 0%, #FFFFFF 100%)"
                activeBorder="rgba(107, 114, 128, 0.55)"
                active={campaignStatusFilter === 'Draft'}
                onClick={() => setCampaignStatusFilter('Draft')}
              />
            </div>
          </Section>

          {campaigns.length === 0 ? (
            <Section>
              <div
                className="text-center"
                style={{
                  padding: 'clamp(40px, 6vw, 64px) 24px',
                  borderRadius: 24,
                  border: '1.5px dashed rgba(91, 33, 182, 0.28)',
                  background: 'linear-gradient(160deg, #F7F3FC 0%, #FFFFFF 100%)',
                }}
              >
                <span className="stat-icon tone-violet" style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 18px' }}><Megaphone size={28} /></span>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>No campaigns yet</h2>
                <p className="muted" style={{ margin: '8px auto 20px', maxWidth: 420, fontSize: 14, lineHeight: 1.6 }}>Create your first topic-based question campaign to set up its pricing, offers, and monthly capacity.</p>
                <button type="button" className="btn btn-primary" onClick={startCreateCampaign}><Plus size={15} /> Create Campaign</button>
              </div>
            </Section>
          ) : filteredCampaigns.length === 0 ? (
            <Section>
              <div
                className="text-center"
                style={{
                  padding: 'clamp(36px, 5vw, 52px) 24px',
                  borderRadius: 24,
                  border: '1.5px dashed rgba(107, 114, 128, 0.3)',
                  background: 'linear-gradient(160deg, #F4F2F7 0%, #FFFFFF 100%)',
                }}
              >
                <span className="stat-icon tone-neutral" style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 14px' }}><Search size={24} /></span>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>No {campaignStatusFilter === 'Active' ? 'Active' : campaignStatusFilter} campaigns</h2>
                <p className="muted" style={{ margin: '6px auto 16px', maxWidth: 380, fontSize: 13, lineHeight: 1.6 }}>
                  There are no {campaignStatusFilter === 'Active' ? 'active' : campaignStatusFilter.toLowerCase()} campaigns to show right now.
                </p>
                <button type="button" className="btn btn-outline" onClick={() => setCampaignStatusFilter('All')}>Show all campaigns</button>
              </div>
            </Section>
          ) : (
            <Section>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCampaigns.map((campaign) => {
                  const displayStatus = getCampaignDisplayStatus(campaign, selectedMonthKey, now)
                  const style = campaignStatusStyle(displayStatus)
                  const types = getCampaignQuestionTypes(campaign)
                  const allocated = getCampaignAllocation(campaign)
                  const used = countCampaignQuestionsInMonth(campaign, questions, selectedMonthKey, astrologerId)
                  const remaining = Math.max(allocated - used, 0)
                  const applies = campaignAppliesToMonth(campaign, selectedMonthKey)
                  const hasOffer = Number(campaign.discountPercent) > 0
                  const historical = displayStatus === 'Closed'
                  const canDelete = !getCampaignDependencyState(campaign, { questions, purchasedSlots: purchasedSlots || [] }).protected
                  const allowedActions = getCampaignAllowedActions(campaign, selectedMonthKey, now)
                  return (
                    <div
                      key={campaign.id}
                      className="flex flex-col"
                      style={{
                        padding: 22,
                        borderRadius: 22,
                        border: `1px solid ${style.border}`,
                        background: style.gradient,
                        boxShadow: style.shadow,
                        height: '100%',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          <span className="stat-icon" style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 14, background: style.softBg, color: style.accent }}><TempleDonationBoxIcon size={22} /></span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.name}</div>
                            {campaign.priority && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Priority · {campaign.priority}</div>}
                          </div>
                        </div>
                        <StatusBadge label={displayStatus} className={style.badge} />
                      </div>

                      {campaign.shortDescription && (
                        <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>{campaign.shortDescription}</p>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {types.map((type) => (
                          <span
                            key={type}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              color: style.accent,
                              background: style.softBg,
                              border: `1px solid ${style.border}`,
                            }}
                          >
                            {type}
                          </span>
                        ))}
                        {hasOffer && (
                          <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'var(--gold-100)', color: 'var(--gold-600)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span aria-hidden="true">🎁</span> First Subscriber Offer · {campaign.discountPercent}% OFF
                          </span>
                        )}
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            background: applies ? 'var(--primary-bg)' : 'var(--neutral-bg)',
                            color: applies ? 'var(--primary)' : 'var(--muted)',
                            border: applies ? '1px solid rgba(91, 33, 182, 0.22)' : '1px solid rgba(107, 114, 128, 0.2)',
                          }}
                        >
                          {applies ? `Counts in ${monthLabel}` : `No allocation in ${monthLabel}`}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 12,
                          padding: '12px 14px',
                          borderRadius: 16,
                          border: '1px solid var(--surface-border)',
                          background: 'rgba(255, 255, 255, 0.75)',
                        }}
                      >
                        {types.includes('General') && <CampaignDetail label="General price">₹{inr(campaign.generalPrice)}</CampaignDetail>}
                        {types.includes('Personal') && <CampaignDetail label="Personal price">₹{inr(campaign.personalPrice)}</CampaignDetail>}
                        <CampaignDetail label="Slots">{inr(used)} / {inr(allocated)} used</CampaignDetail>
                        <CampaignDetail label="Remaining">{inr(remaining)} left</CampaignDetail>
                        <CampaignDetail label="Schedule">{toDisplayDate(campaign.date)} – {toDisplayDate(campaign.endDate)}</CampaignDetail>
                      </div>

                      <div className="account-row-actions" style={{ marginTop: 'auto', gap: 8 }}>
                        {historical ? (
                          <>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => startViewCampaign(campaign)}><Eye size={13} /> View</button>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => startReuseCampaign(campaign)}><Copy size={13} /> Reuse for Next Month</button>
                            {canDelete && (
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => requestDeleteCampaign(campaign)}><Trash2 size={13} /> Delete</button>
                            )}
                          </>
                        ) : (
                          <>
                            {allowedActions.includes('edit') && (
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => startEditCampaign(campaign)}><Pencil size={13} /> Edit</button>
                            )}
                            {allowedActions.includes('publish') && (
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => { actions.publishCampaign(campaign.id); setSuccessMessage('Campaign published successfully.') }}><Rocket size={13} /> Publish</button>
                            )}
                            {allowedActions.includes('publishNow') && (
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => { actions.publishCampaign(campaign.id); setSuccessMessage('Campaign published now.') }}><Rocket size={13} /> Publish Now</button>
                            )}
                            {allowedActions.includes('close') && (
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => { actions.updateCampaign(campaign.id, { status: 'Closed' }); setSuccessMessage(`${campaign.name} was closed.`) }}>Close</button>
                            )}
                            {allowedActions.includes('questions') && (
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => setView('received')}>Questions</button>
                            )}
                            {allowedActions.includes('reuse') && (
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => startReuseCampaign(campaign)}><Copy size={13} /> Reuse for Next Month</button>
                            )}
                            {(displayStatus === 'Draft' || displayStatus === 'Scheduled') && canDelete && (
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => requestDeleteCampaign(campaign)}><Trash2 size={13} /> Delete</button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}
        </>
      )}

      {campaignModalOpen && createPortal(
        <div className="modal-overlay user-modal-overlay" onClick={closeCampaignModal}>
          <div
            className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll"
            style={{ width: 'min(760px, calc(100vw - 32px))' }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="campaign-form-title"
          >
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div style={{ minWidth: 0 }}>
                <div id="campaign-form-title" className="section-title" style={{ marginBottom: 0 }}>
                  {editingCampaign ? (campaignViewOnly ? 'Campaign Details' : 'Edit Campaign') : 'Create Campaign'}
                </div>
                <p className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}>
                  {editingCampaign
                    ? campaignViewOnly
                      ? `Historical record for “${editingCampaign.name}”.`
                      : `Update “${editingCampaign.name}” for your subscribers and users.`
                    : reuseSourceName
                      ? `New campaign for ${reuseMonthLabel}, based on “${reuseSourceName}”. Everything is editable before saving.`
                      : 'Create a text-based question campaign for your subscribers and users.'}
                </p>
              </div>
              <button type="button" className="icon-btn" aria-label="Close campaign form" onClick={closeCampaignModal}><X size={18} /></button>
            </div>

            <div className="modal-card__content user-modal-card__content astrologer-modal-content">
              {!editingCampaign && reuseSourceName && (
                <div className="rounded-[14px] border px-4 py-3 text-sm font-medium" style={{ border: '1px dashed rgba(91, 33, 182, 0.3)', background: 'var(--primary-bg)', color: 'var(--primary)' }}>
                  This is a new campaign based on “{reuseSourceName}”. Set fresh dates and a new question allocation for {reuseMonthLabel}.
                </div>
              )}
              <fieldset disabled={campaignViewOnly} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
                <div style={campaignViewOnly ? { pointerEvents: 'none' } : undefined}>
              {!editingCampaign && (
                <div className="astrologer-modal-section">
                  <div className="section-title" style={{ fontSize: 14 }}>Start with a Campaign Template</div>
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>Choose a template to get started, or create your own campaign. Everything can be edited before saving.</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CAMPAIGN_TEMPLATES.map((template) => {
                      const active = form.templateId === template.id
                      return (
                        <button
                          key={template.id}
                          type="button"
                          className={active ? 'option-pill selected' : 'option-pill'}
                          style={{ justifyContent: 'flex-start', textAlign: 'left', minWidth: 0, padding: '8px 12px', gap: 8, fontSize: 12 }}
                          onClick={() => applyCampaignTemplate(template)}
                        >
                          <span className="option-mark">{active ? '✓' : null}</span>
                          {template.label}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      className={form.templateId === CREATE_FROM_SCRATCH.id ? 'option-pill selected' : 'option-pill'}
                      style={{ justifyContent: 'flex-start', textAlign: 'left', minWidth: 0, padding: '8px 12px', gap: 8, fontSize: 12 }}
                      onClick={clearCampaignTemplate}
                    >
                      <span className="option-mark">{form.templateId === CREATE_FROM_SCRATCH.id ? '✓' : null}</span>
                      {CREATE_FROM_SCRATCH.label}
                    </button>
                  </div>
                </div>
              )}

              <div className="astrologer-modal-section">
                <div className="section-title" style={{ fontSize: 14 }}>Campaign Details</div>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Campaign Name</span>
                  <input className="text-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Career Guidance" />
                </label>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Short Description</span>
                  <input className="text-input" value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} placeholder="One-line summary shown on the campaign" />
                </label>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">What Users Can Ask?</span>
                  <textarea className="textarea-box" style={{ minHeight: 76 }} value={form.whatUsersCanAsk} onChange={(event) => setForm({ ...form, whatUsersCanAsk: event.target.value })} placeholder="e.g. Career timing, job changes, business moves, education guidance..." />
                </label>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Example Questions</span>
                  <textarea className="textarea-box" style={{ minHeight: 76 }} value={form.exampleQuestions} onChange={(event) => setForm({ ...form, exampleQuestions: event.target.value })} placeholder="One example per line. e.g.&#10;When should I switch jobs?&#10;Will I get a government job based on my horoscope?" />
                </label>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Detailed Description <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>(Optional)</span></span>
                  <textarea className="textarea-box" style={{ minHeight: 76 }} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Explain the scope of this campaign in detail." />
                </label>
              </div>

              <div className="astrologer-modal-section" style={{ borderTop: '1px solid var(--divider)', paddingTop: 18 }}>
                <div className="section-title" style={{ fontSize: 14 }}>Question Types & Pricing</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {['General', 'Personal'].map((type) => {
                    const active = form.questionTypes.includes(type)
                    const isPersonal = type === 'Personal'
                    return (
                      <div
                        key={type}
                        role="button"
                        tabIndex={0}
                        aria-pressed={active}
                        onClick={() => toggleQuestionType(type)}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') toggleQuestionType(type) }}
                        className="field-group"
                        style={{
                          margin: 0,
                          border: `1.5px solid ${active ? 'var(--primary)' : 'var(--surface-border)'}`,
                          borderRadius: 14,
                          background: active ? 'var(--primary-bg)' : 'var(--surface-strong)',
                          boxShadow: active ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                          padding: '14px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          transition: 'border-color 200ms var(--ease-premium), background 200ms var(--ease-premium), box-shadow 200ms var(--ease-premium)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span className="option-mark checkbox" style={active ? { borderColor: 'var(--primary)', background: 'var(--primary)', color: '#fff' } : undefined}>{active ? '✓' : null}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{type} Question</div>
                            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{isPersonal ? "Requires the user's birth details" : 'No horoscope needed'}</div>
                          </div>
                        </div>
                        <label className="field-group" style={{ margin: 0 }} onClick={(event) => event.stopPropagation()}>
                          <span className="field-label-top">Price (₹)</span>
                          <input
                            type="number"
                            min="0"
                            className="text-input"
                            value={Number(isPersonal ? form.personalPrice : form.generalPrice) || ''}
                            onChange={(event) => setForm({ ...form, [isPersonal ? 'personalPrice' : 'generalPrice']: Number(event.target.value) })}
                            placeholder={isPersonal ? '500' : '200'}
                          />
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="astrologer-modal-section" style={{ borderTop: '1px solid var(--divider)', paddingTop: 18 }}>
                <div className="section-title" style={{ fontSize: 14 }}>Subscriber Offer</div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="field-label-top">Enable offer</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Give first-time subscribers a discount.</div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={`btn btn-sm ${form.offerEnabled ? 'btn-primary' : 'btn-outline'}`} onClick={() => setForm({ ...form, offerEnabled: true })}>Yes</button>
                    <button type="button" className={`btn btn-sm ${!form.offerEnabled ? 'btn-primary' : 'btn-outline'}`} onClick={() => setForm({ ...form, offerEnabled: false })}>No</button>
                  </div>
                </div>
                {form.offerEnabled && (
                  <>
                    <div>
                      <div className="field-label-top">Discount</div>
                      <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
                        {DISCOUNT_CHOICES.map((value) => (
                          <button key={value} type="button" className={`btn btn-sm ${Number(form.discountPercent) === value ? 'btn-primary' : 'btn-outline'}`} onClick={() => setForm({ ...form, discountPercent: value })}>{value}%</button>
                        ))}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="number" min="0" max="100" className="text-input" style={{ width: 84 }} value={Number(form.discountPercent) || ''} onChange={(event) => setForm({ ...form, discountPercent: Number(event.target.value) })} />
                          <span className="muted">%</span>
                        </label>
                      </div>
                    </div>
                    <div className="rounded-[14px] bg-[color:var(--surface-soft)] px-4 py-3 grid gap-2">
                      {form.questionTypes.includes('General') && (
                        <div className="flex items-center justify-between"><span className="muted">General</span><span className="font-bold" style={{ color: 'var(--ink)' }}>₹{inr(generalPreview.originalPrice)} → ₹{inr(generalPreview.offerPrice)}</span></div>
                      )}
                      {form.questionTypes.includes('Personal') && (
                        <div className="flex items-center justify-between"><span className="muted">Personal</span><span className="font-bold" style={{ color: 'var(--ink)' }}>₹{inr(personalPreview.originalPrice)} → ₹{inr(personalPreview.offerPrice)}</span></div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="astrologer-modal-section" style={{ borderTop: '1px solid var(--divider)', paddingTop: 18 }}>
                <div className="section-title" style={{ fontSize: 14 }}>Monthly Question Capacity · {monthLabel}</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-[12px] bg-[color:var(--surface-soft)] px-4 py-2 text-center">
                    <div className="muted" style={{ fontSize: 11 }}>Total Monthly Capacity</div>
                    <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{inr(monthSummary.capacity)}</div>
                  </div>
                  <div className="rounded-[12px] bg-[color:var(--surface-soft)] px-4 py-2 text-center">
                    <div className="muted" style={{ fontSize: 11 }}>Currently Allocated</div>
                    <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{inr(committedAllocation)}</div>
                  </div>
                  <div className="rounded-[12px] bg-[color:var(--surface-soft)] px-4 py-2 text-center">
                    <div className="muted" style={{ fontSize: 11 }}>Available to Allocate</div>
                    <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{inr(otherAllocation)}</div>
                  </div>
                </div>
                <label className="field-group" style={{ margin: 0, maxWidth: 280 }}>
                  <span className="field-label-top">Campaign Allocation</span>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(otherAllocation, 0)}
                    className="text-input"
                    value={Number(form.totalLimit) || ''}
                    placeholder="e.g. 300"
                    onChange={(event) => setForm({ ...form, totalLimit: Number(event.target.value) })}
                  />
                </label>
                {reservableRemaining < 0 ? (
                  <div className="text-sm font-medium text-[color:var(--danger)]">
                    This exceeds the available capacity by {inr(-reservableRemaining)}. Reduce the allocation to at most {inr(otherAllocation)} slots.
                  </div>
                ) : (
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                    Remaining after this allocation: <strong style={{ color: 'var(--ink)' }}>{inr(reservableRemaining)}</strong> slots for the month.
                  </p>
                )}
              </div>

              <div className="astrologer-modal-section" style={{ borderTop: '1px solid var(--divider)', paddingTop: 18 }}>
                <div className="section-title" style={{ fontSize: 14 }}>General / Personal Slot Split</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="field-group" style={{ margin: 0 }}>
                    <span className="field-label-top">General Question Slots</span>
                    <input
                      type="number"
                      min="0"
                      max={Math.max(otherAllocation, 0)}
                      className="text-input"
                      disabled={!form.questionTypes.includes('General')}
                      value={Number(form.questionTypes.includes('General') ? form.generalLimit : 0) || ''}
                      placeholder={form.questionTypes.includes('General') ? 'e.g. 200' : 'Unavailable'}
                      onChange={(event) => setForm({ ...form, generalLimit: Number(event.target.value) })}
                    />
                  </label>
                  <label className="field-group" style={{ margin: 0 }}>
                    <span className="field-label-top">Personal Question Slots</span>
                    <input
                      type="number"
                      min="0"
                      max={Math.max(otherAllocation, 0)}
                      className="text-input"
                      disabled={!form.questionTypes.includes('Personal')}
                      value={Number(form.questionTypes.includes('Personal') ? form.personalLimit : 0) || ''}
                      placeholder={form.questionTypes.includes('Personal') ? 'e.g. 100' : 'Unavailable'}
                      onChange={(event) => setForm({ ...form, personalLimit: Number(event.target.value) })}
                    />
                  </label>
                </div>
                {allocationValue > 0 && (
                  splitMismatch ? (
                    <div className="text-sm font-medium text-[color:var(--danger)]">
                      {splitTotal} of {inr(allocationValue)} allocated — General and Personal slots must add up to the campaign allocation ({inr(allocationValue)}).
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-[color:var(--success)]">Allocation split confirmed — General {inr(generalSlotsValue)} + Personal {inr(personalSlotsValue)} = {inr(splitTotal)}.</div>
                  )
                )}
              </div>

              <div className="astrologer-modal-section" style={{ borderTop: '1px solid var(--divider)', paddingTop: 18 }}>
                <div className="section-title" style={{ fontSize: 14 }}>Availability</div>
                <p className="muted" style={{ fontSize: 13, marginBottom: 10, marginTop: 2 }}>Dates are locked to the campaign month — {form.month ? getMonthLabel(form.month) : 'choose a month'} ({formDateRange?.min || '–'} to {formDateRange?.max || '–'}). To move a campaign to another month, use “Reuse for Next Month”.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="field-group" style={{ margin: 0 }}>
                    <span className="field-label-top">Start Date</span>
                    <input type="date" className="text-input" min={formDateRange?.min} max={formDateRange?.max} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                  </label>
                  <label className="field-group" style={{ margin: 0 }}>
                    <span className="field-label-top">End Date</span>
                    <input type="date" className="text-input" min={form.date || formDateRange?.min} max={formDateRange?.max} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
                  </label>
                </div>
              </div>

              {formError && <div className="rounded-[14px] border border-[color:var(--danger-bg)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm font-medium text-[color:var(--danger)]">{formError}</div>}
                </div>
              </fieldset>
            </div>

            <div className="modal-card__footer user-modal-card__footer">
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={closeCampaignModal}>{campaignViewOnly ? 'Done' : 'Cancel'}</button>
              </div>
              {!campaignViewOnly && (
                editingPublishedStatus
                  ? (
                    <button type="button" className="btn btn-primary" onClick={() => submitCampaign(editingPublishedStatus)}>Save Changes</button>
                  )
                  : (
                    <>
                      <button type="button" className="btn btn-outline" onClick={() => submitCampaign('Draft')}>Save Draft</button>
                      <button type="button" className="btn btn-outline" onClick={() => { setScheduleOpen((open) => !open); setFormError('') }}>Schedule</button>
                      <button type="button" className="btn btn-primary" onClick={() => submitCampaign('Active')}><Rocket size={15} /> Publish Now</button>
                    </>
                  )
              )}
              {!campaignViewOnly && scheduleOpen && (
                <div style={{ flexBasis: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10 }}>
                  <label className="field-group" style={{ margin: 0, flex: '1 1 260px', minWidth: 200 }}>
                    <span className="field-label-top">Schedule Publish</span>
                    <input
                      type="datetime-local"
                      className="text-input"
                      value={scheduleDateTime}
                      min={toInputDateTime(Date.now() + 60 * 1000)}
                      onChange={(event) => setScheduleDateTime(event.target.value)}
                    />
                  </label>
                  <button type="button" className="btn btn-primary" onClick={handleSchedule}>Set Schedule</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setScheduleOpen(false)}>Discard</button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {deletePendingCampaign && createPortal(
        <div className="modal-overlay user-modal-overlay" onClick={() => setDeletePendingCampaignId(null)}>
          <div
            className="modal-card user-modal-card"
            style={{ width: 'min(420px, calc(100vw - 32px))' }}
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-campaign-title"
          >
            <div className="modal-card__header user-modal-card__header">
              <span className="stat-icon tone-red" style={{ width: 46, height: 46, borderRadius: 14 }}><AlertTriangle size={22} /></span>
              <div style={{ minWidth: 0 }}>
                <div id="delete-campaign-title" className="section-title" style={{ marginBottom: 0 }}>Delete Campaign?</div>
                <p className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}>
                  Are you sure you want to delete this campaign? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="modal-card__footer user-modal-card__footer">
              <div style={{ flex: 1 }} />
              <button type="button" className="btn btn-outline" onClick={() => setDeletePendingCampaignId(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={confirmDeleteCampaignFlow}>Delete Campaign</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {openSettingsModalOpen && createPortal(
        <div className="modal-overlay user-modal-overlay" onClick={closeOpenSettingsModal}>
          <div
            className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll"
            style={{ width: 'min(760px, calc(100vw - 32px))' }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="open-settings-form-title"
          >
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div style={{ minWidth: 0 }}>
                <div id="open-settings-form-title" className="section-title" style={{ marginBottom: 0 }}>Open Question Settings</div>
                <p className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}>
                  Set default prices and monthly capacity for questions asked outside a campaign. Open capacity counts toward the same {inr(monthSummary.capacity)} monthly limit ({monthLabel}).
                </p>
              </div>
              <button type="button" className="icon-btn" aria-label="Close open question settings" onClick={closeOpenSettingsModal}><X size={18} /></button>
            </div>

            <div className="modal-card__content user-modal-card__content astrologer-modal-content">
              <div className="astrologer-modal-section">
                <div className="section-title" style={{ fontSize: 14 }}>Question Types & Default Pricing</div>
                <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
                  Enable the question types users can ask outside a campaign and set their default prices. At least one type must stay enabled.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {['General', 'Personal'].map((type) => {
                    const isPersonal = type === 'Personal'
                    const enabled = (isPersonal ? openForm.personalEnabled : openForm.generalEnabled) !== false
                    return (
                      <div
                        key={type}
                        role="button"
                        tabIndex={0}
                        aria-pressed={enabled}
                        onClick={() => toggleOpenType(type)}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') toggleOpenType(type) }}
                        className="field-group"
                        style={{
                          margin: 0,
                          border: `1.5px solid ${enabled ? 'var(--primary)' : 'var(--surface-border)'}`,
                          borderRadius: 14,
                          background: enabled ? 'var(--primary-bg)' : 'var(--surface-strong)',
                          boxShadow: enabled ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                          padding: '14px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          transition: 'border-color 200ms var(--ease-premium), background 200ms var(--ease-premium), box-shadow 200ms var(--ease-premium)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span className="option-mark checkbox" style={enabled ? { borderColor: 'var(--primary)', background: 'var(--primary)', color: '#fff' } : undefined}>{enabled ? '✓' : null}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{type} Question</div>
                            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{isPersonal ? "Requires the user's birth details" : 'No horoscope needed'}</div>
                          </div>
                          <span className="muted" style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600 }}>{enabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <label className="field-group" style={{ margin: 0 }} onClick={(event) => event.stopPropagation()}>
                          <span className="field-label-top">Default {type} Price (₹)</span>
                          <input
                            type="number"
                            min="0"
                            className="text-input"
                            disabled={!enabled}
                            value={Number(isPersonal ? openForm.personalPrice : openForm.generalPrice) || ''}
                            onChange={(event) => setOpenForm({ ...openForm, [isPersonal ? 'personalPrice' : 'generalPrice']: Number(event.target.value) })}
                            placeholder={isPersonal ? '500' : '200'}
                          />
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="astrologer-modal-section" style={{ borderTop: '1px solid var(--divider)', paddingTop: 18 }}>
                <div className="section-title" style={{ fontSize: 14 }}>Monthly Question Capacity · {monthLabel}</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-[12px] bg-[color:var(--surface-soft)] px-4 py-2 text-center">
                    <div className="muted" style={{ fontSize: 11 }}>Total Monthly Capacity</div>
                    <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{inr(monthSummary.capacity)}</div>
                  </div>
                  <div className="rounded-[12px] bg-[color:var(--surface-soft)] px-4 py-2 text-center">
                    <div className="muted" style={{ fontSize: 11 }}>Campaigns Allocated</div>
                    <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{inr(monthSummary.campaignAllocation)}</div>
                  </div>
                  <div className="rounded-[12px] bg-[color:var(--surface-soft)] px-4 py-2 text-center">
                    <div className="muted" style={{ fontSize: 11 }}>Available to Allocate</div>
                    <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{inr(availableOpenAllocation)}</div>
                  </div>
                </div>
                <label className="field-group" style={{ margin: 0, maxWidth: 280 }}>
                  <span className="field-label-top">Open Questions Allocation</span>
                  <input
                    type="number"
                    min="0"
                    max={Math.max(availableOpenAllocation, 0)}
                    className="text-input"
                    value={Number(openForm.capacity) || ''}
                    placeholder="e.g. 500"
                    onChange={(event) => setOpenForm({ ...openForm, capacity: Number(event.target.value) })}
                  />
                </label>
                {openRemaining < 0 ? (
                  <div className="text-sm font-medium text-[color:var(--danger)]">
                    This exceeds the available capacity by {inr(-openRemaining)}. Reduce the open allocation to at most {inr(availableOpenAllocation)} slots.
                  </div>
                ) : (
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                    Remaining: <strong style={{ color: 'var(--ink)' }}>{inr(openRemaining)}</strong> slots for the month.
                  </p>
                )}
              </div>

              {openError && <div className="rounded-[14px] border border-[color:var(--danger-bg)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm font-medium text-[color:var(--danger)]">{openError}</div>}
            </div>

            <div className="modal-card__footer user-modal-card__footer">
              <div style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost" onClick={closeOpenSettingsModal}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={saveOpenSettings}>Save Open Question Settings</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {view === 'received' && (
        <>
          <Section title="Received Questions" icon={MessageCircleQuestion} titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>{filteredQuestions.length} questions</span>}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={goToOverview}><ArrowLeft size={14} /> Overview</button>
              <div className="search-filter-row__group">
                <div className="search-bar">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') setAppliedSearch(search) }}
                    placeholder="Search by question ID, user, campaign, type, or question text"
                    className="text-input search-bar__input"
                  />
                  <button type="button" className="icon-btn" aria-label="Search" onClick={() => setAppliedSearch(search)}><Search size={18} /></button>
                  {appliedSearch && <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setAppliedSearch('') }}>Clear</button>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2" style={{ margin: '16px 0' }}>
              {QUESTION_STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                  {status !== 'All' && <span className="ml-1 opacity-70">({myQuestions.filter((question) => question.status === status).length})</span>}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Questions" icon={TempleScrollIcon} titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>{filteredQuestions.length} {statusFilter === 'All' ? 'total' : statusFilter.toLowerCase()}</span>}>
            {filteredQuestions.length === 0 ? (
              <Card><div className="muted">No matching questions found{statusFilter !== 'All' ? ` in ${statusFilter}` : ''}. Try a different status or search term.</div></Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredQuestions.map((question) => (
                  <Card
                    key={question.id}
                    hover
                    onClick={() => openQuestion(question.id)}
                    style={{ cursor: 'pointer', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{question.user}</div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{question.id}</div>
                      </div>
                      <StatusBadge label={question.status} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="badge badge-violet">{question.campaignName || 'Open Question'}</span>
                      <span className="badge badge-blue">{question.type}</span>
                      <span className="muted" style={{ fontSize: 12 }}>{question.purchaseType === 'Free' ? 'Free' : `₹${inr(question.purchaseAmount)}`}</span>
                    </div>
                    <div style={{ color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      “{question.question}”
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 'auto' }}>Submitted: {question.raised || new Date(question.raisedAt || question.submittedAt || Date.now()).toLocaleString('en-IN')}</div>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={(event) => { event.stopPropagation(); openQuestion(question.id) }}
                    >
                      {question.status === 'Answered' ? 'View Answer' : 'View & Answer'}
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {panelQuestion && createPortal(
        <div className="modal-overlay" onClick={closePanel}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(680px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div style={{ minWidth: 0 }}>
                <div className="astrologer-modal-title">Question Details</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{panelQuestion.user} · {panelQuestion.id}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <StatusBadge label={panelQuestion.status} />
                <button type="button" className="icon-btn" aria-label="Close" onClick={closePanel}><X size={16} /></button>
              </div>
            </div>

            <div className="modal-card__content astrologer-modal-content">
              <div className="astrologer-modal-highlight astrologer-modal-details-grid">
                <div><strong>User</strong><div className="muted">{panelQuestion.user}</div></div>
                <div><strong>Campaign</strong><div className="muted">{panelQuestion.campaignName || 'Open Question'}</div></div>
                <div><strong>Type</strong><div className="muted">{panelQuestion.type || 'General'} Question</div></div>
                <div><strong>Price</strong><div className="muted">{panelQuestion.purchaseType === 'Free' ? 'Free' : `₹${inr(panelQuestion.purchaseAmount)}`} {panelQuestion.purchaseType === 'Paid' ? '(Paid)' : panelQuestion.purchaseType === 'Purchased Slot' ? '(Purchased Slot)' : ''}</div></div>
                <div><strong>Question For</strong><div className="muted">{panelQuestion.questionFor}</div></div>
                <div><strong>Language</strong><div className="muted">{panelQuestion.language}</div></div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleScrollIcon size={14} />User Question</div>
                <div className="astrologer-modal-highlight astrologer-modal-question">
                  {(() => {
                    const { preview, isTruncated } = getWordPreview(panelQuestion.question)
                    return <>
                      “{preview}”
                      {isTruncated && <button type="button" className="link-btn ml-1" aria-label="See full user question" onClick={() => setFullContent({ title: 'User Question', content: panelQuestion.question })}>See more…</button>}
                    </>
                  })()}
                </div>
              </div>

              {panelQuestion.type === 'Personal' && (
                <div className="astrologer-modal-section">
                  <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleLotusIcon size={14} />Horoscope Details</div>
                  <div className="option-list" style={{ gap: 10 }}>
                    <div className="option-pill selected"><span className="option-mark">✓</span>{panelQuestion.horoscopeMode}</div>
                    {(panelQuestion.attachments || []).map((file) => (
                      <button key={file} className="option-pill" type="button" onClick={() => window.alert(`Opening ${file}`)}><span className="option-mark"><TempleScrollIcon size={14} /></span>{file}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleLampIcon size={14} />Answer</div>
                {answerIsReadOnly ? (
                  <div className="astrologer-modal-highlight astrologer-modal-question">
                    {(() => {
                      const fullAnswer = answer || 'No answer was provided.'
                      const { preview, isTruncated } = getWordPreview(fullAnswer)
                      return <>
                        “{preview}”
                        {isTruncated && <button type="button" className="link-btn ml-1" aria-label="See full astrologer answer" onClick={() => setFullContent({ title: 'Astrologer Answer', content: fullAnswer })}>See more…</button>}
                      </>
                    })()}
                  </div>
                ) : <>
                  <textarea
                    className="textarea-box"
                    style={{ width: '100%' }}
                    placeholder="Type your answer here..."
                    maxLength={3000}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                  />
                  <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>Characters: {answer.length} / 3000</div>
                </>}
                {isUnderReview && (
                  <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                    {reviewActive
                      ? canEditSubmittedAnswer
                        ? 'Answer held for review. One correction is available before delivery.'
                        : 'Correction saved. The answer is locked until automatic delivery.'
                      : 'Review window ended. The answer will be delivered automatically.'}
                  </div>
                )}
                {draftSaved && <div style={{ color: 'var(--green-600)', fontSize: 13, marginTop: 6 }}>Draft saved.</div>}
              </div>
            </div>

            <div className="modal-card__footer astrologer-modal-footer-actions">
              {panelQuestion.status === 'Answered' && <span style={{ color: 'var(--green-600)', fontSize: 13, fontWeight: 600, marginRight: 'auto' }}>Submitted Successfully</span>}
              <button className="btn btn-ghost" onClick={closePanel}>Close</button>
              {isUnderReview && canEditSubmittedAnswer && !editingSubmittedAnswer && (
                <button className="btn btn-outline" onClick={() => setEditingSubmittedAnswer(true)}>Enable One-Time Edit</button>
              )}
              {isUnderReview && editingSubmittedAnswer && (
                <button className="btn btn-primary" disabled={!answer.trim()} onClick={saveCorrection}>Save Correction</button>
              )}
              {panelQuestion.status !== 'Answered' && !isUnderReview && (
                <>
                  <button className="btn btn-outline" disabled={!answer.trim()} onClick={saveDraft}>Save Draft</button>
                  <button className="btn btn-primary" disabled={!answer.trim()} onClick={submitAnswer}>Submit Answer</button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {justSubmitted && <SuccessAlert message="Answer submitted successfully." onDismiss={() => setJustSubmitted(false)} />}
      {successMessage && <SuccessAlert message={successMessage} onDismiss={() => setSuccessMessage('')} />}

      {fullContent && createPortal(
        <div className="modal-overlay" style={{ zIndex: 70 }} onClick={() => setFullContent(null)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(640px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="astrologer-modal-title">{fullContent.title}</div>
              <button type="button" className="icon-btn" aria-label="Close full content" onClick={() => setFullContent(null)} style={{ width: 32, height: 32, minWidth: 32 }}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="astrologer-modal-highlight astrologer-modal-question" style={{ whiteSpace: 'pre-wrap' }}>{fullContent.content}</div>
            </div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-primary" onClick={() => setFullContent(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}