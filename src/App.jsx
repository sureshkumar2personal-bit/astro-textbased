import { Navigate, Outlet, Route, BrowserRouter, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { AppDataProvider } from './state/AppDataContext.jsx'
import { AuthProvider, useAuth } from './state/AuthContext.jsx'
import { ThemeProvider } from './state/ThemeContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { getRoleRoutes, ROLES } from './utils/roleRoutes.js'

import Login from './pages/Login.jsx'
import RoleSelection from './pages/RoleSelection.jsx'
import Dashboard from './pages/Dashboard.jsx'
import UserDashboard from './pages/UserDashboard.jsx'
import TextBasedQuestions from './pages/TextBasedQuestions.jsx'
import SalesManagement from './pages/SalesManagement.jsx'
import Campaigns from './pages/Campaigns.jsx'
import PurchasePackage from './pages/PurchasePackage.jsx'
import AskQuestion from './pages/AskQuestion.jsx'
import AnswerQuestion from './pages/AnswerQuestion.jsx'
import TrackQuestions from './pages/TrackQuestions.jsx'
import RaiseDispute from './pages/RaiseDispute.jsx'
import DisputeManagement from './pages/DisputeManagement.jsx'
import AstrologerActivity from './pages/AstrologerActivity.jsx'
import WalletHistory from './pages/WalletHistory.jsx'
import AstrologerWallet from './pages/AstrologerWallet.jsx'
import Astrologers from './pages/Astrologers.jsx'
import AstrologersFull from './pages/astrologer/astrologers/AstrologersFull.jsx'
import FollowedAstrologersFull from './pages/FollowedAstrologersFull.jsx'
import SuggestedAstrologers from './pages/SuggestedAstrologers.jsx'
import CallPackageSelection from './pages/CallPackageSelection.jsx'
import ChatBooking from './pages/ChatBooking.jsx'
import ChatBirthDetails from './pages/ChatBirthDetails.jsx'
import ChatPaymentInformation from './pages/ChatPaymentInformation.jsx'
import ChatPaymentSuccess from './pages/ChatPaymentSuccess.jsx'
import ChatScreen from './pages/ChatScreen.jsx'
import ChatDetails from './pages/ChatDetails.jsx'
import CallScreen from './pages/CallScreen.jsx'
import CallBooking from './pages/CallBooking.jsx'
import CallPaymentInformation from './pages/CallPaymentInformation.jsx'
import CallPaymentSuccess from './pages/CallPaymentSuccess.jsx'
import VoiceCallScreen from './pages/VoiceCallScreen.jsx'
import WalletPayment from './pages/WalletPayment.jsx'
import DiscountQuestions from './pages/DiscountQuestions.jsx'
import Rewards from './pages/Rewards.jsx'
import Profile from './pages/Profile.jsx'
import AppointmentDetails from './pages/AppointmentDetails.jsx'
import PoojaDetails from './pages/PoojaDetails.jsx'
import LiveSession from './pages/LiveSession.jsx'
import ConsultationHistory from './pages/ConsultationHistory.jsx'
import MyAccount from './pages/MyAccount.jsx'
import AudienceMemberProfile from './pages/AudienceMemberProfile.jsx'
import ChatAstrologers from './pages/ChatAstrologers.jsx'
import CallAstrologers from './pages/CallAstrologers.jsx'
import AstrologerProfile from './pages/AstrologerProfile.jsx'
import AstrologerLiveSessionShell, {
  AstrologerLiveSessionConfigure,
  AstrologerLiveSessionSetup,
  AstrologerLiveSessionRoom,
  AstrologerLiveSessionSummary,
} from './pages/astrologer/live/AstrologerLiveSession.jsx'
import AppointmentsShell from './pages/astrologer/appointments/AppointmentsShell.jsx'
import AppointmentScheduleTab from './pages/astrologer/appointments/AppointmentSchedule.jsx'
import AppointmentHistoryTab from './pages/astrologer/appointments/AppointmentHistory.jsx'
import AstrologerAppointmentCalendar from './pages/astrologer/appointments/Appointments.jsx'

function RequireAuth() {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function RequireRole({ role }) {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (currentUser.role !== role) {
    return (
      <Navigate
        to={getRoleRoutes(currentUser.role).dashboard}
        replace
      />
    )
  }

  return <Outlet />
}

function NotFoundRedirect() {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return (
    <Navigate
      to={getRoleRoutes(currentUser.role).dashboard}
      replace
    />
  )
}

function AstrologerRoutes() {
  return (
    <Route element={<RequireRole role={ROLES.ASTROLOGER} />}>
      <Route element={<Layout />}>
        <Route path="/astrologer" element={<Dashboard />} />
        <Route path="/astrologer/text-based-questions" element={<TextBasedQuestions />} />
        <Route path="/astrologer/sales-management" element={<SalesManagement />} />
        <Route path="/astrologer/campaigns" element={<Campaigns />} />
        <Route path="/astrologer/profile" element={<Profile />} />
        <Route path="/astrologer/wallet" element={<AstrologerWallet />} />
        <Route path="/astrologer/audience/:audienceType/:memberId" element={<AudienceMemberProfile />} />
        <Route path="/astrologer/astrologer-profile" element={<Navigate to="/astrologer/profile" replace />} />
        <Route path="/astrologer/account-profile" element={<Navigate to="/astrologer/profile" replace />} />
        <Route path="/astrologer/wallet-history" element={<WalletHistory />} />
        <Route path="/astrologer/purchase-package" element={<PurchasePackage />} />
        <Route path="/astrologer/answer-question" element={<AnswerQuestion />} />
        <Route path="/astrologer/dispute-management" element={<DisputeManagement />} />
        <Route path="/astrologer/activity" element={<AstrologerActivity />} />
        <Route path="/astrologer/consultation-history" element={<ConsultationHistory />} />
        <Route path="/astrologer/appointments" element={<AppointmentsShell />}>
          <Route index element={<Navigate to="schedule" replace />} />
          <Route path="schedule" element={<AppointmentScheduleTab />} />
          <Route path="calendar" element={<AstrologerAppointmentCalendar />} />
          <Route path="history" element={<AppointmentHistoryTab />} />
        </Route>
        <Route path="/astrologer/live-session" element={<AstrologerLiveSessionShell />}>
          <Route index element={<Navigate to="setup" replace />} />
          <Route path="setup" element={<AstrologerLiveSessionSetup />} />
          <Route path="configure" element={<AstrologerLiveSessionConfigure />} />
          <Route path="room" element={<AstrologerLiveSessionRoom />} />
          <Route path="summary" element={<AstrologerLiveSessionSummary />} />
        </Route>
      </Route>
    </Route>
  )
}

function UserRoutes() {
  return (
    <Route element={<RequireRole role={ROLES.USER} />}>
      <Route element={<Layout />}>
        <Route path="/user" element={<UserDashboard />} />
        <Route path="/user/wallet-history" element={<WalletHistory />} />
        <Route path="/user/wallet" element={<WalletHistory />} />
        <Route path="/user/purchase-package" element={<PurchasePackage />} />
        <Route path="/user/ask-question" element={<AskQuestion />} />
        <Route path="/user/track-questions" element={<TrackQuestions />} />
        <Route path="/user/raise-dispute" element={<RaiseDispute />} />
        <Route path="/user/chat-astrologers" element={<ChatAstrologers />} />
        <Route path="/user/astrologer/:astrologerId" element={<AstrologerProfile />} />
        <Route path="/user/call-astrologers" element={<CallAstrologers />} />
        <Route path="/user/astrologers" element={<Astrologers />} />
        <Route path="/user/astrologers-full" element={<AstrologersFull />} />
        <Route path="/user/followed-astrologers" element={<FollowedAstrologersFull />} />
        <Route path="/user/suggested-astrologers" element={<SuggestedAstrologers />} />
        <Route path="/user/call-packages" element={<CallPackageSelection />} />
        <Route path="/call-booking/:astrologerId" element={<CallBooking />} />
        <Route path="/call-payment/:astrologerId" element={<CallPaymentInformation />} />
        <Route path="/call-payment-success" element={<CallPaymentSuccess />} />
        <Route path="/call/:astrologerId" element={<VoiceCallScreen />} />
        <Route path="/user/chat-booking" element={<ChatBooking />} />
        <Route path="/chat-birth-details/:astrologerId" element={<ChatBirthDetails />} />
        <Route path="/chat-booking/:astrologerId" element={<ChatBooking />} />
        <Route path="/payment-information" element={<ChatPaymentInformation />} />
        <Route path="/payment-success" element={<ChatPaymentSuccess />} />
        <Route path="/user/chat" element={<ChatScreen />} />
        <Route path="/user/chat-details" element={<ChatDetails />} />
        <Route path="/user/call" element={<CallScreen />} />
        <Route path="/user/wallet-payment" element={<WalletPayment />} />
        <Route path="/chat/:astrologerId" element={<ChatScreen />} />
        <Route path="/user/discount-questions" element={<DiscountQuestions />} />
        <Route path="/user/rewards" element={<Rewards />} />
        <Route path="/user/my-account" element={<MyAccount />} />
        <Route path="/user/profile" element={<Profile />} />
        <Route path="/user/appointment-details" element={<AppointmentDetails />} />
        <Route path="/user/pooja-details" element={<PoojaDetails />} />
        <Route path="/user/live-session" element={<LiveSession />} />
      </Route>
    </Route>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={<RoleSelection />}
      />

      <Route
        path="/login"
        element={<RoleSelection />}
      />

      <Route
        path="/login/:role"
        element={<Login />}
      />

      <Route element={<RequireAuth />}>
        {AstrologerRoutes()}
        {UserRoutes()}
      </Route>

      <Route
        path="*"
        element={<NotFoundRedirect />}
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </AppDataProvider>
    </AuthProvider>
  )
}

export default App