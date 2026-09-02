import { ArrowLeft, MessageCircle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { mockAstrologers } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

const dateLabel = (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const timeLabel = (value) => new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

export default function ChatDetails() {
  const { currentUser } = useAuth()
  const { consultationHistory } = useAppData()
  const [params] = useSearchParams()
  const routes = getRoleRoutes(currentUser?.role)
  const item = consultationHistory.find((entry) => entry.id === params.get('id') && entry.type === 'Chat')
  const astrologer = mockAstrologers.find((entry) => entry.id === item?.astrologerId)

  if (!item) return <div className="chat-details-page"><Link to={routes.myAccount || '/user/my-account'} className="btn btn-outline"><ArrowLeft size={15} /> Back to Chat History</Link><PageHeader title="Chat not found" subtitle="This consultation is no longer available." /></div>

  return <div className="chat-details-page">
    <Link to={`${routes.myAccount || '/user/my-account'}?section=consultation&tab=chat`} className="btn btn-outline chat-details-back"><ArrowLeft size={15} /> Back to Chat History</Link>
    <PageHeader eyebrow="Consultation details" title="Chat History" subtitle={`Your conversation with ${astrologer?.name || 'Astrologer'}.`} />
    <Card className="chat-details-card">
      <div className="chat-details-heading"><div><h2>{astrologer?.name || 'Astrologer'}</h2><p><MessageCircle size={15} /> Chat consultation</p></div><StatusBadge label={item.status} /></div>
      <div className="chat-details-meta"><span><b>Date</b>{dateLabel(item.startedAt)}</span><span><b>Time</b>{timeLabel(item.startedAt)}</span><span><b>Duration / Package</b>{item.durationMinutes} min</span></div>
      <div className="chat-details-conversation">{(item.messages || []).map((message) => <div key={message.id} className={`chat-details-message chat-details-message--${message.sender}`}><p>{message.text}</p><time>{timeLabel(message.sentAt)}</time></div>)}</div>
    </Card>
  </div>
}
