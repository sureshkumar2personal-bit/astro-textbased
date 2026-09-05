import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, CalendarDays, History } from 'lucide-react'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import Card from '../../../components/ui/Card.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import AppointmentCalendar from './AppointmentCalendar.jsx'
import AppointmentDetailsDrawer from './AppointmentDetailsDrawer.jsx'
import AppointmentCallScreen from './AppointmentCallScreen.jsx'
import RescheduleModal from './RescheduleModal.jsx'
import { callTypeMeta } from './meta.jsx'
import {
  getAppointmentPhase,
  resolveAppointmentWindow,
  formatTimeRange,
  useNow,
  toIsoDate,
} from '../../../utils/appointments.js'

const APPOINTMENT_FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'history', label: 'History' },
]

function TodayPanel({ appointments, onSelect }) {
  const todayIso = toIsoDate(new Date())

  const todayApps = appointments
    .filter((appointment) => appointment.dateIso === todayIso)
    .sort(
      (a, b) =>
        resolveAppointmentWindow(a).startMin -
        resolveAppointmentWindow(b).startMin,
    )

  return (
    <Card className="apt-side-panel">
      <div className="apt-side-head">
        Today's Appointments
      </div>

      {!todayApps.length ? (
        <div className="apt-side-empty">
          No appointments today
        </div>
      ) : (
        todayApps.map((appointment) => {
          const meta = callTypeMeta(
            appointment.callType,
          )
          const Icon = meta.icon

          const {
            startMin,
            endMin,
          } = resolveAppointmentWindow(
            appointment,
          )

          return (
            <button
              type="button"
              key={appointment.id}
              className="apt-side-item"
              onClick={() =>
                onSelect(appointment)
              }
            >
              <div className="apt-side-time">
                {formatTimeRange(
                  startMin,
                  endMin,
                )}
              </div>

              <div className="apt-side-name">
                <Icon size={12} />
                {appointment.customerName}
              </div>

              <div className="apt-side-status">
                <StatusBadge
                  label={appointment.status}
                />
              </div>
            </button>
          )
        })
      )}
    </Card>
  )
}

function CallReadyToast({
  appointment,
  onStart,
}) {
  const meta = callTypeMeta(
    appointment.callType,
  )
  const Icon = meta.icon

  return (
    <div
      className="apt-toast"
      role="alert"
    >
      <div className="apt-toast-icon">
        <Icon size={18} />
      </div>

      <div className="apt-toast-content">
        <div className="apt-toast-title">
          Appointment starting now
        </div>

        <div className="apt-toast-sub">
          {appointment.customerName} ·{' '}
          {meta.label}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary apt-toast-btn"
        onClick={onStart}
      >
        Start Call
      </button>
    </div>
  )
}

