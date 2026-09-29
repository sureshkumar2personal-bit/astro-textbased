import { useMemo, useState } from 'react'
import { FileText, Search, ShieldCheck } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useEditor } from '../../state/EditorContext.jsx'
import {
  AUDIT_SOURCE_ASTROLOGER,
  AUDIT_SOURCE_EDITOR,
  filterAuditActivity,
  mergeActivity,
  selectAuditModuleFilters,
  summariseApprovals,
} from '../../utils/adminAudit.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'

// Admin -> Admin & Audit.
//
// Read-only. This merges the two activity logs the app already records and
// shows the editor approval queue separately. No audit entry is created here,
// and there is no admin write path in this application, so no admin actions
// exist to record.

const SOURCE_TONES = {
  [AUDIT_SOURCE_EDITOR]: 'badge-violet',
  [AUDIT_SOURCE_ASTROLOGER]: 'badge-blue',
}

export default function AdminAudit() {
  const { audit, approvals } = useEditor()
  const { activityLog } = useAppData()
  const [query, setQuery] = useState('')
  const [module, setModule] = useState('All')

  const activity = useMemo(() => mergeActivity(audit, activityLog), [audit, activityLog])
  const moduleFilters = useMemo(() => selectAuditModuleFilters(activity), [activity])
  const visibleActivity = useMemo(
    () => filterAuditActivity(activity, { query, module }),
    [activity, query, module],
  )
  const approvalSummary = useMemo(() => summariseApprovals(approvals), [approvals])

  const editorCount = activity.filter((entry) => entry.source === AUDIT_SOURCE_EDITOR).length
  const astrologerCount = activity.filter((entry) => entry.source === AUDIT_SOURCE_ASTROLOGER).length

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Admin &amp; Audit"
        subtitle="Chronological activity recorded by the application, plus the editor approval queue."
      />

      <Section className="!mt-4">
        <Card>
          <h2 style={{ margin: '0 0 6px', fontSize: 16 }}>Admin activity</h2>
          <p className="muted" style={{ margin: 0 }}>
            No admin activity has been recorded yet.
          </p>
          <p className="muted" style={{ margin: '8px 0 0', fontSize: 13.5 }}>
            This application has no admin write path, so no admin actions are recorded anywhere. The
            activity below comes from astrologers and their assistants, not from platform
            administrators, and is labelled by source so the two are never confused.
          </p>
        </Card>
      </Section>

      <Section className="!mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={ShieldCheck} tone="violet" value={editorCount} label="Editor audit entries" />
          <StatCard icon={FileText} tone="sky" value={astrologerCount} label="Astrologer activity entries" />
          <StatCard icon={FileText} tone="gold" value={approvalSummary.pending} label="Approvals pending" />
        </div>
      </Section>

      <Section className="!mt-5">
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group">
              <div className="search-bar">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by action, details, or actor"
                  className="text-input search-bar__input"
                  aria-label="Search activity"
                />
                <button type="button" className="icon-btn" aria-label="Search">
                  <Search size={18} />
                </button>
              </div>
            </div>
            <div className="search-filter-row__group">
              <label className="search-filter-row__heading muted" htmlFor="admin-audit-module" style={{ fontSize: 13, fontWeight: 600 }}>
                Module
              </label>
              <select
                id="admin-audit-module"
                className="select-input"
                value={module}
                onChange={(event) => setModule(event.target.value)}
              >
                {moduleFilters.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </Section>

      <Section
        title="Activity"
        icon={ShieldCheck}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({visibleActivity.length})</span>}
      >
        <div className="table-wrap">
          {!activity.length ? (
            <p className="muted">No records found.</p>
          ) : visibleActivity.length === 0 ? (
            <p className="muted">No activity match your search.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Source</th>
                  <th>Module</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {visibleActivity.map((entry) => (
                  <tr key={entry.key}>
                    <td>
                      {formatDisplayDate(entry.occurredAt)}
                      <div className="muted" style={{ fontSize: 12 }}>{entry.occurredAt}</div>
                    </td>
                    <td><span className={`badge ${SOURCE_TONES[entry.source] || 'badge-gray'}`}>{entry.sourceLabel}</span></td>
                    <td>{entry.module || <span className="muted">Not available</span>}</td>
                    <td>{entry.actor || <span className="muted">Not available</span>}</td>
                    <td>
                      {entry.action || <span className="muted">Not available</span>}
                      {entry.type && <div className="muted" style={{ fontSize: 12 }}>{entry.type}</div>}
                    </td>
                    <td>{entry.details || <span className="muted">Not available</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>

      <Section
        title="Editor approvals"
        icon={ShieldCheck}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({approvalSummary.total})</span>}
      >
        <Card>
          <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>
            This is a stateful approval queue rather than a chronological event log, so it is shown
            separately and is not merged into the activity feed above.
          </p>
          {approvalSummary.rows.length === 0 ? (
            <p className="muted" style={{ marginBottom: 0 }}>No records found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Action</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Reviewed</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalSummary.rows.map((approval) => (
                    <tr key={approval.id}>
                      <td>{approval.module || <span className="muted">Not available</span>}</td>
                      <td>{approval.action || <span className="muted">Not available</span>}</td>
                      <td><StatusBadge label={approval.status} /></td>
                      <td>{formatDisplayDate(approval.createdAt)}</td>
                      <td>{formatDisplayDate(approval.reviewedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>
    </div>
  )
}
