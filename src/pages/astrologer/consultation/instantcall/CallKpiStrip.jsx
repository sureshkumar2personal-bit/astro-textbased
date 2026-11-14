import { IndianRupee, PencilLine, PhoneCall, Timer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatRupees } from '../../../../utils/instantCallConsole.js'

// The pencil opens the existing Pricing tab at the Call Rate field; the rate is edited there, not on this card.
const CALL_RATE_PRICING_PATH = '/astrologer/consultation/pricing#call-rate'

function RateCard({ rate }) {
  const navigate = useNavigate()
  return (
    <article className="icc-kpi">
      <span className="icc-kpi__icon"><IndianRupee size={18} /></span>
      <div className="icc-kpi__body">
        <small>Call Rate</small>
        <strong>{formatRupees(rate)} <em>/ min</em></strong>
      </div>
      <button type="button" className="icc-icon-btn" aria-label="Edit call rate" title="Edit call rate" onClick={() => navigate(CALL_RATE_PRICING_PATH)}><PencilLine size={14} /></button>
    </article>
  )
}

export default function CallKpiStrip({ rate, stats }) {
  return (
    <section className="icc-kpis" aria-label="Instant call summary">
      <RateCard rate={rate} />
      <article className="icc-kpi">
        <span className="icc-kpi__icon"><PhoneCall size={18} /></span>
        <div className="icc-kpi__body">
          <small>Today&apos;s Calls</small>
          <strong>{stats.count} {stats.count === 1 ? 'Call' : 'Calls'} <em>• {stats.minutes} {stats.minutes === 1 ? 'min' : 'mins'}</em></strong>
        </div>
      </article>
      <article className="icc-kpi">
        <span className="icc-kpi__icon"><Timer size={18} /></span>
        <div className="icc-kpi__body">
          <small>Avg. Call Duration</small>
          <strong>{stats.avgMinutes == null ? '—' : <>{stats.avgMinutes.toFixed(1)} <em>mins</em></>}</strong>
        </div>
      </article>
    </section>
  )
}
