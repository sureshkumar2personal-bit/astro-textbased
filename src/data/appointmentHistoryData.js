// ---------------------------------------------------------------------------
// Appointment History — realistic mock demo data.
//
// Generated deterministically at module load (seeded PRNG, no randomness on
// render) so the data is stable across refreshes and structured so it can be
// replaced by backend/API data later. This file is the single source of truth
// for the Appointment History demo; it is intentionally independent of the
// Schedule Appointments availability data.
// ---------------------------------------------------------------------------

const ASTROLOGER_ID = 'astrologer-demo'
const ASTROLOGER_NAME = 'Dr. Rani'

// Seeded PRNG (mulberry32) — same seed => same data every load.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260904)
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const between = (min, max) => Math.floor(rnd() * (max - min + 1)) + min

// Realistic varied user pool. `userId` is the stable identity used by the
// user profile page so a history entry can be reliably linked to its owner.
const CUSTOMERS = [
  { userId: 'u-priya', name: 'Priya', phone: '+91 98111 00001', lang: 'Telugu', topic: 'Marriage' },
  { userId: 'u-karthik', name: 'Karthik', phone: '+91 98111 00002', lang: 'Tamil', topic: 'Career' },
  { userId: 'u-meena', name: 'Meena', phone: '+91 98111 00003', lang: 'Tamil', topic: 'Love' },
  { userId: 'u-gautham', name: 'Gautham', phone: '+91 98111 00004', lang: 'English', topic: 'Business' },
  { userId: 'u-lakshmi', name: 'Lakshmi', phone: '+91 98111 00005', lang: 'Telugu', topic: 'Health' },
  { userId: 'u-arjun', name: 'Arjun', phone: '+91 98111 00006', lang: 'Hindi', topic: 'Career' },
  { userId: 'u-divya', name: 'Divya', phone: '+91 98111 00007', lang: 'Tamil', topic: 'Marriage' },
  { userId: 'u-rahul', name: 'Rahul', phone: '+91 98111 00008', lang: 'Hindi', topic: 'Education' },
  { userId: 'u-anitha', name: 'Anitha', phone: '+91 98111 00009', lang: 'Tamil', topic: 'Finance' },
  { userId: 'u-vikram', name: 'Vikram', phone: '+91 98111 00010', lang: 'English', topic: 'Business' },
  { userId: 'u-sneha', name: 'Sneha', phone: '+91 98111 00011', lang: 'Telugu', topic: 'Love' },
  { userId: 'u-manoj', name: 'Manoj', phone: '+91 98111 00012', lang: 'Tamil', topic: 'Health' },
  { userId: 'u-kavitha', name: 'Kavitha', phone: '+91 98111 00013', lang: 'Tamil', topic: 'Marriage' },
  { userId: 'u-suresh', name: 'Suresh', phone: '+91 98111 00014', lang: 'Telugu', topic: 'Career' },
  { userId: 'u-pooja', name: 'Pooja', phone: '+91 98111 00015', lang: 'Hindi', topic: 'Business' },
  { userId: 'u-naveen', name: 'Naveen', phone: '+91 98111 00016', lang: 'English', topic: 'Education' },
  { userId: 'u-radhika', name: 'Radhika', phone: '+91 98111 00017', lang: 'Telugu', topic: 'Health' },
  { userId: 'u-deepak', name: 'Deepak', phone: '+91 98111 00018', lang: 'Hindi', topic: 'Finance' },
  { userId: 'u-sangeetha', name: 'Sangeetha', phone: '+91 98111 00019', lang: 'Tamil', topic: 'Love' },
  { userId: 'u-harish', name: 'Harish', phone: '+91 98111 00020', lang: 'English', topic: 'Career' },
]

