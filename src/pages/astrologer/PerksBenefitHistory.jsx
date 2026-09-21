import { useMemo, useState } from 'react'
import { ArrowRight, Check, Search, X } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'

const BENEFIT_USAGE_HISTORY = [
  { id: 'BEN-2026-0918-01', date: '2026-09-18', time: '10:42 AM', customer: 'Priya V.', customerId: 'cust-2', plan: 'Gold', service: 'Text Question', originalPrice: 399, discountPercent: 20, status: 'Completed', reference: 'QTN-2026-000123' },
  { id: 'BEN-2026-0919-02', date: '2026-09-19', time: '02:15 PM', customer: 'Arjun D.', customerId: 'cust-3', plan: 'Silver', service: 'Appointment', originalPrice: 499, discountPercent: 10, status: 'Completed', reference: 'APT-2026-00482' },
  { id: 'BEN-2026-0920-03', date: '2026-09-20', time: '06:20 PM', customer: 'Meena R.', customerId: 'cust-4', plan: 'Gold', service: 'Audio Call', originalPrice: 600, discountPercent: 15, status: 'Completed', reference: 'CALL-2026-00917' },
  { id: 'BEN-2026-0917-04', date: '2026-09-17', time: '11:05 AM', customer: 'Kannan S.', customerId: 'cust-5', plan: 'Platinum', service: 'Emergency Consultation', originalPrice: 899, discountPercent: 15, status: 'Completed', reference: 'EMG-2026-00118' },
  { id: 'BEN-2026-0916-05', date: '2026-09-16', time: '08:30 PM', customer: 'Devi K.', customerId: 'cust-6', plan: 'Silver', service: 'Live Session', originalPrice: 299, discountPercent: 0, status: 'Cancelled', reference: 'LIVE-2026-00331' },
  { id: 'BEN-2026-0915-06', date: '2026-09-15', time: '09:10 AM', customer: 'Rajesh Kumar', customerId: 'cust-7', plan: 'Gold', service: 'Content Access', originalPrice: 199, discountPercent: 20, status: 'Completed', reference: 'CNT-2026-00098' },
]

