import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  PhoneCall,
  MessageCircle,
  Search,
  UserCircle2,
  BadgeCheck,
  X,
  Clock3,
  ChevronRight,
  Headphones,
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { getInstantConsultations, subscribeToInstantConsultations } from '../../utils/instantConsultation.js'
import './instantConsultation.css'

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

function consultationAmount(session) {
  if (session?.amountPaid) return Number(session.amountPaid)
  if (session?.amount) return Number(session.amount)
  return (Number(session?.pricePerMinute) || 0) * (session?.durationMinutes || 0)
}

function consultationPaid(session) {
  return session?.paymentStatus || (['ended', 'accepted', 'completed'].includes(String(session?.status || '').toLowerCase()) ? 'Paid' : 'Pending')
}

export default function InstantConsultation() {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'call' | 'chat'
  const [searchQuery, setSearchQuery] = useState('')
  const [instantConsultations, setInstantConsultations] = useState(() => getInstantConsultations())
  const [selectedInstantConsultation, setSelectedInstantConsultation] = useState(null)

  useEffect(() => {
    return subscribeToInstantConsultations(setInstantConsultations)
  }, [])

  // Filter consultations belonging to current user
  const userConsultations = useMemo(() => {
    if (!currentUser?.id) return []
    return (instantConsultations || [])
      .filter((session) => session.userId === currentUser.id)
      .sort((a, b) => new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime())
  }, [currentUser?.id, instantConsultations])

  // Filtered consultations list
  const filteredConsultations = useMemo(() => {
    return userConsultations.filter((session) => {
      // Type Tab filter
      if (activeTab === 'call' && session.type !== 'call') return false
      if (activeTab === 'chat' && session.type !== 'chat') return false

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase()
        const matchName = String(session.astrologerName || '').toLowerCase().includes(query)
        const matchId = String(session.id || '').toLowerCase().includes(query)
        const matchTopic = String(session.topic || '').toLowerCase().includes(query)
        const matchLang = String(session.language || '').toLowerCase().includes(query)
        if (!matchName && !matchId && !matchTopic && !matchLang) return false
      }

      return true
    })
  }, [userConsultations, activeTab, searchQuery])

  const callCount = useMemo(() => userConsultations.filter((s) => s.type === 'call').length, [userConsultations])
  const chatCount = useMemo(() => userConsultations.filter((s) => s.type === 'chat').length, [userConsultations])

  return (
    <div className="instant-consult-page">
      <PageHeader
        eyebrow="User portal"
        title="Instant Consultation"
      />

      <Card className="instant-consult-card">
        <div className="instant-consult-toolbar">
          <div className="instant-consult-tabs" role="tablist" aria-label="Filter instant consultations">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              className={`instant-consult-tab ${activeTab === 'all' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All <span className="instant-consult-tab-badge">{userConsultations.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'call'}
              className={`instant-consult-tab ${activeTab === 'call' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('call')}
            >
              <PhoneCall size={13} /> Instant Calls <span className="instant-consult-tab-badge">{callCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'chat'}
              className={`instant-consult-tab ${activeTab === 'chat' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageCircle size={13} /> Instant Chats <span className="instant-consult-tab-badge">{chatCount}</span>
            </button>
          </div>

          <div className="instant-consult-filters">
            <div className="instant-consult-search">
              <Search size={14} className="instant-consult-search-icon" />
              <input
                type="search"
                className="instant-consult-search-input"
                placeholder="Search astrologer, ID or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search consultations"
              />
            </div>
          </div>
        </div>

        {filteredConsultations.length > 0 ? (
          <div className="instant-consult-history-list" role="list" aria-label="Instant consultations history">
            {filteredConsultations.map((session) => {
              const isChat = session.type === 'chat'
              const occurredAt = session.startedAt || session.createdAt
              const formattedDate = occurredAt
                ? new Date(occurredAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Date unavailable'
              const duration = (Number(session.durationMinutes) || 0) + (Number(session.extraMinutes) || 0)
              const amount = consultationAmount(session)
              const statusStr = String(session.status || 'ended').toLowerCase()

              return (
                <article
                  key={session.id}
                  className={`instant-consult-history-row instant-consult-history-row--${session.type}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${isChat ? 'instant chat' : 'instant call'} with ${session.astrologerName || 'astrologer'}`}
                  onClick={() => setSelectedInstantConsultation(session)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedInstantConsultation(session)
                    }
                  }}
                >
                  <div className="instant-consult-row-left">
                    <span className={`instant-consult-row-icon ${isChat ? 'instant-consult-row-icon--chat' : 'instant-consult-row-icon--call'}`}>
                      {isChat ? <MessageCircle size={18} /> : <PhoneCall size={18} />}
                    </span>
                    <div className="instant-consult-row-main">
                      <strong className="instant-consult-row-title">
                        <span>{isChat ? 'Instant Chat' : 'Instant Call'}</span>
                        <span className="instant-consult-row-sep">·</span>
                        <span className="instant-consult-row-astrologer">{session.astrologerName || 'Astrologer'}</span>
                      </strong>
                      <div className="instant-consult-row-meta">
                        <span>{formattedDate}</span>
                        <span className="instant-consult-row-sep">·</span>
                        <span>{duration} min</span>
                        {session.topic && (
                          <>
                            <span className="instant-consult-row-sep">·</span>
                            <span>{session.topic}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="instant-consult-row-right">
                    <div className="instant-consult-row-amount">
                      <strong>₹{amount.toLocaleString('en-IN')}</strong>
                      <small>{consultationPaid(session)}</small>
                    </div>
                    <span className={`instant-consult-row-status instant-consult-row-status--${statusStr}`}>
                      {session.status || 'Ended'}
                    </span>
                    <ChevronRight size={16} className="instant-consult-row-chevron" />
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="instant-consult-empty">
            <span className="instant-consult-empty-icon">
              <Headphones size={22} />
            </span>
            <strong>
              No instant {activeTab === 'all' ? 'consultations' : `${activeTab}s`}{searchQuery ? ' found' : ' yet'}
            </strong>
            <p>
              {searchQuery
                ? 'No consultations match your search keywords. Try searching for a different name or ID.'
                : 'Your instant call and instant chat consultation history will appear here.'}
            </p>
          </div>
        )}
      </Card>

      {/* Consultation Receipt & Summary Modal */}
      {selectedInstantConsultation &&
        createPortal(
          <div
            className={`user-profile-consultation-modal-backdrop user-profile-consultation-modal-backdrop--${selectedInstantConsultation.type}`}
            role="presentation"
            onClick={() => setSelectedInstantConsultation(null)}
          >
            <section
              className={`user-profile-consultation-modal user-profile-consultation-modal--${selectedInstantConsultation.type}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="instant-consultation-summary-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="user-profile-consultation-modal__topbar">
                <h2 id="instant-consultation-summary-title">Consultation Details</h2>
                <button
                  type="button"
                  className="user-profile-consultation-modal__close"
                  aria-label="Close consultation summary"
                  onClick={() => setSelectedInstantConsultation(null)}
                >
                  <X size={18} />
                </button>
              </header>

              <div className="user-profile-consultation-modal__content">
                <div className="user-profile-consultation-modal__identity-row">
                  <div className="user-profile-consultation-modal__person">
                    <span>{initials(selectedInstantConsultation.astrologerName || 'Astrologer')}</span>
                    <div>
                      <strong>{selectedInstantConsultation.astrologerName || 'Astrologer'}</strong>
                      <small>ASTROLOGER</small>
                    </div>
                  </div>
                  <div className="user-profile-consultation-modal__id">
                    <small>CONSULTATION ID</small>
                    <strong>{selectedInstantConsultation.id}</strong>
                  </div>
                </div>

                <div className="user-profile-consultation-modal__amount-panel">
                  <span>AMOUNT</span>
                  <strong>₹{consultationAmount(selectedInstantConsultation).toLocaleString('en-IN')}</strong>
                  <em>{consultationPaid(selectedInstantConsultation)}</em>
                </div>

                <div className="user-profile-consultation-modal__details">
                  <div>
                    <span className="user-profile-consultation-modal__detail-icon">
                      <UserCircle2 size={15} />
                    </span>
                    <span>
                      <small>ASTROLOGER</small>
                      <strong>{selectedInstantConsultation.astrologerName || 'Astrologer'}</strong>
                    </span>
                  </div>
                  <div>
                    <span className="user-profile-consultation-modal__detail-icon">
                      <Clock3 size={15} />
                    </span>
                    <span>
                      <small>{selectedInstantConsultation.type === 'chat' ? 'CHAT' : 'CALL'} STARTED</small>
                      <strong>
                        {selectedInstantConsultation.startedAt
                          ? new Date(selectedInstantConsultation.startedAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Not started'}
                      </strong>
                    </span>
                  </div>
                  <div>
                    <span className="user-profile-consultation-modal__detail-icon">
                      <Clock3 size={15} />
                    </span>
                    <span>
                      <small>{selectedInstantConsultation.type === 'chat' ? 'CHAT' : 'CALL'} ENDED</small>
                      <strong>
                        {selectedInstantConsultation.endedAt
                          ? new Date(selectedInstantConsultation.endedAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Not ended'}
                      </strong>
                    </span>
                  </div>
                  <div>
                    <span className="user-profile-consultation-modal__detail-icon">
                      <Clock3 size={15} />
                    </span>
                    <span>
                      <small>DURATION</small>
                      <strong>
                        {(selectedInstantConsultation.durationMinutes || 0) +
                          (selectedInstantConsultation.extraMinutes || 0)}{' '}
                        min
                      </strong>
                    </span>
                  </div>
                  <div>
                    <span className="user-profile-consultation-modal__detail-icon">₹</span>
                    <span>
                      <small>AMOUNT</small>
                      <strong>₹{consultationAmount(selectedInstantConsultation).toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                  <div>
                    <span className="user-profile-consultation-modal__detail-icon">
                      <BadgeCheck size={15} />
                    </span>
                    <span>
                      <small>PAYMENT</small>
                      <strong>{consultationPaid(selectedInstantConsultation)}</strong>
                    </span>
                  </div>
                  <div>
                    <span className="user-profile-consultation-modal__detail-icon">
                      <BadgeCheck size={15} />
                    </span>
                    <span>
                      <small>STATUS</small>
                      <strong>{selectedInstantConsultation.status || 'Unknown'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <footer className="user-profile-consultation-modal__footer">
                <button
                  type="button"
                  className="user-profile-consultation-modal__close-action"
                  onClick={() => setSelectedInstantConsultation(null)}
                >
                  Close
                </button>
              </footer>
            </section>
          </div>,
          document.body
        )}
    </div>
  )
}
