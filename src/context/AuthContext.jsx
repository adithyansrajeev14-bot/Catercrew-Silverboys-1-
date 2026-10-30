import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'admin' | 'worker' | 'company' | null
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch user role and linked profile
  const fetchUserRole = useCallback(async (currentUserId) => {
    if (!currentUserId || !isSupabaseConfigured) {
      setRole(null)
      setProfile(null)
      return { role: null, profile: null }
    }

    try {
      // 1. Primary: Security Definer RPC get_user_role
      const { data, error } = await supabase.rpc('get_user_role')
      if (!error && data && data.role) {
        setRole(data.role)
        setProfile(data)
        return { role: data.role, profile: data }
      }
    } catch (err) {
      console.warn('get_user_role RPC call failed, trying fallback check:', err)
    }

    // 2. Fallback direct queries if RPC is not deployed yet
    try {
      // Check admin
      const { data: adminData } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (adminData) {
        const adminProfile = { role: 'admin', user_id: currentUserId }
        setRole('admin')
        setProfile(adminProfile)
        return { role: 'admin', profile: adminProfile }
      }

      // Check worker
      const { data: workerData } = await supabase
        .from('workers')
        .select('id, worker_code, full_name, tier, status')
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (workerData) {
        const workerProfile = {
          role: 'worker',
          worker_id: workerData.id,
          worker_code: workerData.worker_code,
          name: workerData.full_name,
          tier: workerData.tier,
          status: workerData.status,
        }
        setRole('worker')
        setProfile(workerProfile)
        return { role: 'worker', profile: workerProfile }
      }

      // Check company
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, company_name, company_type, status, district')
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (companyData) {
        const compProfile = {
          role: 'company',
          company_id: companyData.id,
          company_name: companyData.company_name,
          name: companyData.company_name,
          company_type: companyData.company_type,
          status: companyData.status,
          district: companyData.district,
        }
        setRole('company')
        setProfile(compProfile)
        return { role: 'company', profile: compProfile }
      }
    } catch (fallbackErr) {
      console.warn('Fallback role check encountered error:', fallbackErr)
    }

    setRole(null)
    setProfile(null)
    return { role: null, profile: null }
  }, [])

  // Check for pending worker activation in sessionStorage (Google OAuth flow)
  const checkPendingWorkerActivation = useCallback(async (currentUserId) => {
    if (!currentUserId || !isSupabaseConfigured) return
    try {
      const stored = sessionStorage.getItem('catercrew_pending_worker')
      if (stored) {
        const { code, phone } = JSON.parse(stored)
        if (code && phone) {
          const { error: actErr } = await supabase.rpc('activate_worker', {
            code: code.trim(),
            phone: phone.trim(),
          })
          if (!actErr) {
            sessionStorage.removeItem('catercrew_pending_worker')
          }
        }
      }
    } catch (e) {
      console.warn('Error activating pending worker:', e)
    }
  }, [])

  // Initial load
  useEffect(() => {
    let mounted = true

    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return
      setSession(initialSession)
      setUser(initialSession?.user ?? null)

      if (initialSession?.user) {
        await checkPendingWorkerActivation(initialSession.user.id)
        await fetchUserRole(initialSession.user.id)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!mounted) return
      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        await checkPendingWorkerActivation(currentSession.user.id)
        await fetchUserRole(currentSession.user.id)
      } else {
        setRole(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchUserRole, checkPendingWorkerActivation])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      return await fetchUserRole(user.id)
    }
    return { role: null, profile: null }
  }, [user, fetchUserRole])

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    setSession(null)
    setUser(null)
    setRole(null)
    setProfile(null)
  }, [])

  const isCompany = role === 'company'
  const isWorker = role === 'worker'
  const isAdmin = role === 'admin'

  const companyProfile =
    role === 'company' && profile
      ? {
          ...profile,
          id: profile.id || profile.company_id,
          company_id: profile.company_id || profile.id,
        }
      : null

  const workerProfile =
    role === 'worker' && profile
      ? {
          ...profile,
          id: profile.id || profile.worker_id,
          worker_id: profile.worker_id || profile.id,
        }
      : null

  const value = {
    session,
    user,
    role,
    profile,
    isCompany,
    isWorker,
    isAdmin,
    companyProfile,
    workerProfile,
    loading,
    refreshProfile,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
