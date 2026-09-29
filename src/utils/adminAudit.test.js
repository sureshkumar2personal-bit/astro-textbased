import { describe, expect, it } from 'vitest'
import { AUDIT_SOURCE_ADMIN, filterAuditActivity, isAdminActivity, mergeActivity } from './adminAudit.js'
import { ROLES } from './roleRoutes.js'

const adminLogin = {
  id: 'audit_1',
  adminId: 'admin_1',
  actorName: 'Avery Admin',
  actorRole: ROLES.ADMIN,
  action: 'Admin Login',
  module: 'Authentication',
  details: 'Avery Admin signed in.',
  occurredAt: '2026-02-01T10:00:00.000Z',
}

const adminLogout = {
  id: 'audit_2',
  adminId: 'admin_1',
  actorName: 'Avery Admin',
  actorRole: ROLES.ADMIN,
  action: 'Admin Logout',
  module: 'Authentication',
  details: 'Avery Admin signed out.',
  occurredAt: '2026-02-01T11:00:00.000Z',
}

describe('admin activity', () => {
  it('identifies genuine admin records by their recorded role', () => {
    expect(isAdminActivity(adminLogin)).toBe(true)
    expect(isAdminActivity({ id: 'audit_3', action: 'Editor Login' })).toBe(false)
  })

  it('surfaces recorded admin events as an admin source', () => {
    const merged = mergeActivity([], [], [adminLogin, adminLogout])

    expect(merged.map((entry) => entry.source)).toEqual([AUDIT_SOURCE_ADMIN, AUDIT_SOURCE_ADMIN])
    expect(merged[0]).toMatchObject({
      key: 'admin-audit_2',
      module: 'Authentication',
      actor: 'Avery Admin',
      action: 'Admin Logout',
      // The stored timestamp is shown as-is, not reconstructed.
      occurredAt: '2026-02-01T11:00:00.000Z',
    })
  })

  it('drops stored entries that do not carry the admin role', () => {
    const merged = mergeActivity([], [], [{ ...adminLogin, actorRole: 'editor' }, adminLogout])

    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe(adminLogout.id)
  })

  it('keeps working for callers that pass no admin log', () => {
    const editorEntry = { id: 'e1', editorName: 'Rhea', action: 'Editor Login', module: 'Editors & Assistants', occurredAt: '2026-02-01T09:00:00.000Z' }

    expect(mergeActivity([editorEntry], [])).toHaveLength(1)
  })

  it('filters admin events by module and query', () => {
    const merged = mergeActivity([], [], [adminLogin, adminLogout])

    expect(filterAuditActivity(merged, { module: 'Authentication' })).toHaveLength(2)
    expect(filterAuditActivity(merged, { module: 'All', query: 'signed out' })).toHaveLength(1)
  })
})
