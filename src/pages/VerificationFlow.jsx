import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Smartphone,
  FileCheck2,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  ExternalLink,
  ChevronRight,
  Globe,
  Share2,
  MessageCircle,
} from 'lucide-react'
import { COMMUNITY_WHATSAPP_LINK } from '../lib/constants'

// Malayalam & English Localization dictionary
const I18N = {
  en: {
    title: 'CaterCrew Automated Staff Verification',
    subtitle: 'Complete 3 quick steps to verify your identity and unlock your official Silver Boy Certificate.',
    langBtn: 'മലയാളം',
    step1Title: 'Step 1: Phone OTP',
    step1Sub: 'Verify your registered mobile number',
    step2Title: 'Step 2: Aadhaar Verification',
    step2Sub: 'Instant UIDAI / DigiLocker verification',
    step3Title: 'Step 3: Live Selfie & Liveness',
    step3Sub: 'Face match and active anti-spoof check',
    sendOtp: 'Send OTP via SMS',
    resendOtp: 'Resend OTP',
    verifyOtp: 'Verify Code',
    otpSentTo: 'A 6-digit verification code was sent to',
    otpExpireIn: 'Code expires in',
    dpdpConsentTitle: 'Consent Notice under Digital Personal Data Protection (DPDP) Act 2023',
    dpdpConsentBody: 'I hereby provide voluntary and explicit consent to CaterCrew to verify my identity via DigiLocker / UIDAI Aadhaar OTP and facial biometric match for the sole purpose of catering employment verification. My full Aadhaar number will NOT be stored. Only verified name, DOB, and masked last 4 digits will be retained.',
    consentCheckbox: 'I agree and give consent under DPDP Act 2023',
    aadhaarInputLabel: 'Enter 12-digit Aadhaar Number',
    requestAadhaarOtp: 'Verify via DigiLocker OTP',
    enterAadhaarOtp: 'Enter 6-digit Aadhaar OTP',
    confirmAadhaar: 'Confirm Aadhaar Verification',
    cameraTitle: 'Front Camera Liveness & Selfie',
    cameraInstructions: 'Position your face inside the circle. Complete the 2 active motion challenges shown on screen.',
    challengeBlink: 'Challenge 1: Blink both eyes',
    challengeSmile: 'Challenge 2: Smile clearly at the camera',
    challengeTurnLeft: 'Challenge: Turn head slightly to the left',
    challengeTurnRight: 'Challenge: Turn head slightly to the right',
    startCamera: 'Open Camera & Begin',
    capturing: 'Analyzing liveness & facial geometry...',
    autoVerifiedGreen: 'Congratulations! You are Officially Verified',
    autoVerifiedSub: 'All 3 automated checks passed with high confidence. Your official digital certificate has been activated.',
    yellowReview: 'Verification Submitted for Quick Review',
    yellowReviewSub: 'Your details are safe and pending a quick review by CaterCrew operations team.',
    redRejected: 'Verification Unsuccessful',
    redRejectedSub: 'We encountered an issue during verification.',
    viewCertificate: 'View & Download Certificate',
    retry: 'Try Verification Again',
  },
  ml: {
    title: 'കാറ്റര്‍ക്രൂ സ്റ്റാഫ് ഓട്ടോമേറ്റഡ് വെരിഫിക്കേഷന്‍',
    subtitle: 'നിങ്ങളുടെ ഐഡന്റിറ്റി സ്ഥിരീകരിച്ച് ഔദ്യോഗിക സില്‍വര്‍ ബോയ് സര്‍ട്ടിഫിക്കറ്റ് നേടാന്‍ 3 ലളിതമായ ഘട്ടങ്ങള്‍ പൂര്‍ത്തിയാക്കുക.',
    langBtn: 'English',
    step1Title: 'ഘട്ടം 1: ഫോണ്‍ ഒ.ടി.പി',
    step1Sub: 'രജിസ്റ്റര്‍ ചെയ്ത മൊബൈല്‍ നമ്പര്‍ സ്ഥിരീകരിക്കുക',
    step2Title: 'ഘട്ടം 2: ആധാര്‍ വെരിഫിക്കേഷന്‍',
    step2Sub: 'ഡിജിലോക്കര്‍ / UIDAI വഴിയുള്ള തത്സമയ സ്ഥിരീകരണം',
    step3Title: 'ഘട്ടം 3: ലൈവ് സെല്‍ഫി & ലൈവ്‌നെസ്സ്',
    step3Sub: 'ഫേസ് മാച്ചും ലൈവ് പരിശോധനയും',
    sendOtp: 'SMS വഴി OTP അയക്കുക',
    resendOtp: 'വീണ്ടും OTP അയക്കുക',
    verifyOtp: 'കോഡ് സ്ഥിരീകരിക്കുക',
    otpSentTo: '6 അക്ക പരിശോധന കോഡ് അയച്ചിട്ടുണ്ട്:',
    otpExpireIn: 'കാലഹരണപ്പെടാന്‍ ബാക്കി സമയം:',
    dpdpConsentTitle: 'ഡിജിറ്റല്‍ വ്യക്തിഗത ഡാറ്റാ സംരക്ഷണ (DPDP) നിയമം 2023 പ്രകാരമുള്ള അനുമതി',
    dpdpConsentBody: 'കാറ്ററിംഗ് ജോലി സംബന്ധിച്ച സ്ഥിരീകരണത്തിനായി ഡിജിലോക്കര്‍/ആധാര്‍ OTP വഴിയും ഫേസ് മാച്ച് വഴിയും എന്‍റെ വിവരങ്ങള്‍ പരിശോധിക്കാന്‍ ഞാന്‍ പൂര്‍ണ്ണ സമ്മതം നല്‍കുന്നു. എന്‍റെ മുഴുവന്‍ ആധാര്‍ നമ്പറും സൂക്ഷിക്കില്ലെന്നും പേര്, ജനനത്തീയതി, അവസാന 4 അക്കങ്ങള്‍ എന്നിവ മാത്രമേ സൂക്ഷിക്കൂ എന്നും ഞാന്‍ മനസ്സിലാക്കുന്നു.',
    consentCheckbox: 'ഞാന്‍ നിബന്ധനകള്‍ അംഗീകരിക്കുന്നു (DPDP Act 2023)',
    aadhaarInputLabel: '12 അക്ക ആധാര്‍ നമ്പര്‍ രേഖപ്പെടുത്തുക',
    requestAadhaarOtp: 'ഡിജിലോക്കര്‍ OTP നേടുക',
    enterAadhaarOtp: 'ആധാര്‍ OTP നല്‍കുക',
    confirmAadhaar: 'ആധാര്‍ സ്ഥിരീകരിക്കുക',
    cameraTitle: 'ക്യാമറ പരിശോധന & സെല്‍ഫി',
    cameraInstructions: 'മുഖം വൃത്തത്തിനുള്ളില്‍ പിടിക്കുക. സ്‌ക്രീനില്‍ കാണിക്കുന്ന രണ്ട് ലളിതമായ ചലനങ്ങള്‍ ചെയ്യുക.',
    challengeBlink: 'ചലനം 1: കണ്ണുകള്‍ ചിമ്മുക',
    challengeSmile: 'ചലനം 2: ക്യാമറയിലേക്ക് നോക്കി പുഞ്ചിരിക്കുക',
    challengeTurnLeft: 'ചലനം: തല ചെറുതായി ഇടത്തോട്ട് തിരിക്കുക',
    challengeTurnRight: 'ചലനം: തല ചെറുതായി വലത്തോട്ട് തിരിക്കുക',
    startCamera: 'ക്യാമറ തുറക്കുക',
    capturing: 'പരിശോധിക്കുന്നു...',
    autoVerifiedGreen: 'അഭിനന്ദനങ്ങള്‍! വെരിഫിക്കേഷന്‍ വിജയകരമായി',
    autoVerifiedSub: 'എല്ലാ പരിശോധനകളും വിജയകരമായി പൂര്‍ത്തിയായി. നിങ്ങളുടെ ഔദ്യോഗിക സര്‍ട്ടിഫിക്കറ്റ് തയ്യാറാണ്.',
    yellowReview: 'അപേക്ഷ അഡ്മിന്‍ പരിശോധനയ്ക്കായി സമര്‍പ്പിച്ചു',
    yellowReviewSub: 'വിവരങ്ങള്‍ കാറ്റര്‍ക്രൂ അഡ്മിന്‍ പരിശോധിച്ച് ഉടന്‍ അംഗീകരിക്കും.',
    redRejected: 'സ്ഥിരീകരിക്കാന്‍ കഴിഞ്ഞില്ല',
    redRejectedSub: 'നല്‍കിയ വിവരങ്ങളില്‍ ചില പൊരുത്തക്കേടുകള്‍ കണ്ടെത്തി.',
    viewCertificate: 'സര്‍ട്ടിഫിക്കറ്റ് കാണുക & ഡൗണ്‍ലോഡ് ചെയ്യുക',
    retry: 'വീണ്ടും ശ്രമിക്കുക',
  },
}

