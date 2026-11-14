import { useMemo } from 'react'
import { SIGNS, computeChart } from '../../../../utils/vedicChart.js'

/** Rashi / Nakshatra / Lagna / Dasha pills computed from the caller's birth details. */
export default function KundliSnapshot({ details, emptyText = 'Birth details were not shared for this call.' }) {
  const chart = useMemo(() => (details ? computeChart(details) : { ok: false, reason: emptyText }), [details, emptyText])
  if (!chart.ok) return <p className="icc-muted">{chart.reason}</p>
  const moon = chart.planets.find((planet) => planet.key === 'moon')
  const pills = [
    ['Rashi', chart.panchang.janmaRashi],
    ['Nakshatra', `${moon.nakshatraName} - ${moon.pada}`],
    ['Lagna', `${SIGNS[chart.lagna.sign].sa} (${SIGNS[chart.lagna.sign].en})`],
    ...(chart.dasha ? [['Mahadasha', chart.dasha.maha.name], ['Antardasha', chart.dasha.bhukti.name]] : []),
  ]
  return <ul className="icc-pills">{pills.map(([label, value]) => <li key={label}><small>{label}</small><strong>{value}</strong></li>)}</ul>
}
