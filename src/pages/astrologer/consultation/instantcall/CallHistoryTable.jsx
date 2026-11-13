import { Download, NotebookText, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppData } from '../../../../state/AppDataContext.jsx'
import { getSavedRate } from '../../../../utils/consultationPricing.js'
import { buildHistoryCsv, filterHistoryRows, formatRupees, historyRows } from '../../../../utils/instantCallConsole.js'
import CallDetailsModal from './CallDetailsModal.jsx'

const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
const formatTime = (value) => new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
const STATUS_FILTERS = ['All', 'Completed', 'Missed', 'Declined']

function downloadCsv(rows) {
  const blob = new Blob([`﻿${buildHistoryCsv(rows)}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `instant-call-history-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function CallHistoryTable({ sessions, astrologerId }) {
  const { astrologerServices } = useAppData()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [detailId, setDetailId] = useState(null)

  const fallbackRate = getSavedRate(astrologerId, 'call') ?? astrologerServices.callPricePerMinute
  const all = useMemo(() => historyRows(sessions, astrologerId, fallbackRate), [sessions, astrologerId, fallbackRate])
  const rows = useMemo(() => filterHistoryRows(all, { query, status }), [all, query, status])
  const detailRow = all.find((row) => row.item.id === detailId) || null

  return (
    <section className="consult-card icc-history" aria-label="Instant Call History">
      <div className="icc-history__head">
        <h2 className="consult-card__title">Instant Call History</h2>
        <div className="icc-history__tools">
          <label className="icc-search">
            <Search size={14} aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by user name" aria-label="Search call history by user name" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            {STATUS_FILTERS.map((option) => <option key={option} value={option}>{option === 'All' ? 'All statuses' : option}</option>)}
          </select>
          <button type="button" className="icc-btn icc-btn--ghost" disabled={!rows.length} onClick={() => downloadCsv(rows)}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      {rows.length ? (
        <div className="consult-table-wrap">
          <table className="consult-table">
            <thead><tr><th>User</th><th>Topic</th><th>Date</th><th>Time</th><th>Duration</th><th>Amount</th><th>Status</th><th>Notes / Kundli</th></tr></thead>
            <tbody>
              {rows.map(({ item, status: rowStatus, amount, when }) => (
                <tr key={item.id}>
                  <td data-label="User"><strong>{item.userName}</strong></td>
                  <td data-label="Topic">{item.topic ? <span className="icc-topic icc-topic--sm">{item.topic}</span> : '—'}</td>
                  <td data-label="Date">{formatDate(when)}</td>
                  <td data-label="Time">{formatTime(when)}</td>
                  <td data-label="Duration">{rowStatus === 'Completed' ? `${item.durationMinutes} min` : '—'}</td>
                  <td data-label="Amount">{rowStatus === 'Completed' ? formatRupees(amount) : '—'}</td>
                  <td data-label="Status"><span className={`consult-status consult-status--${rowStatus.toLowerCase()}`}>{rowStatus}</span></td>
                  <td data-label="Notes / Kundli">
                    <button type="button" className="icc-btn icc-btn--pill" aria-label={`View notes and kundli for ${item.userName}`} onClick={() => setDetailId(item.id)}><NotebookText size={13} /> View Notes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="consult-empty">{all.length ? 'No calls match your search or filter.' : 'No call sessions yet.'}</p>
      )}

      <CallDetailsModal row={detailRow} onClose={() => setDetailId(null)} />
    </section>
  )
}
