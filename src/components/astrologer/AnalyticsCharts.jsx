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

const COLORS = { call: '#18bf8a', chat: '#17b5d1', text: '#f5a10b', atonement: '#a348eb' }

export function ServicesDonut({ segments }) {
  const [hover, setHover] = useState(null)
  const total = segments.reduce((sum, segment) => sum + segment.count, 0)
  let cursor = 0
  const arcs = segments.map((segment) => {
    const from = cursor
    cursor += total ? (segment.count / total) * 360 : 0
    return { ...segment, from, to: cursor }
  })
  const stops = total ? arcs.filter((arc) => arc.to > arc.from).map((arc) => `${COLORS[arc.key]} ${arc.from}deg ${arc.to}deg`).join(', ') : '#283249 0deg 360deg'
  const hovered = hover && arcs.find((arc) => arc.key === hover.key)

  const onMove = (event) => {
    if (!total) return
    const rect = event.currentTarget.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    const radius = Math.hypot(dx, dy)
    const outer = rect.width / 2
    if (radius > outer || radius < outer * 0.5) { setHover(null); return }
    const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360
    const arc = arcs.find((item) => item.count > 0 && angle >= item.from && angle < item.to) || arcs.filter((item) => item.count > 0).at(-1)
    setHover({ key: arc.key, x: event.clientX - rect.left, y: event.clientY - rect.top, flip: dx > 0 })
  }

  return (
    <div className="astrologer-donut" role="img" aria-label="Consultation services mix chart" style={{ background: `conic-gradient(${stops})` }} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
      <span />
      {hovered && <i className="donut-highlight" style={{ background: `conic-gradient(transparent 0deg ${hovered.from}deg, ${COLORS[hovered.key]} ${hovered.from}deg ${hovered.to}deg, transparent ${hovered.to}deg 360deg)` }} />}
      {hovered && (
        <div className={`chart-tooltip chart-tooltip--donut${hover.flip ? ' is-flip' : ''}`} style={{ left: hover.x, top: hover.y }} role="status">
          <strong><i style={{ background: COLORS[hovered.key] }} />{hovered.label}</strong>
          <div>Consultations <b>{hovered.count}</b></div>
          <div>Share <b>{formatPercent(hovered.percent)}</b></div>
        </div>
      )}
    </div>
  )
}