export default function AppointmentCalendarTab() {
  const { currentUser } = useAuth()

  const {
    appointments,
    consultations,
    actions,
  } = useAppData()

  const now = useNow(1000)
  const routes =
    getRoleRoutes(
      currentUser?.role,
    )

  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] =
    useSearchParams()

  const astrologerId =
    currentUser?.id ===
    'astrologer-demo-alias'
      ? 'astrologer-demo'
      : currentUser?.id

  const isHistory =
    location.pathname ===
      '/astrologer/appointments/history' ||
    searchParams.get('section') ===
      'history'

  const myAppointments =
    useMemo(
      () =>
        appointments
          .filter(
            (appointment) =>
              appointment.astrologerId ===
              astrologerId,
          )
          .sort((a, b) => {
            if (
              a.dateIso !==
              b.dateIso
            ) {
              return (
                a.dateIso || ''
              ).localeCompare(
                b.dateIso || '',
              )
            }

            return (
              resolveAppointmentWindow(
                a,
              ).startMin -
              resolveAppointmentWindow(
                b,
              ).startMin
            )
          }),
      [appointments, astrologerId],
    )

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    isHistory
      ? 'history'
      : 'upcoming',
  )

  const [
    calendarView,
    setCalendarView,
  ] = useState('month')

  const [
    rangeStart,
    setRangeStart,
  ] = useState(
    () => new Date(),
  )

  const [
    selectedAppointment,
    setSelectedAppointment,
  ] = useState(null)

  const [
    inProgressAppointment,
    setInProgressAppointment,
  ] = useState(null)

  const [
    search,
    setSearch,
  ] = useState(
    searchParams.get('search') || '',
  )

  const [
    toastAppointment,
    setToastAppointment,
  ] = useState(null)

  const [
    rescheduleAppointment,
    setRescheduleAppointment,
  ] = useState(null)

  const toastShownRef =
    useRef(new Set())

  useEffect(() => {
    setActiveTab(
      isHistory
        ? 'history'
        : 'upcoming',
    )

    const urlSearch =
      searchParams.get(
        'search',
      )

    if (urlSearch != null) {
      setSearch(urlSearch)
    }
  }, [
    isHistory,
    searchParams,
  ])

  const filteredAppointments =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase()

        if (!query) {
          return myAppointments
        }

        return myAppointments.filter(
          (appointment) =>
            appointment.customerName
              ?.toLowerCase()
              .includes(query) ||
            appointment.orderId
              ?.toLowerCase()
              .includes(query) ||
            appointment.topic
              ?.toLowerCase()
              .includes(query),
        )
      },
      [myAppointments, search],
    )

  useEffect(() => {
    if (isHistory) return

    filteredAppointments.forEach(
      (appointment) => {
        const phaseResult =
          getAppointmentPhase(
            appointment,
            now,
          )

        const phase =
          typeof phaseResult ===
          'string'
            ? phaseResult
            : phaseResult.phase

        if (
          phase === 'live' &&
          !toastShownRef.current.has(
            appointment.id,
          ) &&
          appointment.status !==
            'Completed'
        ) {
          toastShownRef.current.add(
            appointment.id,
          )

          setToastAppointment(
            appointment,
          )

          window.setTimeout(
            () => {
              setToastAppointment(
                (current) =>
                  current?.id ===
                  appointment.id
                    ? null
                    : current,
              )
            },
            10000,
          )
        }
      },
    )
  }, [
    now,
    filteredAppointments,
    isHistory,
  ])

  const handleStartCall = (
    appointment,
  ) => {
    setInProgressAppointment(
      appointment,
    )
    setToastAppointment(null)
  }

  const handleCompleteCall = (
    appointmentId,
    meta,
  ) => {
    actions.completeAppointmentCall(
      appointmentId,
      meta,
    )
  }

  const handleEndCall = (
    _appointment,
  ) => {
    setInProgressAppointment(
      null,
    )
  }

  const closeDrawer = () => {
    if (
      !inProgressAppointment
    ) {
      setSelectedAppointment(
        null,
      )
    }
  }

  const getPhase = (
    appointment,
  ) => {
    const result =
      getAppointmentPhase(
        appointment,
        now,
      )

    return typeof result ===
      'string'
      ? result
      : result.phase
  }

  const upcomingApps =
    filteredAppointments.filter(
      (appointment) => {
        const phase =
          getPhase(
            appointment,
          )

        return (
          phase === 'upcoming' ||
          phase === 'live' ||
          phase === 'pending'
        )
      },
    )

  const completedApps =
    filteredAppointments.filter(
      (appointment) =>
        appointment.status ===
          'Completed' ||
        (
          getPhase(
            appointment,
          ) === 'completed' &&
          appointment.status !==
            'Cancelled'
        ),
    )

  const cancelledApps =
    filteredAppointments.filter(
      (appointment) =>
        appointment.status ===
        'Cancelled',
    )

  const calendarAppointments =
    isHistory
      ? activeTab === 'completed'
        ? completedApps
        : activeTab === 'cancelled'
          ? cancelledApps
          : activeTab === 'history'
            ? filteredAppointments.filter(
                (appointment) =>
                  appointment.status ===
                    'Completed' ||
                  appointment.status ===
                    'Cancelled' ||
                  getPhase(
                    appointment,
                  ) ===
                    'completed',
              )
            : filteredAppointments
      : activeTab ===
          'upcoming'
        ? upcomingApps
        : activeTab ===
            'completed'
          ? completedApps
          : activeTab ===
              'cancelled'
            ? cancelledApps
            : filteredAppointments

  const handleTabChange = (
    tab,
  ) => {
    setActiveTab(tab)

    if (
      tab === 'history' ||
      isHistory
    ) {
      navigate(
        `/astrologer/appointments/history${
          search
            ? `?search=${encodeURIComponent(
                search,
              )}`
            : ''
        }`,
      )
    }
  }

  return (
    <div
      className={`apt-page${
        selectedAppointment
          ? ' is-drawer-open'
          : ''
      }`}
    >
      <PageHeader
        eyebrow="Astrologer Workspace"
        title={
          isHistory
            ? 'Appointment History'
            : 'Appointments'
        }
        showBack
        backTo={routes.dashboard}
      />

      {isHistory ? (
        <div className="apt-history-intro">
          <div>
            <History size={18} />
            <div>
              <strong>
                Appointment History
              </strong>

              <span>
                Review your completed,
                cancelled and past
                appointments.
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() =>
              navigate(
                '/astrologer/appointments/schedule',
              )
            }
          >
            <CalendarDays size={15} />
            Schedule Appointment
          </button>
        </div>
      ) : (
        <div className="apt-history-intro">
          <div>
            <CalendarDays size={18} />
            <div>
              <strong>
                Manage Appointments
              </strong>

              <span>
                View your upcoming
                appointments and
                appointment activity.
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() =>
              navigate(
                '/astrologer/appointments/history',
              )
            }
          >
            <History size={15} />
            Appointment History
          </button>
        </div>
      )}

      {isHistory ? (
        <div className="apt-history-tabs">
          {[
            {
              key: 'history',
              label: 'All History',
            },
            {
              key: 'completed',
              label: 'Completed',
            },
            {
              key: 'cancelled',
              label: 'Cancelled',
            },
          ].map((tab) => (
            <button
              type="button"
              key={tab.key}
              className={
                activeTab ===
                tab.key
                  ? 'is-active'
                  : ''
              }
              onClick={() =>
                handleTabChange(
                  tab.key,
                )
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="apt-history-tabs">
          {[
            {
              key: 'upcoming',
              label: 'Upcoming',
            },
            {
              key: 'completed',
              label: 'Completed',
            },
            {
              key: 'cancelled',
              label: 'Cancelled',
            },
          ].map((tab) => (
            <button
              type="button"
              key={tab.key}
              className={
                activeTab ===
                tab.key
                  ? 'is-active'
                  : ''
              }
              onClick={() =>
                setActiveTab(
                  tab.key,
                )
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="apt-search-bar">
        <div>
          <Bell size={15} />
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search by customer, order ID or topic..."
          />
        </div>

        {search && (
          <button
            type="button"
            onClick={() =>
              setSearch('')
            }
          >
            Clear
          </button>
        )}
      </div>

      <div className="apt-main">
        <div className="apt-calendar-col">
          <AppointmentCalendar
            appointments={
              calendarAppointments
            }
            allAppointments={
              myAppointments
            }
            availabilityTemplate={null}
            now={now}
            view={calendarView}
            rangeStart={
              rangeStart
            }
            statusFilter={
              isHistory
                ? activeTab
                : activeTab
            }
            statusOptions={
              isHistory
                ? [
                    {
                      key: 'history',
                      label: 'All History',
                    },
                    {
                      key: 'completed',
                      label: 'Completed',
                    },
                    {
                      key: 'cancelled',
                      label: 'Cancelled',
                    },
                  ]
                : APPOINTMENT_FILTERS
            }
            search={search}
            onStatusFilterChange={
              handleTabChange
            }
            onSearchChange={
              setSearch
            }
            onViewChange={
              setCalendarView
            }
            onRangeChange={
              setRangeStart
            }
            onSelect={
              setSelectedAppointment
            }
          />
        </div>

        <aside className="apt-side-col">
          <TodayPanel
            appointments={
              calendarAppointments
            }
            onSelect={
              setSelectedAppointment
            }
          />
        </aside>
      </div>

      {selectedAppointment && (
        <AppointmentDetailsDrawer
          appointment={
            selectedAppointment
          }
          appointments={myAppointments}
          now={now}
          inProgress={
            inProgressAppointment?.id ===
            selectedAppointment.id
          }
          consultation={
            selectedAppointment.status === 'Completed'
              ? consultations.find((c) => c.appointmentId === selectedAppointment.id)
              : null
          }
          onClose={
            closeDrawer
          }
          onStartCall={
            handleStartCall
          }
          onReschedule={() => {
            setRescheduleAppointment(selectedAppointment)
            setSelectedAppointment(null)
          }}
          onSavePrivateNotes={(id, notes) => actions.savePrivateNotes(id, notes)}
          onSavePreCallAnalysis={(id, notes) => actions.savePreCallAnalysis(id, notes)}
          onSaveConsultation={(payload) => actions.saveConsultation(payload)}
          onViewDetails={() => {}}
        />
      )}

      {inProgressAppointment && (
        <AppointmentCallScreen
          appointment={
            inProgressAppointment
          }
          onEnd={
            handleEndCall
          }
          onCompleteCall={
            handleCompleteCall
          }
        />
      )}

      {rescheduleAppointment && (
        <RescheduleModal
          appointment={rescheduleAppointment}
          appointments={myAppointments}
          astrologerId={astrologerId}
          onClose={() => setRescheduleAppointment(null)}
        />
      )}

      {toastAppointment && (
        <CallReadyToast
          appointment={
            toastAppointment
          }
          onStart={() =>
            handleStartCall(
              toastAppointment,
            )
          }
        />
      )}
    </div>
  )
}
