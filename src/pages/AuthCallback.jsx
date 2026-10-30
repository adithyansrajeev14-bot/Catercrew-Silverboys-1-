import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ChefHatLogo from '../components/ChefHatLogo'
import { AlertCircle } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { refreshProfile, activatePendingWorker } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const processAuth = async () => {
      try {
        // Inspect query and hash params for OAuth provider errors
        const urlParams = new URLSearchParams(window.location.search)
        const hashStr = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash
        const hashParams = new URLSearchParams(hashStr)

        const errorDesc =
          urlParams.get('error_description') ||
          hashParams.get('error_description') ||
          urlParams.get('error') ||
          hashParams.get('error')

        if (errorDesc) {
          throw new Error(decodeURIComponent(errorDesc))
        }

        // 1. If PKCE code is provided in query params, exchange it
        const code = urlParams.get('code')
        if (code) {
          try {
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
            if (exchangeError) {
              console.warn('PKCE exchangeCodeForSession warning:', exchangeError)
            } else if (exchangeData?.user && mounted) {
              await handleUserSession(exchangeData.user)
              return
            }
          } catch (codeErr) {
            console.warn('exchangeCodeForSession exception:', codeErr)
          }
        }

        // 2. If access_token is in hash, try setting session explicitly if not yet established
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        if (accessToken) {
          try {
            const { data: setSessionData, error: setSessionErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })
            if (!setSessionErr && setSessionData?.user && mounted) {
              await handleUserSession(setSessionData.user)
              return
            }
          } catch (setErr) {
            console.warn('setSession exception:', setErr)
          }
        }

        // 3. Check existing active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (!session?.user) {
          // If no session immediately, listen for auth state changes
          const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            if (newSession?.user && mounted) {
              authListener?.subscription?.unsubscribe?.()
              await handleUserSession(newSession.user)
            }
          })

          // Timeout fallback after 6 seconds
          setTimeout(() => {
            if (mounted && !session?.user) {
              setError('Session could not be established. Please try logging in again.')
            }
          }, 6000)
          return
        }

        if (mounted) {
          await handleUserSession(session.user)
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        if (mounted) {
          setError(err.message || 'Error processing authentication.')
        }
      }
    }

    const handleUserSession = async (user) => {
      try {
        // Check if there was a pending catering boy activation in sessionStorage
        const pendingWorkerStr = sessionStorage.getItem('catercrew_pending_worker')
        if (pendingWorkerStr) {
          try {
            await activatePendingWorker(user)
          } catch (actErr) {
            console.error('Error activating worker from session:', actErr)
          }
        }

        // Load profile and role
        const { role } = await refreshProfile(user)

        if (!mounted) return

        if (role === 'worker') {
          navigate('/events', { replace: true })
        } else if (role === 'company') {
          navigate('/company/dashboard', { replace: true })
        } else if (role === 'admin') {
          navigate('/adminaccess', { replace: true })
        } else {
          // Check if user came from company signup flow
          const intendedRole = sessionStorage.getItem('catercrew_signup_role')
          sessionStorage.removeItem('catercrew_signup_role')

          if (intendedRole === 'company') {
            navigate('/company/setup', { replace: true })
          } else {
            navigate('/signup', { replace: true })
          }
        }
      } catch (err) {
        console.error('Error handling user session:', err)
        if (mounted) {
          setError(err.message || 'Error configuring user session.')
        }
      }
    }

    processAuth()

    return () => {
      mounted = false
    }
  }, [navigate, refreshProfile, activatePendingWorker])

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        {error ? (
          <div>
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl text-sm transition-colors cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div>
            <ChefHatLogo className="w-12 h-12 text-emerald-600 mx-auto animate-bounce mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Finalizing Authentication...</h2>
            <p className="text-xs text-gray-500">Connecting your CaterCrew profile</p>
          </div>
        )}
      </div>
    </div>
  )
}
