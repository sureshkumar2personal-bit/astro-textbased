export const EDITOR_PERMISSION_GROUPS = {
  Availability: ['View', 'Edit', 'Publish', 'Submit'],
  Campaigns: ['View', 'Create', 'Edit', 'Submit'],
  'Campaign Questions': ['View', 'Respond', 'Manage'],
  Profile: ['View', 'Edit'],
  Questions: ['View', 'Respond', 'Manage'],
  Appointments: ['View', 'Reschedule', 'Cancel'],
  Disputes: ['View', 'Respond', 'Resolve'],
  'Live Events': ['View', 'Schedule', 'Edit', 'Submit'],
  'Live Conduct': ['Start', 'Manage', 'End'],
  Perks: ['View', 'Configure', 'Submit', 'Approve'],
  Content: ['View', 'Create', 'Edit', 'Delete', 'Submit', 'Publish', 'Visibility'],
  Notifications: ['View', 'Manage'],
  Financial: ['View'],
  Discounts: ['View', 'Configure', 'Submit', 'Publish'],
  Atonements: ['ViewSuggestions', 'CreateSuggestions', 'TrackProgress'],
  'Own Activity': ['View'],
}

export const DEFAULT_ASSISTANT_PERMISSIONS = [
  'Availability-View', 'Availability-Edit', 'Availability-Submit',
  'Campaigns-View', 'Campaigns-Create', 'Campaigns-Edit', 'Campaigns-Submit',
  'Questions-View', 'Questions-Respond', 'Questions-Manage',
  'Appointments-View', 'Appointments-Reschedule', 'Appointments-Cancel',
  'Live Events-View', 'Live Events-Schedule', 'Live Events-Edit', 'Live Events-Submit',
  'Content-View', 'Content-Create', 'Content-Edit', 'Content-Delete', 'Content-Submit', 'Content-Visibility',
  'Perks-View', 'Perks-Configure', 'Perks-Submit',
  'Discounts-View', 'Discounts-Configure', 'Discounts-Submit',
  'Atonements-TrackProgress', 'Notifications-View', 'Notifications-Manage', 'activity-view',
]

export const EDITOR_PERMISSION_MODULES = {
  Profile: 'profile',
  Availability: 'availability',
  Campaigns: 'campaigns',
  'Campaign Questions': 'campaignQuestions',
  Questions: 'questions',
  Appointments: 'appointments',
  Disputes: 'disputes',
  'Live Events': 'liveEvents',
  'Live Conduct': 'liveConduct',
  Perks: 'perks',
  Content: 'content',
  Notifications: 'notifications',
  Financial: 'financial',
  Discounts: 'discounts',
  Atonements: 'atonements',
  'Editor Activity': 'activity',
  'Own Activity': 'activity',
}

export const EDITOR_PRIMARY_ONLY = [
  'Withdraw money',
  'Financial transactions',
  'Identity verification',
  'Account ownership changes',
  'Password management',
  '2FA management',
  'Permanent account closure',
  'Editor management',
  'Full audit logs',
  'Security sessions and trusted devices',
]

// These are ordinary workspace areas. Editors may enter them; individual
// actions can still be limited by the permission list configured by the
// primary astrologer.
export const EDITOR_WORKSPACE_GROUPS = ['Profile', 'Questions', 'Appointments', 'Content', 'Notifications']

export function permissionKey(group, permission) {
  return `${group}-${permission}`
}

export function permissionId(module, action) {
  return `${String(module).toLowerCase()}-${String(action).toLowerCase()}`
}

export function normalizePermissions(permissions = []) {
  if (Array.isArray(permissions)) return permissions
  return String(permissions)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function hasEditorPermission(editor, group, permission) {
  const permissions = normalizePermissions(editor?.permissions)
  return permissions.includes(permissionKey(group, permission)) || permissions.includes(permissionId(EDITOR_PERMISSION_MODULES[group] || group, permission))
}

export function hasEditorModulePermission(editor, module, action) {
  const normalizedModule = String(module || '').toLowerCase()
  const normalizedAction = String(action || '').toLowerCase()
  return normalizePermissions(editor?.permissions).some((permission) => {
    const [storedModule, storedAction] = permission.toLowerCase().split('-')
    return storedModule === normalizedModule && storedAction === normalizedAction
  })
}

export function hasAnyEditorPermission(editor, group) {
  return (EDITOR_PERMISSION_GROUPS[group] || []).some((permission) => hasEditorPermission(editor, group, permission))
}

export function isInvitationExpired(invitation) {
  return Boolean(invitation?.expiresAt && new Date(invitation.expiresAt).getTime() < Date.now())
}

export function getEditorNavigation(editor) {
  const navigation = [{ label: 'Dashboard', to: '/editor/dashboard', icon: 'dashboard' }]
  if (hasEditorPermission(editor, 'Availability', 'View')) navigation.push({ label: 'Calendar Availability', to: '/editor/availability', icon: 'availability' })
  if (hasEditorPermission(editor, 'Campaigns', 'View')) navigation.push({ label: 'Campaigns', to: '/editor/campaigns', icon: 'campaigns' })
  if (hasEditorPermission(editor, 'Questions', 'View')) navigation.push({ label: 'Questions', to: '/editor/questions', icon: 'questions' })
  if (hasEditorPermission(editor, 'Appointments', 'View')) navigation.push({ label: 'Appointments', to: '/editor/appointments', icon: 'appointments' })
  if (hasEditorPermission(editor, 'Live Events', 'View')) {
    navigation.push({ label: 'Schedule Live', to: '/editor/live-scheduling', icon: 'live' })
    navigation.push({ label: 'Live History', to: '/editor/live-history', icon: 'live' })
  }
  if (hasEditorPermission(editor, 'Content', 'View')) navigation.push({ label: 'Content', to: '/editor/content', icon: 'content' })
  if (hasEditorPermission(editor, 'Perks', 'View')) navigation.push({ label: 'Perks & Benefits', to: '/editor/perks', icon: 'perks' })
  if (hasEditorPermission(editor, 'Discounts', 'View')) navigation.push({ label: 'Discounts', to: '/editor/discounts', icon: 'discounts' })
  if (hasEditorPermission(editor, 'Atonements', 'TrackProgress')) navigation.push({ label: 'Atonement Tracking', to: '/editor/atonement-tracking', icon: 'atonement' })
  if (hasEditorPermission(editor, 'Profile', 'View')) navigation.push({ label: 'Profile', to: '/editor/profile', icon: 'profile' })
  if (hasEditorPermission(editor, 'Notifications', 'View')) navigation.push({ label: 'Notifications', to: '/editor/notifications', icon: 'notifications' })
  navigation.push({ label: 'My Activity', to: '/editor/activity', icon: 'activity' })
  return navigation
}
