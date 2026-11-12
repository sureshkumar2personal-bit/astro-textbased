import { Check, ChevronRight, Hourglass, LayoutGrid, Users, PhoneOff, Paperclip, X, Send, ShieldAlert, Smile, Sparkles, UserRound, Wallet } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  appendConsultationMessage,
  getConsultationSecondsLeft,
  getConsultationTotalMinutes,
  getInstantConsultation,
  getInstantConsultations,
  subscribeToInstantConsultations,
  updateInstantConsultation,
} from '../../../utils/instantConsultation.js'
import { SIGNS, computeChart, groupBySign, planetaryStatus } from '../../../utils/vedicChart.js'
import './liveConsultationWorkspace.css'

// Tamil labels for the South Indian charts, indexed like SIGNS (Mesha first). Sanskrit names follow the reference.
const TAMIL_SIGNS = ['மேஷம்', 'ரிஷபம்', 'மிதுனம்', 'கடகம்', 'சிம்மம்', 'கன்னி', 'துலாம்', 'விருச்சிகம்', 'தனுசு', 'மகரம்', 'கும்பம்', 'மீனம்']
const SIGN_SHORT = ['Mesha', 'Vrishabha', 'Mithuna', 'Kataka', 'Simha', 'Kanya', 'Tula', 'Vrischika', 'Dhanus', 'Makara', 'Kumbha', 'Meena']
const TAMIL_PLANETS = { sun: 'சூ', moon: 'சந்', mars: 'செ', mercury: 'பு', jupiter: 'கு', venus: 'சு', saturn: 'சனி', rahu: 'ரா', ketu: 'கே' }
// One line per cell, shortened with an ellipsis exactly like the reference ("மேஷம் (Mes…").
const cellLabel = (sign) => { const label = `${TAMIL_SIGNS[sign]} (${SIGN_SHORT[sign]})`; const chars = [...label]; return chars.length > 15 ? `${chars.slice(0, 13).join('')}…` : label }
const STATUS_CAPTION = { Exalted: 'Exalted', Debilitated: 'Debilitated', 'Own sign': 'Swakshetra' }

const EMOJIS = ['🙏', '😊', '🙂', '✨', '🌟', '🪔', '🌙', '☀️', '❤️', '👍']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// South Indian chart: signs sit in fixed cells (Meena top-left, clockwise). [row, col] per sign index.
const SIGN_CELL = {
  11: [0, 0], 0: [0, 1], 1: [0, 2], 2: [0, 3],
  3: [1, 3], 4: [2, 3],
  5: [3, 3], 6: [3, 2], 7: [3, 1], 8: [3, 0],
  9: [2, 0], 10: [1, 0],
}

// Calendar parts are formatted from the stored strings, never through Date, so the
// birth date/time cannot shift with the viewer's time zone.
function formatBirthDate(dob) {
  const [year, month, day] = String(dob || '').split('-').map(Number)
  if (!year || !month || !day) return ''
  return `${String(day).padStart(2, '0')} ${MONTHS[month - 1]} ${year}`
}

function formatBirthTime(time) {
  const [hour, minute] = String(time || '').split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return ''
  const suffix = hour >= 12 ? 'PM' : 'AM'
  return `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`
}

