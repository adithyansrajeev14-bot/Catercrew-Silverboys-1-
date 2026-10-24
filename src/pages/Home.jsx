import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-20 text-center">
      {/* CaterCrew Official Brand Logo Image */}
      <div className="mb-4 sm:mb-6 flex justify-center">
        <img
          src="/logo.png"
          alt="CaterCrew - Find it. Work it. Earn it."
          className="w-full max-w-sm sm:max-w-md md:max-w-lg h-auto object-contain mx-auto"
        />
      </div>

      {/* One-line Description */}
      <p className="mt-6 text-xl sm:text-2xl text-gray-600 font-normal max-w-2xl mx-auto leading-relaxed">
        Connecting event companies with verified catering staff across Kerala.
      </p>

      {/* Primary Action Button (Big & Prominent) */}
      <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          to="/register"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-lg sm:text-xl py-4 px-8 rounded-2xl shadow-sm hover:shadow transition-all duration-150"
        >
          <span>Register as Silver Boy</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Sub-text info */}
      <p className="mt-3 text-sm text-gray-400">
        Takes under 2 minutes • Free registration • No login required
      </p>

      {/* 3 Quick Features */}
      <div className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-3xl mx-auto">
        <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-base mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Verified Staff</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            Every catering boy is verified with photo, contact, and background vetting.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-base mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Digital Certificate</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            Downloadable official PDF certificate equipped with tamper-proof QR code.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-base mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Tier Progression</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            Start as Silver Boy, build reputation, and upgrade to Golden and Diamond tiers.
          </p>
        </div>
      </div>
    </div>
  )
}
