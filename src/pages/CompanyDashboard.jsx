import { useState, useEffect, useMemo, useCallback } from 'react'
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
  Zap,
  Send,
  MessageSquare,
  PhoneCall,
  Radio,
  Check,
  X,
  Share2
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

  // Selected current event for operations hub
  const [selectedEventId, setSelectedEventId] = useState('')

  // Live Updates state for current event
  const [eventUpdates, setEventUpdates] = useState([])
  const [newUpdateText, setNewUpdateText] = useState('')
  const [updateSubmitting, setUpdateSubmitting] = useState(false)

  // Urgent Slot state
  const [showUrgentModal, setShowUrgentModal] = useState(false)
  const [urgentBoysCount, setUrgentBoysCount] = useState(2)
  const [urgentBonus, setUrgentBonus] = useState(200)
  const [urgentTimeframe, setUrgentTimeframe] = useState('Immediate (within 1 hour)')
  const [urgentReason, setUrgentReason] = useState('Boy cancelled / last-minute dropout')
  const [urgentCoordinatorPhone, setUrgentCoordinatorPhone] = useState(companyProfile?.phone || '')
  const [urgentSubmitting, setUrgentSubmitting] = useState(false)
  const [urgentSuccessMsg, setUrgentSuccessMsg] = useState('')

  // Active urgent requests map
  const [activeUrgentRequests, setActiveUrgentRequests] = useState({})

  const isPending = companyProfile?.status === 'pending'
  const isSuspended = companyProfile?.status === 'suspended'

  // Load Urgent Requests
  const loadUrgentRequests = useCallback(() => {
    try {
      const stored = localStorage.getItem('catercrew_urgent_requests')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (typeof parsed === 'object') {
          setActiveUrgentRequests(parsed)
        }
      }
    } catch (e) {
      console.warn('Error reading urgent requests:', e)
    }
  }, [])

  const fetchCompanyEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Read local posted events
      let localEvents = []
      try {
        const stored = localStorage.getItem('catercrew_custom_events')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            localEvents = parsed.filter(
              (ev) => !companyProfile?.id || ev.company_id === companyProfile.id || ev.company_id === 'local-company' || ev.company_id === 'company-preview'
            )
          }
        }
      } catch (e) {
        console.warn('Error reading local events:', e)
      }

      if (!isSupabaseConfigured) {
        const defaultMock = [
          {
            id: 'mock-c-1',
            title: 'Grand Royal Wedding Reception',
            event_type: 'Wedding Reception',
            event_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
            start_time: '17:00:00',
            end_time: '23:00:00',
            reporting_time: '16:00:00',
            district: 'Ernakulam',
            area: 'Edappally',
            place_name: 'Cochin Palace Auditorium',
            venue_name: 'Cochin Palace Auditorium',
            wage_per_boy: 1200,
            boys_needed: 15,
            boys_booked: 8,
            status: 'open',
          },
        ]
        const merged = [...localEvents, ...defaultMock]
        setEvents(merged)
        if (!selectedEventId && merged.length > 0) {
          setSelectedEventId(merged[0].id)
        }
        setLoading(false)
        return
      }

      let dbEvents = []
      if (companyProfile?.id) {
        const { data, error: qErr } = await supabase
          .from('events')
          .select('*')
          .eq('company_id', companyProfile.id)
          .order('event_date', { ascending: false })

        if (!qErr && data) {
          dbEvents = data
        }
      }

      // Merge Supabase events and local events, deduplicating by id
      const map = new Map()
      localEvents.forEach((e) => map.set(e.id, e))
      dbEvents.forEach((e) => map.set(e.id, e))

      const mergedList = Array.from(map.values())
      setEvents(mergedList)

      if (!selectedEventId && mergedList.length > 0) {
        setSelectedEventId(mergedList[0].id)
      }
    } catch (err) {
      console.error('Error fetching company events:', err)
      setError('Unable to load company events.')
    } finally {
      setLoading(false)
    }
  }, [companyProfile, selectedEventId])

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login?next=/company/dashboard', { replace: true })
      } else if (!isCompany) {
        navigate('/signup', { replace: true })
      } else {
        fetchCompanyEvents()
        loadUrgentRequests()
      }
    }
  }, [user, isCompany, authLoading, navigate, fetchCompanyEvents, loadUrgentRequests])

  // Current selected event object
  const currentEvent = useMemo(() => {
    if (!events.length) return null
    if (selectedEventId) {
      return events.find((e) => String(e.id) === String(selectedEventId)) || events[0]
    }
    return events[0]
  }, [events, selectedEventId])

  // Active urgent request for current event
  const currentUrgentRequest = useMemo(() => {
    if (!currentEvent) return null
    return activeUrgentRequests[currentEvent.id] || null
  }, [currentEvent, activeUrgentRequests])

  // Load live updates for current event
  useEffect(() => {
    if (!currentEvent) return

    const loadUpdates = () => {
      try {
        const key = `catercrew_event_updates_${currentEvent.id}`
        const stored = localStorage.getItem(key)
        if (stored) {
          setEventUpdates(JSON.parse(stored))
        } else {
          // Default initial update
          const defaults = [
            {
              id: 'init-1',
              text: 'Dress Code: Clean polished black formal shoes, black formal shirt, and neat grooming required.',
              timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
              author: 'Company Coordinator',
            },
            {
              id: 'init-2',
              text: `Please report to ${currentEvent.place_name || currentEvent.venue_name || 'auditorium'} exactly at ${formatEventTime(currentEvent.reporting_time || currentEvent.report_time || '16:00')}.`,
              timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
              author: 'Company Coordinator',
            },
          ]
          setEventUpdates(defaults)
          localStorage.setItem(key, JSON.stringify(defaults))
        }
      } catch (e) {
        console.warn('Error reading event updates:', e)
      }
    }

    loadUpdates()
  }, [currentEvent])

  // Handle posting a live update to staff
  const handlePostUpdate = (e) => {
    e.preventDefault()
    if (!newUpdateText.trim() || !currentEvent) return
    setUpdateSubmitting(true)

    const newUpdate = {
      id: `upd-${Date.now()}`,
      text: newUpdateText.trim(),
      timestamp: new Date().toISOString(),
      author: companyProfile?.company_name || 'Event Coordinator',
    }

    const updated = [newUpdate, ...eventUpdates]
    setEventUpdates(updated)
    try {
      localStorage.setItem(`catercrew_event_updates_${currentEvent.id}`, JSON.stringify(updated))
      window.dispatchEvent(new Event('catercrew_event_updates_changed'))
    } catch (err) {
      console.warn('Error saving event update:', err)
    }

    setNewUpdateText('')
    setUpdateSubmitting(false)
  }

  // Handle Ask for Urgent Slot Broadcast
  const handleBroadcastUrgentSlot = (e) => {
    e.preventDefault()
    if (!currentEvent) return
    setUrgentSubmitting(true)
    setUrgentSuccessMsg('')

    const urgentPayload = {
      eventId: currentEvent.id,
      eventTitle: currentEvent.title,
      venueName: currentEvent.place_name || currentEvent.venue_name || currentEvent.area,
      district: currentEvent.district,
      urgentBoysCount: Number(urgentBoysCount) || 1,
      urgentBonus: Number(urgentBonus) || 0,
      baseWage: Number(currentEvent.wage_per_boy) || 1200,
      totalWagePerBoy: (Number(currentEvent.wage_per_boy) || 1200) + (Number(urgentBonus) || 0),
      timeframe: urgentTimeframe,
      reason: urgentReason,
      phone: urgentCoordinatorPhone || companyProfile?.phone || '+91 94000 88221',
      reportedAt: new Date().toISOString(),
      status: 'active',
    }

    try {
      // 1. Update urgent requests registry
      const stored = localStorage.getItem('catercrew_urgent_requests')
      const reg = stored ? JSON.parse(stored) : {}
      reg[currentEvent.id] = urgentPayload
      localStorage.setItem('catercrew_urgent_requests', JSON.stringify(reg))
      setActiveUrgentRequests({ ...reg })

      // 2. Tag custom event with is_urgent so catering boys see urgent badge in Events tab
      const storedEvents = localStorage.getItem('catercrew_custom_events')
      if (storedEvents) {
        const list = JSON.parse(storedEvents)
        const updatedList = list.map((ev) => {
          if (String(ev.id) === String(currentEvent.id)) {
            return {
              ...ev,
              is_urgent: true,
              urgent_boys_needed: urgentPayload.urgentBoysCount,
              urgent_bonus: urgentPayload.urgentBonus,
            }
          }
          return ev
        })
        localStorage.setItem('catercrew_custom_events', JSON.stringify(updatedList))
      }

      // Notify entire app
      window.dispatchEvent(new Event('catercrew_events_updated'))
      window.dispatchEvent(new Event('storage'))

      setUrgentSuccessMsg(`⚡ Urgent slot broadcasted! Alerting verified catering boys in ${currentEvent.district}.`)
      setTimeout(() => {
        setShowUrgentModal(false)
        setUrgentSuccessMsg('')
      }, 1500)
    } catch (err) {
      console.error('Error broadcasting urgent slot:', err)
    } finally {
      setUrgentSubmitting(false)
    }
  }

  // Handle Resolving Urgent Slot
  const handleResolveUrgentSlot = (eventId) => {
    try {
      const stored = localStorage.getItem('catercrew_urgent_requests')
      if (stored) {
        const reg = JSON.parse(stored)
        delete reg[eventId]
        localStorage.setItem('catercrew_urgent_requests', JSON.stringify(reg))
        setActiveUrgentRequests({ ...reg })
      }

      // Untag event
      const storedEvents = localStorage.getItem('catercrew_custom_events')
      if (storedEvents) {
        const list = JSON.parse(storedEvents)
        const updatedList = list.map((ev) => {
          if (String(ev.id) === String(eventId)) {
            return { ...ev, is_urgent: false, urgent_boys_needed: 0, urgent_bonus: 0 }
          }
          return ev
        })
        localStorage.setItem('catercrew_custom_events', JSON.stringify(updatedList))
      }

      window.dispatchEvent(new Event('catercrew_events_updated'))
      window.dispatchEvent(new Event('storage'))
    } catch (err) {
      console.warn('Error resolving urgent slot:', err)
    }
  }

  // Statistics
  const totalEvents = events.length
  const activeEvents = events.filter((e) => e.status === 'open' || e.status === 'active' || e.status === 'full').length
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
                  Our operations team is currently reviewing your company credentials. You can still post events and ask for urgent staff slots; they will go live immediately for catering boys across Kerala.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Review in progress • Usually verified within 2 hours</span>
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
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Company Operations Portal
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Post catering requirements, manage slots, view updates, and request emergency catering boys.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCompanyEvents}
              disabled={loading}
              className="p-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Refresh dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* Live Radar Button */}
            <Link
              to="/live-radar?pov=company"
              className="bg-gray-900 hover:bg-gray-800 text-white font-extrabold px-5 py-3.5 rounded-2xl text-sm transition-all flex items-center gap-2 shadow-md cursor-pointer border border-gray-800"
            >
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Live Staff Radar</span>
            </Link>

            {/* Core Feature Button: Post New Event */}
            <Link
              to="/post-event"
              className={`bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold px-6 py-3.5 rounded-2xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-700/20 cursor-pointer ${
                isSuspended ? 'opacity-50 pointer-events-none' : ''
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
              Catering Boys Booked
            </span>
            <div className="text-3xl font-black text-gray-900 mt-1">{totalBoysBooked}</div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION: CURRENT EVENT OPERATIONS, LIVE UPDATES & URGENT SLOTS */}
        {/* ========================================================================= */}
        {currentEvent && (
          <div className="mb-12 bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-sm">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black uppercase tracking-wider mb-1">
                  <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>Live Event Operations Hub</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  Current Event Overview & Emergency Dispatch
                </h2>
              </div>

              {/* Event Selector Dropdown if multiple events exist */}
              {events.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Select Event:</span>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({formatEventDate(ev.event_date)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Current Event Summary Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: Live Status & Staff Progress */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                      {currentEvent.event_type || 'Wedding Reception'}
                    </span>
                    <span className="text-xs font-black text-gray-900">
                      {formatCurrency(currentEvent.wage_per_boy)} / boy
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-gray-900 leading-snug mb-3">
                    {currentEvent.title}
                  </h3>

                  <div className="space-y-2 text-xs text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-gray-900">{formatEventDate(currentEvent.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Reporting: <strong>{formatEventTime(currentEvent.reporting_time || currentEvent.report_time || '16:00')}</strong>
                        {' '}({formatEventTime(currentEvent.start_time)} – {formatEventTime(currentEvent.end_time)})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        {currentEvent.place_name || currentEvent.venue_name || currentEvent.area}, {currentEvent.district}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Slots Progress Bar */}
                <div className="pt-3 border-t border-gray-200/70">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {currentEvent.boys_booked || 0} / {currentEvent.boys_needed || 10} Boys Confirmed
                      </span>
                    </span>
                    <span className="font-mono text-emerald-700">
                      {Math.min(100, Math.round(((currentEvent.boys_booked || 0) / (currentEvent.boys_needed || 10)) * 100))}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round(((currentEvent.boys_booked || 0) / (currentEvent.boys_needed || 10)) * 100))}%`,
                      }}
                    />
                  </div>

                  <Link
                    to={`/company/events/${currentEvent.id}`}
                    className="w-full bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 font-bold py-2.5 px-3 rounded-xl text-center text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Manage Staff & ID Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Column 2: ⚡ URGENT SLOT DISPATCH / EMERGENCY SHORTAGE */}
              <div className="bg-amber-50/50 rounded-2xl p-5 border-2 border-amber-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                      <Zap className="w-4 h-4 fill-white" />
                    </div>
                    <h3 className="font-extrabold text-gray-900 text-base">
                      Ask for Urgent Slot
                    </h3>
                  </div>

                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                    Short on catering staff? Broadcast an urgent requirement immediately to boys in {currentEvent.district}.
                  </p>

                  {/* Active Urgent Request Banner */}
                  {currentUrgentRequest ? (
                    <div className="bg-white rounded-xl p-4 border border-amber-300 shadow-xs mb-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black uppercase">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          <span>Emergency Broadcast Active</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleResolveUrgentSlot(currentEvent.id)}
                          className="text-[11px] font-bold text-gray-500 hover:text-gray-900 underline cursor-pointer"
                          title="Click to resolve and remove urgent broadcast"
                        >
                          Mark Filled
                        </button>
                      </div>

                      <div className="text-sm font-bold text-gray-900">
                        ⚡ +{currentUrgentRequest.urgentBoysCount} Urgent Boys Needed!
                      </div>

                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p>• Timeframe: <strong>{currentUrgentRequest.timeframe}</strong></p>
                        <p>• Emergency Wage: <strong>{formatCurrency(currentUrgentRequest.totalWagePerBoy)}</strong> (+{formatCurrency(currentUrgentRequest.urgentBonus)} bonus)</p>
                        <p>• Reason: {currentUrgentRequest.reason}</p>
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <a
                          href={`https://wa.me/919400088221?text=${encodeURIComponent(
                            `URGENT STAFF SHORTAGE at CaterCrew:\nEvent: ${currentEvent.title}\nVenue: ${currentEvent.place_name || currentEvent.area}, ${currentEvent.district}\nNeed: +${currentUrgentRequest.urgentBoysCount} boys ${currentUrgentRequest.timeframe}\nPay: ₹${currentUrgentRequest.totalWagePerBoy}\nCompany Phone: ${currentUrgentRequest.phone}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-center text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Emergency WhatsApp Line</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4 text-xs text-gray-600">
                      <p className="font-semibold text-gray-800 mb-1">How Urgent Slots Work:</p>
                      <ul className="space-y-1 list-disc list-inside text-gray-500">
                        <li>Broadcasts emergency badge to boys on Events feed</li>
                        <li>Optional extra bonus (e.g. +₹200) for instant arrival</li>
                        <li>Direct dispatch coordinator backup</li>
                      </ul>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowUrgentModal(true)}
                  className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold py-3 px-4 rounded-xl text-center text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-amber-500/20"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>{currentUrgentRequest ? 'Edit / Add More Urgent Slots' : '⚡ Request Urgent Catering Boys'}</span>
                </button>
              </div>

              {/* Column 3: Live Event Updates & Announcements */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-extrabold text-gray-900 text-base">
                        Crew Live Updates
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Broadcast to Staff
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mb-3">
                    Post real-time instructions, gate entries, or schedule changes for staff.
                  </p>

                  {/* Updates Timeline */}
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 mb-3">
                    {eventUpdates.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No updates posted yet.</p>
                    ) : (
                      eventUpdates.map((upd) => (
                        <div key={upd.id} className="bg-white p-2.5 rounded-xl border border-gray-200 text-xs shadow-2xs">
                          <p className="text-gray-800 font-medium leading-relaxed">{upd.text}</p>
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1 font-mono">
                            <span>{upd.author}</span>
                            <span>{new Date(upd.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Post New Update Form */}
                <form onSubmit={handlePostUpdate} className="pt-2 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUpdateText}
                      onChange={(e) => setNewUpdateText(e.target.value)}
                      placeholder="e.g. Briefing starts at 4:30 PM..."
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-600"
                    />
                    <button
                      type="submit"
                      disabled={updateSubmitting || !newUpdateText.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                      title="Post update"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ALL POSTED EVENTS LIST */}
        {/* ========================================================================= */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900">Your Posted Catering Events</h2>
            <p className="text-xs text-gray-500 mt-0.5">View and manage all events posted by your company</p>
          </div>
          <Link
            to="/post-event"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post Another Event</span>
          </Link>
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
              to="/post-event"
              className={`inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl text-sm transition-colors cursor-pointer ${
                isSuspended ? 'opacity-50 pointer-events-none' : ''
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
              const needed = ev.boys_needed || ev.slots_total || 1
              const percent = Math.min(100, Math.round((booked / needed) * 100))
              const isFull = booked >= needed
              const isUrgent = activeUrgentRequests[ev.id] || ev.is_urgent

              return (
                <div
                  key={ev.id}
                  className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 hover:border-emerald-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Urgent Alert if active on this card */}
                    {isUrgent && (
                      <div className="mb-3 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                          <span>Urgent Staff Needed (+{isUrgent.urgentBoysCount || ev.urgent_boys_needed || 1} boys)</span>
                        </span>
                        <span className="text-[10px] text-amber-700">Active</span>
                      </div>
                    )}

                    {/* Header: Status and Title */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-xl font-extrabold text-gray-900 leading-snug">
                        {ev.title}
                      </h3>
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 ${
                          ev.status === 'open' || ev.status === 'active'
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
                      className="px-4 py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 text-xs sm:text-sm font-bold text-gray-700 transition-colors cursor-pointer"
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

      {/* ========================================================================= */}
      {/* MODAL: ASK FOR URGENT SLOT */}
      {/* ========================================================================= */}
      {showUrgentModal && currentEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Zap className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Request Urgent Catering Boys</h3>
                  <p className="text-xs text-gray-500">{currentEvent.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUrgentModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {urgentSuccessMsg ? (
              <div className="p-6 bg-emerald-50 rounded-2xl text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="font-extrabold text-gray-900 text-base">{urgentSuccessMsg}</p>
                <p className="text-xs text-gray-600">The requirement is now highlighted in the Events feed.</p>
              </div>
            ) : (
              <form onSubmit={handleBroadcastUrgentSlot} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    How Many Urgent Boys Needed?
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 5].map((cnt) => (
                      <button
                        type="button"
                        key={cnt}
                        onClick={() => setUrgentBoysCount(cnt)}
                        className={`py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
                          urgentBoysCount === cnt
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        +{cnt} Boys
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Urgent Emergency Bonus per Boy
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 150, 200, 300].map((bns) => (
                      <button
                        type="button"
                        key={bns}
                        onClick={() => setUrgentBonus(bns)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          urgentBonus === bns
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {bns === 0 ? 'Standard' : `+₹${bns}`}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Total payout offered: <strong>{formatCurrency((Number(currentEvent.wage_per_boy) || 1200) + urgentBonus)}</strong> per boy.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    When Should Boys Report?
                  </label>
                  <select
                    value={urgentTimeframe}
                    onChange={(e) => setUrgentTimeframe(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Immediate (within 1 hour)">Immediate (within 1 hour)</option>
                    <option value="Today by 4:00 PM">Today by 4:00 PM</option>
                    <option value="Today evening (after 6:00 PM)">Today evening (after 6:00 PM)</option>
                    <option value="Tomorrow morning">Tomorrow morning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Shortage Reason
                  </label>
                  <select
                    value={urgentReason}
                    onChange={(e) => setUrgentReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Boy cancelled / last-minute dropout">Boy cancelled / last-minute dropout</option>
                    <option value="Guest count increased / extra buffet counters">Guest count increased / extra buffet counters</option>
                    <option value="Late reporting backup needed">Late reporting backup needed</option>
                    <option value="Emergency replacement">Emergency replacement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    On-Site Coordinator Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={urgentCoordinatorPhone}
                    onChange={(e) => setUrgentCoordinatorPhone(e.target.value)}
                    placeholder="+91 98461 00000"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowUrgentModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={urgentSubmitting}
                    className="flex-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>{urgentSubmitting ? 'Broadcasting...' : 'Broadcast Urgent Slots Now'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
