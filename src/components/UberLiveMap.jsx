import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps'
import {
  MapPin,
  Navigation,
  Phone,
  MessageCircle,
  Users,
  Clock,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Compass,
  Building2,
  User,
  Radio,
  Layers,
  ArrowRight,
  ExternalLink,
  LocateFixed,
  AlertCircle,
  Play,
  Pause,
} from 'lucide-react'
import { DISTRICTS, TIERS } from '../lib/constants'
import {
  DISTRICT_COORDINATES,
  calculateDistanceKm,
  calculateEtaMinutes,
} from '../lib/eventsStorage'

// Helper component to pan and zoom smoothly when district or location changes
function MapCameraController({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (map && center) {
      map.panTo(center)
      if (zoom) map.setZoom(zoom)
    }
  }, [map, center, zoom])
  return null
}

export default function UberLiveMap({
  events = [],
  cateringBoys = [],
  initialPov = 'company', // 'company' or 'boy'
  selectedEventId = null,
  onSelectEvent = null,
  height = '620px',
  compact = false,
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

  // POV mode: 'company' (Event Company POV) or 'boy' (Catering Boy POV)
  const [povMode, setPovMode] = useState(initialPov)
  const [selectedDistrict, setSelectedDistrict] = useState('Ernakulam')
  const [activeBoyFilter, setActiveBoyFilter] = useState('all') // all, en_route, checked_in, available

  // Active selections
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedBoy, setSelectedBoy] = useState(null)

  // Catering Boy POV simulation center
  const [boyLocation, setBoyLocation] = useState({
    lat: 10.0150,
    lng: 76.3050,
    name: 'My Current Location (Edappally, Kochi)',
  })
  const [geoLocating, setGeoLocating] = useState(false)

  // Live simulation of moving catering boys (Uber effect)
  const [isSimulating, setIsSimulating] = useState(true)
  const [liveBoys, setLiveBoys] = useState(cateringBoys)

  // Sync incoming props
  useEffect(() => {
    setLiveBoys(cateringBoys)
  }, [cateringBoys])

  // Select first event by default if passed or available
  useEffect(() => {
    if (selectedEventId && events.length > 0) {
      const match = events.find((e) => String(e.id) === String(selectedEventId))
      if (match) setSelectedEvent(match)
    } else if (events.length > 0 && !selectedEvent) {
      setSelectedEvent(events[0])
    }
  }, [selectedEventId, events, selectedEvent])

  // Map center calculation
  const mapCenter = useMemo(() => {
    if (povMode === 'boy') {
      return { lat: boyLocation.lat, lng: boyLocation.lng }
    }
    if (selectedEvent && selectedEvent.latitude && selectedEvent.longitude) {
      return { lat: Number(selectedEvent.latitude), lng: Number(selectedEvent.longitude) }
    }
    if (DISTRICT_COORDINATES[selectedDistrict]) {
      return {
        lat: DISTRICT_COORDINATES[selectedDistrict].lat,
        lng: DISTRICT_COORDINATES[selectedDistrict].lng,
      }
    }
    return { lat: 10.0261, lng: 76.3082 } // Kochi default
  }, [povMode, boyLocation, selectedEvent, selectedDistrict])

  // Simulate subtle real-time motion for "en_route" catering boys
  useEffect(() => {
    if (!isSimulating) return
    const interval = setInterval(() => {
      setLiveBoys((prev) =>
        prev.map((b) => {
          if (b.status === 'en_route') {
            // Jitter / glide slightly toward target
            const deltaLat = (Math.random() - 0.48) * 0.0003
            const deltaLng = (Math.random() - 0.48) * 0.0003
            return {
              ...b,
              lat: Number((b.lat + deltaLat).toFixed(6)),
              lng: Number((b.lng + deltaLng).toFixed(6)),
            }
          }
          return b
        })
      )
    }, 2800)
    return () => clearInterval(interval)
  }, [isSimulating])

  // Handle District selector change
  const handleDistrictChange = (dist) => {
    setSelectedDistrict(dist)
    if (DISTRICT_COORDINATES[dist]) {
      const coords = DISTRICT_COORDINATES[dist]
      if (povMode === 'boy') {
        setBoyLocation({
          lat: coords.lat,
          lng: coords.lng,
          name: `Simulated Spot (${dist})`,
        })
      } else {
        const districtEv = events.find((e) => e.district?.toLowerCase() === dist.toLowerCase())
        if (districtEv) {
          setSelectedEvent(districtEv)
        }
      }
    }
  }

  // Request actual user browser GPS
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setGeoLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false)
        setBoyLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'My Real-Time GPS Location',
        })
      },
      (err) => {
        setGeoLocating(false)
        console.warn('Geolocation denied or failed, using Kerala default:', err)
        alert('Could not access GPS location. Switched to Kerala default coordinates.')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Filtered boys based on selection
  const visibleBoys = useMemo(() => {
    return liveBoys.filter((b) => {
      if (activeBoyFilter === 'all') return true
      return b.status === activeBoyFilter
    })
  }, [liveBoys, activeBoyFilter])

  // Active target center for distance calculations
  const referencePoint = useMemo(() => {
    if (povMode === 'company' && selectedEvent) {
      return {
        lat: Number(selectedEvent.latitude || 10.0261),
        lng: Number(selectedEvent.longitude || 76.3082),
        label: selectedEvent.venue_name || selectedEvent.title,
      }
    }
    return {
      lat: boyLocation.lat,
      lng: boyLocation.lng,
      label: 'My Position',
    }
  }, [povMode, selectedEvent, boyLocation])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white">
      {/* Top Header & POV Mode Switcher */}
      <div className="bg-gray-950/90 border-b border-gray-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                LIVE UBER RADAR
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5 flex items-center gap-2">
              <span>{povMode === 'company' ? 'Event Company POV' : 'Catering Boy POV'}</span>
              <span className="text-xs font-normal text-gray-400 hidden sm:inline">
                ({povMode === 'company' ? 'Track nearby catering boys & staff' : 'Find nearby catering events'})
              </span>
            </h2>
          </div>
        </div>

        {/* Mode Toggle & Simulation Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* POV Pill Switcher */}
          <div className="bg-gray-900 p-1 rounded-2xl border border-gray-800 flex items-center shadow-inner">
            <button
              type="button"
              onClick={() => {
                setPovMode('company')
                setSelectedBoy(null)
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                povMode === 'company'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Event Company</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPovMode('boy')
                setSelectedBoy(null)
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                povMode === 'boy'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Catering Boy</span>
            </button>
          </div>

          {/* Quick District Selector */}
          <select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-xs sm:text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-emerald-500 cursor-pointer"
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                📍 {d}
              </option>
            ))}
          </select>

          {/* GPS Locate Button for Boy POV */}
          {povMode === 'boy' && (
            <button
              type="button"
              onClick={handleGetMyLocation}
              disabled={geoLocating}
              className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-750 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Use my real GPS location"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">My GPS</span>
            </button>
          )}

          {/* Radar Movement Simulation Play/Pause */}
          <button
            type="button"
            onClick={() => setIsSimulating(!isSimulating)}
            className={`p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              isSimulating
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
            title={isSimulating ? 'Pause Radar Live Simulation' : 'Resume Radar Live Simulation'}
          >
            {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Filter Chips Bar (Quick Filters) */}
      <div className="bg-gray-950/60 border-b border-gray-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gray-400 font-medium">Filter Boys:</span>
          {[
            { id: 'all', label: `All (${liveBoys.length})` },
            {
              id: 'en_route',
              label: `🛵 En Route (${liveBoys.filter((b) => b.status === 'en_route').length})`,
            },
            {
              id: 'checked_in',
              label: `✅ Checked In (${liveBoys.filter((b) => b.status === 'checked_in').length})`,
            },
            {
              id: 'available',
              label: `🟢 Available Nearby (${liveBoys.filter((b) => b.status === 'available').length})`,
            },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveBoyFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeBoyFilter === f.id
                  ? 'bg-emerald-500 text-gray-950 font-bold'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Active Venue Pill (Company POV) */}
        {povMode === 'company' && selectedEvent && (
          <div className="flex items-center gap-2 text-gray-300 bg-gray-900 border border-gray-800 px-3 py-1 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[200px] font-semibold text-white">
              {selectedEvent.venue_name || selectedEvent.title}
            </span>
            <span className="text-[11px] text-emerald-400 bg-emerald-950 border border-emerald-800 px-1.5 py-0.2 rounded font-mono">
              {selectedEvent.slots_filled || selectedEvent.boys_booked || 0}/
              {selectedEvent.slots_total || selectedEvent.boys_needed || 10} Staff
            </span>
          </div>
        )}
      </div>

      {/* Main Map Canvas Area */}
      <div className="relative w-full" style={{ height }}>
        {apiKey ? (
          <APIProvider apiKey={apiKey} libraries={['marker']}>
            <Map
              mapId="DEMO_MAP_ID"
              defaultCenter={mapCenter}
              defaultZoom={12}
              gestureHandling="greedy"
              disableDefaultUI={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              className="w-full h-full"
            >
              <MapCameraController center={mapCenter} zoom={12} />

              {/* 1. Event Venue Pins */}
              {events.map((evt) => {
                if (!evt.latitude || !evt.longitude) return null
                const isSelected = selectedEvent && String(selectedEvent.id) === String(evt.id)
                const distance = calculateDistanceKm(
                  referencePoint.lat,
                  referencePoint.lng,
                  Number(evt.latitude),
                  Number(evt.longitude)
                )

                return (
                  <AdvancedMarker
                    key={evt.id}
                    position={{ lat: Number(evt.latitude), lng: Number(evt.longitude) }}
                    onClick={() => {
                      setSelectedEvent(evt)
                      setSelectedBoy(null)
                      if (onSelectEvent) onSelectEvent(evt)
                    }}
                    title={evt.title}
                  >
                    <div className="relative group cursor-pointer flex flex-col items-center">
                      {/* Uber-like pulsed venue pin */}
                      <div
                        className={`relative px-2.5 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-2xl transition-all duration-300 border-2 ${
                          isSelected
                            ? 'bg-amber-500 text-gray-950 border-white scale-110 ring-4 ring-amber-500/40'
                            : 'bg-gray-900 text-white border-amber-400 hover:scale-105'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 text-amber-900" />
                        <span className="text-xs font-black tracking-tight whitespace-nowrap">
                          {evt.wage_per_boy ? `₹${evt.wage_per_boy}` : 'EVENT'}
                        </span>
                        <span className="text-[10px] font-bold opacity-80">
                          {evt.slots_filled || 0}/{evt.slots_total || 10}
                        </span>
                      </div>

                      {/* Pin arrow point */}
                      <div
                        className={`w-2.5 h-2.5 rotate-45 -mt-1.5 border-r border-b ${
                          isSelected ? 'bg-amber-500 border-white' : 'bg-gray-900 border-amber-400'
                        }`}
                      />

                      {/* Radar pulse aura for active event */}
                      {isSelected && (
                        <div className="absolute -inset-4 rounded-full border-2 border-amber-400/50 animate-ping pointer-events-none" />
                      )}
                    </div>
                  </AdvancedMarker>
                )
              })}

              {/* 2. Catering Boy Markers (Uber-Style Avatars) */}
              {visibleBoys.map((boy) => {
                const isSelected = selectedBoy && selectedBoy.id === boy.id
                const distance = calculateDistanceKm(
                  referencePoint.lat,
                  referencePoint.lng,
                  boy.lat,
                  boy.lng
                )
                const eta = calculateEtaMinutes(distance)

                return (
                  <AdvancedMarker
                    key={boy.id}
                    position={{ lat: boy.lat, lng: boy.lng }}
                    onClick={() => {
                      setSelectedBoy({ ...boy, distanceKm: distance, etaMinutes: eta })
                    }}
                    title={`${boy.name} (${boy.worker_code})`}
                  >
                    <div className="relative cursor-pointer group flex flex-col items-center">
                      {/* Uber Avatar Pin */}
                      <div
                        className={`relative rounded-full p-0.5 shadow-xl transition-all duration-200 border-2 ${
                          isSelected
                            ? 'scale-125 ring-4 ring-emerald-400 border-white'
                            : boy.status === 'en_route'
                            ? 'border-emerald-400 animate-pulse'
                            : boy.status === 'checked_in'
                            ? 'border-sky-400'
                            : 'border-gray-500'
                        }`}
                      >
                        <img
                          src={boy.avatar}
                          alt={boy.name}
                          className="w-8 h-8 rounded-full object-cover bg-gray-800"
                        />

                        {/* Status mini badge badge */}
                        <div
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-gray-900 flex items-center justify-center text-[8px] font-bold ${
                            boy.status === 'en_route'
                              ? 'bg-emerald-500 text-white'
                              : boy.status === 'checked_in'
                              ? 'bg-sky-500 text-white'
                              : 'bg-emerald-400 text-gray-900'
                          }`}
                        >
                          {boy.status === 'en_route' ? '🛵' : '✓'}
                        </div>
                      </div>

                      {/* Mini Tag Below Avatar */}
                      <div className="mt-1 bg-gray-950/90 text-white border border-gray-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap shadow-md">
                        {boy.name.split(' ')[0]} • {eta}m
                      </div>
                    </div>
                  </AdvancedMarker>
                )
              })}

              {/* 3. Catering Boy POV - "My Current GPS Location" Pin */}
              {povMode === 'boy' && (
                <AdvancedMarker position={{ lat: boyLocation.lat, lng: boyLocation.lng }}>
                  <div className="relative flex flex-col items-center">
                    <div className="relative w-8 h-8 rounded-full bg-blue-600 border-3 border-white shadow-2xl flex items-center justify-center text-white">
                      <Navigation className="w-4 h-4 fill-white animate-spin-slow" />
                      <div className="absolute -inset-3 rounded-full border-2 border-blue-400/80 animate-ping pointer-events-none" />
                    </div>
                    <div className="mt-1 bg-blue-900 border border-blue-400/80 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-lg">
                      YOU ARE HERE
                    </div>
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        ) : (
          /* Graceful Fallback if API key missing */
          <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
            <h3 className="text-lg font-bold text-white">Google Maps Key Not Configured</h3>
            <p className="text-gray-400 text-sm max-w-md mt-1">
              Please enter your Google Maps API key in the setup window or in your configuration to
              view the interactive radar satellite & street maps.
            </p>
          </div>
        )}

        {/* Bottom Interactive Floating Sheet (Uber Card) */}
        <div className="absolute bottom-4 left-4 right-4 z-10 max-w-2xl mx-auto pointer-events-none">
          {selectedBoy ? (
            /* Selected Boy Card (Uber Driver Profile Style) */
            <div className="bg-gray-950/95 backdrop-blur-md border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-2xl pointer-events-auto text-white animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img
                      src={selectedBoy.avatar}
                      alt={selectedBoy.name}
                      className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-gray-950 text-[10px] font-black px-1.5 py-0.2 rounded-md uppercase">
                      {selectedBoy.tier}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-base sm:text-lg text-white">
                        {selectedBoy.name}
                      </h4>
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-950 border border-emerald-800/80 px-2 py-0.5 rounded">
                        {selectedBoy.worker_code}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span>★ {selectedBoy.rating}</span>
                      <span>•</span>
                      <span>{selectedBoy.events_completed} Events Done</span>
                      <span>•</span>
                      <span className="text-gray-300">📍 {selectedBoy.area}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBoy(null)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg bg-gray-900 border border-gray-800 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Status and ETA Metrics */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-800 text-center">
                <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-800/80">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Distance</span>
                  <span className="text-sm font-extrabold text-white">
                    {selectedBoy.distanceKm ? `${selectedBoy.distanceKm} km` : 'Near'}
                  </span>
                </div>
                <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-800/80">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Est. Arrival</span>
                  <span className="text-sm font-extrabold text-emerald-400">
                    ~{selectedBoy.etaMinutes || 8} mins
                  </span>
                </div>
                <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-800/80">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Status</span>
                  <span className="text-xs font-bold text-amber-300 capitalize truncate block">
                    {selectedBoy.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2.5 mt-3.5">
                <a
                  href={`tel:${selectedBoy.phone.replace(/\s+/g, '')}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-750 text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl border border-gray-700 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Call Staff</span>
                </a>
                <a
                  href={`https://wa.me/${selectedBoy.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hello ${selectedBoy.name}, this is regarding the CaterCrew event reporting.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-950"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Chat</span>
                </a>
              </div>
            </div>
          ) : selectedEvent ? (
            /* Selected Event Card (Uber Destination Style) */
            <div className="bg-gray-950/95 backdrop-blur-md border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-2xl pointer-events-auto text-white animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      {selectedEvent.event_type || 'Wedding'}
                    </span>
                    <span className="text-xs text-gray-400">
                      📅 {selectedEvent.event_date || 'Upcoming'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white mt-1 truncate">
                    {selectedEvent.title}
                  </h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate">{selectedEvent.company_name}</span>
                    <span>•</span>
                    <span className="text-gray-300">📍 {selectedEvent.area || selectedEvent.district}</span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg sm:text-xl font-black text-emerald-400">
                    ₹{selectedEvent.wage_per_boy || 1200}
                  </div>
                  <div className="text-[10px] text-gray-400">per catering boy</div>
                </div>
              </div>

              {/* Event Metrics */}
              <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-gray-800 text-center">
                <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-800/80">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Reporting</span>
                  <span className="text-xs sm:text-sm font-bold text-white truncate block">
                    {selectedEvent.reporting_time || '16:00'}
                  </span>
                </div>
                <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-800/80">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Slots Booked</span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-400">
                    {selectedEvent.slots_filled || selectedEvent.boys_booked || 0} /{' '}
                    {selectedEvent.slots_total || selectedEvent.boys_needed || 10}
                  </span>
                </div>
                <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-800/80">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Shortage/Needed</span>
                  <span className="text-xs sm:text-sm font-bold text-amber-400">
                    {Math.max(
                      0,
                      (selectedEvent.slots_total || selectedEvent.boys_needed || 10) -
                        (selectedEvent.slots_filled || selectedEvent.boys_booked || 0)
                    )}{' '}
                    Open
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 mt-3.5">
                {selectedEvent.google_maps_link || (selectedEvent.latitude && selectedEvent.longitude) ? (
                  <a
                    href={
                      selectedEvent.google_maps_link ||
                      `https://www.google.com/maps/dir/?api=1&destination=${selectedEvent.latitude},${selectedEvent.longitude}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-750 text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl border border-gray-700 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-400" />
                    <span>Navigate (Google Maps)</span>
                  </a>
                ) : null}

                <a
                  href={`/events/${selectedEvent.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-950"
                >
                  <span>View Event Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
