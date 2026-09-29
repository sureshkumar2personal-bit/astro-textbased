const MOCK_IMAGE = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#241052"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="720" height="420" rx="24" fill="url(#g)"/><circle cx="160" cy="130" r="74" fill="#f7d98b" opacity=".92"/><circle cx="160" cy="130" r="58" fill="#241052"/><circle cx="560" cy="290" r="112" fill="#f7d98b" opacity=".2"/><path d="M0 330 C180 250 300 420 480 310 S650 250 720 330 V420 H0Z" fill="#f7d98b" opacity=".18"/><text x="360" y="218" fill="#fff" font-family="Georgia,serif" font-size="38" text-anchor="middle">Cosmic Guidance</text><text x="360" y="260" fill="#f7d98b" font-family="Arial,sans-serif" font-size="18" text-anchor="middle">Career consultation attachment</text></svg>',
)

const sharedInstructions = [
  'Provide your birth details, rashi and nakshatra at the time of booking. Keep the required materials ready.',
  'Be present during the scheduled ritual timings and follow the instructions of the astrologer.',
  'Receive the ritual proof after completion and share feedback on the experience.',
  'Remove obstacles delaying career growth and professional progress.',
  'Perform the ritual with devotion following the traditional procedures.',
  'Light 9 sesame oil lamps with cotton wicks in the east direction during the evening for the full duration.',
]

function notesFor({ title, topic, startedDate, dueDate, summary, historyDate = startedDate } = {}) {
  const dayByDay = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startedDate)
    date.setDate(date.getDate() + index)
    return {
      dayNumber: index + 1,
      date: date.toISOString(),
      rituals: [
        { name: index === 0 ? 'Sankalpam' : 'Daily sankalpam', instructions: 'Follow the prescribed procedure for this ritual.' },
        { name: index === 0 ? 'Deepam' : 'Evening lamp ritual', instructions: 'Light 9 sesame oil lamps with cotton wicks in the east direction during the evening.' },
      ],
      materials: [
        { name: 'Sesame Oil', quantity: 250, unit: 'ml' },
        { name: 'Cotton Wick', quantity: 9, unit: 'pcs' },
      ],
    }
  })
  return {
    consultationTitle: title || `${topic || 'Career'} Guidance Pariharam`,
    notes: summary || `Your astrologer shared consultation content with you regarding ${String(topic || 'your consultation').toLowerCase()} and professional growth.`,
    validity: '7 days',
    startDate: startedDate,
    dueDate,
    instructions: sharedInstructions,
    attachments: [
      { id: 'mock-cosmic-image', name: 'cosmic.jpg', type: 'Image', url: MOCK_IMAGE },
      { id: 'mock-consultation-pdf', name: 'Appointment_Emergency_Module_Screens.pdf', type: 'PDF', url: '' },
      {
        id: 'mock-career-pariharam',
        name: title || 'Career Obstacle Pariharam',
        type: 'Saved Content',
        content: {
          title: title || 'Career Obstacle Pariharam',
          shortDescription: 'Traditional guidance for removing obstacles to career growth.',
          instructions: sharedInstructions,
          duration: '7 days',
          startAt: startedDate,
          dayByDay,
          materials: [
            { name: 'Sesame Oil', quantity: 250, unit: 'ml' },
            { name: 'Ghee', quantity: 100, unit: 'ml' },
            { name: 'Cotton Wick', quantity: 9, unit: 'pcs' },
          ],
          rituals: [
            { name: 'Sankalpam', instructions: 'State the intention of the Pariharam before beginning.' },
            { name: 'Ganesh Pooja', instructions: 'Begin with the prescribed invocation to remove obstacles.' },
            { name: 'Abhishekam', instructions: 'Complete the traditional offering as guided by the astrologer.' },
            { name: 'Evening sesame lamp ritual', instructions: 'Light 9 sesame oil lamps in the east direction.' },
            { name: 'Temple Donation', instructions: 'Offer the prescribed donation with devotion after the ritual.' },
          ],
        },
      },
    ],
    consultationHistory: [
      { title: 'Consultation', date: historyDate },
      { title: 'Initial consultation', date: historyDate },
      { title: 'Career guidance discussion', date: dueDate || historyDate },
    ],
  }
}

// Appointment-specific overrides make it easy to replace these fixtures with
// API records later without changing the user-side notes component.
export const mockAstrologerNotesByAppointmentId = {
  'apt-5': notesFor({
    title: 'Career Obstacle Pariharam',
    topic: 'career obstacles',
    startedDate: '2026-09-28T00:00:00',
    dueDate: '2026-10-05T00:00:00',
  }),
  'apt-user-demo-04': notesFor({
    title: 'Professional Progress Guidance',
    topic: 'professional growth',
    startedDate: '2026-09-28T00:00:00',
    dueDate: '2026-10-05T00:00:00',
  }),
}

export function getMockAstrologerNotes(appointment = {}) {
  const specific = mockAstrologerNotesByAppointmentId[appointment.id]
  if (specific) return specific
  const date = appointment.completedAt || appointment.dateIso || new Date().toISOString()
  const start = new Date(date)
  const due = new Date(start)
  due.setDate(due.getDate() + 7)
  return notesFor({
    title: `${appointment.topic || 'Consultation'} Guidance Pariharam`,
    topic: appointment.topic || 'your consultation',
    startedDate: start.toISOString(),
    dueDate: due.toISOString(),
  })
}

function hasItems(value) {
  return Array.isArray(value) && value.length > 0
}

export function mergeAstrologerNotes(realNotes, appointment) {
  const mock = getMockAstrologerNotes(appointment)
  if (!realNotes) return { ...mock, appointmentId: appointment.id, sent: true, sentToUser: true }
  const realAtonement = realNotes.atonement && typeof realNotes.atonement === 'object' ? realNotes.atonement : {}
  const mockAtonement = mock.atonement || {}
  const realContent = realAtonement.content && typeof realAtonement.content === 'object' ? realAtonement.content : {}
  const mockContent = mockContentFromNotes(mock)
  const realAttachments = hasItems(realNotes.attachments) ? realNotes.attachments : realNotes.fileName ? undefined : mock.attachments
  const realHistory = hasItems(realNotes.consultationHistory)
    ? realNotes.consultationHistory
    : hasItems(realNotes.history) ? realNotes.history : mock.consultationHistory
  return {
    ...mock,
    ...realNotes,
    appointmentId: realNotes.appointmentId || appointment.id,
    consultationTitle: realNotes.consultationTitle || realNotes.title || mock.consultationTitle,
    notes: realNotes.notes || realNotes.summary || mock.notes,
    validity: realNotes.validity || mock.validity,
    startDate: realNotes.startDate || mock.startDate,
    dueDate: realNotes.dueDate || mock.dueDate,
    instructions: hasItems(realNotes.instructions) ? realNotes.instructions : mock.instructions,
    attachments: realAttachments,
    consultationHistory: realHistory,
    atonement: {
      ...mockAtonement,
      ...realAtonement,
      title: realAtonement.title || realNotes.title || realNotes.consultationTitle || mock.consultationTitle,
      completionDays: realAtonement.completionDays || 7,
      startAt: realAtonement.startAt || mock.startDate,
      dueAt: realAtonement.dueAt || mock.dueDate,
      content: { ...mockContent, ...realContent },
    },
  }
}

function mockContentFromNotes(mock) {
  return {
    summary: mock.notes,
    instructions: { before: mock.instructions?.[0], during: mock.instructions?.[1], after: mock.instructions?.slice(2) },
  }
}
