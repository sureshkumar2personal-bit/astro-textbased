import { useEffect, useMemo, useState } from 'react'
import { Compass, Sparkles } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Section from '../../components/ui/Section.jsx'
import AtonementCard from '../../components/atonements/AtonementCard.jsx'
import AtonementDetailsPanel from '../../components/atonements/AtonementDetailsPanel.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import './Atonements.css'

const SOURCE_FILTERS = [
  ['all', 'All Sources'],
  ['text', 'Text'],
  ['calls-chats', 'Calls & Chats'],
  ['appointments', 'Appointments'],
]
const STATUS_FILTERS = [['all', 'All'], ['pending', 'Pending'], ['completed', 'Completed']]

export default function Atonements() {
  const { atonements, actions } = useAppData()
  const { currentUser } = useAuth()
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')
  const [selectedId, setSelectedId] = useState(undefined)
  const records = useMemo(() => atonements
    .filter((item) => item.userId === currentUser?.id || (currentUser?.id === 'user-demo' && item.userId === 'user-demo'))
    .filter((item) => status === 'all' || item.status === status)
    .filter((item) => source === 'all' || (source === 'text' ? item.sourceType === 'question' : source === 'calls-chats' ? ['chat', 'call'].includes(item.sourceType) : item.sourceType === 'appointment')),
  [atonements, currentUser?.id, source, status])
  const selected = selectedId === undefined ? records[0] || null : records.find((item) => item.id === selectedId) || null

  useEffect(() => {
    if (!records.length) {
      setSelectedId(null)
      return
    }
    if (selectedId === undefined || (selectedId !== null && !records.some((item) => item.id === selectedId))) setSelectedId(records[0].id)
  }, [records, selectedId])

  return <div className="user-atonements-page atonements-page">
    <PageHeader eyebrow="User portal" title="Atonement" subtitle="Track the poojas and remedies suggested by your astrologers, one day at a time." />
    <Section>
      <Card className="atonement-filter-card">
        <div className="atonement-filter-group"><span className="field-label-top">Source</span><div className="chip-grid">{SOURCE_FILTERS.map(([key, label]) => <button type="button" className={`chip${source === key ? ' selected' : ''}`} key={key} onClick={() => setSource(key)}>{label}</button>)}</div></div>
        <div className="atonement-filter-group"><span className="field-label-top">Status</span><div className="chip-grid">{STATUS_FILTERS.map(([key, label]) => <button type="button" className={`chip${status === key ? ' selected' : ''}`} key={key} onClick={() => setStatus(key)}>{label}</button>)}</div></div>
      </Card>
    </Section>
    <Section title="Your atonements" icon={Sparkles} titleRight={<span className="muted">{records.length} record{records.length === 1 ? '' : 's'}</span>}>
      {records.length ? <div className="atonement-card-list">{records.map((atonement) => <AtonementCard key={atonement.id} atonement={atonement} selected={selected?.id === atonement.id} onSelect={() => setSelectedId(atonement.id)} onToggleDay={(index, completed) => actions.updateAtonementDay(atonement.id, index, completed)} />)}</div> : <Card className="atonement-empty"><Compass size={30} /><h2>No Atonements Yet</h2><p>Atonements suggested by your astrologers will appear here after your consultations.</p></Card>}
    </Section>
    {selected && <div className="atonement-details-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null) }}><div className="atonement-details-popup"><AtonementDetailsPanel atonement={selected} onClose={() => setSelectedId(null)} onToggleDay={(index, completed) => actions.updateAtonementDay(selected.id, index, completed)} /></div></div>}
  </div>
}
