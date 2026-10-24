import { Link } from 'react-router-dom'
import { BrandWithChefHat } from './ChefHatLogo'

const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white py-8 px-4 text-center text-sm text-gray-500">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandWithChefHat size="text-xl sm:text-2xl" />
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
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-400">
        &copy; {CURRENT_YEAR} CaterCrew. Professional Staff Verification.
      </p>
    </footer>
  )
}
