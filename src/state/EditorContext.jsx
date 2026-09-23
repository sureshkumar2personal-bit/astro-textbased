/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { DEFAULT_ASSISTANT_PERMISSIONS, EDITOR_PERMISSION_GROUPS, normalizePermissions } from '../utils/editorAccess.js'

const INVITATIONS_KEY = 'astroconnect-editor-invitations'
const EDITORS_KEY = 'astroconnect-editor-users'
const SESSIONS_KEY = 'astroconnect-editor-sessions'
const PERMISSIONS_KEY = 'astroconnect-editor-permissions'
const AUDIT_KEY = 'astroconnect-editor-audit'
const DRAFTS_KEY = 'astroconnect-editor-drafts'
const APPROVALS_KEY = 'astroconnect-editor-approvals'
const SESSION_KEY = 'astroconnect-editor-session'

const now = () => new Date().toISOString()
const id = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const seedEditors = [{ id: 'editor-priya', astrologerId: 'astrologer-demo', name: 'Priya Assistant', email: 'priya@astroconnect.com', role: 'Editor', permissions: ['Profile-View', 'Questions-View', 'Questions-Respond', 'Appointments-View', 'Notifications-View', 'activity-view'], status: 'active', createdAt: now(), acceptedAt: now(), lastActiveAt: now() }]
const seedInvitations = [{ id: 'invite-ananya', astrologerId: 'astrologer-demo', name: 'Ananya Iyer', email: 'ananya@astroconnect.com', role: 'Assistant', permissions: ['Questions-View', 'Notifications-View', 'activity-view'], status: 'pending', createdAt: now(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() }]

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase()
  return value === 'active' ? 'active' : value === 'pending invitation' || value === 'pending' ? 'pending' : value || 'pending'
}

function normalizeMember(member) {
  return { ...member, status: normalizeStatus(member.status), role: member.role === 'Assistant' || String(member.role).toLowerCase().includes('assistant') ? 'Assistant' : 'Editor' }
}

function readJSON(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function writeJSON(key, value) { if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value)) }

export function invitationStatus(invitation) {
  if (!invitation) return 'expired'
  if (invitation.status === 'pending' && invitation.expiresAt && new Date(invitation.expiresAt).getTime() < Date.now()) return 'expired'
  return invitation.status || 'pending'
}

function safePermissions(permissions) {
  return normalizePermissions(permissions).filter((permission) => {
    const [module, action] = String(permission).split('-')
    return (Object.keys(EDITOR_PERMISSION_GROUPS).includes(module) && EDITOR_PERMISSION_GROUPS[module].includes(action)) || permission === 'activity-view'
  })
}

const EditorContext = createContext(null)

