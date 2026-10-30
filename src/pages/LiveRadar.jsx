import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Radio,
  Building2,
  User,
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getStoredEvents, SAMPLE_CATERING_BOYS } from '../lib/eventsStorage'
import UberLiveMap from '../components/UberLiveMap'

export default function LiveRadar() {
  const { isCompany, isWorker } = useAuth()
  const [searchParams] = useSearchParams()
  const requestedPov = searchParams.get('pov') // 'company' or 'boy'

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    try {
      const stored = getStoredEvents()
      setEvents(stored)
    } catch (err) {
      console.warn('Error loading radar events:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    window.addEventListener('catercrew_events_updated', loadData)
    window.addEventListener('storage', loadData)
    return () => {
      window.removeEventListener('catercrew_events_updated', loadData)
      window.removeEventListener('storage', loadData)
    }
  }, [])

  const initialPov = requestedPov || (isCompany ? 'company' : isWorker ? 'boy' : 'company')

  return (
    <div className="min-h-screen bg-gray-950 text-white py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                to="/events"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Events Feed</span>
              </Link>
              <span className="text-gray-600">•</span>
              <span className="font-mono text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                UBER GPS RADAR
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>CaterCrew Live Radar</span>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Real-time Google Maps radar tracking catering events and nearby verified boys across
              Kerala.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-gray-200 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl border border-gray-800 transition-colors"
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Event List View</span>
            </Link>
          </div>
        </div>

        {/* Live Radar Map */}
        <div className="space-y-4">
          <UberLiveMap
            events={events}
            cateringBoys={SAMPLE_CATERING_BOYS}
            initialPov={initialPov}
            height="720px"
          />

          {/* Quick Guide Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                <Building2 className="w-4 h-4" />
                <span>Event Company POV</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Center on your venue, view catering staff reporting in real-time, inspect distance
                and ETA in minutes, and contact them instantly via 1-tap WhatsApp or Direct Call.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-1">
                <User className="w-4 h-4" />
                <span>Catering Boy POV</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Pin your current GPS location, see nearby catering jobs paying ₹1,200+ with travel
                distance, and launch 1-click turn-by-turn navigation directly in Google Maps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
