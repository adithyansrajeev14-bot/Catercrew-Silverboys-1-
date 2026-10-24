import { Link, useLocation } from 'react-router-dom'

const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  const location = useLocation()

  return (
    <footer className="mt-auto border-t border-gray-100 bg-white py-8 px-4 text-center text-sm text-gray-500">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {location.pathname !== '/register' ? (
            <img
              src="/catercrew-logo.jpg"
              alt="CaterCrew"
              className="h-8 w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(100deg)' }}
            />
          ) : (
            <span className="font-extrabold text-base text-gray-900 tracking-tight">
              Cater<span className="text-emerald-600">Crew</span>
            </span>
          )}
          <span className="text-gray-300">•</span>
          <span>Kerala Catering Staff Network</span>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <Link to="/" className="hover:text-emerald-600 transition-colors">
            Home
          </Link>
          <Link to="/register" className="hover:text-emerald-600 transition-colors">
            Register
          </Link>
          <Link to="/status" className="hover:text-emerald-600 transition-colors">
            Check Status
          </Link>
          <Link to="/admin" className="text-gray-400 hover:text-emerald-600 transition-colors">
            Admin
          </Link>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-400">
        &copy; {CURRENT_YEAR} CaterCrew. Professional Silver Staff Verification.
      </p>
    </footer>
  )
}
