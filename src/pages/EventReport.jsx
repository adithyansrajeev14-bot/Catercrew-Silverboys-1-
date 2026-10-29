import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Phone,
  MapPin,
  Calendar,
  Building,
  Search,
  MessageCircle,
  Plus,
  ShieldCheck,
  Check,
  AlertOctagon,
  Info,
  Lock,
  KeyRound,
} from 'lucide-react'
import {
  getEventReportByToken,
  fetchEventReportAsync,
  getEventReports,
  markWorkerAttendance,
  reportStaffShortage,
  addWorkerToReport,
} from '../lib/reports'
import { supabase, isSupabaseConfigured, getPhotoPublicUrl } from '../lib/supabase'

export default function EventReport() {
  const { reportId } = useParams()
  const [report, setReport] = useState(() => (reportId ? getEventReportByToken(reportId) : null))
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState('all') // 'all', 'present', 'pending'
  const [manualToken, setManualToken] = useState('')
  const [checkingAsync, setCheckingAsync] = useState(
    () => Boolean(reportId && !getEventReportByToken(reportId) && isSupabaseConfigured)
  )

  // Password / PIN Lock state
  const [enteredPassword, setEnteredPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [manuallyUnlocked, setManuallyUnlocked] = useState(false)
  const isUnlocked = useMemo(() => {
    if (!report || !report.accessPassword) return true
    if (manuallyUnlocked) return true
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return sessionStorage.getItem(`cc_unlocked_${report.token || report.id}`) === 'true'
    }
    return false
  }, [report, manuallyUnlocked])

  // Shortage modal / drawer state
  const [showShortageModal, setShowShortageModal] = useState(false)
  const [shortageCount, setShortageCount] = useState(1)
  const [shortageReason, setShortageReason] = useState('')
  const [shortageSubmitting, setShortageSubmitting] = useState(false)
  const [shortageSuccessMessage, setShortageSuccessMessage] = useState('')

  // Add extra / substitute worker state
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false)
  const [extraWorkerCode, setExtraWorkerCode] = useState('')
  const [extraWorkerName, setExtraWorkerName] = useState('')
  const [extraWorkerPhone, setExtraWorkerPhone] = useState('')
  const [searchingWorker, setSearchingWorker] = useState(false)
  const [addWorkerError, setAddWorkerError] = useState('')

  // Toast notification
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage('')
    }, 3500)
  }

  // Load report data
  const loadReport = useCallback(() => {
    if (!reportId) return
    const found = getEventReportByToken(reportId)
    if (found) {
      setReport(found)
    }
  }, [reportId])

  useEffect(() => {
    let active = true

    // If not found locally, try async fetch from remote database
    if (!report && reportId && isSupabaseConfigured) {
      fetchEventReportAsync(reportId).then((found) => {
        if (active) {
          setCheckingAsync(false)
          if (found) {
            setReport(found)
          }
        }
      })
    }

    const handleStorageUpdate = () => {
      loadReport()
    }
    window.addEventListener('catercrew_reports_updated', handleStorageUpdate)
    window.addEventListener('storage', handleStorageUpdate)
    return () => {
      active = false
      window.removeEventListener('catercrew_reports_updated', handleStorageUpdate)
      window.removeEventListener('storage', handleStorageUpdate)
    }
  }, [loadReport, report, reportId])

  // Verify PIN / Password
  const handleVerifyPassword = (e) => {
    e.preventDefault()
    setPasswordError('')
    const inputClean = enteredPassword.trim()
    const expected = (report?.accessPassword || '').trim()

    if (!inputClean) {
      setPasswordError('Please enter the access PIN / password.')
      return
    }

    if (inputClean.toLowerCase() === expected.toLowerCase()) {
      setManuallyUnlocked(true)
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(`cc_unlocked_${report.token || report.id}`, 'true')
      }
      showToast('✓ Portal unlocked successfully')
    } else {
      setPasswordError('Incorrect PIN / Password. Please check the WhatsApp dispatch from CaterCrew.')
    }
  }

  // Mark attendance
  const handleToggleAttendance = (workerCode, currentlyPresent) => {
    if (!report) return
    const newStatus = !currentlyPresent
    const updated = markWorkerAttendance(report.token, workerCode, newStatus)
    if (updated) {
      setReport(updated)
      showToast(
        newStatus
          ? `✓ Marked ${workerCode} as PRESENT at venue`
          : `Marked ${workerCode} as Pending / Absent`
      )
    }
  }

  // Submit shortage report
  const handleSubmitShortage = (e) => {
    e.preventDefault()
    if (!report) return

    setShortageSubmitting(true)
    const updated = reportStaffShortage(
      report.token,
      shortageCount,
      shortageReason || 'Event company coordinator reported staff shortage at event venue.'
    )

    setShortageSubmitting(false)
    if (updated) {
      setReport(updated)
      setShowShortageModal(false)
      setShortageSuccessMessage(
        `Shortage of ${shortageCount} catering boys notified to CaterCrew Operations! Our standby supervisor has been alerted.`
      )
      showToast(`🚨 Shortage reported to CaterCrew Operations!`)
    }
  }

  // Handle adding an extra or substitute worker
  const handleAddExtraWorker = async (e) => {
    e.preventDefault()
    setAddWorkerError('')

    const code = extraWorkerCode.trim().toUpperCase()
    if (!code && !extraWorkerName.trim()) {
      setAddWorkerError('Please enter at least a Worker Code or Name.')
      return
    }

    setSearchingWorker(true)

    let workerData = {
      worker_code: code || `CC-SUB-${Math.floor(1000 + Math.random() * 9000)}`,
      full_name: extraWorkerName.trim() || 'Substitute Catering Boy',
      phone: extraWorkerPhone.trim() || 'Not specified',
      district: report.district || 'Kerala',
      tier: 'silver',
      photo_path: null,
    }

    // If Supabase is available, attempt to find their verified details
    if (code && isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('workers')
          .select('worker_code, full_name, phone, district, tier, photo_path')
          .ilike('worker_code', code)
          .maybeSingle()

        if (data) {
          workerData = { ...workerData, ...data }
        }
      } catch (err) {
        console.warn('Could not query worker from Supabase:', err)
      }
    }

    const updated = addWorkerToReport(report.token, workerData)
    setSearchingWorker(false)

    if (updated) {
      setReport(updated)
      setShowAddWorkerModal(false)
      setExtraWorkerCode('')
      setExtraWorkerName('')
      setExtraWorkerPhone('')
      showToast(`Added ${workerData.full_name} (${workerData.worker_code}) & marked Present`)
    }
  }

  // Direct WhatsApp to CaterCrew Emergency Operations
  const getWhatsAppEmergencyUrl = () => {
    if (!report) return '#'
    const phone = (report.supervisorPhone || '+919400088221').replace(/[^\d]/g, '')
    const msg = [
      `🚨 *URGENT CATERCREW EVENT SHORTAGE REPORT* 🚨`,
      ``,
      `Hello CaterCrew Supervisor,`,
      `We are currently running *${report.eventName}* with *${report.eventCompany}*.`,
      `📍 *Venue*: ${report.venue} (${report.district})`,
      `👥 *Required Staff*: ${report.requiredCount} catering boys`,
      `⚠️ *Current Shortage*: ${report.shortageCount || Math.max(0, report.requiredCount - presentCount)} boys missing/needed immediately!`,
      report.shortageReason ? `📝 *Note*: ${report.shortageReason}` : '',
      ``,
      `Please deploy backup/standby catering boys to our venue ASAP.`,
    ]
      .filter(Boolean)
      .join('\n')

    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  // Calculations
  const assignedList = report?.assignedWorkers || []
  const attendance = report?.attendance || {}
  const presentCount = Object.values(attendance).filter((a) => a?.present).length
  const requiredCount = report?.requiredCount || assignedList.length || 0
  const shortageDiff = Math.max(0, requiredCount - presentCount)
  const isComplete = presentCount >= requiredCount && requiredCount > 0

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    const list = report?.assignedWorkers || []
    const att = report?.attendance || {}
    return list.filter((w) => {
      const isPresent = Boolean(att[w.worker_code]?.present)

      // Tab filter
      if (filterTab === 'present' && !isPresent) return false
      if (filterTab === 'pending' && isPresent) return false

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = w.full_name?.toLowerCase().includes(q)
        const matchCode = w.worker_code?.toLowerCase().includes(q)
        const matchPhone = w.phone?.toLowerCase().includes(q)
        const matchDistrict = w.district?.toLowerCase().includes(q)
        return matchName || matchCode || matchPhone || matchDistrict
      }

      return true
    })
  }, [report, filterTab, searchQuery])

  // Loading / searching state
  if (checkingAsync) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">Connecting to CaterCrew Event Portal...</p>
          <p className="text-xs text-gray-400 mt-1">Retrieving live attendance roster</p>
        </div>
      </div>
    )
  }

  // Not found / Invalid Token state
  if (!report) {
    const allAvailableReports = getEventReports()

    const handleLoadManualToken = (e) => {
      e.preventDefault()
      const clean = manualToken.trim()
      if (!clean) return
      const found = getEventReportByToken(clean)
      if (found) {
        setReport(found)
      } else {
        showToast('Token not found. Please verify with CaterCrew Operations.')
      }
    }

    const whatsappHelpUrl = `https://wa.me/919400088221?text=${encodeURIComponent(
      `Hello CaterCrew Operations, I am trying to open our event attendance portal (Token: ${
        reportId || 'unknown'
      }), but it shows report not found. Please send us our direct access link.`
    )}`

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-xl">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-100">
            <AlertOctagon className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Event Report Not Found</h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-1.5">
            The link you accessed ({reportId ? <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">{reportId}</code> : 'empty link'}) might have been truncated by WhatsApp or expired.
          </p>

          {/* Quick Active Events Switcher */}
          {allAvailableReports.length > 0 && (
            <div className="mt-5 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-left">
              <p className="text-xs font-bold text-emerald-950 uppercase tracking-wider mb-2">
                Available Active CaterCrew Events ({allAvailableReports.length}):
              </p>
              <div className="space-y-2">
                {allAvailableReports.slice(0, 3).map((r) => (
                  <button
                    key={r.id || r.token}
                    type="button"
                    onClick={() => setReport(r)}
                    className="w-full text-left p-2.5 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-gray-900 truncate">{r.eventName}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {r.eventCompany} • {r.venue}
                      </p>
                    </div>
                    <span className="text-emerald-700 font-bold shrink-0 bg-emerald-100 px-2 py-0.5 rounded">
                      Open →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Token Lookup Box */}
          <form onSubmit={handleLoadManualToken} className="mt-4 text-left">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Or Enter Event Token / Code:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="e.g. cc-evt-7821-kochi"
                className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-gray-900 font-mono"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Load
              </button>
            </div>
          </form>

          {/* Direct Help Desk */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <a
              href={whatsappHelpUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Operations</span>
            </a>
            <a
              href="tel:+919400088221"
              className="w-full sm:w-auto flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>+91 94000 88221</span>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Access Password / PIN Gate for private company access
  if (report && report.accessPassword && !isUnlocked) {
    const coordinatorHelpDesk = `https://wa.me/919400088221?text=${encodeURIComponent(
      `Hello CaterCrew, I am opening the attendance report for ${report.eventName} (${report.eventCompany}), please help me with the Access PIN.`
    )}`

    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-center">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 bg-emerald-950 border border-emerald-800/80 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[11px] font-bold rounded-full uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Confidential Coordinator Portal</span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Enter Access PIN
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1.5">
            Attendance for <strong className="text-white">{report.eventName}</strong> by{' '}
            <span className="text-emerald-400">{report.eventCompany}</span>
          </p>

          <form onSubmit={handleVerifyPassword} className="mt-6 text-left space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Access PIN / Password</span>
                <span className="text-[11px] text-gray-500 font-normal">Check WhatsApp message</span>
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  autoFocus
                  value={enteredPassword}
                  onChange={(e) => {
                    setEnteredPassword(e.target.value)
                    if (passwordError) setPasswordError('')
                  }}
                  placeholder="Enter 4-digit PIN"
                  className="w-full pl-11 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-2xl focus:outline-none focus:border-emerald-500 text-white font-mono text-center text-lg tracking-widest placeholder:text-gray-600 placeholder:text-sm placeholder:tracking-normal"
                />
              </div>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition-all shadow-lg shadow-emerald-950/80 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Unlock Attendance Portal</span>
              <span>→</span>
            </button>
          </form>

          {/* Help & Support */}
          <div className="mt-6 pt-5 border-t border-gray-900 text-xs space-y-2">
            <p className="text-gray-500">
              Need assistance or did not receive your PIN?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <a
                href={coordinatorHelpDesk}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-850 text-gray-300 rounded-xl border border-gray-800 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp Helpline</span>
              </a>
              <a
                href={`tel:${report.supervisorPhone || '+919400088221'}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-850 text-gray-300 rounded-xl border border-gray-800 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Call Operations Desk</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner - Private Event Management Brand */}
      <header className="bg-emerald-950 text-white border-b border-emerald-900 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  CATERCREW
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-wider">
                  Event Attendance Portal
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 truncate max-w-[200px] sm:max-w-none">
                Exclusive for: {report.eventCompany}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${report.supervisorPhone || '+919400088221'}`}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-3 py-2 rounded-xl shadow transition-colors"
              title="Call CaterCrew Supervisor"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Helpline</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Event Overview Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mb-2">
                {report.eventCompany}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {report.eventName}
              </h1>
            </div>

            {/* Quick Status Tag */}
            <div className="sm:text-right shrink-0">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider ${
                  isComplete
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : report.shortageReported
                    ? 'bg-rose-100 text-rose-900 border border-rose-300 animate-pulse'
                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                {isComplete ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Full Staff Present</span>
                  </>
                ) : report.shortageReported ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Shortage Alert Sent</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Attendance In Progress</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Event Meta Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100 text-xs sm:text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium text-gray-800">{report.venue}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{report.eventDate} • {report.shiftTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>District: <strong className="text-gray-800">{report.district}</strong></span>
            </div>
          </div>

          {report.companyNotes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-2xl text-xs text-gray-600 border border-gray-100 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-800">Event Instructions: </strong>
                <span>{report.companyNotes}</span>
              </div>
            </div>
          )}
        </div>

        {/* Shortage Success Confirmation Box */}
        {shortageSuccessMessage && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-sm text-emerald-900 flex items-start justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Shortage Notification Dispatched</p>
                <p className="text-xs text-emerald-800 mt-0.5">{shortageSuccessMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setShortageSuccessMessage('')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Live Attendance Metric Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 text-center shadow-sm">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
              Required Boys
            </span>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              {requiredCount}
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/30 text-center shadow-sm">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700">
              Reported (Present)
            </span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
              {presentCount}
            </p>
          </div>

          <div
            className={`p-4 sm:p-5 rounded-2xl border text-center shadow-sm ${
              shortageDiff > 0
                ? 'bg-rose-50/50 border-rose-300 text-rose-900'
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
              {shortageDiff > 0 ? 'Pending / Short' : 'Remaining'}
            </span>
            <p
              className={`text-2xl sm:text-3xl font-black mt-1 ${
                shortageDiff > 0 ? 'text-rose-600' : 'text-gray-400'
              }`}
            >
              {shortageDiff}
            </p>
          </div>
        </div>

        {/* Urgent Shortage Action Box */}
        <div
          className={`p-5 rounded-3xl border transition-all ${
            report.shortageReported && !report.shortageResolved
              ? 'bg-rose-900 text-white border-rose-700 shadow-lg'
              : 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-200 text-gray-900'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-2xl shrink-0 ${
                  report.shortageReported && !report.shortageResolved
                    ? 'bg-rose-800 text-rose-200'
                    : 'bg-rose-100 text-rose-600'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3
                  className={`text-base sm:text-lg font-bold ${
                    report.shortageReported && !report.shortageResolved
                      ? 'text-white'
                      : 'text-gray-900'
                  }`}
                >
                  {report.shortageReported && !report.shortageResolved
                    ? `Shortage of ${report.shortageCount} Catering Boys Active!`
                    : 'Facing Staff Shortage or Delays?'}
                </h3>
                <p
                  className={`text-xs sm:text-sm mt-0.5 max-w-xl ${
                    report.shortageReported && !report.shortageResolved
                      ? 'text-rose-200'
                      : 'text-gray-600'
                  }`}
                >
                  {report.shortageReported && !report.shortageResolved
                    ? 'CaterCrew Operations supervisor is arranging emergency standby staff. You can also contact our helpline directly.'
                    : 'If any catering boys fail to report on time, trigger the shortage notification so our supervisor team can dispatch backup immediately.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowShortageModal(true)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow cursor-pointer transition-colors flex items-center gap-1.5 ${
                  report.shortageReported && !report.shortageResolved
                    ? 'bg-white text-rose-900 hover:bg-rose-50'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <AlertOctagon className="w-4 h-4" />
                <span>
                  {report.shortageReported ? 'Update Shortage Alert' : 'Report Shortage'}
                </span>
              </button>

              <a
                href={getWhatsAppEmergencyUrl()}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow cursor-pointer transition-colors inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Operations</span>
              </a>
            </div>
          </div>
        </div>

        {/* Catering Boys Attendance Checklist Section */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Assigned Catering Boys ({assignedList.length})</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Tap &quot;Mark Present&quot; as each boy arrives at the event venue.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddWorkerModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add Extra Boy</span>
              </button>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-white text-gray-900 shadow-sm font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                All ({assignedList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('present')}
                className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  filterTab === 'present'
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-gray-500 hover:text-emerald-700'
                }`}
              >
                Present ({presentCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('pending')}
                className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  filterTab === 'pending'
                    ? 'bg-amber-600 text-white shadow-sm font-bold'
                    : 'text-gray-500 hover:text-amber-700'
                }`}
              >
                Pending ({assignedList.length - presentCount})
              </button>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search boy name or code..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-gray-900"
              />
            </div>
          </div>

          {/* Worker Cards List */}
          {filteredWorkers.length === 0 ? (
            <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No catering boys found</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {searchQuery
                  ? 'Try modifying your search query'
                  : 'No catering staff match the current filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWorkers.map((w) => {
                const isPresent = Boolean(attendance[w.worker_code]?.present)
                const markedAt = attendance[w.worker_code]?.markedAt
                const workerNote = attendance[w.worker_code]?.notes

                return (
                  <div
                    key={w.worker_code}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isPresent
                        ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Avatar / Photo */}
                      <div className="relative shrink-0">
                        {w.photo_path ? (
                          <img
                            src={getPhotoPublicUrl(w.photo_path) || '/assets/aistudio/fevicon_18dfe662.png'}
                            alt={w.full_name}
                            className="w-12 h-12 rounded-2xl object-cover border border-gray-200 shadow-sm"
                          />
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm ${
                              isPresent
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {w.full_name?.charAt(0) || 'C'}
                          </div>
                        )}
                        {isPresent && (
                          <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 border-2 border-white">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-base">
                            {w.full_name}
                          </h4>
                          <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                            {w.worker_code}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {w.tier || 'Silver'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                          {w.phone && (
                            <a
                              href={`tel:${w.phone}`}
                              className="text-gray-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{w.phone}</span>
                            </a>
                          )}
                          {w.district && (
                            <span>• {w.district}</span>
                          )}
                          {isPresent && markedAt && (
                            <span className="text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-full text-[11px]">
                              ✓ Reported at {markedAt}
                            </span>
                          )}
                        </div>

                        {workerNote && (
                          <p className="text-[11px] text-gray-500 mt-1 italic">
                            Note: {workerNote}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isPresent ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-2 rounded-xl flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Present</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleAttendance(w.worker_code, true)}
                            className="text-xs text-gray-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Undo attendance"
                          >
                            Undo
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(w.worker_code, false)}
                          className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Mark Present</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* CaterCrew Operations Support Card */}
        <div className="bg-gray-900 text-white rounded-3xl p-6 border border-gray-800 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-white">
              CaterCrew Operations Coordination Desk
            </h4>
            <p className="text-xs text-gray-400 mt-1 max-w-lg">
              Our central dispatch supervisors track real-time attendance for {report.eventName}. If any catering boy leaves early or additional staff is needed, call our operations desk.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`tel:${report.supervisorPhone || '+919400088221'}`}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow inline-flex items-center gap-2 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>Call Dispatcher</span>
            </a>
          </div>
        </div>
      </main>

      {/* Shortage Reporting Modal */}
      {showShortageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-extrabold text-gray-900">
              Report Staff Shortage
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Notify CaterCrew Operations immediately so we can dispatch standby catering boys to {report.venue}.
            </p>

            <form onSubmit={handleSubmitShortage} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  How many boys are short?
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setShortageCount(num)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors cursor-pointer ${
                        shortageCount === num
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Reason or Urgent Details
                </label>
                <textarea
                  rows="3"
                  value={shortageReason}
                  onChange={(e) => setShortageReason(e.target.value)}
                  placeholder="e.g. 2 boys did not report by 5 PM, guest count increased, need 2 extra boys for buffet counters ASAP..."
                  className="w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rose-500 text-gray-900 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowShortageModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shortageSubmitting}
                  className="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow cursor-pointer transition-colors"
                >
                  {shortageSubmitting ? 'Submitting...' : 'Alert CaterCrew Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Extra / Substitute Worker Modal */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-3">
              <Plus className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-extrabold text-gray-900">
              Add Extra / Substitute Boy
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              If an unscheduled or substitute CaterCrew boy arrived on site, enter their details to mark attendance.
            </p>

            {addWorkerError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {addWorkerError}
              </div>
            )}

            <form onSubmit={handleAddExtraWorker} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Worker Code (Optional if name is provided)
                </label>
                <input
                  type="text"
                  value={extraWorkerCode}
                  onChange={(e) => setExtraWorkerCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CC-SLV-000045"
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-gray-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Catering Boy Name
                </label>
                <input
                  type="text"
                  value={extraWorkerName}
                  onChange={(e) => setExtraWorkerName(e.target.value)}
                  placeholder="e.g. Anandhu K"
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={extraWorkerPhone}
                  onChange={(e) => setExtraWorkerPhone(e.target.value)}
                  placeholder="e.g. +91 98460 00000"
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-gray-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={searchingWorker}
                  className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow cursor-pointer transition-colors"
                >
                  {searchingWorker ? 'Adding...' : 'Add & Mark Present'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
