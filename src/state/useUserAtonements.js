import { useMemo } from 'react'
import { useAppData } from './AppDataContext.jsx'
import { useAuth } from './AuthContext.jsx'
import { createAtonementRecord, normalizeAtonement } from '../utils/atonements.js'

export function belongsToUser(item, currentUser) {
  return item.userId === currentUser?.id || (currentUser?.id === 'user-demo' && (item.userId === 'user-demo' || item.userId?.startsWith('u-'))) || (!item.userId && currentUser?.id)
}

export default function useUserAtonements() {
  const { atonements, consultations, actions } = useAppData()
  const { currentUser } = useAuth()

  const virtualAtonements = useMemo(() => {
    if (!currentUser?.id) return []
    return consultations
      .filter((c) => c.sent && c.atonement && (c.userId === currentUser.id || (currentUser.id === 'user-demo' && c.userId && c.userId.startsWith('u-')) || c.userId === 'user-demo'))
      .map((c) => {
        const at = c.atonement
        const savedMethod = at.content || (Array.isArray(c.attachments) ? c.attachments.find((item) => item?.type === 'Saved Content' && item.content)?.content : null) || null
        const daysCount = Number(at.completionDays) || 1
        const start = at.startAt ? new Date(at.startAt) : new Date()
        const days = Array.from({ length: daysCount }, (_, i) => {
          const d = new Date(start.getTime() + i * 86400000)
          const iso = d.toISOString().slice(0, 10)
          return {
            date: iso,
            day: `Day ${i + 1}`,
            hour: at.content?.hour || at.hour || '07:30',
            place: at.content?.place || at.place || 'Temple',
            god: at.content?.god || at.content?.deity || at.god || 'Lord Shiva',
            things: at.content?.things || at.things || '',
            poojas: at.content?.poojas || at.poojas || c.notes || '',
            extraNotes: at.content?.extraNotes || at.extraNotes || '',
            summary: at.title || c.notes || 'Pariharam',
            completed: false,
          }
        })
        try {
          return createAtonementRecord({
            id: `virt-${c.id}`,
            method: savedMethod ? { ...savedMethod, title: savedMethod.title || at.title, duration: savedMethod.duration || savedMethod.templateDuration || at.completionDays } : null,
            userId: c.userId,
            astrologerId: c.astrologerId,
            astrologerName: c.astrologerName || 'Astrologer',
            sourceType: 'appointment',
            sourceId: c.appointmentId,
            appointmentId: c.appointmentId,
            sourceLabel: `Appointment ${c.appointmentId}`,
            summary: at.title || c.notes?.slice(0, 80) || 'Call-End Pariharam',
            days,
            createdAt: c.sentAt || new Date().toISOString(),
          })
        } catch {
          return normalizeAtonement({
            id: `virt-${c.id}`,
            userId: c.userId,
            sourceType: 'appointment',
            sourceId: c.appointmentId,
            summary: at.title || 'Pariharam',
            days,
          })
        }
      })
  }, [consultations, currentUser?.id])

  const allAtonements = useMemo(() => {
    const map = new Map()
    atonements.forEach((a) => map.set(a.id, a))
    virtualAtonements.forEach((v) => {
      const exists = [...map.values()].some((a) => (a.sourceId === v.sourceId || a.appointmentId === v.appointmentId) && a.sourceId)
      if (!exists) map.set(v.id, v)
    })
    return [...map.values()]
  }, [atonements, virtualAtonements])

  const ensureStored = (record) => {
    if (!atonements.some((item) => item.id === record.id)) actions.createAtonement(record)
  }
  const toggleDay = (record, index, completed = true) => { ensureStored(record); actions.updateAtonementDay(record.id, index, completed) }
  const saveProof = (record, index, proof) => { ensureStored(record); actions.setAtonementDayProof(record.id, index, proof) }

  return { allAtonements, currentUser, toggleDay, saveProof }
}