// callType -> presentation (Audio Call only per product rules)
const CALL_TYPES = [
  { type: 'Audio Call', callType: 'Audio', price: 799, minutes: 30, fmt: '30 min' },
  { type: 'Audio Call', callType: 'Audio', price: 499, minutes: 20, fmt: '20 min' },
  { type: 'Audio Call', callType: 'Audio', price: 699, minutes: 30, fmt: '30 min' },
  { type: 'Audio Call', callType: 'Audio', price: 899, minutes: 40, fmt: '40 min' },
]

// Slots used for start times (24h + display).
const SLOTS = [
  { h: 10, m: 0, disp: '10:00 AM', fmt: '10:00' },
  { h: 10, m: 30, disp: '10:30 AM', fmt: '10:30' },
  { h: 11, m: 0, disp: '11:00 AM', fmt: '11:00' },
  { h: 11, m: 45, disp: '11:45 AM', fmt: '11:45' },
  { h: 13, m: 0, disp: '01:00 PM', fmt: '13:00' },
  { h: 14, m: 0, disp: '02:00 PM', fmt: '14:00' },
  { h: 15, m: 30, disp: '03:30 PM', fmt: '15:30' },
  { h: 16, m: 15, disp: '04:15 PM', fmt: '16:15' },
  { h: 17, m: 0, disp: '05:00 PM', fmt: '17:00' },
  { h: 18, m: 30, disp: '06:30 PM', fmt: '18:30' },
  { h: 20, m: 0, disp: '08:00 PM', fmt: '20:00' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function pad(n) { return String(n).padStart(2, '0') }
function iso(y, m, d) { return `${y}-${pad(m)}-${pad(d)}` }
function dispDate(y, m, d) { return `${pad(d)} ${MONTHS[m - 1]} ${y}` }
function fmtDateTime(date) {
  return new Date(date).toISOString()
}

// Terminal statuses used for past appointments, weighted naturally.
const PAST_STATUSES = ['Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Cancelled by User', 'Cancelled by User', 'Cancelled by Astrologer', 'Cancelled by Astrologer', 'No-show', 'No-show', 'Auto-cancelled']

// Advance a time by [h, min] minutes -> [endH, endM] for computing start+offset.
function addMin(h, m, mins) {
  const total = h * 60 + m + mins
  return { h: Math.floor(total / 60) % 24, m: total % 60 }
}
function fmtHM(h, m) {
  const hr = h % 24
  const ampm = hr >= 12 ? 'PM' : 'AM'
  const h12 = hr % 12 === 0 ? 12 : hr % 12
  return `${pad(h12)}:${pad(m)} ${ampm}`
}
function fmt24(h, m) { return `${pad(h)}:${pad(m)}` }

// Build a deterministic horoscope attachment for a customer. Uses a small inline
// SVG data-URI as a viewable lead-previews chart (frontend/demo persistence — no
// backend storage exists in this project). The full record keeps the file name,
// type, size and upload timestamp so a real file reference can replace dataUrl.
function makeHoroscope(customer, tag) {
  const initials = String(customer.name || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const hue = [...String(customer.name || '')].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">` +
    `<rect width="240" height="240" fill="#fdfaf2"/>` +
    `<g fill="none" stroke="hsl(${hue},70%,40%)" stroke-width="2">` +
    `<rect x="30" y="30" width="180" height="180"/>` +
    `<line x1="30" y1="120" x2="210" y2="120"/>` +
    `<line x1="120" y1="30" x2="120" y2="210"/>` +
    `<line x1="30" y1="30" x2="210" y2="210"/>` +
    `<line x1="210" y1="30" x2="30" y2="210"/>` +
    `</g>` +
    `<text x="120" y="150" text-anchor="middle" font-size="34" font-weight="700" fill="hsl(${hue},70%,30%)">${initials}</text>` +
    `<text x="120" y="176" text-anchor="middle" font-size="12" fill="#8a8176">Kundli Chart</text>` +
    `</svg>`
  const size = 1200 + (hue % 400)
  return {
    name: `${customer.name}_Horoscope_${tag}.pdf`,
    type: 'application/pdf',
    size: `${size} KB`,
    sizeBytes: size * 1024,
    uploadedAt: fmtDateTime(new Date(2026, 6, 14, 9, 30, 0)),
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  }
}

let counter = 0
function buildRecord({ y, m, d, status }) {
  counter += 1
  const customer = pick(CUSTOMERS)
  const call = pick(CALL_TYPES)
  const slot = pick(SLOTS)
  const end = addMin(slot.h, slot.m, call.minutes)
  const monthKey = `${MONTHS[m - 1]}${y}`
  const txn = `TXN-H${y}-${pad(m)}-${pad(counter)}`

  // Booking date is a few days before the appointment.
  const apptDate = new Date(y, m - 1, d, 12, 0, 0)
  const booked = new Date(apptDate)
  booked.setDate(booked.getDate() - between(2, 9))

  // Payment status: cancelled past records are refunded; the rest are paid.
  const isCancelledRecord = /cancelled/i.test(status)
  const paymentStatus = isCancelledRecord ? (status === 'Auto-cancelled' ? 'Refunded' : 'Refunded') : 'Paid'

  const record = {
    id: `apt-h-${pad(counter)}`,
    userId: customer.userId,
    astrologerId: ASTROLOGER_ID,
    astrologer: ASTROLOGER_NAME,
    type: call.type,
    callType: call.callType,
    customerName: customer.name,
    customerPhone: customer.phone,
    orderId: `#AH${monthKey}-${pad(counter)}`,
    amount: call.price,
    duration: call.fmt,
    date: dispDate(y, m, d),
    dateIso: iso(y, m, d),
    time: slot.disp,
    start: slot.fmt,
    end: fmt24(end.h, end.m),
    language: customer.lang,
    topic: customer.topic,
    status,
    paymentStatus,
    paymentMethod: 'Wallet',
    transactionId: txn,
    bookedAt: fmtDateTime(booked),
    bookingDate: dispDate(booked.getFullYear(), booked.getMonth() + 1, booked.getDate()),
  }

  return record
}

// A day plan: number of slots to fill on a single date.
// statusFor(i) returns the status for the i-th appointment on that date.

const PLANS = {
  past: () => pick(PAST_STATUSES),
  future: () => (rnd() < 0.85 ? 'Booked' : pick(['Cancelled by User', 'Cancelled by Astrologer'])),
  currentPast: () => pick(PAST_STATUSES),
  currentFuture: () => (rnd() < 0.9 ? 'Booked' : pick(['Cancelled by Astrologer', 'Cancelled by User'])),
}

// Reference "today" used for demo (the current scheduler date).
const REF_Y = 2026
const REF_M = 9 // September
const REF_D = 4

function monthKind(y, m) {
  if (y < REF_Y || (y === REF_Y && m < REF_M)) return 'past'
  if (y > REF_Y || (y === REF_Y && m > REF_M)) return 'future'
  return 'current'
}

function buildMonth(y, m, days) {
  const kind = monthKind(y, m)
  const records = []
  days.forEach(([day, count]) => {
    for (let i = 0; i < count; i += 1) {
      let status
      if (kind === 'future') status = PLANS.future(i)
      else if (kind === 'past') status = PLANS.past(i)
      else {
        // current month: before ref day -> terminal, on/after -> booked
        status = day < REF_D ? PLANS.currentPast(i) : PLANS.currentFuture(i)
      }
      records.push(buildRecord({ y, m, d: day, status }))
    }
  })
  return records
}

// Build all months. Each month lists [day, count] pairs. Days intentionally
// have 1-3 appointments and some days are skipped to look natural.
function buildAll() {
  const all = []

  const addMonth = (y, m, days) => {
    all.push(...buildMonth(y, m, days))
  }

  // 2025 historical months
  addMonth(2025, 8, [[5,2],[11,3],[18,2],[24,3],[29,2]])            // Aug 2025
  addMonth(2025, 9, [[3,2],[9,2],[15,3],[21,2],[27,3]])             // Sep 2025
  addMonth(2025, 10, [[1,2],[8,3],[14,2],[20,3],[26,2],[30,2]])     // Oct 2025
  addMonth(2025, 11, [[4,2],[11,3],[17,2],[23,2],[28,3]])           // Nov 2025
  addMonth(2025, 12, [[2,2],[9,3],[16,2],[22,3],[29,2]])            // Dec 2025
  addMonth(2026, 1, [[6,3],[13,2],[19,3],[25,2],[30,2]])            // Jan 2026
  addMonth(2026, 2, [[3,2],[9,2],[15,3],[22,2],[27,3]])             // Feb 2026
  addMonth(2026, 3, [[4,3],[10,2],[16,3],[23,2],[29,3]])            // Mar 2026
  addMonth(2026, 4, [[2,2],[8,3],[15,2],[21,3],[27,2]])             // Apr 2026
  addMonth(2026, 5, [[1,3],[7,2],[13,3],[20,2],[26,3]])             // May 2026
  addMonth(2026, 6, [[3,2],[10,3],[17,2],[24,3]])                   // Jun 2026
  addMonth(2026, 7, [[1,2],[8,3],[15,2],[22,3],[29,2]])             // Jul 2026
  addMonth(2026, 8, [[5,3],[12,2],[19,3],[26,2]])                   // Aug 2026

  // Current month (Sep 2026): past days -> terminal, from Sep 5 onward -> booked
  addMonth(2026, 9, [
    [2, 2], [3, 1],            // past (terminal)
    [4, 2],                    // reference "today" (mostly Booked -> Start Call)
    [5, 2], [7, 3], [8, 2],    // upcoming
    [10, 3], [12, 3], [15, 2], // upcoming
    [18, 3], [20, 2], [22, 3], // upcoming
    [25, 2], [28, 3], [30, 2], // upcoming
  ])

  // Future months (mostly Booked for an "Upcoming" demo)
  addMonth(2026, 10, [[1,2],[5,3],[8,2],[12,3],[15,2],[19,3],[22,2],[26,3],[29,2]])
  addMonth(2026, 11, [[2,2],[5,3],[9,2],[12,3],[16,2],[20,3],[24,2],[27,3]])
  addMonth(2026, 12, [[1,3],[4,2],[8,3],[11,2],[15,3],[18,2],[22,3],[29,2]])
  addMonth(2027, 1, [[5,2],[8,3],[12,2],[15,3],[19,2],[22,3],[26,2],[29,3]])

  return all
}

// Build explicit reschedule examples: an original (cancelled) record that
// points at a new (booked) record, and vice-versa. No second payment.
function buildReschedulePairs() {
  const pairs = []
  const specs = [
    { y: 2026, m: 8, oldDay: 20, newDay: 22, custIdx: 0 },   // Priya
    { y: 2026, m: 7, oldDay: 14, newDay: 16, custIdx: 2 },   // Meena
    { y: 2026, m: 6, oldDay: 25, newDay: 27, custIdx: 11 },  // Manoj
  ]

  specs.forEach((spec) => {
    const customer = CUSTOMERS[spec.custIdx]
    const call = CALL_TYPES[0] // Audio 30 min
    const oldStartH = 11
    const oldStartM = 0
    const newStartH = 16
    const newStartM = 30
    const oldEnd = addMin(oldStartH, oldStartM, call.minutes)
    const newEnd = addMin(newStartH, newStartM, call.minutes)

    const oldBooked = new Date(spec.y, spec.m - 1, spec.oldDay - 4, 12, 0, 0)
    const newBooked = new Date(spec.y, spec.m - 1, spec.oldDay - 1, 12, 0, 0)
    const oldId = `apt-h-rs-${spec.m}-${spec.oldDay}`
    const newId = `apt-h-rs-${spec.m}-${spec.newDay}`

    pairs.push({
      id: oldId,
      userId: customer.userId,
      astrologerId: ASTROLOGER_ID,
      astrologer: ASTROLOGER_NAME,
      type: call.type,
      callType: call.callType,
      customerName: customer.name,
      customerPhone: customer.phone,
      orderId: `#AH${MONTHS[spec.m - 1]}${spec.y}-RS-O`,
      amount: call.price,
      duration: call.fmt,
      date: dispDate(spec.y, spec.m, spec.oldDay),
      dateIso: iso(spec.y, spec.m, spec.oldDay),
      time: fmtHM(oldStartH, oldStartM),
      start: fmt24(oldStartH, oldStartM),
      end: fmt24(oldEnd.h, oldEnd.m),
      language: customer.lang,
      topic: customer.topic,
      status: 'Cancelled by Astrologer',
      paymentStatus: 'Refunded',
      paymentMethod: 'Wallet',
      transactionId: `TXN-RS-${spec.m}-${spec.oldDay}`,
      bookedAt: fmtDateTime(oldBooked),
      bookingDate: dispDate(oldBooked.getFullYear(), oldBooked.getMonth() + 1, oldBooked.getDate()),
      cancelledAt: fmtDateTime(new Date(spec.y, spec.m - 1, spec.oldDay - 1, 10, 0, 0)),
      cancellationReason: 'Astrologer unavailable — rescheduled',
      rescheduledTo: newId,
      rescheduleNote: 'Rescheduled to a new slot with the same astrologer',
    })

    pairs.push({
      id: newId,
      userId: customer.userId,
      astrologerId: ASTROLOGER_ID,
      astrologer: ASTROLOGER_NAME,
      type: call.type,
      callType: call.callType,
      customerName: customer.name,
      customerPhone: customer.phone,
      orderId: `#AH${MONTHS[spec.m - 1]}${spec.y}-RS-N`,
      amount: call.price,
      duration: call.fmt,
      date: dispDate(spec.y, spec.m, spec.newDay),
      dateIso: iso(spec.y, spec.m, spec.newDay),
      time: fmtHM(newStartH, newStartM),
      start: fmt24(newStartH, newStartM),
      end: fmt24(newEnd.h, newEnd.m),
      language: customer.lang,
      topic: customer.topic,
      status: 'Booked',
      paymentStatus: 'Paid',
      paymentMethod: 'Wallet',
      transactionId: `TXN-RS-${spec.m}-${spec.newDay}`,
      bookedAt: fmtDateTime(newBooked),
      bookingDate: dispDate(newBooked.getFullYear(), newBooked.getMonth() + 1, newBooked.getDate()),
      rescheduledFrom: oldId,
      note: 'No second payment for this rescheduled appointment',
    })
    counter += 2
  })

  return pairs
}

const baseHistory = buildAll()
const rescheduled = buildReschedulePairs()

// ---------------------------------------------------------------------------
// Appointment customer profiles. Exported for the user-profile page so that an
// appointment's customer can be resolved even when they are not in the
// astrologer's follower/subscriber list (kept intentionally minimal — only the
// info needed to render the existing AudienceMemberProfile hero/tabs).
// ---------------------------------------------------------------------------
export const appointmentCustomers = Object.fromEntries(
  CUSTOMERS.map((c) => [
    c.userId,
    {
      id: c.userId,
      userId: c.userId,
      username: c.name.toLowerCase().replace(/\s+/g, ''),
      name: c.name,
      bio: 'Astro Connect member consulting on astrology and life guidance.',
      followerSince: 'Member since 2025',
    },
  ]),
)

// ---------------------------------------------------------------------------
// Featured appointments — explicit completed records that carry consultation
// notes, so the Consultation / call / user-profile features can be demonstrated
// immediately with known, stable examples (e.g. "Karthik — Sep 10 — notes +
// PDF"). Deterministic and linked via appointmentId.
// ---------------------------------------------------------------------------
function buildFeaturedAppointments() {
  const specs = [
    {
      userId: 'u-karthik',
      d: 2,
      m: 9,
      y: 2026,
      customerName: 'Karthik',
      phone: '+91 98111 00002',
      orderId: '#AH903',
      startH: 9,
      startM: 30,
      minutes: 40,
      price: 1199,
      type: 'Audio Call',
      callType: 'Audio',
      lang: 'Tamil',
      topic: 'Career',
      status: 'Completed',
      duration: '40 min',
      notes: 'Career direction: advised strong Saturn period until year end. Recommended staying in current role and consolidating skills; revisit a job change after the Dasha change in early 2027.',
      fileName: 'Karthik_Consultation_Notes.pdf',
      fileType: 'application/pdf',
      fileSize: '184 KB',
    },
    {
      userId: 'u-priya',
      d: 5,
      m: 8,
      y: 2026,
      customerName: 'Priya',
      phone: '+91 98111 00001',
      orderId: '#AH802',
      startH: 11,
      startM: 0,
      minutes: 30,
      price: 799,
      type: 'Audio Call',
      callType: 'Audio',
      lang: 'Telugu',
      topic: 'Marriage',
      status: 'Completed',
      duration: '30 min',
      notes: 'Marriage compatibility: strong mutual Jupiter. Suggested Mangal-dosha remedies and a favourable window in the coming festival season.',
      fileName: 'Priya_Consultation_Notes.pdf',
      fileType: 'application/pdf',
      fileSize: '152 KB',
    },
    {
      userId: 'u-sneha',
      d: 2,
      m: 9,
      y: 2026,
      customerName: 'Sneha',
      phone: '+91 98111 00011',
      orderId: '#AH902',
      startH: 16,
      startM: 30,
      minutes: 20,
      price: 499,
      type: 'Audio Call',
      callType: 'Audio',
      lang: 'Telugu',
      topic: 'Love',
      status: 'Completed',
      duration: '20 min',
      notes: 'Relationship clarity: advised patience and honest communication. Discussed Venus retrograde influences.',
      fileName: '',
      fileType: '',
      fileSize: '',
    },
    {
      userId: 'u-priya',
      d: 18,
      m: 9,
      y: 2026,
      customerName: 'Priya',
      phone: '+91 98111 00001',
      orderId: '#AH918',
      startH: 14,
      startM: 0,
      minutes: 30,
      price: 799,
      type: 'Audio Call',
      callType: 'Audio',
      lang: 'Tamil',
      topic: 'Career',
      status: 'Booked',
      duration: '30 min',
      notes: '',
      fileName: '',
      fileType: '',
      fileSize: '',
    },
  ]

  const records = []
  const consultations = []

  specs.forEach((spec) => {
    counter += 1
    const id = `apt-h-f-${counter}`
    const end = addMin(spec.startH, spec.startM, spec.minutes)
    const booked = new Date(spec.y, spec.m - 1, spec.d - 3, 12, 0, 0)
    records.push({
      id,
      userId: spec.userId,
      astrologerId: ASTROLOGER_ID,
      astrologer: ASTROLOGER_NAME,
      type: spec.type,
      callType: spec.callType,
      customerName: spec.customerName,
      customerPhone: spec.phone,
      orderId: spec.orderId,
      amount: spec.price,
      duration: spec.duration,
      date: dispDate(spec.y, spec.m, spec.d),
      dateIso: iso(spec.y, spec.m, spec.d),
      time: fmtHM(spec.startH, spec.startM),
      start: fmt24(spec.startH, spec.startM),
      end: fmt24(end.h, end.m),
      language: spec.lang,
      topic: spec.topic,
      status: spec.status,
      paymentStatus: 'Paid',
      paymentMethod: 'Wallet',
      transactionId: `TXN-F-${counter}`,
      bookedAt: fmtDateTime(booked),
      bookingDate: dispDate(booked.getFullYear(), booked.getMonth() + 1, booked.getDate()),
      horoscope: makeHoroscope({ name: spec.customerName }, 'F'),
    })

    if (spec.status === 'Completed') {
      records[records.length - 1] = {
        ...records[records.length - 1],
        preCallAnalysis: `Prepared for ${spec.customerName}'s ${spec.topic.toLowerCase()} consultation. Key houses and current Dasha noted for review during the call.`,
        privateNotes: `Keep the conversation focused on ${spec.topic.toLowerCase()}. The user responds well to confident, structured guidance.`,
        callDurationSeconds: spec.duration === '40 min' ? 40 * 60 - 117 : spec.duration === '30 min' ? 30 * 60 - 64 : 20 * 60 - 38,
        completedAt: fmtDateTime(new Date(spec.y, spec.m - 1, spec.d, spec.startH, spec.startM + 5, 0)),
      }
      consultations.push({
        id: `cons-${id}`,
        appointmentId: id,
        astrologerId: ASTROLOGER_ID,
        userId: spec.userId,
        customerName: spec.customerName,
        notes: spec.notes,
        fileName: spec.fileName,
        fileType: spec.fileType,
        fileSize: spec.fileSize,
        sent: true,
        sentAt: fmtDateTime(new Date(spec.y, spec.m - 1, spec.d, 12, 30, 0)),
      })
    }
  })

  return { records, consultations }
}

const featured = buildFeaturedAppointments()

// Deterministically enrich history records with the appointment-level features
// that power the astrologer pre-call workflow: horoscope attachment, pre-call
// analysis, private call notes and call duration. Booked/upcoming appointments
// get a horoscope + pre-call prep; Completed ones additionally get private notes
// and a recorded call duration. Enough Booked records get full attachments so
// the complete Audio Call flow can be demoted without tying it to any one user.
function decorateHistory(records, start = 0) {
  let n = start
  return records.map((record) => {
    n += 1
    const customer = { name: record.customerName || record.customer || 'Customer' }
    const customerObj = CUSTOMERS.find((c) => c.userId === record.userId) || { name: customer.name, userId: null }
    const decorated = { ...record }

    const hasHoroscope = rnd() < 0.6
    const isCompleted = record.status === 'Completed'

    if (hasHoroscope || isCompleted) {
      decorated.horoscope = makeHoroscope(customerObj, n)
    }
    if (isCompleted) {
      decorated.preCallAnalysis = `Reviewed ${customer.name}'s chart. Focus on ${(record.topic || 'general guidance').toLowerCase()} during the session.`
      decorated.privateNotes = `Quick call notes for ${customer.name}: engage warmly, offer concrete remedies.`
      decorated.callDurationSeconds = Math.floor((14 + n % 27) * 60)
      decorated.completedAt = decorated.completedAt || fmtDateTime(new Date(2026, 8, 4, 13, 0, 0))
    } else if (record.status === 'Booked' && rnd() < 0.3) {
      decorated.preCallAnalysis = ''
      decorated.privateNotes = ''
    }
    return decorated
  })
}

const decoratedBase = decorateHistory(baseHistory)
const decoratedRescheduled = decorateHistory(rescheduled, baseHistory.length)

// Guarantee the demo "Start Call" appointment (#AH918, Priya, 18 Sep 2026,
// Booked Audio) always ships with a horoscope attachment so the full
// astrologer-side flow (Appointment Details → View, Call → More → Horoscope)
// can be demoed and tested. Stored per appointment, never on the astrologer.
const PRIMARY_DEMO_HOROSCOPE_ORDER = '#AH918'
export const mockAppointmentHistory = [
  ...decoratedBase,
  ...decoratedRescheduled,
  ...featured.records,
].map((record) =>
  record.orderId === PRIMARY_DEMO_HOROSCOPE_ORDER && !record.horoscope
    ? {
        ...record,
        horoscope: makeHoroscope(
          { name: record.customerName || 'Priya' },
          'DEMO',
        ),
      }
    : record,
)

// Consultation records ready to demo immediately, linked to real appointment
// IDs. Deterministic and structured for later backend storage.
export const mockConsultations = featured.consultations

export const mockAppointmentHistoryCounts = {
  months: 'Aug 2025 – Jan 2027',
  records: mockAppointmentHistory.length,
}


