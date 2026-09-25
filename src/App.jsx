import { Navigate, Outlet, Route, BrowserRouter, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { AppDataProvider } from './state/AppDataContext.jsx'
import { AuthProvider, useAuth } from './state/AuthContext.jsx'
import { EditorProvider } from './state/EditorContext.jsx'
import { useEditor } from './state/EditorContext.jsx'
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
import AnswerQuestion from './pages/astrologer/answer/AnswerQuestion.jsx'
import TrackQuestions from './pages/TrackQuestions.jsx'
import RaiseDispute from './pages/RaiseDispute.jsx'
import DisputeManagement from './pages/DisputeManagement.jsx'
import AstrologerActivity from './pages/AstrologerActivity.jsx'
import PerksAndBenefits from './pages/PerksAndBenefits.jsx'
import Atonement from './pages/Atonement.jsx'
import WalletHistory from './pages/WalletHistory.jsx'
import {
  UserWalletOverview,
  UserWalletTransactions,
  UserWalletTopUps,
  UserWalletRefunds,
} from './pages/user/wallet/WalletHistory.jsx'
import {
  WalletOverview,
  WalletEarnings,
  WalletTransactions,
  WalletWithdraw,
  WalletSettlements,
  WalletPaymentMethods,
} from './pages/AstrologerWallet.jsx'
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
import RewardsPerks from './pages/user/rewards/Rewards.jsx'
import Activity from './pages/user/activity.jsx'
import Profile from './pages/Profile.jsx'
import AppointmentDetails from './pages/AppointmentDetails.jsx'
import PoojaDetails from './pages/PoojaDetails.jsx'
import LiveSession from './pages/user/live-sessions/LiveSession.jsx'
import Atonements from './pages/user/Atonements.jsx'
import ConsultationHistory from './pages/ConsultationHistory.jsx'
import MyAccount from './pages/MyAccount.jsx'
import AstrologerAccountManagement from './pages/AstrologerAccountManagement.jsx'
import FullHoroscope from './pages/user/horoscope/FullHoroscope.jsx'
import AudienceMemberProfile from './pages/AudienceMemberProfile.jsx'
import ChatAstrologers from './pages/ChatAstrologers.jsx'
import CallAstrologers from './pages/CallAstrologers.jsx'
import AstrologerProfile from './pages/AstrologerProfile.jsx'
import ReviewsRatings from './pages/ReviewsRatings.jsx'
import PaymentMethods from './pages/user/payment-methods/PaymentMethods.jsx'
import AddPaymentMethod from './pages/user/payment-methods/AddPaymentMethod.jsx'
import Autopay from './pages/user/autopay/Autopay.jsx'
import Withdraw from './pages/user/withdraw/Withdraw.jsx'
import TransactionHistory from './pages/user/transaction-history/TransactionHistory.jsx'
import BookAppointment from './pages/user/appointments/BookAppointment.jsx'
import BookAppointmentSlots from './pages/user/appointments/BookAppointmentSlots.jsx'
import MyAppointments from './pages/user/appointments/MyAppointments.jsx'
import AstrologerLiveSessionShell, {
  AstrologerLiveSessionConfigure,
  AstrologerLiveSessionSetup,
  AstrologerLiveSessionRoom,
  AstrologerLiveSessionSummary,
} from './pages/astrologer/live/AstrologerLiveSession.jsx'
import { ScheduledLive, LiveHistory } from './pages/astrologer/live/LiveSessionLists.jsx'
import AppointmentsShell from './pages/astrologer/appointments/AppointmentsShell.jsx'
import AppointmentScheduleTab from './pages/astrologer/appointments/AppointmentSchedule.jsx'
import AppointmentHistoryTab from './pages/astrologer/appointments/AppointmentHistory.jsx'
import AstrologerAppointmentCalendar from './pages/astrologer/appointments/Appointments.jsx'
import EditorLayout from './pages/editor/EditorLayout.jsx'
import EditorDashboard from './pages/editor/EditorDashboard.jsx'
import AcceptInvitation from './pages/editor/AcceptInvitation.jsx'
import EditorLogin from './pages/editor/EditorLogin.jsx'
import EditorAccessDenied from './pages/editor/EditorAccessDenied.jsx'
import EditorActivity from './pages/editor/EditorActivity.jsx'
import EditorProfile from './pages/editor/EditorProfile.jsx'
import EditorQuestions from './pages/editor/EditorQuestions.jsx'
import EditorAppointments from './pages/editor/EditorAppointments.jsx'
import EditorContent from './pages/editor/EditorContent.jsx'
import EditorNotifications from './pages/editor/EditorNotifications.jsx'
import EditorAvailability from './pages/editor/EditorAvailability.jsx'
import EditorCampaigns from './pages/editor/EditorCampaigns.jsx'
import EditorLiveScheduling from './pages/editor/EditorLiveScheduling.jsx'
import EditorLiveHistory from './pages/editor/EditorLiveHistory.jsx'
import EditorPerks from './pages/editor/EditorPerks.jsx'
import EditorDiscounts from './pages/editor/EditorDiscounts.jsx'
import EditorAtonementTracking from './pages/editor/EditorAtonementTracking.jsx'
import { hasEditorPermission } from './utils/editorAccess.js'

function RequireAuth() {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function RequireRole({ role }) {
  const { currentUser } = useAuth()
  const { isSessionValid } = useEditor()

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

  if (role === ROLES.EDITOR && !isSessionValid(currentUser.editorId || currentUser.id)) {
    return <Navigate to="/editor/login" replace />
  }

  return <Outlet />
}

function RequireEditorPermission({ group, permission }) {
  const { currentUser } = useAuth()
  const { isSessionValid, currentEditor } = useEditor()
  if (!currentUser || currentUser.role !== ROLES.EDITOR) return <Navigate to="/editor/login" replace />
  return (isSessionValid(currentUser.editorId || currentUser.id) && hasEditorPermission(currentEditor || currentUser, group, permission)) ? <Outlet /> : <EditorAccessDenied />
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
        <Route path="/astrologer/perks-benefits" element={<Navigate to="/astrologer/perks-benefits/settings" replace />} />
        <Route path="/astrologer/perks-benefits/settings" element={<PerksAndBenefits defaultTab="settings" />} />
        <Route path="/astrologer/perks-benefits/delivery" element={<PerksAndBenefits defaultTab="delivery" />} />
        <Route path="/astrologer/perks-benefits/history" element={<PerksAndBenefits defaultTab="history" />} />
        <Route path="/astrologer/atonement" element={<Atonement />} />
        <Route path="/astrologer/campaigns" element={<Campaigns />} />
        <Route path="/astrologer/my-account" element={<AstrologerAccountManagement />} />
        <Route path="/astrologer/account/editors-assistants" element={<AstrologerAccountManagement />} />
        <Route path="/astrologer/wallet" element={<Navigate to="/astrologer/wallet/overview" replace />} />
        <Route path="/astrologer/wallet/overview" element={<WalletOverview />} />
        <Route path="/astrologer/wallet/earnings" element={<WalletEarnings />} />
        <Route path="/astrologer/wallet/transactions" element={<WalletTransactions />} />
        <Route path="/astrologer/wallet/withdraw" element={<WalletWithdraw />} />
        <Route path="/astrologer/wallet/settlements" element={<WalletSettlements />} />
        <Route path="/astrologer/wallet/payment-methods" element={<WalletPaymentMethods />} />
        <Route path="/astrologer/audience/:audienceType/:memberId" element={<AudienceMemberProfile />} />
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
          <Route path="scheduled" element={<ScheduledLive />} />
          <Route path="history" element={<LiveHistory />} />
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
        <Route path="/user/wallet-history" element={<UserWalletOverview />} />
        <Route path="/user/wallet" element={<Navigate to="/user/wallet/overview" replace />} />
        <Route path="/user/wallet/overview" element={<UserWalletOverview />} />
        <Route path="/user/wallet/transactions" element={<UserWalletTransactions />} />
        <Route path="/user/wallet/topups" element={<UserWalletTopUps />} />
        <Route path="/user/wallet/refunds" element={<UserWalletRefunds />} />
        <Route path="/user/purchase-package" element={<PurchasePackage />} />
        <Route path="/user/ask-question" element={<AskQuestion />} />
        <Route path="/user/track-questions" element={<TrackQuestions />} />
        <Route path="/user/raise-dispute" element={<RaiseDispute />} />
        <Route path="/user/chat-astrologers" element={<ChatAstrologers />} />
        <Route path="/user/astrologer/:astrologerId" element={<AstrologerProfile />} />
        <Route path="/user/astrologer/:astrologerId/reviews" element={<ReviewsRatings />} />
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
        <Route path="/user/rewards" element={<RewardsPerks />} />
        <Route path="/user/activity" element={<Activity />} />
        <Route path="/user/my-account" element={<MyAccount />} />
        <Route path="/user/horoscope" element={<FullHoroscope />} />
        <Route path="/user/profile" element={<Profile />} />
        <Route path="/user/appointment-details" element={<AppointmentDetails />} />
        <Route path="/user/appointments/book" element={<BookAppointment />} />
        <Route path="/user/appointments/book/:astrologerId" element={<BookAppointmentSlots />} />
        <Route path="/user/appointments/my" element={<MyAppointments />} />
        <Route path="/user/pooja-details" element={<PoojaDetails />} />
        <Route path="/user/live-session" element={<LiveSession />} />
        <Route path="/user/atonements" element={<Atonements />} />
        <Route path="/user/payment-methods" element={<PaymentMethods />} />
        <Route path="/user/payment-methods/add" element={<AddPaymentMethod />} />
        <Route path="/user/autopay" element={<Autopay />} />
        <Route path="/user/withdraw" element={<Withdraw />} />
        <Route path="/user/transaction-history" element={<TransactionHistory />} />
      </Route>
    </Route>
  )
}

function EditorRoutes() {
  return <>
    <Route path="/editor/accept-invitation/:inviteId" element={<AcceptInvitation />} />
    <Route path="/editor/login" element={<EditorLogin />} />
    <Route element={<RequireRole role={ROLES.EDITOR} />}>
      <Route element={<EditorLayout />}>
        <Route path="/editor" element={<Navigate to="/editor/dashboard" replace />} />
        <Route path="/editor/dashboard" element={<EditorDashboard />} />
        <Route path="/editor/access-denied" element={<EditorAccessDenied />} />
        <Route path="/editor/activity" element={<EditorActivity />} />
        <Route element={<RequireEditorPermission group="Availability" permission="View" />}><Route path="/editor/availability" element={<EditorAvailability />} /></Route>
        <Route element={<RequireEditorPermission group="Campaigns" permission="View" />}><Route path="/editor/campaigns" element={<EditorCampaigns />} /></Route>
        <Route element={<RequireEditorPermission group="Profile" permission="View" />}><Route path="/editor/profile" element={<EditorProfile />} /></Route>
        <Route element={<RequireEditorPermission group="Questions" permission="View" />}><Route path="/editor/questions" element={<EditorQuestions />} /></Route>
        <Route element={<RequireEditorPermission group="Appointments" permission="View" />}><Route path="/editor/appointments" element={<EditorAppointments />} /></Route>
        <Route element={<RequireEditorPermission group="Content" permission="View" />}><Route path="/editor/content" element={<EditorContent />} /></Route>
        <Route element={<RequireEditorPermission group="Live Events" permission="View" />}><Route path="/editor/live-scheduling" element={<EditorLiveScheduling />} /></Route>
        <Route element={<RequireEditorPermission group="Live Events" permission="View" />}><Route path="/editor/live-history" element={<EditorLiveHistory />} /></Route>
        <Route element={<RequireEditorPermission group="Perks" permission="View" />}><Route path="/editor/perks" element={<EditorPerks />} /></Route>
        <Route element={<RequireEditorPermission group="Discounts" permission="View" />}><Route path="/editor/discounts" element={<EditorDiscounts />} /></Route>
        <Route element={<RequireEditorPermission group="Atonements" permission="TrackProgress" />}><Route path="/editor/atonement-tracking" element={<EditorAtonementTracking />} /></Route>
        <Route element={<RequireEditorPermission group="Notifications" permission="View" />}><Route path="/editor/notifications" element={<EditorNotifications />} /></Route>
      </Route>
    </Route>
  </>
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

      {EditorRoutes()}

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
      <EditorProvider>
        <AppDataProvider>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
        </AppDataProvider>
      </EditorProvider>
    </AuthProvider>
  )
}

export default App
