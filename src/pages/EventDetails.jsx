import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageCircle,
  Share2,
  ArrowLeft,
  ShieldCheck,
  Building2,
  AlertTriangle,
  ExternalLink,
  Navigation
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { formatCurrency, formatEventDate, formatEventTime, calculateHours } from '../lib/formatters'
import { useAuth } from '../context/AuthContext'

export default function EventDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isWorker, workerProfile } = useAuth()

  const [eventData, setEventData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Booking state
  const [userBooking, setUserBooking] = useState(null)
  const [companyContact, setCompanyContact] = useState(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Urgent Slot & Live Updates
  const [urgentInfo, setUrgentInfo] = useState(null)
  const [eventLiveUpdates, setEventLiveUpdates] = useState([])

  // Cancellation modal
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  // Fetch event and booking status
  const fetchEventDetails = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (!isSupabaseConfigured) {
        // Fallback demo data
        setEventData({
          id: id || 'demo-1',
          title: 'Grand Royal Wedding Reception',
          event_type: 'Wedding Reception',
          description: 'High-profile banquet dinner serving 800 guests. Requires neat presentation and courteous service.',
          company_name: 'Al-Saj Conventions & Catering',
          company_district: 'Ernakulam',
          event_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
          start_time: '17:00:00',
          end_time: '23:00:00',
          report_time: '16:00:00',
          duration_hours: 6,
          venue_name: 'Cochin Palace Auditorium',
          district: 'Ernakulam',
          area: 'Edappally',
          full_address: 'Toll Junction, NH 66, Edappally, Kochi, Kerala 682024',
          landmark: 'Opposite Metro Pillar 384',
          latitude: 10.0261,
          longitude: 76.3125,
          google_maps_link: 'https://maps.google.com/?q=10.0261,76.3125',
          boys_needed: 15,
          boys_booked: 8,
          wage_per_boy: 1200,
          payment_mode: 'Cash / UPI after event',
          payment_timing: 'Immediately after event completion',
          uniform_requirements: ['Black shirt', 'Black formal pant', 'Black formal shoes', 'Neat shave & haircut'],
          food_provided: true,
          travel_allowance: false,
          min_experience_years: 0,
          notes: 'Water and buffet dinner provided for staff. Please arrive strictly at reporting time in clean uniform.',
          status: 'active',
        })
        setLoading(false)
        return
      }

      // Query event
      let currentEvent = null

      if (isSupabaseConfigured) {
        try {
          const { data: publicEv, error: pErr } = await supabase
            .from('events_public')
            .select('*')
            .eq('id', id)
            .maybeSingle()

          if (!pErr && publicEv) {
            currentEvent = publicEv
          } else {
            const { data: rawEv } = await supabase
              .from('events')
              .select('*, companies(company_name, district, contact_name, phone, whatsapp)')
              .eq('id', id)
              .maybeSingle()

            if (rawEv) {
              currentEvent = {
                ...rawEv,
                company_name: rawEv.companies?.company_name || 'Event Company',
                company_district: rawEv.companies?.district,
              }
            }
          }
        } catch (dbErr) {
          console.warn('Supabase event details fetch notice:', dbErr)
        }
      }

      // Check localStorage for newly posted custom events
      if (!currentEvent) {
        try {
          const stored = localStorage.getItem('catercrew_custom_events')
          if (stored) {
            const list = JSON.parse(stored)
            if (Array.isArray(list)) {
              currentEvent = list.find((e) => String(e.id) === String(id))
            }
          }
        } catch (e) {
          console.warn('Local event lookup notice:', e)
        }
      }

      // Check default mock events
      if (!currentEvent) {
        const mockMap = {
          'mock-e1': {
            id: 'mock-e1',
            title: 'Grand Royal Wedding Reception',
            event_type: 'wedding',
            description: 'High-profile banquet dinner serving 800 guests. Requires neat presentation and courteous service.',
            company_name: 'Al-Saj Conventions & Catering',
            company_district: 'Ernakulam',
            event_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
            start_time: '17:00:00',
            end_time: '23:00:00',
            report_time: '16:00:00',
            reporting_time: '16:00:00',
            duration_hours: 6,
            venue_name: 'Cochin Palace Auditorium',
            place_name: 'Cochin Palace Auditorium',
            district: 'Ernakulam',
            area: 'Edappally',
            full_address: 'Toll Junction, NH 66, Edappally, Kochi, Kerala 682024',
            address: 'Toll Junction, NH 66, Edappally, Kochi, Kerala 682024',
            landmark: 'Opposite Metro Pillar 384',
            google_maps_link: 'https://maps.google.com/?q=10.0261,76.3125',
            map_link: 'https://maps.google.com/?q=10.0261,76.3125',
            boys_needed: 15,
            slots_total: 15,
            boys_booked: 8,
            slots_filled: 8,
            wage_per_boy: 1200,
            payment_mode: 'cash',
            payment_timing: 'same day',
            uniform_requirements: ['Black shirt', 'Black formal pant', 'Black formal shoes', 'Neat shave & haircut'],
            food_provided: true,
            travel_allowance: false,
            notes: 'Water and buffet dinner provided for staff. Please arrive strictly at reporting time in clean uniform.',
            status: 'open',
          },
        }
        if (mockMap[id]) currentEvent = mockMap[id]
      }

      if (!currentEvent) {
        throw new Error('Event not found or no longer active.')
      }

      // Normalize event data so it displays smoothly across schemas
      const normalized = {
        ...currentEvent,
        venue_name: currentEvent.venue_name || currentEvent.place_name || 'Auditorium',
        place_name: currentEvent.place_name || currentEvent.venue_name || 'Auditorium',
        report_time: currentEvent.report_time || currentEvent.reporting_time || '16:00',
        reporting_time: currentEvent.reporting_time || currentEvent.report_time || '16:00',
        full_address: currentEvent.full_address || currentEvent.address || '',
        address: currentEvent.address || currentEvent.full_address || '',
        google_maps_link: currentEvent.google_maps_link || currentEvent.map_link || '',
        map_link: currentEvent.map_link || currentEvent.google_maps_link || '',
        boys_needed: Number(currentEvent.boys_needed ?? currentEvent.slots_total) || 10,
        slots_total: Number(currentEvent.slots_total ?? currentEvent.boys_needed) || 10,
        boys_booked: Number(currentEvent.boys_booked ?? currentEvent.slots_filled) || 0,
        slots_filled: Number(currentEvent.slots_filled ?? currentEvent.boys_booked) || 0,
        wage_per_boy: Number(currentEvent.wage_per_boy) || 1200,
        uniform_requirements: Array.isArray(currentEvent.uniform_requirements) && currentEvent.uniform_requirements.length
          ? currentEvent.uniform_requirements
          : Array.isArray(currentEvent.uniform)
          ? currentEvent.uniform
          : ['Black shirt', 'Black formal pant', 'Black shoes'],
      }

      setEventData(normalized)

      // Retrieve urgent request info if active
      try {
        const storedUrg = localStorage.getItem('catercrew_urgent_requests')
        if (storedUrg) {
          const reg = JSON.parse(storedUrg)
          if (reg && reg[id]) {
            setUrgentInfo(reg[id])
          } else if (normalized.is_urgent) {
            setUrgentInfo({
              urgentBoysCount: normalized.urgent_boys_needed || 1,
              urgentBonus: normalized.urgent_bonus || 0,
              timeframe: 'Immediate',
              reason: 'Urgent staff requirement',
            })
          } else {
            setUrgentInfo(null)
          }
        }
      } catch (uErr) {
        console.warn('Error reading urgent requests:', uErr)
      }

      // Retrieve live updates posted by company
      try {
        const key = `catercrew_event_updates_${id}`
        const storedUpd = localStorage.getItem(key)
        if (storedUpd) {
          setEventLiveUpdates(JSON.parse(storedUpd))
        } else {
          setEventLiveUpdates([])
        }
      } catch (updErr) {
        console.warn('Error reading event updates:', updErr)
      }

      // If user is logged in, check if booked
      if (user) {
        // Query user's booking for this event
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('*')
          .eq('event_id', id)
          .eq('user_id', user.id)
          .in('status', ['confirmed', 'attended'])
          .maybeSingle()

        if (bookingData) {
          setUserBooking(bookingData)

          // Fetch company contact via RPC
          try {
            const { data: contactData } = await supabase.rpc('get_event_company_contact', {
              p_event_id: id,
            })
            if (contactData && contactData.length > 0) {
              setCompanyContact(contactData[0])
            }
          } catch (cErr) {
            console.warn('Could not fetch company contact via RPC:', cErr)
          }
        } else {
          setUserBooking(null)
          setCompanyContact(null)
        }
      }
    } catch (err) {
      console.error('Error fetching event details:', err)
      setError(err.message || 'Unable to load event details.')
    } finally {
      setLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    fetchEventDetails()
  }, [fetchEventDetails])

  // Book a slot
  const handleBookSlot = async () => {
    setActionError('')
    setActionSuccess('')

    if (!user) {
      navigate(`/login?next=/events/${id}`)
      return
    }

    if (!isWorker) {
      setActionError('Only verified catering boys can book slots. Please sign up with your Silver Boy ID.')
      return
    }

    if (workerProfile?.status !== 'verified') {
      setActionError('Your Silver Boy account is still under verification. You can book slots once verified.')
      return
    }

    setBookingLoading(true)
    try {
      if (!isSupabaseConfigured) {
        setUserBooking({ id: 'demo-booking', status: 'confirmed', created_at: new Date().toISOString() })
        setActionSuccess('Slot booked successfully!')
        setCompanyContact({
          company_name: eventData.company_name,
          contact_name: 'Coordinator Rajesh',
          phone: '+91 98460 11223',
          whatsapp: '+91 98460 11223',
        })
        setBookingLoading(false)
        return
      }

      const { data, error: rpcErr } = await supabase.rpc('book_slot', {
        p_event_id: id,
      })

      if (rpcErr) throw rpcErr

      setActionSuccess('Slot booked successfully! You are confirmed for this event.')
      await fetchEventDetails()
    } catch (err) {
      console.error('Booking failed:', err)
      setActionError(err.message || 'Could not complete booking. The event might be full.')
    } finally {
      setBookingLoading(false)
    }
  }

  // Cancel booking
  const handleCancelBooking = async () => {
    if (!userBooking?.id) return

    setCancelLoading(true)
    setActionError('')
    setActionSuccess('')
    try {
      if (!isSupabaseConfigured) {
        setUserBooking(null)
        setShowCancelModal(false)
        setActionSuccess('Booking cancelled.')
        setCancelLoading(false)
        return
      }

      const { data, error: cancelErr } = await supabase.rpc('cancel_booking', {
        p_booking_id: userBooking.id,
        p_reason: cancelReason || 'Cancelled by worker',
      })

      if (cancelErr) throw cancelErr

      setShowCancelModal(false)
      setActionSuccess('Your booking has been cancelled.')
      await fetchEventDetails()
    } catch (err) {
      console.error('Cancellation error:', err)
      setActionError(err.message || 'Could not cancel booking. Cancellations are blocked within 24 hours of event.')
    } finally {
      setCancelLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-semibold">Loading event details...</p>
        </div>
      </div>
    )
  }

  if (error || !eventData) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Event Not Available</h2>
          <p className="text-sm text-gray-600 mb-6">{error || 'This event does not exist.'}</p>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Browse Other Events</span>
          </Link>
        </div>
      </div>
    )
  }

  const booked = eventData.boys_booked || 0
  const needed = eventData.boys_needed || 1
  const isFull = booked >= needed
  const percent = Math.min(100, Math.round((booked / needed) * 100))
  const remaining = Math.max(0, needed - booked)

  // Location embed URL
  const mapQuery =
    eventData.latitude && eventData.longitude
      ? `${eventData.latitude},${eventData.longitude}`
      : encodeURIComponent(`${eventData.venue_name || ''} ${eventData.area || ''} ${eventData.district || ''}`)

  const embedUrl = `https://maps.google.com/maps?q=${mapQuery}&z=16&output=embed`
  const openMapsUrl =
    eventData.google_maps_link ||
    (eventData.latitude && eventData.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${eventData.latitude},${eventData.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`)

  const directionsUrl =
    eventData.latitude && eventData.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${eventData.latitude},${eventData.longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`

  const whatsappShareText = `*CaterCrew Event Location:*\n${eventData.title}\nVenue: ${eventData.venue_name || eventData.area}\nDate: ${formatEventDate(eventData.event_date)}\nGoogle Maps: ${openMapsUrl}`
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappShareText)}`

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Back Link */}
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-emerald-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Events</span>
        </Link>

        {/* Urgent Slot Alert Banner */}
        {urgentInfo && (
          <div className="mb-6 p-5 rounded-3xl bg-amber-500 text-white shadow-lg shadow-amber-500/20 border-2 border-amber-300">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <span className="text-xl">⚡</span>
                </div>
                <div>
                  <div className="inline-block bg-white text-amber-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-md mb-1 tracking-wider">
                    Emergency Staff Needed Immediately
                  </div>
                  <h3 className="text-lg font-black tracking-tight">
                    +{urgentInfo.urgentBoysCount} Urgent Catering Boys Needed!
                  </h3>
                  <p className="text-amber-100 text-xs sm:text-sm mt-0.5">
                    Reporting: <strong>{urgentInfo.timeframe}</strong> • Reason: {urgentInfo.reason}
                  </p>
                  {urgentInfo.urgentBonus ? (
                    <div className="mt-2 inline-flex flex-wrap items-center gap-1.5 bg-black/20 text-white px-3 py-1 rounded-xl text-xs font-black">
                      <span>Total Payout: {formatCurrency(Number(eventData.wage_per_boy) + Number(urgentInfo.urgentBonus))}</span>
                      <span className="text-amber-200 font-normal">({formatCurrency(eventData.wage_per_boy)} base + {formatCurrency(urgentInfo.urgentBonus)} emergency bonus)</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action alerts */}
        {actionError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* User Booking Status Banner */}
        {userBooking && (
          <div className="mb-8 p-6 rounded-3xl bg-emerald-600 text-white shadow-lg shadow-emerald-700/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">You are Confirmed for this Event</h3>
                  <p className="text-emerald-100 text-sm mt-0.5">
                    Your slot is locked. Please arrive at the venue at <strong>{formatEventTime(eventData.report_time || eventData.start_time)}</strong>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Cancel Slot
              </button>
            </div>

            {/* Revealed Company Contact Info */}
            {companyContact && (
              <div className="mt-5 pt-4 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase tracking-wider text-emerald-200 font-bold block">
                    Event Coordinator
                  </span>
                  <p className="font-extrabold text-base">{companyContact.contact_name || companyContact.company_name}</p>
                  <p className="text-xs text-emerald-100 font-mono">{companyContact.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  {companyContact.phone && (
                    <a
                      href={`tel:${companyContact.phone}`}
                      className="inline-flex items-center gap-1.5 bg-white text-emerald-800 hover:bg-emerald-50 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Coordinator</span>
                    </a>
                  )}
                  {companyContact.whatsapp && (
                    <a
                      href={`https://wa.me/${companyContact.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 1. Event Details Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit mb-4">
            <Building2 className="w-3.5 h-3.5" />
            <span>{eventData.company_name}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-2">
            {eventData.title}
          </h1>

          {eventData.description && (
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
              {eventData.description}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
                Event Date
              </span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {formatEventDate(eventData.event_date)}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
                Duration
              </span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {eventData.duration_hours || calculateHours(eventData.start_time, eventData.end_time)} Hours
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
                Type
              </span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {eventData.event_type || 'Catering'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Wage & Payment */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
              2
            </span>
            <span>Wage & Payment</span>
          </h2>

          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Confirmed Wage per Boy
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">
                {formatCurrency(eventData.wage_per_boy)}
              </div>
            </div>
            <div className="text-left sm:text-right text-xs text-gray-600 space-y-1">
              <div>
                Mode: <strong>{eventData.payment_mode || 'Cash / UPI'}</strong>
              </div>
              <div>
                Payout: <strong>{eventData.payment_timing || 'After Event'}</strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-400 block text-xs">Food & Refreshments</span>
              <span className="font-bold text-gray-900">
                {eventData.food_provided ? '✓ Food Provided' : 'Not Provided'}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-400 block text-xs">Travel Allowance</span>
              <span className="font-bold text-gray-900">
                {eventData.travel_allowance ? '✓ Travel Provided' : 'Self Travel'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Timing */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
              3
            </span>
            <span>Timing Schedule</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                Reporting Time
              </span>
              <div className="text-xl font-black text-amber-900 mt-1">
                {formatEventTime(eventData.report_time || eventData.start_time)}
              </div>
              <span className="text-[11px] text-amber-700 mt-0.5 block">Be at venue on time</span>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Event Starts
              </span>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {formatEventTime(eventData.start_time)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Event Ends
              </span>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {formatEventTime(eventData.end_time)}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Location & Map */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
              4
            </span>
            <span>Location & Venue</span>
          </h2>

          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>{eventData.venue_name || eventData.area}</span>
            </h3>
            {eventData.full_address && (
              <p className="text-sm text-gray-600 mt-1">{eventData.full_address}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
              <span className="bg-gray-100 px-2.5 py-1 rounded-lg font-medium">District: {eventData.district}</span>
              {eventData.area && <span className="bg-gray-100 px-2.5 py-1 rounded-lg font-medium">Area: {eventData.area}</span>}
              {eventData.landmark && <span className="bg-gray-100 px-2.5 py-1 rounded-lg font-medium">Landmark: {eventData.landmark}</span>}
            </div>
          </div>

          {/* Keyless Google Maps Embed */}
          <div className="w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-gray-200 mb-4 bg-gray-100">
            <iframe
              title="Event Venue Location"
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={embedUrl}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Map Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href={openMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
              <span>Open in Google Maps</span>
            </a>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              <span>Get Directions</span>
            </a>

            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* 5. Uniform & Requirements */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
              5
            </span>
            <span>Uniform & Dress Code</span>
          </h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {(Array.isArray(eventData.uniform_requirements) ? eventData.uniform_requirements : ['Neat Uniform']).map(
              (u, i) => (
                <span
                  key={i}
                  className="px-3.5 py-1.5 rounded-xl bg-gray-100 text-gray-800 text-xs font-bold"
                >
                  {u}
                </span>
              )
            )}
          </div>

          {eventData.notes && (
            <div className="p-4 bg-gray-50 rounded-2xl text-xs sm:text-sm text-gray-600 mt-4">
              <span className="font-bold text-gray-800 block mb-1">Company Instructions:</span>
              <p>{eventData.notes}</p>
            </div>
          )}
        </div>

        {/* 6. Live Updates & Crew Briefing */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                6
              </span>
              <span>Live Updates & Crew Briefing</span>
            </h2>
            {eventLiveUpdates.length > 0 && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                {eventLiveUpdates.length} Updates
              </span>
            )}
          </div>

          {eventLiveUpdates.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-2xl text-xs text-gray-500 italic">
              No live crew updates posted yet. Standard reporting time is <strong>{formatEventTime(eventData.report_time || eventData.start_time)}</strong>.
            </div>
          ) : (
            <div className="space-y-2.5">
              {eventLiveUpdates.map((upd) => (
                <div key={upd.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-800">
                  <p className="font-semibold text-gray-900 leading-relaxed text-sm mb-1">{upd.text}</p>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono pt-1">
                    <span>{upd.author}</span>
                    <span>{new Date(upd.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7. Slots & Booking Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
              7
            </span>
            <span>Slots & Confirmation</span>
          </h2>

          <div className="mb-6">
            <div className="flex items-center justify-between text-sm font-bold text-gray-700 mb-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>
                  {booked} / {needed} Boys Booked
                </span>
              </span>
              <span className="text-emerald-700 font-extrabold">{remaining} Spots Remaining</span>
            </div>
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${isFull ? 'bg-rose-500' : 'bg-emerald-600'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Booking CTA Button */}
          {userBooking ? (
            <div className="text-center p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <p className="text-sm font-bold text-emerald-800 mb-1">✓ You have already booked a slot</p>
              <p className="text-xs text-gray-600 mb-3">
                Need to cancel? You can cancel up to 24 hours prior to the event.
              </p>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
              >
                Cancel My Booking
              </button>
            </div>
          ) : isFull ? (
            <button
              disabled
              className="w-full py-4 px-6 rounded-2xl bg-gray-200 text-gray-500 font-extrabold text-base cursor-not-allowed text-center"
            >
              All Slots Filled for this Event
            </button>
          ) : !user ? (
            <Link
              to={`/login?next=/events/${id}`}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 px-6 rounded-2xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 text-center"
            >
              <span>Log in as Catering Boy to Book Slot</span>
            </Link>
          ) : !isWorker ? (
            <div className="text-center p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <p className="text-sm font-bold text-gray-800 mb-1">Company Account</p>
              <p className="text-xs text-gray-600">
                You are logged in with an event company profile. Only catering boys can book event slots.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleBookSlot}
              disabled={bookingLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold py-4 px-6 rounded-2xl text-base transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-700/20 disabled:opacity-60"
            >
              {bookingLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirm & Book My Slot ({formatCurrency(eventData.wage_per_boy)})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-gray-900 text-center mb-1">Cancel Your Slot?</h3>
            <p className="text-xs text-gray-600 text-center mb-5">
              Notice: Cancellations must be made at least 24 hours before event start time so other boys can take the spot.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for cancellation (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder="e.g. Exam conflict, transport issue..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
