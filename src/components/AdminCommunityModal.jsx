import { useState, useEffect, useMemo } from 'react'
import {
  X,
  MessageCircle,
  Search,
  CheckCircle2,
  ExternalLink,
  SlidersHorizontal,
  RotateCcw,
  Users,
  ArrowRight,
  Phone,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { KERALA_DISTRICTS, COMMUNITY_WHATSAPP_LINK } from '../lib/constants'
import {
  DEFAULT_COMMUNITY_MESSAGE_TEMPLATE,
  buildWorkerCommunityWhatsAppUrl,
  getSavedCommunityLink,
  saveCommunityLink,
  getSavedCommunityTemplate,
  saveCommunityTemplate,
} from '../lib/communityInvite'

export default function AdminCommunityModal({
  isOpen,
  onClose,
  initialWorkers = [],
  invitedMap = {},
  onMarkInvited,
  onUnmarkInvited,
  isDemoMode = false,
}) {
  const [fetchedWorkers, setFetchedWorkers] = useState(null)
  const [loadingAll, setLoadingAll] = useState(false)
  const [filterMode, setFilterMode] = useState('uninvited') // 'uninvited' | 'all' | 'invited'
  const [districtFilter, setDistrictFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [communityLink, setCommunityLink] = useState(() => getSavedCommunityLink())
  const [messageTemplate, setMessageTemplate] = useState(() => getSavedCommunityTemplate())

  // Load full list of active staff from Supabase so admin can invite every boy in the DB, not just page 1
  useEffect(() => {
    if (!isOpen || !isSupabaseConfigured || isDemoMode) return

    let active = true
    const fetchAllStaff = async () => {
      setLoadingAll(true)
      try {
        const { data, error } = await supabase
          .from('workers')
          .select('id, worker_code, full_name, phone, whatsapp, district, area, tier, status, created_at')
          .neq('status', 'suspended')
          .order('created_at', { ascending: false })
          .limit(2000)

        if (!error && data && active) {
          setFetchedWorkers(data)
        }
      } catch (err) {
        console.warn('Unable to load full worker list for community modal:', err)
      } finally {
        if (active) setLoadingAll(false)
      }
    }

    fetchAllStaff()
    return () => {
      active = false
    }
  }, [isOpen, isDemoMode])

  const allWorkers = fetchedWorkers && !isDemoMode ? fetchedWorkers : initialWorkers

  const eligibleWorkers = useMemo(() => {
    return allWorkers.filter((w) => w.status !== 'suspended')
  }, [allWorkers])

  const isWorkerInvited = useMemo(() => {
    return (workerCode) => {
      if (!workerCode) return false
      return Boolean(invitedMap[workerCode.trim().toUpperCase()])
    }
  }, [invitedMap])

  const stats = useMemo(() => {
    let invited = 0
    let uninvited = 0
    for (const w of eligibleWorkers) {
      if (isWorkerInvited(w.worker_code)) {
        invited += 1
      } else {
        uninvited += 1
      }
    }
    return {
      total: eligibleWorkers.length,
      invited,
      uninvited,
    }
  }, [eligibleWorkers, isWorkerInvited])

  const filteredList = useMemo(() => {
    return eligibleWorkers.filter((w) => {
      const invited = isWorkerInvited(w.worker_code)
      if (filterMode === 'uninvited' && invited) return false
      if (filterMode === 'invited' && !invited) return false

      if (districtFilter !== 'all' && w.district !== districtFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = (w.full_name || '').toLowerCase().includes(q)
        const matchCode = (w.worker_code || '').toLowerCase().includes(q)
        const matchPhone = (w.whatsapp || w.phone || '').includes(q)
        const matchDistrict = (w.district || '').toLowerCase().includes(q)
        return matchName || matchCode || matchPhone || matchDistrict
      }

      return true
    })
  }, [eligibleWorkers, isWorkerInvited, filterMode, districtFilter, searchQuery])

  // Next uninvited boy in the current view (or overall uninvited if viewing another tab)
  const nextUninvitedWorker = useMemo(() => {
    const inFiltered = filteredList.find((w) => !isWorkerInvited(w.worker_code))
    if (inFiltered) return inFiltered
    return eligibleWorkers.find((w) => !isWorkerInvited(w.worker_code)) || null
  }, [filteredList, eligibleWorkers, isWorkerInvited])

  if (!isOpen) return null

  const handleLinkChange = (val) => {
    setCommunityLink(val)
    saveCommunityLink(val)
  }

  const handleTemplateChange = (val) => {
    setMessageTemplate(val)
    saveCommunityTemplate(val)
  }

  const handleResetTemplate = () => {
    setCommunityLink(COMMUNITY_WHATSAPP_LINK)
    saveCommunityLink(COMMUNITY_WHATSAPP_LINK)
    setMessageTemplate(DEFAULT_COMMUNITY_MESSAGE_TEMPLATE)
    saveCommunityTemplate(DEFAULT_COMMUNITY_MESSAGE_TEMPLATE)
  }

  const nextWorkerWaUrl = nextUninvitedWorker
    ? buildWorkerCommunityWhatsAppUrl(nextUninvitedWorker, {
        communityLink,
        template: messageTemplate,
      })
    : null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl text-gray-100 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-800 flex items-start justify-between gap-4 bg-gray-950/70">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] flex items-center justify-center shrink-0">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Add Boys to CaterCrew Community</span>
                {loadingAll && <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />}
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Send a personalized WhatsApp community join message to each boy separately with one tap.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Summary Stats + Customize Toggle */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                Active Boys
              </span>
              <span className="text-2xl font-black text-white mt-0.5 block">{stats.total}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                Not Invited Yet
              </span>
              <span className="text-2xl font-black text-amber-300 mt-0.5 block">{stats.uninvited}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                Invite Sent
              </span>
              <span className="text-2xl font-black text-emerald-300 mt-0.5 block">{stats.invited}</span>
            </div>
          </div>

          {/* Sequential One-by-One Quick Launcher */}
          {nextUninvitedWorker && nextWorkerWaUrl ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-gray-900 to-gray-900 border border-[#25D366]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#25D366]">
                  <Users className="w-3.5 h-3.5" />
                  <span>Next Boy in Queue ({stats.uninvited} remaining)</span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base sm:text-lg font-extrabold text-white">
                    {nextUninvitedWorker.full_name}
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-gray-950 border border-gray-800 px-2 py-0.5 rounded-md">
                    {nextUninvitedWorker.worker_code}
                  </span>
                </div>
                <p className="text-xs text-gray-300 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="font-mono">{nextUninvitedWorker.whatsapp || nextUninvitedWorker.phone}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span>{nextUninvitedWorker.district}</span>
                  </span>
                </p>
              </div>

              <a
                href={nextWorkerWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onMarkInvited(nextUninvitedWorker.worker_code)}
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-gray-950 font-extrabold text-sm px-5 py-3 rounded-xl shadow-lg transition-all cursor-pointer shrink-0"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Send to {nextUninvitedWorker.full_name?.split(' ')[0] || 'Boy'} &amp; Next</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-3 text-emerald-200 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                All <strong>{stats.total}</strong> active boys have been sent a community invite! You can still resend individually below anytime.
              </span>
            </div>
          )}

          {/* Message & Link Customizer */}
          <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSettings((prev) => !prev)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-bold text-gray-300 hover:text-white hover:bg-gray-900/60 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <span>Customize Community Link &amp; Join Message</span>
              </span>
              <span className="text-xs text-emerald-400">{showSettings ? 'Hide' : 'Edit Message'}</span>
            </button>

            {showSettings && (
              <div className="p-4 border-t border-gray-800 space-y-3 bg-gray-900/50">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    WhatsApp Community Invite Link
                  </label>
                  <input
                    type="url"
                    value={communityLink}
                    onChange={(e) => handleLinkChange(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-700 bg-gray-950 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-300">
                      Individual Message Template
                    </label>
                    <button
                      type="button"
                      onClick={handleResetTemplate}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-emerald-400 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Default</span>
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={messageTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-700 bg-gray-950 text-gray-100 text-xs leading-relaxed font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Placeholders auto-filled per boy:{' '}
                    <code className="text-emerald-400">{'{name}'}</code>,{' '}
                    <code className="text-emerald-400">{'{worker_code}'}</code>,{' '}
                    <code className="text-emerald-400">{'{district}'}</code>,{' '}
                    <code className="text-emerald-400">{'{community_link}'}</code>,{' '}
                    <code className="text-emerald-400">{'{status_url}'}</code>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Filter & Search Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-gray-950 border border-gray-800 rounded-xl text-xs">
              {[
                { id: 'uninvited', label: `Not Sent (${stats.uninvited})` },
                { id: 'all', label: `All Boys (${stats.total})` },
                { id: 'invited', label: `Sent (${stats.invited})` },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterMode(t.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    filterMode === t.id
                      ? 'bg-gray-800 text-emerald-400 border border-gray-700'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-1 sm:max-w-md">
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                aria-label="Filter by district"
                className="px-3 py-2 rounded-xl border border-gray-800 bg-gray-950 text-xs font-semibold text-gray-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Districts</option>
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, ID, phone..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-800 bg-gray-950 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Per-Boy Individual Send List */}
          <div className="bg-gray-950 border border-gray-800 rounded-2xl divide-y divide-gray-800/80 max-h-80 overflow-y-auto">
            {filteredList.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-xs sm:text-sm">
                No staff members match this filter.
              </div>
            ) : (
              filteredList.map((w) => {
                const invited = isWorkerInvited(w.worker_code)
                const waUrl = buildWorkerCommunityWhatsAppUrl(w, {
                  communityLink,
                  template: messageTemplate,
                })

                return (
                  <div
                    key={w.id || w.worker_code}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-900/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">{w.full_name}</span>
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {w.worker_code}
                        </span>
                        {invited && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/70 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Invite Sent</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">
                        {w.whatsapp || w.phone || 'No WhatsApp number'} •{' '}
                        <span className="font-sans">{w.district}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {invited && (
                        <button
                          type="button"
                          onClick={() => onUnmarkInvited(w.worker_code)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 transition-colors cursor-pointer"
                          title="Mark as not sent"
                        >
                          Mark Unsent
                        </button>
                      )}

                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onMarkInvited(w.worker_code)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            invited
                              ? 'bg-gray-800 hover:bg-gray-700 text-emerald-300 border border-emerald-800/60'
                              : 'bg-[#25D366] hover:bg-[#20ba59] text-gray-950 shadow-sm'
                          }`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{invited ? 'Resend Join Message' : 'Send Join Message'}</span>
                          <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                      ) : (
                        <span className="text-xs text-rose-400 font-semibold px-2">Invalid Phone</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
