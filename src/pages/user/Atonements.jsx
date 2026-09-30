import { useMemo, useState } from 'react'
import { Compass, Sparkles } from 'lucide-react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Section from '../../components/ui/Section.jsx'
import AtonementCard from '../../components/atonements/AtonementCard.jsx'
import useUserAtonements, { belongsToUser } from '../../state/useUserAtonements.js'
import './Atonements.css'

const SOURCE_FILTERS = [
  ['all', 'All Sources'],
  ['text', 'Text'],
  ['calls-chats', 'Calls & Chats'],
  ['appointments', 'Appointments'],
]
const SOURCE_TYPES = { text: ['question'], 'calls-chats': ['chat', 'call'], appointments: ['appointment'] }
const STATUS_FILTERS = [['all', 'All'], ['pending', 'Pending'], ['completed', 'Completed']]

export default function Atonements() {
  const { allAtonements, currentUser } = useUserAtonements()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const appointmentId = searchParams.get('appointmentId')
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')

  const records = useMemo(() => allAtonements.filter((item) => belongsToUser(item, currentUser)).filter((item) => source === 'all' || SOURCE_TYPES[source]?.includes(item.sourceType)).filter((item) => status === 'all' || item.status === status), [allAtonements, currentUser, source, status])

  const appointmentTarget = appointmentId ? allAtonements.find((a) => a.sourceId === appointmentId || a.appointmentId === appointmentId) : null
  if (appointmentTarget) return <Navigate to={`/user/atonements/${encodeURIComponent(appointmentTarget.id)}`} replace />

  return <div className="user-atonements-page atonements-page">
    <PageHeader eyebrow="User portal" title="Atonement" subtitle="Track your recommended poojas and remedies" />
    <Section>
      <Card className="atonement-filter-card">
        <div className="atonement-filter-group"><span className="field-label-top">Source</span><div className="chip-grid">{SOURCE_FILTERS.map(([key, label]) => <button type="button" className={`chip${source === key ? ' selected' : ''}`} key={key} onClick={() => setSource(key)}>{label}</button>)}</div></div>
        <div className="atonement-filter-group"><span className="field-label-top">Status</span><select className="atonement-status-select" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>{STATUS_FILTERS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      </Card>
    </Section>
    <Section title="Your atonements" icon={Sparkles}>
      {records.length ? <div className="rem-card-list">{records.map((atonement) => <AtonementCard key={atonement.id} atonement={atonement} onSelect={() => navigate(`/user/atonements/${encodeURIComponent(atonement.id)}`)} />)}</div> : <Card className="atonement-empty"><Compass size={30} /><h2>No Atonements Yet</h2><p>Atonements suggested by your astrologers will appear here after your consultations.</p></Card>}
    </Section>
  </div>
}
