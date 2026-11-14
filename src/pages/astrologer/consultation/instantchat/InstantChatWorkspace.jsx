import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock3, MessageSquarePlus, Send, Sparkles } from 'lucide-react'
import { useAuth } from '../../../../state/AuthContext.jsx'
import { useAppData } from '../../../../state/AppDataContext.jsx'
import { SIGNS, computeChart } from '../../../../utils/vedicChart.js'
import { appendConsultationMessage, getConsultationSecondsLeft, getInstantConsultation, getInstantConsultations, updateInstantConsultation } from '../../../../utils/instantConsultation.js'
import { billableSeconds, earningsForSeconds, formatClock, formatRupees } from '../../../../utils/instantCallConsole.js'
import { birthLine } from '../instantcall/IncomingCallCard.jsx'
import useInstantChats from './useInstantChats.js'
import { simulateIncomingChat } from './simulateChat.js'
import './instantChatWorkspace.css'

const VISIBLE_QUEUE = 5
const KUNDLI_PREFIX = '🪐 Kundli Summary'
const QUICK_REPLIES = [
  ['Lagna Summary', (chart) => `Your Lagna is ${SIGNS[chart.lagna.sign].sa} (${SIGNS[chart.lagna.sign].en}); it shapes your outlook and the way people first see you.`],
  ['Transit Note', () => 'Current transits are asking for patience: avoid rushing big decisions and keep things steady for now.'],
  ['Vedic Remedies', () => 'A simple remedy: light a ghee lamp on your ruling planet\'s weekday and chant its beeja mantra 11 times with a calm mind.'],
  ['Muhurat Timing', () => 'Let me check an auspicious window for this. Please share the exact activity and your preferred dates.'],
]

const chartCache = new Map()
function chartFor(details) {
  if (!details) return null
  const key = [details.dob, details.time, details.place, details.latitude, details.longitude].join('|')
  if (!chartCache.has(key)) chartCache.set(key, computeChart(details))
  const chart = chartCache.get(key)
  return chart.ok ? chart : null
}

