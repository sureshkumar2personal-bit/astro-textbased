import { CheckCircle2, PhoneOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppData } from '../../../../state/AppDataContext.jsx'
import { useAuth } from '../../../../state/AuthContext.jsx'
import { getSavedRate, saveConsultationPricing, usePricingVersion } from '../../../../utils/consultationPricing.js'
import { getInstantConsultation, getInstantConsultations, updateInstantConsultation } from '../../../../utils/instantConsultation.js'
import { activeCall, buildCallCompletion, formatRupees, nextSimulatedCaller, queueWaitMinutes, todaysCallStats, waitingCalls } from '../../../../utils/instantCallConsole.js'
import ActiveCallWorkspace from './ActiveCallWorkspace.jsx'
import CallHistoryTable from './CallHistoryTable.jsx'
import CallKpiStrip from './CallKpiStrip.jsx'
import IncomingCallCard from './IncomingCallCard.jsx'
import { addSimulatedCaller, claimDefaultCallerSeed, defaultCallerEnabled, seedDefaultQueue } from './simulateCaller.js'
import useInstantCalls, { isStillRinging } from './useInstantCalls.js'
import WaitingQueuePanel from './WaitingQueuePanel.jsx'
import './instantCallConsole.css'

export default function InstantCallConsole() {
  const { currentUser } = useAuth()
  const { astrologerServices, actions } = useAppData()
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
  usePricingVersion()
  const { sessions, now, waiting, active } = useInstantCalls(astrologerId)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const rate = getSavedRate(astrologerId, 'call') ?? astrologerServices.callPricePerMinute
  const incoming = active ? null : waiting[0] || null
  // While idle, the first waiting caller is the one ringing; everyone behind them is "in queue". During a call all of them are.
  const queue = active ? waiting : waiting.slice(1)
  const waits = queueWaitMinutes({ active, waiting, now })
  const inUseIds = [...waiting.map((request) => request.userId), active?.userId].filter(Boolean)
  const canAdd = nextSimulatedCaller(inUseIds) != null
  const stats = todaysCallStats(sessions, astrologerId, now)

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 8000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const saveRate = (value) => {
    // Same two writes the Pricing tab makes, so both screens always agree.
    const chat = getSavedRate(astrologerId, 'chat') ?? astrologerServices.chatPricePerMinute
    saveConsultationPricing(astrologerId, { call: value, chat })
    actions.updateAstrologerServices({ callPricePerMinute: value })
  }

  // Adds the next demo caller; with nobody waiting they ring straight away, otherwise they join the back of the queue.
  const addCaller = () => {
    setError('')
    addSimulatedCaller(astrologerId, currentUser?.name, inUseIds)
  }

  // First visit in a browser session: Arjun K. rings and Sneha M. / Vikram R. wait behind, so the live console is visible straight away.
  useEffect(() => {
    if (!astrologerId || !defaultCallerEnabled() || !claimDefaultCallerSeed()) return
    const all = getInstantConsultations()
    if (!activeCall(all, astrologerId) && !waitingCalls(all, astrologerId).length) seedDefaultQueue(astrologerId, currentUser?.name)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [astrologerId])

  const respond = (request, action) => {
    if (busy) return
    setBusy(action)
    setError('')
    try {
      if (!isStillRinging(request)) throw new Error('This request is no longer waiting.')
      const at = new Date().toISOString()
      const updated = updateInstantConsultation(request.id, action === 'accept' ? { status: 'accepted', startedAt: at } : { status: 'rejected', rejectedAt: at })
      if (!updated) throw new Error('Could not update the request. Please try again.')
    } catch (failure) {
      setError(failure?.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy('')
    }
  }

  const endCall = (notes) => {
    if (!active || busy) return
    setBusy('end')
    try {
      const latest = getInstantConsultation(active.id) || active // fresh copy: hold time and notes written a moment ago
      const completion = buildCallCompletion(latest)
      if (!updateInstantConsultation(active.id, { ...completion, notes })) throw new Error('Could not save the call. Please try again.')
      setNotice(`Call with ${active.userName} saved • ${formatRupees(completion.amount, { decimals: 2 })} added to today's earnings.`)
    } catch (failure) {
      setError(failure?.message || 'Could not save the call.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="icc">
      <CallKpiStrip rate={rate} onSaveRate={saveRate} stats={stats} waitingCount={waiting.length} onCall={Boolean(active)} onSimulate={addCaller} canSimulate={canAdd} />
      {notice && <p className="icc-notice" role="status"><CheckCircle2 size={15} /> {notice}</p>}
      <div className="icc-split">
        <div className="icc-split__main">
          {active
            ? <ActiveCallWorkspace key={active.id} request={active} now={now} saving={busy === 'end'} onEnd={endCall} />
            : incoming
              ? <IncomingCallCard request={incoming} now={now} busy={busy} error={error} onAccept={() => respond(incoming, 'accept')} onDecline={() => respond(incoming, 'decline')} />
              : <section className="icc-card icc-idle" aria-label="No incoming calls"><PhoneOff size={22} aria-hidden="true" /><div><strong>No incoming calls</strong><p className="icc-muted">You&apos;re available. New callers appear here the moment they request a call.</p></div></section>}
          {active && error && <p className="icc-error" role="alert">{error}</p>}
        </div>
        <WaitingQueuePanel queue={queue} waits={waits} canAdd={canAdd} onAdd={addCaller} />
      </div>
      <CallHistoryTable sessions={sessions} astrologerId={astrologerId} />
    </div>
  )
}
