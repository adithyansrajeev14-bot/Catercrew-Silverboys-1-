import { Link, useLocation } from 'react-router-dom'
import { ShieldCheck, UserPlus, Home as HomeIcon } from 'lucide-react'

export default function Navbar() {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-end">
        {/* Navigation Actions on the right - CaterCrew removed from top left as requested */}
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm sm:text-base font-medium transition-all duration-150 flex items-center gap-1.5 ${
              isActive('/')
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'
            }`}
          >
            <HomeIcon className="w-4 h-4" />
            <span>Home</span>
          </Link>

          <Link
            to="/register"
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm sm:text-base font-medium transition-all duration-150 flex items-center gap-1.5 ${
              isActive('/register')
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'text-gray-700 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Register</span>
          </Link>

          <Link
            to="/status"
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm sm:text-base font-medium transition-all duration-150 flex items-center gap-1.5 ${
              location.pathname.startsWith('/status') || location.pathname.startsWith('/verify')
                ? 'bg-emerald-100 text-emerald-900 font-semibold'
                : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
