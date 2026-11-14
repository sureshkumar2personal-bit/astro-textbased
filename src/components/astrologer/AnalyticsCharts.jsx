import { useState } from 'react'
import { buildRevenueAxis, formatPercent, formatRupees } from '../../utils/dashboardAnalytics.js'

const W = 700
const BASE = 220
const TOP = 8

/** Smooth line through the points, in the same 700×230 viewBox the original chart used. */
function smoothPath(points) {
  if (!points.length) return ''
  return points.reduce((path, [x, y], index) => {
    if (!index) return `M${x} ${y}`
    const [px, py] = points[index - 1]
    const mid = (x - px) / 2
    return `${path} C${px + mid} ${py} ${x - mid} ${y} ${x} ${y}`
  }, '')
}

export function WeeklyTrendChart({ days }) {
  const [active, setActive] = useState(null)
  const axis = buildRevenueAxis(days.map((day) => day.revenue))
  const points = days.map((day, index) => [(index / (days.length - 1)) * W, BASE - ((day.revenue - axis.min) / (axis.max - axis.min)) * (BASE - TOP)])
  const line = smoothPath(points)
  const activePoint = active === null ? null : points[active]
  const leftPct = activePoint ? (activePoint[0] / W) * 100 : 0
  const topPct = activePoint ? (activePoint[1] / 230) * 100 : 0
  // The svg is inset 18px from the bottom (room for the day labels), so position by its own height.
  const topCss = `calc((100% - 18px) * ${activePoint ? activePoint[1] / 230 : 0})`
  const day = active === null ? null : days[active]

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    setActive(Math.round(ratio * (days.length - 1)))
  }

  return (
    <div className="astrologer-trend-chart">
      <div className="astrologer-chart-y-axis">{axis.ticks.map((tick) => <span key={tick}>{tick.toLocaleString('en-IN')}</span>)}</div>
      <div className="astrologer-chart-plot" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setActive(null)}>
        <svg viewBox="0 0 700 230" preserveAspectRatio="none" role="img" aria-label="Weekly revenue trend">
          <path className="trend-area" d={`${line} L${W} ${BASE} L0 ${BASE} Z`} />
          <path className="trend-line" d={line} />
        </svg>
        {activePoint && (
          <>
            <i className="trend-guide" style={{ left: `${leftPct}%` }} />
            <i className="trend-dot" style={{ left: `${leftPct}%`, top: topCss }} />
            <div className={`chart-tooltip${active >= days.length - 2 ? ' is-left' : active <= 1 ? ' is-right' : ''}${topPct < 35 ? ' is-below' : ''}`} style={{ left: `${leftPct}%`, top: topCss }} role="status">
              <strong>{day.dayName}, {day.dateLabel}</strong>
              <div>Revenue <b>{formatRupees(day.revenue)}</b></div>
              <div>Sessions <b>{day.sessions}</b></div>
            </div>
          </>
        )}
        <div className="astrologer-chart-x-axis">{days.map((item) => <span key={item.dateLabel} className={active !== null && days[active] === item ? 'is-active' : ''}>{item.short}</span>)}</div>
      </div>
    </div>
  )
}

const COLORS = { call: '#36AFA0', chat: '#399DB8', text: '#D99A38', atonement: '#9871C7' }

const RING_R = 80
const RING_W = 12
const CIRC = 2 * Math.PI * RING_R
const GAP = 14 // visible space between segments (the round caps use RING_W of it)

/** Thin minimal donut: rounded segments, "Total Services" in the centre, compact legend underneath. */
export function ServicesDonut({ segments }) {
  const [hover, setHover] = useState(null)
  const [selected, setSelected] = useState(null) // key of the clicked segment; clicking it again clears it
  const total = segments.reduce((sum, segment) => sum + segment.count, 0)
  const visible = segments.filter((segment) => segment.count > 0)
  let cursor = 0
  const arcs = visible.map((segment) => {
    const share = segment.count / total
    const start = cursor
    cursor += share
    const length = visible.length === 1 ? CIRC : Math.max(0.5, share * CIRC - GAP - RING_W)
    return { ...segment, length, offset: -(start * CIRC + (visible.length === 1 ? 0 : (GAP + RING_W) / 2)) }
  })
  const focusKey = hover?.key ?? selected
  const hovered = hover && arcs.find((arc) => arc.key === hover.key)

  const track = (event, key) => {
    const rect = event.currentTarget.ownerSVGElement.parentElement.getBoundingClientRect()
    setHover({ key, x: event.clientX - rect.left, y: event.clientY - rect.top })
  }
  const toggle = (key) => setSelected((current) => (current === key ? null : key))

  return (
    <div className="services-donut">
      <div className="services-donut__chart">
        <svg viewBox="0 0 200 200" role="img" aria-label="Consultation services mix chart">
          <circle cx="100" cy="100" r={RING_R} className="services-donut__track" strokeWidth={RING_W} />
          <g transform="rotate(-90 100 100)">
            {arcs.map((arc) => {
              const active = focusKey === arc.key
              return (
                <circle
                  key={arc.key}
                  cx="100" cy="100" r={RING_R} fill="none" stroke={COLORS[arc.key]}
                  strokeWidth={active ? RING_W + 3 : RING_W}
                  strokeLinecap={arcs.length === 1 ? 'butt' : 'round'}
                  strokeDasharray={`${arc.length} ${CIRC}`} strokeDashoffset={arc.offset}
                  className={`services-donut__arc${active ? ' is-active' : ''}${focusKey && !active ? ' is-dim' : ''}`}
                  tabIndex={0} role="button" aria-pressed={selected === arc.key} aria-label={`${arc.label}: ${formatPercent(arc.percent)}`}
                  onPointerEnter={(event) => track(event, arc.key)} onPointerMove={(event) => track(event, arc.key)} onPointerLeave={() => setHover(null)}
                  onClick={() => toggle(arc.key)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(arc.key) } }}
                />
              )
            })}
          </g>
          <text x="100" y="94" textAnchor="middle" className="services-donut__label">Total Services</text>
          <text x="100" y="124" textAnchor="middle" className="services-donut__total">{total}</text>
        </svg>
        {hovered && <div className="services-donut__tip" style={{ left: hover.x, top: hover.y }} role="status"><i style={{ background: COLORS[hovered.key] }} />{hovered.label} <b>{formatPercent(hovered.percent)}</b></div>}
      </div>
      <ul className="services-donut__legend">
        {segments.map((segment) => (
          <li key={segment.key} className={focusKey && focusKey !== segment.key ? 'is-dim' : ''}><i style={{ background: COLORS[segment.key] }} />{segment.label}</li>
        ))}
      </ul>
    </div>
  )
}
