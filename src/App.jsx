import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Register from './pages/Register'
import Status from './pages/Status'
import Verify from './pages/Verify'
import Admin from './pages/Admin'
import EventReport from './pages/EventReport'

// Events & Company & Auth Pages
import Login from './pages/Login'
import Signup from './pages/Signup'
import AuthCallback from './pages/AuthCallback'
import Events from './pages/Events'
import EventDetails from './pages/EventDetails'
import MyBookings from './pages/MyBookings'
import CompanySetup from './pages/CompanySetup'
import CompanyDashboard from './pages/CompanyDashboard'
import PostEvent from './pages/PostEvent'
import CompanyManageEvent from './pages/CompanyManageEvent'

import { useEffect } from 'react'

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()

  // Catch OAuth redirects that landed on the root or other routes with access_token or code
  useEffect(() => {
    const hasHashToken = window.location.hash.includes('access_token=')
    const hasCodeParam = window.location.search.includes('code=')
    if ((hasHashToken || hasCodeParam) && !location.pathname.startsWith('/auth/callback')) {
      navigate(`/auth/callback${window.location.search}${window.location.hash}`, { replace: true })
    }
  }, [location.pathname, navigate])

  // Keep event report page confidential to event companies and CaterCrew — no public navbar
  const isEventReportPage =
    location.pathname.startsWith('/event-report') ||
    location.pathname.startsWith('/report') ||
    location.pathname.startsWith('/r/')

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 selection:bg-emerald-100 selection:text-emerald-900">
      {!isEventReportPage && <Navbar />}
      <main className="flex-1">
        <Routes>
          {/* Core Silver Boy Pages */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/status" element={<Status />} />
          <Route path="/status/:id" element={<Status />} />
          <Route path="/verify/:id" element={<Verify />} />

          {/* Auth Flow */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Events Subsystem */}
          <Route path="/events" element={<Events />} />
          <Route path="/event" element={<Navigate to="/events" replace />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/my-bookings" element={<MyBookings />} />

          {/* Company Portal */}
          <Route path="/company/setup" element={<CompanySetup />} />
          <Route path="/company/dashboard" element={<CompanyDashboard />} />
          <Route path="/company/events/new" element={<PostEvent />} />
          <Route path="/company/events/:id" element={<CompanyManageEvent />} />
          <Route path="/company/events/:id/edit" element={<PostEvent />} />

          {/* Administration & Internal */}
          <Route path="/adminaccess" element={<Admin />} />
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/r/:reportId" element={<EventReport />} />
          <Route path="/report/:reportId" element={<EventReport />} />
          <Route path="/event-report/:reportId" element={<EventReport />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}
