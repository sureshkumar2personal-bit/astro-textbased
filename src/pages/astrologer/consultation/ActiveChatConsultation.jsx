import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getInstantConsultation, subscribeToInstantConsultations } from '../../../utils/instantConsultation.js'
import LiveConsultationWorkspace from './LiveConsultationWorkspace.jsx'

/**
 * Dedicated page for one accepted Instant Chat: /astrologer/instant-chat/:sessionId.
 * It reads the session from the shared instant-consultation store (localStorage + shared sync), so a refresh or a
 * later visit restores the same conversation, and messages from the customer appear live.
 */
export default function ActiveChatConsultation() {
  const { sessionId } = useParams()
  const { currentUser } = useAuth()
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
  const [session, setSession] = useState(() => getInstantConsultation(sessionId))

  useEffect(() => {
    const refresh = () => setSession(getInstantConsultation(sessionId))
    refresh()
    const unsubscribe = subscribeToInstantConsultations(refresh)
    const timer = window.setInterval(refresh, 2000)
    return () => { unsubscribe(); window.clearInterval(timer) }
  }, [sessionId])

  const back = <Link className="icw-btn icw-btn--ghost" to="/astrologer"><ArrowLeft size={15} /> Back to dashboard</Link>
  if (!session || session.type !== 'chat' || (astrologerId && session.astrologerId !== astrologerId)) {
    return <section className="lcw-empty" role="alert"><p>This chat session was not found.</p>{back}</section>
  }
  if (session.status === 'ringing') {
    return <section className="lcw-empty"><p>This chat request has not been accepted yet. Accept it from the dashboard queue.</p>{back}</section>
  }
  return (
    <div className="active-chat-page">
      <p style={{ margin: '0 0 10px' }}>{back}</p>
      <LiveConsultationWorkspace key={session.id} session={session} />
    </div>
  )
}
