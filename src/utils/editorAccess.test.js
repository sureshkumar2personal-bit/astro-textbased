import { describe, expect, it } from 'vitest'
import { getEditorNavigation, hasEditorPermission, isInvitationExpired } from './editorAccess.js'

describe('editor access rules', () => {
  const editor = { permissions: ['Profile-View', 'Appointments-View', 'Appointments-Cancel'] }

  it('checks grouped permissions without granting primary-only access', () => {
    expect(hasEditorPermission(editor, 'Appointments', 'View')).toBe(true)
    expect(hasEditorPermission(editor, 'Appointments', 'Reschedule')).toBe(false)
    expect(hasEditorPermission(editor, 'Financial', 'View')).toBe(false)
  })

  it('only exposes navigation for assigned work', () => {
    expect(getEditorNavigation(editor).map((item) => item.label)).toEqual(['Dashboard', 'Appointments', 'Profile', 'My Activity'])
  })

  it('recognizes expired invitations', () => {
    expect(isInvitationExpired({ expiresAt: new Date(Date.now() - 1000).toISOString() })).toBe(true)
    expect(isInvitationExpired({ expiresAt: new Date(Date.now() + 1000).toISOString() })).toBe(false)
  })
})
