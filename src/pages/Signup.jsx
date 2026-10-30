import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  Building2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()

  // Selected flow: null (choice), 'worker', or 'company'
  const [selectedFlow, setSelectedFlow] = useState(null)

  // Worker Form State
  const [workerCode, setWorkerCode] = useState('')
  const [workerPhone, setWorkerPhone] = useState('')
  const [checkingWorker, setCheckingWorker] = useState(false)
  const [workerEligibility, setWorkerEligibility] = useState(null) // 'not_found' | 'pending' | 'verified' | 'suspended' | 'already_linked'
  const [workerError, setWorkerError] = useState('')

  // Worker Auth Account Creation (after verified check)
  const [workerEmail, setWorkerEmail] = useState('')
  const [workerPassword, setWorkerPassword] = useState('')
  const [workerAuthLoading, setWorkerAuthLoading] = useState(false)
  const [workerAuthError, setWorkerAuthError] = useState('')

  // Company Auth Account Creation
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPassword, setCompanyPassword] = useState('')
  const [companyAuthLoading, setCompanyAuthLoading] = useState(false)
  const [companyAuthError, setCompanyAuthError] = useState('')

  // Google OAuth initiation
  const handleGoogleSignIn = async (flowType) => {
    if (!isSupabaseConfigured) {
      alert('Supabase is not configured yet. Please add your credentials.')
      return
    }

    if (flowType === 'worker') {
      if (!workerCode || !workerPhone) {
        setWorkerError('Please enter your CaterCrew ID and registered phone first.')
        return
      }
      // Save worker verification credentials in sessionStorage across OAuth redirect
      sessionStorage.setItem(
        'catercrew_pending_worker',
        JSON.stringify({ code: workerCode.trim().toUpperCase(), phone: workerPhone.trim() })
      )
    } else if (flowType === 'company') {
      sessionStorage.setItem('catercrew_intent', 'company')
    }

    const redirectOrigin = window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${redirectOrigin}/auth/callback`,
      },
    })

    if (error) {
      if (flowType === 'worker') setWorkerAuthError(error.message)
      else setCompanyAuthError(error.message)
    }
  }

  // Step 1: Check Worker Eligibility
  const handleCheckEligibility = async (e) => {
    e.preventDefault()
    setWorkerError('')
    setWorkerEligibility(null)

    const cleanCode = workerCode.trim().toUpperCase()
    const cleanPhone = workerPhone.replace(/\D/g, '')

    if (!cleanCode) {
      setWorkerError('Please enter your CaterCrew ID (e.g. CC-SLV-000001).')
      return
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      setWorkerError('Please enter your valid 10-digit registered phone number.')
      return
    }

    setCheckingWorker(true)

    try {
      if (!isSupabaseConfigured) {
        // Prototype simulation mode
        if (cleanCode.includes('SLV')) {
          setWorkerEligibility('verified')
        } else {
          setWorkerEligibility('not_found')
        }
        return
      }

      // Call security definer RPC
      const { data, error } = await supabase.rpc('check_worker_eligibility', {
        code: cleanCode,
        phone: cleanPhone,
      })

      if (error) {
        console.warn('RPC check_worker_eligibility error, fallback to table check:', error)
        // Fallback check
        const { data: wData } = await supabase
          .from('workers')
          .select('id, status, user_id, phone, worker_code')
          .ilike('worker_code', cleanCode)
          .maybeSingle()

        if (!wData) {
          setWorkerEligibility('not_found')
        } else {
          const dbPhone = (wData.phone || '').replace(/\D/g, '').slice(-10)
          const inputPhone = cleanPhone.slice(-10)
          if (dbPhone !== inputPhone) {
            setWorkerEligibility('not_found')
          } else if (wData.user_id) {
            setWorkerEligibility('already_linked')
          } else {
            setWorkerEligibility(wData.status || 'not_found')
          }
        }
      } else {
        setWorkerEligibility(data || 'not_found')
      }
    } catch (err) {
      console.error('Error checking eligibility:', err)
      setWorkerError(err.message || 'Unable to verify registration at this time.')
    } finally {
      setCheckingWorker(false)
    }
  }

  // Step 2: Create Worker Account with Email & Password
  const handleWorkerEmailSignup = async (e) => {
    e.preventDefault()
    setWorkerAuthError('')

    if (!workerEmail.trim() || !workerPassword) {
      setWorkerAuthError('Please enter both email and password.')
      return
    }
    if (workerPassword.length < 6) {
      setWorkerAuthError('Password must be at least 6 characters long.')
      return
    }

    setWorkerAuthLoading(true)

    try {
      const { data: authData, error: signupErr } = await supabase.auth.signUp({
        email: workerEmail.trim(),
        password: workerPassword,
      })

      if (signupErr) throw signupErr

      if (authData.user) {
        // Activate worker via RPC
        const { error: actErr } = await supabase.rpc('activate_worker', {
          code: workerCode.trim().toUpperCase(),
          phone: workerPhone.trim(),
        })

        if (actErr) {
          console.warn('activate_worker error:', actErr)
          // Fallback direct link
          await supabase
            .from('workers')
            .update({ user_id: authData.user.id })
            .ilike('worker_code', workerCode.trim().toUpperCase())
        }

        await refreshProfile()
        navigate('/events')
      } else {
        setWorkerAuthError('Please check your email inbox to confirm your account, then log in.')
      }
    } catch (err) {
      console.error('Worker signup error:', err)
      setWorkerAuthError(err.message || 'Failed to create worker account.')
    } finally {
      setWorkerAuthLoading(false)
    }
  }

  // Step 3: Create Company Account with Email & Password
  const handleCompanyEmailSignup = async (e) => {
    e.preventDefault()
    setCompanyAuthError('')

    if (!companyEmail.trim() || !companyPassword) {
      setCompanyAuthError('Please enter both email and password.')
      return
    }
    if (companyPassword.length < 6) {
      setCompanyAuthError('Password must be at least 6 characters long.')
      return
    }

    setCompanyAuthLoading(true)

    try {
      const { data: authData, error: signupErr } = await supabase.auth.signUp({
        email: companyEmail.trim(),
        password: companyPassword,
      })

      if (signupErr) throw signupErr

      if (authData.user) {
        await refreshProfile()
        navigate('/company/setup')
      } else {
        setCompanyAuthError('Please check your email to confirm your account, then log in to complete company setup.')
      }
    } catch (err) {
      console.error('Company signup error:', err)
      setCompanyAuthError(err.message || 'Failed to create company account.')
    } finally {
      setCompanyAuthLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20 text-center">
      {/* Page Header */}
      <div className="mb-8 sm:mb-12">
        <span className="inline-block bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full mb-3 border border-emerald-200/80">
          CaterCrew Account Creation
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Join CaterCrew
        </h1>
        <p className="mt-3 text-base sm:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
          Choose how you want to use CaterCrew to get started.
        </p>
      </div>

      {/* Main Choice Cards (when neither is chosen yet) */}
      {!selectedFlow && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
          {/* Card 1: Catering Boy */}
          <div
            onClick={() => setSelectedFlow('worker')}
            className="p-8 rounded-3xl border-2 border-emerald-100 hover:border-emerald-500 bg-white shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <User className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                I am a Catering Boy
              </h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                I want to find catering gigs across Kerala, view wages in advance, and book event slots directly.
              </p>
              <ul className="mt-5 space-y-2 text-xs font-medium text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Browse high-paying catering events</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Instant slot booking for verified boys</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Guaranteed payment transparency</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-emerald-700 font-bold text-sm">
              <span>Sign up with CaterCrew ID</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Event Company */}
          <div
            onClick={() => setSelectedFlow('company')}
            className="p-8 rounded-3xl border-2 border-emerald-100 hover:border-emerald-500 bg-white shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                I am an Event Company
              </h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                I manage catering, weddings, or corporate events and need verified, uniform-ready catering boys.
              </p>
              <ul className="mt-5 space-y-2 text-xs font-medium text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Post events with custom requirements</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified boys with photos & background vetting</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Direct phone & WhatsApp contact on booking</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-emerald-700 font-bold text-sm">
              <span>Register Company</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOW A: CATERING BOY SIGNUP */}
      {/* ========================================================================= */}
      {selectedFlow === 'worker' && (
        <div className="max-w-xl mx-auto text-left animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={() => {
              setSelectedFlow(null)
              setWorkerEligibility(null)
              setWorkerError('')
            }}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 mb-4 inline-flex items-center gap-1 cursor-pointer"
          >
            ← Back to account type choice
          </button>

          <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Catering Boy Account Setup
                </h2>
                <p className="text-xs text-gray-500">
                  Link your verified CaterCrew Silver Boy registration
                </p>
              </div>
            </div>

            {/* STEP A1: Check Eligibility Form */}
            {workerEligibility !== 'verified' && (
              <form onSubmit={handleCheckEligibility} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Your CaterCrew ID <span className="text-emerald-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={workerCode}
                    onChange={(e) => {
                      setWorkerCode(e.target.value.toUpperCase())
                      setWorkerError('')
                    }}
                    placeholder="e.g. CC-SLV-000001"
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-base font-mono uppercase tracking-wider"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Found on your certificate or status check confirmation screen.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Registered Phone Number <span className="text-emerald-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={workerPhone}
                    onChange={(e) => {
                      setWorkerPhone(e.target.value)
                      setWorkerError('')
                    }}
                    placeholder="10-digit mobile number"
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-base"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    The mobile phone number you entered during Silver Boy registration.
                  </p>
                </div>

                {workerError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{workerError}</span>
                  </div>
                )}

                {/* ELIGIBILITY STATUS RESPONSES */}
                {workerEligibility === 'not_found' && (
                  <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      We couldn&apos;t find a registration with these details
                    </h3>
                    <p className="text-xs text-gray-600 max-w-sm mx-auto">
                      Please check the ID and phone number, or register first if you haven&apos;t submitted your profile yet.
                    </p>
                    <Link
                      to="/register"
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-xs"
                    >
                      <span>Register as Silver Boy first</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {workerEligibility === 'pending' && (
                  <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      Your registration is still under verification
                    </h3>
                    <p className="text-xs text-gray-600 max-w-sm mx-auto">
                      Our verification team reviews every profile. You will be able to create an account and book slots once your ID is verified.
                    </p>
                    <Link
                      to={`/status/${encodeURIComponent(workerCode.trim())}`}
                      className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold text-xs"
                    >
                      <span>Check verification status</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {workerEligibility === 'suspended' && (
                  <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      This account is suspended
                    </h3>
                    <p className="text-xs text-gray-600">
                      Please contact CaterCrew support at support@catercrew.online for assistance.
                    </p>
                  </div>
                )}

                {workerEligibility === 'already_linked' && (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      This ID already has an account
                    </h3>
                    <p className="text-xs text-gray-600">
                      Your CaterCrew ID is already linked to a login. Please sign in with your email or Google account.
                    </p>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-xs"
                    >
                      <span>Go to Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={checkingWorker}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {checkingWorker ? (
                    <span>Checking registration...</span>
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP A2: Registration Verified! Choose Google or Email */}
            {workerEligibility === 'verified' && (
              <div className="space-y-6">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-950">
                      Registration Verified: {workerCode}
                    </p>
                    <p className="text-xs text-emerald-800">
                      Create your login credentials to start booking event slots.
                    </p>
                  </div>
                </div>

                {/* Google Sign In Button */}
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn('worker')}
                  className="w-full bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-800 font-bold py-3.5 px-4 rounded-2xl text-sm transition-colors flex items-center justify-center gap-3 cursor-pointer shadow-2xs"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-gray-200 w-full" />
                  <span className="bg-white px-3 text-xs text-gray-400 font-semibold uppercase tracking-wider absolute">
                    Or sign up with email
                  </span>
                </div>

                {/* Email + Password Form */}
                <form onSubmit={handleWorkerEmailSignup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={workerEmail}
                        onChange={(e) => setWorkerEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-600 focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Create Password (min. 6 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={workerPassword}
                        onChange={(e) => setWorkerPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-600 focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  {workerAuthError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                      {workerAuthError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={workerAuthLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {workerAuthLoading ? 'Creating account...' : 'Create Worker Account'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOW B: EVENT COMPANY SIGNUP */}
      {/* ========================================================================= */}
      {selectedFlow === 'company' && (
        <div className="max-w-xl mx-auto text-left animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={() => {
              setSelectedFlow(null)
              setCompanyAuthError('')
            }}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 mb-4 inline-flex items-center gap-1 cursor-pointer"
          >
            ← Back to account type choice
          </button>

          <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Event Company Registration
                </h2>
                <p className="text-xs text-gray-500">
                  Step 1 of 2: Create your login credentials
                </p>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={() => handleGoogleSignIn('company')}
              className="w-full bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-800 font-bold py-3.5 px-4 rounded-2xl text-sm transition-colors flex items-center justify-center gap-3 cursor-pointer shadow-2xs"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-gray-200 w-full" />
              <span className="bg-white px-3 text-xs text-gray-400 font-semibold uppercase tracking-wider absolute">
                Or sign up with email
              </span>
            </div>

            {/* Email + Password Form */}
            <form onSubmit={handleCompanyEmailSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Company Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="events@company.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-600 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Create Password (min. 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={companyPassword}
                    onChange={(e) => setCompanyPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-600 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {companyAuthError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {companyAuthError}
                </div>
              )}

              <button
                type="submit"
                disabled={companyAuthLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {companyAuthLoading ? 'Creating account...' : 'Continue to Company Profile Setup →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Already have an account footer */}
      <p className="mt-8 text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-700 font-bold hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  )
}
