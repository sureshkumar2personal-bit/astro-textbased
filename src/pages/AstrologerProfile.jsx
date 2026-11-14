import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAstrologerAvailability } from '../utils/availabilityStore.js'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { UserPlus, UserCheck, Star, CalendarPlus, CalendarClock, BadgeCheck, Bookmark, Heart, X, Grid3X3, Info, MessageCircle, PhoneCall, PhoneOff, Radio, MapPin, Languages, Pencil, Share2, Users, Check, ChevronLeft, ChevronRight, Clock3, WalletCards, CircleAlert, Copy, Sparkles, FileText, RefreshCw, Layers, Compass, ShieldCheck, HeartHandshake, Award, Flame, Gem, MessageSquareText, ThumbsUp, CheckCircle2, MessageSquarePlus } from 'lucide-react'
import { getPublicAstrologer } from '../utils/publicAstrologerProfile.js'
import { mockAstrologerAvailability, mockAstrologerPosts, mockAstrologers, mockLiveSessions } from '../data/notificationData.js'
import { consultationAstrologers } from '../data/consultationAstrologers.js'
import { NAKSHATRA_OPTIONS, RASHI_OPTIONS } from '../data/astrologyOptions.js'
import { selectVisiblePosts, useAppData } from '../state/AppDataContext.jsx'
import { publishedAvailabilityMap } from '../utils/appointments.js'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { useInstantCall } from '../state/InstantCallContext.jsx'
import { BOOKING_OVERRIDES } from './user/appointments/bookingAstrologerData.js'
import { useAstrologerLiveStatus } from '../utils/instantConsultation.js'
import { getStoredAstrologerReviews, subscribeToAstrologerReviews } from '../utils/astrologerReviews.js'
import '../css/user/astrologer-profile.css'

const APPOINTMENT_TYPE = 'Audio Call'
const APPOINTMENT_PRICE = 499
const BOOKING_MOCK_AVAILABILITY = {
  '2026-09-07': ['10:00 AM', '02:00 PM', '06:00 PM', '07:00 PM'],
  '2026-09-08': ['10:00 AM', '02:00 PM'],
  '2026-09-10': ['10:00 AM', '02:00 PM', '06:00 PM'],
  '2026-09-12': ['11:00 AM', '03:00 PM'],
  '2026-09-14': ['10:00 AM', '01:00 PM', '04:00 PM', '06:00 PM'],
  '2026-09-18': ['10:00 AM', '02:00 PM'],
  '2026-09-24': ['11:00 AM', '03:00 PM', '06:00 PM'],
}
const BOOKING_MOCK_UNAVAILABLE = {
  '2026-09-09': 'Astrologer unavailable',
  '2026-09-11': 'All slots booked',
  '2026-09-16': 'Holiday',
  '2026-09-21': 'Astrologer unavailable',
}
const BOOKING_MOCK_OTHER_BOOKINGS = {
  '2026-09-10': ['02:00 PM'],
  '2026-09-14': ['02:00 PM'],
  '2026-09-18': ['10:00 AM'],
}

const PROFILE_POSTS = [
  { id: 'post-1', tone: 'violet', title: 'Understanding the right time to begin', body: 'Timing becomes clearer when preparation and patience work together. Look for the small signs that your next step is ready.' },
  { id: 'post-2', tone: 'coral', title: 'A simple weekly reflection', body: 'Write down one question, one intention, and one action for the week ahead. Clarity grows through consistent reflection.' },
  { id: 'post-3', tone: 'gold', title: 'Your chart is a guide', body: 'Astrology can help you understand patterns, but your choices give those patterns direction.' },
]

const PROFILE_FOLLOWERS = ['Priya V.', 'Kannan', 'Devi', 'Arun']

const SUBSCRIPTION_PRICE = 499
const SUBSCRIPTION_PLAN_LABEL = '1-Month Subscription'

const ASTROLOGER_REVIEWS_MOCK = [
  { id: 'rev-1', name: 'Priya V.', rating: 5, type: 'Audio Consultation', date: '28 Oct 2026', text: 'Acharya Meena explained everything with great patience and clarity. Her remedies for health and family peace were deeply calming and practical.', helpful: 34 },
  { id: 'rev-2', name: 'Sanjay Krishnan', rating: 5, type: 'Instant Chat', date: '24 Oct 2026', text: 'Very accurate transit analysis! The guidance regarding my career transition was reassuring and well-explained.', helpful: 26 },
  { id: 'rev-3', name: 'Divya Ramesh', rating: 5, type: 'Instant Call', date: '19 Oct 2026', text: 'Spoke directly via instant call. Within 10 minutes she identified the exact planetary transits affecting my family situation.', helpful: 19 },
  { id: 'rev-4', name: 'Karthik N.', rating: 4, type: 'Audio Consultation', date: '14 Oct 2026', text: 'Excellent Vedic knowledge and traditional pariharam recommendations. Very polite and supportive.', helpful: 15 },
  { id: 'rev-5', name: 'Ananya S.', rating: 5, type: 'Instant Chat', date: '08 Oct 2026', text: 'Instant chat was super smooth and fast. Gave clear gemstone advice and simple daily mantras.', helpful: 21 },
]

const REVIEW_DISTRIBUTION = [
  ['5 Star', 88],
  ['4 Star', 9],
  ['3 Star', 2],
  ['2 Star', 1],
  ['1 Star', 0],
]

function getAstrologerServicesCatalog(astrologer, bookingPrice = 499) {
  const spec = (astrologer.specialization || '').toLowerCase()
  const isNumerology = spec.includes('numerolog')
  const isTarot = spec.includes('tarot')

  return [
    {
      id: 'srv-1',
      title: isNumerology ? 'Life Path & Name Numerology' : isTarot ? 'Tarot Destiny & Card Spread' : 'Janma Kundli & Birth Chart Analysis',
      badge: 'Popular',
      badgeType: 'popular',
      icon: Compass,
      description: isNumerology
        ? 'Destiny numbers, lucky name vibrations, favorable business dates and life cycles.'
        : isTarot
        ? 'Intuitive spread analysis revealing past influences, current energies, and future paths.'
        : 'Comprehensive 12-house planetary analysis, Lagna, Navamsha (D9) and Dasha transit forecast.',
      duration: '30 Mins',
      price: Math.max(bookingPrice, 499),
      actionType: 'book',
      actionLabel: 'Book Consultation',
    },
    {
      id: 'srv-2',
      title: 'Health, Wellbeing & Ayur-Astrology',
      badge: 'Specialized',
      badgeType: 'special',
      icon: ShieldCheck,
      description: 'Planetary root causes for chronic ailments, favorable medical timing, and remedial wellness measures.',
      duration: '25 Mins',
      price: Math.round(bookingPrice * 0.9),
      actionType: 'book',
      actionLabel: 'Book Consultation',
    },
    {
      id: 'srv-3',
      title: 'Family Harmony & Griha Shanti Remedies',
      badge: 'Remedy',
      badgeType: 'remedy',
      icon: HeartHandshake,
      description: 'Resolving domestic disharmony, ancestral Pitru Dosha remedies, and home peace protocols.',
      duration: '30 Mins',
      price: Math.round(bookingPrice * 0.95),
      actionType: 'book',
      actionLabel: 'Book Consultation',
    },
    {
      id: 'srv-4',
      title: 'Marriage Compatibility & Kundli Milan',
      badge: 'High Demand',
      badgeType: 'popular',
      icon: Heart,
      description: 'Detailed 36-point Guna Milan, Manglik Dosha, Nadi & Bhakoot compatibility assessment.',
      duration: '30 Mins',
      price: bookingPrice,
      actionType: 'book',
      actionLabel: 'Book Consultation',
    },
    {
      id: 'srv-5',
      title: 'Career, Job Switch & Business Timing',
      badge: 'Career',
      badgeType: 'special',
      icon: Award,
      description: '10th house karmasthana timing, promotion periods, job change prospects & business partnerships.',
      duration: '30 Mins',
      price: bookingPrice,
      actionType: 'book',
      actionLabel: 'Book Consultation',
    },
    {
      id: 'srv-6',
      title: 'Sacred Pariharams & Vedic Pooja Guidance',
      badge: 'Sacred',
      badgeType: 'remedy',
      icon: Flame,
      description: 'Customized Navagraha Shanti homam, sacred temple pilgrimage kshetras, and timing protocols.',
      duration: '35 Mins',
      price: Math.round(bookingPrice * 1.15),
      actionType: 'book',
      actionLabel: 'Book Consultation',
    },
    {
      id: 'srv-7',
      title: 'Gemstone & Rudraksha Recommendation',
      badge: 'Gemstones',
      badgeType: 'special',
      icon: Gem,
      description: 'Authentic astrological gemstone suitability, auspicious metal setting, and energization vidhi.',
      duration: '15 Mins',
      price: Math.round(bookingPrice * 0.75),
      actionType: 'book',
      actionLabel: 'Book Consultation',
    },
    {
      id: 'srv-8',
      title: 'Prashna Kundli / Urgent Query',
      badge: 'Instant',
      badgeType: 'instant',
      icon: MessageSquareText,
      description: 'Immediate horary chart for pressing life decisions, lost items, or urgent specific dilemmas.',
      duration: '15 Mins',
      price: Math.round(bookingPrice * 0.65),
      actionType: 'chat',
      actionLabel: 'Instant Consult',
    },
  ]
}

function maskMethod(method) {
  if (!method) return 'Wallet'
  if (method.type === 'bank') return `${method.bankName || 'Bank'} ****${String(method.accountNumber || '').slice(-4)}`
  if (method.type === 'upi') return method.upiId
  if (method.type === 'card') return `${method.cardNetwork || 'Card'} ****${String(method.cardNumber || '').slice(-4)}`
  return 'Wallet'
}