// Call/message instants are stored as ISO UTC and shown in the astrologer's local zone.
function formatSessionDateTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  // Zone label (e.g. IST) so the instant is unambiguous; derived from the viewer's own zone.
  const zone = new Intl.DateTimeFormat('en-IN', { timeZoneName: 'short' }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value || ''
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${formatBirthTime(`${date.getHours()}:${date.getMinutes()}`)}${zone ? ` ${zone}` : ''}`
}

const formatClock = (iso) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : formatBirthTime(`${date.getHours()}:${date.getMinutes()}`)
}

const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 || Math.floor(n / 10) === 1 ? 0 : n % 10]}`

// Dasha dates are calendar days from the birth instant; UTC getters keep them viewer-zone independent.
const formatDay = (ms) => { const d = new Date(ms); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` }
const formatMonth = (ms) => { const d = new Date(ms); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` }

const formatTimer = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

const initials = (name) => String(name || 'U').split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

function Avatar({ name, src, size = 44, round = false }) {
  return (
    <span className={`lcw-avatar${round ? ' is-round' : ''}`} style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  )
}

// "7th Lord Strong/Weak": the 7th house lord is strong when exalted, in its own sign, or in a kendra/trikona (and not debilitated).
function seventhLordNote(chart, kind) {
  const isNavamsa = kind === 'navamsa'
  const lagna = isNavamsa ? chart.lagna.navamsaSign : chart.lagna.sign
  const seventh = (lagna + 6) % 12
  const lord = chart.planets.find((planet) => !['rahu', 'ketu'].includes(planet.key) && planetaryStatus(planet.key, seventh) === 'Own sign')
  if (!lord) return '7th Lord —'
  const sign = isNavamsa ? lord.navamsaSign : lord.sign
  const status = planetaryStatus(lord.key, sign)
  const house = ((sign - lagna + 12) % 12) + 1
  const strong = status === 'Exalted' || status === 'Own sign' || (status !== 'Debilitated' && [1, 4, 5, 7, 9, 10].includes(house))
  return `7th Lord ${strong ? 'Strong' : 'Weak'}`
}

function SouthIndianChart({ chart, kind, selected, onSelect }) {
  const cells = useMemo(() => groupBySign(chart, kind), [chart, kind])
  const lagnaSign = kind === 'navamsa' ? chart.lagna.navamsaSign : chart.lagna.sign
  const isNavamsa = kind === 'navamsa'

  // Bottom caption: the planet's condition in this chart (as in the reference), else the house.
  const caption = (sign, cell) => {
    const notes = []
    cell.planets.forEach((planet) => {
      const status = STATUS_CAPTION[planetaryStatus(planet.key, sign)]
      if (status) notes.push(isNavamsa && status !== 'Swakshetra' ? `${status} in D9` : status)
      if (isNavamsa && planet.sign === planet.navamsaSign && planet.key !== 'rahu' && planet.key !== 'ketu') notes.push('Vargottama')
    })
    const unique = [...new Set(notes)]
    if (cell.lagna) return ['Lagna', ...unique].slice(0, 2)
    return unique.length ? unique.slice(0, 2) : [`${isNavamsa ? 'D9 ' : ''}${ordinal(((sign - lagnaSign + 12) % 12) + 1)} House`]
  }

  return (
    <svg className="lcw-chart" viewBox="0 0 400 400" role="img" aria-label={isNavamsa ? 'South Indian Navamsa chart' : 'South Indian Rashi chart'}>
      {Object.entries(SIGN_CELL).map(([signKey, [row, col]]) => {
        const sign = Number(signKey)
        const cell = cells[sign]
        const x = col * 100
        const y = row * 100
        const isSelected = selected?.sign === sign
        const hasExalted = cell.planets.some((planet) => planetaryStatus(planet.key, sign) === 'Exalted')
        const crowded = cell.planets.length > 3
        // A retrograde mark widens a label, so such cells stack their planets one per row.
        const hasRetro = cell.planets.some((planet) => planet.retrograde && planet.key !== 'rahu' && planet.key !== 'ketu')
        const perRow = crowded ? 3 : hasRetro || cell.planets.length <= 2 ? 1 : 2
        return (
          <g key={sign} className={`lcw-chart__cell${cell.lagna ? ' is-lagna' : ''}${hasExalted ? ' is-exalted' : ''}${isSelected ? ' is-selected' : ''}`} onClick={() => onSelect({ type: 'sign', sign })} data-sign={SIGNS[sign].sa}>
            <rect x={x} y={y} width="100" height="100" />
            <text className="lcw-chart__sign" x={x + 10} y={y + 17}>{cellLabel(sign)}<title>{`${TAMIL_SIGNS[sign]} (${SIGNS[sign].en})`}</title></text>
            {cell.lagna && <line className="lcw-chart__lagna-line" x1={x} y1={y} x2={x + 8} y2={y + 8} />}
            {cell.planets.map((planet, index) => (
              <text
                key={planet.key}
                className={`lcw-chart__planet${crowded ? ' is-small' : ''}${selected?.planet === planet.key ? ' is-selected' : ''}`}
                x={x + 7 + (index % perRow) * (crowded ? 31 : 47)}
                y={y + 48 + Math.floor(index / perRow) * (crowded ? 15 : 18)}
                onClick={(event) => { event.stopPropagation(); onSelect({ type: 'planet', sign, planet: planet.key }) }}
              >
                {TAMIL_PLANETS[planet.key]}{crowded ? '' : ` (${planet.abbr}`}
                {!crowded && planet.retrograde && planet.key !== 'rahu' && planet.key !== 'ketu' && <tspan className="lcw-chart__retro">℞</tspan>}
                {crowded ? '' : ')'}
              </text>
            ))}
            {caption(sign, cell).map((line, lineIndex, lines) => (
              <text key={line} className="lcw-chart__house" x={x + 7} y={y + 93 - (lines.length - 1 - lineIndex) * 10}>{line}</text>
            ))}
          </g>
        )
      })}
      <rect className="lcw-chart__center" x="100" y="100" width="200" height="200" />
      <rect className="lcw-chart__frame" x="1" y="1" width="398" height="398" rx="16" />
      <text className="lcw-chart__kicker" x="200" y="172" textAnchor="middle">SOUTH INDIAN CHART</text>
      <text className="lcw-chart__title" x="200" y="205" textAnchor="middle">{isNavamsa ? 'நவாம்சம் (D9)' : 'ராசி (D1)'}</text>
      <text className="lcw-chart__subtitle" x="200" y="230" textAnchor="middle">{isNavamsa ? 'Vargottama Strength' : 'Janma Lagna Chart'}</text>
      <rect className="lcw-chart__pill" x="148" y="248" width="104" height="26" rx="13" />
      <text className="lcw-chart__pilltext" x="200" y="265" textAnchor="middle">{seventhLordNote(chart, kind)}</text>
    </svg>
  )
}

// Degrees inside a sign as 14°22' (the reference format). Navamsa positions are derived from the same longitude.
const degMin = (value) => { let d = Math.floor(value); let m = Math.round((value - d) * 60); if (m === 60) { d += 1; m = 0 } return `${d}°${String(m).padStart(2, '0')}'` }
const degInChart = (longitude, kind) => (kind === 'navamsa' ? (longitude * 9) % 30 : longitude % 30)

function SelectionBar({ chart, kind, selected, action }) {
  const isNavamsa = kind === 'navamsa'
  const lagnaSign = isNavamsa ? chart.lagna.navamsaSign : chart.lagna.sign
  const signOf = (planet) => (isNavamsa ? planet.navamsaSign : planet.sign)
  const notes = (planet) => {
    const status = planetaryStatus(planet.key, signOf(planet))
    const retro = !isNavamsa && planet.retrograde && planet.key !== 'rahu' && planet.key !== 'ketu' ? 'Retrograde' : ''
    const text = [retro, status].filter(Boolean).join(', ')
    return text ? ` (${text})` : ''
  }
  const planetText = (planet) => `${TAMIL_PLANETS[planet.key]} (${planet.abbr}) ${degMin(degInChart(planet.longitude, kind))}${notes(planet)}`

  let label
  let parts
  const planet = selected?.type === 'planet' ? chart.planets.find((entry) => entry.key === selected.planet) : null
  if (planet) {
    const house = isNavamsa ? planet.navamsaHouse : planet.house
    label = `${TAMIL_PLANETS[planet.key]} (${planet.abbr}):`
    parts = [`${SIGN_SHORT[signOf(planet)]} ${degMin(degInChart(planet.longitude, kind))}${notes(planet)}`, `House ${house}`, `${planet.nakshatraName} Pada ${planet.pada}`]
  } else {
    const sign = selected?.type === 'sign' ? selected.sign : lagnaSign
    const house = ((sign - lagnaSign + 12) % 12) + 1
    const inSign = chart.planets.filter((entry) => signOf(entry) === sign)
    label = `${SIGN_SHORT[sign]} (${sign === lagnaSign ? 'Asc' : `House ${house}`}):`
    parts = [
      ...(sign === lagnaSign ? [`லக் (Asc) ${degMin(degInChart(chart.lagna.longitude, kind))}`] : []),
      ...inSign.map(planetText),
    ]
    if (!parts.length) parts = ['No planets']
  }

  return (
    <p className="lcw-selection" data-testid="selection-bar">
      <i className="lcw-dot" />
      <span><strong>{label}</strong> {parts.join(' • ')}</span>
      {action}
    </p>
  )
}

function HoroscopePanel({ session, onAskGuruji }) {
  const [view, setView] = useState('primary')
  const [kind, setKind] = useState('rashi')
  const [selected, setSelected] = useState(null)

  const primaryDetails = session.birthDetails || null
  const partnerDetails = session.birthDetails?.partner || null
  const details = view === 'partner' ? partnerDetails : primaryDetails
  const displayName = view === 'partner' ? partnerDetails?.name || 'Partner' : session.userName

  // Recomputed per selected person so primary and partner data are never mixed.
  const chart = useMemo(() => (details ? computeChart(details) : { ok: false, reason: 'Birth details were not shared for this consultation.' }), [details])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setSelected(null), [view, kind, session.id])

  const askGuruji = () => {
    if (!chart.ok) return onAskGuruji(`Please look at ${displayName}'s chart.`)
    const focus = selected?.type === 'planet' ? chart.planets.find((planet) => planet.key === selected.planet) : null
    onAskGuruji(focus
      ? `Guruji, how should we read ${focus.sa} in ${SIGNS[focus.sign].sa} (house ${focus.house}) in ${displayName}'s chart?`
      : `Guruji, please review ${displayName}'s chart: Lagna ${SIGNS[chart.lagna.sign].sa}, Moon in ${SIGNS[chart.planets[1].sign].sa}.`)
  }

  const identityLine = details
    ? [formatBirthDate(details.dob), formatBirthTime(details.time), details.place].filter(Boolean).join(' • ')
    : ''

  return (
    <section className="lcw-panel lcw-left" aria-label="User horoscope and astrology details">
      <header className="lcw-profile">
        {view === 'partner'
          ? <Avatar name={displayName} size={52} />
          : <Avatar name={displayName} src={session.userAvatar} size={52} />}
        <div className="lcw-profile__text">
          <h2>{displayName} <span className="lcw-tag" data-testid="chart-owner">{view === 'partner' ? 'Partner' : 'Primary'}</span></h2>
          <p>{identityLine || 'Birth details unavailable'}</p>
        </div>
        <button
          type="button"
          className={`lcw-partner-btn${view === 'partner' ? ' is-active' : ''}`}
          aria-pressed={view === 'partner'}
          onClick={() => setView((current) => (current === 'partner' ? 'primary' : 'partner'))}
        >
          <UserRound size={15} /> {view === 'partner' ? 'Primary Chart' : 'Partner Chart'}
        </button>
      </header>

      <div className="lcw-left__body">
      {view === 'partner' && !partnerDetails ? (
        <div className="lcw-empty" data-testid="partner-empty">Partner Information Unavailable</div>
      ) : !chart.ok ? (
        <div className="lcw-empty" data-testid="chart-error">{chart.reason}</div>
      ) : (
        <>
          <section className="lcw-card" aria-label="Janma Panchang and Rashi details">
            <div className="lcw-card__head"><h3><Sparkles size={17} /> Janma Panchang &amp; Rashi Details</h3><span className="lcw-card__note" title={`${chart.panchang.source} · ${chart.location.name}, ${chart.location.region} (${chart.location.timeZone})`}>Thirukanitha Panchang</span></div>
            <dl className="lcw-grid">
              <div><dt>Lagna (Ascendant)</dt><dd className="is-gold" data-testid="p-lagna">{SIGNS[chart.lagna.sign].sa} ({SIGNS[chart.lagna.sign].en})</dd></div>
              <div><dt>Janma Rashi</dt><dd data-testid="p-rashi">{chart.panchang.janmaRashi}</dd></div>
              <div><dt>Nakshatra / Pada</dt><dd className="is-green" data-testid="p-nakshatra">{chart.planets.find((planet) => planet.key === 'moon').nakshatraName} - {chart.planets.find((planet) => planet.key === 'moon').pada}</dd></div>
              <div><dt>Thithi</dt><dd data-testid="p-tithi">{chart.panchang.tithi}</dd></div>
              <div><dt>Yogam</dt><dd data-testid="p-yogam">{chart.panchang.yogam}</dd></div>
              <div><dt>Karanam</dt><dd data-testid="p-karanam">{chart.panchang.karanam}</dd></div>
            </dl>
          </section>

          <section className="lcw-card" aria-label="South Indian horoscope charts">
            <div className="lcw-card__head lcw-chart-head">
              <div>
                <h4><LayoutGrid size={16} /> South Indian {kind === 'navamsa' ? 'Navamsa Chart (D9)' : 'Rashi Chart (D1)'}</h4>
                <p>Tap any house or planet to inspect degrees</p>
              </div>
              <div className="lcw-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={kind === 'rashi'} className={kind === 'rashi' ? 'is-active' : ''} onClick={() => setKind('rashi')}>Rashi (D1)</button>
                <button type="button" role="tab" aria-selected={kind === 'navamsa'} className={kind === 'navamsa' ? 'is-active' : ''} onClick={() => setKind('navamsa')}>Navamsa (D9)</button>
              </div>
            </div>
            <SouthIndianChart chart={chart} kind={kind} selected={selected} onSelect={setSelected} />
            <SelectionBar chart={chart} kind={kind} selected={selected} action={<button type="button" className="lcw-guruji" onClick={askGuruji}>Ask Guruji →</button>} />
          </section>

          {chart.dasha && (
            <section className="lcw-card" aria-label="Vimshottari dasha and bhukti">
              <div className="lcw-card__head"><h3><Hourglass size={17} /> Vimshottari Dasha &amp; Bhukti</h3><span className="lcw-pill-green">Active Period</span></div>
              <div className="lcw-dasha-now" data-testid="dasha-current">
                <div className="lcw-dasha-now__top"><strong>{chart.dasha.maha.name} Maha Dasha → {chart.dasha.bhukti.name} Bhukti</strong><span>{Math.round(chart.dasha.bhukti.progress * 100)}%</span></div>
                <p>{formatDay(chart.dasha.bhukti.start)} – {formatDay(chart.dasha.bhukti.end)} • Antharam: {chart.dasha.antharam.name}</p>
                <div className="lcw-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(chart.dasha.bhukti.progress * 100)}><i style={{ width: `${Math.round(chart.dasha.bhukti.progress * 100)}%` }} /></div>
              </div>
              <h5 className="lcw-subhead">Upcoming Bhukti Sequence</h5>
              <ul className="lcw-dasha-list">
                {chart.dasha.upcoming.map((period) => <li key={period.maha + period.bhukti + period.start}><span>{period.maha} → {period.bhukti} ({period.bhuktiEn})</span><em>{formatMonth(period.start)} – {formatMonth(period.end)}</em></li>)}
              </ul>
            </section>
          )}


          <section className="lcw-card" aria-label="Dosha summary">
            <div className="lcw-card__head"><h3><ShieldAlert size={17} /> Dosha &amp; Rajayoga Summary</h3></div>
            <ul className="lcw-doshas">
              {[
                ...['mangal', 'kaalsarp'].map((key) => chart.doshas.find((dosha) => dosha.key === key)).map((dosha) => ({ ...dosha, label: dosha.key === 'kaalsarp' ? 'Kala Sarpa' : dosha.name, tone: dosha.present ? 'present' : 'none', badge: dosha.present ? 'Present' : 'No' })),
                ...chart.yogas.map((yoga) => ({ ...yoga, label: yoga.name, tone: yoga.present ? (yoga.key === 'gajakesari' ? 'gold' : 'blue') : 'none', badge: yoga.present ? (yoga.key === 'gajakesari' ? 'Active ★' : 'Active') : 'No' })),
                ...['guruchandal', 'shani'].map((key) => chart.doshas.find((dosha) => dosha.key === key)).map((dosha) => ({ ...dosha, label: dosha.key === 'shani' ? 'Sade Sati / Dhaiya' : dosha.name, tone: dosha.present ? 'present' : 'none', badge: dosha.present ? 'Present' : 'No' })),
              ].map((item) => (
                <li key={item.key} data-dosha={item.key} title={item.detail}>
                  <span>{item.label}</span>
                  <em className={`lcw-badge lcw-badge--${item.tone}`}>{item.badge}</em>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      </div>
    </section>
  )
}

const WAITING_RING_MS = 60 * 1000 // same ring window the dashboard uses for incoming calls

/** Other users with a live, unanswered request to this astrologer (oldest first). Read from the same store the dashboard queue uses. */
function useWaitingRequests(session) {
  const read = () => {
    const now = Date.now()
    const seen = new Set()
    return getInstantConsultations()
      .filter((request) => (
        request.id !== session.id
        && request.userId !== session.userId
        && request.astrologerId === session.astrologerId
        && request.status === 'ringing'
        && (request.type !== 'call' || now - new Date(request.createdAt).getTime() < WAITING_RING_MS)
      ))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .filter((request) => !seen.has(request.userId) && seen.add(request.userId)) // one entry per user
  }
  const [state, setState] = useState(() => ({ waiting: read(), now: Date.now() }))
  useEffect(() => {
    const refresh = () => setState({ waiting: read(), now: Date.now() })
    refresh()
    const unsubscribe = subscribeToInstantConsultations(refresh)
    const timer = window.setInterval(refresh, 1000) // keeps waiting times live and drops calls whose ring window ended
    return () => { unsubscribe(); window.clearInterval(timer) }
  }, [session.id, session.astrologerId, session.userId])
  return state
}

const formatWait = (ms) => { const total = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s` }

function WaitingUsers({ session }) {
  const { waiting, now } = useWaitingRequests(session)
  // Same patches the existing chat/call request handlers use (Dashboard.acceptCall/declineCall, InstantChatAstrologer).
  const respond = async (request, action) => {
    if (busy[request.id]) return
    setBusy((current) => ({ ...current, [request.id]: action }))
    setErrors((current) => ({ ...current, [request.id]: '' }))
    try {
      // Re-read the stored request so one that was already answered, cancelled or expired is never answered twice.
      const latest = getInstantConsultation(request.id)
      if (!latest || latest.status !== 'ringing') throw new Error('This request is no longer waiting.')
      const now = new Date().toISOString()
      const updated = updateInstantConsultation(request.id, action === 'accept' ? { status: 'accepted', startedAt: now } : { status: 'rejected', rejectedAt: now })
      if (!updated) throw new Error('Could not update the request. Please try again.')
    } catch (error) {
      setErrors((current) => ({ ...current, [request.id]: error?.message || 'Something went wrong. Please try again.' }))
    } finally {
      setBusy((current) => { const next = { ...current }; delete next[request.id]; return next })
    }
  }
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState({}) // requestId -> 'accept' | 'decline' while the action runs
  const [errors, setErrors] = useState({}) // requestId -> message
  const [pulse, setPulse] = useState(false)
  const [maxHeight, setMaxHeight] = useState(320)
  const [offset, setOffset] = useState(40)
  const wrapRef = useRef(null)
  const listRef = useRef(null)
  const knownRef = useRef(null)
  const ids = waiting.map((request) => request.id).join(',')

  // Pulse the banner when a user who was not waiting before joins the queue.
  useEffect(() => {
    const current = new Set(waiting.map((request) => request.id))
    const known = knownRef.current
    knownRef.current = current
    if (!known || ![...current].some((id) => !known.has(id))) return undefined
    setPulse(true)
    const timer = window.setTimeout(() => setPulse(false), 3000)
    return () => window.clearTimeout(timer)
  }, [ids])

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (event.type === 'keydown' ? event.key === 'Escape' : !wrapRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close) }
  }, [open])

  // Keep the dropdown above the suggestions/message input and inside the screen.
  useEffect(() => {
    if (!open) return undefined
    const fit = () => {
      // Open just under the whole header so the timer, pricing and End Chat stay visible.
      const wrap = wrapRef.current?.getBoundingClientRect()
      const header = wrapRef.current?.closest('.lcw-chat-header')?.getBoundingClientRect()
      const top = header?.bottom ?? wrap?.bottom ?? 0
      setOffset(Math.max(0, top - (wrap?.top ?? 0) + 6))
      const panel = wrapRef.current?.closest('.lcw-right')
      const stop = panel?.querySelector('.lcw-suggestions')?.getBoundingClientRect().top ?? window.innerHeight
      setMaxHeight(Math.max(140, Math.min(stop, window.innerHeight) - top - 22))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [open, waiting.length])

  useEffect(() => { if (!waiting.length) { setOpen(false); setShowAll(false) } }, [waiting.length])
  if (!waiting.length) return null
  const shown = waiting.slice(0, 3)
  const rows = showAll ? waiting : shown
  return (
    <div className="lcw-waiting-wrap" ref={wrapRef}>
      <button type="button" className={`lcw-waiting${pulse ? ' is-new' : ''}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((value) => !value)}>
        <Users size={26} aria-hidden="true" />
        <span className="lcw-waiting__text">{waiting.length} {waiting.length === 1 ? 'User' : 'Users'} Waiting to Connect</span>
        <span className="lcw-waiting__avatars">{shown.map((request) => <Avatar key={request.id} name={request.userName} src={request.userAvatar} size={32} round />)}</span>
        <ChevronRight size={20} aria-hidden="true" className="lcw-waiting__arrow" />
      </button>
      {open && (
        <div className="lcw-waiting-panel" style={{ maxHeight, top: offset }} role="dialog" aria-label="Waiting users">
          <header><strong>Waiting Users</strong><span>{waiting.length}</span></header>
          <ul className="lcw-waiting-list" ref={listRef}>
            {rows.map((request) => (
              <li key={request.id}>
                <div className="lcw-waiting-row">
                  <Avatar name={request.userName} src={request.userAvatar} size={34} round />
                  <span className="lcw-waiting-row__main">
                    <strong>{request.userName}</strong>
                    <small>{request.type === 'chat' ? 'Chat' : 'Call'} • Waiting {formatWait(now - new Date(request.createdAt).getTime())}</small>
                  </span>
                  <em className="lcw-waiting-status">Waiting</em>
                </div>
                <div className="lcw-waiting-actions">
                  {/* One call workspace is open at a time: a second call can be declined but only accepted after this one ends. */}
                  {(() => {
                    const callBlocked = request.type === 'call' && session.type === 'call'
                    return (
                      <button type="button" className="lcw-waiting-accept" disabled={Boolean(busy[request.id]) || callBlocked} title={callBlocked ? 'Finish the current call before accepting another call' : undefined} onClick={() => respond(request, 'accept')}>
                        <Check size={14} aria-hidden="true" /> {busy[request.id] === 'accept' ? 'Accepting…' : 'Accept'}
                      </button>
                    )
                  })()}
                  <button type="button" className="lcw-waiting-decline" disabled={Boolean(busy[request.id])} onClick={() => respond(request, 'decline')}>
                    <X size={14} aria-hidden="true" /> {busy[request.id] === 'decline' ? 'Declining…' : 'Decline'}
                  </button>
                </div>
                {errors[request.id] && <p className="lcw-waiting-error" role="alert">{errors[request.id]}</p>}
              </li>
            ))}
          </ul>
          {waiting.length > 3 && <button type="button" className="lcw-waiting-all" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show Less' : `View All (${waiting.length})`}</button>}
        </div>
      )}
    </div>
  )
}

function ChatPanel({ session, draft, setDraft, inputRef }) {
  const [remaining, setRemaining] = useState(() => getConsultationSecondsLeft(session))
  const [emojiOpen, setEmojiOpen] = useState(false)
  const listRef = useRef(null)
  const stickRef = useRef(true)
  const fileRef = useRef(null)
  const messages = session.messages || []

  useEffect(() => {
    const tick = () => setRemaining(getConsultationSecondsLeft(session))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [session])

  // Follow new messages only while the astrologer is at the bottom (or just sent one); never yank them away from older history.
  const onScroll = () => {
    const list = listRef.current
    if (list) stickRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80
  }
  const lastMessage = messages[messages.length - 1]
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    if (stickRef.current || lastMessage?.sender === 'astrologer') {
      list.scrollTop = list.scrollHeight
      stickRef.current = true
    }
  }, [messages.length, lastMessage?.sender])

  const send = (text) => {
    const value = String(text || '').trim()
    if (!value) return
    // Always read-modify-write against the latest stored session so no message is lost or crossed.
    appendConsultationMessage(session.id, 'astrologer', value)
    stickRef.current = true
    setDraft('')
    setEmojiOpen(false)
  }

  const suggestions = [['💍', 'Marriage Timing?'], ['💼', `Career Change in ${new Date().getFullYear()}?`], ['🪐', 'Guru Peyarchi Effects'], ['🪔', 'Simple Pariharam']]

  return (
    <section className="lcw-panel lcw-right" aria-label="Live consultation chat">
      <header className="lcw-chat-header">
        <div className="lcw-chat-header__top">
          <span className="lcw-chat-avatar"><Avatar name={session.userName} src={session.userAvatar} size={58} round /><i className="lcw-online" /></span>
          <div className="lcw-chat-header__who">
            <strong data-testid="chat-contact">{session.userName}</strong>
            <span className="lcw-status-pill">Online</span>
            <small>{['Connected', session.language, session.topic].filter(Boolean).join(' • ')}</small>
          </div>
          <WaitingUsers session={session} />
        </div>
        <div className="lcw-chat-header__row">
          <span className="lcw-timer" data-testid="chat-timer"><i className="lcw-online lcw-online--dot" /> Time left: <b>{formatTimer(remaining)}</b></span>
          <span className="lcw-rate" data-testid="chat-rate"><Wallet size={15} /> <b>₹{Number(session.pricePerMinute) || 0}</b> <small>/min · {getConsultationTotalMinutes(session)} min</small></span>
          <button
            type="button"
            className="lcw-end"
            onClick={() => updateInstantConsultation(session.id, { status: 'ended', endedAt: new Date().toISOString() })}
          >
            <PhoneOff size={15} /> End Chat
          </button>
        </div>
      </header>

      <div className="lcw-messages" aria-live="polite" ref={listRef} onScroll={onScroll}>
        <p className="lcw-system">
          Session {session.id.slice(0, 8).toUpperCase()} · call received {formatSessionDateTime(session.createdAt)}
          {session.startedAt ? ` · accepted ${formatSessionDateTime(session.startedAt)}` : ''}
        </p>
        {session.topic && <p className="lcw-system">Topic: {session.topic}</p>}
        {messages.map((message) => (
          <div key={message.id} className={`lcw-row lcw-row--${message.sender === 'astrologer' ? 'out' : 'in'}`}>
            {message.sender !== 'astrologer' && <Avatar name={session.userName} src={session.userAvatar} size={36} round />}
            <div className="lcw-message-wrap">
              <div className={`lcw-message lcw-message--${message.sender === 'astrologer' ? 'out' : 'in'}`}><p>{message.text}</p></div>
              <small className="lcw-time">{formatClock(message.sentAt)}{message.sender === 'astrologer' ? <span className="lcw-tick"> ✓</span> : ''}</small>
            </div>
          </div>
        ))}
        {!messages.length && <p className="lcw-system">No messages yet. Say hello to {session.userName}.</p>}
      </div>

      <div className="lcw-suggestions">
        {suggestions.map(([icon, question]) => <button key={question} type="button" onClick={() => send(question)}><span aria-hidden="true">{icon}</span> {question}</button>)}
      </div>

      <form className="lcw-composer" onSubmit={(event) => { event.preventDefault(); send(draft) }}>
        <input ref={fileRef} type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) send(`📎 ${file.name}`); event.target.value = '' }} />
        <button type="button" className="lcw-attach" aria-label="Attach file" onClick={() => fileRef.current?.click()}><Paperclip size={20} /></button>
        <div className="lcw-input">
          <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Ask about ${session.userName}'s chart…`} aria-label="Message" />
          <span className="lcw-emoji-wrap">
            <button type="button" className="lcw-icon" aria-label="Emoji" onClick={() => setEmojiOpen((open) => !open)}><Smile size={20} /></button>
            {emojiOpen && <div className="lcw-emoji-pop">{EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => setDraft((current) => `${current}${emoji}`)}>{emoji}</button>)}</div>}
          </span>
        </div>
        <button type="submit" className="lcw-send" aria-label="Send message" disabled={!draft.trim()}>Send <Send size={17} /></button>
      </form>
    </section>
  )
}

/**
 * Two-panel workspace for an accepted incoming call. Both panels read the same
 * `session` (one user id, one consultation id): horoscope left, chat right.
 */
export default function LiveConsultationWorkspace({ session }) {
  const [draft, setDraft] = useState('')
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  // Ask Guruji: put the question in the live chat input for review/editing, focus it, and keep the composer in view.
  const askGuruji = (question) => {
    setDraft(question)
    window.requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      input.focus({ preventScroll: true })
      input.setSelectionRange?.(question.length, question.length)
      input.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    })
  }
  // Bring the workspace fully into view when a call is accepted (it opens below the greeting banner).
  // Delayed slightly so the page has finished its first layout and scroll restoration.
  useEffect(() => {
    const timer = window.setTimeout(() => rootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 350)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <section className="lcw" ref={rootRef} data-session-id={session.id} data-user-id={session.userId} aria-label="Live consultation workspace">
      <HoroscopePanel session={session} onAskGuruji={askGuruji} />
      <ChatPanel session={session} draft={draft} setDraft={setDraft} inputRef={inputRef} />
    </section>
  )
}