const SERVICE_OPTIONS = ['Text Question', 'Audio Call', 'Appointment', 'Emergency Consultation', 'Live Session', 'Content Access']
const STATUS_OPTIONS = ['Completed', 'Cancelled', 'Refunded', 'Expired']

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function snapshot(record) {
  const discountAmount = record.originalPrice * record.discountPercent / 100
  return { ...record, discountAmount, customerPaid: record.originalPrice - discountAmount }
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusClass(status) {
  return `benefit-history-status benefit-history-status--${status.toLowerCase()}`
}

function BenefitUsageDrawer({ record, onClose }) {
  if (!record) return null
  return <div className="benefit-history-drawer-overlay" role="presentation" onClick={onClose}><aside className="benefit-history-drawer" role="dialog" aria-modal="true" aria-label="Benefit usage detail" onClick={(event) => event.stopPropagation()}><header><div><span className="perks-section-eyebrow">BENEFIT USAGE</span><h2>{record.customer}</h2><p>{record.plan} Subscriber</p></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Close detail"><X size={18} /></button></header><div className="benefit-history-drawer__section"><span className="benefit-history-detail-label">SERVICE</span><strong>{record.service}</strong><div className="benefit-history-detail-grid"><div><small>Reference</small><b>{record.reference}</b></div><div><small>Date</small><b>{formatDate(record.date)} · {record.time}</b></div></div></div><div className="benefit-history-drawer__section"><span className="benefit-history-detail-label">PRICE BREAKDOWN</span><div className="benefit-history-breakdown"><div><span>Original Price</span><strong>{money(record.originalPrice)}</strong></div><div><span>Subscriber Benefit</span><strong>{record.plan} · {record.discountPercent}% OFF</strong></div><div><span>Discount</span><strong>{money(record.discountAmount)}</strong></div><div className="is-total"><span>Customer Paid</span><strong>{money(record.customerPaid)}</strong></div></div></div><div className="benefit-history-drawer__section benefit-history-drawer__status"><span className="benefit-history-detail-label">STATUS</span><span className={statusClass(record.status)}><Check size={13} /> {record.status}</span></div><div className="benefit-history-drawer__saved"><span>CUSTOMER SAVED</span><strong>{money(record.discountAmount)}</strong></div></aside></div>
}

export default function PerksBenefitHistory({ tierConfigs, onManageBenefits }) {
  const [search, setSearch] = useState('')
  const [service, setService] = useState('all')
  const [plan, setPlan] = useState('all')
  const [status, setStatus] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selected, setSelected] = useState(null)
  const records = useMemo(() => BENEFIT_USAGE_HISTORY.map(snapshot), [])

  const filteredRecords = useMemo(() => {
    const now = new Date('2026-09-21T23:59:59')
    const start = dateRange === 'today' ? '2026-09-21' : dateRange === '7' ? '2026-09-15' : dateRange === '30' ? '2026-08-23' : dateRange === 'month' ? '2026-09-01' : customStart
    const end = dateRange === 'custom' ? customEnd : dateRange === 'all' ? '' : '2026-09-21'
    const term = search.trim().toLowerCase()
    return records.filter((record) => {
      const matchesSearch = !term || [record.customer, record.customerId, record.reference].some((value) => value.toLowerCase().includes(term))
      const matchesService = service === 'all' || record.service === service
      const matchesPlan = plan === 'all' || record.plan === plan
      const matchesStatus = status === 'all' || record.status === status
      const matchesDate = (!start || record.date >= start) && (!end || record.date <= end) && (dateRange !== 'today' || record.date === now.toISOString().slice(0, 10))
      return matchesSearch && matchesService && matchesPlan && matchesStatus && matchesDate
    })
  }, [customEnd, customStart, dateRange, plan, records, search, service, status])

  const summary = useMemo(() => records.reduce((total, record) => ({ used: total.used + 1, discounts: total.discounts + record.discountAmount, paid: total.paid + record.customerPaid }), { used: 0, discounts: 0, paid: 0 }), [records])
  const configuredPlanCount = ['Silver', 'Gold', 'Platinum'].filter((tier) => tierConfigs?.[tier]).length
  const clearFilters = () => { setSearch(''); setService('all'); setPlan('all'); setStatus('all'); setDateRange('all'); setCustomStart(''); setCustomEnd('') }

  return <div className="benefit-history-redesign"><section className="benefit-history-overview"><div className="benefit-history-overview__heading"><div><span className="perks-section-eyebrow">BENEFIT ACTIVITY OVERVIEW</span><h2>Subscriber value delivered</h2><p>Recorded activity from benefits configured in Benefit Management.</p></div><button type="button" className="btn btn-outline" onClick={onManageBenefits}>Manage Benefits <ArrowRight size={15} /></button></div><div className="benefit-history-metrics"><Card><span>TOTAL BENEFITS USED</span><strong>{summary.used}</strong><small>Recorded transactions</small></Card><Card><span>TOTAL DISCOUNTS GIVEN</span><strong>{money(summary.discounts)}</strong><small>Subscriber savings</small></Card><Card><span>CUSTOMER SAVINGS</span><strong>{money(summary.discounts)}</strong><small>Value delivered</small></Card><Card><span>ACTIVE SUBSCRIBERS</span><strong>81</strong><small>{configuredPlanCount} plans configured</small></Card></div></section><div className="benefit-history-info"><Check size={16} /><span>History shows completed and recorded subscriber benefit usage. Discounts are calculated from the benefit rules configured in Benefit Management.</span></div><section className="benefit-history-section"><div className="benefit-history-section__heading"><div><span className="perks-section-eyebrow">BENEFIT USAGE HISTORY</span><h1>Recorded subscriber activity</h1><p>Review how subscribers have used your benefits.</p></div></div><div className="benefit-history-filters"><label className="benefit-history-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer..." aria-label="Search customer" /></label><select value={service} onChange={(event) => setService(event.target.value)} aria-label="Filter by service"><option value="all">All Services</option>{SERVICE_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select><select value={plan} onChange={(event) => setPlan(event.target.value)} aria-label="Filter by plan"><option value="all">All Plans</option>{['Silver', 'Gold', 'Platinum'].map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option value="all">All Statuses</option>{STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select><select value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Filter by date"><option value="all">Date Range</option><option value="today">Today</option><option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="month">This Month</option><option value="custom">Custom Range</option></select></div>{dateRange === 'custom' && <div className="benefit-history-custom-dates"><label>From <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label><label>To <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label></div>}{filteredRecords.length ? <div className="benefit-history-table-wrap"><table className="benefit-history-table"><thead><tr><th>Date</th><th>Customer</th><th>Subscription</th><th>Service</th><th>Original Price</th><th>Discount</th><th>Customer Paid</th><th>Status</th></tr></thead><tbody>{filteredRecords.map((record) => <tr key={record.id} onClick={() => setSelected(record)} tabIndex="0" onKeyDown={(event) => event.key === 'Enter' && setSelected(record)}><td><strong>{formatDate(record.date)}</strong><small>{record.time}</small></td><td><strong>{record.customer}</strong><small>{record.reference}</small></td><td><span className={`benefit-history-plan benefit-history-plan--${record.plan.toLowerCase()}`}>{record.plan}</span></td><td>{record.service}</td><td>{money(record.originalPrice)}</td><td><strong>{record.discountPercent}% OFF</strong><small>{money(record.discountAmount)} saved</small></td><td><strong>{money(record.customerPaid)}</strong></td><td><span className={statusClass(record.status)}>{record.status}</span></td></tr>)}</tbody></table></div> : <Card className="benefit-history-empty"><Search size={22} /><strong>No benefit usage matches your current filters.</strong><button type="button" className="btn btn-outline" onClick={clearFilters}>Clear Filters</button></Card>}</section><BenefitUsageDrawer record={selected} onClose={() => setSelected(null)} /></div>
}
