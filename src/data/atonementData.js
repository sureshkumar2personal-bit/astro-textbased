import { createAtonementRecord } from '../utils/atonements.js'

const day = (dayName, date, completed = false) => ({
  day: dayName,
  date,
  hour: '07:30',
  place: 'Temple',
  god: 'Lord Ganesha',
  things: 'Flowers, turmeric, and a small lamp',
  poojas: 'Light the lamp and perform the Ganapati pooja with a calm intention.',
  extraNotes: 'User-reported completion tracking.',
  completed,
})

export const initialAtonements = [
  createAtonementRecord({ id: 'ATN-001', userId: 'user-demo', astrologerId: 'astrologer-demo', astrologerName: 'Dr. Rani', sourceType: 'question', sourceId: 'QTN-2026-000123', sourceLabel: 'Question QTN-2026-000123', summary: 'A one-day Ganapati pooja for clarity and steady progress.', days: [day('Wednesday', '2026-09-16')] }),
  createAtonementRecord({ id: 'ATN-002', userId: 'user-demo', astrologerId: 'astrologer-demo', astrologerName: 'Dr. Rani', sourceType: 'chat', sourceId: 'consult-chat-user-004', sourceLabel: 'Chat consultation', summary: 'Five-day Ganapati pooja for career confidence.', days: [day('Wednesday', '2026-09-16', true), day('Thursday', '2026-09-17', true), day('Friday', '2026-09-18'), day('Saturday', '2026-09-19'), day('Sunday', '2026-09-20')] }),
  createAtonementRecord({ id: 'ATN-003', userId: 'user-demo', astrologerId: 'astrologer-demo', astrologerName: 'Dr. Rani', sourceType: 'call', sourceId: 'consult-audio-user-004', sourceLabel: 'Audio call consultation', summary: 'Three-day lamp offering for calm decision-making.', days: [day('Monday', '2026-09-14', true), day('Tuesday', '2026-09-15', true), day('Wednesday', '2026-09-16', true)] }),
  createAtonementRecord({ id: 'ATN-004', userId: 'user-demo', astrologerId: 'astrologer-demo', astrologerName: 'Dr. Rani', sourceType: 'appointment', sourceId: 'apt-1001', sourceLabel: 'Appointment consultation', summary: 'Seven-day Shiva abhishekam and prayer routine.', days: Array.from({ length: 7 }, (_, index) => day(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index], `2026-09-${String(10 + index).padStart(2, '0')}`, index === 0)) }),
]

