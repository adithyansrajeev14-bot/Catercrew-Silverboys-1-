import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  ExternalLink,
  Trash2,
  Building2,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { formatCurrency, formatEventDate, formatEventTime } from '../lib/formatters'

export default function AdminEventsTab() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all') // all, active, full, completed, cancelled
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchEvents = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setEvents([
        {
          id: 'demo-ev-1',
          title: 'Grand Royal Wedding Reception',
          company_name: 'Al-Saj Conventions & Catering',
          event_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
          start_time: '17:00:00',
          end_time: '23:00:00',
          district: 'Ernakulam',
          area: 'Edappally',
          wage_per_boy: 1200,
          boys_needed: 15,
          boys_booked: 8,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ])
      return
    }

    setLoading(true)
    setError('')
    try {
      const { data, error: qErr } = await supabase
        .from('events')
        .select('*, companies(company_name, district)')
        .order('event_date', { ascending: false })

      if (qErr) throw qErr

      const mapped = (data || []).map((e) => ({
        ...e,
        company_name: e.companies?.company_name || 'Event Partner',
      }))

      setEvents(mapped)
    } catch (err) {
      console.error('Error fetching admin events:', err)
      setError(err.message || 'Error fetching events.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Update status (e.g. cancel)
  const handleUpdateStatus = async (eventId, newStatus) => {
    setActionLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { error: updErr } = await supabase
          .from('events')
          .update({ status: newStatus })
          .eq('id', eventId)

        if (updErr) throw updErr
      }

      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
      )
    } catch (err) {
      alert(`Failed to update status: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Event
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This will also remove any bookings.')) {
      return
    }
    setActionLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { error: delErr } = await supabase.from('events').delete().eq('id', eventId)
        if (delErr) throw delErr
      }
      setEvents((prev) => prev.filter((e) => e.id !== eventId))
    } catch (err) {
      alert(`Failed to delete event: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Filtered
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
      active: events.filter((e) => e.status === 'active').length,
      full: events.filter((e) => e.status === 'full').length,
      cancelled: events.filter((e) => e.status === 'cancelled').length,
    }
  }, [events])

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchEvents}
            className="text-xs px-3 py-1 bg-rose-900 rounded-lg text-white font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'border-emerald-500 bg-gray-900 text-white ring-1 ring-emerald-500/40'
              : 'border-gray-800 bg-gray-900/90 text-gray-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-gray-400">Total Events</span>
          <p className="text-2xl sm:text-3xl font-black mt-1 text-white">{counts.all}</p>
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500/40'
              : 'border-gray-800 bg-gray-900/90 text-emerald-300'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-emerald-400/80">Active Events</span>
          <p className="text-2xl sm:text-3xl font-black mt-1 text-emerald-300">{counts.active}</p>
        </button>

        <button
          onClick={() => setActiveTab('full')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            activeTab === 'full'
              ? 'border-amber-500 bg-amber-950/40 text-amber-200 ring-1 ring-amber-500/40'
              : 'border-gray-800 bg-gray-900/90 text-amber-300'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-amber-400/80">Full Slots</span>
          <p className="text-2xl sm:text-3xl font-black mt-1 text-amber-300">{counts.full}</p>
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            activeTab === 'cancelled'
              ? 'border-rose-500 bg-rose-950/40 text-rose-200 ring-1 ring-rose-500/40'
              : 'border-gray-800 bg-gray-900/90 text-rose-300'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-rose-400/80">Cancelled</span>
          <p className="text-2xl sm:text-3xl font-black mt-1 text-rose-300">{counts.cancelled}</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto text-sm">
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'active', label: `Active (${counts.active})` },
            { id: 'full', label: `Full (${counts.full})` },
            { id: 'cancelled', label: `Cancelled (${counts.cancelled})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gray-800 text-emerald-400 shadow-sm font-bold border border-gray-700'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search event, venue, company..."
            className="w-full pl-9 pr-4 py-2 text-sm border-2 border-gray-800 bg-gray-900 rounded-xl focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-950 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-400 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Event & Company</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Wage</th>
                <th className="py-3.5 px-4">Slots Booked</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-medium text-gray-300">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400">
                    <p className="font-semibold text-gray-300">No events found</p>
                    <p className="text-xs text-gray-500 mt-1">No events match your current filter.</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => {
                  const booked = ev.boys_booked || 0
                  const needed = ev.boys_needed || 1

                  return (
                    <tr key={ev.id} className="hover:bg-gray-800/60 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-white">{ev.title}</p>
                          <p className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            <span>{ev.company_name}</span>
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <span className="font-semibold text-gray-200 block">
                          {formatEventDate(ev.event_date)}
                        </span>
                        <span className="text-gray-400">
                          {formatEventTime(ev.start_time)} – {formatEventTime(ev.end_time)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <span className="font-semibold text-gray-200 block">{ev.district}</span>
                        <span className="text-gray-400">{ev.venue_name || ev.area}</span>
                      </td>

                      <td className="py-3 px-4 font-bold text-emerald-400 text-xs sm:text-sm">
                        {formatCurrency(ev.wage_per_boy)}
                      </td>

                      <td className="py-3 px-4 text-xs font-semibold">
                        <span className="text-white">
                          {booked} / {needed}
                        </span>{' '}
                        boys
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            ev.status === 'active'
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                              : ev.status === 'full'
                              ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                              : ev.status === 'cancelled'
                              ? 'bg-rose-950/70 text-rose-300 border border-rose-800'
                              : 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/events/${ev.id}`}
                            target="_blank"
                            className="p-1.5 rounded-lg border border-gray-700 hover:border-emerald-500 bg-gray-800 text-gray-300 hover:text-white"
                            title="View Public Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {ev.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(ev.id, 'cancelled')}
                              disabled={actionLoading}
                              className="px-2 py-1 rounded-lg border border-rose-800/80 bg-rose-950/40 text-rose-300 hover:bg-rose-900 text-xs font-semibold cursor-pointer"
                              title="Cancel Event"
                            >
                              Cancel
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg border border-rose-800/80 bg-rose-950/40 text-rose-400 hover:bg-rose-900 hover:text-white cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
