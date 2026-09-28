import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Activity, CalendarDays, Headphones, MessageCircle, PhoneCall, MessageSquare, Phone, Trash2, X, Clock3, Timer, Tag, CheckCircle2, User, Wallet, Radio, Megaphone, AlertTriangle, Users, ChevronRight } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { fromIsoDate, parseTimeToMinutes } from '../utils/appointments.js'

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatDatePart(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTimePart(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

const ACTIVITY_LOG_KIND_ICONS = {
  questions: MessageSquare,
  appointments: CalendarDays,
  wallet: Wallet,
  live: Radio,
  campaigns: Megaphone,
  disputes: AlertTriangle,
  audience: Users,
}

// Per-kind badge label + icon-container tone, driving the color accents on
// each Recent Activity card (purple/orange/teal/blue/violet + a few extra
// tones for the kinds beyond the original four).
const ACTIVITY_KIND_META = {
  questions: { label: 'Text Question', tone: 'tone-violet' },
  appointments: { label: 'Appointment', tone: 'tone-coral' },
  calls: { label: 'Instant Call', tone: 'tone-teal' },
  chats: { label: 'Instant Chat', tone: 'tone-sky' },
  wallet: { label: 'Wallet Transaction', tone: 'tone-secondary' },
  live: { label: 'Live Session', tone: 'tone-rose' },
  campaigns: { label: 'Campaign', tone: 'tone-amber' },
  disputes: { label: 'Dispute', tone: 'tone-red' },
  audience: { label: 'Audience', tone: 'tone-neutral' },
}

export default function AstrologerActivity() {
  const { currentUser } = useAuth()
  const { questions, consultationHistory, activityLog, campaigns, astrologerLiveSessions, astrologerWallet } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
  const [selectedItem, setSelectedItem] = useState(null)
  const [hiddenActivityIds, setHiddenActivityIds] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('astroconnect-hidden-astrologer-activities') || '[]') } catch { return [] }
  })

  const now = Date.now()

  const handleDelete = (item) => {
    const updated = [...hiddenActivityIds, item.id]
    setHiddenActivityIds(updated)
    window.localStorage.setItem('astroconnect-hidden-astrologer-activities', JSON.stringify(updated))
  }

  // Note: there is deliberately no snapshot feed here built from the raw
  // `appointments` list — booking an appointment must never create a Recent
  // Activity entry by itself. Appointment activity only ever comes from the
  // activityLog (see activityLogItems below): "Appointment Viewed" (logged
  // when the astrologer opens an appointment's details from Appointment
  // History) plus genuine actions like reschedule/cancel/complete.

  const questionItems = useMemo(() => {
    return questions
      .filter((question) => question.astrologerId === astrologerId)
      .map((question) => {
        const occurredAtMs = new Date(question.answerDeliveredAt || question.answeredAt || question.raisedAt || new Date()).getTime()
        return {
          id: `question-${question.id}`,
          kind: 'questions',
          displayName: question.user || 'User',
          title: `${question.user || 'User'} · Text Question`,
          summary: question.status === 'Answered' && question.answer
            ? question.answer
            : question.question || 'Text question',
          status: question.status || 'Pending',
          occurredAtMs,
          meta: question.raised || formatDateTime(occurredAtMs),
          icon: MessageSquare,
          extra: question.category ? `Category: ${question.category}` : null,
          customerName: question.user || 'User',
          amountPaid: Number(question.purchaseAmount ?? 0),
          popupTitle: 'Text Details',
          detailDate: formatDatePart(occurredAtMs),
          detailTime: formatTimePart(occurredAtMs),
          detailExtraLabel: 'Question Type',
          detailExtraValue: question.category || '—',
          detailType: 'Text',
          paymentStatus: 'Paid',
        }
      })
  }, [questions, astrologerId])

  const callItems = useMemo(() => {
    return consultationHistory
      .filter((session) => session.astrologerId === astrologerId && session.type === 'Audio Call')
      .map((session) => {
        const occurredAtMs = new Date(session.startedAt || new Date()).getTime()
        return {
          id: `call-${session.id}`,
          kind: 'calls',
          displayName: session.customerName || 'Customer',
          title: `${session.customerName || 'Customer'} · Instant Call`,
          summary: session.messages?.at(-1)?.text || `${session.durationMinutes || 0} minute call completed`,
          status: session.status || 'Completed',
          occurredAtMs,
          meta: `${formatDateTime(occurredAtMs)} · ${session.durationMinutes || 0} min`,
          icon: Phone,
          customerName: session.customerName || 'Customer',
          amountPaid: Number(session.amount ?? 0),
          popupTitle: 'Instant Call Details',
          detailDate: formatDatePart(occurredAtMs),
          detailTime: formatTimePart(occurredAtMs),
          detailExtraLabel: 'Duration',
          detailExtraValue: session.durationMinutes ? `${session.durationMinutes} min` : '—',
          detailType: 'Instant Call',
          paymentStatus: 'Paid',
        }
      })
  }, [consultationHistory, astrologerId])

  const chatItems = useMemo(() => {
    return consultationHistory
      .filter((session) => session.astrologerId === astrologerId && session.type === 'Chat')
      .map((session) => {
        const occurredAtMs = new Date(session.startedAt || new Date()).getTime()
        return {
          id: `chat-${session.id}`,
          kind: 'chats',
          displayName: session.customerName || 'Customer',
          title: `${session.customerName || 'Customer'} · Instant Chat`,
          summary: session.messages?.at(-1)?.text || `${session.durationMinutes || 0} minute chat completed`,
          status: session.status || 'Completed',
          occurredAtMs,
          meta: `${formatDateTime(occurredAtMs)} · ${session.durationMinutes || 0} min`,
          icon: MessageCircle,
          customerName: session.customerName || 'Customer',
          amountPaid: Number(session.amount ?? 0),
          popupTitle: 'Instant Chat Details',
          detailDate: formatDatePart(occurredAtMs),
          detailTime: formatTimePart(occurredAtMs),
          detailExtraLabel: 'Duration',
          detailExtraValue: session.durationMinutes ? `${session.durationMinutes} min` : '—',
          detailType: 'Instant Chat',
          paymentStatus: 'Paid',
        }
      })
  }, [consultationHistory, astrologerId])

  const campaignItems = useMemo(() => {
    return campaigns
      .filter((campaign) => campaign.astrologerId === astrologerId)
      .map((campaign) => {
        const occurredAtMs = new Date(campaign.date).getTime()
        return {
          id: `campaign-${campaign.id}`,
          kind: 'campaigns',
          displayName: campaign.name,
          title: `${campaign.name} · Campaign`,
          summary: `${campaign.categories?.length || 0} categories · ends ${campaign.endDate || 'no end date'}`,
          status: campaign.status || 'Draft',
          occurredAtMs: Number.isNaN(occurredAtMs) ? Date.now() : occurredAtMs,
          meta: `${campaign.date} – ${campaign.endDate || '—'}`,
          icon: Megaphone,
          customerName: null,
          amountPaid: campaign.generalPrice || campaign.personalPrice || campaign.packagePrice || null,
          amountLabel: 'Price',
          popupTitle: 'Campaign Details',
          detailDate: campaign.date,
          detailTime: campaign.endDate || '—',
          detailExtraLabel: 'Discount',
          detailExtraValue: `${campaign.discountPercent || 0}%`,
          detailTypeLabel: 'Status',
          detailType: campaign.status || 'Draft',
          paymentStatus: campaign.status || 'Draft',
        }
      })
  }, [campaigns, astrologerId])

  const liveSessionItems = useMemo(() => {
    return astrologerLiveSessions
      .filter((session) => session.astrologerId === astrologerId)
      .map((session) => {
        const occurredAtMs = new Date(session.startedAt || session.scheduledStartAt || session.createdAt || new Date()).getTime()
        const durationMs = session.startedAt && session.endedAt
          ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
          : null
        return {
          id: `live-${session.id}`,
          kind: 'live',
          displayName: session.title || 'Untitled session',
          title: `${session.title || 'Untitled session'} · Live Session`,
          summary: session.description || `${session.category || 'Live session'}`,
          status: session.status || 'upcoming',
          occurredAtMs,
          meta: formatDateTime(occurredAtMs),
          icon: Radio,
          customerName: null,
          amountPaid: session.status === 'upcoming' ? null : Number(session.earnings || 0),
          popupTitle: 'Live Session Details',
          detailDate: formatDatePart(occurredAtMs),
          detailTime: formatTimePart(occurredAtMs),
          detailExtraLabel: 'Duration',
          detailExtraValue: durationMs != null ? `${Math.round(durationMs / 60000)} min` : '—',
          detailTypeLabel: 'Status',
          detailType: session.status || 'upcoming',
          paymentStatus: session.status || 'upcoming',
        }
      })
  }, [astrologerLiveSessions, astrologerId])

  const disputeItems = useMemo(() => {
    return questions
      .filter((question) => question.astrologerId === astrologerId && question.dispute)
      .map((question) => {
        const occurredAtMs = new Date(question.raisedAt || question.answeredAt || new Date()).getTime()
        return {
          id: `dispute-${question.id}`,
          kind: 'disputes',
          displayName: question.user || 'User',
          title: `${question.user || 'User'} · Dispute`,
          summary: question.dispute.reason || 'Dispute raised on this question',
          status: question.dispute.status || 'Open',
          occurredAtMs,
          meta: formatDateTime(occurredAtMs),
          icon: AlertTriangle,
          customerName: question.user || 'User',
          amountPaid: Number(question.purchaseAmount ?? 0),
          popupTitle: 'Dispute Details',
          popupDescription: question.dispute.description || question.dispute.reason || '',
          detailDate: formatDatePart(occurredAtMs),
          detailTime: formatTimePart(occurredAtMs),
          detailExtraLabel: 'Related ID',
          detailExtraValue: question.id,
          detailTypeLabel: 'Status',
          detailType: question.dispute.status || 'Open',
          paymentStatus: question.dispute.status || 'Open',
        }
      })
  }, [questions, astrologerId])

  const walletItems = useMemo(() => {
    return (astrologerWallet?.ledger || []).map((entry) => {
      const dateObj = fromIsoDate(entry.date)
      dateObj.setMinutes(parseTimeToMinutes(entry.time))
      const occurredAtMs = dateObj.getTime()
      const label = entry.customer ? `${entry.customer} · Wallet Transaction` : 'Wallet Transaction'
      return {
        id: `wallet-${entry.id}`,
        kind: 'wallet',
        displayName: entry.customer || 'Wallet',
        title: label,
        summary: entry.description || entry.sourceSummary || 'Wallet activity',
        status: entry.status || 'Completed',
        occurredAtMs,
        meta: formatDateTime(occurredAtMs),
        icon: Wallet,
        customerName: entry.customer || null,
        amountPaid: Math.abs(Number(entry.amount) || 0),
        amountLabel: 'Amount',
        popupTitle: 'Wallet Transaction Details',
        detailDate: formatDatePart(occurredAtMs),
        detailTime: formatTimePart(occurredAtMs),
        detailExtraLabel: 'Related ID',
        detailExtraValue: entry.sourceRef || entry.id,
        detailTypeLabel: 'Type',
        detailType: entry.type ? entry.type.charAt(0).toUpperCase() + entry.type.slice(1) : 'Transaction',
        paymentStatus: entry.status || 'Completed',
      }
    })
  }, [astrologerWallet])

  // Discrete, append-only work-action entries (e.g. "Question Viewed",
  // "Withdrawal Requested", "Live Session Ended") logged by AppDataContext
  // actions. These never change a record's own business status — they just
  // record that the astrologer did something, alongside the status-snapshot
  // items above.
  const activityLogItems = useMemo(() => {
    return (activityLog || [])
      .filter((entry) => entry.astrologerId === astrologerId)
      .map((entry) => {
        const occurredAtMs = new Date(entry.createdAt).getTime()
        return {
          id: entry.id,
          kind: entry.kind,
          displayName: entry.customerName || entry.title,
          title: entry.title,
          summary: entry.description,
          status: entry.moduleStatus || entry.title,
          occurredAtMs,
          meta: formatDateTime(occurredAtMs),
          icon: ACTIVITY_LOG_KIND_ICONS[entry.kind] || Activity,
          customerName: entry.customerName || null,
          amountPaid: entry.amount != null ? Number(entry.amount) : null,
          popupTitle: entry.title,
          popupDescription: entry.description,
          detailDate: formatDatePart(occurredAtMs),
          detailTime: formatTimePart(occurredAtMs),
          detailExtraLabel: 'Related ID',
          detailExtraValue: entry.relatedId || '—',
          detailTypeLabel: 'Status',
          detailType: entry.moduleStatus || '—',
          amountLabel: 'Amount',
          paymentStatus: entry.moduleStatus || null,
        }
      })
  }, [activityLog, astrologerId])

  const allItems = useMemo(() => {
    return [
      ...questionItems,
      ...callItems,
      ...chatItems,
      ...walletItems,
      ...liveSessionItems,
      ...campaignItems,
      ...disputeItems,
      ...activityLogItems,
    ]
  }, [questionItems, callItems, chatItems, walletItems, liveSessionItems, campaignItems, disputeItems, activityLogItems])

  // A single, complete chronological history — every activity from every
  // module, newest first. No time-window cutoff: a hard "last 7 days" filter
  // would hide most non-appointment demo history and make the merge look
  // broken, so every record source is shown regardless of age.
  const recentItems = useMemo(() => {
    return allItems
      .filter((item) => item.occurredAtMs <= now)
      .filter((item) => !hiddenActivityIds.includes(item.id))
      .sort((a, b) => b.occurredAtMs - a.occurredAtMs)
  }, [allItems, now, hiddenActivityIds])

  return (
    <div>
      <PageHeader
        eyebrow="Astrologer workspace"
        title="My Activity"
        subtitle="Recent appointment completions, consultation sessions, and remedy notes in one place."
      />

      <Section title="Recent Activity">
        <p className="my-activity-subtitle">Everything you've done across appointments, questions, calls, chats, wallet, live sessions, campaigns, disputes and audience — newest first.</p>
        {recentItems.length ? (
          <div className="my-activity-list">
            {recentItems.map((item) => {
              const Icon = item.icon
              const meta = ACTIVITY_KIND_META[item.kind] || { label: item.kind, tone: 'tone-neutral' }
              return (
                <div
                  key={item.id}
                  className="my-activity-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedItem(item)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedItem(item) }}
                >
                  <div className={`my-activity-card__icon ${meta.tone}`}>
                    <Icon size={20} />
                  </div>
                  <div className="my-activity-card__body">
                    <div className="my-activity-card__top">
                      <span className={`my-activity-badge ${meta.tone}`}>{meta.label}</span>
                      <span className="my-activity-card__name">{item.displayName}</span>
                    </div>
                    <p className="my-activity-card__desc">{item.summary}</p>
                    <div className="my-activity-card__meta">
                      <span>{item.meta}</span>
                      {item.extra && <span>{item.extra}</span>}
                    </div>
                  </div>
<div className="my-activity-card__right">
                     <StatusBadge label={item.status} />
                     <ChevronRight size={18} className="my-activity-card__chevron" />
                   </div>
                   <button type="button" className="my-activity-delete" onClick={(event) => { event.stopPropagation(); handleDelete(item) }} aria-label="Delete activity"><Trash2 size={16} /></button>
                </div>
              )
            })}
          </div>
        ) : (
          <Card>
            <div className="empty-state">
              <Activity size={18} />
              <h3>No activity yet</h3>
              <p>Check back later for updates.</p>
            </div>
          </Card>
        )}
      </Section>

      {selectedItem && createPortal(
        <div
          className="modal-overlay appointment-modal-overlay"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="modal-card appointment-popup-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="appointment-popup-header">
              <div className="astrologer-modal-title">{selectedItem.popupTitle}</div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={() => setSelectedItem(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-card__content appointment-popup-content">
              {selectedItem.customerName && (
                <div className="appointment-popup-user">
                  <div className="appointment-popup-avatar">
                    {selectedItem.customerName?.trim()?.charAt(0)?.toUpperCase() || <User size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div className="appointment-popup-user-name">{selectedItem.customerName}</div>
                    <div className="appointment-popup-user-sub">Client</div>
                  </div>
                </div>
              )}

              {selectedItem.popupDescription && (
                <div className="activity-meta" style={{ marginBottom: 4 }}>{selectedItem.popupDescription}</div>
              )}

              {selectedItem.amountPaid != null && (
                <div className="appointment-popup-amount">
                  <div className="appointment-popup-amount-row">
                    <span className="appointment-popup-label">{selectedItem.amountLabel || 'Amount Paid'}</span>
                    <span className="appointment-popup-paid-chip">
                      <CheckCircle2 size={12} />
                      {selectedItem.paymentStatus || 'Paid'}
                    </span>
                  </div>
                  <div className="appointment-popup-amount-value">
                    ₹{selectedItem.amountPaid.toLocaleString('en-IN')}
                  </div>
                </div>
              )}

              <div className="appointment-popup-info-card">
                <div className="appointment-popup-info-row">
                  <div className="appointment-popup-info-icon"><CalendarDays size={15} /></div>
                  <div>
                    <div className="appointment-popup-info-label">Date</div>
                    <div className="appointment-popup-info-value">{selectedItem.detailDate}</div>
                  </div>
                </div>
                <div className="appointment-popup-info-row">
                  <div className="appointment-popup-info-icon"><Clock3 size={15} /></div>
                  <div>
                    <div className="appointment-popup-info-label">Time</div>
                    <div className="appointment-popup-info-value">{selectedItem.detailTime}</div>
                  </div>
                </div>
                <div className="appointment-popup-info-row">
                  <div className="appointment-popup-info-icon"><Timer size={15} /></div>
                  <div>
                    <div className="appointment-popup-info-label">{selectedItem.detailExtraLabel}</div>
                    <div className="appointment-popup-info-value">{selectedItem.detailExtraValue}</div>
                  </div>
                </div>
                <div className="appointment-popup-info-row">
                  <div className="appointment-popup-info-icon"><Tag size={15} /></div>
                  <div>
                    <div className="appointment-popup-info-label">{selectedItem.detailTypeLabel || 'Type'}</div>
                    <div className="appointment-popup-info-value">{selectedItem.detailType}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-card__footer">
              <button type="button" className="btn btn-primary" onClick={() => setSelectedItem(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
