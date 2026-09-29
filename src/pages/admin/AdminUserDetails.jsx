import { useMemo } from 'react'
import {
  CalendarDays,
  Gavel,
  MessageCircle,
  Receipt,
  Star,
  UserRound,
  Wallet,
} from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import {
  findAdminUser,
  formatDisplayDate,
  getUserAccountStatus,
  getUserJoinedDate,
  getUserLastLogin,
  selectUserAppointments,
  selectUserDisputes,
  selectUserPayments,
  selectUserQuestions,
  selectUserReviews,
  selectUserSubscriptions,
} from '../../utils/adminUsers.js'

// Admin -> User details.
//
// Reference view only. Each section reads an existing data source through a pure
// selector; nothing here manages payments, subscriptions, disputes or any other
// domain. Where a source cannot be linked to this user without changing business
// logic, the section renders its empty state instead of placeholder records.

function DetailField({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value || '—'}</div>
    </div>
  )
}

function EmptyRecords() {
  return <p className="muted" style={{ margin: 0 }}>No records found.</p>
}

function RecordTable({ columns, rows, emptyNote }) {
  return (
    <>
      {rows.length === 0 ? (
        <>
          <EmptyRecords />
          {emptyNote && (
            <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>{emptyNote}</p>
          )}
        </>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => <th key={column}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

export default function AdminUserDetails() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const { users } = useAuth()
  const { subscriptions, questions, appointments } = useAppData()

  const user = useMemo(() => findAdminUser(users, userId), [users, userId])

  const userSubscriptions = useMemo(() => selectUserSubscriptions(subscriptions, userId), [subscriptions, userId])
  const userQuestions = useMemo(() => selectUserQuestions(questions, userId), [questions, userId])
  const userAppointments = useMemo(() => selectUserAppointments(appointments, userId), [appointments, userId])
  const userDisputes = useMemo(() => selectUserDisputes(questions, userId), [questions, userId])
  const userReviews = useMemo(() => selectUserReviews(), [])
  const userPayments = useMemo(() => selectUserPayments(), [])

  if (!user) {
    return <Navigate to={`${routes.base}/users`} replace />
  }

  const backToUsers = () => navigate(`${routes.base}/users`)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title={user.name || 'User'}
        subtitle={`${user.email || 'No email on record'}${user.id ? ` · ${user.id}` : ''}`}
        actions={
          <button type="button" className="btn btn-ghost" onClick={backToUsers}>
            Back to Users
          </button>
        }
      />

      <Section title="Profile" icon={UserRound} className="!mt-4">
        <Card>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 18,
            }}
          >
            <DetailField label="Name" value={user.name} />
            <DetailField label="Email" value={user.email} />
            <DetailField label="Phone" value={user.phone} />
            <DetailField label="User ID" value={user.id} />
            <DetailField label="Joined" value={formatDisplayDate(getUserJoinedDate(user))} />
            <DetailField label="Account status" value={<StatusBadge label={getUserAccountStatus(user)} />} />
            <DetailField label="Last login" value={formatDisplayDate(getUserLastLogin(user))} />
          </div>
        </Card>
      </Section>

      <Section
        title="Subscriptions"
        icon={Star}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({userSubscriptions.length})</span>}
      >
        <Card>
          <RecordTable
            columns={['Astrologer', 'Tier', 'Subscribed', 'Expires']}
            rows={userSubscriptions.map((subscription) => (
              <tr key={subscription.id}>
                <td>{subscription.astrologerName || '—'}</td>
                <td>{subscription.tier || '—'}</td>
                <td>{formatDisplayDate(subscription.subscribedAt)}</td>
                <td>{formatDisplayDate(subscription.expiresAt)}</td>
              </tr>
            ))}
          />
        </Card>
      </Section>

      <Section
        title="Text-Based Questions"
        icon={MessageCircle}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({userQuestions.length})</span>}
      >
        <Card>
          <RecordTable
            columns={['Question ID', 'Category', 'Status', 'Raised']}
            rows={userQuestions.map((question) => (
              <tr key={question.id}>
                <td>{question.id}</td>
                <td>{question.category || '—'}</td>
                <td><StatusBadge label={question.status} /></td>
                <td>{formatDisplayDate(question.raisedAt || question.raised)}</td>
              </tr>
            ))}
          />
        </Card>
      </Section>

      <Section
        title="Appointments"
        icon={CalendarDays}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({userAppointments.length})</span>}
      >
        <Card>
          <RecordTable
            columns={['Astrologer', 'Type', 'Date', 'Status']}
            rows={userAppointments.map((appointment) => (
              <tr key={appointment.id}>
                <td>{appointment.astrologer || appointment.astrologerName || '—'}</td>
                <td>{appointment.type || '—'}</td>
                <td>{formatDisplayDate(appointment.date || appointment.bookingDate)}</td>
                <td><StatusBadge label={appointment.status} /></td>
              </tr>
            ))}
          />
        </Card>
      </Section>

      <Section
        title="Payments"
        icon={Wallet}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({userPayments.length})</span>}
      >
        <Card>
          <RecordTable
            columns={['Reference', 'Type', 'Amount', 'Date']}
            rows={userPayments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.id}</td>
                <td>{payment.typeLabel || payment.type}</td>
                <td>{payment.amount}</td>
                <td>{formatDisplayDate(payment.date)}</td>
              </tr>
            ))}
            emptyNote="Payments are stored as a single wallet rather than per account, so they cannot be attributed to this user yet. Full payment records are managed in the Payments &amp; Finance module."
          />
        </Card>
      </Section>

      <Section
        title="Reviews"
        icon={Receipt}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({userReviews.length})</span>}
      >
        <Card>
          <RecordTable
            columns={['Review', 'Rating', 'Type', 'Date']}
            rows={userReviews.map((review) => (
              <tr key={review.id}>
                <td>{review.text}</td>
                <td>{review.rating}</td>
                <td>{review.type}</td>
                <td>{formatDisplayDate(review.date)}</td>
              </tr>
            ))}
            emptyNote="Reviews are not stored against a user account, so none can be listed here yet. Review records are managed in the Reviews &amp; Ratings module."
          />
        </Card>
      </Section>

      <Section
        title="Disputes"
        icon={Gavel}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({userDisputes.length})</span>}
      >
        <Card>
          <RecordTable
            columns={['Question ID', 'Reason', 'Status']}
            rows={userDisputes.map((question) => (
              <tr key={question.id}>
                <td>{question.id}</td>
                <td>{question.dispute?.reason || '—'}</td>
                <td><StatusBadge label={question.dispute?.status} /></td>
              </tr>
            ))}
            emptyNote="Disputes raised on this user's questions appear here. Dispute resolution is handled in the Disputes module."
          />
        </Card>
      </Section>
    </div>
  )
}