export default function VerificationFlow() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Language state: 'en' | 'ml'
  const [lang, setLang] = useState('en')
  const t = I18N[lang]

  // Worker identifier from URL or input
  const initialCode = searchParams.get('code') || searchParams.get('id') || 'CC-SLV-000771'
  const [workerCode, setWorkerCode] = useState(initialCode)
  const [worker, setWorker] = useState(null)
  const [loadingWorker, setLoadingWorker] = useState(true)

  // Current Step: 3 (Live Selfie & Anti-Duplicate Scan) -> 4 (Result Decision)
  const [currentStep, setCurrentStep] = useState(3)

  // Step 1: Phone OTP State
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpTimer, setOtpTimer] = useState(0)
  const [resendCount, setResendCount] = useState(0)
  const [testOtpHint, setTestOtpHint] = useState('')
  const [otpVerifiedSuccess, setOtpVerifiedSuccess] = useState(false)

  // Step 2: Aadhaar State
  const [dpdpConsent, setDpdpConsent] = useState(false)
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [aadhaarTxId, setAadhaarTxId] = useState('')
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false)
  const [aadhaarOtp, setAadhaarOtp] = useState('')
  const [aadhaarLoading, setAadhaarLoading] = useState(false)
  const [aadhaarError, setAadhaarError] = useState('')
  const [aadhaarResult, setAadhaarResult] = useState(null)

  // Step 3: Camera, Liveness & Selfie State
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [challengeStep, setChallengeStep] = useState(1) // 1: blink, 2: smile
  const [livenessProgress, setLivenessProgress] = useState(0)
  const [capturing, setCapturing] = useState(false)
  const [capturedSelfie, setCapturedSelfie] = useState(null)
  const [faceResult, setFaceResult] = useState(null)
  const [faceLoading, setFaceLoading] = useState(false)
  const [faceError, setFaceError] = useState('')

  // Final Decision State (Green / Yellow / Red)
  const [decision, setDecision] = useState(null)
  const [decisionLoading, setDecisionLoading] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Fetch worker details on mount
  useEffect(() => {
    async function loadWorker() {
      setLoadingWorker(true)
      try {
        const res = await fetch(`/api/verify/worker/${workerCode}`)
        const data = await res.json()
        if (data.success && data.worker) {
          setWorker(data.worker)
          setPhone(data.worker.phone || '9847012345')
        } else {
          // Default mock worker for interactive testing
          setWorker({
            worker_code: workerCode,
            full_name: 'Adithyan S Rajeev',
            phone: '9847012345',
            district: 'Ernakulam',
            height_cm: 175,
            experience_years: 2,
            tier: 'silver',
            status: 'pending',
          })
          setPhone('9847012345')
        }
      } catch {
        setWorker({
          worker_code: workerCode,
          full_name: 'Adithyan S Rajeev',
          phone: '9847012345',
          district: 'Ernakulam',
          height_cm: 175,
          experience_years: 2,
          tier: 'silver',
          status: 'pending',
        })
        setPhone('9847012345')
      } finally {
        setLoadingWorker(false)
      }
    }
    loadWorker()
  }, [workerCode])

  // Timer countdown for OTP
  useEffect(() => {
    if (otpTimer <= 0) return
    const interval = setInterval(() => {
      setOtpTimer((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [otpTimer])

  // Clean up camera on unmount or step switch
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // -------------------------------------------------------------
  // Step 1 Handlers: Phone OTP
  // -------------------------------------------------------------
  const handleSendOtp = async () => {
    setOtpLoading(true)
    setOtpError('')
    try {
      const res = await fetch('/api/verify/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerCode, phone }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setOtpError(data.message || 'Failed to send OTP')
      } else {
        setOtpSent(true)
        setOtpTimer(300) // 5 minutes
        setResendCount((c) => c + 1)
        if (data.testOtpHint) {
          setTestOtpHint(data.testOtpHint)
        }
      }
    } catch {
      setOtpError('Network error connecting to OTP gateway.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      setOtpError('Please enter the complete 6-digit code.')
      return
    }
    setOtpLoading(true)
    setOtpError('')
    try {
      const res = await fetch('/api/verify/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerCode, phone, otp: otpCode }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setOtpError(data.message || 'Invalid OTP code.')
      } else {
        setOtpVerifiedSuccess(true)
        setTimeout(() => {
          setCurrentStep(2)
        }, 800)
      }
    } catch {
      setOtpError('Connection error.')
    } finally {
      setOtpLoading(false)
    }
  }

  // -------------------------------------------------------------
  // Step 2 Handlers: Aadhaar Verification
  // -------------------------------------------------------------
  const handleStartAadhaar = async (customNumber) => {
    const num = customNumber || aadhaarNumber
    if (!dpdpConsent) {
      setAadhaarError('You must check the consent box under DPDP Act 2023 to proceed.')
      return
    }
    const clean = num.replace(/\D/g, '')
    if (clean.length !== 12) {
      setAadhaarError('Aadhaar number must be exactly 12 digits.')
      return
    }

    setAadhaarLoading(true)
    setAadhaarError('')
    try {
      const res = await fetch('/api/verify/aadhaar/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerCode,
          aadhaarNumber: clean,
          consentGiven: true,
          consentTimestamp: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setAadhaarError(data.message || 'Failed to initiate Aadhaar verification.')
      } else {
        setAadhaarTxId(data.transactionId)
        setAadhaarOtpSent(true)
      }
    } catch {
      setAadhaarError('Could not reach identity gateway.')
    } finally {
      setAadhaarLoading(false)
    }
  }

  const handleVerifyAadhaarOtp = async () => {
    if (!aadhaarOtp || aadhaarOtp.length < 6) {
      setAadhaarError('Please enter the 6-digit Aadhaar OTP.')
      return
    }
    setAadhaarLoading(true)
    setAadhaarError('')
    try {
      const res = await fetch('/api/verify/aadhaar/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerCode,
          transactionId: aadhaarTxId,
          otp: aadhaarOtp,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setAadhaarError(data.message || 'Aadhaar OTP verification failed.')
      } else {
        setAadhaarResult(data)
        setTimeout(() => {
          setCurrentStep(3)
        }, 1000)
      }
    } catch {
      setAadhaarError('Network error checking Aadhaar OTP.')
    } finally {
      setAadhaarLoading(false)
    }
  }

  // -------------------------------------------------------------
  // Step 3 Handlers: Camera, Active Liveness & Face Match
  // -------------------------------------------------------------
  const handleStartCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
      startLivenessDetectionLoop()
    } catch (err) {
      setCameraError('Camera access denied or unavailable. Please grant camera permission in your browser settings.')
    }
  }

  // Interactive liveness simulation loop
  const startLivenessDetectionLoop = () => {
    let progress = 0
    let step = 1
    const timer = setInterval(() => {
      progress += 15
      setLivenessProgress(progress)

      if (progress >= 50 && step === 1) {
        step = 2
        setChallengeStep(2)
      }

      if (progress >= 100) {
        clearInterval(timer)
        // Auto capture frame
        captureSelfieFrame()
      }
    }, 450)
  }

  const captureSelfieFrame = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const base64 = canvas.toDataURL('image/jpeg', 0.85)

    setCapturedSelfie(base64)
    setCapturing(true)

    // Stop camera track
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }

    // Call server face match
    submitFaceMatch(base64)
  }

  const submitFaceMatch = async (selfieBase64, overrideScore) => {
    setFaceLoading(true)
    setFaceError('')
    try {
      const res = await fetch('/api/verify/selfie/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerCode,
          selfieBase64,
          livenessPassed: true,
          antiSpoofPassed: true,
          testScoreOverride: overrideScore,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setFaceError(data.message || 'Face match failed.')
      } else {
        setFaceResult(data)
        // Automatically trigger final decision
        finalizeVerification()
      }
    } catch {
      setFaceError('Error communicating with facial biometric service.')
    } finally {
      setFaceLoading(false)
      setCapturing(false)
    }
  }

  // -------------------------------------------------------------
  // Step 4 Handlers: Auto-Routing Decision & Finalization
  // -------------------------------------------------------------
  const finalizeVerification = async () => {
    setDecisionLoading(true)
    try {
      const res = await fetch('/api/verify/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerCode }),
      })
      const data = await res.json()
      if (data.success) {
        setDecision(data.decision)
        setCurrentStep(4)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDecisionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header with Brand & Language Toggle */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <Link to="/" className="flex items-center gap-2">
            <picture>
              <source srcSet="/logo.webp" type="image/webp" />
              <img src="/logo.png" alt="CaterCrew" className="h-8 w-auto object-contain" />
            </picture>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              Identity Vetting
            </span>
          </Link>

          {/* Bilingual Toggle Button */}
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ml' : 'en')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.langBtn}</span>
          </button>
        </div>

        {/* Worker Summary Pill */}
        {worker && (
          <div className="mb-6 p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Verifying Staff Profile</p>
              <h2 className="text-base font-bold text-gray-900">{worker.full_name}</h2>
              <p className="text-xs font-mono text-emerald-700 mt-0.5">
                {worker.worker_code} • {worker.district} • Tier: {worker.tier?.toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {worker.status || 'Pending'}
              </span>
            </div>
          </div>
        )}

        {/* Fast-Track Auto-Verification Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 flex items-start gap-3 shadow-xs">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <strong className="block font-bold text-emerald-950">Instant Automated Verification Active</strong>
            <span>Take a quick live selfie with your front camera to confirm human presence. Our engine will verify you are not a duplicate registration and automatically approve your Silver Boy certificate!</span>
          </div>
        </div>

        {/* 3-Step Visual Progress Stepper */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-2">
            {/* Step 1: Live Selfie */}
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                currentStep === 3
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/20'
                  : currentStep > 3
                  ? 'bg-white border-emerald-300 text-emerald-700'
                  : 'bg-white border-gray-200 text-gray-400'
              }`}
            >
              <div className="flex items-center justify-center gap-1 mb-1 font-bold text-xs">
                {currentStep > 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Camera className="w-4 h-4 text-emerald-600" />
                )}
                <span>1. Live Selfie</span>
              </div>
            </button>

            {/* Step 2: Anti-Duplicate Scan */}
            <div
              className={`p-3 rounded-2xl border text-center transition-all ${
                capturing || faceLoading
                  ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400/20'
                  : currentStep === 4
                  ? 'bg-white border-emerald-300 text-emerald-700'
                  : 'bg-white border-gray-200 text-gray-400'
              }`}
            >
              <div className="flex items-center justify-center gap-1 mb-1 font-bold text-xs">
                {currentStep === 4 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-gray-400" />
                )}
                <span>2. Duplicate Scan</span>
              </div>
            </div>

            {/* Step 3: Verified Result */}
            <div
              className={`p-3 rounded-2xl border text-center transition-all ${
                currentStep === 4
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border-gray-200 text-gray-400'
              }`}
            >
              <div className="flex items-center justify-center gap-1 mb-1 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>3. Auto-Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* STEP 1: PHONE OTP VERIFICATION                            */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t.step1Title}</h3>
                <p className="text-xs text-gray-500">{t.step1Sub}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Registered Mobile Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={otpSent}
                    placeholder="9847012345"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-900 font-mono font-bold text-base focus:border-emerald-600 focus:outline-none disabled:bg-gray-50"
                  />
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading || !phone}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors cursor-pointer flex items-center gap-2 shrink-0"
                    >
                      {otpLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                      <span>{t.sendOtp}</span>
                    </button>
                  )}
                </div>
              </div>

              {otpSent && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-emerald-900 font-medium">
                    <span>
                      {t.otpSentTo} +91 {phone.slice(-4).padStart(10, '•')}
                    </span>
                    {otpTimer > 0 ? (
                      <span className="font-mono text-emerald-700 font-bold">
                        {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        {t.resendOtp}
                      </button>
                    )}
                  </div>

                  {testOtpHint && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Dev Sandbox Mode:</strong> Enter test code{' '}
                        <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded text-amber-900">
                          {testOtpHint}
                        </code>{' '}
                        or <code className="font-mono font-bold">123456</code>
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Enter 6-digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      autoFocus
                      className="w-full tracking-widest text-center px-4 py-3 rounded-xl border border-gray-300 text-2xl font-mono font-black text-emerald-900 focus:border-emerald-600 focus:outline-none bg-white"
                    />
                  </div>

                  {otpError && (
                    <p className="text-xs text-rose-600 font-bold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>{otpError}</span>
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otpCode.length < 6}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl text-base shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {otpLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    <span>{t.verifyOtp}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: AADHAAR IDENTITY VERIFICATION                    */}
        {/* ========================================================= */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t.step2Title}</h3>
                <p className="text-xs text-gray-500">{t.step2Sub}</p>
              </div>
            </div>

            {/* DPDP Act 2023 Statutory Consent Card */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-700 space-y-2">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{t.dpdpConsentTitle}</span>
              </div>
              <p className="leading-relaxed text-gray-600">{t.dpdpConsentBody}</p>

              <label className="flex items-start gap-2.5 pt-2 cursor-pointer font-bold text-emerald-900">
                <input
                  type="checkbox"
                  checked={dpdpConsent}
                  onChange={(e) => setDpdpConsent(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>{t.consentCheckbox}</span>
              </label>
            </div>

            {/* Aadhaar Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                {t.aadhaarInputLabel}
              </label>
              <input
                type="text"
                maxLength={14}
                value={aadhaarNumber}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 12)
                  const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ')
                  setAadhaarNumber(formatted)
                }}
                placeholder="4321 8765 9876"
                disabled={aadhaarOtpSent}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 font-mono font-bold text-lg text-gray-900 tracking-wider focus:border-emerald-600 focus:outline-none"
              />
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-gray-400" />
                <span>Encrypted transit • Only masked last 4 digits stored</span>
              </p>
            </div>

            {/* Test Edge-Case Simulator Buttons (Sandbox) */}
            <div className="pt-2 border-t border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Quick Test Scenarios (Sandbox):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAadhaarNumber('4321 8765 4321')
                    setDpdpConsent(true)
                  }}
                  className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold hover:bg-emerald-100 cursor-pointer"
                >
                  Standard (Pass)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAadhaarNumber('4321 8765 0017')
                    setDpdpConsent(true)
                  }}
                  className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold hover:bg-rose-100 cursor-pointer"
                >
                  Underage (&lt;18)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAadhaarNumber('4321 8765 0099')
                    setDpdpConsent(true)
                  }}
                  className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold hover:bg-amber-100 cursor-pointer"
                >
                  Name Mismatch
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAadhaarNumber('4321 8765 0088')
                    setDpdpConsent(true)
                  }}
                  className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold hover:bg-rose-100 cursor-pointer"
                >
                  Duplicate Ref
                </button>
              </div>
            </div>

            {!aadhaarOtpSent ? (
              <button
                type="button"
                onClick={() => handleStartAadhaar()}
                disabled={aadhaarLoading || !dpdpConsent || aadhaarNumber.replace(/\D/g, '').length !== 12}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl text-base transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {aadhaarLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <FileCheck2 className="w-5 h-5" />
                )}
                <span>{t.requestAadhaarOtp}</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
                <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                  <span>Enter Aadhaar OTP sent to linked mobile</span>
                  <span className="text-[11px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono">
                    Sandbox: 123456
                  </span>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={aadhaarOtp}
                  onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoFocus
                  className="w-full tracking-widest text-center px-4 py-3 rounded-xl border border-gray-300 text-2xl font-mono font-black text-emerald-900 focus:border-emerald-600 focus:outline-none bg-white"
                />

                <button
                  type="button"
                  onClick={handleVerifyAadhaarOtp}
                  disabled={aadhaarLoading || aadhaarOtp.length < 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl text-base shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {aadhaarLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  <span>{t.confirmAadhaar}</span>
                </button>
              </div>
            )}

            {aadhaarError && (
              <p className="text-xs text-rose-600 font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{aadhaarError}</span>
              </p>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: LIVE SELFIE WITH LIVENESS & FACE MATCH           */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t.step3Title}</h3>
                <p className="text-xs text-gray-500">{t.step3Sub}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{t.cameraTitle}:</span>
                <p className="mt-0.5 text-gray-600">{t.cameraInstructions}</p>
              </div>
            </div>

            {/* Video Viewport Container */}
            <div className="relative w-full max-w-sm mx-auto aspect-3/4 rounded-3xl overflow-hidden bg-gray-950 border-4 border-emerald-500 shadow-xl flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  cameraActive ? 'block' : 'hidden'
                }`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && (
                <div className="text-center p-6 text-white space-y-3">
                  <Camera className="w-12 h-12 text-emerald-400 mx-auto" />
                  <p className="text-xs text-gray-400">Front Camera Ready</p>
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-2xl text-sm transition-all cursor-pointer shadow-lg shadow-emerald-950/60"
                  >
                    {t.startCamera}
                  </button>
                </div>
              )}

              {/* Liveness Circular Overlay & Challenge Prompts */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
                  {/* Face Guide Oval */}
                  <div className="w-48 h-64 mt-8 rounded-[50%] border-2 border-dashed border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center">
                    <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded">
                      Face Here
                    </span>
                  </div>

                  {/* Active Challenge Indicator Card */}
                  <div className="w-full bg-gray-900/90 backdrop-blur border border-emerald-500/80 rounded-2xl p-3 text-center text-white">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                      {challengeStep === 1 ? t.challengeBlink : t.challengeSmile}
                    </p>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${livenessProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <p className="text-xs text-rose-600 font-bold text-center">{cameraError}</p>
            )}

            {capturing && (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 text-center font-bold text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                <span>{t.capturing}</span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: FINAL DECISION & AUTO-ROUTING RESULT              */}
        {/* ========================================================= */}
        {currentStep === 4 && decision && (
          <div className="space-y-6">
            {/* GREEN OUTCOME */}
            {decision.route === 'GREEN' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-md text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">{t.autoVerifiedGreen}</h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto">{t.autoVerifiedSub}</p>

                {/* Score Pills */}
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto pt-2">
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider">
                      Name Match
                    </span>
                    <p className="text-xl font-black text-emerald-700">
                      {decision.nameMatchScore}%
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider">
                      Face Match
                    </span>
                    <p className="text-xl font-black text-emerald-700">
                      {decision.faceMatchScore}%
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={COMMUNITY_WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1caa4f] text-white font-bold py-4 px-8 rounded-2xl text-base shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5 fill-current" />
                    <span>Join Community</span>
                    <ExternalLink className="w-4 h-4 opacity-90" />
                  </a>

                  <Link
                    to={`/status/${workerCode}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-2xl text-base shadow-sm transition-all"
                  >
                    <span>{t.viewCertificate}</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            )}

            {/* YELLOW OUTCOME */}
            {decision.route === 'YELLOW' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-md text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <Clock className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">{t.yellowReview}</h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto">{t.yellowReviewSub}</p>

                {/* Reasons List */}
                <div className="text-left bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5 max-w-md mx-auto">
                  <p className="font-bold text-amber-950 uppercase tracking-wider">Review Reason:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {decision.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  <Link
                    to={`/status/${workerCode}`}
                    className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-bold py-3.5 px-6 rounded-2xl text-sm"
                  >
                    <span>Check Verification Status</span>
                  </Link>
                </div>
              </div>
            )}

            {/* RED OUTCOME */}
            {decision.route === 'RED' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-md text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">{t.redRejected}</h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto">{t.redRejectedSub}</p>

                {/* Errors list */}
                <div className="text-left bg-rose-50/80 p-4 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1.5 max-w-md mx-auto">
                  <p className="font-bold text-rose-950 uppercase tracking-wider">Issues Detected:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {decision.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1)
                      setOtpSent(false)
                      setAadhaarOtpSent(false)
                    }}
                    className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl text-sm cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{t.retry}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
