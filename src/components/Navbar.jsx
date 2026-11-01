import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  UserPlus,
  Home as HomeIcon,
  Calendar,
  LogIn,
  LogOut,
  ChevronDown,
  Briefcase,
  Building2,
  ShieldAlert,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, role, profile, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close menus on route change
  useEffect(() => {
    setDropdownOpen(false)
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await signOut()
    setDropdownOpen(false)
    navigate('/')
  }

  // Display name for logged in user
  const displayName =
    profile?.company_name ||
    profile?.name ||
    (role === 'admin' ? 'Admin' : user?.email?.split('@')[0] || 'My Account')

  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Top-Left: CaterCrew Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <picture>
            <source srcSet="/logo.webp" type="image/webp" />
            <img
              src="/logo.png"
              alt="CaterCrew"
              className="h-8 sm:h-10 w-auto object-contain transition-transform group-hover:scale-102"
            />
          </picture>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          <Link
            to="/"
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-1.5 ${
              isActive('/')
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'
            }`}
          >
            <HomeIcon className="w-4 h-4" />
            <span>Home</span>
          </Link>

          <Link
            to="/events"
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-1.5 ${
              isActive('/events')
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Events</span>
          </Link>

          <Link
            to="/register"
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-1.5 ${
              isActive('/register')
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Register</span>
          </Link>

          <Link
            to="/status"
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-1.5 ${
              isActive('/status') || isActive('/verify')
                ? 'bg-emerald-100 text-emerald-900 font-semibold'
                : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify</span>
          </Link>
        </nav>

        {/* Right Auth Area (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {!user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Login / Sign up</span>
              </Link>
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100/70 text-emerald-900 font-semibold text-sm px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                {role === 'company' ? (
                  <Building2 className="w-4 h-4 text-emerald-700" />
                ) : role === 'admin' ? (
                  <ShieldAlert className="w-4 h-4 text-emerald-700" />
                ) : (
                  <Briefcase className="w-4 h-4 text-emerald-700" />
                )}
                <span className="max-w-[150px] truncate">{displayName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              </button>

              {/* User Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Signed in as</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                    {role && (
                      <span className="inline-block mt-1 text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {role === 'worker' ? 'Catering Boy' : role === 'company' ? 'Event Company' : 'Admin'}
                      </span>
                    )}
                  </div>

                  {role === 'worker' && (
                    <>
                      <Link
                        to="/events"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                      >
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span>Find Events</span>
                      </Link>
                      <Link
                        to="/my-bookings"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                      >
                        <Briefcase className="w-4 h-4 text-emerald-600" />
                        <span>My Bookings</span>
                      </Link>
                    </>
                  )}

                  {role === 'company' && (
                    <>
                      <Link
                        to="/company/dashboard"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                      >
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <span>Company Dashboard</span>
                      </Link>
                      <Link
                        to="/company/events/new"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                      >
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span>Post New Event</span>
                      </Link>
                    </>
                  )}

                  {role === 'admin' && (
                    <Link
                      to="/adminaccess"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                    >
                      <ShieldAlert className="w-4 h-4 text-emerald-600" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}

                  <div className="border-t border-gray-100 my-1" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          {!user ? (
            <Link
              to="/login"
              className="bg-emerald-600 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs"
            >
              Login
            </Link>
          ) : (
            <Link
              to={role === 'company' ? '/company/dashboard' : role === 'admin' ? '/adminaccess' : '/my-bookings'}
              className="bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs px-2.5 py-1.5 rounded-lg truncate max-w-[120px]"
            >
              {displayName}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-md">
          <Link
            to="/"
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-medium text-base ${
              isActive('/') ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <HomeIcon className="w-5 h-5 text-emerald-600" />
            <span>Home</span>
          </Link>

          <Link
            to="/events"
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-medium text-base ${
              isActive('/events') ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-5 h-5 text-emerald-600" />
            <span>Events (Catering Gigs)</span>
          </Link>

          <Link
            to="/register"
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-medium text-base ${
              isActive('/register') ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <UserPlus className="w-5 h-5 text-emerald-600" />
            <span>Register as Silver Boy</span>
          </Link>

          <Link
            to="/status"
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-medium text-base ${
              isActive('/status') || isActive('/verify') ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Verify Worker ID</span>
          </Link>

          {user && (
            <div className="pt-2 border-t border-gray-100 mt-2 space-y-2">
              <div className="px-4 py-1 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Account: {displayName}
              </div>

              {role === 'worker' && (
                <Link
                  to="/my-bookings"
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-emerald-800 bg-emerald-50"
                >
                  <Briefcase className="w-5 h-5 text-emerald-600" />
                  <span>My Bookings</span>
                </Link>
              )}

              {role === 'company' && (
                <>
                  <Link
                    to="/company/dashboard"
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-emerald-800 bg-emerald-50"
                  >
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <span>Company Dashboard</span>
                  </Link>
                  <Link
                    to="/company/events/new"
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-emerald-800 bg-emerald-50"
                  >
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <span>Post New Event</span>
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <Link
                  to="/adminaccess"
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-gray-800 bg-gray-100"
                >
                  <ShieldAlert className="w-5 h-5 text-emerald-600" />
                  <span>Admin Dashboard</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {!user && (
            <div className="pt-2 border-t border-gray-100 mt-2">
              <Link
                to="/login"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-base shadow-sm"
              >
                <LogIn className="w-5 h-5" />
                <span>Login / Sign up</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
