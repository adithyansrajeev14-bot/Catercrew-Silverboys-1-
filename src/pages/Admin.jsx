import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Lock,
  Search,
  Download,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Trash2,
  X,
  User,
  RefreshCw,
  LogOut,
  AlertTriangle,
} from 'lucide-react'
import {
  supabase,
  isSupabaseConfigured,
  getPhotoPublicUrl,
} from '../lib/supabase'
import { TIERS } from '../lib/constants'

const DEMO_WORKERS = [
  {
    id: 'demo-1',
    worker_code: 'CC-SLV-000101',
    tier: 'silver',
    status: 'pending',
    full_name: 'Anandhu Krishna',
    dob: '2003-05-14',
    height_cm: 175,
    phone: '9847123456',
    whatsapp: '9847123456',
    district: 'Ernakulam',
    area: 'Aluva',
    travel_ok: true,
    photo_path: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    experience_years: 1.5,
    has_uniform: true,
    emergency_name: 'Krishna Pillai (Father)',
    emergency_phone: '9847000111',
    consent: true,
    created_at: '2026-10-22T10:00:00.000Z',
    verified_at: null,
  },
  {
    id: 'demo-2',
    worker_code: 'CC-SLV-000098',
    tier: 'silver',
    status: 'verified',
    full_name: 'Rahul Joseph',
    dob: '2001-11-20',
    height_cm: 172,
    phone: '9447112233',
    whatsapp: '9447112233',
    district: 'Kottayam',
    area: 'Pala',
    travel_ok: true,
    photo_path: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    experience_years: 3,
    has_uniform: true,
    emergency_name: 'Joseph V. (Father)',
    emergency_phone: '9447000222',
    consent: true,
    created_at: '2026-10-20T08:30:00.000Z',
    verified_at: '2026-10-21T14:15:00.000Z',
  },
]

