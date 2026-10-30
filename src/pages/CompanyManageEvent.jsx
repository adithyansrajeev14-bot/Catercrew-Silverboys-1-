import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Phone,
  MessageCircle,
  UserX,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Edit,
  Trash2,
  RefreshCw,
  Printer,
  ShieldCheck
} from 'lucide-react'
import { supabase, isSupabaseConfigured, getPhotoPublicUrl } from '../lib/supabase'
import { formatCurrency, formatEventDate, formatEventTime } from '../lib/formatters'
import { useAuth } from '../context/AuthContext'

export default function CompanyManageEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isCompany, companyProfile } = useAuth()

  const [eventData, setEventData] = useState(null)
  const [bookedBoys, setBookedBoys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Remove boy modal
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [removeReason, setRemoveReason] = useState('')
  const [removeLoading, setRemoveLoading] = useState(false)

  // Status update
  const [statusLoading, setStatusLoading] = useState(false)

  const fetchEventAndBoys = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (!isSupabaseConfigured) {
        setEventData({
          id: id || 'demo-1',
          title: 'Grand Royal Wedding Reception',
          event_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
          start_time: '17:00:00',
          end_time: '23:00:00',
          report_time: '16:00:00',
          venue_name: 'Cochin Palace Auditorium',
          district: 'Ernakulam',
          area: 'Edappally',
          wage_per_boy: 1200,
          boys_needed: 15,
          boys_booked: 2,
          status: 'active',
        })
        setBookedBoys([
          {
            booking_id: 'b-demo-1',
            booking_status: 'confirmed',
            booked_at: new Date().toISOString(),
            worker_id: 'w-1',
            worker_code: 'CC-SLV-000001',
            full_name: 'Adarsh S',
            phone: '+91 98461 23450',
            district: 'Ernakulam',
            height_cm: 175,
            experience_years: 2,
            age: 23,
            photo_path: null,
          },
          {
            booking_id: 'b-demo-2',
            booking_status: 'confirmed',
            booked_at: new Date().toISOString(),
            worker_id: 'w-2',
            worker_code: 'CC-SLV-000002',
            full_name: 'Vishnu Prasad',
            phone: '+91 97452 34561',
            district: 'Ernakulam',
            height_cm: 178,
            experience_years: 3,
            age: 24,
            photo_path: null,
          },
        ])
        setLoading(false)
        return
      }

      // Query event
      const { data: ev, error: evErr } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

      if (evErr) throw evErr
      setEventData(ev)

      // Query booked boys via RPC
      const { data: boys, error: boysErr } = await supabase.rpc('get_event_booked_workers', {
        p_event_id: id,
      })

      if (boysErr) {
        console.warn('RPC get_event_booked_workers error, trying join:', boysErr)
        // Fallback join
        const { data: rawBookings } = await supabase
          .from('bookings')
          .select('id, status, created_at, workers(*)')
          .eq('event_id', id)
          .eq('status', 'confirmed')

        if (rawBookings) {
          const mapped = rawBookings.map((b) => ({
            booking_id: b.id,
            booking_status: b.status,
            booked_at: b.created_at,
            worker_id: b.workers?.id,
            worker_code: b.workers?.worker_code,
            full_name: b.workers?.full_name,
            phone: b.workers?.phone,
            district: b.workers?.district,
            height_cm: b.workers?.height_cm,
            experience_years: b.workers?.experience_years,
            photo_path: b.workers?.photo_path,
          }))
          setBookedBoys(mapped)
        }
      } else {
        setBookedBoys(boys || [])
      }
    } catch (err) {
      console.error('Error fetching event or booked boys:', err)
      setError('Failed to load event details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchEventAndBoys()
  }, [fetchEventAndBoys])

  // Update status (e.g. mark full, cancel event)
  const handleUpdateStatus = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to change the event status to "${newStatus}"?`)) {
      return
    }
    setStatusLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { error: updErr } = await supabase
          .from('events')
          .update({ status: newStatus })
          .eq('id', id)

        if (updErr) throw updErr
      }
      setEventData((prev) => ({ ...prev, status: newStatus }))
    } catch (err) {
      alert(`Error updating event status: ${err.message}`)
    } finally {
      setStatusLoading(false)
    }
  }

  // Remove boy
  const handleRemoveBoy = async () => {
    if (!selectedBooking) return
    setRemoveLoading(true)
    try {
      if (!isSupabaseConfigured) {
        setBookedBoys((prev) => prev.filter((b) => b.booking_id !== selectedBooking.booking_id))
        setSelectedBooking(null)
        setRemoveLoading(false)
        return
      }

      const { data, error: rErr } = await supabase.rpc('company_remove_worker', {
        p_booking_id: selectedBooking.booking_id,
        p_reason: removeReason || 'Removed by event organizer',
      })

      if (rErr) throw rErr

      setSelectedBooking(null)
      setRemoveReason('')
      await fetchEventAndBoys()
    } catch (err) {
      alert(`Could not remove worker: ${err.message}`)
    } finally {
      setRemoveLoading(false)
    }
  }

  // Print attendance sheet
  const handlePrintAttendance = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-semibold">Loading event staff...</p>
      </div>
    )
  }

  if (error || !eventData) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <Link
            to="/company/dashboard"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-2xl text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    )
  }

  const booked = bookedBoys.length
  const needed = eventData.boys_needed || 1
  const percent = Math.min(100, Math.round((booked / needed) * 100))

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <Link
            to="/company/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintAttendance}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Print attendance sheet"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span className="hidden sm:inline">Print Staff List</span>
            </button>

            <Link
              to={`/company/events/${id}/edit`}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 transition-colors flex items-center gap-1.5"
            >
              <Edit className="w-4 h-4 text-gray-500" />
              <span>Edit Details</span>
            </Link>

            <button
              onClick={fetchEventAndBoys}
              className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-0.5 rounded-full ${
                    eventData.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : eventData.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Status: {eventData.status}
                </span>
                <span className="text-xs text-gray-400 font-semibold">• ID: #{eventData.id.slice(0, 8)}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {eventData.title}
              </h1>
            </div>

            {/* Status change actions */}
            <div className="flex items-center gap-2 shrink-0">
              {eventData.status === 'active' ? (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('full')}
                  disabled={statusLoading}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Mark as Full
                </button>
              ) : eventData.status === 'full' ? (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('active')}
                  disabled={statusLoading}
                  className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Re-open Slots
                </button>
              ) : null}

              {eventData.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={statusLoading}
                  className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel Event
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100 text-sm text-gray-600 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-gray-900">{formatEventDate(eventData.event_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Report: <strong>{formatEventTime(eventData.report_time || eventData.start_time)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">{eventData.venue_name || eventData.area}, {eventData.district}</span>
            </div>
          </div>

          {/* Slots Progress bar */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>
                  {booked} / {needed} Boys Confirmed
                </span>
              </span>
              <span className="text-emerald-700 font-extrabold">{percent}% Filled</span>
            </div>
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Booked Boys List */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900">
              Confirmed Catering Staff ({bookedBoys.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Contact boys directly on event day or remove any boy if needed.
            </p>
          </div>
        </div>

        {bookedBoys.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No Boys Booked Yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Your event is live on the CaterCrew feed. As boys book spots, their profiles, phone numbers, and WhatsApp links will appear here immediately.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookedBoys.map((boy) => {
              const photoUrl = getPhotoPublicUrl(boy.photo_path)

              return (
                <div
                  key={boy.booking_id}
                  className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Boy Info */}
                  <div className="flex items-center gap-3.5">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 bg-gray-100 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center shrink-0 text-sm">
                        {boy.full_name?.charAt(0) || 'C'}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-gray-900 text-base">{boy.full_name}</h4>
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {boy.worker_code}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>{boy.district}</span>
                        {boy.height_cm && <span>• Height: {boy.height_cm} cm</span>}
                        {boy.experience_years !== undefined && (
                          <span>• {boy.experience_years} yrs exp</span>
                        )}
                        {boy.phone && <span className="font-mono text-gray-700">{boy.phone}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {boy.phone && (
                      <a
                        href={`tel:${boy.phone}`}
                        className="p-2.5 sm:px-3 sm:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                        title="Call Worker"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Call</span>
                      </a>
                    )}

                    {boy.phone && (
                      <a
                        href={`https://wa.me/${boy.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 sm:px-3 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                        title="WhatsApp Worker"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedBooking(boy)}
                      className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove Boy"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Remove Boy Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserX className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-gray-900 text-center mb-1">Remove Staff Member?</h3>
            <p className="text-xs text-gray-600 text-center mb-4">
              Are you sure you want to remove <strong>{selectedBooking.full_name}</strong> ({selectedBooking.worker_code}) from this event? The slot will reopen for other boys.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for removal (optional)
              </label>
              <input
                type="text"
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder="e.g. Unreachable, requested replacement..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleRemoveBoy}
                disabled={removeLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
              >
                {removeLoading ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
