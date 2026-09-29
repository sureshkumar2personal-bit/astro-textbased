import { useMemo } from 'react'
import { BarChart3, CalendarDays, FileText, MessageCircle, Megaphone, UserRound, Users } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { selectCustomerUsers } from '../../utils/adminUsers.js'
import { selectAdminAstrologers } from '../../utils/adminAstrologers.js'
import { selectAdminDisputes } from '../../utils/adminDisputes.js'
import { summariseReports } from '../../utils/adminReports.js'

// Admin -> Reports / Analytics.
//
// Counts and status breakdowns only, read from the same persisted stores the
// list modules use. There are no charts, no time series and no revenue or
// retention figures, because the admin-accessible data does not support them.

function Breakdown({ title, rows }) {
  return (
    <Section title={title} icon={BarChart3} className="!mt-5">
      <Card>
        {rows.length === 0 ? (
          <p className="muted" style={{ marginTop: 0 }}>No records found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Value</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td><StatusBadge label={row.label} /></td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Section>
  )
}

export default function AdminReports() {
  const { users } = useAuth()
  const { appointments, questions, astrologerPosts } = useAppData()

  const reports = useMemo(() => summariseReports({
    customerUsers: selectCustomerUsers(users),
    astrologers: selectAdminAstrologers(users),
    appointments,
    questions,
    disputes: selectAdminDisputes(questions),
    posts: astrologerPosts,
  }), [users, appointments, questions, astrologerPosts])

  const totals = [
    { key: 'users', icon: Users, tone: 'violet', label: 'Registered users' },
    { key: 'astrologers', icon: UserRound, tone: 'sky', label: 'Astrologers listed' },
    { key: 'appointments', icon: CalendarDays, tone: 'teal', label: 'Appointments' },
    { key: 'questions', icon: MessageCircle, tone: 'green', label: 'Text-based questions' },
    { key: 'disputes', icon: Megaphone, tone: 'red', label: 'Disputes raised' },
    { key: 'content', icon: FileText, tone: 'gold', label: 'Content items' },
  ]

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Reports / Analytics"
        subtitle="Counts and status breakdowns taken directly from the platform's stored records."
      />

      <Section className="!mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {totals.map((item) => (
            <StatCard
              key={item.key}
              icon={item.icon}
              tone={item.tone}
              value={reports[item.key].total}
              label={item.label}
            />
          ))}
        </div>
      </Section>

      <Breakdown title={reports.appointments.breakdown.title} rows={reports.appointments.breakdown.rows} />
      <Breakdown title={reports.questions.breakdown.title} rows={reports.questions.breakdown.rows} />
      <Breakdown title={reports.disputes.breakdown.title} rows={reports.disputes.breakdown.rows} />
      <Breakdown title={reports.astrologers.breakdown.title} rows={reports.astrologers.breakdown.rows} />
      <Breakdown title={reports.content.breakdown.title} rows={reports.content.breakdown.rows} />

      <Section title="Users by status" icon={Users} className="!mt-5">
        <Card>
          <p className="muted" style={{ marginTop: 0, marginBottom: 0 }}>
            Not available. User records in this app carry no account-status field, so no status
            breakdown is reported rather than assuming one.
          </p>
        </Card>
      </Section>

      <Section title="Not shown on this page" icon={BarChart3} className="!mt-5">
        <Card>
          <p className="muted" style={{ marginTop: 0 }}>
            Subscription metrics, revenue, retention, growth and trend reporting are deliberately
            excluded. The current admin-accessible data does not provide reliable persisted
            platform-level figures for them:
          </p>
          <ul className="muted" style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7 }}>
            <li>Subscriptions are held in session state and are only seeded for a signed-in user account, so an admin sees none.</li>
            <li>Payments are stored as a single wallet with no owner recorded, so transactions cannot be attributed to users or summed into platform revenue.</li>
            <li>User records carry no join date, so user growth and retention cannot be calculated.</li>
            <li>Appointment amounts are prices, not realised payments, so they are not summed as revenue.</li>
            <li>There is no refund ledger, so no net or gross revenue figure can be produced.</li>
          </ul>
        </Card>
      </Section>
    </div>
  )
}
