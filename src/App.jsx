import { Navigate, Outlet, Route, BrowserRouter, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { AppDataProvider } from './state/AppDataContext.jsx'
import { AuthProvider, useAuth } from './state/AuthContext.jsx'
import { ThemeProvider } from './state/ThemeContext.jsx'
import { getRoleRoutes, ROLES } from './utils/roleRoutes.js'
import Login from './pages/Login.jsx'
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
import WalletHistory from './pages/WalletHistory.jsx'
import AstrologerProfile from './pages/AstrologerProfile.jsx'
import Astrologers from './pages/Astrologers.jsx'
import DiscountQuestions from './pages/DiscountQuestions.jsx'
import Rewards from './pages/Rewards.jsx'
import Profile from './pages/Profile.jsx'
import AppointmentDetails from './pages/AppointmentDetails.jsx'
import PoojaDetails from './pages/PoojaDetails.jsx'
import LiveSession from './pages/LiveSession.jsx'

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
    return <Navigate to={getRoleRoutes(currentUser.role).dashboard} replace />
  }
  return <Outlet />
}

function NotFoundRedirect() {
  const { currentUser } = useAuth()
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={getRoleRoutes(currentUser.role).dashboard} replace />
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
        <Route path="/astrologer/wallet-history" element={<WalletHistory />} />
        <Route path="/astrologer/purchase-package" element={<PurchasePackage />} />
        <Route path="/astrologer/answer-question" element={<AnswerQuestion />} />
        <Route path="/astrologer/dispute-management" element={<DisputeManagement />} />
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
        <Route path="/user/purchase-package" element={<PurchasePackage />} />
        <Route path="/user/ask-question" element={<AskQuestion />} />
        <Route path="/user/track-questions" element={<TrackQuestions />} />
        <Route path="/user/raise-dispute" element={<RaiseDispute />} />
        <Route path="/user/astrologer-profile" element={<AstrologerProfile />} />
        <Route path="/user/astrologers" element={<Astrologers />} />
        <Route path="/user/discount-questions" element={<DiscountQuestions />} />
        <Route path="/user/rewards" element={<Rewards />} />
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
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        {AstrologerRoutes()}
        {UserRoutes()}
      </Route>

      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
  )
}

function App() {
  return (
    <AppDataProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </AppDataProvider>
  )
}

export default App