const initials = (name) => String(name || '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const rashiOf = (chart) => (chart ? SIGNS[chart.planets.find((planet) => planet.key === 'moon').sign].en : '')
const kundliText = (chart) => `${KUNDLI_PREFIX}\nLagna: ${chart.panchang.lagna}\nRashi: ${chart.panchang.janmaRashi}\nNakshatra: ${chart.panchang.nakshatra}${chart.dasha ? `\nDasha: ${chart.dasha.maha.name} / ${chart.dasha.bhukti.name}` : ''}`
const wait = (now, request) => formatClock((now - new Date(request.waitFrom || request.createdAt).getTime()) / 1000)

function Seeker({ request, now, selected, onSelect, onAccept, onDecline, queued }) {
  const rashi = rashiOf(chartFor(request.birthDetails))
  return (
    <li className={`icw-seeker${selected ? ' is-selected' : ''}`}>
      <button type="button" className="icw-seeker__main" onClick={() => onSelect(request.id)} aria-current={selected || undefined}>
        <span className="icw-avatar" aria-hidden="true">{initials(request.userName)}</span>
        <span className="icw-seeker__text">
          <strong>{request.userName}</strong>
          <small>{rashi && <em className="icw-zodiac">{rashi}</em>} ₹{request.pricePerMinute}/min</small>
        </span>
        <span className="icw-seeker__timer"><Clock3 size={12} aria-hidden="true" /> {queued ? wait(now, request) : formatClock(billableSeconds(request, now))}</span>
      </button>
      {queued && (
        <div className="icw-seeker__actions">
          <button type="button" className="icw-btn icw-btn--accept" onClick={() => onAccept(request)}>Accept</button>
          <button type="button" className="icw-btn icw-btn--ghost" onClick={() => onDecline(request)}>Decline</button>
        </div>
      )}
    </li>
  )
}

function Message({ entry }) {
  const mine = entry.sender === 'astrologer'
  const time = new Date(entry.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (entry.text.startsWith(KUNDLI_PREFIX)) {
    const [, ...lines] = entry.text.split('\n')
    return (
      <div className="icw-msg icw-msg--mine"><div className="icw-kundli-card"><b><Sparkles size={14} /> Kundli Summary</b>{lines.map((line) => <span key={line}>{line}</span>)}<time>{time}</time></div></div>
    )
  }
  return <div className={`icw-msg ${mine ? 'icw-msg--mine' : ''}`}><p>{entry.text}<time>{time}</time></p></div>
}

export default function InstantChatWorkspace() {
  const { currentUser } = useAuth()
  const { astrologerServices } = useAppData()
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
  const { chats, now } = useInstantChats(astrologerId)
  const [tab, setTab] = useState('active')
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState('')
  const [slot, setSlot] = useState(null)
  const [notice, setNotice] = useState('')
  const streamRef = useRef(null)

  useEffect(() => { setSlot(document.getElementById('consult-tab-actions')) }, [])

  const groups = useMemo(() => {
    const byTime = (a, b) => new Date(a.waitFrom || a.createdAt) - new Date(b.waitFrom || b.createdAt)
    return {
      active: chats.filter((item) => item.status === 'accepted').sort(byTime),
      queue: chats.filter((item) => item.status === 'ringing').sort(byTime),
      done: chats.filter((item) => ['ended', 'rejected'].includes(item.status)).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 20),
    }
  }, [chats])

  const selected = chats.find((item) => item.id === selectedId && item.status !== 'ringing') || groups.active[0] || null
  const chart = useMemo(() => chartFor(selected?.birthDetails), [selected?.birthDetails])
  const live = selected?.status === 'accepted'
  const messageCount = selected?.messages?.length || 0
  useEffect(() => { streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight }) }, [selected?.id, messageCount])

  const respond = (request, action) => {
    const latest = getInstantConsultation(request.id)
    if (!latest || latest.status !== 'ringing') return
    const stamp = new Date().toISOString()
    updateInstantConsultation(request.id, action === 'accept' ? { status: 'accepted', startedAt: stamp } : { status: 'rejected', rejectedAt: stamp })
    if (action === 'accept') { setSelectedId(request.id); setTab('active') }
  }
  const send = (text) => {
    if (!live || !String(text).trim()) return
    appendConsultationMessage(selected.id, 'astrologer', text)
    setDraft('')
  }
  const endSession = () => {
    if (!live) return
    updateInstantConsultation(selected.id, { status: 'ended', endedAt: new Date().toISOString() })
    setTab('done')
  }
  const simulate = () => {
    // Read the live store (not the rendered list) so the sample seekers already waiting or chatting are exact.
    const inUse = getInstantConsultations().filter((item) => item.astrologerId === astrologerId && item.type === 'chat' && ['ringing', 'accepted'].includes(item.status)).map((item) => item.userId)
    if (simulateIncomingChat(astrologerId, currentUser?.name, inUse)) { setTab('queue'); setNotice('') } else setNotice('All sample seekers are already waiting or chatting.')
  }

  const list = tab === 'queue' ? groups.queue.slice(0, VISIBLE_QUEUE) : groups[tab] // oldest first; the rest move up as these are answered
  const rate = selected?.pricePerMinute ?? astrologerServices.chatPricePerMinute
  const seconds = selected ? billableSeconds(selected, now) : 0
  const timeUp = live && getConsultationSecondsLeft(selected) === 0

  return (
    <section className="icw" aria-label="Instant chat workspace">
      {slot && createPortal(<>{notice && <span className="icw-notice" role="status">{notice}</span>}<button type="button" className="icw-simulate" onClick={simulate}><MessageSquarePlus size={16} /> Simulate Incoming Chat</button></>, slot)}

      <aside className="icw-col icw-left" aria-label="Seeker queue and active chats">
        <div className="icw-tabs" role="tablist">
          {[['active', `Active (${groups.active.length})`], ['queue', `Queue (${groups.queue.length})`], ['done', 'Done']].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>
        {list.length ? (
          <ul className="icw-list">
            {list.map((request) => (
              <Seeker key={request.id} request={request} now={now} queued={tab === 'queue'} selected={selected?.id === request.id} onSelect={(id) => { if (tab !== 'queue') setSelectedId(id) }} onAccept={(item) => respond(item, 'accept')} onDecline={(item) => respond(item, 'decline')} />
            ))}
          </ul>
        ) : <p className="icw-empty">{tab === 'queue' ? 'No seekers are waiting.' : tab === 'active' ? 'No active chats. Accept a seeker from the queue.' : 'No finished chats yet.'}</p>}
      </aside>

      <div className="icw-col icw-center">
        {selected ? (
          <>
            <header className="icw-session">
              <div><h2>{selected.userName}</h2><p>{birthLine(selected.birthDetails)}</p></div>
              <span className="icw-badge" title="Session time"><Clock3 size={14} /> {formatClock(seconds)}</span>
              <span className="icw-badge icw-badge--money" title="Session earnings">{formatRupees(earningsForSeconds(seconds, rate), { decimals: 2 })}</span>
              {live ? <button type="button" className="icw-end" onClick={endSession}>End Session</button> : <span className="icw-badge">{selected.status === 'rejected' ? 'Declined' : 'Ended'}</span>}
            </header>
            <div className="icw-stream" ref={streamRef}>
              {timeUp && <p className="icw-note">Prepaid time is up. Waiting for {selected.userName} to extend or end.</p>}
              {messageCount ? selected.messages.map((entry) => <Message key={entry.id} entry={entry} />) : <p className="icw-note">No messages yet.</p>}
            </div>
            <div className="icw-composer">
              <div className="icw-chips">
                {QUICK_REPLIES.map(([label, build]) => <button key={label} type="button" disabled={!live || !chart} onClick={() => send(build(chart))}>{label}</button>)}
                <button type="button" className="icw-chips__kundli" disabled={!live || !chart} onClick={() => send(kundliText(chart))}><Sparkles size={13} /> Send Kundli Card</button>
              </div>
              <form onSubmit={(event) => { event.preventDefault(); send(draft) }}>
                <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={live ? 'Type your reply…' : 'This session has ended'} disabled={!live} aria-label="Message" />
                <button type="submit" className="icw-send" disabled={!live || !draft.trim()}><Send size={15} /> Send</button>
              </form>
            </div>
          </>
        ) : <p className="icw-empty icw-empty--center">Select or accept a seeker to start chatting.</p>}
      </div>
    </section>
  )
}
