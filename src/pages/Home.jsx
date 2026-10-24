import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Search, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'

export default function Home() {
  const [verifyId, setVerifyId] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleVerifySubmit = (e) => {
    e.preventDefault()
    const cleaned = verifyId.trim()
    if (!cleaned) {
      setError('Please enter a valid CaterCrew ID (e.g. CC-SLV-000001)')
      return
    }
    setError('')
    navigate(`/verify/${cleaned.toUpperCase()}`)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16 text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium mb-6">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
        <span>Kerala Catering Staff Verification Portal</span>
      </div>

      {/* CaterCrew Logo */}
      <div className="flex justify-center mb-4">
        <img
          src="/catercrew-logo.jpg"
          alt="CaterCrew"
          className="h-16 sm:h-20 w-auto object-contain"
          style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(100deg)' }}
        />
      </div>

      {/* Main Brand & Heading */}
      <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-tight">
        Cater<span className="text-emerald-600">Crew</span>
      </h1>

      {/* One-line Description */}
      <p className="mt-4 text-xl sm:text-2xl text-gray-600 font-normal max-w-2xl mx-auto leading-relaxed">
        Connecting event companies with verified catering staff across Kerala.
      </p>

      {/* Primary Action Button (Big & Prominent) */}
      <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
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

      {/* Verify a Certificate Box */}
      <div className="mt-12 sm:mt-16 bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 max-w-xl mx-auto text-left shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-gray-900 font-bold text-lg sm:text-xl">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <span>Verify a Certificate</span>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Enter the CaterCrew worker ID printed on the certificate or ID card to confirm authenticity.
        </p>

        <form onSubmit={handleVerifySubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={verifyId}
              onChange={(e) => {
                setVerifyId(e.target.value)
                if (error) setError('')
              }}
              placeholder="e.g. CC-SLV-000001"
              className="flex-1 px-4 py-3.5 text-base sm:text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-600 font-mono uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
            />
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold text-base py-3.5 px-6 rounded-xl transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Verify</span>
            </button>
          </div>

          {error && <p className="text-rose-600 text-xs sm:text-sm font-medium">{error}</p>}
        </form>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Already submitted an application?</span>
          <Link
            to={`/status${verifyId ? `/${verifyId.trim()}` : ''}`}
            className="text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            Check your registration status &rarr;
          </Link>
        </div>
      </div>

      {/* 3 Quick Features */}
      <div className="mt-14 sm:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-3xl mx-auto">
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
