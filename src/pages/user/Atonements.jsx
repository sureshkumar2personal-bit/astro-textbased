import { useEffect, useMemo, useState } from 'react'
import { Compass, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Section from '../../components/ui/Section.jsx'
import AtonementCard from '../../components/atonements/AtonementCard.jsx'
import AtonementDetailsPanel from '../../components/atonements/AtonementDetailsPanel.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { createAtonementRecord, normalizeAtonement } from '../../utils/atonements.js'
import './Atonements.css'

const SOURCE_FILTERS = [
  ['all', 'All Sources'],
  ['text', 'Text'],
  ['calls-chats', 'Calls & Chats'],
  ['appointments', 'Appointments'],
]
const STATUS_FILTERS = [['all', 'All'], ['pending', 'Pending'], ['completed', 'Completed']]

export default function Atonements() {
  const { atonements, consultations, actions } = useAppData()
  const { currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const appointmentId = searchParams.get('appointmentId')
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')
  const [selectedId, setSelectedId] = useState(undefined)

  const virtualAtonements = useMemo(() => {
    if (!currentUser?.id) return []
    return consultations
      .filter((c) => c.sent && c.atonement && (c.userId === currentUser.id || (currentUser.id === 'user-demo' && c.userId && c.userId.startsWith('u-')) || c.userId === 'user-demo'))
      .map((c) => {
        const at = c.atonement
        const daysCount = Number(at.completionDays) || 1
        const start = at.startAt ? new Date(at.startAt) : new Date()
        const days = Array.from({ length: daysCount }, (_, i) => {
          const d = new Date(start.getTime() + i * 86400000)
          const iso = d.toISOString().slice(0, 10)
          return {
            date: iso,
            day: `Day ${i + 1}`,
            hour: at.content?.hour || at.hour || '07:30',
            place: at.content?.place || at.place || 'Temple',
            god: at.content?.god || at.content?.deity || at.god || 'Lord Shiva',
            things: at.content?.things || at.things || '',
            poojas: at.content?.poojas || at.poojas || c.notes || '',
            extraNotes: at.content?.extraNotes || at.extraNotes || '',
            summary: at.title || c.notes || 'Pariharam',
            completed: false,
          }
        })
        try {
          return createAtonementRecord({
            id: `virt-${c.id}`,
            userId: c.userId,
            astrologerId: c.astrologerId,
            astrologerName: c.astrologerName || 'Astrologer',
            sourceType: 'appointment',
            sourceId: c.appointmentId,
            appointmentId: c.appointmentId,
            sourceLabel: `Appointment ${c.appointmentId}`,
            summary: at.title || c.notes?.slice(0, 80) || 'Call-End Pariharam',
            days,
            createdAt: c.sentAt || new Date().toISOString(),
          })
        } catch {
          return normalizeAtonement({
            id: `virt-${c.id}`,
            userId: c.userId,
            sourceType: 'appointment',
            sourceId: c.appointmentId,
            summary: at.title || 'Pariharam',
            days,
          })
        }
      })
  }, [consultations, currentUser?.id])

  const allAtonements = useMemo(() => {
    const map = new Map()
    atonements.forEach((a) => map.set(a.id, a))
    virtualAtonements.forEach((v) => {
      const exists = [...map.values()].some((a) => (a.sourceId === v.sourceId || a.appointmentId === v.appointmentId) && a.sourceId)
      if (!exists) map.set(v.id, v)
    })
    return [...map.values()]
  }, [atonements, virtualAtonements])

  const records = useMemo(() => allAtonements
    .filter((item) => item.userId === currentUser?.id || (currentUser?.id === 'user-demo' && (item.userId === 'user-demo' || item.userId?.startsWith('u-'))) || (!item.userId && currentUser?.id))
    .filter((item) => status === 'all' || item.status === status)
    .filter((item) => source === 'all' || (source === 'text' ? item.sourceType === 'question' : source === 'calls-chats' ? ['chat', 'call'].includes(item.sourceType) : item.sourceType === 'appointment')),
  [allAtonements, currentUser?.id, source, status])

  const selected = useMemo(() => {
    if (appointmentId) {
      const direct = allAtonements.find((a) => a.sourceId === appointmentId || a.appointmentId === appointmentId)
      if (direct) return direct
      const viaRecords = records.find((a) => a.sourceId === appointmentId || a.appointmentId === appointmentId)
      if (viaRecords) return viaRecords
    }
    if (selectedId === undefined) return records[0] || null
    return records.find((item) => item.id === selectedId) || records[0] || null
  }, [appointmentId, allAtonements, records, selectedId])

  useEffect(() => {
    if (appointmentId) {
      const target = allAtonements.find((a) => a.sourceId === appointmentId || a.appointmentId === appointmentId)
      if (target && target.id !== selectedId) setSelectedId(target.id)
      return
    }
    if (!records.length) {
      setSelectedId(null)
      return
    }
    if (selectedId === undefined || (selectedId !== null && !records.some((item) => item.id === selectedId))) setSelectedId(records[0].id)
  }, [records, selectedId, appointmentId, allAtonements])

  const clearAppointmentFilter = () => {
    searchParams.delete('appointmentId')
    setSearchParams(searchParams)
    setSelectedId(undefined)
  }

  return <div className="user-atonements-page atonements-page">
    <PageHeader eyebrow="User portal" title="Atonement" subtitle="Track the poojas and remedies suggested by your astrologers, one day at a time." />
    {appointmentId && (
      <div className="atonement-context-bar">
        <Link to="/user/appointments/my" className="btn btn-ghost">← Back to Appointment</Link>
        <span className="muted">Filtered for appointment {appointmentId}</span>
        <button type="button" className="btn btn-outline btn-sm" onClick={clearAppointmentFilter}>Clear filter</button>
      </div>
    )}
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
