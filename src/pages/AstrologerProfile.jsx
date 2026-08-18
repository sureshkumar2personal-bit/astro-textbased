import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus, UserCheck, Star, Users, CalendarPlus, BadgeCheck, X } from 'lucide-react'
import { mockAstrologers } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'

const CONSULTATION_TYPES = ['Video Consultation', 'Voice Consultation', 'Chat Consultation']

function toInputDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function formatAppointmentDate(value) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AstrologerProfile() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { followedAstrologerIds, actions, subscriptions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const astrologerId = searchParams.get('id') || mockAstrologers[0].id
  const astrologer = useMemo(
    () => mockAstrologers.find((item) => item.id === astrologerId) || mockAstrologers[0],
    [astrologerId],
  )
  const following = followedAstrologerIds.includes(astrologer.id)
  const subscribed = subscriptions.some(
    (sub) => sub.userId === currentUser?.id && sub.astrologerId === astrologer.id,
  )
  const [bookingOpen, setBookingOpen] = useState(false)
  const [subscribeSuccess, setSubscribeSuccess] = useState(false)

  const handleSubscribe = () => {
    actions.subscribeToAstrologer(astrologer.id, astrologer.name, currentUser?.id, currentUser?.name)
    setSubscribeSuccess(true)
  }
  const [bookingForm, setBookingForm] = useState({
    type: CONSULTATION_TYPES[0],
    date: toInputDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    time: '10:00 AM',
  })

  const openBooking = () => {
    setBookingForm({
      type: CONSULTATION_TYPES[0],
      date: toInputDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      time: '10:00 AM',
    })
    setBookingOpen(true)
  }

  const handleConfirmBooking = () => {
    const newId = actions.bookAppointment({
      astrologerId: astrologer.id,
      astrologerName: astrologer.name,
      type: bookingForm.type,
      date: formatAppointmentDate(bookingForm.date),
      time: bookingForm.time,
    })
    setBookingOpen(false)
    navigate(`${routes.appointmentDetails}?id=${newId}`)
  }

  return (
    <div>
      <PageHeader eyebrow="User portal" title="Astrologer Profile" showBack backTo={routes.dashboard} />

      <Card className="section" style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] text-[18px] font-bold text-white">
            {astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>{astrologer.name}</div>
            <div className="muted">{astrologer.specialization}</div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={subscribed ? () => setSubscribeSuccess(true) : handleSubscribe}
        >
          <BadgeCheck size={15} />
          {subscribed ? 'Subscribed' : 'Subscribe'}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => actions.toggleFollow(astrologer.id, astrologer.name, following)}
        >
          {following ? <UserCheck size={15} /> : <UserPlus size={15} />}
          {following ? 'Following' : 'Follow'}
        </button>
      </Card>

      <Card className="section">
        <div className="section-title">About</div>
        <div className="muted" style={{ lineHeight: 1.7 }}>{astrologer.bio}</div>
      </Card>

      <Card className="section">
        <div className="section-title">Stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}>
            <div className="stat-icon tone-gold"><Star size={18} /></div>
            <div>
              <div className="stat-value">{astrologer.rating}</div>
              <div className="stat-label">{astrologer.reviews}</div>
            </div>
          </div>
          <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}>
            <div className="stat-icon tone-violet"><Users size={18} /></div>
            <div>
              <div className="stat-value">{astrologer.followers.toLocaleString('en-IN')}</div>
              <div className="stat-label">followers</div>
            </div>
          </div>
          <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}>
            <div className="stat-icon tone-sky"><Star size={18} /></div>
            <div>
              <div className="stat-value">{astrologer.experience}</div>
              <div className="stat-label">experience</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="section" style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-outline" onClick={openBooking}>
          <CalendarPlus size={15} />
          Book Appointment
        </button>
        <Link to={routes.askQuestion} className="btn btn-primary">Ask a Question</Link>
      </div>

      {bookingOpen && (
        <div className="modal-overlay user-modal-overlay" onClick={() => setBookingOpen(false)}>
          <div className="modal-card user-modal-card" style={{ width: 'min(420px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>Book Appointment</div>
              <button type="button" className="icon-btn" aria-label="Close booking popup" onClick={() => setBookingOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-card__content user-modal-card__content">
              <div style={{ display: 'grid', gap: 16 }}>
                <label className="field-group" style={{ margin: 0 }}>
                  <span className="field-label-top">Consultation Type</span>
                <select
                  className="select-input"
                  value={bookingForm.type}
                  onChange={(e) => setBookingForm({ ...bookingForm, type: e.target.value })}
                >
                  {CONSULTATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="field-group" style={{ margin: 0 }}>
                <span className="field-label-top">Date</span>
                <input
                  type="date"
                  className="text-input"
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                />
              </label>
              <label className="field-group" style={{ margin: 0 }}>
                <span className="field-label-top">Time</span>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="10:00 AM"
                    value={bookingForm.time}
                    onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                  />
                </label>
              </div>
            </div>
            <div className="modal-card__footer user-modal-card__footer">
              <button className="btn btn-ghost" type="button" onClick={() => setBookingOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={handleConfirmBooking}>
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {subscribeSuccess && (
        <div className="modal-overlay user-modal-overlay" onClick={() => setSubscribeSuccess(false)}>
          <div
            className="modal-card user-modal-card"
            style={{ width: 'min(420px, calc(100vw - 32px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>Subscription Successful</div>
              <button type="button" className="icon-btn" aria-label="Close subscription popup" onClick={() => setSubscribeSuccess(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-card__content user-modal-card__content" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
              <p className="muted" style={{ lineHeight: 1.7 }}>
                You are now a subscriber of <strong style={{ color: 'var(--ink)' }}>{astrologer.name}</strong>.<br />
                You get <strong style={{ color: 'var(--ink)' }}>1 Discount Question</strong> valid for{' '}
                <strong style={{ color: 'var(--ink)' }}>15 days</strong>.
              </p>
            </div>
            <div className="modal-card__footer user-modal-card__footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-ghost" type="button" onClick={() => setSubscribeSuccess(false)}>
                Later
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  setSubscribeSuccess(false)
                  navigate(`${routes.askQuestion}?useDiscount=1`)
                }}
              >
                Ask Discount Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
