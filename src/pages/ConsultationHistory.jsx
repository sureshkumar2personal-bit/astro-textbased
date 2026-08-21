import { useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, Clock3, Headphones, MessageCircle, Search, Wallet } from 'lucide-react'
import { useAppData } from '../state/AppDataContext.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'

const FILTER_TYPES = ['All', 'Chat', 'Audio Call']

function formatDate(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatAmount(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

function sessionIcon(type) {
  return type === 'Chat' ? MessageCircle : Headphones
}

export default function ConsultationHistory() {
  const { consultationHistory } = useAppData()
  const [type, setType] = useState('All')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)

  const filteredSessions = useMemo(() => {
    const term = search.trim().toLowerCase()
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : -Infinity
    const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : Infinity
    return consultationHistory
      .filter((session) => type === 'All' || session.type === type)
      .filter((session) => {
        const time = new Date(session.startedAt).getTime()
        return time >= from && time <= to
      })
      .filter((session) => !term || [session.customerName, session.customerId, session.type, session.status].join(' ').toLowerCase().includes(term))
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
  }, [consultationHistory, type, search, fromDate, toDate])

  const customers = useMemo(() => {
    const grouped = new Map()
    for (const session of filteredSessions) {
      const current = grouped.get(session.customerId) || {
        customerId: session.customerId,
        customerName: session.customerName,
        sessions: 0,
        minutes: 0,
        amount: 0,
        latest: session.startedAt,
      }
      current.sessions += 1
      current.minutes += session.durationMinutes
      current.amount += session.amount
      if (new Date(session.startedAt) > new Date(current.latest)) current.latest = session.startedAt
      grouped.set(session.customerId, current)
    }
    return [...grouped.values()].sort((a, b) => new Date(b.latest) - new Date(a.latest))
  }, [filteredSessions])

  const selectedCustomer = customers.find((customer) => customer.customerId === selectedCustomerId) || null
  const selectedSessions = selectedCustomer
    ? filteredSessions.filter((session) => session.customerId === selectedCustomer.customerId)
    : []

  return (
    <div>
      <PageHeader eyebrow="Astrologer workspace" title="Consultation History" subtitle="Review instant chat and audio call sessions with your customers." />

      <Section>
        <Card>
          <div className="consultation-history-toolbar">
            <div className="search-bar">
              <input className="text-input search-bar__input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer or session" />
              <span className="icon-btn" aria-hidden="true"><Search size={17} /></span>
            </div>
            <div className="chip-grid">
              {FILTER_TYPES.map((option) => <button key={option} type="button" className={`chip${type === option ? ' selected' : ''}`} onClick={() => setType(option)}>{option}</button>)}
            </div>
            <label className="history-date-filter"><CalendarDays size={15} /><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="From date" /><span>to</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="To date" /></label>
          </div>
        </Card>
      </Section>

      {selectedCustomer ? (
        <Section title={`${selectedCustomer.customerName}'s History`} titleRight={<button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedCustomerId(null)}><ArrowLeft size={14} /> All Customers</button>}>
          <div className="stat-grid consultation-history-stats">
            <div className="stat-card"><div className="stat-icon tone-violet"><Wallet size={19} /></div><div><div className="stat-value">{formatAmount(selectedCustomer.amount)}</div><div className="stat-label">Total Earned</div></div></div>
            <div className="stat-card"><div className="stat-icon tone-sky"><Clock3 size={19} /></div><div><div className="stat-value">{selectedCustomer.minutes} min</div><div className="stat-label">Total Duration</div></div></div>
            <div className="stat-card"><div className="stat-icon tone-gold"><MessageCircle size={19} /></div><div><div className="stat-value">{selectedCustomer.sessions}</div><div className="stat-label">Sessions</div></div></div>
          </div>
          <Card>
            <div className="activity-list">
              {selectedSessions.map((session) => {
                const Icon = sessionIcon(session.type)
                return <div className="activity-row" key={session.id}><div className="flex items-center gap-3"><div className="stat-icon tone-violet" style={{ width: 36, height: 36 }}><Icon size={17} /></div><div><div className="activity-id">{session.type}</div><div className="activity-meta">{formatDate(session.startedAt)} · {session.status}</div></div></div><div className="text-right"><div className="font-semibold text-[color:var(--text-primary)]">{formatAmount(session.amount)}</div><div className="activity-meta">{session.durationMinutes} min · {formatAmount(session.pricePerMinute)}/min</div></div></div>
              })}
            </div>
          </Card>
        </Section>
      ) : (
        <Section title="Customers" titleRight={<span className="muted">{customers.length} customer{customers.length === 1 ? '' : 's'}</span>}>
          <Card>
            <div className="activity-list">
              {customers.map((customer) => <button type="button" className="activity-row consultation-customer-row" key={customer.customerId} onClick={() => setSelectedCustomerId(customer.customerId)}><div><div className="activity-id">{customer.customerName}</div><div className="activity-meta">{customer.sessions} session{customer.sessions === 1 ? '' : 's'} · {customer.minutes} minutes · Last session {formatDate(customer.latest)}</div></div><div className="text-right"><div className="font-semibold text-[color:var(--text-primary)]">{formatAmount(customer.amount)}</div><div className="activity-meta">View history</div></div></button>)}
              {!customers.length && <div className="muted" style={{ padding: 20, textAlign: 'center' }}>No consultation history matches your filters.</div>}
            </div>
          </Card>
        </Section>
      )}
    </div>
  )
}
