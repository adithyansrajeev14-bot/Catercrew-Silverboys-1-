import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Search,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Download,
  Copy,
  Check,
  ExternalLink,
  User,
} from 'lucide-react'
import { supabase, isSupabaseConfigured, getPhotoPublicUrl } from '../lib/supabase'
import { generateCertificate } from '../lib/certificate'
import { TIERS, STATUS_CONFIG } from '../lib/constants'

export default function Status() {
  const { id: paramId } = useParams()
  const navigate = useNavigate()

  const [inputCode, setInputCode] = useState(paramId || '')
  const [loading, setLoading] = useState(false)
  const [worker, setWorker] = useState(null)
  const [searchedCode, setSearchedCode] = useState(paramId || '')
  const [notFound, setNotFound] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const fetchWorkerStatus = useCallback(async (codeToSearch) => {
    const code = codeToSearch.trim().toUpperCase()
    if (!code) return

    setLoading(true)
    setErrorMsg('')
    setNotFound(false)
    setWorker(null)
    setSearchedCode(code)

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Database is not connected. Please connect Supabase to look up real staff records.')
      }

      // Call security definer RPC function get_public_worker
      const { data, error } = await supabase.rpc('get_public_worker', {
        code: code,
      })

      if (error) {
        console.warn('RPC get_public_worker failed, attempting query:', error)
        // Fallback query if RPC isn't deployed
        const { data: qData, error: qErr } = await supabase
          .from('workers')
          .select('worker_code, full_name, photo_path, tier, status, verified_at')
          .ilike('worker_code', code)
          .maybeSingle()

        if (qErr) {
          throw new Error(qErr.message)
        }

        if (!qData) {
          setNotFound(true)
        } else {
          setWorker(qData)
        }
      } else {
        // RPC get_public_worker returns a table/array
        const result = Array.isArray(data) ? data[0] : data
        if (!result || !result.worker_code) {
          setNotFound(true)
        } else {
          setWorker(result)
        }
      }
    } catch (err) {
      console.error('Error fetching worker status:', err)
      setErrorMsg(err.message || 'Unable to check status at this time.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (paramId) {
      const timer = setTimeout(() => {
        fetchWorkerStatus(paramId)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [paramId, fetchWorkerStatus])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!inputCode.trim()) return
    navigate(`/status/${inputCode.trim().toUpperCase()}`)
  }

  const handleCopyLink = () => {
    if (!worker) return
    const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(worker.worker_code)}`
    navigator.clipboard.writeText(verifyUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleDownloadCertificate = async () => {
    if (!worker || worker.status !== 'verified') return
    try {
      setDownloadingPdf(true)
      await generateCertificate(worker)
    } catch (err) {
      console.error('Failed to generate certificate:', err)
      alert(err.message || 'Failed to generate certificate.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const photoUrl = worker ? getPhotoPublicUrl(worker.photo_path) : null
  const tierInfo = worker ? TIERS[worker.tier] || TIERS.silver : TIERS.silver
  const statusInfo = worker ? STATUS_CONFIG[worker.status] || STATUS_CONFIG.pending : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-14">
      {/* Search Header Box */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Registration Status
        </h1>
        <p className="text-gray-500 mt-2 text-base">
          Check your verification progress or download your official certificate.
        </p>
      </div>

      {/* ID Lookup Form */}
      <form onSubmit={handleSearchSubmit} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Enter Worker ID (e.g. CC-SLV-000001)"
            className="flex-1 px-4 py-3.5 text-base sm:text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-600 font-mono uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-base py-3.5 px-6 rounded-2xl transition-colors cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Check Status</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Loading Indicator */}
      {loading && (
        <div className="p-12 text-center text-gray-500">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Fetching registration records...</p>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Not Found Screen */}
      {notFound && !loading && (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center">
          <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">No Record Found</h2>
          <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
            We could not find any registration matching{' '}
            <strong className="font-mono text-gray-900">{searchedCode}</strong>. Please check for typos
            or register as a new Silver Boy.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <span>Register as Silver Boy</span>
            </Link>
          </div>
        </div>
      )}

      {/* Status Result Card */}
      {worker && !loading && (
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Top Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
            <div className="flex items-center gap-4">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={worker.full_name}
                  className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl object-cover border-2 border-emerald-500 bg-gray-100 shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex flex-col items-center justify-center text-emerald-700 shrink-0">
                  <User className="w-8 h-8" />
                </div>
              )}
              <div>
                <span className="font-mono text-xs sm:text-sm font-bold text-emerald-700 tracking-wider">
                  {worker.worker_code}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-0.5">
                  {worker.full_name}
                </h2>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${tierInfo.badgeClass}`}
                  >
                    {tierInfo.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Pill */}
            <div className="self-start sm:self-center">
              {worker.status === 'verified' && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified</span>
                </span>
              )}
              {worker.status === 'pending' && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-sm">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Pending Review</span>
                </span>
              )}
              {worker.status === 'suspended' && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-bold text-sm">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>Suspended</span>
                </span>
              )}
            </div>
          </div>

          {/* Status Details Box */}
          <div
            className={`p-5 rounded-2xl border ${
              worker.status === 'verified'
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : worker.status === 'suspended'
                ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            }`}
          >
            <p className="font-semibold text-base">
              {worker.status === 'verified' && 'Verification Complete'}
              {worker.status === 'pending' && 'Application Under Review'}
              {worker.status === 'suspended' && 'Registration Inactive'}
            </p>
            <p className="text-sm mt-1 opacity-90 leading-relaxed">
              {statusInfo?.description}
            </p>
            {worker.status === 'verified' && worker.verified_at && (
              <p className="text-xs mt-2 text-emerald-800 font-medium">
                Verified Date:{' '}
                {new Date(worker.verified_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* ACTIONS WHEN VERIFIED */}
          {worker.status === 'verified' && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Staff Actions
              </h3>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Download Certificate PDF */}
                <button
                  type="button"
                  onClick={handleDownloadCertificate}
                  disabled={downloadingPdf}
                  className="flex-1 inline-flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl text-base shadow-sm transition-colors cursor-pointer"
                >
                  {downloadingPdf ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating Certificate...
                    </span>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Download Certificate (PDF)</span>
                    </>
                  )}
                </button>

                {/* Copy Verification Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-semibold py-4 px-6 rounded-2xl text-base transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-5 h-5 text-emerald-600" />
                      <span className="text-emerald-700">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Copy Verification Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* View Public Verification Link */}
              <div className="pt-2">
                <Link
                  to={`/verify/${encodeURIComponent(worker.worker_code)}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <span>View Public Verification Badge Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* ACTIONS WHEN PENDING */}
          {worker.status === 'pending' && (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs sm:text-sm text-gray-500 space-y-1">
              <p className="font-semibold text-gray-700">What happens next?</p>
              <p>
                1. CaterCrew administrators review your uploaded ID proof and phone credentials.
              </p>
              <p>
                2. Once approved, your status will change to <strong>Verified</strong> and your official
                downloadable certificate with QR code will become active here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
