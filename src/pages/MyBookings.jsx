import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageCircle,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { formatCurrency, formatEventDate, formatEventTime } from '../lib/formatters'
import { useAuth } from '../context/AuthContext'

export default function MyBookings() {
  const navigate = useNavigate()
  const { user, isWorker, workerProfile, loading: authLoading } = useAuth()

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState('upcoming') // 'upcoming' | 'past'
  const [error, setError] = useState('')

  const fetchBookings = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      if (!isSupabaseConfigured) {
        setBookings([
          {
            id: 'demo-b1',
            status: 'confirmed',
            created_at: new Date().toISOString(),
            events: {
              id: 'demo-1',
              title: 'Grand Royal Wedding Reception',
              event_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
              start_time: '17:00:00',
              end_time: '23:00:00',
              report_time: '16:00:00',
              venue_name: 'Cochin Palace Auditorium',
              district: 'Ernakulam',
              area: 'Edappally',
              wage_per_boy: 1200,
              google_maps_link: 'https://maps.google.com/?q=10.0261,76.3125',
              companies: {
                company_name: 'Al-Saj Conventions & Catering',
                contact_name: 'Rajesh Nair',
                phone: '+91 98460 11223',
                whatsapp: '+91 98460 11223',
              },
            },
          },
        ])
        setLoading(false)
        return
      }

      const { data, error: bErr } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          created_at,
          events (
            id,
            title,
            event_date,
            start_time,
            end_time,
            report_time,
            venue_name,
            district,
            area,
            wage_per_boy,
            google_maps_link,
            companies (
              company_name,
              contact_name,
              phone,
              whatsapp
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (bErr) throw bErr
      setBookings(data || [])
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setError('Unable to load bookings.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?next=/my-bookings', { replace: true })
      return
    }
    if (user) {
      fetchBookings()
    }
  }, [user, authLoading, navigate, fetchBookings])

  const todayStr = new Date().toISOString().slice(0, 10)

  const upcomingBookings = bookings.filter((b) => {
    const evDate = b.events?.event_date
    return evDate >= todayStr && b.status === 'confirmed'
  })

  const pastBookings = bookings.filter((b) => {
    const evDate = b.events?.event_date
    return evDate < todayStr || b.status !== 'confirmed'
  })

  const currentList = filterTab === 'upcoming' ? upcomingBookings : pastBookings

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{workerProfile?.worker_code || 'Silver Boy'} Bookings</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Booked Events</h1>
            <p className="text-sm text-gray-600 mt-1">
              Check your reporting times, venue directions, and coordinator contacts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/events"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs sm:text-sm transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <span>Browse New Events</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={fetchBookings}
              disabled={loading}
              className="p-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 p-1.5 bg-white border border-gray-200 rounded-2xl w-fit mb-6">
          <button
            type="button"
            onClick={() => setFilterTab('upcoming')}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              filterTab === 'upcoming'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('past')}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              filterTab === 'past'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Past / Completed ({pastBookings.length})
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-semibold">Loading your bookings...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              No {filterTab === 'upcoming' ? 'Upcoming' : 'Past'} Bookings Found
            </h3>
            <p className="text-xs text-gray-600 max-w-sm mx-auto mb-5">
              {filterTab === 'upcoming'
                ? 'You do not have any confirmed upcoming events right now. Check out the events page to pick up jobs.'
                : 'You have not attended any events yet.'}
            </p>
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-2xl text-xs sm:text-sm"
            >
              <span>Explore Upcoming Events</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {currentList.map((item) => {
              const ev = item.events
              if (!ev) return null
              const comp = ev.companies

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 hover:border-emerald-200 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full inline-block mb-1">
                        {comp?.company_name || 'Event Company'}
                      </span>
                      <h3 className="text-xl font-black text-gray-900">{ev.title}</h3>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
                        Wage Confirmed
                      </span>
                      <div className="text-2xl font-black text-emerald-700">
                        {formatCurrency(ev.wage_per_boy)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 text-sm text-gray-600 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-gray-900">{formatEventDate(ev.event_date)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Report at: <strong>{formatEventTime(ev.report_time || ev.start_time)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{ev.venue_name || ev.area}, {ev.district}</span>
                    </div>
                  </div>

                  {/* Company Contact & Actions */}
                  <div className="bg-gray-50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-gray-400 block">
                        Company Coordinator
                      </span>
                      <p className="text-sm font-bold text-gray-900">
                        {comp?.contact_name || comp?.company_name || 'Organizer'}
                      </p>
                      {comp?.phone && (
                        <p className="text-xs text-gray-600 font-mono">{comp.phone}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {comp?.phone && (
                        <a
                          href={`tel:${comp.phone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-800 hover:bg-gray-100 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Call</span>
                        </a>
                      )}
                      {comp?.whatsapp && (
                        <a
                          href={`https://wa.me/${comp.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      <Link
                        to={`/events/${ev.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
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
