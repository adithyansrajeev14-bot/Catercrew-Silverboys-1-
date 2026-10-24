import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Register from './pages/Register'
import Status from './pages/Status'
import Verify from './pages/Verify'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-white text-gray-900 selection:bg-emerald-100 selection:text-emerald-900">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/status" element={<Status />} />
            <Route path="/status/:id" element={<Status />} />
            <Route path="/verify/:id" element={<Verify />} />
            <Route path="/adminaccess" element={<Admin />} />
            <Route path="/admin" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
