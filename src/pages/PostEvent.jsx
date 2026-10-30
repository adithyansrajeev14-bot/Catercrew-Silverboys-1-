import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Navigation,
  Sparkles,
  Building2,
  DollarSign,
  Shirt,
  Info,
  ShieldCheck,
  LogIn,
  UserPlus
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { DISTRICTS, UNIFORM_OPTIONS } from '../lib/constants'
import { formatCurrency, calculateHours, validateGoogleMapsLink } from '../lib/formatters'
import { useAuth } from '../context/AuthContext'

export default function PostEvent() {
  const navigate = useNavigate()
  const { id } = useParams() // if edit mode
  const isEditMode = Boolean(id)

  const { user, isCompany, isWorker, companyProfile, loading: authLoading } = useAuth()

  // Form State
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('Wedding Reception')
  const [description, setDescription] = useState('')

  // Guest company info (used if guest mode or creating first event)
  const [guestCompanyName, setGuestCompanyName] = useState('')

  // Timing
  const [eventDate, setEventDate] = useState('')
  const [reportTime, setReportTime] = useState('16:00')
  const [startTime, setStartTime] = useState('17:00')
  const [endTime, setEndTime] = useState('23:00')

  // Location
  const [venueName, setVenueName] = useState('')
  const [district, setDistrict] = useState('Ernakulam')
  const [area, setArea] = useState('')
  const [fullAddress, setFullAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [googleMapsLink, setGoogleMapsLink] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoSuccess, setGeoSuccess] = useState('')

  // Slots & Wage
  const [boysNeeded, setBoysNeeded] = useState(10)
  const [wagePerBoy, setWagePerBoy] = useState(1200)
  const [paymentMode, setPaymentMode] = useState('cash')
  const [paymentTiming, setPaymentTiming] = useState('same day')

  // Uniform & Extras
  const [uniformRequirements, setUniformRequirements] = useState([
    'Black formal shirt',
    'Black formal pant',
    'Black shoes',
  ])
  const [foodProvided, setFoodProvided] = useState(true)
  const [travelAllowance, setTravelAllowance] = useState(false)
  const [notes, setNotes] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEditMode)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Load event if edit mode
  const loadEventForEdit = useCallback(async () => {
    if (!id) return
    setInitialLoading(true)
    try {
      // 1. Try Supabase
      if (isSupabaseConfigured) {
        const { data, error: fetchErr } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (!fetchErr && data) {
          setTitle(data.title || '')
          setEventType(data.event_type || 'Wedding Reception')
          setDescription(data.description || '')
          setEventDate(data.event_date || '')
          setReportTime(data.reporting_time?.slice(0, 5) || data.report_time?.slice(0, 5) || '16:00')
          setStartTime(data.start_time?.slice(0, 5) || '17:00')
          setEndTime(data.end_time?.slice(0, 5) || '23:00')
          setVenueName(data.place_name || data.venue_name || '')
          setDistrict(data.district || 'Ernakulam')
          setArea(data.area || '')
          setFullAddress(data.address || data.full_address || '')
          setLandmark(data.landmark || '')
          setGoogleMapsLink(data.map_link || data.google_maps_link || '')
          setLatitude(data.latitude ? String(data.latitude) : '')
          setLongitude(data.longitude ? String(data.longitude) : '')
          setBoysNeeded(data.slots_total || data.boys_needed || 10)
          setWagePerBoy(data.wage_per_boy || 1200)
          setPaymentMode(data.payment_mode || 'cash')
          setPaymentTiming(data.payment_timing || 'same day')
          setUniformRequirements(Array.isArray(data.uniform) ? data.uniform : data.uniform_requirements || [])
          setFoodProvided(data.food_provided ?? true)
          setTravelAllowance(data.transport_provided ?? data.travel_allowance ?? false)
          setNotes(data.notes || '')
          setInitialLoading(false)
          return
        }
      }

      // 2. Try localStorage
      const stored = localStorage.getItem('catercrew_custom_events')
      if (stored) {
        const list = JSON.parse(stored)
        const found = list.find((e) => String(e.id) === String(id))
        if (found) {
          setTitle(found.title || '')
          setEventType(found.event_type || 'Wedding Reception')
          setDescription(found.description || '')
          setEventDate(found.event_date || '')
          setReportTime(found.reporting_time || found.report_time || '16:00')
          setStartTime(found.start_time || '17:00')
          setEndTime(found.end_time || '23:00')
          setVenueName(found.place_name || found.venue_name || '')
          setDistrict(found.district || 'Ernakulam')
          setArea(found.area || '')
          setFullAddress(found.address || found.full_address || '')
          setLandmark(found.landmark || '')
          setGoogleMapsLink(found.map_link || found.google_maps_link || '')
          setLatitude(found.latitude ? String(found.latitude) : '')
          setLongitude(found.longitude ? String(found.longitude) : '')
          setBoysNeeded(found.slots_total || found.boys_needed || 10)
          setWagePerBoy(found.wage_per_boy || 1200)
          setPaymentMode(found.payment_mode || 'cash')
          setPaymentTiming(found.payment_timing || 'same day')
          setUniformRequirements(found.uniform || found.uniform_requirements || [])
          setFoodProvided(found.food_provided ?? true)
          setTravelAllowance(found.travel_allowance ?? false)
          setNotes(found.notes || '')
        }
      }
    } catch (err) {
      console.error('Error loading event for edit:', err)
      setError('Failed to load event data.')
    } finally {
      setInitialLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (isEditMode) {
      loadEventForEdit()
    }
  }, [isEditMode, loadEventForEdit])

  // Toggle uniform requirement
  const handleToggleUniform = (item) => {
    if (uniformRequirements.includes(item)) {
      setUniformRequirements(uniformRequirements.filter((u) => u !== item))
    } else {
      setUniformRequirements([...uniformRequirements, item])
    }
  }

  // Geolocation
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setGeoLoading(true)
    setGeoSuccess('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6)
        const lng = pos.coords.longitude.toFixed(6)
        setLatitude(lat)
        setLongitude(lng)
        setGoogleMapsLink(`https://maps.google.com/?q=${lat},${lng}`)
        setGeoLoading(false)
        setGeoSuccess('Current venue coordinates detected!')
        setTimeout(() => setGeoSuccess(''), 4000)
      },
      (err) => {
        console.warn('Geolocation error:', err)
        setError('Could not retrieve current location. Please allow browser location permissions or paste a Google Maps link.')
        setGeoLoading(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Calculated duration
  const durationHours = useMemo(() => {
    return calculateHours(startTime, endTime)
  }, [startTime, endTime])

  // Total budget preview
  const totalBudget = useMemo(() => {
    return (Number(boysNeeded) || 0) * (Number(wagePerBoy) || 0)
  }, [boysNeeded, wagePerBoy])

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    // Basic Validations
    if (!title.trim()) {
      setError('Please provide an event title.')
      window.scrollTo({ top: 120, behavior: 'smooth' })
      return
    }
    if (!eventDate) {
      setError('Please select the event date.')
      window.scrollTo({ top: 120, behavior: 'smooth' })
      return
    }
    if (Number(boysNeeded) < 1) {
      setError('Number of catering boys needed must be at least 1.')
      return
    }
    if (Number(wagePerBoy) < 500) {
      setError('Wage per boy must be at least ₹500.')
      return
    }

    if (googleMapsLink && !validateGoogleMapsLink(googleMapsLink)) {
      setError('Please provide a valid Google Maps URL or leave blank.')
      return
    }

    setLoading(true)

    // Map Event Type to SQL check constraint: ('wedding', 'party', 'corporate', 'festival', 'other')
    let mappedEventType = 'wedding'
    const evLower = eventType.toLowerCase()
    if (evLower.includes('wedding') || evLower.includes('marriage') || evLower.includes('nikkah')) {
      mappedEventType = 'wedding'
    } else if (evLower.includes('party') || evLower.includes('birthday') || evLower.includes('anniversary')) {
      mappedEventType = 'party'
    } else if (evLower.includes('corporate') || evLower.includes('banquet') || evLower.includes('expo')) {
      mappedEventType = 'corporate'
    } else if (evLower.includes('festival') || evLower.includes('sadya') || evLower.includes('feast')) {
      mappedEventType = 'festival'
    } else {
      mappedEventType = 'other'
    }

    // Map Payment Timing to SQL check constraint: ('same day', 'next day', 'within 3 days', 'within a week')
    let mappedPaymentTiming = 'same day'
    if (paymentTiming.includes('next day')) mappedPaymentTiming = 'next day'
    else if (paymentTiming.includes('3 days')) mappedPaymentTiming = 'within 3 days'
    else if (paymentTiming.includes('week')) mappedPaymentTiming = 'within a week'
    else mappedPaymentTiming = 'same day'

    // Map Payment Mode to SQL check constraint: ('cash', 'UPI', 'bank transfer')
    let mappedPaymentMode = 'cash'
    if (paymentMode.toLowerCase().includes('upi')) mappedPaymentMode = 'UPI'
    else if (paymentMode.toLowerCase().includes('bank')) mappedPaymentMode = 'bank transfer'
    else mappedPaymentMode = 'cash'

    const companyId =
      companyProfile?.id ||
      companyProfile?.company_id ||
      user?.id ||
      'company-preview'

    const effectiveCompanyName =
      companyProfile?.company_name ||
      companyProfile?.name ||
      guestCompanyName.trim() ||
      'Verified Catering Company'

    const eventId = isEditMode && id ? id : `event-${Date.now()}`

    // Robust Event Payload with both SQL column names and alias names
    const eventPayload = {
      company_id: companyId,
      title: title.trim(),
      event_type: mappedEventType,
      description: description.trim(),
      event_date: eventDate,
      reporting_time: reportTime,
      report_time: reportTime,
      start_time: startTime,
      end_time: endTime,
      duration_hours: durationHours ? parseFloat(durationHours) || 6 : 6,
      place_name: venueName.trim() || 'Auditorium',
      venue_name: venueName.trim() || 'Auditorium',
      district,
      area: area.trim(),
      address: fullAddress.trim() || area.trim() || district,
      full_address: fullAddress.trim() || area.trim() || district,
      landmark: landmark.trim(),
      map_link: googleMapsLink.trim() || null,
      google_maps_link: googleMapsLink.trim() || null,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      slots_total: parseInt(boysNeeded, 10),
      boys_needed: parseInt(boysNeeded, 10),
      wage_per_boy: parseInt(wagePerBoy, 10),
      payment_mode: mappedPaymentMode,
      payment_timing: mappedPaymentTiming,
      uniform: uniformRequirements,
      uniform_requirements: uniformRequirements,
      food_provided: Boolean(foodProvided),
      transport_provided: Boolean(travelAllowance),
      travel_allowance: Boolean(travelAllowance),
      notes: notes.trim(),
      status: 'open',
    }

    try {
      // 1. Save to Supabase if configured and user is logged in
      let supabaseSuccess = false
      if (isSupabaseConfigured && user) {
        try {
          if (isEditMode) {
            const { error: updateErr } = await supabase
              .from('events')
              .update(eventPayload)
              .eq('id', id)

            if (!updateErr) supabaseSuccess = true
          } else {
            const { error: insertErr } = await supabase.from('events').insert([eventPayload])
            if (!insertErr) supabaseSuccess = true
          }
        } catch (dbErr) {
          console.warn('Supabase insert notice (will persist to local storage):', dbErr)
        }
      }

      // 2. Save/Update in localStorage catercrew_custom_events
      try {
        const fullEventRecord = {
          ...eventPayload,
          id: eventId,
          company_name: effectiveCompanyName,
          company_district: district,
          slots_filled: 0,
          boys_booked: 0,
          created_at: new Date().toISOString(),
        }

        const stored = localStorage.getItem('catercrew_custom_events')
        let existingList = stored ? JSON.parse(stored) : []
        if (!Array.isArray(existingList)) existingList = []

        // Remove old version if editing, prepend new event
        existingList = [fullEventRecord, ...existingList.filter((e) => String(e.id) !== String(eventId))]
        localStorage.setItem('catercrew_custom_events', JSON.stringify(existingList))

        // Notify other components & tabs
        window.dispatchEvent(new Event('catercrew_events_updated'))
        window.dispatchEvent(new Event('storage'))
      } catch (localErr) {
        console.warn('Error saving to local storage:', localErr)
      }

      setSuccessMsg('Event posted successfully! Redirecting to Events feed...')

      // Redirect to /events after short delay so boys can see it
      setTimeout(() => {
        navigate('/events')
      }, 800)
    } catch (err) {
      console.error('Error saving event:', err)
      setError(err.message || 'Could not save event. Please verify all fields.')
      setLoading(false)
    }
  }

  if (initialLoading || authLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Top Header */}
        <div className="mb-6">
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-500 hover:text-emerald-700 transition-colors mb-3 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Events Feed</span>
          </Link>

          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {companyProfile?.company_name
                  ? companyProfile.company_name
                  : isCompany
                  ? 'Event Company Portal'
                  : 'Company Event Creator'}
              </span>
            </span>
            {companyProfile?.status === 'pending' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                <span>Account Reviewing • Event Will Go Live</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {isEditMode ? 'Edit Catering Event' : 'Post New Catering Event'}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Publish your staffing requirement with transparent pay. Verified Silver Boys across Kerala will be able to view and book your slots instantly.
          </p>
        </div>

        {/* Worker Notice Banner (if logged in as worker) */}
        {isWorker && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm shadow-sm flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">You are currently signed in as a Catering Boy.</p>
              <p className="text-xs text-amber-800 mt-1">
                Events are posted by Event Management and Catering Companies. You can test posting here, or register an Event Company account to manage your business.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline hover:text-amber-950"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Register Event Company</span>
                </Link>
                <Link
                  to="/events"
                  className="text-xs font-semibold text-amber-800 underline hover:text-amber-950"
                >
                  Browse Events to Work
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Guest Banner (if not logged in) */}
        {!user && (
          <div className="mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Posting as Event Company</span>
                </p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Sign in to link this event to your verified business profile, or post now with your company name.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/login?next=/post-event"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-colors inline-flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/signup"
                  className="bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-bold px-3.5 py-2 rounded-xl text-xs transition-colors inline-flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up Company</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Error / Success Banners */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Event Details */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                1
              </span>
              <span>Event Details</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Grand Royal Wedding Reception"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 font-medium"
                />
              </div>

              {!companyProfile?.company_name && (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Your Company / Caterer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestCompanyName}
                    onChange={(e) => setGuestCompanyName(e.target.value)}
                    placeholder="e.g. Al-Saj Conventions & Catering / Royal Events"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Event Type *
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 cursor-pointer"
                  >
                    <option value="Wedding Reception">Wedding Reception</option>
                    <option value="Wedding / Nikkah / Marriage">Wedding / Nikkah / Marriage</option>
                    <option value="Corporate Banquet">Corporate Banquet</option>
                    <option value="Birthday / Anniversary">Birthday / Anniversary</option>
                    <option value="Traditional Sadya">Traditional Sadya</option>
                    <option value="Exhibition / Expo">Exhibition / Expo</option>
                    <option value="Other Function">Other Function</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Expected Guests / Scale
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 800 guests buffet service"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Timing Schedule */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                2
              </span>
              <span>Timing Schedule</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Event Date *
                </label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Boys Reporting Time *
                </label>
                <input
                  type="time"
                  required
                  value={reportTime}
                  onChange={(e) => setReportTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 cursor-pointer"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">Usually 1 hour before start time</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Event Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Event Expected End Time *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-3 p-3 bg-emerald-50 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between">
              <span>Calculated Work Duration:</span>
              <span>{durationHours || '6 hrs'}</span>
            </div>
          </div>

          {/* Card 3: Location & Google Maps */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                3
              </span>
              <span>Location & Google Maps</span>
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    District (Kerala) *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 cursor-pointer"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Town / Area *
                  </label>
                  <input
                    type="text"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Edappally / Aluva"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Venue / Hall Name *
                </label>
                <input
                  type="text"
                  required
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. Cochin Palace Auditorium"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Full Address & Landmark
                </label>
                <input
                  type="text"
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="Detailed address, road, opposite landmark"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900"
                />
              </div>

              {/* Google Maps link & coordinates */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-800">
                    Google Maps Link
                  </label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={geoLoading}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
                    <span>{geoLoading ? 'Locating...' : 'Use My Current Location'}</span>
                  </button>
                </div>
                <input
                  type="url"
                  value={googleMapsLink}
                  onChange={(e) => setGoogleMapsLink(e.target.value)}
                  placeholder="https://maps.app.goo.gl/... or https://maps.google.com/?q=..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 font-mono text-xs"
                />
                {geoSuccess && (
                  <p className="text-xs text-emerald-600 mt-1 font-semibold">{geoSuccess}</p>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Slots & Wage */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                4
              </span>
              <span>Slots & Wage Configuration</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Number of Catering Boys Needed *
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  required
                  value={boysNeeded}
                  onChange={(e) => setBoysNeeded(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Wage per Boy (₹) *
                </label>
                <input
                  type="number"
                  min="500"
                  step="50"
                  required
                  value={wagePerBoy}
                  onChange={(e) => setWagePerBoy(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 font-bold text-emerald-700"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">Formatted: {formatCurrency(wagePerBoy)}</span>
              </div>
            </div>

            {/* Total Budget Preview */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                  Total Staff Wage Budget
                </span>
                <span className="text-xs text-gray-600">
                  {boysNeeded} boys × {formatCurrency(wagePerBoy)}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                {formatCurrency(totalBudget)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 cursor-pointer"
                >
                  <option value="cash">Cash after event</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="bank transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Payment Timing</label>
                <select
                  value={paymentTiming}
                  onChange={(e) => setPaymentTiming(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 cursor-pointer"
                >
                  <option value="same day">Same day (Immediately after event)</option>
                  <option value="next day">Next day</option>
                  <option value="within 3 days">Within 3 days</option>
                  <option value="within a week">Within a week</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 5: Uniform & Logistics */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                5
              </span>
              <span>Uniform & Requirements</span>
            </h2>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Required Dress Code (Click to toggle)
              </label>
              <div className="flex flex-wrap gap-2">
                {UNIFORM_OPTIONS.map((item) => {
                  const isSelected = uniformRequirements.includes(item)
                  return (
                    <button
                      type="button"
                      key={item}
                      onClick={() => handleToggleUniform(item)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isSelected ? `✓ ${item}` : item}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <label className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={foodProvided}
                  onChange={(e) => setFoodProvided(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-bold text-gray-800 block">Food Provided</span>
                  <span className="text-xs text-gray-500">Buffet or meal served to boys</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={travelAllowance}
                  onChange={(e) => setTravelAllowance(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-bold text-gray-800 block">Transport Provided / Allowance</span>
                  <span className="text-xs text-gray-500">Pickup or extra travel allowance</span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Special Instructions / Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Please bring clean black formal shoes. Report to coordinator Rajesh on arrival."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black py-4 px-8 rounded-2xl text-base sm:text-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-700/20 disabled:opacity-60"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isEditMode ? 'Save & Update Event' : 'Publish Catering Event Now'}</span>
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2 font-medium">
              Your event will be published immediately to the Events tab for all verified Catering Boys.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
