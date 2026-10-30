import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  ExternalLink,
  Trash2,
  Building2,
  Plus,
  Edit2,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Radio,
  X,
  AlertCircle,
  Save,
  DollarSign,
  Shirt,
} from 'lucide-react'
import { DISTRICTS, UNIFORM_OPTIONS } from '../lib/constants'
import { formatCurrency, formatEventDate, formatEventTime } from '../lib/formatters'
import {
  getStoredEvents,
  saveEvent,
  deleteEvent,
  updateEventStatus,
  DISTRICT_COORDINATES,
  SAMPLE_CATERING_BOYS,
} from '../lib/eventsStorage'
import UberLiveMap from './UberLiveMap'

export default function AdminEventsTab() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all') // all, active, full, completed, cancelled
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Sub-view: 'list' or 'radar' (Live Uber Map)
  const [viewMode, setViewMode] = useState('list')

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    company_contact: '',
    event_type: 'wedding',
    event_date: new Date().toISOString().slice(0, 10),
    reporting_time: '16:00',
    start_time: '17:30',
    end_time: '23:30',
    district: 'Ernakulam',
    area: '',
    venue_name: '',
    address: '',
    wage_per_boy: 1200,
    boys_needed: 10,
    uniform_requirements: ['Black formal shirt', 'Black formal pant', 'Black shoes'],
    food_provided: true,
    travel_allowance: false,
    notes: '',
    status: 'active',
  })

  // Load events
  const loadEvents = useCallback(() => {
    try {
      const data = getStoredEvents()
      setEvents(data)
    } catch (err) {
      console.error('Error loading events:', err)
      setError('Failed to load events.')
    }
  }, [])

  useEffect(() => {
    loadEvents()
    window.addEventListener('catercrew_events_updated', loadEvents)
    window.addEventListener('storage', loadEvents)
    return () => {
      window.removeEventListener('catercrew_events_updated', loadEvents)
      window.removeEventListener('storage', loadEvents)
    }
  }, [loadEvents])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingEventId(null)
    setFormData({
      title: '',
      company_name: 'CaterCrew Partner Events',
      company_contact: '+91 94000 88221',
      event_type: 'wedding',
      event_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      reporting_time: '16:00',
      start_time: '17:30',
      end_time: '23:30',
      district: 'Ernakulam',
      area: 'Edappally',
      venue_name: '',
      address: '',
      wage_per_boy: 1200,
      boys_needed: 12,
      uniform_requirements: ['Black formal shirt', 'Black formal pant', 'Black shoes'],
      food_provided: true,
      travel_allowance: false,
      notes: '',
      status: 'active',
    })
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (evt) => {
    setEditingEventId(evt.id)
    setFormData({
      title: evt.title || '',
      company_name: evt.company_name || '',
      company_contact: evt.company_contact || '+91 94000 88221',
      event_type: evt.event_type || 'wedding',
      event_date: evt.event_date || new Date().toISOString().slice(0, 10),
      reporting_time: (evt.reporting_time || '16:00').slice(0, 5),
      start_time: (evt.start_time || '17:30').slice(0, 5),
      end_time: (evt.end_time || '23:30').slice(0, 5),
      district: evt.district || 'Ernakulam',
      area: evt.area || '',
      venue_name: evt.venue_name || evt.place_name || '',
      address: evt.address || '',
      wage_per_boy: evt.wage_per_boy || 1200,
      boys_needed: evt.slots_total || evt.boys_needed || 10,
      uniform_requirements: evt.uniform_requirements || ['Black formal shirt', 'Black formal pant', 'Black shoes'],
      food_provided: Boolean(evt.food_provided),
      travel_allowance: Boolean(evt.travel_allowance),
      notes: evt.notes || '',
      status: evt.status || 'active',
    })
    setIsModalOpen(true)
  }

  // Handle Form Submit (Create or Update)
  const handleSaveForm = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('Please enter an event title.')
      return
    }

    setActionLoading(true)
    try {
      const payload = {
        ...formData,
        id: editingEventId || `evt-${Date.now()}`,
        place_name: formData.venue_name || 'Auditorium',
        slots_total: Number(formData.boys_needed),
        boys_needed: Number(formData.boys_needed),
        wage_per_boy: Number(formData.wage_per_boy),
      }

      await saveEvent(payload)
      setIsModalOpen(false)
      loadEvents()
    } catch (err) {
      console.error('Error saving event:', err)
      alert('Error saving event: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Quick Status Toggle
  const handleStatusChange = async (eventId, newStatus) => {
    setActionLoading(true)
    try {
      await updateEventStatus(eventId, newStatus)
      loadEvents()
    } catch (err) {
      alert('Failed to update event status: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Event
  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? It will be removed from all public pages.')) {
      return
    }
    setActionLoading(true)
    try {
      await deleteEvent(eventId)
      loadEvents()
    } catch (err) {
      alert('Failed to delete event: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (activeTab !== 'all' && e.status !== activeTab) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        return (
          (e.title || '').toLowerCase().includes(q) ||
          (e.company_name || '').toLowerCase().includes(q) ||
          (e.district || '').toLowerCase().includes(q) ||
          (e.area || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [events, activeTab, searchQuery])

  const counts = useMemo(() => {
    return {
      all: events.length,
      active: events.filter((e) => e.status === 'active' || e.status === 'open').length,
      full: events.filter((e) => e.status === 'full').length,
      completed: events.filter((e) => e.status === 'completed').length,
      cancelled: events.filter((e) => e.status === 'cancelled').length,
    }
  }, [events])

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Event Management & Live Radar
            </h2>
            <span className="font-mono text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full font-bold">
              {events.length} TOTAL
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            All events created or modified here are dynamically synchronized across the public Event
            page and report tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switch View Mode: List vs Live Radar Map */}
          <div className="bg-gray-950 p-1 rounded-xl border border-gray-800 flex items-center">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('radar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'radar'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Uber Radar Map</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-950 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {/* If Live Radar Map Mode */}
      {viewMode === 'radar' ? (
        <div className="space-y-4">
          <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 text-xs text-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
              <span>
                <strong>Admin Live Command:</strong> Monitoring all events and catering staff positions
                in real time. Toggle between Company POV and Catering Boy POV below.
              </span>
            </div>
            <button
              onClick={() => setViewMode('list')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              Return to List
            </button>
          </div>
          <UberLiveMap events={events} cateringBoys={SAMPLE_CATERING_BOYS} height="680px" />
        </div>
      ) : (
        /* List Mode */
        <>
          {/* Filter and Search Bar */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `All (${counts.all})` },
                { id: 'active', label: `Active (${counts.active})` },
                { id: 'full', label: `Full (${counts.full})` },
                { id: 'completed', label: `Completed (${counts.completed})` },
                { id: 'cancelled', label: `Cancelled (${counts.cancelled})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search events, company, district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 text-gray-200 text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Events Table / Card Grid */}
          {filteredEvents.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40 text-gray-400" />
              <p className="font-semibold text-white">No events found matching this filter.</p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create an event now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-gray-800 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                          {evt.event_type || 'Wedding'}
                        </span>
                        <h3 className="text-base font-extrabold text-white mt-1.5 truncate">
                          {evt.title}
                        </h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span className="truncate">{evt.company_name}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-emerald-400">
                          ₹{evt.wage_per_boy || 1200}
                        </span>
                        <span className="block text-[10px] text-gray-400">per staff</span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-gray-950/60 rounded-xl border border-gray-800/60 text-xs text-gray-300">
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span>{evt.event_date}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span>Report: {evt.reporting_time || '16:00'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">
                          {evt.area ? `${evt.area}, ` : ''}
                          {evt.district}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-bold text-white">
                          {evt.slots_filled || evt.boys_booked || 0} /{' '}
                          {evt.slots_total || evt.boys_needed || 10} Boys
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status Controls */}
                  <div className="mt-4 pt-3 border-t border-gray-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={evt.status || 'active'}
                        onChange={(e) => handleStatusChange(evt.id, e.target.value)}
                        disabled={actionLoading}
                        className={`text-xs font-semibold rounded-lg px-2.5 py-1 border outline-none cursor-pointer ${
                          evt.status === 'active' || evt.status === 'open'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            : evt.status === 'full'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                            : evt.status === 'completed'
                            ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                            : 'bg-rose-950/80 text-rose-300 border-rose-800'
                        }`}
                      >
                        <option value="active">Active (Open)</option>
                        <option value="full">Full</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <Link
                        to={`/events/${evt.id}`}
                        target="_blank"
                        className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                        title="View Public Event Page"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(evt)}
                        className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(evt.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl animate-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">
                    {editingEventId ? 'Edit Event Details' : 'Create New Event (Admin)'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Will instantly publish to CaterCrew events feed and Google Maps radar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-gray-800 hover:bg-gray-750 text-xs cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-gray-300 font-semibold mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Wedding Reception"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Al-Saj Conventions"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Company Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+91 94000 88221"
                    value={formData.company_contact}
                    onChange={(e) => setFormData({ ...formData, company_contact: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Event Type
                  </label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="wedding">Wedding Reception</option>
                    <option value="party">Birthday / Private Party</option>
                    <option value="corporate">Corporate Gala Dinner</option>
                    <option value="festival">Festival / Traditional Sadya</option>
                    <option value="other">Other Catering Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Reporting Time (Staff Check-in)
                  </label>
                  <input
                    type="time"
                    value={formData.reporting_time}
                    onChange={(e) => setFormData({ ...formData, reporting_time: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    District (Kerala)
                  </label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Area / Landmark
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Edappally Bypass, Near Lulu"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Venue / Hall Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cochin Palace Convention Hall"
                    value={formData.venue_name}
                    onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Boys Needed (Total Slots)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.boys_needed}
                    onChange={(e) => setFormData({ ...formData, boys_needed: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Wage per Boy (₹)
                  </label>
                  <input
                    type="number"
                    min="500"
                    step="50"
                    value={formData.wage_per_boy}
                    onChange={(e) => setFormData({ ...formData, wage_per_boy: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Extras check */}
              <div className="flex flex-wrap items-center gap-6 pt-2 text-gray-300">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.food_provided}
                    onChange={(e) => setFormData({ ...formData, food_provided: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-gray-950 border-gray-800"
                  />
                  <span>Food Provided</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.travel_allowance}
                    onChange={(e) =>
                      setFormData({ ...formData, travel_allowance: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-gray-950 border-gray-800"
                  />
                  <span>Travel Allowance / Pickup Provided</span>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-750 text-gray-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors cursor-pointer shadow-lg shadow-emerald-950"
                >
                  <Save className="w-4 h-4" />
                  <span>{actionLoading ? 'Saving...' : 'Save & Publish Event'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