export default function Admin() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(false)

  // Auth form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Dashboard state
  const [workers, setWorkers] = useState(isSupabaseConfigured ? [] : DEMO_WORKERS)
  const [loadingWorkers, setLoadingWorkers] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // all, pending, verified, suspended
  const [searchQuery, setSearchQuery] = useState('')

  // Detail Modal state
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const fetchWorkers = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setWorkers(DEMO_WORKERS)
      return
    }

    setLoadingWorkers(true)
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setWorkers(data || [])
    } catch (err) {
      console.error('Failed to fetch workers:', err)
    } finally {
      setLoadingWorkers(false)
    }
  }, [])

  const checkAdminStatus = useCallback(async (userId) => {
    setCheckingAdmin(true)
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error
      setIsAdmin(Boolean(data))
      if (data) {
        fetchWorkers()
      }
    } catch (err) {
      console.error('Error verifying admin authorization:', err)
      setIsAdmin(false)
    } finally {
      setCheckingAdmin(false)
      setAuthLoading(false)
    }
  }, [fetchWorkers])

  // Check auth state
  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession)
      if (currentSession?.user) {
        checkAdminStatus(currentSession.user.id)
      } else {
        setAuthLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      if (currentSession?.user) {
        checkAdminStatus(currentSession.user.id)
      } else {
        setIsAdmin(false)
        setAuthLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [checkAdminStatus])

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    setLoginLoading(true)

    try {
      if (!isSupabaseConfigured) {
        // In demo mode, simulate successful admin login
        await new Promise((r) => setTimeout(r, 600))
        setSession({ user: { id: 'demo-admin-id', email: email || 'admin@catercrew.in' } })
        setIsAdmin(true)
        setWorkers(DEMO_WORKERS)
        setLoginLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) throw error
      setSession(data.session)
      await checkAdminStatus(data.user.id)
    } catch (err) {
      console.error('Login error:', err)
      setAuthError(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    setSession(null)
    setIsAdmin(false)
    setSelectedWorker(null)
  }

  // Open worker details modal
  const handleOpenDetail = (worker) => {
    setSelectedWorker(worker)
    setDeleteConfirmOpen(false)
  }

  // Update Worker Status
  const handleUpdateStatus = async (workerId, newStatus) => {
    setActionLoading(true)
    try {
      const updates = {
        status: newStatus,
        verified_at: newStatus === 'verified' ? new Date().toISOString() : null,
      }

      if (!isSupabaseConfigured) {
        setWorkers((prev) =>
          prev.map((w) => (w.id === workerId ? { ...w, ...updates } : w))
        )
        if (selectedWorker?.id === workerId) {
          setSelectedWorker((prev) => ({ ...prev, ...updates }))
        }
        setActionLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('workers')
        .update(updates)
        .eq('id', workerId)
        .select()
        .single()

      if (error) throw error

      setWorkers((prev) => prev.map((w) => (w.id === workerId ? data : w)))
      if (selectedWorker?.id === workerId) {
        setSelectedWorker(data)
      }
    } catch (err) {
      alert(`Failed to update status: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Change Tier
  const handleChangeTier = async (workerId, newTier) => {
    setActionLoading(true)
    try {
      if (!isSupabaseConfigured) {
        setWorkers((prev) =>
          prev.map((w) => (w.id === workerId ? { ...w, tier: newTier } : w))
        )
        if (selectedWorker?.id === workerId) {
          setSelectedWorker((prev) => ({ ...prev, tier: newTier }))
        }
        setActionLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('workers')
        .update({ tier: newTier })
        .eq('id', workerId)
        .select()
        .single()

      if (error) throw error

      setWorkers((prev) => prev.map((w) => (w.id === workerId ? data : w)))
      if (selectedWorker?.id === workerId) {
        setSelectedWorker(data)
      }
    } catch (err) {
      alert(`Failed to change tier: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Worker
  const handleDeleteWorker = async (workerId) => {
    setActionLoading(true)
    try {
      if (!isSupabaseConfigured) {
        setWorkers((prev) => prev.filter((w) => w.id !== workerId))
        setSelectedWorker(null)
        setDeleteConfirmOpen(false)
        setActionLoading(false)
        return
      }

      const { error } = await supabase.from('workers').delete().eq('id', workerId)
      if (error) throw error

      setWorkers((prev) => prev.filter((w) => w.id !== workerId))
      setSelectedWorker(null)
      setDeleteConfirmOpen(false)
    } catch (err) {
      alert(`Failed to delete registration: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      // Tab filter
      if (activeTab !== 'all' && w.status !== activeTab) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchName = (w.full_name || '').toLowerCase().includes(query)
        const matchPhone = (w.phone || '').includes(query)
        const matchCode = (w.worker_code || '').toLowerCase().includes(query)
        const matchDistrict = (w.district || '').toLowerCase().includes(query)
        return matchName || matchPhone || matchCode || matchDistrict
      }

      return true
    })
  }, [workers, activeTab, searchQuery])

  // Count summaries
  const counts = useMemo(() => {
    return {
      all: workers.length,
      pending: workers.filter((w) => w.status === 'pending').length,
      verified: workers.filter((w) => w.status === 'verified').length,
      suspended: workers.filter((w) => w.status === 'suspended').length,
    }
  }, [workers])

  // Export to CSV
  const handleExportCSV = () => {
    const listToExport = filteredWorkers.length ? filteredWorkers : workers
    if (!listToExport.length) {
      alert('No records available to export.')
      return
    }

    const headers = [
      'Worker Code',
      'Full Name',
      'Tier',
      'Status',
      'Phone',
      'WhatsApp',
      'District',
      'Area',
      'Willing to Travel',
      'DOB',
      'Height (cm)',
      'Experience (Yrs)',
      'Emergency Contact',
      'Emergency Phone',
      'Registered At',
      'Verified At',
    ]

    const rows = listToExport.map((w) => [
      w.worker_code,
      `"${(w.full_name || '').replace(/"/g, '""')}"`,
      w.tier,
      w.status,
      w.phone,
      w.whatsapp,
      `"${w.district || ''}"`,
      `"${(w.area || '').replace(/"/g, '""')}"`,
      w.travel_ok ? 'Yes' : 'No',
      w.dob,
      w.height_cm,
      w.experience_years,
      `"${(w.emergency_name || '').replace(/"/g, '""')}"`,
      w.emergency_phone,
      w.created_at,
      w.verified_at || '',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    const dateStr = new Date().toISOString().slice(0, 10)
    link.setAttribute('download', `CaterCrew_Registrations_${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 1. Loading screen
  if (authLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Checking administrator session...</p>
      </div>
    )
  }

  // 2. Unauthenticated Login Screen
  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 sm:py-20">
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>

          <div className="flex justify-center mb-4">
            <img
              src="/catercrew-logo.jpg"
              alt="CaterCrew"
              className="h-16 w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(100deg)' }}
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center tracking-tight">
            Admin Login
          </h1>
          <p className="text-gray-500 text-sm text-center mt-1 mb-6">
            Sign in to review and verify catering staff registrations.
          </p>

          {authError && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-xl">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@catercrew.in"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-base"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loginLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Sign In to Dashboard</span>
              )}
            </button>
          </form>

          {!isSupabaseConfigured && (
            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Demo Mode Active
              </span>
              <p className="text-xs text-gray-500 mt-2">
                Clicking Sign In will enter demo mode with sample registration data.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 3. Authenticated but NOT in `admins` table
  if (session && !isAdmin && !checkingAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          Admin Authorization Required
        </h1>
        <p className="text-gray-600 text-sm sm:text-base mt-2">
          Your account (<strong className="text-gray-900">{session.user.email}</strong>) is
          authenticated, but has not been added to the CaterCrew <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">admins</code> table yet.
        </p>

        {/* Step-by-step SQL instruction */}
        <div className="mt-6 p-5 bg-gray-50 border border-gray-200 rounded-2xl text-left text-xs font-mono">
          <p className="text-gray-500 font-sans mb-1 font-semibold">
            To grant access, run this in your Supabase SQL Editor:
          </p>
          <div className="bg-gray-900 text-emerald-400 p-3 rounded-lg overflow-x-auto select-all">
            insert into public.admins (user_id) values (&apos;{session.user.id}&apos;) on conflict do nothing;
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => checkAdminStatus(session.user.id)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Check Authorization Again</span>
          </button>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    )
  }

  // 4. ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-gray-50/70">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        {/* Top Admin Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-6 py-4">
          <div className="flex items-center gap-4">
            <img
              src="/catercrew-logo.jpg"
              alt="CaterCrew"
              className="h-10 w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(100deg)' }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  ADMINISTRATOR
                </span>
                <span className="text-xs text-gray-500">{session.user.email}</span>
              </div>
              <h1 className="text-xl font-extrabold text-gray-900 mt-0.5 tracking-tight">
                Catering Staff Registrations
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchWorkers}
              disabled={loadingWorkers}
              className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
              title="Refresh records"
            >
              <RefreshCw className={`w-4 h-4 ${loadingWorkers ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export to CSV</span>
            </button>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm px-3 py-2 rounded-xl transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-100 bg-white hover:border-gray-200 text-gray-800'
          }`}
        >
            <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
              Total Staff
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1">{counts.all}</p>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-gray-100 bg-white hover:border-emerald-200 text-emerald-900 shadow-sm'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Pending Review
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1">{counts.pending}</p>
          </button>

          <button
            onClick={() => setActiveTab('verified')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              activeTab === 'verified'
                ? 'border-emerald-800 bg-emerald-800 text-white'
                : 'border-gray-100 bg-white hover:border-emerald-200 text-emerald-900 shadow-sm'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Verified Active
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1">{counts.verified}</p>
          </button>

          <button
            onClick={() => setActiveTab('suspended')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              activeTab === 'suspended'
                ? 'border-rose-600 bg-rose-600 text-white'
                : 'border-gray-100 bg-white hover:border-rose-200 text-rose-900 shadow-sm'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Suspended
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1">{counts.suspended}</p>
          </button>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl overflow-x-auto text-sm">
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'pending', label: `Pending (${counts.pending})` },
            { id: 'verified', label: `Verified (${counts.verified})` },
            { id: 'suspended', label: `Suspended (${counts.suspended})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, ID..."
            className="w-full pl-9 pr-4 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-600"
          />
        </div>
        </div>

        {/* Table of Registrations */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Worker ID</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">District / Area</th>
                <th className="py-3.5 px-4">Tier</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No registrations found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((w) => {
                  const photoUrl = getPhotoPublicUrl(w.photo_path)
                  const tier = TIERS[w.tier] || TIERS.silver
                  const isVerified = w.status === 'verified'
                  const isPending = w.status === 'pending'
                  const isSuspended = w.status === 'suspended'

                  return (
                    <tr
                      key={w.id}
                      onClick={() => handleOpenDetail(w)}
                      className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                    >
                      {/* Name & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-emerald-400 bg-gray-100 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                              {w.full_name?.charAt(0) || 'C'}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900">{w.full_name}</p>
                            <p className="text-xs text-gray-400">
                              {w.height_cm} cm • {w.experience_years} yrs exp
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 text-xs sm:text-sm">
                        {w.worker_code}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 font-mono text-xs sm:text-sm text-gray-600">
                        {w.phone}
                      </td>

                      {/* District */}
                      <td className="py-3 px-4 text-xs sm:text-sm">
                        <span className="font-semibold text-gray-800">{w.district}</span>
                        <span className="text-gray-400 text-xs block truncate max-w-[120px]">
                          {w.area}
                        </span>
                      </td>

                      {/* Tier */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${tier.badgeClass}`}
                        >
                          {tier.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Verified</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Pending</span>
                          </span>
                        )}
                        {isSuspended && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                            <AlertOctagon className="w-3.5 h-3.5" />
                            <span>Suspended</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDetail(w)
                          }}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-white text-xs font-semibold text-gray-700 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedWorker && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative border border-gray-100">
            {/* Close Button */}
            <button
              onClick={() => setSelectedWorker(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-4 border-b border-gray-100 pb-5">
              {selectedWorker.photo_path ? (
                <img
                  src={getPhotoPublicUrl(selectedWorker.photo_path)}
                  alt=""
                  className="w-16 h-20 rounded-xl object-cover border-2 border-emerald-500 bg-gray-100 shrink-0"
                />
              ) : (
                <div className="w-16 h-20 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <User className="w-8 h-8" />
                </div>
              )}

              <div>
                <span className="font-mono text-xs font-bold text-emerald-700 tracking-wider">
                  {selectedWorker.worker_code}
                </span>
                <h2 className="text-2xl font-black text-gray-900">
                  {selectedWorker.full_name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                      TIERS[selectedWorker.tier]?.badgeClass
                    }`}
                  >
                    {TIERS[selectedWorker.tier]?.label}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                      selectedWorker.status === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedWorker.status === 'suspended'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {selectedWorker.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="py-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">Date of Birth</span>
                  <span className="font-semibold text-gray-900">{selectedWorker.dob}</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">Height</span>
                  <span className="font-semibold text-gray-900">
                    {selectedWorker.height_cm} cm
                  </span>
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">Phone Number</span>
                  <span className="font-mono font-bold text-gray-900">{selectedWorker.phone}</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">WhatsApp</span>
                  <span className="font-mono font-bold text-gray-900">
                    {selectedWorker.whatsapp}
                  </span>
                </div>
              </div>

              {/* Location info */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-400 block font-medium">Location</span>
                <span className="font-semibold text-gray-900">
                  {selectedWorker.area}, {selectedWorker.district}
                </span>
                <span className="text-xs text-gray-500 block mt-0.5">
                  Travel to other districts:{' '}
                  <strong>{selectedWorker.travel_ok ? 'Yes, willing' : 'No, home only'}</strong>
                </span>
              </div>

              {/* Experience only (no uniform) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">Catering Experience</span>
                  <span className="font-semibold text-gray-900">
                    {selectedWorker.experience_years} years
                  </span>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-400 block font-medium">Emergency Contact</span>
                <span className="font-semibold text-gray-900">
                  {selectedWorker.emergency_name}
                </span>
                <span className="font-mono text-gray-600 block text-xs mt-0.5">
                  Phone: {selectedWorker.emergency_phone}
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS (VERIFY / SUSPEND / TIER / REJECT) */}
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Administrative Actions
              </span>

              <div className="flex flex-wrap gap-2.5">
                {/* Verify Button */}
                {selectedWorker.status !== 'verified' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedWorker.id, 'verified')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Staff Member</span>
                  </button>
                )}

                {/* Suspend Button */}
                {selectedWorker.status !== 'suspended' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedWorker.id, 'suspended')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    <AlertOctagon className="w-4 h-4" />
                    <span>Suspend</span>
                  </button>
                )}

                {/* Reset to Pending */}
                {selectedWorker.status !== 'pending' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedWorker.id, 'pending')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Set to Pending</span>
                  </button>
                )}

                {/* Change Tier Selector */}
                <div className="relative inline-flex items-center">
                  <label htmlFor="tierSelectModal" className="sr-only">Change Tier</label>
                  <select
                    id="tierSelectModal"
                    value={selectedWorker.tier}
                    onChange={(e) => handleChangeTier(selectedWorker.id, e.target.value)}
                    disabled={actionLoading}
                    className="px-3.5 py-2.5 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 font-bold rounded-xl text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="silver">Tier: Silver Boy</option>
                    <option value="golden">Tier: Golden Boy</option>
                    <option value="diamond">Tier: Diamond Boy</option>
                  </select>
                </div>

                {/* Delete / Reject Button */}
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold rounded-xl text-sm ml-auto transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reject / Delete</span>
                </button>
              </div>

              {/* Confirm Delete Prompt */}
              {deleteConfirmOpen && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs sm:text-sm mt-3 flex items-center justify-between gap-4">
                  <span>
                    Are you sure you want to permanently delete this registration? This action cannot
                    be undone.
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDeleteWorker(selectedWorker.id)}
                      className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-700 cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirmOpen(false)}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
