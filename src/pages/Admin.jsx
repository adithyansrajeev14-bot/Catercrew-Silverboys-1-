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
  Database,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  supabase,
  isSupabaseConfigured,
  getPhotoPublicUrl,
  checkDatabaseConnection,
} from '../lib/supabase'
import { TIERS } from '../lib/constants'

export default function Admin() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(false)

  // Database Connection State
  const [dbStatus, setDbStatus] = useState({
    loading: true,
    connected: false,
    configured: isSupabaseConfigured,
    message: 'Testing connection...',
    url: null,
    latency: null,
  })

  // Auth form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Dashboard state - ONLY actual data from database
  const [workers, setWorkers] = useState([])
  const [loadingWorkers, setLoadingWorkers] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [activeTab, setActiveTab] = useState('all') // all, pending, verified, suspended
  const [searchQuery, setSearchQuery] = useState('')

  // Detail Modal state
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Test database connection
  const testDb = useCallback(async () => {
    setDbStatus((prev) => ({ ...prev, loading: true }))
    const res = await checkDatabaseConnection()
    setDbStatus({
      loading: false,
      connected: res.connected,
      configured: res.configured,
      message: res.message,
      url: res.url,
      latency: res.latency,
    })
  }, [])

  useEffect(() => {
    let active = true
    checkDatabaseConnection().then((res) => {
      if (active) {
        setDbStatus({
          loading: false,
          connected: res.connected,
          configured: res.configured,
          message: res.message,
          url: res.url,
          latency: res.latency,
        })
      }
    })
    return () => {
      active = false
    }
  }, [])

  const fetchWorkers = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setWorkers([])
      setFetchError('Database credentials are not configured in .env.')
      return
    }

    setLoadingWorkers(true)
    setFetchError('')
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setWorkers(data || [])
    } catch (err) {
      console.error('Failed to fetch real workers from database:', err)
      setFetchError(err.message || 'Error fetching records from database.')
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
        throw new Error(
          'Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file to enable authentication.'
        )
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
      if (!isSupabaseConfigured) {
        throw new Error('Database is not configured.')
      }

      const updates = {
        status: newStatus,
        verified_at: newStatus === 'verified' ? new Date().toISOString() : null,
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
        throw new Error('Database is not configured.')
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
        throw new Error('Database is not configured.')
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
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:py-20 bg-gray-950">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full">
          <div className="w-12 h-12 bg-gray-800 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-gray-700 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>

          <div className="text-center mb-4">
            <span className="text-3xl font-black text-white tracking-tight">
              Cater<span className="text-emerald-400">Crew</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center tracking-tight">
            Admin Login
          </h1>
          <p className="text-gray-400 text-sm text-center mt-1 mb-6">
            Sign in to review and verify catering staff registrations.
          </p>

          {authError && (
            <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs sm:text-sm rounded-xl">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@catercrew.in"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-800 bg-gray-950 focus:border-emerald-500 focus:outline-none text-white text-base placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-800 bg-gray-950 focus:border-emerald-500 focus:outline-none text-white text-base placeholder-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl text-base transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              {loginLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Sign In to Dashboard</span>
              )}
            </button>
          </form>

          {/* Live Database Connection Status Card */}
          <div className="mt-6 pt-5 border-t border-gray-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-gray-400" />
                <span>Database Connection</span>
              </span>
              <button
                type="button"
                onClick={testDb}
                disabled={dbStatus.loading}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Test connection now"
              >
                <RefreshCw className={`w-3 h-3 ${dbStatus.loading ? 'animate-spin' : ''}`} />
                <span>Test Live</span>
              </button>
            </div>

            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                dbStatus.connected
                  ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-800/80 text-rose-300'
              }`}
            >
              {dbStatus.connected ? (
                <Wifi className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <WifiOff className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>{dbStatus.connected ? 'Connected to Supabase' : 'Database Offline / Unconfigured'}</span>
                  {dbStatus.latency && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-200 font-mono">
                      {dbStatus.latency}ms
                    </span>
                  )}
                </div>
                <p className="text-[11px] opacity-90 mt-0.5">{dbStatus.message}</p>
                {dbStatus.url && (
                  <p className="text-[10px] opacity-75 font-mono truncate mt-1">
                    Host: {dbStatus.url}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 3. Authenticated but NOT in `admins` table
  if (session && !isAdmin && !checkingAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-gray-950">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-gray-800 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Admin Authorization Required
          </h1>
          <p className="text-gray-300 text-sm sm:text-base mt-2">
            Your account (<strong className="text-white">{session.user.email}</strong>) is
            authenticated, but has not been added to the CaterCrew <code className="font-mono bg-gray-800 text-emerald-400 px-1 py-0.5 rounded">admins</code> table yet.
          </p>

          {/* Step-by-step SQL instruction */}
          <div className="mt-6 p-5 bg-gray-950 border border-gray-800 rounded-2xl text-left text-xs font-mono">
            <p className="text-gray-400 font-sans mb-1 font-semibold">
              To grant access, run this in your Supabase SQL Editor:
            </p>
            <div className="bg-gray-900 text-emerald-400 p-3 rounded-lg overflow-x-auto select-all border border-gray-800">
              insert into public.admins (user_id) values (&apos;{session.user.id}&apos;) on conflict do nothing;
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => checkAdminStatus(session.user.id)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check Authorization Again</span>
            </button>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-750 text-gray-200 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer border border-gray-700"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 4. ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        {/* Top Admin Bar */}
        <div className="bg-gray-900 rounded-2xl shadow-xl border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-6 py-4">
          <div className="flex items-center gap-4">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Cater<span className="text-emerald-400">Crew</span>
            </span>
            <div className="border-l border-gray-800 pl-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  ADMINISTRATOR
                </span>
                <span className="text-xs text-gray-400">{session.user.email}</span>
                {/* Live Database status pill */}
                <div
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    dbStatus.connected
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/70'
                      : 'bg-rose-950/80 text-rose-300 border-rose-800/70'
                  }`}
                  title={dbStatus.message}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dbStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                  <span>{dbStatus.connected ? 'DB Online' : 'DB Disconnected'}</span>
                  {dbStatus.latency && (
                    <span className="text-[10px] opacity-80 font-mono">({dbStatus.latency}ms)</span>
                  )}
                </div>
              </div>
              <h1 className="text-xl font-extrabold text-white mt-0.5 tracking-tight">
                Catering Staff Registrations
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                testDb()
                fetchWorkers()
              }}
              disabled={loadingWorkers}
              className="p-2.5 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-750 text-gray-200 transition-colors cursor-pointer"
              title="Refresh database records & connection"
            >
              <RefreshCw className={`w-4 h-4 ${loadingWorkers || dbStatus.loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export to CSV</span>
            </button>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 text-gray-400 hover:text-white hover:bg-gray-800 text-sm px-3 py-2 rounded-xl transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button
              onClick={fetchWorkers}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-white cursor-pointer"
            >
              Retry Query
            </button>
          </div>
        )}

        {/* Metric Cards (Card Dashboard) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer shadow-md ${
              activeTab === 'all'
                ? 'border-emerald-500 bg-gray-900 text-white ring-1 ring-emerald-500/40'
                : 'border-gray-800 bg-gray-900/90 hover:border-gray-700 text-gray-200'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Staff
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1 text-white">{counts.all}</p>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer shadow-md ${
              activeTab === 'pending'
                ? 'border-amber-500 bg-amber-950/40 text-amber-200 ring-1 ring-amber-500/40'
                : 'border-gray-800 bg-gray-900/90 hover:border-amber-500/40 text-amber-300'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/80">
              Pending Review
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1 text-amber-300">{counts.pending}</p>
          </button>

          <button
            onClick={() => setActiveTab('verified')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer shadow-md ${
              activeTab === 'verified'
                ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500/40'
                : 'border-gray-800 bg-gray-900/90 hover:border-emerald-500/40 text-emerald-300'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
              Verified Active
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1 text-emerald-300">{counts.verified}</p>
          </button>

          <button
            onClick={() => setActiveTab('suspended')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer shadow-md ${
              activeTab === 'suspended'
                ? 'border-rose-500 bg-rose-950/40 text-rose-200 ring-1 ring-rose-500/40'
                : 'border-gray-800 bg-gray-900/90 hover:border-rose-500/40 text-rose-300'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400/80">
              Suspended
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1 text-rose-300">{counts.suspended}</p>
          </button>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto text-sm">
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
              placeholder="Search name, phone, ID..."
              className="w-full pl-9 pr-4 py-2 text-sm border-2 border-gray-800 bg-gray-900 rounded-xl focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Table of Registrations Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-950 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-400 font-semibold">
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
              <tbody className="divide-y divide-gray-800 font-medium text-gray-300">
                {filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14 text-gray-400">
                      {loadingWorkers ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">Fetching real worker registrations from database...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Database className="w-6 h-6 text-gray-600 mb-1" />
                          <p className="font-semibold text-gray-300">No worker registrations found</p>
                          <p className="text-xs text-gray-500">
                            {workers.length === 0
                              ? 'The database table is currently empty. Registrations submitted via /register will appear here in real-time.'
                              : 'No registrations matched your active filter/search query.'}
                          </p>
                        </div>
                      )}
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
                        className="hover:bg-gray-800/60 cursor-pointer transition-colors"
                      >
                        {/* Name & Photo */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover border border-emerald-500/60 bg-gray-800 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-800 text-emerald-400 border border-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {w.full_name?.charAt(0) || 'C'}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-white">{w.full_name}</p>
                              <p className="text-xs text-gray-400">
                                {w.height_cm} cm • {w.experience_years} yrs exp
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Code */}
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                          {w.worker_code}
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4 font-mono text-xs sm:text-sm text-gray-300">
                          {w.phone}
                        </td>

                        {/* District */}
                        <td className="py-3 px-4 text-xs sm:text-sm">
                          <span className="font-semibold text-gray-200">{w.district}</span>
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
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Verified</span>
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Pending</span>
                            </span>
                          )}
                          {isSuspended && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-300 bg-rose-950/70 border border-rose-700/60 px-2.5 py-0.5 rounded-full">
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
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
                            className="px-3 py-1.5 rounded-lg border border-gray-700 hover:border-emerald-500 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 hover:text-white transition-colors cursor-pointer"
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

      {/* DETAIL MODAL CARD */}
      {selectedWorker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative border border-gray-800 text-gray-100">
            {/* Close Button */}
            <button
              onClick={() => setSelectedWorker(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-4 border-b border-gray-800 pb-5">
              {selectedWorker.photo_path ? (
                <img
                  src={getPhotoPublicUrl(selectedWorker.photo_path)}
                  alt=""
                  className="w-16 h-20 rounded-xl object-cover border-2 border-emerald-500/80 bg-gray-800 shrink-0"
                />
              ) : (
                <div className="w-16 h-20 rounded-xl bg-gray-800 border border-gray-700 text-emerald-400 flex items-center justify-center shrink-0">
                  <User className="w-8 h-8" />
                </div>
              )}

              <div>
                <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider">
                  {selectedWorker.worker_code}
                </span>
                <h2 className="text-2xl font-black text-white">
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
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                        : selectedWorker.status === 'suspended'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
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
                <div className="p-3 bg-gray-800/80 border border-gray-700/60 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">Date of Birth</span>
                  <span className="font-semibold text-white">{selectedWorker.dob}</span>
                </div>

                <div className="p-3 bg-gray-800/80 border border-gray-700/60 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">Height</span>
                  <span className="font-semibold text-white">
                    {selectedWorker.height_cm} cm
                  </span>
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-800/80 border border-gray-700/60 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">Phone Number</span>
                  <span className="font-mono font-bold text-white">{selectedWorker.phone}</span>
                </div>

                <div className="p-3 bg-gray-800/80 border border-gray-700/60 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">WhatsApp</span>
                  <span className="font-mono font-bold text-white">
                    {selectedWorker.whatsapp}
                  </span>
                </div>
              </div>

              {/* Location info */}
              <div className="p-3 bg-gray-800/80 border border-gray-700/60 rounded-xl">
                <span className="text-xs text-gray-400 block font-medium">Location</span>
                <span className="font-semibold text-white">
                  {selectedWorker.area}, {selectedWorker.district}
                </span>
                <span className="text-xs text-gray-300 block mt-0.5">
                  Travel to other districts:{' '}
                  <strong className="text-emerald-400">{selectedWorker.travel_ok ? 'Yes, willing' : 'No, home only'}</strong>
                </span>
              </div>

              {/* Experience only */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-800/80 border border-gray-700/60 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">Catering Experience</span>
                  <span className="font-semibold text-white">
                    {selectedWorker.experience_years} years
                  </span>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-3 bg-gray-800/80 border border-gray-700/60 rounded-xl">
                <span className="text-xs text-gray-400 block font-medium">Emergency Contact</span>
                <span className="font-semibold text-white">
                  {selectedWorker.emergency_name}
                </span>
                <span className="font-mono text-gray-300 block text-xs mt-0.5">
                  Phone: {selectedWorker.emergency_phone}
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS (VERIFY / SUSPEND / TIER / REJECT) */}
            <div className="border-t border-gray-800 pt-5 space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Administrative Actions
              </span>

              <div className="flex flex-wrap gap-2.5">
                {/* Verify Button */}
                {selectedWorker.status !== 'verified' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedWorker.id, 'verified')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer shadow-sm"
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
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer shadow-sm"
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
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-xl text-sm transition-colors cursor-pointer border border-gray-700"
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
                    className="px-3.5 py-2.5 bg-gray-800 border-2 border-gray-700 text-white font-bold rounded-xl text-sm focus:border-emerald-500 cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-rose-400 hover:bg-rose-950/60 border border-rose-800/80 font-semibold rounded-xl text-sm ml-auto transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reject / Delete</span>
                </button>
              </div>

              {/* Confirm Delete Prompt */}
              {deleteConfirmOpen && (
                <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200 text-xs sm:text-sm mt-3 flex items-center justify-between gap-4">
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
                      className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-700 cursor-pointer"
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
