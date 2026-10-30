import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  Search,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Building2,
  SlidersHorizontal
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { DISTRICTS } from '../lib/constants'
import { formatCurrency, formatEventDate, formatEventTime } from '../lib/formatters'
import { useAuth } from '../context/AuthContext'

export default function Events() {
  const { isWorker, isCompany } = useAuth()

  const [events, setEvents] = useState([])
  const [urgentMap, setUrgentMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [hideFull, setHideFull] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Read urgent requests
      try {
        const storedUrg = localStorage.getItem('catercrew_urgent_requests')
        if (storedUrg) {
          setUrgentMap(JSON.parse(storedUrg))
        }
      } catch (uErr) {
        console.warn('Error reading urgent requests:', uErr)
      }

      // 1. Read locally posted events
      let localEvents = []
      try {
        const stored = localStorage.getItem('catercrew_custom_events')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            localEvents = parsed
          }
        }
      } catch (e) {
        console.warn('Error reading local events:', e)
      }

      // Default mock fallback
      const defaultMockEvents = [
        {
          id: 'mock-e1',
          title: 'Grand Royal Wedding Reception',
          company_name: 'Al-Saj Conventions & Catering',
          event_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
          start_time: '17:00:00',
          end_time: '23:00:00',
          reporting_time: '16:00:00',
          district: 'Ernakulam',
          area: 'Edappally',
          place_name: 'Cochin Palace Auditorium',
          wage_per_boy: 1200,
          boys_needed: 15,
          boys_booked: 8,
          slots_total: 15,
          slots_filled: 8,
          uniform_requirements: ['Black shirt', 'Black formal pant', 'Black shoes'],
          food_provided: true,
          travel_allowance: false,
          status: 'open',
        },
        {
          id: 'mock-e2',
          title: 'Corporate Annual Gala Dinner',
          company_name: 'Grand Hyatt Events',
          event_date: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
          start_time: '18:30:00',
          end_time: '23:30:00',
          reporting_time: '17:30:00',
          district: 'Ernakulam',
          area: 'Bolgatty Island',
          place_name: 'Lulu Bolgatty Grand Hall',
          wage_per_boy: 1500,
          boys_needed: 10,
          boys_booked: 10,
          slots_total: 10,
          slots_filled: 10,
          uniform_requirements: ['White formal shirt', 'Black formal pant', 'Black shoes'],
          food_provided: true,
          travel_allowance: true,
          status: 'full',
        },
        {
          id: 'mock-e3',
          title: 'Traditional Kerala Sadya Feast',
          company_name: 'Vinayaka Caterers',
          event_date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
          start_time: '09:00:00',
          end_time: '16:00:00',
          reporting_time: '08:00:00',
          district: 'Thrissur',
          area: 'Swaraj Round',
          place_name: 'Thekkinkadu Grounds Auditorium',
          wage_per_boy: 1100,
          boys_needed: 12,
          boys_booked: 5,
          slots_total: 12,
          slots_filled: 5,
          uniform_requirements: ['White shirt', 'White dhoti / mundu with velcro', 'Neat hair'],
          food_provided: true,
          travel_allowance: false,
          status: 'open',
        },
      ]

      let dbEvents = []

      if (isSupabaseConfigured) {
        try {
          const { data: publicData, error: viewError } = await supabase
            .from('events_public')
            .select('*')
            .gte('event_date', new Date().toISOString().slice(0, 10))
            .order('event_date', { ascending: true })

          if (!viewError && publicData && publicData.length > 0) {
            dbEvents = publicData
          } else {
            const { data: rawEvents } = await supabase
              .from('events')
              .select('*, companies(company_name, district)')
              .gte('event_date', new Date().toISOString().slice(0, 10))
              .order('event_date', { ascending: true })

            if (rawEvents) {
              dbEvents = rawEvents.map((e) => ({
                ...e,
                company_name: e.companies?.company_name || 'Verified Event Company',
              }))
            }
          }
        } catch (dbErr) {
          console.warn('Supabase events fetch notice:', dbErr)
        }
      }

      // Merge and normalize: local events first (newly created), followed by DB events and defaults
      const rawList = [...localEvents, ...dbEvents]
      const finalRaw = rawList.length > 0 ? rawList : defaultMockEvents

      const map = new Map()
      finalRaw.forEach((e) => {
        if (!e.id) return
        const normalized = {
          ...e,
          id: String(e.id),
          title: e.title || 'Catering Event',
          company_name: e.company_name || e.companies?.company_name || 'Verified Event Company',
          event_type: e.event_type || 'wedding',
          event_date: e.event_date || new Date().toISOString().slice(0, 10),
          start_time: e.start_time || '17:00:00',
          end_time: e.end_time || '23:00:00',
          reporting_time: e.reporting_time || e.report_time || '16:00:00',
          district: e.district || 'Ernakulam',
          area: e.area || e.place_name || e.venue_name || '',
          place_name: e.place_name || e.venue_name || 'Auditorium',
          wage_per_boy: Number(e.wage_per_boy) || 1200,
          boys_needed: Number(e.slots_total ?? e.boys_needed) || 10,
          boys_booked: Number(e.slots_filled ?? e.boys_booked) || 0,
          uniform_requirements: Array.isArray(e.uniform) && e.uniform.length ? e.uniform : Array.isArray(e.uniform_requirements) ? e.uniform_requirements : ['Black shirt', 'Black formal pant', 'Black shoes'],
          food_provided: Boolean(e.food_provided),
          travel_allowance: Boolean(e.travel_allowance ?? e.transport_provided),
          status: e.status || 'open',
          is_urgent: Boolean(e.is_urgent),
          urgent_boys_needed: e.urgent_boys_needed,
          urgent_bonus: e.urgent_bonus,
        }
        if (!map.has(normalized.id)) {
          map.set(normalized.id, normalized)
        }
      })

      setEvents(Array.from(map.values()))
    } catch (err) {
      console.error('Error fetching events:', err)
      setError('Unable to load upcoming catering events right now.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()

    const handleUpdate = () => fetchEvents()
    window.addEventListener('catercrew_events_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('catercrew_events_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [fetchEvents])

  // Filtered & Sorted events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // District filter
      if (selectedDistrict !== 'all' && ev.district !== selectedDistrict) {
        return false
      }

      // Date filter
      if (selectedDate && ev.event_date !== selectedDate) {
        return false
      }

      // Hide full events
      if (hideFull) {
        const isFull = (ev.boys_booked || 0) >= (ev.boys_needed || 0)
        if (isFull) return false
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = (ev.title || '').toLowerCase().includes(q)
        const matchCompany = (ev.company_name || '').toLowerCase().includes(q)
        const matchArea = (ev.area || '').toLowerCase().includes(q)
        const matchDistrict = (ev.district || '').toLowerCase().includes(q)
        return matchTitle || matchCompany || matchArea || matchDistrict
      }

      return true
    })
  }, [events, selectedDistrict, selectedDate, hideFull, searchQuery])

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Kerala Catering Events</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Upcoming Catering Events
            </h1>
            <p className="text-gray-600 text-base mt-1">
              Find catering jobs across Kerala with clear wages, reporting times, and instant booking.
            </p>
          </div>

          {/* Quick Actions (No public Post Event button - only Company Dashboard if logged in as company) */}
          <div className="flex items-center flex-wrap gap-2.5">
            {isCompany && (
              <Link
                to="/company/dashboard"
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-emerald-700/20 inline-flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>Company Dashboard</span>
              </Link>
            )}

            {isWorker && (
              <Link
                to="/my-bookings"
                className="bg-white border border-gray-200 hover:border-emerald-600 text-gray-800 hover:text-emerald-700 font-bold px-4 py-2.5 rounded-2xl text-sm transition-colors shadow-xs inline-flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>My Bookings</span>
              </Link>
            )}

            <button
              onClick={fetchEvents}
              disabled={loading}
              className="p-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Refresh events list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <span>Filter Events</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search event, venue, company..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900"
              />
            </div>

            {/* District Dropdown */}
            <div>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 cursor-pointer"
              >
                <option value="all">All Districts (Kerala)</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 cursor-pointer"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-700 bg-gray-100 rounded-full px-1.5 py-0.5"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Hide Full Events Toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-2xl hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={hideFull}
                onChange={(e) => setHideFull(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <span className="text-sm font-semibold text-gray-700">Hide Full Events</span>
            </label>
          </div>
        </div>

        {/* Events List */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Loading upcoming events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">No Events Found</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
              {events.length === 0
                ? 'There are no upcoming catering events listed right now. Check back soon or register your company to post events.'
                : 'No events matched your current filters. Try resetting the filters to view all upcoming jobs.'}
            </p>
            {(selectedDistrict !== 'all' || selectedDate || hideFull || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDistrict('all')
                  setSelectedDate('')
                  setHideFull(false)
                  setSearchQuery('')
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-2xl text-sm transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvents.map((ev) => {
              const booked = ev.boys_booked || 0
              const needed = ev.boys_needed || 1
              const isFull = booked >= needed
              const percent = Math.min(100, Math.round((booked / needed) * 100))
              const uniformList = Array.isArray(ev.uniform_requirements)
                ? ev.uniform_requirements
                : []
              const urgentInfo = ev.is_urgent ? ev : urgentMap[ev.id] || null

              return (
                <div
                  key={ev.id}
                  className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Urgent Slot Alert Banner if active */}
                    {urgentInfo && (
                      <div className="mb-3.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-white font-extrabold text-xs flex items-center justify-between shadow-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>⚡ URGENT: +{urgentInfo.urgentBoysCount || urgentInfo.urgent_boys_needed || 1} Boys Needed Immediately!</span>
                        </span>
                        {urgentInfo.urgentBonus || urgentInfo.urgent_bonus ? (
                          <span className="bg-white text-amber-900 px-2 py-0.5 rounded-md font-black text-[10px]">
                            +{formatCurrency(urgentInfo.urgentBonus || urgentInfo.urgent_bonus)} Bonus
                          </span>
                        ) : null}
                      </div>
                    )}

                    {/* Top Row: Company & Date */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit mb-2">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[200px]">{ev.company_name}</span>
                        </div>
                        <h2 className="text-xl font-extrabold text-gray-900 leading-snug">
                          {ev.title}
                        </h2>
                      </div>

                      {/* Full Badge or Slots Left */}
                      {isFull ? (
                        <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                          Full
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                          {needed - booked} spots left
                        </span>
                      )}
                    </div>

                    {/* Date, Time, Location Pills */}
                    <div className="space-y-2 mb-5 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-gray-900">
                          {formatEventDate(ev.event_date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {formatEventTime(ev.start_time)}
                          {ev.end_time ? ` – ${formatEventTime(ev.end_time)}` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {ev.area ? `${ev.area}, ` : ''}
                          <strong>{ev.district}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Wage Card Highlight */}
                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 mb-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                          Wage per Boy
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                          {formatCurrency(ev.wage_per_boy)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">
                          {ev.food_provided ? '• Food Included' : ''}
                        </span>
                        {ev.travel_allowance && (
                          <span className="text-xs text-emerald-700 font-semibold block">
                            • Travel Provided
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Uniform Chips */}
                    {uniformList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {uniformList.slice(0, 3).map((item, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-lg"
                          >
                            {item}
                          </span>
                        ))}
                        {uniformList.length > 3 && (
                          <span className="text-xs text-gray-400 font-semibold self-center">
                            +{uniformList.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Progress Bar for slots */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {booked} / {needed} Slots Filled
                          </span>
                        </span>
                        <span className="font-mono text-gray-500">{percent}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isFull ? 'bg-rose-500' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link
                    to={`/events/${ev.id}`}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-2xl text-center text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span>View & Book Slot</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
