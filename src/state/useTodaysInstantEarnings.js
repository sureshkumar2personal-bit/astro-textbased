import { useEffect, useState } from 'react'
import { getInstantConsultations, subscribeToInstantConsultations } from '../utils/instantConsultation.js'
import { todaysInstantEarnings } from '../utils/instantCallConsole.js'

/** Earnings from instant calls/chats this astrologer completed today; updates the moment a call is saved. */
export default function useTodaysInstantEarnings(astrologerId) {
  const [sessions, setSessions] = useState(() => getInstantConsultations())
  useEffect(() => subscribeToInstantConsultations(setSessions), [])
  return todaysInstantEarnings(sessions, astrologerId)
}
