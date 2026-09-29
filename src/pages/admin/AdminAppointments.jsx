import { useMemo, useState } from 'react'
import { CalendarDays, Eye, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import {
  filterAdminAppointments,
  getAppointmentAstrologerName,
  getAppointmentDate,
  getAppointmentTime,
  getAppointmentUserName,
  selectAppointmentStatusFilters,
} from '../../utils/adminAppointments.js'

// Admin -> Appointments list.
//
// Reads the existing appointments store from AppDataContext. Read-only: there is
// no cancel, reschedule, complete, refund or start-call action here.
export default function AdminAppointments() {
  const { appointments } = useAppData()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')

  const statusFilters = useMemo(() => selectAppointmentStatusFilters(appointments), [appointments])
  const visibleAppointments = useMemo(
    () => filterAdminAppointments(appointments, { query, status }),
    [appointments, query, status],
  )

  const openAppointment = (appointmentId) => navigate(`${routes.base}/appointments/${appointmentId}`)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Appointments"
        subtitle="Every appointment booked on this platform. Open an appointment to review its details."
      />

      <Section className="!mt-4">
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group">
              <div className="search-bar">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by user, astrologer, or appointment ID"
                  className="text-input search-bar__input"
                  aria-label="Search appointments"
                />
                <button type="button" className="icon-btn" aria-label="Search">
                  <Search size={18} />
                </button>
              </div>
            </div>
            <div className="search-filter-row__group">
              <label className="search-filter-row__heading muted" htmlFor="admin-appointment-status" style={{ fontSize: 13, fontWeight: 600 }}>
                Status
              </label>
              <select
                id="admin-appointment-status"
                className="select-input"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {statusFilters.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </Section>

      <Section
        title="Appointments"
        icon={CalendarDays}
        className="!mt-5"
        titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({visibleAppointments.length})</span>}
      >
        <div className="table-wrap">
          {!appointments.length ? (
            <p className="muted">No appointments found.</p>
          ) : visibleAppointments.length === 0 ? (
            <p className="muted">No appointments match your search.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Appointment ID</th>
                  <th>User</th>
                  <th>Astrologer</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>{appointment.id || '—'}</td>
                    <td>{getAppointmentUserName(appointment) || '—'}</td>
                    <td>{getAppointmentAstrologerName(appointment) || appointment.astrologerId || '—'}</td>
                    <td>{formatDisplayDate(getAppointmentDate(appointment))}</td>
                    <td>{getAppointmentTime(appointment) || '—'}</td>
                    <td><StatusBadge label={appointment.status} /></td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openAppointment(appointment.id)}>
                        <Eye size={15} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </div>
  )
}
