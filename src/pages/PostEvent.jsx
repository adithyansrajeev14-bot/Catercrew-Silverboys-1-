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
  Info
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { DISTRICTS, UNIFORM_OPTIONS } from '../lib/constants'
import { formatCurrency, calculateHours, validateGoogleMapsLink } from '../lib/formatters'
import { useAuth } from '../context/AuthContext'

export default function PostEvent() {
  const navigate = useNavigate()
  const { id } = useParams() // if edit mode
  const isEditMode = Boolean(id)

  const { user, isCompany, companyProfile, loading: authLoading } = useAuth()

  // Form State
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('Wedding Reception')
  const [description, setDescription] = useState('')

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

  // Slots & Wage
  const [boysNeeded, setBoysNeeded] = useState(10)
  const [wagePerBoy, setWagePerBoy] = useState(1200)
  const [paymentMode, setPaymentMode] = useState('Cash / UPI after event')
  const [paymentTiming, setPaymentTiming] = useState('Immediately after event completion')

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

  // Check auth
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login?next=/company/events/new', { replace: true })
      } else if (!isCompany) {
        navigate('/signup', { replace: true })
      } else if (companyProfile?.status === 'pending') {
        navigate('/company/dashboard', { replace: true })
      }
    }
  }, [user, isCompany, companyProfile, authLoading, navigate])

  // Load event if edit mode
  const loadEventForEdit = useCallback(async () => {
    if (!id) return
    setInitialLoading(true)
    try {
      const { data, error: fetchErr } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchErr) throw fetchErr

      if (data) {
        setTitle(data.title || '')
        setEventType(data.event_type || 'Wedding Reception')
        setDescription(data.description || '')
        setEventDate(data.event_date || '')
        setReportTime(data.report_time?.slice(0, 5) || '16:00')
        setStartTime(data.start_time?.slice(0, 5) || '17:00')
        setEndTime(data.end_time?.slice(0, 5) || '23:00')
        setVenueName(data.venue_name || '')
        setDistrict(data.district || 'Ernakulam')
        setArea(data.area || '')
        setFullAddress(data.full_address || '')
        setLandmark(data.landmark || '')
        setGoogleMapsLink(data.google_maps_link || '')
        setLatitude(data.latitude ? String(data.latitude) : '')
        setLongitude(data.longitude ? String(data.longitude) : '')
        setBoysNeeded(data.boys_needed || 10)
        setWagePerBoy(data.wage_per_boy || 1200)
        setPaymentMode(data.payment_mode || 'Cash / UPI after event')
        setPaymentTiming(data.payment_timing || 'Immediately after event completion')
        setUniformRequirements(data.uniform_requirements || [])
        setFoodProvided(data.food_provided ?? true)
        setTravelAllowance(data.travel_allowance ?? false)
        setNotes(data.notes || '')
      }
    } catch (err) {
      console.error('Error loading event:', err)
      setError('Failed to load event data for editing.')
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
      alert('Geolocation is not supported by your browser.')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6))
        setLongitude(pos.coords.longitude.toFixed(6))
        setGoogleMapsLink(`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`)
        setGeoLoading(false)
      },
      (err) => {
        console.warn('Geolocation error:', err)
        alert('Could not retrieve current location. Please check browser permissions.')
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

    // Basic Validations
    if (!title.trim()) {
      setError('Please provide an event title.')
      return
    }
    if (!eventDate) {
      setError('Please select the event date.')
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

    try {
      if (!isSupabaseConfigured) {
        alert('Supabase is not configured. Redirecting to dashboard...')
        navigate('/company/dashboard')
        return
      }

      const eventPayload = {
        company_id: companyProfile.id,
        title: title.trim(),
        event_type: eventType,
        description: description.trim(),
        event_date: eventDate,
        report_time: reportTime,
        start_time: startTime,
        end_time: endTime,
        duration_hours: durationHours,
        venue_name: venueName.trim(),
        district,
        area: area.trim(),
        full_address: fullAddress.trim(),
        landmark: landmark.trim(),
        google_maps_link: googleMapsLink.trim() || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        boys_needed: parseInt(boysNeeded, 10),
        wage_per_boy: parseInt(wagePerBoy, 10),
        payment_mode: paymentMode,
        payment_timing: paymentTiming,
        uniform_requirements: uniformRequirements,
        food_provided: foodProvided,
        travel_allowance: travelAllowance,
        notes: notes.trim(),
        status: 'active',
      }

      if (isEditMode) {
        const { error: updateErr } = await supabase
          .from('events')
          .update(eventPayload)
          .eq('id', id)
          .eq('company_id', companyProfile.id)

        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase.from('events').insert([eventPayload])

        if (insertErr) throw insertErr
      }

      navigate('/company/dashboard')
    } catch (err) {
      console.error('Error saving event:', err)
      setError(err.message || 'Could not save event. Please check the fields and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
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
            to="/company/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-emerald-700 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {isEditMode ? 'Edit Event Details' : 'Post a New Catering Event'}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Fill in the event requirements. Once published, verified catering boys across Kerala can book slots immediately.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Event Details */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Event Type
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
                    placeholder="e.g. 500 guests buffet"
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
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
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
              <span>{durationHours} Hours</span>
            </div>
          </div>

          {/* Card 3: Location & Google Maps */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>Location & Venue</span>
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
                    Area / Town *
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
              </div>

              {/* Lat / Lng inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Latitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="10.0261"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Longitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="76.3125"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Slots & Wage */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span>Slots & Wage Configuration</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Number of Boys Needed *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900 font-bold"
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
              <div className="text-2xl font-black text-emerald-700">
                {formatCurrency(totalBudget)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Mode</label>
                <input
                  type="text"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  placeholder="Cash / UPI"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Timing</label>
                <input
                  type="text"
                  value={paymentTiming}
                  onChange={(e) => setPaymentTiming(e.target.value)}
                  placeholder="After event completion"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Uniform & Logistics */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
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
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600"
                />
                <div>
                  <span className="text-sm font-bold text-gray-800 block">Food / Meals Provided</span>
                  <span className="text-xs text-gray-500">Buffet or meal served to staff</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={travelAllowance}
                  onChange={(e) => setTravelAllowance(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600"
                />
                <div>
                  <span className="text-sm font-bold text-gray-800 block">Travel Allowance</span>
                  <span className="text-xs text-gray-500">Pickup or extra travel pay included</span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Special Instructions / Grooming Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Please bring clean black shoes. Report to coordinator Rajesh on arrival."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black py-4 px-8 rounded-2xl text-base transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-700/20 disabled:opacity-60"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isEditMode ? 'Save & Update Event' : 'Publish Catering Event'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