function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function displayDateKey(value) {
  return dateFromKey(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatSlotRange(time) {
  const [clock, meridiem] = time.split(' ')
  const [hours, minutes] = clock.split(':').map(Number)
  const date = new Date(2026, 0, 1, (hours % 12) + (meridiem === 'PM' ? 12 : 0), minutes + 30)
  return `${time} – ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}

function timeToMinutes(value) {
  const [clock, meridiem] = String(value).split(' ')
  const [hours, minutes] = clock.split(':').map(Number)
  return ((hours % 12) + (meridiem === 'PM' ? 12 : 0)) * 60 + minutes
}

function appointmentStartTime(slot) {
  if (!slot) return 0
  const [clock, meridiem] = slot.time.split(' ')
  const [hours, minutes] = clock.split(':').map(Number)
  return new Date(dateFromKey(slot.date).setHours((hours % 12) + (meridiem === 'PM' ? 12 : 0), minutes, 0, 0)).getTime()
}

function formatCountdown(milliseconds) {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60000))
  return `Starts in ${totalMinutes} minutes`
}

function calendarDays(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
}

function getSubscriptionExpiry(subscription) {
  return subscription?.expiresAt || subscription?.discountQuestions?.[0]?.validUntil
}

function getSubscriptionDaysRemaining(expiry) {
  const expiryTime = new Date(expiry).getTime()
  if (!Number.isFinite(expiryTime) || expiryTime <= Date.now()) return 0
  return Math.ceil((expiryTime - Date.now()) / (24 * 60 * 60 * 1000))
}

function slotButton(date, time, { selectedSlots, toggleSlot, bookedSlots, myBookedSlots = new Set() }) {
  const booked = bookedSlots.has(`${displayDateKey(date)}|${time}`)
  const myBooking = myBookedSlots.has(`${displayDateKey(date)}|${time}`)
  const selected = selectedSlots.some((slot) => slot.key === `${date}|${time}`)
  return <button type="button" key={`${date}-${time}`} className={`appointment-slot-button ${selected ? 'is-selected' : ''} ${booked ? 'is-booked' : ''}${myBooking ? ' is-my-booking' : ''}`} disabled={booked} onClick={() => toggleSlot(date, time)}><span>{selected ? <Check size={13} /> : <Clock3 size={13} />} {time}</span><small>{myBooking ? 'Booked by you' : booked ? 'Booked' : 'Available'} · 30 Minutes · ₹{APPOINTMENT_PRICE}</small></button>
}

function DayAvailability({ date, availability, selectedSlots, toggleSlot, bookedSlots, myBookedSlots, unavailableReason, totalSlots, bookedCount, availableCount, myBooking }) {
  const slots = date ? availability[date] || [] : []
  const openSlots = slots.filter((time) => !bookedSlots.has(`${displayDateKey(date)}|${time}`))
  return <div className="appointment-timeline"><div className="appointment-booking-section-label">Day timeline {date && <span className="muted">· {displayDateKey(date)}</span>}</div>{unavailableReason ? <p className="availability-empty">{unavailableReason}</p> : slots.length ? <><div className="appointment-day-slot-count">Total {totalSlots} · Booked {bookedCount} · Available {availableCount}{myBooking ? ' · Your booking' : ''}</div>{slots.map((time) => slotButton(date, time, { selectedSlots, toggleSlot, bookedSlots, myBookedSlots }))}</> : <p className="availability-empty">Astrologer unavailable for this date.</p>}</div>
}

function WeekAvailability({ month, focusDate, availability, selectedSlots, toggleSlot, bookedSlots }) {
  const focus = focusDate ? dateFromKey(focusDate) : new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(focus.getFullYear(), focus.getMonth(), focus.getDate() - focus.getDay())
  const days = Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  const times = [...new Set(days.flatMap((day) => availability[dateKey(day)] || []))].sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
  return <div className="appointment-week-grid"><div className="appointment-week-header"><span>Time</span>{days.map((day) => <strong key={dateKey(day)}>{day.toLocaleDateString('en-US', { weekday: 'short' })}<small>{day.getDate()}</small></strong>)}</div>{times.length ? times.map((time) => <div className="appointment-week-row" key={time}><span>{time}</span>{days.map((day) => { const key = dateKey(day); return (availability[key] || []).includes(time) ? slotButton(key, time, { selectedSlots, toggleSlot, bookedSlots }) : <span className="appointment-week-unavailable" key={`${key}-${time}`}>—</span> })}</div>) : <p className="availability-empty">No appointments are available this week.</p>}</div>
}

function ConsultationDetails({ details, setDetails, onSkip }) {
  const update = (key, value) => setDetails((current) => ({ ...current, [key]: value }))
  const readHoroscopeFile = (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      update('horoscopeError', 'File too large. Please choose a file under 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      update('horoscope', { name: file.name, type: file.type || 'application/pdf', size: `${Math.ceil(file.size / 1024)} KB`, sizeBytes: file.size, dataUrl: reader.result })
      update('horoscopeError', '')
    }
    reader.readAsDataURL(file)
  }
  return <div className="appointment-details-form"><div><div className="appointment-booking-section-label">Consultation Details</div><p className="muted">Would you like to submit your question and horoscope details before the appointment?</p></div><label>Question type<select className="select-input" value={details.questionType} onChange={(event) => update('questionType', event.target.value)}><option>Personal</option><option>General</option></select></label><label>Question description<textarea className="text-input" rows="3" value={details.question} onChange={(event) => update('question', event.target.value)} placeholder="Share what you would like guidance on (optional)" /></label><div className="appointment-form-divider">Horoscope Details <span>Optional</span></div><div className="appointment-form-grid"><label>Date of Birth<input className="text-input" type="date" value={details.dob} onChange={(event) => update('dob', event.target.value)} /></label><label>Time of Birth<input className="text-input" type="time" value={details.birthTime} onChange={(event) => update('birthTime', event.target.value)} /></label><label>Place of Birth<input className="text-input" type="text" value={details.birthPlace} onChange={(event) => update('birthPlace', event.target.value)} placeholder="Enter place of birth" /></label><label>Rashi<select className="select-input" value={details.rashi} onChange={(event) => update('rashi', event.target.value)}><option value="">Select Rashi</option>{RASHI_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label><label>Nakshatra<select className="select-input" value={details.nakshatra} onChange={(event) => update('nakshatra', event.target.value)}><option value="">Select Nakshatra</option>{NAKSHATRA_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label></div><label className="appointment-upload">Upload Horoscope / Kundli<input type="file" onChange={readHoroscopeFile} accept=".pdf,image/*,.png,.jpg,.jpeg" />{details.horoscope?.name && <div className="appointment-upload-file"><FileText size={14} /> {details.horoscope.name} <button type="button" className="appointment-upload-remove" onClick={() => { update('horoscope', null); update('horoscopeError', '') }}>✕</button></div>}{details.horoscopeError && <div className="appointment-upload-error">{details.horoscopeError}</div>}</label><button type="button" className="btn btn-ghost appointment-skip-action" onClick={onSkip}>Skip for Now</button></div>
}

function BookingReview({ selectedSlots }) {
  return <div className="appointment-review"><div className="appointment-booking-section-label">Selected Appointments</div>{selectedSlots.map((slot, index) => <div className="appointment-review-slot" key={slot.key}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{displayDateKey(slot.date)}</strong><small>{formatSlotRange(slot.time)}</small><small>{slot.duration} · {slot.type === 'Audio Call' ? 'Audio Consultation' : slot.type}</small></div><b>₹{slot.price}</b></div>)}</div>
}

export default function AstrologerProfile() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { followedAstrologerIds, actions, subscriptions, appointments, userWallet, userPaymentMethods, astrologerServices, astrologerPosts: sharedPosts, postLikes, savedPostIds, postComments, appointmentAvailabilityTemplates } = useAppData()
  const { currentUser } = useAuth()
  const { openInstantCall, openInstantChat } = useInstantCall()
  const routes = getRoleRoutes(currentUser?.role)
  const { astrologerId: routeAstrologerId } = useParams()
  const astrologerId = routeAstrologerId || searchParams.get('id') || mockAstrologers[0].id
  const astrologer = useMemo(
    () => {
      const profile = getPublicAstrologer(astrologerId) || getPublicAstrologer(mockAstrologers[0].id)
      if (currentUser?.role !== 'astrologer' || currentUser.id !== profile.id) return profile
      return {
        ...profile,
        name: currentUser.name || profile.name,
        specialization: currentUser.specialization || profile.specialization,
        experience: currentUser.experience || profile.experience,
      }
    },
    [astrologerId, currentUser],
  )
  const isOwner = currentUser?.role === 'astrologer' && astrologer.id === mockAstrologers[0].id
  const following = followedAstrologerIds.includes(astrologer.id)
  const subscription = subscriptions.find(
    (sub) => sub.userId === currentUser?.id && sub.astrologerId === astrologer.id,
  )
  const subscriptionExpiry = getSubscriptionExpiry(subscription)
  const subscriptionDaysRemaining = getSubscriptionDaysRemaining(subscriptionExpiry)
  const subscriptionExpiryFormatted = useMemo(() => {
    if (!subscriptionExpiry) return ''
    const d = new Date(subscriptionExpiry)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }, [subscriptionExpiry])
  const subscribed = Boolean(subscription && subscriptionDaysRemaining > 0)
  const canBookAppointment = subscribed
  const walletBalance = Number(userWallet?.balance || 0)
  const defaultSubscribeMethod = userPaymentMethods.find((m) => m.isDefault)
  // "Subscribe" cards on the Ask Question chooser deep-link here with
  // ?subscribe=1 and open the existing subscribe dialog immediately, so the
  // recommended list never drops the user on the profile without starting
  // the subscription flow. Skipped once they are already subscribed.
  useEffect(() => {
    if (searchParams.get('subscribe') !== '1' || isOwner) return
    const existingSub = subscriptions.find(
      (sub) => sub.userId === currentUser?.id && sub.astrologerId === astrologer.id,
    )
    if (existingSub && getSubscriptionDaysRemaining(getSubscriptionExpiry(existingSub)) > 0) return
    setSubscribeMethodId('')
    setSubscribeAutopay(true)
    setSubscribeConfirmOpen(false)
    setSubscribeInsufficient(false)
    setSubscribeOpen(true)
  }, [astrologer, currentUser, isOwner, searchParams, subscriptions])
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingStep, setBookingStep] = useState('form')
  const [calendarView, setCalendarView] = useState('month')
  const [paymentMethod, setPaymentMethod] = useState('Wallet')
  const [bookedAppointmentId, setBookedAppointmentId] = useState(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [bookingIdCopied, setBookingIdCopied] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 7, 1))
  const [bookingNotice, setBookingNotice] = useState('')
  const [consultationDetails, setConsultationDetails] = useState({ questionType: 'Personal', question: '', dob: '', birthTime: '', birthPlace: '', rashi: '', nakshatra: '' })
  const [bookingForm, setBookingForm] = useState({
    type: APPOINTMENT_TYPE,
    date: '',
    time: '',
  })
  const [selectedSlots, setSelectedSlots] = useState([])
  const bookingContentRef = useRef(null)
  const [subscribeSuccess, setSubscribeSuccess] = useState(false)
  const [subscriptionPromptOpen, setSubscriptionPromptOpen] = useState(false)
  const [subscribeOpen, setSubscribeOpen] = useState(false)
  const [subscribeMethodId, setSubscribeMethodId] = useState('')
  const [subscribeAutopay, setSubscribeAutopay] = useState(true)
  const [subscribeConfirmOpen, setSubscribeConfirmOpen] = useState(false)
  const [subscribeInsufficient, setSubscribeInsufficient] = useState(false)
  const selectedSubscribeMethod = userPaymentMethods.find((m) => m.id === subscribeMethodId) || (userPaymentMethods.length === 1 ? userPaymentMethods[0] : null) || defaultSubscribeMethod
  const [activeTab, setActiveTab] = useState('Posts')
  const [audiencePanel, setAudiencePanel] = useState(null)
  const [footerTab, setFooterTab] = useState('Posts')
  const [commentOpen, setCommentOpen] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [shareMessage, setShareMessage] = useState('')
  const [servicesModalOpen, setServicesModalOpen] = useState(false)
  const [storedReviews, setStoredReviews] = useState(() => getStoredAstrologerReviews(astrologer.id))

  useEffect(() => {
    const refresh = () => setStoredReviews(getStoredAstrologerReviews(astrologer.id))
    refresh()
    return subscribeToAstrologerReviews(refresh)
  }, [astrologer.id])

  const allReviews = useMemo(() => {
    const custom = storedReviews || []
    return [...custom, ...ASTROLOGER_REVIEWS_MOCK]
  }, [storedReviews])

  const bookingPrice = BOOKING_OVERRIDES[astrologer.id]?.price || 499
  const chatRate = astrologer.chatRate || 20
  const callRate = astrologer.callRate || 24
  const servicesCatalog = useMemo(() => getAstrologerServicesCatalog(astrologer, bookingPrice), [astrologer, bookingPrice])

  const consultationInfo = useMemo(() => {
    return consultationAstrologers.find((a) => a.id === astrologer.id) || {}
  }, [astrologer.id])

  const liveCall = useAstrologerLiveStatus(astrologer, 'call')
  const liveChat = useAstrologerLiveStatus(astrologer, 'chat')
  const isBusy = liveCall.isBusy || liveChat.isBusy
  const waitMinutes = liveCall.isBusy ? liveCall.waitMinutes : liveChat.waitMinutes

  const astrologerPhoto = astrologer.photo || astrologer.profileImage || consultationInfo.profileImage || ''

  const liveAvailability = useAstrologerAvailability(astrologer.id)
  const isChatAvailable = useMemo(() => {
    if (astrologer.chatEnabled === false || !liveAvailability.chatAvailable) return false
    if (consultationInfo.chatStatus) return consultationInfo.chatStatus === 'Available'
    return astrologer.availability === 'Online' || astrologer.isOnline
  }, [astrologer, consultationInfo, liveAvailability.chatAvailable])

  const isCallAvailable = useMemo(() => {
    if (astrologer.voiceEnabled === false || !liveAvailability.callAvailable) return false
    if (consultationInfo.callStatus) return consultationInfo.callStatus === 'Available'
    return astrologer.availability === 'Online' || astrologer.isOnline
  }, [astrologer, consultationInfo, liveAvailability.callAvailable])

  const shareProfile = () => {
    const shareUrl = window.location.href
    const shareData = { title: `${astrologer.name} - Astrologer Profile`, text: `Consult with ${astrologer.name} on AstroVed`, url: shareUrl }
    const completeShare = () => {
      setShareMessage('Profile link copied!')
      window.setTimeout(() => setShareMessage(''), 2200)
    }
    if (navigator.share) navigator.share(shareData).then(completeShare).catch(() => {})
    else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(shareUrl).then(completeShare).catch(completeShare)
    else completeShare()
  }
  const subscriberNames = subscriptions
    .filter((subscription) => subscription.astrologerId === astrologer.id)
    .map((subscription) => subscription.userName || subscription.userId || 'Subscriber')
  const liveSessions = mockLiveSessions.filter((session) => session.astrologerId === astrologer.id)
  const accessiblePosts = selectVisiblePosts(sharedPosts, { userId: currentUser?.id, followedAstrologerIds, subscriptions, astrologerId: astrologer.id })
  const hasSharedPosts = sharedPosts.some((post) => post.astrologerId === astrologer.id)
  const astrologerPosts = hasSharedPosts ? accessiblePosts : mockAstrologerPosts.filter((post) => post.astrologerId === astrologer.id)
  const savedPosts = accessiblePosts.filter((post) => savedPostIds.includes(post.id))
  const hasPublishedTemplates = appointmentAvailabilityTemplates.some(
    (template) =>
      template.astrologerId === astrologer.id &&
      (template.publishedWeeklySchedule || template.publishedDateOverrides),
  )
  const availability = useMemo(
    () => {
      const configured = hasPublishedTemplates
        ? publishedAvailabilityMap({ templates: appointmentAvailabilityTemplates, astrologerId: astrologer.id, appointments })
        : mockAstrologerAvailability[astrologer.id] || {}
      return astrologer.id === 'astrologer-demo' ? { ...BOOKING_MOCK_AVAILABILITY, ...configured } : configured
    },
    [hasPublishedTemplates, appointmentAvailabilityTemplates, astrologer.id, appointments],
  )
  const monthDays = calendarDays(calendarMonth)
  const todayKey = dateKey(new Date())
  const selectedDateSlots = bookingForm.date ? [...(availability[bookingForm.date] || [])].sort((a, b) => timeToMinutes(a) - timeToMinutes(b)) : []
  const astrologerAppointments = appointments.filter((appointment) => appointment.astrologerId === astrologer.id && appointment.status !== 'Cancelled')
  const bookedSlots = new Set([
    ...astrologerAppointments.map((appointment) => `${appointment.date}|${appointment.time}`),
    ...(astrologer.id === 'astrologer-demo'
      ? Object.entries(BOOKING_MOCK_OTHER_BOOKINGS).flatMap(([key, times]) => times.map((time) => `${displayDateKey(key)}|${time}`))
      : []),
  ])
  const myBookedSlots = new Set(astrologerAppointments.filter((appointment) => appointment.userId && appointment.userId === currentUser?.id).map((appointment) => `${appointment.date}|${appointment.time}`))
  const dateAvailability = (key) => {
    const inCurrentMonth = dateFromKey(key).getMonth() === calendarMonth.getMonth() && dateFromKey(key).getFullYear() === calendarMonth.getFullYear()
    const slots = availability[key] || []
    const bookedCount = slots.filter((time) => bookedSlots.has(`${displayDateKey(key)}|${time}`)).length
    const openSlots = slots.filter((time) => !bookedSlots.has(`${displayDateKey(key)}|${time}`))
    const myBooking = slots.some((time) => myBookedSlots.has(`${displayDateKey(key)}|${time}`))
    if (key < todayKey || !inCurrentMonth) return { state: 'unavailable', slots: openSlots, reason: key < todayKey ? 'Past date' : 'Outside month', selectable: false }
    if (astrologer.id === 'astrologer-demo' && BOOKING_MOCK_UNAVAILABLE[key]) return { state: 'unavailable', slots: [], reason: BOOKING_MOCK_UNAVAILABLE[key], selectable: false }
    if (!slots.length || !openSlots.length) return { state: 'unavailable', slots: openSlots, totalSlots: slots.length, bookedCount, availableCount: openSlots.length, myBooking, reason: !slots.length ? 'Astrologer unavailable' : 'All slots booked', selectable: false }
    return { state: myBooking ? 'booked-by-me' : bookedCount > 0 ? 'partially-booked' : 'available', slots: openSlots, totalSlots: slots.length, bookedCount, availableCount: openSlots.length, myBooking, reason: '', selectable: true }
  }
  const selectCalendarDate = (key) => {
    const status = dateAvailability(key)
    if (!status.selectable) return
    setBookingForm((current) => ({ ...current, date: key, time: '' }))
    setCalendarView('day')
  }
  const visiblePosts = footerTab === 'Saved Posts' ? savedPosts : astrologerPosts
  const astrologerTypes = [astrologer.specialization].filter(Boolean)
  const consultationAreas = astrologer.guidanceAreas?.length ? astrologer.guidanceAreas : (astrologer.expertise || [])
  const liveGroups = [
    ['Upcoming', liveSessions.filter((session) => session.status === 'Upcoming')],
    ['Present / Live Now', liveSessions.filter((session) => ['Live now', 'Present', 'Live'].includes(session.status))],
    ['Past', liveSessions.filter((session) => session.status === 'Past' || session.status === 'Completed')],
  ]
  const toggleComment = (postId) => setCommentOpen((current) => ({ ...current, [postId]: !current[postId] }))
  const submitComment = (postId) => {
    const text = commentDrafts[postId]?.trim()
    if (!text) return
    actions.addPostComment(postId, text, currentUser?.name || 'You')
    setCommentDrafts((current) => ({ ...current, [postId]: '' }))
  }
  const sharePost = (post) => {
    const shareUrl = `${window.location.origin}/user/astrologer-profile?id=${encodeURIComponent(astrologer.id)}&post=${encodeURIComponent(post.id)}`
    const shareData = { title: post.title, text: post.body, url: shareUrl }
    const completeShare = () => {
      setShareMessage(`Shared "${post.title}"`)
      window.setTimeout(() => setShareMessage(''), 2200)
    }
    if (navigator.share) navigator.share(shareData).then(completeShare).catch(() => {})
    else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(shareUrl).then(completeShare).catch(completeShare)
    else completeShare()
  }

  const handleSubscribe = () => {
    setSubscribeMethodId('')
    setSubscribeAutopay(true)
    setSubscribeConfirmOpen(false)
    setSubscribeInsufficient(false)
    setSubscribeOpen(true)
  }

  const handleConfirmSubscribe = () => {
    const value = SUBSCRIPTION_PRICE
    if (!selectedSubscribeMethod) return
    if (walletBalance < value) {
      setSubscribeInsufficient(true)
      return
    }
    actions.debitUserWallet({
      amount: value,
      astrologer: astrologer.name,
      duration: '',
      service: 'Subscription',
      transactionId: `SUB-${Date.now().toString(36)}`,
    })
    let autopayId = null
    if (subscribeAutopay) {
      const autopay = actions.createUserAutopay({
        type: 'subscription',
        paymentMethodId: selectedSubscribeMethod.id,
        amount: value,
        frequency: 'monthly',
        status: 'active',
        triggerThreshold: null,
        nextRunAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        astrologerId: astrologer.id,
        astrologerName: astrologer.name,
      })
      autopayId = autopay?.id || null
    }
    actions.subscribeToAstrologer(astrologer.id, astrologer.name, currentUser?.id, currentUser?.name, 'Silver', {
      price: value,
      paymentMethodId: selectedSubscribeMethod.id,
      autopayEnabled: subscribeAutopay,
      autopayId,
    })
    setSubscribeOpen(false)
    setSubscribeConfirmOpen(false)
    setSubscribeSuccess(true)
  }
  const openBooking = () => {
    if (!subscribed) {
      setSubscriptionPromptOpen(true)
      return
    }
    navigate(`${routes.appointmentBook}/${encodeURIComponent(astrologer.id)}`)
  }

  useEffect(() => {
    if (!bookingOpen || bookingStep !== 'success') return undefined
    const updateTime = () => setCurrentTime(Date.now())
    updateTime()
    const timer = window.setInterval(updateTime, 30000)
    return () => window.clearInterval(timer)
  }, [bookingOpen, bookingStep])

  useEffect(() => {
    if (!bookingOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [bookingOpen])

  useLayoutEffect(() => {
    if (!bookingOpen || bookingStep !== 'details') return undefined
    if (bookingContentRef.current) bookingContentRef.current.scrollTop = 0
    return undefined
  }, [bookingOpen, bookingStep])

  const toggleSlot = (date, time) => {
    const key = `${date}|${time}`
    if (selectedSlots.some((slot) => slot.key === key)) {
      setSelectedSlots((current) => current.filter((slot) => slot.key !== key))
      return
    }
    if (selectedSlots.length >= 4) {
      setBookingNotice('You can book a maximum of 4 slots for this astrologer.')
      window.setTimeout(() => setBookingNotice(''), 2800)
      return
    }
    setSelectedSlots((current) => [...current, { key, date, time, duration: '30 Minutes', type: APPOINTMENT_TYPE, package: '30 Min Consultation', price: APPOINTMENT_PRICE }])
    setBookingForm((current) => ({ ...current, date, time }))
  }

  const cancelBooking = () => {
    if (bookingStep === 'payment') {
      setBookingStep('review')
      return
    }
    if (bookingStep === 'review') {
      setBookingStep('details')
      return
    }
    if (bookingStep === 'details') {
      setBookingStep('form')
      setBookingNotice('')
      return
    }
    setBookingOpen(false)
  }

  const handlePayment = () => {
    const total = selectedSlots.reduce((sum, slot) => sum + slot.price, 0)
    if (paymentMethod !== 'Wallet' || (userWallet?.balance || 0) < total) return
    const bookingGroup = `#BOOK-${selectedSlots[0].date.replaceAll('-', '')}-001`
    let firstId = null
    selectedSlots.forEach((slot, index) => {
      const id = actions.bookAppointment({ astrologerId: astrologer.id, astrologerName: astrologer.name, type: slot.type, date: displayDateKey(slot.date), dateIso: slot.date, start: timeToMinutes(slot.time), end: timeToMinutes(slot.time) + 30, time: slot.time, price: slot.price, duration: slot.duration, package: slot.package, bookingGroup, bookingSequence: index + 1, questionDetails: consultationDetails.question ? consultationDetails : null, horoscope: consultationDetails?.horoscope || null, userId: currentUser?.id, customerName: currentUser?.name || null })
      if (!firstId) firstId = id
    })
    actions.debitUserWallet({ amount: total, astrologer: astrologer.name, duration: `${selectedSlots.length} appointment${selectedSlots.length > 1 ? 's' : ''}`, service: 'Appointment', transactionId: `appointment-${bookingGroup}` })
    setBookedAppointmentId(firstId)
    setBookingStep('success')
    return firstId
  }

  if (astrologer.visible === false && currentUser?.role !== 'astrologer') {
    return (
      <div>
        <PageHeader eyebrow="User portal" title="Astrologer Profile" showBack />
        <Card className="section"><p className="muted" role="status">This astrologer's profile is not available right now.</p></Card>
      </div>
    )
  }

  return (
    <div>
      {!isOwner && <PageHeader eyebrow="User portal" title="Astrologer Profile" showBack />}

      {isOwner ? (
      <div className="section social-profile">
        <Card className="social-profile__header">
          <div className="social-profile__cover" />
          <div className="social-profile__identity">
            <div className="social-profile__avatar">
              {astrologerPhoto ? (
                <img src={astrologerPhoto} alt={`${astrologer.name} profile`} />
              ) : (
                astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')
              )}
            </div>
            <div className="social-profile__identity-copy">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="social-profile__name">{astrologer.name}</h1>
                <BadgeCheck size={18} className="text-[color:var(--primary)]" aria-label="Verified astrologer" />
              </div>
              <div className="muted">@{astrologer.name.toLowerCase().replace(/[^a-z0-9]+/g, '')} · {astrologer.specialization}</div>
              <div className="social-profile__meta"><MapPin size={14} /> India <span>·</span><Languages size={14} /> {astrologer.languages.join(', ')}</div>
            </div>
            <div className="social-profile__actions">
              {isOwner ? (
                <Link to={routes.accountProfile} className="btn btn-primary"><Pencil size={15} /> Edit Profile</Link>
              ) : (
                <>
                  <button type="button" className="btn btn-primary" onClick={subscribed ? () => setSubscribeSuccess(true) : handleSubscribe}>
                    <BadgeCheck size={15} /> {subscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => actions.toggleFollow(astrologer.id, astrologer.name, following)}>
                    {following ? <UserCheck size={15} /> : <UserPlus size={15} />} {following ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="social-profile__stats">
            <div><strong>{astrologer.experience}</strong><span>Experience</span></div>
            <div><strong>{astrologer.specialization.split(',').length}</strong><span>Astrology Types</span></div>
            <button type="button" className="social-profile__stat-button" onClick={() => setAudiencePanel('Followers')}><strong>{astrologer.followers.toLocaleString('en-IN')}</strong><span>Followers</span></button>
            <button type="button" className="social-profile__stat-button" onClick={() => setAudiencePanel('Subscribers')}><strong>{subscriberNames.length}</strong><span>Subscribers</span></button>
          </div>
          <div className="social-profile__bio">{astrologer.bio}</div>
        </Card>

        <div className="social-profile__tabs" role="tablist" aria-label="Astrologer profile sections">
          {[
            ['Posts', Grid3X3],
            ['Live', Radio],
            ['Services', Info],
          ].map(([label, Icon]) => (
            <button key={label} type="button" role="tab" aria-selected={activeTab === label} className={activeTab === label ? 'is-active' : ''} onClick={() => setActiveTab(label)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {activeTab === 'Posts' && (
          <div className="social-profile__posts">
            {PROFILE_POSTS.map((post) => <Card key={post.id} className={`social-profile__post social-profile__post--${post.tone}`}><div className="social-profile__post-icon"><Star size={20} /></div><h2>{post.title}</h2><p>{post.body}</p><span className="muted">Astrology insight · 2 days ago</span></Card>)}
          </div>
        )}
        {activeTab === 'Live' && (
          <div className="social-profile__posts">{liveSessions.length ? liveSessions.map((session) => <Card key={session.id} className="social-profile__post social-profile__post--coral"><div className="social-profile__post-icon"><Radio size={20} /></div><h2>{session.title}</h2><p>{session.status}</p><span className="muted">{session.time}</span></Card>) : <Card className="social-profile__panel"><div className="section-title">No live sessions yet</div><p className="muted">Upcoming live sessions will appear here.</p></Card>}</div>
        )}
        {activeTab === 'Services' && (
          <Card className="social-profile__panel"><div className="section-title">Services</div><div className="profile-service-status"><span className={`service-status-dot ${astrologerServices.available ? 'is-available' : 'is-unavailable'}`} />{astrologerServices.dndEnabled ? 'Dyan / DND mode — unavailable' : astrologerServices.isOnline ? 'Online' : 'Offline'}</div><div className="social-profile__details"><div><strong><PhoneCall size={14} /> Call</strong><span>{astrologerServices.callAvailable ? `Available · ₹${astrologerServices.callPricePerMinute}/min` : 'Unavailable'}</span></div><div><strong><MessageCircle size={14} /> Chat</strong><span>{astrologerServices.chatAvailable ? `Available · ₹${astrologerServices.chatPricePerMinute}/min` : 'Unavailable'}</span></div><div><strong>Specialization</strong><span>{astrologer.specialization}</span></div><div><strong>Languages</strong><span>{astrologer.languages.join(' · ')}</span></div></div></Card>
        )}

          {!isOwner && <div className="social-profile__footer-actions"><button type="button" className={`btn btn-outline${!canBookAppointment ? ' appointment-action--locked' : ''}`} aria-disabled={!canBookAppointment} onClick={openBooking}><CalendarPlus size={15} /> Book Appointment {!canBookAppointment && <span aria-hidden="true">🔒</span>}</button></div>}
      </div>
      ) : (
        <div className="astro-profile-container">
          {/* 1. Hero Identity Card */}
          <div className="astro-hero-card">
            <div className="astro-hero-cover">
              <div className="astro-hero-cover-pattern" />
            </div>
            <div className="astro-hero-content">
              <div className="astro-hero-top-row">
                <div className="astro-hero-identity-group">
                  <div className="astro-hero-avatar-wrapper">
                    <div className="astro-hero-avatar-inner">
                      {astrologerPhoto ? (
                        <img className="astro-hero-avatar-img" src={astrologerPhoto} alt={`${astrologer.name} profile`} />
                      ) : (
                        astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')
                      )}
                    </div>
                    <span
                      className={`astro-online-indicator ${isBusy ? 'astro-busy-indicator' : ''}`}
                      title={isBusy ? `Line Busy · ~wait for ${waitMinutes} mins` : 'Astrologer Online'}
                    >
                      <span className={isBusy ? 'astro-busy-pulse' : 'astro-online-pulse'} />
                    </span>
                  </div>

                  <div className="astro-hero-titles">
                    <div className="astro-hero-name-row">
                      <h1 className="astro-hero-name">{astrologer.name}</h1>
                      <span className="astro-verified-badge">
                        <BadgeCheck size={13} /> Verified Astrologer
                      </span>
                      {isBusy && (
                        <span className="astro-hero-busy-badge" title={`Estimated wait: ~${waitMinutes} mins`}>
                          ● Wait ~{waitMinutes}m
                        </span>
                      )}
                    </div>
                    <div className="astro-hero-subtitle">
                      <span>{astrologer.specialization}</span>
                      {astrologer.languages?.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{astrologer.languages.join(', ')}</span>
                        </>
                      )}
                    </div>
                    <div className="astro-hero-meta-row">
                      <div className="astro-hero-meta-item">
                        <Award size={14} style={{ color: 'var(--primary, #8f4dff)' }} />
                        <span><strong>{astrologer.experience}</strong> Experience</span>
                      </div>
                      <span className="astro-hero-meta-dot">•</span>
                      <div className="astro-hero-meta-item">
                        <Clock3 size={14} style={{ color: '#2563eb' }} />
                        <span>Avg response: <strong>~2 mins</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="astro-hero-actions">
                  <div className="astro-sub-btn-col">
                    <button
                      type="button"
                      className="astro-sub-btn astro-sub-btn--primary"
                      onClick={subscribed ? () => setSubscribeSuccess(true) : handleSubscribe}
                    >
                      <BadgeCheck size={16} /> {subscribed ? 'Subscribed' : 'Subscribe'}
                    </button>
                    {subscribed && subscriptionExpiryFormatted && (
                      <span className="astro-sub-expiry-text">
                        Expired on {subscriptionExpiryFormatted} ({subscriptionDaysRemaining}d)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="astro-sub-btn astro-sub-btn--outline"
                    onClick={() => actions.toggleFollow(astrologer.id, astrologer.name, following)}
                  >
                    {following ? <UserCheck size={16} /> : <UserPlus size={16} />} {following ? 'Following' : 'Follow'}
                  </button>
                  <button
                    type="button"
                    className="astro-share-btn"
                    aria-label="Share profile link"
                    title="Share profile link"
                    onClick={shareProfile}
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>

              <div className="astro-hero-chips-bar">
                {astrologerTypes.map((value) => (
                  <span key={value} className="astro-pill-tag astro-pill-tag--violet">
                    <Sparkles size={12} /> {value}
                  </span>
                ))}
                {consultationAreas.map((value) => (
                  <span key={value} className="astro-pill-tag astro-pill-tag--gold">
                    {value}
                  </span>
                ))}
              </div>

              <div className="astro-hero-bio-snippet">
                <strong>About:</strong> {astrologer.bio}
              </div>
            </div>
          </div>

          {/* 2. Quick Stats Bento Row */}
          <div className="astro-stats-grid">
            <div className="astro-stat-card">
              <div className="astro-stat-icon-box astro-stat-icon-box--violet">
                <Users size={20} />
              </div>
              <div className="astro-stat-meta">
                <span className="astro-stat-value">{astrologer.followers.toLocaleString('en-IN')}</span>
                <span className="astro-stat-label">Followers</span>
              </div>
            </div>
            <div className="astro-stat-card">
              <div className="astro-stat-icon-box astro-stat-icon-box--amber">
                <BadgeCheck size={20} />
              </div>
              <div className="astro-stat-meta">
                <span className="astro-stat-value">{subscriberNames.length.toLocaleString('en-IN')}</span>
                <span className="astro-stat-label">Subscribers</span>
              </div>
            </div>
            <div className="astro-stat-card">
              <div className="astro-stat-icon-box astro-stat-icon-box--emerald">
                <CalendarPlus size={20} />
              </div>
              <div className="astro-stat-meta">
                <span className="astro-stat-value">3,850+</span>
                <span className="astro-stat-label">Consultations Done</span>
              </div>
            </div>
            <div className="astro-stat-card">
              <div className="astro-stat-icon-box astro-stat-icon-box--blue">
                <ThumbsUp size={20} />
              </div>
              <div className="astro-stat-meta">
                <span className="astro-stat-value">98.4%</span>
                <span className="astro-stat-label">Client Satisfaction</span>
              </div>
            </div>
          </div>

          {/* 3. Consultation Options */}
          <section className="astrologer-consultation" style={{ border: 'none', boxShadow: 'none' }}>
            <div className="astrologer-quick-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, width: '100%' }}>
              <button
                type="button"
                className="btn btn-primary astro-consult-action-btn"
                onClick={() => navigate(`${routes.askQuestion}?astrologerId=${encodeURIComponent(astrologer.id)}`)}
              >
                <MessageSquarePlus size={16} /> Ask a question
              </button>
              <button
                type="button"
                className={`btn btn-primary astro-consult-action-btn${!canBookAppointment ? ' appointment-action--locked' : ''}`}
                aria-disabled={!canBookAppointment}
                onClick={openBooking}
              >
                <CalendarPlus size={16} /> Appointment {!canBookAppointment && <span aria-hidden="true">🔒</span>}
              </button>
              <button
                type="button"
                className={`btn astro-consult-action-btn ${
                  liveCall.isBusy
                    ? 'astro-consult-action-btn--busy'
                    : isCallAvailable
                      ? 'btn-primary astro-btn-shining-border'
                      : 'astro-btn-grayed'
                }`}
                disabled={!isCallAvailable && !liveCall.isBusy}
                title={liveCall.isBusy ? `Line Busy · ${liveCall.waitLabel}` : isCallAvailable ? 'Online & Available for Instant Call' : 'Currently Unavailable for Instant Call'}
                onClick={() => (isCallAvailable || liveCall.isBusy) && openInstantCall(astrologer.id)}
              >
                {liveCall.isBusy ? <PhoneOff size={16} /> : <PhoneCall size={16} />} {liveCall.isBusy ? `Wait ~${liveCall.waitMinutes}m` : 'Instant Call'}
              </button>
              <button
                type="button"
                className={`btn astro-consult-action-btn ${
                  liveChat.isBusy
                    ? 'astro-consult-action-btn--busy'
                    : isChatAvailable
                      ? 'btn-primary astro-btn-shining-border'
                      : 'astro-btn-grayed'
                }`}
                disabled={!isChatAvailable && !liveChat.isBusy}
                title={liveChat.isBusy ? `Busy in chat · ${liveChat.waitLabel}` : isChatAvailable ? 'Online & Available for Instant Chat' : 'Currently Unavailable for Instant Chat'}
                onClick={() => (isChatAvailable || liveChat.isBusy) && openInstantChat(astrologer.id)}
              >
                {liveChat.isBusy ? <Clock3 size={16} /> : <MessageCircle size={16} />} {liveChat.isBusy ? `Wait ~${liveChat.waitMinutes}m` : 'Instant Chat'}
              </button>
            </div>
            {!canBookAppointment && (
              <p className="appointment-subscription-hint">Subscribe to this astrologer to book an appointment.</p>
            )}
          </section>

          {/* 4. 21st.dev Segmented Controls Tabs Bar & Panels */}
          <div id="astro-content-tabs" className="astro-tabs-wrapper">
            <div className="astro-segmented-tabs-bar" role="tablist" aria-label="Astrologer profile content">
              <button
                type="button"
                role="tab"
                aria-selected={footerTab === 'Posts'}
                className={`astro-tab-pill-btn${footerTab === 'Posts' ? ' is-active' : ''}`}
                onClick={() => setFooterTab('Posts')}
              >
                <Grid3X3 size={15} /> Posts <span className="astro-tab-badge">{visiblePosts.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={footerTab === 'Live'}
                className={`astro-tab-pill-btn${footerTab === 'Live' ? ' is-active' : ''}`}
                onClick={() => setFooterTab('Live')}
              >
                <Radio size={15} /> Live Sessions <span className="astro-tab-badge">{liveSessions.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={footerTab === 'About'}
                className={`astro-tab-pill-btn${footerTab === 'About' ? ' is-active' : ''}`}
                onClick={() => setFooterTab('About')}
              >
                <FileText size={15} /> About & Bio
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={footerTab === 'Reviews'}
                className={`astro-tab-pill-btn${footerTab === 'Reviews' ? ' is-active' : ''}`}
                onClick={() => setFooterTab('Reviews')}
              >
                <Star size={15} /> Reviews <span className="astro-tab-badge">{astrologer.rating || '4.8'} ★</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={footerTab === 'Saved Posts'}
                className={`astro-tab-pill-btn${footerTab === 'Saved Posts' ? ' is-active' : ''}`}
                onClick={() => setFooterTab('Saved Posts')}
              >
                <Bookmark size={15} /> Saved <span className="astro-tab-badge">{savedPosts.length}</span>
              </button>
            </div>

            {/* TAB PANEL 1: POSTS */}
            {footerTab === 'Posts' && (
              <div className="astro-tab-panel">
                <div className="astrologer-post-list">
                  {visiblePosts.length ? (
                    visiblePosts.map((post) => {
                      const access = post.interactionAccess || { like: true, comment: post.commentsEnabled !== false, share: true, save: true }
                      return (
                        <article className={`astrologer-post-card astrologer-post-card--${post.tone}`} key={post.id}>
                          <div className="astrologer-content-card__top">
                            <span className="astrologer-content-card__avatar">
                              {astrologerPhoto ? (
                                <img src={astrologerPhoto} alt="" />
                              ) : (
                                astrologer.name.slice(0, 1)
                              )}
                            </span>
                            <span>
                              <b>{astrologer.name}</b>
                              <small>{new Date(post.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small>
                            </span>
                          </div>
                          <h3>{post.title}</h3>
                          <p>{post.body}</p>
                          <div className="astrologer-post-actions">
                            {access.like && (
                              <button type="button" className={postLikes[post.id] ? 'is-active' : ''} onClick={() => actions.togglePostLike(post.id)}>
                                <Heart size={15} fill={postLikes[post.id] ? 'currentColor' : 'none'} /> {(post.likeCount || 0) + (postLikes[post.id] ? 1 : 0)}
                              </button>
                            )}
                            {access.share && (
                              <button type="button" onClick={() => sharePost(post)}>
                                <Share2 size={15} /> Share
                              </button>
                            )}
                            {access.comment && (
                              <button type="button" onClick={() => toggleComment(post.id)}>
                                <MessageCircle size={15} /> {(postComments[post.id] || []).length}
                              </button>
                            )}
                            {access.save && (
                              <button type="button" className={savedPostIds.includes(post.id) ? 'is-active' : ''} onClick={() => actions.toggleSavedPost(post.id)}>
                                <Bookmark size={15} fill={savedPostIds.includes(post.id) ? 'currentColor' : 'none'} /> {savedPostIds.includes(post.id) ? 'Saved' : 'Save'}
                              </button>
                            )}
                          </div>
                          {commentOpen[post.id] && (
                            <div className="astrologer-comment-section">
                              {(postComments[post.id] || []).map((comment, index) => (
                                <div className="astrologer-comment" key={index}>
                                  <strong>{comment.userName || 'User'}</strong>
                                  <p>{comment.text}</p>
                                </div>
                              ))}
                              <div className="astrologer-comment-input">
                                <input
                                  type="text"
                                  placeholder="Write a comment..."
                                  value={commentDrafts[post.id] || ''}
                                  onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                                />
                                <button type="button" onClick={() => submitComment(post.id)}>Send</button>
                              </div>
                            </div>
                          )}
                        </article>
                      )
                    })
                  ) : (
                    <div className="astrologer-post-empty">
                      <Bookmark size={22} />
                      <h3>No posts yet</h3>
                      <p>New posts from this astrologer will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB PANEL 3: LIVE SESSIONS */}
            {footerTab === 'Live' && (
              <div className="astro-tab-panel">
                <div className="astrologer-live-groups">
                  {liveGroups.map(([label, sessions]) => (
                    <section className="astrologer-live-group" key={label}>
                      <h3>{label}</h3>
                      {sessions.length ? (
                        <div className="astrologer-live-group__list">
                          {sessions.map((session) => (
                            <article className="astrologer-live-card" key={session.id}>
                              <span className="astrologer-live-badge">
                                <Radio size={12} /> {session.status}
                              </span>
                              <h4>{session.title}</h4>
                              <p>{session.time}</p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="muted">No {label.toLowerCase()} sessions.</p>
                      )}
                    </section>
                  ))}
                </div>
              </div>
            )}

            {/* TAB PANEL 4: ABOUT & CREDENTIALS */}
            {footerTab === 'About' && (
              <div className="astro-tab-panel">
                <div className="astro-about-grid">
                  <div className="astro-about-card">
                    <h3><FileText size={18} style={{ color: 'var(--primary, #8f4dff)' }} /> Biography & Vedic Practice</h3>
                    <p className="astro-about-text">
                      {astrologer.bio}
                    </p>
                    <p className="astro-about-text">
                      With over {astrologer.experience} of dedicated research and practice, {astrologer.name} integrates classical Parashari Jyotish principles with modern lifestyle guidance. Consultations are focused on actionable remedial measures, gemstone analysis, and timing of auspicious beginnings (Muhurta).
                    </p>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Core Guidance Domains</h4>
                      <div className="astro-hero-chips-bar" style={{ paddingTop: 0 }}>
                        {consultationAreas.map((area) => (
                          <span key={area} className="astro-pill-tag astro-pill-tag--violet">
                            <Check size={12} /> {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="astro-about-card">
                    <h3><Award size={18} style={{ color: '#d97706' }} /> Credentials & Overview</h3>
                    <div className="astro-about-list">
                      <div className="astro-about-list-item">
                        <CheckCircle2 size={16} />
                        <div>
                          <strong>Specialization</strong>
                          <div>{astrologer.specialization}</div>
                        </div>
                      </div>
                      <div className="astro-about-list-item">
                        <Award size={16} />
                        <div>
                          <strong>Experience</strong>
                          <div>{astrologer.experience} professional practice</div>
                        </div>
                      </div>
                      <div className="astro-about-list-item">
                        <Languages size={16} />
                        <div>
                          <strong>Languages Spoken</strong>
                          <div>{astrologer.languages?.join(', ') || 'English, Hindi, Tamil'}</div>
                        </div>
                      </div>
                      <div className="astro-about-list-item">
                        <Star size={16} />
                        <div>
                          <strong>Rating & Reviews</strong>
                          <div>{astrologer.rating || '4.8'} / 5 · {astrologer.reviews || '1,980'} client reviews</div>
                        </div>
                      </div>
                      <div className="astro-about-list-item">
                        <ShieldCheck size={16} />
                        <div>
                          <strong>Platform Verification</strong>
                          <div>Vetted & certified practitioner on AstroVed</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB PANEL 5: REVIEWS */}
            {footerTab === 'Reviews' && (
              <div className="astro-tab-panel">
                <div className="astro-reviews-summary-card">
                  <div className="astro-reviews-score-block">
                    <span className="astro-reviews-score-num">{astrologer.rating || '4.8'}</span>
                    <div className="astro-reviews-stars-row">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={18} fill="currentColor" />
                      ))}
                    </div>
                    <span className="astro-reviews-total-label">Based on {astrologer.reviews || '1,980 reviews'}</span>
                  </div>

                  <div className="astro-reviews-bars-list">
                    {REVIEW_DISTRIBUTION.map(([label, pct]) => (
                      <div className="astro-review-bar-row" key={label}>
                        <span className="astro-review-bar-label">{label}</span>
                        <div className="astro-review-bar-track">
                          <div className="astro-review-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="astro-review-bar-count">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="astro-reviews-cards-list">
                  {allReviews.map((review) => (
                    <div className="astro-review-entry-card" key={review.id}>
                      <div className="astro-review-entry-head">
                        <div className="astro-review-entry-user">
                          <div className="astro-review-user-avatar">
                            {review.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="astro-review-entry-name">{review.name}</span>
                              <span className="astro-review-verified-pill">
                                <CheckCircle2 size={12} /> Verified
                              </span>
                            </div>
                            <span className="astro-pill-tag astro-pill-tag--violet" style={{ fontSize: 10, padding: '2px 7px', marginTop: 2 }}>
                              {review.type}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                          <div style={{ display: 'flex', gap: 2, color: '#f59e0b' }}>
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} size={13} fill="currentColor" />
                            ))}
                          </div>
                          <span className="astro-review-date">{review.date}</span>
                        </div>
                      </div>
                      <p className="astro-review-text">{review.text}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, padding: '2px 8px', color: 'var(--muted)' }}
                        >
                          <ThumbsUp size={12} style={{ marginRight: 4 }} /> Helpful ({review.helpful})
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB PANEL 6: SAVED POSTS */}
            {footerTab === 'Saved Posts' && (
              <div className="astro-tab-panel">
                <div className="astrologer-post-list">
                  {savedPosts.length ? (
                    savedPosts.map((post) => (
                      <article className={`astrologer-post-card astrologer-post-card--${post.tone}`} key={post.id}>
                        <div className="astrologer-content-card__top">
                          <span className="astrologer-content-card__avatar">
                            {astrologerPhoto ? (
                              <img src={astrologerPhoto} alt="" />
                            ) : (
                              astrologer.name.slice(0, 1)
                            )}
                          </span>
                          <span>
                            <b>{astrologer.name}</b>
                            <small>{new Date(post.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small>
                          </span>
                        </div>
                        <h3>{post.title}</h3>
                        <p>{post.body}</p>
                        <div className="astrologer-post-actions">
                          <button type="button" className={postLikes[post.id] ? 'is-active' : ''} onClick={() => actions.togglePostLike(post.id)}>
                            <Heart size={15} fill={postLikes[post.id] ? 'currentColor' : 'none'} /> {(post.likeCount || 0) + (postLikes[post.id] ? 1 : 0)}
                          </button>
                          <button type="button" onClick={() => sharePost(post)}>
                            <Share2 size={15} /> Share
                          </button>
                          <button type="button" className="is-active" onClick={() => actions.toggleSavedPost(post.id)}>
                            <Bookmark size={15} fill="currentColor" /> Saved
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="astrologer-post-empty">
                      <Bookmark size={22} />
                      <h3>No saved posts yet</h3>
                      <p>Saved posts from this astrologer will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {shareMessage && <div className="astrologer-share-feedback" role="status">{shareMessage}</div>}
          </div>

          {servicesModalOpen && (
            <div className="modal-overlay user-modal-overlay" onClick={() => setServicesModalOpen(false)}>
              <div
                className="modal-card user-modal-card"
                style={{ width: 'min(920px, calc(100vw - 32px))', maxHeight: '88vh', overflowY: 'auto' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
                  <div>
                    <div className="section-title" style={{ marginBottom: 2 }}>All Services & Consultations</div>
                    <span className="muted" style={{ fontSize: 13 }}>Specialized Vedic rituals, remedies, and readings by {astrologer.name}</span>
                  </div>
                  <button type="button" className="icon-btn" aria-label="Close services modal" onClick={() => setServicesModalOpen(false)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="modal-card__content user-modal-card__content" style={{ padding: '20px' }}>
                  <div className="astro-services-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                    {servicesCatalog.map((service) => {
                      const ServiceIcon = service.icon || Compass
                      return (
                        <div key={service.id} className="astro-service-card">
                          <div>
                            <div className="astro-service-card-top">
                              <span className={`astro-service-badge astro-service-badge--${service.badgeType || 'popular'}`}>
                                {service.badge}
                              </span>
                              <div className="astro-service-icon-wrap">
                                <ServiceIcon size={20} />
                              </div>
                            </div>
                            <div className="astro-service-card-body">
                              <h4 className="astro-service-title">{service.title}</h4>
                              <p className="astro-service-desc">{service.description}</p>
                            </div>
                          </div>
                          <div className="astro-service-card-footer">
                            <div className="astro-service-pricing">
                              <span className="astro-service-duration">
                                <Clock3 size={11} style={{ display: 'inline', marginRight: 3 }} /> {service.duration}
                              </span>
                              <span className="astro-service-price-amount">₹{service.price}</span>
                            </div>
                            {service.actionType === 'chat' ? (
                              <button
                                type="button"
                                className="astro-service-book-btn"
                                onClick={() => {
                                  setServicesModalOpen(false)
                                  openInstantChat(astrologer.id)
                                }}
                              >
                                <MessageCircle size={13} /> {service.actionLabel}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="astro-service-book-btn"
                                onClick={() => {
                                  setServicesModalOpen(false)
                                  openBooking()
                                }}
                              >
                                <CalendarPlus size={13} /> {service.actionLabel}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isOwner && audiencePanel && (
        <div className="modal-overlay user-modal-overlay" onClick={() => setAudiencePanel(null)}>
          <div className="modal-card user-modal-card" style={{ width: 'min(420px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>{audiencePanel}</div>
              <button type="button" className="icon-btn" aria-label={`Close ${audiencePanel} list`} onClick={() => setAudiencePanel(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content user-modal-card__content">
              <div className="social-profile__audience-list">
                {(audiencePanel === 'Followers' ? PROFILE_FOLLOWERS : subscriberNames).length ? (audiencePanel === 'Followers' ? PROFILE_FOLLOWERS : subscriberNames).map((name, index) => (
                  <div key={`${name}-${index}`} className="social-profile__audience-item"><div className="social-profile__audience-avatar">{name.slice(0, 1).toUpperCase()}</div><strong>{name}</strong></div>
                )) : <div className="muted">No {audiencePanel.toLowerCase()} yet.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {bookingOpen && createPortal((
        <div className="modal-overlay user-modal-overlay" onClick={() => setBookingOpen(false)}>
          <div className={`modal-card user-modal-card appointment-booking-modal${bookingStep === 'details' ? ' appointment-booking-modal--details' : ''}${bookingStep === 'review' ? ' appointment-booking-modal--review' : ''}${bookingStep === 'payment' ? ' appointment-booking-modal--payment' : ''}${bookingStep === 'success' ? ' appointment-booking-modal--success' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header appointment-booking-modal__header flex items-start justify-between gap-4">
              <div className="appointment-booking-heading">
                <div className="appointment-booking-avatar">
                  {astrologerPhoto ? (
                    <img src={astrologerPhoto} alt={`${astrologer.name} profile`} />
                  ) : (
                    astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')
                  )}
                </div>
                <div>
                  <div className="section-title" style={{ marginBottom: 3 }}>{bookingStep === 'success' ? 'Appointment Confirmed' : 'Book Appointment'}</div>
                  <strong>{astrologer.name}</strong>
                  <span>{astrologer.specialization} · {APPOINTMENT_TYPE}</span>
                </div>
              </div>
              <button type="button" className="icon-btn" aria-label="Close booking popup" onClick={() => setBookingOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div ref={bookingContentRef} className={`modal-card__content user-modal-card__content${bookingStep === 'details' ? ' appointment-details-content' : ''}`}>
              {bookingStep === 'form' && <div className="appointment-booking-form">
                <div className="appointment-view-tabs">{['day', 'week', 'month', 'year'].map((view) => <button type="button" key={view} className={calendarView === view ? 'is-active' : ''} onClick={() => setCalendarView(view)}>{view[0].toUpperCase() + view.slice(1)}</button>)}</div>
                <div className="availability-calendar appointment-calendar-extended">
                  <div className="availability-calendar__header"><button type="button" className="icon-btn" aria-label="Previous" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}><ChevronLeft size={16} /></button><strong>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><div className="appointment-calendar-nav"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setCalendarMonth(new Date(2026, 7, 1))}>Today</button><button type="button" className="icon-btn" aria-label="Next" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}><ChevronRight size={16} /></button></div></div>
                  {calendarView === 'month' && <><div className="availability-calendar__weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div><div className="availability-calendar__days appointment-month-days">{monthDays.map((day) => { const key = dateKey(day); const status = dateAvailability(key); const outside = day.getMonth() !== calendarMonth.getMonth(); const selected = bookingForm.date === key; const label = status.state === 'booked-by-me' ? `You · ${status.slots.length} slots` : status.selectable ? `${status.slots.length} slots` : status.reason; return <button type="button" key={key} className={`appointment-date-cell appointment-date-cell--${status.state}${selected ? ' is-selected' : ''}${outside ? ' is-outside' : ''}`} disabled={!status.selectable} onClick={() => selectCalendarDate(key)}><b>{day.getDate()}</b><small>{label}</small></button> })}</div><div className="appointment-calendar-legend appointment-calendar-legend--booking"><span><i className="is-bookable" />Blue — Partially booked</span><span><i className="is-available" />Green — All slots available</span><span><i className="is-unavailable" />Yellow — Unavailable</span><span><i className="is-booked-by-me" />Purple — Your booking</span></div></>}
                  {calendarView === 'year' && <div className="appointment-year-grid">{Array.from({ length: 12 }, (_, index) => { const month = new Date(calendarMonth.getFullYear(), index, 1); const count = Object.entries(availability).filter(([key]) => key.startsWith(`${calendarMonth.getFullYear()}-${String(index + 1).padStart(2, '0')}`)).reduce((sum, [, slots]) => sum + slots.length, 0); return <button type="button" key={index} onClick={() => { setCalendarMonth(month); setCalendarView('month') }}><strong>{month.toLocaleDateString('en-US', { month: 'short' })}</strong><span>{count ? `${count} slots` : 'No availability'}</span></button> })}</div>}
                  {calendarView === 'day' && <DayAvailability date={bookingForm.date} availability={availability} selectedSlots={selectedSlots} toggleSlot={toggleSlot} bookedSlots={bookedSlots} myBookedSlots={myBookedSlots} unavailableReason={dateAvailability(bookingForm.date).reason} totalSlots={dateAvailability(bookingForm.date).totalSlots} bookedCount={dateAvailability(bookingForm.date).bookedCount} availableCount={dateAvailability(bookingForm.date).availableCount} myBooking={dateAvailability(bookingForm.date).myBooking} />}
                  {calendarView === 'week' && <WeekAvailability month={calendarMonth} focusDate={bookingForm.date} availability={availability} selectedSlots={selectedSlots} toggleSlot={toggleSlot} bookedSlots={bookedSlots} />}
                </div>
                {bookingNotice && <div className="appointment-booking-notice" role="status"><CircleAlert size={15} /> {bookingNotice}</div>}
              </div>}
              {bookingStep === 'details' && <ConsultationDetails details={consultationDetails} setDetails={setConsultationDetails} onSkip={() => setBookingStep('review')} />}
              {bookingStep === 'review' && <BookingReview selectedSlots={selectedSlots} />}
              {bookingStep === 'payment' && (() => { const amount = selectedSlots.reduce((sum, slot) => sum + slot.price, 0); const balance = userWallet?.balance || 0; const sufficient = balance >= amount; return <div className="appointment-payment-step"><div className="appointment-payment-title">Pay with Wallet</div><div className="appointment-wallet-card"><div className="appointment-wallet-balance"><div><WalletCards size={16} /><span>Wallet Balance</span></div><strong>₹{balance.toLocaleString('en-IN')}</strong></div><div className="appointment-wallet-divider" /><div className="appointment-wallet-line"><span>Appointment Amount</span><strong>₹{amount.toLocaleString('en-IN')}</strong></div><div className="appointment-wallet-line appointment-wallet-line--secondary"><span>Remaining Balance</span><strong>₹{(balance - amount).toLocaleString('en-IN')}</strong></div><div className={`appointment-wallet-status ${sufficient ? 'is-sufficient' : 'is-insufficient'}`} role="status">{sufficient ? <><Check size={14} /> Sufficient wallet balance</> : <><CircleAlert size={14} /> Insufficient wallet balance</>}</div></div>{!sufficient && <button type="button" className="btn btn-outline appointment-add-money" onClick={() => navigate(routes.walletHistory)}>Add Money to Wallet</button>}<p className="appointment-charge-note">You will be charged ₹{amount.toLocaleString('en-IN')} from your wallet.</p></div> })()}
              {bookingStep === 'success' && (() => { const slot = selectedSlots[0]; const amount = selectedSlots.reduce((sum, item) => sum + item.price, 0); const bookingId = slot?.date ? `#BOOK-${slot.date.replaceAll('-', '')}-001` : ''; const startTime = appointmentStartTime(slot); const active = currentTime >= startTime && currentTime < startTime + 30 * 60000; const copyBookingId = () => { navigator.clipboard?.writeText(bookingId); setBookingIdCopied(true); window.setTimeout(() => setBookingIdCopied(false), 1800) }; return <div className="appointment-booking-success"><div className="appointment-success-heading"><div className="appointment-success-mark"><Check size={21} /></div><div className="appointment-success-title"><Sparkles size={14} /><h3>Appointment Confirmed!</h3><Sparkles size={14} /></div><p>Your appointment with {astrologer.name} has been confirmed.</p></div><div className="appointment-success-details"><strong>Appointment Details</strong><div className="appointment-success-detail-list">{selectedSlots.map((item, index) => <div className="appointment-success-detail-entry" key={item.key}><div className="appointment-success-detail-column"><CalendarPlus size={17} className="appointment-detail-icon" /><small>Date &amp; Time</small><b>{displayDateKey(item.date)}</b><b className="appointment-detail-time">{formatSlotRange(item.time)}</b></div><div className="appointment-success-detail-column"><PhoneCall size={17} className="appointment-detail-icon" /><small>Consultation Type</small><span className="appointment-consultation-pill">{item.type}</span></div><div className="appointment-success-detail-column"><Clock3 size={17} className="appointment-detail-icon" /><small>Duration</small><b>{item.duration}</b></div>{index === 0 && <div className="appointment-success-detail-column appointment-detail-booking-id"><small>Booking ID</small><span>{bookingId}<button type="button" aria-label="Copy booking ID" onClick={copyBookingId}><Copy size={13} /></button>{bookingIdCopied && <small className="appointment-copy-feedback">Copied!</small>}</span></div>}</div>)}{active && <div className="appointment-live-indicator"><span className="appointment-live-dot" /> {formatCountdown(startTime + 30 * 60000 - currentTime)}</div>}</div></div></div> })()}
            </div>
            <div className="modal-card__footer user-modal-card__footer appointment-booking-modal__footer">
              {bookingStep !== 'success' && <button className="btn btn-ghost" type="button" onClick={cancelBooking}>Cancel</button>}
              {bookingStep === 'form' && <><button className="btn btn-outline" type="button" disabled={!selectedSlots.length} onClick={() => setBookingStep('details')}>Add Details</button><button className="btn btn-primary" type="button" disabled={!selectedSlots.length} onClick={() => setBookingStep('review')}>Review Appointment</button></>}
              {bookingStep === 'details' && <button className="btn btn-primary" type="button" onClick={() => setBookingStep('review')}>Save Details</button>}
              {bookingStep === 'review' && <><button className="btn btn-outline" type="button" onClick={() => setBookingStep('form')}>Edit Appointment</button><button className="btn btn-primary" type="button" onClick={() => setBookingStep('payment')}>Proceed to Payment</button></>}
              {bookingStep === 'payment' && <button className="btn btn-primary" type="button" disabled={paymentMethod !== 'Wallet' || (userWallet?.balance || 0) < selectedSlots.reduce((sum, slot) => sum + slot.price, 0)} onClick={handlePayment}>Confirm &amp; Pay ₹{selectedSlots.reduce((sum, slot) => sum + slot.price, 0)}</button>}
              {bookingStep === 'success' && <><button className="btn btn-primary" type="button" onClick={() => { setBookingOpen(false); navigate(`${routes.appointmentDetails}?id=${bookedAppointmentId}`) }}><CalendarPlus size={15} /> View Appointment</button><button className="btn btn-outline" type="button" onClick={() => setBookingOpen(false)}>Done</button></>}
            </div>
          </div>
        </div>
      ), document.body)}

      {subscriptionPromptOpen && (
        <div className="modal-overlay user-modal-overlay" onClick={() => setSubscriptionPromptOpen(false)}>
          <div className="modal-card user-modal-card subscription-prompt-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>Subscription required</div>
              <button type="button" className="icon-btn" aria-label="Close subscription prompt" onClick={() => setSubscriptionPromptOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-card__content user-modal-card__content" style={{ textAlign: 'center' }}>
              <div className="subscription-prompt-card__icon">🔒</div>
              <p className="muted">Subscribe to this astrologer to book an appointment.</p>
            </div>
            <div className="modal-card__footer user-modal-card__footer" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setSubscriptionPromptOpen(false)}>Not now</button>
              <button type="button" className="btn btn-primary" onClick={() => { setSubscriptionPromptOpen(false); handleSubscribe() }}>Subscribe Now</button>
            </div>
          </div>
        </div>
      )}

      {subscribeOpen && (
        <div className="modal-overlay user-modal-overlay" onClick={() => setSubscribeOpen(false)}>
          <div
            className="modal-card user-modal-card"
            style={{ width: 'min(460px, calc(100vw - 32px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>Subscribe to {astrologer.name}</div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setSubscribeOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-card__content user-modal-card__content">
              <div className="subscription-plan-summary">
                <div className="subscription-plan-summary__main">
                  <BadgeCheck size={18} />
                  <div>
                    <div className="subscription-plan-summary__name">{SUBSCRIPTION_PLAN_LABEL}</div>
                    <div className="subscription-plan-summary__meta">Valid for 30 days · 1 Discount Question</div>
                  </div>
                </div>
                <div className="subscription-plan-summary__price">₹{SUBSCRIPTION_PRICE}</div>
              </div>

              <div className="field-group" style={{ marginTop: 18 }}>
                <label className="field-label-top">Pay from Wallet</label>
                <div className="withdraw-methods">
                  <div className="withdraw-method-option is-selected">
                    <div className="withdraw-method-left">
                      <WalletCards size={18} style={{ color: 'var(--primary)' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Wallet Balance</div>
                        <div style={{ color: 'var(--muted)', fontSize: 11 }}>Available: ₹{walletBalance.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                    <span style={{ color: walletBalance >= SUBSCRIPTION_PRICE ? 'var(--success)' : 'var(--danger)', fontSize: 12, fontWeight: 700 }}>
                      {walletBalance >= SUBSCRIPTION_PRICE ? 'Sufficient' : 'Insufficient'}
                    </span>
                  </div>
                </div>
                {walletBalance < SUBSCRIPTION_PRICE && (
                  <div className="subscription-fund-note">
                    <CircleAlert size={14} /> Your wallet balance is low. Add money before subscribing.
                    <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate(routes.walletHistory)}>Add Money</button>
                  </div>
                )}
              </div>

              <div className="field-group" style={{ marginTop: 18 }}>
                <label className="field-label-top">Billing Method</label>
                {userPaymentMethods.length === 0 ? (
                  <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                    No saved payment method. Subscription will renew from your wallet. You can add a card/UPI later.
                  </div>
                ) : (
                  <div className="withdraw-methods">
                    {userPaymentMethods.map((method) => {
                      const selected = selectedSubscribeMethod?.id === method.id
                      return (
                        <button
                          key={method.id}
                          type="button"
                          className={`withdraw-method-option ${selected ? 'is-selected' : ''}`}
                          onClick={() => setSubscribeMethodId(method.id)}
                        >
                          <div className="withdraw-method-left">
                            <WalletCards size={18} style={{ color: 'var(--primary)' }} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{maskMethod(method)}</div>
                              {method.isDefault && <div style={{ color: 'var(--muted)', fontSize: 11 }}>Default</div>}
                            </div>
                          </div>
                          <div className={`withdraw-method-check ${selected ? 'is-visible' : ''}`}>
                            <Check size={14} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <label className="autopay-toggle-row">
                <div className="autopay-toggle-row__text">
                  <div className="autopay-toggle-row__title">Enable Autopay</div>
                  <div className="autopay-toggle-row__sub">Auto-renew this subscription each month from your wallet.</div>
                </div>
                <input
                  type="checkbox"
                  checked={subscribeAutopay}
                  onChange={(event) => setSubscribeAutopay(event.target.checked)}
                />
                <span className="autopay-toggle-row__slider" />
              </label>
            </div>
            <div className="modal-card__footer user-modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setSubscribeOpen(false)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={walletBalance < SUBSCRIPTION_PRICE}
                onClick={() => { setSubscribeConfirmOpen(true) }}
              >
                <BadgeCheck size={15} /> Continue to Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {subscribeConfirmOpen && (
        <div className="modal-overlay user-modal-overlay" onClick={() => setSubscribeConfirmOpen(false)}>
          <div
            className="modal-card user-modal-card"
            style={{ width: 'min(440px, calc(100vw - 32px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>Confirm Subscription</div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setSubscribeConfirmOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-card__content user-modal-card__content">
              {subscribeInsufficient ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 34, marginBottom: 10 }}>⚠️</div>
                  <p className="muted" style={{ lineHeight: 1.6 }}>Insufficient wallet balance to subscribe.</p>
                  <div className="wallet-modal-actions" style={{ justifyContent: 'center' }}>
                    <button type="button" className="btn btn-primary" onClick={() => navigate(routes.walletHistory)}>Add Money</button>
                  </div>
                </div>
              ) : (
                <div className="withdraw-review">
                  <div className="withdraw-review-row">
                    <span>Plan</span>
                    <strong>{SUBSCRIPTION_PLAN_LABEL}</strong>
                  </div>
                  <div className="withdraw-review-row">
                    <span>Astrologer</span>
                    <strong>{astrologer.name}</strong>
                  </div>
                  <div className="withdraw-review-row">
                    <span>Amount (from Wallet)</span>
                    <strong>₹{SUBSCRIPTION_PRICE.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="withdraw-review-row">
                    <span>Billing method for renewal</span>
                    <strong>{selectedSubscribeMethod ? maskMethod(selectedSubscribeMethod) : 'Wallet'}</strong>
                  </div>
                  <div className="withdraw-review-row withdraw-review-total">
                    <span>Total charged today</span>
                    <strong>₹{SUBSCRIPTION_PRICE.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="withdraw-review-note">
                    <Info size={14} /> Autopay {subscribeAutopay ? 'enabled' : 'disabled'}. Your subscription renews every month.
                  </div>
                </div>
              )}
            </div>
            <div className="modal-card__footer user-modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setSubscribeConfirmOpen(false)}>Back</button>
              {!subscribeInsufficient && (
                <button type="button" className="btn btn-primary" onClick={handleConfirmSubscribe}>
                  <Check size={15} /> Confirm & Subscribe
                </button>
              )}
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
                ₹{SUBSCRIPTION_PRICE} charged from your wallet. You get{' '}
                <strong style={{ color: 'var(--ink)' }}>1 Discount Question</strong> valid for{' '}
                <strong style={{ color: 'var(--ink)' }}>15 days</strong>.
              </p>
              {subscribeAutopay && (
                <div className="subscription-autopay-chip">
                  <RefreshCw size={13} /> Autopay enabled — renews ₹{SUBSCRIPTION_PRICE}/month from {selectedSubscribeMethod ? maskMethod(selectedSubscribeMethod) : 'wallet'}.
                </div>
              )}
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
