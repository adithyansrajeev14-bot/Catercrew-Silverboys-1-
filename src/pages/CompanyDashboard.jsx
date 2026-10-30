import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  AlertCircle,
  Building2,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  FileText
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { formatCurrency, formatEventDate, formatEventTime } from '../lib/formatters'
import { useAuth } from '../context/AuthContext'

export default function CompanyDashboard() {
  const navigate = useNavigate()
  const { user, isCompany, companyProfile, loading: authLoading } = useAuth()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isPending = companyProfile?.status === 'pending'
  const isSuspended = companyProfile?.status === 'suspended'

  const fetchCompanyEvents = useCallback(async () => {
    if (!companyProfile?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      if (!isSupabaseConfigured) {
        setEvents([
          {
            id: 'mock-c-1',
            title: 'Grand Royal Wedding Reception',
            event_type: 'Wedding Reception',
            event_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
            start_time: '17:00:00',
            end_time: '23:00:00',
            district: 'Ernakulam',
            area: 'Edappally',
            wage_per_boy: 1200,
            boys_needed: 15,
            boys_booked: 8,
            status: 'active',
          },
        ])
        setLoading(false)
        return
      }

      const { data, error: qErr } = await supabase
        .from('events')
        .select('*')
        .eq('company_id', companyProfile.id)
        .order('event_date', { ascending: false })

      if (qErr) throw qErr
      setEvents(data || [])
    } catch (err) {
      console.error('Error fetching company events:', err)
      setError('Unable to load company events.')
    } finally {
      setLoading(false)
    }
  }, [companyProfile])

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login?next=/company/dashboard', { replace: true })
      } else if (!isCompany) {
        navigate('/signup', { replace: true })
      } else {
        fetchCompanyEvents()
      }
    }
  }, [user, isCompany, authLoading, navigate, fetchCompanyEvents])

  // Statistics
  const totalEvents = events.length
  const activeEvents = events.filter((e) => e.status === 'active' || e.status === 'full').length
  const totalBoysBooked = events.reduce((sum, e) => sum + (e.boys_booked || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Pending verification alert banner */}
        {isPending && (
          <div className="mb-8 p-6 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-900 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Your Company is Under Verification</h3>
                <p className="text-sm text-amber-800 mt-1">
                  Our operations team is currently reviewing your company details and business proof. Once approved, you will be able to post events and hire verified Silver Boys directly.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Review in progress • Usually takes less than 2 hours during business hours</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isSuspended && (
          <div className="mb-8 p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-700">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Account Suspended</h3>
                <p className="text-sm text-rose-800 mt-1">
                  Your event company account has been suspended. Please contact CaterCrew support at support@catercrew.online for assistance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{companyProfile?.company_name || 'Event Company Dashboard'}</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Company Operations Portal
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Post catering requirements, manage slots, and view booked boys in real time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCompanyEvents}
              disabled={loading}
              className="p-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <Link
              to="/company/events/new"
              className={`bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold px-6 py-3.5 rounded-2xl text-sm transition-all flex items-center gap-2 shadow-md shadow-emerald-700/20 cursor-pointer ${
                isPending || isSuspended ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>Post New Event</span>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              Total Events Posted
            </span>
            <div className="text-3xl font-black text-gray-900 mt-1">{totalEvents}</div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">
              Active Events
            </span>
            <div className="text-3xl font-black text-emerald-600 mt-1">{activeEvents}</div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              Catering Boys Hired
            </span>
            <div className="text-3xl font-black text-gray-900 mt-1">{totalBoysBooked}</div>
          </div>
        </div>

        {/* Events Table / Cards */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">Your Posted Events</h2>
          <span className="text-xs font-semibold text-gray-500">{events.length} total events</span>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-semibold">Loading your events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No Events Posted Yet</h3>
            <p className="text-sm text-gray-600 max-w-sm mx-auto mb-6">
              Create your first catering event to start receiving bookings from verified boys across Kerala.
            </p>
            <Link
              to="/company/events/new"
              className={`inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl text-sm transition-colors ${
                isPending || isSuspended ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Post Your First Event</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((ev) => {
              const booked = ev.boys_booked || 0
              const needed = ev.boys_needed || 1
              const percent = Math.min(100, Math.round((booked / needed) * 100))
              const isFull = booked >= needed

              return (
                <div
                  key={ev.id}
                  className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 hover:border-emerald-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Status and Title */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-xl font-extrabold text-gray-900 leading-snug">
                        {ev.title}
                      </h3>
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 ${
                          ev.status === 'active'
                            ? isFull
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                            : ev.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-gray-900">{formatEventDate(ev.event_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {formatEventTime(ev.start_time)} – {formatEventTime(ev.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{ev.area ? `${ev.area}, ` : ''}{ev.district}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-5 bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {booked} / {needed} Boys Booked
                          </span>
                        </span>
                        <span className="font-mono text-emerald-700">{percent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="mt-2 text-right">
                        <span className="text-xs font-black text-gray-900">
                          Wage: {formatCurrency(ev.wage_per_boy)} / boy
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                    <Link
                      to={`/company/events/${ev.id}`}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl text-center text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>Manage & View Boys ({booked})</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    <Link
                      to={`/company/events/${ev.id}/edit`}
                      className="px-4 py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 text-xs sm:text-sm font-bold text-gray-700 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
