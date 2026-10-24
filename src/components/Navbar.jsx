import { Link, useLocation } from 'react-router-dom'
import { ShieldCheck, UserPlus } from 'lucide-react'

export default function Navbar() {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          {location.pathname !== '/register' ? (
            <img
              src="/catercrew-logo.jpg"
              alt="CaterCrew"
              className="h-10 sm:h-12 w-auto object-contain brightness-[50] invert saturate-[3] hue-rotate-[100deg] group-hover:opacity-80 transition-opacity"
              style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(100deg)' }}
            />
          ) : (
            <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight group-hover:text-emerald-700 transition-colors">
              Cater<span className="text-emerald-600">Crew</span>
            </span>
          )}
          <span className="text-[10px] tracking-wider uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
            Silver
          </span>
        </Link>

        {/* Navigation Actions */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/register"
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm sm:text-base font-medium transition-all duration-150 flex items-center gap-1.5 ${
              isActive('/register')
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'text-gray-700 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden xs:inline">Register</span>
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