export function EditorProvider({ children }) {
  const { currentUser, startEditorSession, endEditorSession } = useAuth()
  const [invitations, setInvitations] = useState(() => { const stored = readJSON(INVITATIONS_KEY, null); return Array.isArray(stored) ? stored.map((item) => ({ ...item, status: normalizeStatus(item.status) })) : seedInvitations })
  const [editors, setEditors] = useState(() => { const stored = readJSON(EDITORS_KEY, null); return Array.isArray(stored) ? stored.map(normalizeMember) : seedEditors })
  const [sessions, setSessions] = useState(() => readJSON(SESSIONS_KEY, []))
  const [permissionStore, setPermissionStore] = useState(() => readJSON(PERMISSIONS_KEY, {}))
  const [audit, setAudit] = useState(() => readJSON(AUDIT_KEY, []))
  const [drafts, setDrafts] = useState(() => readJSON(DRAFTS_KEY, []))
  const [approvals, setApprovals] = useState(() => readJSON(APPROVALS_KEY, []))
  const [editorSession, setEditorSession] = useState(() => readJSON(SESSION_KEY, null))

  useEffect(() => writeJSON(INVITATIONS_KEY, invitations), [invitations])
  useEffect(() => writeJSON(EDITORS_KEY, editors), [editors])
  useEffect(() => writeJSON(SESSIONS_KEY, sessions), [sessions])
  useEffect(() => writeJSON(PERMISSIONS_KEY, permissionStore), [permissionStore])
  useEffect(() => writeJSON(AUDIT_KEY, audit), [audit])
  useEffect(() => writeJSON(DRAFTS_KEY, drafts), [drafts])
  useEffect(() => writeJSON(APPROVALS_KEY, approvals), [approvals])
  useEffect(() => { if (editorSession) writeJSON(SESSION_KEY, editorSession); else if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_KEY) }, [editorSession])

  const ownerId = currentUser?.role === 'astrologer' ? currentUser.id : currentUser?.astrologerId
  const currentEditorId = currentUser?.role === 'editor' ? (currentUser.editorId || currentUser.id) : null
  const visibleEditors = editors.filter((editor) => !ownerId || editor.astrologerId === ownerId)
  const visibleInvitations = invitations.filter((invitation) => !ownerId || invitation.astrologerId === ownerId)
  const currentEditor = currentEditorId ? visibleEditors.find((editor) => editor.id === currentEditorId) : null

  const recordAudit = (action, module, details = '', editor = currentUser) => {
    const entry = { id: id('audit'), astrologerId: editor?.astrologerId || currentUser?.id, editorId: editor?.id || editor?.editorId || editor?.userId || currentUser?.id, editorName: editor?.name || currentUser?.name || 'Primary astrologer', action, module, details, occurredAt: now() }
    setAudit((items) => [entry, ...items].slice(0, 500))
    return entry
  }

  const closeEditorSession = (editorId) => {
    setSessions((items) => items.filter((session) => session.editorId !== editorId))
    if (editorSession?.editorId === editorId || editorSession?.id === editorId) { setEditorSession(null); endEditorSession() }
  }

  useEffect(() => {
    if (!editorSession) return
    const member = editors.find((editor) => editor.id === editorSession.editorId || editor.id === editorSession.id)
    if (!member || member.status !== 'active') closeEditorSession(editorSession.editorId || editorSession.id)
  }, [editors, editorSession])

  const value = useMemo(() => ({
    invitations: visibleInvitations.map((item) => ({ ...item, status: invitationStatus(item) })),
    editors: visibleEditors.map((editor) => ({ ...editor, permissions: permissionStore[editor.id] || editor.permissions || [] })),
    sessions, permissions: permissionStore, currentEditor,
    drafts: drafts.filter((draft) => !ownerId || draft.astrologerId === ownerId),
    approvals: approvals.filter((approval) => !ownerId || approval.astrologerId === ownerId),
    audit: audit.filter((entry) => (!ownerId || entry.astrologerId === ownerId) && (!currentEditorId || entry.editorId === currentEditorId)), editorSession, permissionGroups: EDITOR_PERMISSION_GROUPS, recordAudit,
    saveDraft(payload) {
      const draft = { id: payload.id || id('draft'), astrologerId: payload.astrologerId || ownerId, editorId: payload.editorId || currentEditorId || currentUser?.id, module: payload.module, action: payload.action, payload: payload.payload || {}, status: payload.status || 'draft', createdAt: payload.createdAt || now(), updatedAt: now() }
      setDrafts((items) => [draft, ...items.filter((item) => item.id !== draft.id)])
      return draft
    },
    submitDraft(draftId) {
      const draft = drafts.find((item) => item.id === draftId)
      if (!draft) return null
      const approval = { id: id('approval'), astrologerId: draft.astrologerId, editorId: draft.editorId, module: draft.module, action: draft.action, payload: draft.payload, status: 'pending', createdAt: now(), reviewedAt: null, reviewNote: '' }
      setDrafts((items) => items.map((item) => item.id === draftId ? { ...item, status: 'pending', updatedAt: now() } : item))
      setApprovals((items) => [approval, ...items.filter((item) => item.id !== approval.id)])
      recordAudit(`${draft.module} Submitted`, draft.module, `Submitted ${draft.action} for approval.`)
      return approval
    },
    reviewApproval(approvalId, decision, reviewNote = '', applyApprovedChange) {
      const approval = approvals.find((item) => item.id === approvalId)
      if (!approval || approval.status !== 'pending' || currentUser?.role !== 'astrologer') return false
      if (decision === 'approved' && typeof applyApprovedChange === 'function') applyApprovedChange(approval)
      setApprovals((items) => items.map((item) => item.id === approvalId ? { ...item, status: decision, reviewedAt: now(), reviewNote } : item))
      setDrafts((items) => items.map((item) => item.module === approval.module && item.editorId === approval.editorId && item.status === 'pending' ? { ...item, status: decision, updatedAt: now() } : item))
      recordAudit(decision === 'approved' ? 'Approval Accepted' : 'Approval Rejected', approval.module, reviewNote || `${approval.action} ${decision}.`, currentUser)
      return true
    },
    createInvitation(payload) {
      if (!currentUser || currentUser.role !== 'astrologer') throw new Error('Only the primary astrologer can create invitations.')
      const email = String(payload.email || '').trim().toLowerCase()
      if (!String(payload.name || '').trim()) throw new Error('Enter the member name.')
      if (!email || !email.includes('@')) throw new Error('Enter a valid email address.')
      const expiresAt = new Date(payload.expiresAt)
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) throw new Error('Choose a future expiration date.')
      const permissions = safePermissions(payload.accessMode === 'default' && !payload.permissions?.length ? DEFAULT_ASSISTANT_PERMISSIONS : payload.permissions)
      if (!permissions.length) throw new Error('Select at least one usable permission.')
      if (invitations.some((item) => item.email === email && invitationStatus(item) === 'pending')) throw new Error('A pending invitation already exists for this email.')
      const invitation = { id: id('inv'), astrologerId: currentUser.id, name: String(payload.name).trim(), email, role: payload.role === 'Assistant' ? 'Assistant' : 'Editor', accessMode: payload.accessMode === 'custom' ? 'custom' : 'default', permissions, status: 'pending', createdAt: now(), expiresAt: expiresAt.toISOString() }
      setInvitations((items) => [invitation, ...items]); recordAudit('Invitation Created', 'Editors & Assistants', `${invitation.name} · ${invitation.email}`, currentUser); return invitation
    },
    acceptInvitation(invitationId) {
      const invitation = invitations.find((item) => item.id === invitationId)
      const status = invitationStatus(invitation)
      if (!invitation || status !== 'pending') throw new Error(`This invitation is ${status}.`)
      const member = { id: id('editor'), astrologerId: invitation.astrologerId, name: invitation.name, email: invitation.email, role: invitation.role, permissions: invitation.permissions, status: 'active', createdAt: now(), acceptedAt: now(), lastActiveAt: now() }
      setEditors((items) => items.some((item) => item.email === member.email && item.astrologerId === member.astrologerId) ? items : [member, ...items])
      setInvitations((items) => items.map((item) => item.id === invitationId ? { ...item, status: 'accepted', acceptedAt: member.acceptedAt } : item))
      const session = { editorId: member.id, astrologerId: member.astrologerId, name: member.name, email: member.email, role: member.role, permissions: member.permissions, status: 'active', signedInAt: now(), lastActiveAt: now() }
      setEditorSession(session); setSessions((items) => [session, ...items.filter((item) => item.editorId !== member.id)]); startEditorSession({ ...member, editorId: member.id }); recordAudit('Invitation Accepted', 'Editors & Assistants', `${member.name} accepted the invitation.`, member); return member
    },
    declineInvitation(invitationId) { const invitation = invitations.find((item) => item.id === invitationId); setInvitations((items) => items.map((item) => item.id === invitationId ? { ...item, status: 'declined', declinedAt: now() } : item)); if (invitation) recordAudit('Invitation Declined', 'Editors & Assistants', invitation.name) },
    updateEditorPermissions(editorId, permissions) { const safe = safePermissions(permissions); setPermissionStore((items) => ({ ...items, [editorId]: safe })); setEditors((items) => items.map((item) => item.id === editorId ? { ...item, permissions: safe } : item)); const member = editors.find((item) => item.id === editorId); recordAudit('Permissions Updated', 'Editors & Assistants', member?.name || editorId) },
    changeEditorRole(editorId, role) { setEditors((items) => items.map((item) => item.id === editorId ? { ...item, role: role === 'Assistant' ? 'Assistant' : 'Editor' } : item)); const member = editors.find((item) => item.id === editorId); recordAudit('Role Updated', 'Editors & Assistants', `${member?.name || editorId} → ${role}`) },
    suspendEditor(editorId) { setEditors((items) => items.map((item) => item.id === editorId ? { ...item, status: 'suspended' } : item)); const member = editors.find((item) => item.id === editorId); closeEditorSession(editorId); recordAudit('Member Suspended', 'Editors & Assistants', member?.name || editorId) },
    reactivateEditor(editorId) { setEditors((items) => items.map((item) => item.id === editorId ? { ...item, status: 'active', lastActiveAt: now() } : item)); const member = editors.find((item) => item.id === editorId); recordAudit('Member Reactivated', 'Editors & Assistants', member?.name || editorId) },
    revokeEditor(editorId) { setEditors((items) => items.map((item) => item.id === editorId ? { ...item, status: 'revoked', revokedAt: now() } : item)); const member = editors.find((item) => item.id === editorId); closeEditorSession(editorId); recordAudit('Member Revoked', 'Editors & Assistants', member?.name || editorId) },
    cancelInvitation(invitationId) { const invitation = invitations.find((item) => item.id === invitationId); setInvitations((items) => items.map((item) => item.id === invitationId ? { ...item, status: 'cancelled' } : item)); recordAudit('Invitation Cancelled', 'Editors & Assistants', invitation?.name || invitationId) },
    resendInvitation(invitationId, expiresAt) { const invitation = invitations.find((item) => item.id === invitationId); setInvitations((items) => items.map((item) => item.id === invitationId ? { ...item, status: 'pending', createdAt: now(), expiresAt: expiresAt || new Date(Date.now() + 7 * 86400000).toISOString() } : item)); recordAudit('Invitation Resent', 'Editors & Assistants', invitation?.name || invitationId); return `${window.location.origin}/editor/accept-invitation/${invitationId}` },
    loginEditor(member) { if (!member || member.status !== 'active') throw new Error(`This account is ${member?.status || 'unavailable'}.`); const session = { editorId: member.id, astrologerId: member.astrologerId, name: member.name, email: member.email, role: member.role, permissions: permissionStore[member.id] || member.permissions || [], status: 'active', signedInAt: now(), lastActiveAt: now() }; setEditorSession(session); setSessions((items) => [session, ...items.filter((item) => item.editorId !== member.id)]); startEditorSession({ ...member, editorId: member.id, permissions: session.permissions }); recordAudit('Editor Login', 'Editors & Assistants', `${member.name} signed in.`, member); return session },
    logoutEditor() { if (editorSession) recordAudit('Editor Logout', 'Editors & Assistants', `${editorSession.name} signed out.`, editorSession); if (editorSession) setSessions((items) => items.filter((item) => item.editorId !== editorSession.editorId)); setEditorSession(null); endEditorSession() },
    isSessionValid(editorId) { const member = editors.find((item) => item.id === editorId); const sessionExists = sessions.some((session) => session.editorId === editorId && (session.status || 'active') === 'active') || (editorSession && (editorSession.editorId === editorId || editorSession.id === editorId) && (editorSession.status || 'active') === 'active'); return Boolean(member && member.status === 'active' && sessionExists) },
  }), [approvals, audit, currentEditor, currentEditorId, currentUser, drafts, editorSession, editors, invitations, ownerId, permissionStore, sessions, visibleEditors, visibleInvitations])

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor() { const value = useContext(EditorContext); if (!value) throw new Error('useEditor must be used within EditorProvider'); return value }
