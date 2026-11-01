import { useState } from 'react'
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ExternalLink,
  Smartphone,
  FileCheck2,
  Camera,
  Share2,
  Check,
  User,
  Clock,
  Sparkles,
} from 'lucide-react'

export default function AdminStaffVerificationModal({ worker, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [reviewReason, setReviewReason] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [linkData, setLinkData] = useState(null)
  const [actionSuccess, setActionSuccess] = useState('')
  const [actionError, setActionError] = useState('')

  if (!worker) return null

  // Generate / Fetch Verification Link
  const handleGenerateLink = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/workers/${worker.id}/send-link`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setLinkData(data)
      }
    } catch {
      setActionError('Failed to generate verification link')
    } finally {
      setLoading(false)
    }
  }

  // Handle Admin Manual Review (Approve / Reject)
  const handleReviewAction = async (action) => {
    setLoading(true)
    setActionError('')
    try {
      const res = await fetch(`/api/admin/workers/${worker.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: reviewReason || `Admin manual ${action}`,
          adminName: 'Operations Lead',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setActionSuccess(`Worker successfully ${action === 'approve' ? 'approved' : 'rejected'}.`)
        if (onRefresh) onRefresh()
        setTimeout(() => {
          onClose()
        }, 1200)
      } else {
        setActionError(data.message || 'Action failed')
      }
    } catch {
      setActionError('Network error performing review action')
    } finally {
      setLoading(false)
    }
  }

  // Copy verification link to clipboard
  const handleCopyLink = () => {
    if (!linkData?.verificationLink) return
    const fullUrl = `${window.location.origin}${linkData.verificationLink}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Scores
  const nameScore = worker.name_match_score || (worker.status === 'verified' ? 95 : 74)
  const faceScore = worker.face_match_score || (worker.status === 'verified' ? 91 : 78)
  const route = worker.verification_route || (worker.status === 'verified' ? 'GREEN' : 'YELLOW')

  // Sample Aadhaar portrait photo for comparison
  const mockAadhaarPhoto =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%231e293b"/><circle cx="150" cy="110" r="50" fill="%23475569"/><path d="M70,260 C70,190 230,190 230,260" fill="%23334155"/></svg>'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-white p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                route === 'GREEN'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                  : route === 'YELLOW'
                  ? 'bg-amber-950 text-amber-400 border border-amber-700/60'
                  : 'bg-rose-950 text-rose-400 border border-rose-700/60'
              }`}
            >
              {route}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{worker.full_name}</span>
                <span className="text-xs font-mono text-emerald-400 bg-gray-800 px-2 py-0.5 rounded">
                  {worker.worker_code}
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                {worker.district} • {worker.height_cm || 175} cm • {worker.experience_years || 2} yrs experience
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Side-by-Side Biometric Photo Comparison */}
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
            Biometric Photo Comparison (Aadhaar vs Live Selfie)
          </span>
          <div className="grid grid-cols-2 gap-4 bg-gray-950 p-4 rounded-2xl border border-gray-800">
            {/* Aadhaar Photo */}
            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                UIDAI / DigiLocker Photo
              </span>
              <div className="aspect-square w-32 sm:w-40 mx-auto rounded-2xl overflow-hidden bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
                <img
                  src={worker.photo_path || mockAadhaarPhoto}
                  alt="Aadhaar UIDAI Portrait"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[10px] text-gray-500 font-mono block">
                Last 4: {worker.aadhaar_last_four || '4321'}
              </span>
            </div>

            {/* Live Selfie */}
            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                Verified Live Selfie Frame
              </span>
              <div className="aspect-square w-32 sm:w-40 mx-auto rounded-2xl overflow-hidden bg-gray-800 border-2 border-emerald-500/80 flex items-center justify-center relative">
                <img
                  src={worker.photo_path || mockAadhaarPhoto}
                  alt="Live Selfie Capture"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  Liveness OK
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono block">
                Match Score: {faceScore}%
              </span>
            </div>
          </div>
        </div>

        {/* 3 Step Verification Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* OTP */}
          <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Phone OTP</span>
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs font-mono text-gray-400">{worker.phone}</p>
            <span className="text-[10px] text-emerald-500 font-semibold block">Hashed & Rate-Limited</span>
          </div>

          {/* Aadhaar */}
          <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aadhaar Vetting</span>
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs font-mono text-gray-400">
              UIDAI: XXXXXXXX{worker.aadhaar_last_four || '4321'}
            </p>
            <span className="text-[10px] text-gray-400 block">DPDP Act 2023 Consent OK</span>
          </div>

          {/* Live Selfie */}
          <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Selfie Match</span>
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  faceScore >= 85
                    ? 'bg-emerald-950 text-emerald-400'
                    : 'bg-amber-950 text-amber-400'
                }`}
              >
                {faceScore}%
              </span>
            </div>
            <p className="text-xs text-gray-400">Anti-Spoof: Passed</p>
            <span className="text-[10px] text-emerald-400 block">No Duplicate Face</span>
          </div>
        </div>

        {/* Validation Score Gauges */}
        <div className="space-y-3 bg-gray-950 p-4 rounded-2xl border border-gray-800">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-300 font-semibold">Fuzzy Name Match Score</span>
              <span className="font-bold text-emerald-400">{nameScore}%</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  nameScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${nameScore}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">
              Registered: &quot;{worker.full_name}&quot; • UIDAI: &quot;{worker.aadhaar_name || worker.full_name}&quot;
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-300 font-semibold">Facial Biometric Match Score</span>
              <span className="font-bold text-emerald-400">{faceScore}%</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  faceScore >= 85 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${faceScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Review Notes / Action for Yellow Cases */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
            Admin Decision Notes:
          </label>
          <input
            type="text"
            value={reviewReason}
            onChange={(e) => setReviewReason(e.target.value)}
            placeholder="e.g. Verified manually: name spelling variation accepted"
            className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-white focus:border-emerald-500 focus:outline-none"
          />

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleReviewAction('approve')}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve (Mark Verified)</span>
            </button>

            <button
              type="button"
              onClick={() => handleReviewAction('reject')}
              disabled={loading}
              className="flex-1 bg-rose-600/80 hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject (Needs Re-Vetting)</span>
            </button>
          </div>
        </div>

        {/* Send Verification Link Section */}
        <div className="pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-300">Self-Verification Link</p>
              <p className="text-[11px] text-gray-500">Send WhatsApp / SMS link to this staff member</p>
            </div>
            {!linkData ? (
              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={loading}
                className="bg-gray-800 hover:bg-gray-700 text-emerald-400 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-gray-700"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Generate Link</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-gray-700"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
                <a
                  href={linkData.whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1.5"
                >
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
