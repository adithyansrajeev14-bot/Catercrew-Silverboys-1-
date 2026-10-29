import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Send,
  MessageCircle,
  Plus,
  Users,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Phone,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Lock,
} from 'lucide-react'
import {
  getEventReports,
  createEventReport,
  generateWhatsAppLink,
  getReportPortalUrl,
  generateRandomPin,
  resolveStaffShortage,
  deleteEventReport,
} from '../lib/reports'
import { KERALA_DISTRICTS } from '../lib/constants'

const getTodayDateString = () => new Date().toISOString().slice(0, 10)

export default function AdminReportPage({ workers = [] }) {
  const [reports, setReports] = useState(() => getEventReports())
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'shortage', 'in_progress', 'completed'

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedShareReport, setSelectedShareReport] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedPin, setCopiedPin] = useState(false)
  const [expandedReportId, setExpandedReportId] = useState(null)

  // New Event Form State
  const [formData, setFormData] = useState(() => ({
    eventName: '',
    eventCompany: '',
    contactPerson: '',
    whatsappNumber: '',
    accessPassword: generateRandomPin(),
    eventDate: getTodayDateString(),
    shiftTime: '5:30 PM - 11:30 PM (Dinner Reception)',
    venue: '',
    district: 'Ernakulam',
    requiredCount: 8,
    companyNotes: 'Formal dress code: Black trousers and plain white shirts.',
    supervisorPhone: '+919400088221',
  }))
  const [selectedWorkerCodes, setSelectedWorkerCodes] = useState([])
  const [workerSearch, setWorkerSearch] = useState('')
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)

  // Load reports
  const reloadReports = useCallback(() => {
    const list = getEventReports()
    setReports(list)
  }, [])

  useEffect(() => {
    const handleUpdate = () => {
      reloadReports()
    }
    window.addEventListener('catercrew_reports_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('catercrew_reports_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [reloadReports])

  // Filter verified workers for assignment
  const verifiedWorkers = useMemo(() => {
    const list = workers.filter((w) => w.status === 'verified')
    // If no verified workers from real database yet, provide helpful list of sample workers
    if (list.length === 0) {
      return [
        {
          worker_code: 'CC-SLV-000001',
          full_name: 'Adarsh S',
          phone: '+91 98461 23450',
          district: 'Ernakulam',
          tier: 'silver',
        },
        {
          worker_code: 'CC-SLV-000002',
          full_name: 'Vishnu Prasad',
          phone: '+91 97452 34561',
          district: 'Ernakulam',
          tier: 'silver',
        },
        {
          worker_code: 'CC-SLV-000003',
          full_name: 'Rahul K P',
          phone: '+91 96333 45672',
          district: 'Thrissur',
          tier: 'silver',
        },
        {
          worker_code: 'CC-SLV-000004',
          full_name: 'Akhil Mohan',
          phone: '+91 95264 56783',
          district: 'Ernakulam',
          tier: 'silver',
        },
        {
          worker_code: 'CC-SLV-000005',
          full_name: 'Jithin Joy',
          phone: '+91 94475 67894',
          district: 'Kottayam',
          tier: 'silver',
        },
        {
          worker_code: 'CC-SLV-000006',
          full_name: 'Muhammed Nihal',
          phone: '+91 99956 78905',
          district: 'Ernakulam',
          tier: 'silver',
        },
        {
          worker_code: 'CC-SLV-000007',
          full_name: 'Sanoop V',
          phone: '+91 98957 89016',
          district: 'Ernakulam',
          tier: 'silver',
        },
        {
          worker_code: 'CC-SLV-000008',
          full_name: 'Deepak Raj',
          phone: '+91 97468 90127',
          district: 'Alappuzha',
          tier: 'silver',
        },
      ]
    }
    return list
  }, [workers])

  // Filter workers in picker
  const filteredPickerWorkers = useMemo(() => {
    if (!workerSearch.trim()) return verifiedWorkers
    const q = workerSearch.toLowerCase().trim()
    return verifiedWorkers.filter(
      (w) =>
        w.full_name?.toLowerCase().includes(q) ||
        w.worker_code?.toLowerCase().includes(q) ||
        w.district?.toLowerCase().includes(q) ||
        w.phone?.includes(q)
    )
  }, [verifiedWorkers, workerSearch])

  // Auto-select first N workers based on required count
  const handleAutoSelect = () => {
    const count = parseInt(formData.requiredCount, 10) || 5
    const toSelect = verifiedWorkers.slice(0, count).map((w) => w.worker_code)
    setSelectedWorkerCodes(toSelect)
  }

  // Toggle single worker selection
  const handleToggleWorkerSelect = (code) => {
    setSelectedWorkerCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle Create Event Report
  const handleCreateReport = (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.eventName.trim()) {
      setFormError('Please enter an Event Name.')
      return
    }
    if (!formData.eventCompany.trim()) {
      setFormError('Please enter the Event Management Company Name.')
      return
    }
    if (!formData.whatsappNumber.trim()) {
      setFormError('Please enter the Event Coordinator WhatsApp number.')
      return
    }
    if (!formData.venue.trim()) {
      setFormError('Please enter the Event Venue.')
      return
    }

    setCreating(true)

    // Match selected workers
    const assigned = verifiedWorkers.filter((w) =>
      selectedWorkerCodes.includes(w.worker_code)
    )

    const newReport = createEventReport({
      ...formData,
      assignedWorkers: assigned,
    })

    setCreating(false)
    setShowCreateModal(false)
    reloadReports()

    // Automatically open WhatsApp share modal for the newly created report
    setSelectedShareReport(newReport)
  }

  // Copy link
  const handleCopyLink = (report) => {
    const portalUrl = getReportPortalUrl(report)
    navigator.clipboard.writeText(portalUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  // Open WhatsApp Link
  const handleOpenWhatsApp = (report) => {
    const link = generateWhatsAppLink(report)
    window.open(link, '_blank')
  }

  // Mark Shortage Resolved
  const handleResolveShortage = (reportId) => {
    resolveStaffShortage(reportId)
    reloadReports()
  }

  // Delete Report
  const handleDeleteReport = (id) => {
    if (confirm('Are you sure you want to delete this event report?')) {
      deleteEventReport(id)
      reloadReports()
    }
  }

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = reports.length
    const shortages = reports.filter((r) => r.shortageReported && !r.shortageResolved).length
    const today = getTodayDateString()
    const todayCount = reports.filter((r) => r.eventDate === today).length

    let totalRequired = 0
    let totalPresent = 0
    reports.forEach((r) => {
      totalRequired += r.requiredCount || 0
      const present = Object.values(r.attendance || {}).filter((a) => a?.present).length
      totalPresent += present
    })

    return {
      total,
      shortages,
      todayCount,
      totalRequired,
      totalPresent,
    }
  }, [reports])

  // Filtered reports list
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Tab filter
      if (statusFilter === 'shortage' && (!r.shortageReported || r.shortageResolved)) {
        return false
      }
      if (statusFilter === 'in_progress' && r.status !== 'in_progress') {
        return false
      }
      if (statusFilter === 'completed' && r.status !== 'completed') {
        return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = r.eventName?.toLowerCase().includes(q)
        const matchComp = r.eventCompany?.toLowerCase().includes(q)
        const matchVenue = r.venue?.toLowerCase().includes(q)
        const matchDistrict = r.district?.toLowerCase().includes(q)
        return matchName || matchComp || matchVenue || matchDistrict
      }

      return true
    })
  }, [reports, statusFilter, searchQuery])

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 border border-gray-800 p-6 rounded-3xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950 border border-emerald-800/80 px-2.5 py-0.5 rounded-full uppercase">
              Confidential Deal System
            </span>
            <span className="text-xs text-gray-400">Event Company Attendance Portal</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mt-1">
            Report Page & WhatsApp Dispatch
          </h2>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Generate and send private WhatsApp reporting links directly to event management companies. They mark catering boys present on arrival, and alert your team instantly if any shortage occurs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            // Pre-select some workers if none selected
            if (selectedWorkerCodes.length === 0 && verifiedWorkers.length > 0) {
              setSelectedWorkerCodes(verifiedWorkers.slice(0, 8).map((w) => w.worker_code))
            }
            setShowCreateModal(true)
          }}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm sm:text-base px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>New Event Report Link</span>
        </button>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gray-900 border border-gray-800 p-4 sm:p-5 rounded-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Total Event Links
          </span>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1">{metrics.total}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-4 sm:p-5 rounded-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Events Today
          </span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
            {metrics.todayCount}
          </p>
        </div>

        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            metrics.shortages > 0
              ? 'bg-rose-950/80 border-rose-600 text-rose-200 ring-2 ring-rose-500/40 animate-pulse'
              : 'bg-gray-900 border-gray-800 text-gray-200'
          }`}
        >
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              metrics.shortages > 0 ? 'text-rose-400' : 'text-gray-400'
            }`}
          >
            🚨 Shortage Alerts Active
          </span>
          <p
            className={`text-2xl sm:text-3xl font-black mt-1 ${
              metrics.shortages > 0 ? 'text-rose-400' : 'text-gray-400'
            }`}
          >
            {metrics.shortages}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-4 sm:p-5 rounded-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Total Boys Checked In
          </span>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1">
            {metrics.totalPresent} <span className="text-xs font-normal text-gray-500">/ {metrics.totalRequired} req</span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto text-xs sm:text-sm">
          {[
            { id: 'all', label: `All Reports (${reports.length})` },
            {
              id: 'shortage',
              label: `🚨 Shortages (${metrics.shortages})`,
              highlight: metrics.shortages > 0,
            },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-gray-800 text-emerald-400 font-bold border border-gray-700 shadow-sm'
                  : tab.highlight
                  ? 'text-rose-400 hover:text-rose-300'
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
            placeholder="Search event, company or venue..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:border-emerald-500 text-white placeholder-gray-600"
          />
        </div>
      </div>

      {/* Events List */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-16 px-4 bg-gray-900 border border-dashed border-gray-800 rounded-3xl">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-200">No Event Reports Found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            {searchQuery
              ? 'No event reports matched your search term.'
              : 'Create your first event report to generate a secure WhatsApp attendance link for the event management company.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-5 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl cursor-pointer shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Event Link</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const assigned = report.assignedWorkers || []
            const attendance = report.attendance || {}
            const presentCount = Object.values(attendance).filter((a) => a?.present).length
            const requiredCount = report.requiredCount || assigned.length || 0
            const isShortage = report.shortageReported && !report.shortageResolved
            const isExpanded = expandedReportId === report.id
            const progressPercent = requiredCount > 0 ? Math.min(100, Math.round((presentCount / requiredCount) * 100)) : 0

            return (
              <div
                key={report.id}
                className={`bg-gray-900 rounded-3xl border transition-all ${
                  isShortage
                    ? 'border-rose-600/80 ring-2 ring-rose-500/30'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Event Card Header */}
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Event Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-bold text-xs uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
                          {report.eventCompany}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          Token: {report.token}
                        </span>
                        {report.accessPassword && (
                          <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-400" />
                            <span>PIN: {report.accessPassword}</span>
                          </span>
                        )}
                        {isShortage && (
                          <span className="bg-rose-950 border border-rose-700 text-rose-300 font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Shortage Alert Active</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {report.eventName}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{report.venue} ({report.district})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{report.eventDate} • {report.shiftTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{report.contactPerson ? `${report.contactPerson} (${report.whatsappNumber})` : report.whatsappNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Attendance Progress */}
                    <div className="lg:w-64 bg-gray-950/70 p-4 rounded-2xl border border-gray-800/80 shrink-0">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-400 font-semibold">Live Attendance</span>
                        <span className="font-mono font-bold text-white">
                          {presentCount} / {requiredCount} Boys
                        </span>
                      </div>
                      {/* Bar */}
                      <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isShortage
                              ? 'bg-rose-500'
                              : progressPercent >= 100
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1.5">
                        <span>{progressPercent}% reported</span>
                        <span>{Math.max(0, requiredCount - presentCount)} pending</span>
                      </div>
                    </div>
                  </div>

                  {/* Urgent Shortage Notice Banner inside Card */}
                  {isShortage && (
                    <div className="mt-4 p-4 bg-rose-950/80 border border-rose-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-200 text-xs sm:text-sm">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-white">
                            Company Reported Shortage of {report.shortageCount || 1} Catering Boys
                          </p>
                          <p className="text-xs text-rose-300 mt-0.5">
                            Reason: {report.shortageReason || 'Event company marked shortage at venue.'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleResolveShortage(report.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shrink-0 cursor-pointer shadow flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Shortage Resolved / Backup Sent</span>
                      </button>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="mt-5 pt-4 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Send WhatsApp Link Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(report)}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow cursor-pointer transition-colors"
                        title="Open WhatsApp with pre-filled message"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Send WhatsApp Link</span>
                      </button>

                      {/* Copy Link Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyLink(report)}
                        className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-750 text-gray-200 font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 transition-colors cursor-pointer"
                        title="Copy private report URL"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-gray-400" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      {/* Preview Report Page */}
                      <a
                        href={getReportPortalUrl(report)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-750 text-gray-300 font-medium text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                        <span>Open Report Page</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedReportId(isExpanded ? null : report.id)
                        }
                        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Staff Roster' : 'View Staff Roster'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                        title="Delete report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Staff Roster Details */}
                {isExpanded && (
                  <div className="bg-gray-950/80 px-6 py-5 border-t border-gray-800 rounded-b-3xl">
                    <div className="flex items-center justify-between mb-3 text-xs">
                      <span className="font-bold text-gray-300 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>Assigned Staff Attendance Status ({assigned.length} Boys)</span>
                      </span>
                      <span className="text-gray-500">
                        Real-time updates marked by {report.eventCompany}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {assigned.map((w) => {
                        const isPresent = Boolean(attendance[w.worker_code]?.present)
                        const markedAt = attendance[w.worker_code]?.markedAt
                        const note = attendance[w.worker_code]?.notes

                        return (
                          <div
                            key={w.worker_code}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                              isPresent
                                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                                : 'bg-gray-900 border-gray-800 text-gray-400'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  isPresent ? 'bg-emerald-400' : 'bg-gray-600'
                                }`}
                              />
                              <div className="truncate">
                                <p className="font-bold text-white truncate">
                                  {w.full_name}
                                </p>
                                <p className="text-[10px] font-mono text-gray-400 truncate">
                                  {w.worker_code} • {w.phone || w.district}
                                </p>
                                {note && (
                                  <p className="text-[10px] text-amber-300 italic mt-0.5">
                                    {note}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              {isPresent ? (
                                <span className="font-bold text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded text-[11px]">
                                  Present {markedAt ? `(${markedAt})` : ''}
                                </span>
                              ) : (
                                <span className="text-gray-500 text-[11px]">
                                  Pending Arrival
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create New Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-200 text-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-950 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-800">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white">
                    Create Event Report Link
                  </h3>
                  <p className="text-xs text-gray-400">
                    Generate an exclusive attendance link for an event company
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-950 border border-rose-800 text-rose-200 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateReport} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    name="eventName"
                    value={formData.eventName}
                    onChange={handleFormChange}
                    placeholder="e.g. Royal Wedding Reception"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-800 bg-gray-950 focus:border-emerald-500 focus:outline-none text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Event Management Company *
                  </label>
                  <input
                    type="text"
                    required
                    name="eventCompany"
                    value={formData.eventCompany}
                    onChange={handleFormChange}
                    placeholder="e.g. Grandeur Events Kochi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-800 bg-gray-950 focus:border-emerald-500 focus:outline-none text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Coordinator Name (Optional)
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleFormChange}
                    placeholder="e.g. Rahul Menon"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-800 bg-gray-950 focus:border-emerald-500 focus:outline-none text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Coordinator WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={handleFormChange}
                    placeholder="e.g. +91 98471 23456"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-800 bg-gray-950 focus:border-emerald-500 focus:outline-none text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleFormChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-800 bg-gray-950 focus:border-emerald-500 focus:outline-none text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Shift / Timing *
                  </label>
                  <input
                    type="text"
                    required
                    name="shiftTime"
                    value={formData.shiftTime}
                    onChange={handleFormChange}
                    placeholder="e.g. 5:00 PM - 11:30 PM (Dinner)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-800 bg-gray-950 focus:border-emerald-500 focus:outline-none text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-gray-300 mb-1">
                    Venue Location *
                  </label>
                  <input
                    type="text"
                    required
                    name="venue"
                    value={formData.venue}
                    onChange={handleFormChange}
                    placeholder="e.g. Adlux Convention Centre, Angamaly"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-800 bg-gray-950 focus:border-emerald-500 focus:outline-none text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    District
                  </label>
                  <select
                    name="district"
                    value={formData.district}
                    onChange={handleFormChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-800 bg-gray-950 focus:border-emerald-500 focus:outline-none text-white"
                  >
                    {KERALA_DISTRICTS.map((d) => (
                      <option key={d} value={d} className="bg-gray-900">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-300">
                    Required Catering Boys Count
                  </label>
                  <span className="font-bold text-emerald-400 font-mono">
                    {formData.requiredCount} Boys
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="200"
                  name="requiredCount"
                  value={formData.requiredCount}
                  onChange={handleFormChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-800 bg-gray-950 focus:border-emerald-500 focus:outline-none text-white"
                />
              </div>

              {/* Event Access Password / PIN */}
              <div className="bg-gray-950/80 p-4 rounded-2xl border border-gray-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-gray-200 text-xs sm:text-sm flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>Event Portal Access PIN / Password *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, accessPassword: generateRandomPin() }))
                    }
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <span>🔄 Generate PIN</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  name="accessPassword"
                  value={formData.accessPassword}
                  onChange={handleFormChange}
                  placeholder="e.g. 4821 or secret123"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-800 bg-gray-900 focus:border-emerald-500 focus:outline-none text-white font-mono text-base tracking-wider"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Event coordinator must enter this PIN/password on their phone to unlock and mark attendance.
                </p>
              </div>

              {/* Staff Assignment Picker */}
              <div className="border border-gray-800 rounded-2xl p-4 bg-gray-950">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Select Catering Boys for this Event ({selectedWorkerCodes.length} Selected)</span>
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      These boys will appear on the event company&apos;s attendance roster
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoSelect}
                    className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 px-3 py-1.5 rounded-xl cursor-pointer self-start sm:self-auto"
                  >
                    Auto-Select First {formData.requiredCount || 5}
                  </button>
                </div>

                <div className="mb-3">
                  <input
                    type="text"
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    placeholder="Search staff by name or code..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredPickerWorkers.map((w) => {
                    const isSelected = selectedWorkerCodes.includes(w.worker_code)
                    return (
                      <div
                        key={w.worker_code}
                        onClick={() => handleToggleWorkerSelect(w.worker_code)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                            : 'bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-850'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded accent-emerald-500 cursor-pointer"
                          />
                          <span className="font-bold text-white">{w.full_name}</span>
                          <span className="font-mono text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.2 rounded">
                            {w.worker_code}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {w.district}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Special Notes / Dress Code
                </label>
                <input
                  type="text"
                  name="companyNotes"
                  value={formData.companyNotes}
                  onChange={handleFormChange}
                  placeholder="e.g. Formal black trousers and plain white shirts required."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-800 bg-gray-950 focus:border-emerald-500 focus:outline-none text-white"
                />
              </div>

              <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg cursor-pointer transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{creating ? 'Generating Link...' : 'Create Link & Share'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Link Sharing Dialog */}
      {selectedShareReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-950 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-800">
              <MessageCircle className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-extrabold text-white text-center">
              Event WhatsApp Link Ready!
            </h3>
            <p className="text-xs text-gray-400 text-center mt-1">
              Send this link to <strong className="text-white">{selectedShareReport.eventCompany}</strong> ({selectedShareReport.whatsappNumber}).
            </p>

            <div className="mt-5 p-4 bg-gray-950 rounded-2xl border border-gray-800 text-xs space-y-3">
              <div className="flex items-center justify-between text-gray-400">
                <span>Event:</span>
                <span className="font-bold text-white">{selectedShareReport.eventName}</span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Short Portal Link:</span>
              </div>
              <div className="bg-gray-900 p-2.5 rounded-xl font-mono text-xs text-emerald-400 break-all select-all border border-gray-800">
                {getReportPortalUrl(selectedShareReport)}
              </div>

              {selectedShareReport.accessPassword && (
                <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-amber-400 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Access PIN / Password</span>
                    </span>
                    <p className="font-mono text-lg font-black text-white tracking-widest mt-0.5">
                      {selectedShareReport.accessPassword}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedShareReport.accessPassword)
                      setCopiedPin(true)
                      setTimeout(() => setCopiedPin(false), 2000)
                    }}
                    className="px-3 py-1.5 bg-amber-900/60 hover:bg-amber-900 text-amber-200 text-xs rounded-lg font-bold border border-amber-700/60 transition-colors cursor-pointer"
                  >
                    {copiedPin ? 'Copied!' : 'Copy PIN'}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenWhatsApp(selectedShareReport)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/60"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Open WhatsApp & Send to Company</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyLink(selectedShareReport)}
                className="w-full bg-gray-800 hover:bg-gray-750 text-gray-200 font-semibold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-gray-700"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied Link to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-gray-400" />
                    <span>Copy Link to Clipboard</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedShareReport(null)}
                className="w-full text-center text-xs font-semibold text-gray-400 hover:text-white py-2 cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
