import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  AlertOctagon,
  ShieldCheck,
  User,
  ExternalLink,
} from 'lucide-react'
import { supabase, isSupabaseConfigured, getPhotoPublicUrl } from '../lib/supabase'
import { TIERS } from '../lib/constants'

export default function Verify() {
  const { id } = useParams()
  const [worker, setWorker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)


  useEffect(() => {
    async function loadWorker() {
      if (!id) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const cleanCode = id.trim().toUpperCase()
      setLoading(true)
      setNotFound(false)

      try {
        if (!isSupabaseConfigured) {
          setNotFound(true)
          setLoading(false)
          return
        }

        // Call RPC get_public_worker (strictly limited to safe public fields)
        const { data, error } = await supabase.rpc('get_public_worker', {
          code: cleanCode,
        })

        if (error) {
          console.warn('RPC error, querying safe fields directly:', error)
          const { data: qData, error: qErr } = await supabase
            .from('workers')
            .select('worker_code, full_name, photo_path, tier, status, verified_at')
            .ilike('worker_code', cleanCode)
            .maybeSingle()

          if (qErr) throw new Error(qErr.message)
          if (!qData) {
            setNotFound(true)
          } else {
            setWorker(qData)
          }
        } else {
          const result = Array.isArray(data) ? data[0] : data
          if (!result || !result.worker_code) {
            setNotFound(true)
          } else {
            setWorker(result)
          }
        }
      } catch (err) {
        console.error('Verification query error:', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    loadWorker()
  }, [id])

  const photoUrl = worker ? getPhotoPublicUrl(worker.photo_path) : null
  const tierInfo = worker ? TIERS[worker.tier] || TIERS.silver : TIERS.silver

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Verifying Credential...</h2>
        <p className="text-sm text-gray-500 mt-1">Connecting to CaterCrew verification registry</p>
      </div>
    )
  }

  if (notFound || !worker) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <div className="inline-block bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
          Record Not Found
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          Invalid or Unknown ID
        </h1>
        <p className="text-gray-500 text-sm sm:text-base mt-2">
          No active catering staff was found with ID <strong className="font-mono text-gray-900">{id}</strong>.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center bg-gray-900 hover:bg-black text-white font-semibold py-3 px-6 rounded-xl text-base transition-colors"
          >
            Go to CaterCrew Home
          </Link>
        </div>
      </div>
    )
  }

  const isVerified = worker.status === 'verified'
  const isPending = worker.status === 'pending'
  const isSuspended = worker.status === 'suspended'

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-14">
      {/* Top CaterCrew verification seal */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Official Verification Registry</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Catering Staff Credential
        </h1>
      </div>

      {/* Main Verification Card */}
      <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm text-center">
        {/* BIG STATUS BADGE */}
        <div className="mb-6">
          {isVerified && (
            <div className="inline-flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="text-2xl sm:text-3xl font-black tracking-wider text-emerald-700 uppercase">
                VERIFIED
              </span>
              <span className="text-xs text-emerald-800 font-semibold mt-0.5">
                Authentic CaterCrew Staff
              </span>
            </div>
          )}

          {isPending && (
            <div className="inline-flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 shadow-inner">
                <Clock className="w-10 h-10" />
              </div>
              <span className="text-2xl sm:text-3xl font-black tracking-wider text-emerald-700 uppercase">
                PENDING
              </span>
              <span className="text-xs text-emerald-800 font-semibold mt-0.5">
                Verification in progress
              </span>
            </div>
          )}

          {isSuspended && (
            <div className="inline-flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2 shadow-inner">
                <AlertOctagon className="w-10 h-10" />
              </div>
              <span className="text-2xl sm:text-3xl font-black tracking-wider text-rose-600 uppercase">
                SUSPENDED
              </span>
              <span className="text-xs text-rose-800 font-semibold mt-0.5">
                Not active for events
              </span>
            </div>
          )}
        </div>

        {/* Worker Photograph */}
        <div className="mb-5 flex justify-center">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={worker.full_name}
              className="w-28 h-36 rounded-2xl object-cover border-4 border-emerald-500 shadow-sm bg-gray-50"
            />
          ) : (
            <div className="w-28 h-36 rounded-2xl border-4 border-emerald-300 bg-emerald-50 flex flex-col items-center justify-center text-emerald-700">
              <User className="w-12 h-12" />
            </div>
          )}
        </div>

        {/* Worker Full Name */}
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">
          {worker.full_name}
        </h2>

        {/* Worker Code & Tier Badges */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono font-bold text-sm">
            {worker.worker_code}
          </span>
          <span
            className={`px-3 py-1 rounded-xl font-bold text-xs border ${tierInfo.badgeClass}`}
          >
            {tierInfo.label}
          </span>
        </div>

        {/* Public-Safe Metadata Table */}
        <div className="border-t border-b border-gray-100 py-4 text-left text-sm space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Worker ID</span>
            <span className="font-mono font-bold text-gray-900">{worker.worker_code}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Staff Tier</span>
            <span className="font-semibold text-gray-900 capitalize">{worker.tier}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Verification Status</span>
            <span
              className={`font-bold capitalize ${
                isVerified ? 'text-emerald-700' : isSuspended ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {worker.status}
            </span>
          </div>

          {worker.verified_at && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Verified Date</span>
              <span className="font-semibold text-gray-900">
                {new Date(worker.verified_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Safety Note */}
        <p className="mt-4 text-xs text-gray-400 leading-normal">
          For privacy and data protection, personal phone numbers, home addresses, and government ID
          copies are restricted to event administrators.
        </p>

        {/* Action Link to Status */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Are you this staff member?</span>
          <Link
            to={`/status/${encodeURIComponent(worker.worker_code)}`}
            className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
          >
            <span>Open staff status page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
