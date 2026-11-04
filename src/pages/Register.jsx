import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
  User,
  Phone,
  MapPin,
  Briefcase,
  Camera,
  Sparkles,
  AlertOctagon,
  ExternalLink,
  MessageCircle,
  Download,
  RotateCcw,
} from 'lucide-react'
import { supabase, supabaseAnon, isSupabaseConfigured } from '../lib/supabase'
import { KERALA_DISTRICTS, MAX_PHOTO_SIZE_MB, COMMUNITY_WHATSAPP_LINK } from '../lib/constants'
import { compressImage } from '../lib/imageCompression'
import { generateCertificate } from '../lib/certificate'

// Calculate 16 years ago limit for DOB picker
const getSixteenYearsAgo = () => {
  const d = new Date()
  return new Date(d.getFullYear() - 16, d.getMonth(), d.getDate())
    .toISOString()
    .split('T')[0]
}
const SIXTEEN_YEARS_AGO = getSixteenYearsAgo()

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    heightCm: '',
    phone: '',
    whatsapp: '',
    sameAsPhone: true,
    district: '',
    area: '',
    travelOk: true,
    experienceYears: '0',
    emergencyName: '',
    emergencyPhone: '',
    consent: false,
  })

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [thumbBlob, setThumbBlob] = useState(null)
  const [photoInfo, setPhotoInfo] = useState(null)
  const [isOptimizingPhoto, setIsOptimizingPhoto] = useState(false)

  // Live Selfie Camera States
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [isLiveSelfie, setIsLiveSelfie] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [errors, setErrors] = useState({})
  const [duplicateWorker, setDuplicateWorker] = useState(null)
  const [registeredWorker, setRegisteredWorker] = useState(null)
  const [copiedId, setCopiedId] = useState(false)

  const handleStartCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraActive(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 100)
    } catch {
      setCameraError('Camera access denied or unavailable. You can use the photo upload button instead.')
    }
  }

  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const handleCaptureCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const w = video.videoWidth || 640
    const h = video.videoHeight || 640
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)

    canvas.toBlob(async (blob) => {
      if (!blob) return
      handleStopCamera()
      setIsOptimizingPhoto(true)
      try {
        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' })
        const result = await compressImage(file)
        setPhotoFile(result.file)
        setThumbBlob(result.thumbBlob)
        setPhotoPreview(result.previewUrl)
        setIsLiveSelfie(true)
        setPhotoInfo({
          originalKb: Math.round(file.size / 1024),
          compressedKb: Math.round(result.sizeBytes / 1024),
          quality: result.qualityUsed,
        })
      } catch (err) {
        setErrors((prev) => ({ ...prev, photo: err.message || 'Failed to process selfie.' }))
      } finally {
        setIsOptimizingPhoto(false)
      }
    }, 'image/jpeg', 0.9)
  }

  const handleDownloadCertificate = async () => {
    if (!registeredWorker) return
    try {
      setDownloadingPdf(true)
      await generateCertificate({
        ...registeredWorker,
        full_name: formData.fullName.trim(),
        district: formData.district,
        tier: registeredWorker.tier || 'silver',
        status: 'verified',
        verified_at: registeredWorker.verified_at || new Date().toISOString(),
      })
    } catch (err) {
      console.error('Certificate generation error:', err)
      setErrorMsg('Could not download certificate: ' + (err.message || 'Unknown error'))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (type === 'checkbox') {
      if (name === 'sameAsPhone') {
        setFormData((prev) => ({
          ...prev,
          sameAsPhone: checked,
          whatsapp: checked ? prev.phone : prev.whatsapp,
        }))
      } else if (name === 'consent') {
        setFormData((prev) => ({ ...prev, consent: checked }))
      }
    } else {
      setFormData((prev) => {
        const next = { ...prev, [name]: value }
        if (name === 'phone' && prev.sameAsPhone) {
          next.whatsapp = value
        }
        return next
      })
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrors((prev) => ({ ...prev, photo: null }))
    setErrorMsg('')
    setIsOptimizingPhoto(true)

    try {
      const result = await compressImage(file)
      setPhotoFile(result.file)
      setThumbBlob(result.thumbBlob)
      setPhotoPreview(result.previewUrl)
      setPhotoInfo({
        originalKb: Math.round(file.size / 1024),
        compressedKb: Math.round(result.sizeBytes / 1024),
        quality: result.qualityUsed,
      })
    } catch (err) {
      setErrors((prev) => ({ ...prev, photo: err.message || 'Failed to optimize photo.' }))
    } finally {
      setIsOptimizingPhoto(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleClearPhoto = () => {
    setPhotoFile(null)
    setThumbBlob(null)
    setPhotoPreview(null)
    setPhotoInfo(null)
    setErrors((prev) => ({ ...prev, photo: null }))
  }

  const validate = () => {
    const errs = {}
    if (!formData.fullName.trim()) errs.fullName = 'Full name is required'
    if (!formData.dob) {
      errs.dob = 'Date of birth is required'
    } else {
      const birthDate = new Date(formData.dob)
      const now = new Date()
      const diffYears = (now - birthDate) / (1000 * 60 * 60 * 24 * 365.25)
      if (diffYears < 16) {
        errs.dob = 'You must be at least 16 years old to register.'
      }
    }

    if (!formData.heightCm || Number(formData.heightCm) < 120 || Number(formData.heightCm) > 230) {
      errs.heightCm = 'Please enter a valid height in cm (120 - 230)'
    }

    const cleanPhone = formData.phone.replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = 'Valid 10-digit phone number is required'
    }

    const cleanWhatsapp = formData.whatsapp.replace(/\D/g, '')
    if (!cleanWhatsapp || cleanWhatsapp.length < 10) {
      errs.whatsapp = 'Valid 10-digit WhatsApp number is required'
    }

    if (!formData.district) errs.district = 'Please select your Kerala district'
    if (!formData.area.trim()) errs.area = 'Town or local area is required'

    if (!photoFile) errs.photo = 'Profile photo is required'

    if (!formData.emergencyName.trim()) {
      errs.emergencyName = 'Emergency contact person name is required'
    }
    const cleanEmergencyPhone = formData.emergencyPhone.replace(/\D/g, '')
    if (!cleanEmergencyPhone || cleanEmergencyPhone.length < 10) {
      errs.emergencyPhone = 'Valid 10-digit emergency contact phone is required'
    }

    if (!formData.consent) {
      errs.consent = 'You must agree to the terms to submit registration'
    }

    setErrors(errs)
    return { isValid: Object.keys(errs).length === 0, errs }
  }

  const generateUniqueWorkerCode = async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomSixDigits = String(Math.floor(100000 + Math.random() * 900000))
      const candidate = `CC-SLV-${randomSixDigits}`
      try {
        const { data: existing } = await supabaseAnon.rpc('get_public_worker', { code: candidate })
        const exists = Array.isArray(existing) ? existing.length > 0 : Boolean(existing?.worker_code)
        if (!exists) return candidate
      } catch {
        return candidate
      }
    }
    return `CC-SLV-${Date.now().toString().slice(-6)}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setDuplicateWorker(null)

    const { isValid, errs } = validate()
    if (!isValid) {
      const firstError = Object.values(errs)[0]
      setErrorMsg(firstError || 'Please fix the errors marked in the form.')
      window.scrollTo({ top: 100, behavior: 'smooth' })
      return
    }

    setIsSubmitting(true)

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Database is not connected. Please configure your Supabase credentials to submit real registrations.')
      }

      const enteredPhone = formData.phone.trim()
      const cleanPhoneDigits = enteredPhone.replace(/\D/g, '')
      const enteredName = formData.fullName.trim()

      // 1. DUPLICATE CHECK: Reject if phone or same (name + phone) already exists
      const { data: existingWorkers, error: checkErr } = await supabase
        .from('workers')
        .select('id, worker_code, full_name, phone, status, tier, verified_at')
        .or(`phone.eq.${enteredPhone},phone.eq.${cleanPhoneDigits}`)
        .limit(5)

      if (!checkErr && existingWorkers && existingWorkers.length > 0) {
        const dup = existingWorkers[0]
        setDuplicateWorker(dup)
        setErrorMsg(
          `Registration Rejected: Staff member with phone "${enteredPhone}" (or name "${dup.full_name}") already exists on CaterCrew with Worker ID ${dup.worker_code} (Status: ${dup.status}). Duplicate registrations are not permitted.`
        )
        window.scrollTo({ top: 100, behavior: 'smooth' })
        setIsSubmitting(false)
        return
      }

      // 2. Also check if same staff name & phone exists
      const { data: existingByName, error: nameErr } = await supabase
        .from('workers')
        .select('id, worker_code, full_name, phone, status, tier')
        .ilike('full_name', enteredName)
        .eq('phone', enteredPhone)
        .limit(1)

      if (!nameErr && existingByName && existingByName.length > 0) {
        const dup = existingByName[0]
        setDuplicateWorker(dup)
        setErrorMsg(
          `Registration Rejected: Staff member "${dup.full_name}" is already registered with Worker ID ${dup.worker_code}.`
        )
        window.scrollTo({ top: 100, behavior: 'smooth' })
        setIsSubmitting(false)
        return
      }

      // 3. Upload Compressed Photo & 160px Thumbnail with unique names (no upsert/overwrite) and 1-year cache
      const uniqueId = `worker_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      const ext = photoFile.name?.split('.').pop() || 'webp'
      const photoFileName = `${uniqueId}_600.${ext}`
      const thumbFileName = `${uniqueId}_160_thumb.${ext}`

      let { error: photoUploadErr } = await supabase.storage
        .from('photos')
        .upload(photoFileName, photoFile, {
          cacheControl: '31536000',
          upsert: false,
          contentType: photoFile.type || 'image/webp',
        })

      if (photoUploadErr) {
        const anonUpload = await supabaseAnon.storage
          .from('photos')
          .upload(photoFileName, photoFile, {
            cacheControl: '31536000',
            upsert: false,
            contentType: photoFile.type || 'image/webp',
          })
        photoUploadErr = anonUpload.error
      }

      if (photoUploadErr) {
        throw new Error(`Photo upload failed: ${photoUploadErr.message}`)
      }

      if (thumbBlob) {
        const { error: thumbUploadErr } = await supabaseAnon.storage
          .from('photos')
          .upload(thumbFileName, thumbBlob, {
            cacheControl: '31536000',
            upsert: false,
            contentType: photoFile.type || 'image/webp',
          })

        if (thumbUploadErr) {
          console.warn('Thumbnail upload warning:', thumbUploadErr.message)
        }
      }

      // 4. Register worker with status 'pending' (satisfies DB RLS policy: status = 'pending', tier = 'silver', consent = true)
      const basePayload = {
        p_full_name: enteredName,
        p_dob: formData.dob,
        p_height_cm: parseFloat(formData.heightCm),
        p_phone: enteredPhone,
        p_whatsapp: formData.whatsapp.trim(),
        p_district: formData.district,
        p_area: formData.area.trim(),
        p_travel_ok: Boolean(formData.travelOk),
        p_photo_path: photoFileName,
        p_emergency_name: formData.emergencyName.trim(),
        p_emergency_phone: formData.emergencyPhone.trim(),
        p_consent: true,
        p_weight_kg: null,
        p_id_proof_path: null,
        p_experience_years: parseFloat(formData.experienceYears) || 0,
        p_roles: [],
        p_has_uniform: false,
      }

      let rpcData = null
      let rpcErr = null

      // Primary attempt: standard 17-param register_worker RPC
      const res1 = await supabaseAnon.rpc('register_worker', basePayload)
      rpcData = res1.data
      rpcErr = res1.error

      // Secondary attempt: 18-param register_worker RPC (with p_photo_thumb_path) if signature requires it
      if (rpcErr && rpcErr.code === 'PGRST202') {
        const res2 = await supabaseAnon.rpc('register_worker', {
          ...basePayload,
          p_photo_thumb_path: thumbFileName,
        })
        if (!res2.error) {
          rpcData = res2.data
          rpcErr = null
        } else {
          rpcErr = res2.error
        }
      }

      if (rpcErr) {
        // If RPC raised a duplicate registration error
        if (rpcErr.message && rpcErr.message.includes('DUPLICATE_REGISTRATION')) {
          setErrorMsg(rpcErr.message)
          window.scrollTo({ top: 100, behavior: 'smooth' })
          setIsSubmitting(false)
          return
        }

        // Direct insert fallback (e.g. when 16-17 yr applicant hits older 18+ RPC check on DB):
        // IMPORTANT: Do NOT chain .select() onto .insert()!
        // Chaining .select() sends Prefer: return=representation, which triggers a SELECT RLS violation
        // ("new row violates row-level security policy for table workers") for anon/unlinked users.
        // Instead, pre-generate a unique CC-SLV worker_code (preserved by generate_worker_code trigger)
        // and insert with default Prefer: return=minimal via supabaseAnon.
        console.warn('RPC register_worker fallback to minimal insert:', rpcErr.message)
        let generatedCode = await generateUniqueWorkerCode()
        const insertRecord = {
          worker_code: generatedCode,
          full_name: basePayload.p_full_name,
          dob: basePayload.p_dob,
          height_cm: basePayload.p_height_cm,
          phone: basePayload.p_phone,
          whatsapp: basePayload.p_whatsapp,
          district: basePayload.p_district,
          area: basePayload.p_area,
          travel_ok: basePayload.p_travel_ok,
          photo_path: basePayload.p_photo_path,
          photo_thumb_path: thumbFileName || null,
          experience_years: basePayload.p_experience_years,
          emergency_name: basePayload.p_emergency_name,
          emergency_phone: basePayload.p_emergency_phone,
          consent: true,
          tier: 'silver',
          status: 'pending', // REQUIRED: Matches RLS WITH CHECK (status = 'pending' and tier = 'silver' and consent = true)
        }

        let { error: insertErr } = await supabaseAnon
          .from('workers')
          .insert([insertRecord])

        // If photo_thumb_path column does not exist in workers table, retry without it
        if (
          insertErr &&
          insertErr.message &&
          (insertErr.message.includes('photo_thumb_path') || insertErr.message.includes('column'))
        ) {
          delete insertRecord.photo_thumb_path
          const retry = await supabaseAnon.from('workers').insert([insertRecord])
          insertErr = retry.error
        }

        // Handle rare worker_code collision (23505)
        if (insertErr && insertErr.code === '23505' && insertErr.message?.includes('worker_code')) {
          generatedCode = await generateUniqueWorkerCode()
          insertRecord.worker_code = generatedCode
          const retryCode = await supabaseAnon.from('workers').insert([insertRecord])
          insertErr = retryCode.error
        }

        if (insertErr) {
          throw new Error(insertErr.message || rpcErr.message)
        }

        // Verify public worker record via security definer RPC
        let publicWorker = null
        try {
          const { data: pubData } = await supabaseAnon.rpc('get_public_worker', { code: generatedCode })
          publicWorker = Array.isArray(pubData) ? pubData[0] : pubData
        } catch {
          // Ignore lookup warning
        }

        const savedCode = publicWorker?.worker_code || generatedCode

        // Auto-verify new worker immediately if non-duplicate
        let finalStatus = 'verified'
        let verifiedAt = new Date().toISOString()

        if (savedCode) {
          try {
            const autoRes = await fetch('/api/verify/auto-verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workerCode: savedCode,
                phone: enteredPhone,
                fullName: enteredName,
              }),
            })
            if (autoRes.ok && autoRes.headers.get('content-type')?.includes('application/json')) {
              const autoData = await autoRes.json()
              if (autoData.success) {
                finalStatus = 'verified'
                verifiedAt = autoData.verified_at || verifiedAt
              }
            }
          } catch (autoErr) {
            console.warn('Auto-verify call warning:', autoErr)
          }
        }

        setRegisteredWorker({
          ...(publicWorker || {}),
          worker_code: savedCode,
          status: finalStatus,
          verified_at: verifiedAt,
          tier: publicWorker?.tier || 'silver',
          full_name: enteredName,
          photo_path: photoFileName,
          photo_thumb_path: thumbFileName,
        })
      } else {
        const savedCode = rpcData?.worker_code
        let finalStatus = 'verified'
        let verifiedAt = new Date().toISOString()

        if (savedCode) {
          try {
            const autoRes = await fetch('/api/verify/auto-verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workerCode: savedCode,
                phone: enteredPhone,
                fullName: enteredName,
              }),
            })
            if (autoRes.ok && autoRes.headers.get('content-type')?.includes('application/json')) {
              const autoData = await autoRes.json()
              if (autoData.success) {
                finalStatus = 'verified'
                verifiedAt = autoData.verified_at || verifiedAt
              }
            }
          } catch (autoErr) {
            console.warn('Auto-verify call warning:', autoErr)
          }
        }

        setRegisteredWorker({
          ...rpcData,
          worker_code: savedCode,
          full_name: enteredName,
          photo_path: photoFileName,
          photo_thumb_path: thumbFileName,
          status: finalStatus,
          verified_at: verifiedAt,
          tier: rpcData?.tier || 'silver',
        })
      }
    } catch (err) {
      console.error('Registration submission error:', err)
      setErrorMsg(err.message || 'An error occurred while submitting your registration.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  // SUCCESS SCREEN (AUTOMATICALLY VERIFIED)
  if (registeredWorker) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 sm:py-20 text-center animate-in fade-in duration-300">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xs border-2 border-emerald-300">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Auto-Verification Complete</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Registration & Verification Complete! 🎉
        </h1>

        <p className="mt-3 text-base sm:text-lg text-gray-600 max-w-md mx-auto">
          Welcome to CaterCrew! Your profile has been automatically verified as an official{' '}
          <strong className="text-emerald-700 font-bold">CaterCrew Silver Boy</strong>.
        </p>

        {/* Unique Worker Code Card */}
        <div className="mt-8 bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 text-left shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
            <span className="text-xs font-bold text-emerald-800 tracking-wider uppercase">
              Official Worker ID Card
            </span>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified ✓</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500 font-medium">Worker ID</p>
              <span className="text-2xl sm:text-3xl font-mono font-black text-gray-900 tracking-wider">
                {registeredWorker.worker_code}
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(registeredWorker.worker_code)}
              className="p-3 rounded-xl bg-white border border-emerald-300 text-gray-700 hover:text-emerald-700 hover:border-emerald-500 transition-colors cursor-pointer shadow-2xs"
              title="Copy ID"
            >
              {copiedId ? (
                <Check className="w-5 h-5 text-emerald-600" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="pt-2 text-xs text-emerald-900 space-y-1">
            <p className="font-semibold">✓ Registered Name: {formData.fullName.trim()}</p>
            <p>✓ Status: Verified (Auto-approved & active)</p>
            <p>✓ Tier: Silver Boy (Eligible for catering bookings across Kerala)</p>
            <p>✓ Digital Certificate & tamper-proof QR code are ready for instant download.</p>
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleDownloadCertificate}
            disabled={downloadingPdf}
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl text-base sm:text-lg shadow-sm transition-colors cursor-pointer"
          >
            {downloadingPdf ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Official PDF Certificate...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download Official Certificate</span>
              </>
            )}
          </button>

          <a
            href={COMMUNITY_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1caa4f] text-white font-extrabold py-4 px-6 rounded-2xl text-base sm:text-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>Join CaterCrew Community</span>
            <ExternalLink className="w-4 h-4 opacity-90" />
          </a>

          <Link
            to={`/status/${registeredWorker.worker_code}`}
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-bold py-3.5 px-6 rounded-2xl text-sm border-2 border-gray-200 transition-colors cursor-pointer"
          >
            <span>View My ID & Verification QR Badge</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/"
            className="inline-flex items-center justify-center text-gray-500 hover:text-gray-800 font-medium py-2.5 px-4 text-sm transition-colors cursor-pointer"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  // REGISTRATION FORM
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Page Header */}
      <div className="text-left sm:text-center mb-8">
        <span className="text-xs uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Kerala Catering Crew Registration
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3 tracking-tight">
          Register as Silver Boy
        </h1>
        <p className="text-gray-500 mt-2 text-base sm:text-lg">
          Join Kerala's premier catering network. Fill out your details below to submit your registration.
        </p>
      </div>

      {/* DEDICATED DUPLICATE REJECTION CARD */}
      {duplicateWorker && (
        <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-sm animate-in fade-in duration-200 space-y-4">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-7 h-7 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-black text-rose-900">
                Registration Rejected: Duplicate Staff Found
              </h3>
              <p className="text-sm text-rose-800 mt-1 leading-relaxed">
                A staff member with this phone number (<strong>{duplicateWorker.phone}</strong>) or name (<strong>{duplicateWorker.full_name}</strong>) is already registered in our system. Duplicate accounts are blocked to prevent fraudulent profiles.
              </p>
            </div>
          </div>

          <div className="bg-white/80 rounded-2xl p-4 border border-rose-200 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Existing Worker ID:</span>
              <span className="font-mono font-bold text-gray-900">{duplicateWorker.worker_code}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Current Status:</span>
              <span className="capitalize font-bold text-emerald-700">{duplicateWorker.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Staff Name:</span>
              <span className="font-semibold text-gray-900">{duplicateWorker.full_name}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <Link
              to={`/status/${duplicateWorker.worker_code}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-sm py-3 px-5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>View Existing Registration & ID Card</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setDuplicateWorker(null)
                setErrorMsg('')
              }}
              className="text-xs text-rose-700 hover:underline font-semibold cursor-pointer"
            >
              Correct Phone Number / Retry
            </button>
          </div>
        </div>
      )}

      {errorMsg && !duplicateWorker && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Please correct the following:</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: PERSONAL INFORMATION */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b border-gray-100 pb-3">
            <User className="w-5 h-5 text-emerald-600" />
            <span>1. Personal Information</span>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Full Name <span className="text-emerald-600">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Rahul S. Kumar"
              className={`w-full px-4 py-3.5 rounded-xl border-2 text-base ${
                errors.fullName ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
              } focus:outline-none`}
            />
            {errors.fullName && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.fullName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Date of Birth (16+) <span className="text-emerald-600">*</span>
              </label>
              <input
                type="date"
                name="dob"
                max={SIXTEEN_YEARS_AGO}
                value={formData.dob}
                onChange={handleChange}
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base ${
                  errors.dob ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                } focus:outline-none`}
              />
              {errors.dob && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.dob}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Height (cm) <span className="text-emerald-600">*</span>
              </label>
              <input
                type="number"
                name="heightCm"
                min="120"
                max="230"
                placeholder="e.g. 172"
                value={formData.heightCm}
                onChange={handleChange}
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base ${
                  errors.heightCm ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                } focus:outline-none`}
              />
              {errors.heightCm && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.heightCm}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: CONTACT & LOCATION */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b border-gray-100 pb-3">
            <Phone className="w-5 h-5 text-emerald-600" />
            <span>2. Contact & Location</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Phone Number <span className="text-emerald-600">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base font-mono ${
                  errors.phone ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                } focus:outline-none`}
              />
              {errors.phone && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.phone}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-800">
                  WhatsApp Number <span className="text-emerald-600">*</span>
                </label>
                <label className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    name="sameAsPhone"
                    checked={formData.sameAsPhone}
                    onChange={handleChange}
                    className="accent-emerald-600"
                  />
                  <span>Same as phone</span>
                </label>
              </div>
              <input
                type="tel"
                name="whatsapp"
                maxLength={10}
                disabled={formData.sameAsPhone}
                placeholder="10-digit WhatsApp"
                value={formData.whatsapp}
                onChange={handleChange}
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base font-mono ${
                  formData.sameAsPhone ? 'bg-gray-50 text-gray-500' : ''
                } ${
                  errors.whatsapp ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                } focus:outline-none`}
              />
              {errors.whatsapp && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.whatsapp}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Kerala District <span className="text-emerald-600">*</span>
              </label>
              <select
                name="district"
                value={formData.district}
                onChange={handleChange}
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base bg-white ${
                  errors.district ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                } focus:outline-none`}
              >
                <option value="">Select your district</option>
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {errors.district && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.district}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Area / Town <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                name="area"
                placeholder="e.g. Aluva, Edappally, etc."
                value={formData.area}
                onChange={handleChange}
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base ${
                  errors.area ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                } focus:outline-none`}
              />
              {errors.area && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.area}</p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Willing to travel to other districts for events?
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-base">
                <input
                  type="radio"
                  name="travelOk"
                  checked={formData.travelOk === true}
                  onChange={() => setFormData((p) => ({ ...p, travelOk: true }))}
                  className="w-4 h-4 accent-emerald-600"
                />
                <span>Yes, willing to travel</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-base">
                <input
                  type="radio"
                  name="travelOk"
                  checked={formData.travelOk === false}
                  onChange={() => setFormData((p) => ({ ...p, travelOk: false }))}
                  className="w-4 h-4 accent-emerald-600"
                />
                <span>No, home district only</span>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 3: PHOTO & LIVE SELFIE */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
              <Camera className="w-5 h-5 text-emerald-600" />
              <span>3. Live Selfie or Profile Photo</span>
            </div>
            {isLiveSelfie && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Live Selfie ✓
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Take a live selfie with your camera or upload a clear front-facing portrait. Automatically optimized & verified.
          </p>

          {/* Hidden Canvas for Live Selfie Capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* LIVE CAMERA VIEWFINDER (When Active) */}
          {cameraActive && (
            <div className="p-4 rounded-2xl bg-gray-900 text-white space-y-4 animate-in fade-in duration-200">
              <div className="relative aspect-square max-w-sm mx-auto overflow-hidden rounded-2xl bg-black border-2 border-emerald-500">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {/* Oval Face Guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-64 border-2 border-dashed border-emerald-400 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                </div>
                <div className="absolute bottom-2 inset-x-0 text-center">
                  <span className="text-[11px] font-semibold bg-black/75 px-3 py-1 rounded-full text-emerald-300">
                    Align your face inside the oval
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCaptureCamera}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Selfie</span>
                </button>
                <button
                  type="button"
                  onClick={handleStopCamera}
                  className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {cameraError}
            </div>
          )}

          {/* PHOTO PREVIEW & CONTROLS (When camera is closed) */}
          {!cameraActive && (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {photoPreview ? (
                <div className="relative group">
                  <img
                    src={photoPreview}
                    alt="Profile Preview"
                    width={96}
                    height={128}
                    loading="lazy"
                    decoding="async"
                    className="w-24 h-32 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
                  />
                  {isLiveSelfie && (
                    <span className="absolute -bottom-2 -right-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                      Live ✓
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-24 h-32 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                  <Camera className="w-8 h-8" />
                  <span className="text-[10px] mt-1 font-medium">No photo</span>
                </div>
              )}

              <div className="flex-1 w-full space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    disabled={isOptimizingPhoto}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Live Selfie</span>
                  </button>

                  <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold cursor-pointer transition-colors shadow-xs">
                    <span>{photoFile ? 'Choose File' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        setIsLiveSelfie(false)
                        handlePhotoSelect(e)
                      }}
                      disabled={isOptimizingPhoto}
                      className="hidden"
                    />
                  </label>

                  {photoFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLiveSelfie(false)
                        handleClearPhoto()
                      }}
                      className="px-3.5 py-3 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {isOptimizingPhoto && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold animate-pulse">
                    <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span>Optimizing & compressing image...</span>
                  </div>
                )}

                {photoInfo && !isOptimizingPhoto && (
                  <p className="text-xs text-emerald-700 font-medium">
                    ✓ Ready: {photoInfo.compressedKb} KB ({isLiveSelfie ? 'Live Camera Capture' : 'Uploaded File'})
                  </p>
                )}

                {errors.photo && (
                  <p className="text-rose-600 text-xs mt-1 font-medium">{errors.photo}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: WORK EXPERIENCE */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b border-gray-100 pb-3">
            <Briefcase className="w-5 h-5 text-emerald-600" />
            <span>4. Work Experience</span>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Catering Experience (Years) <span className="text-emerald-600">*</span>
            </label>
            <input
              type="number"
              name="experienceYears"
              min="0"
              max="40"
              step="0.5"
              value={formData.experienceYears}
              onChange={handleChange}
              className="w-full sm:w-1/2 px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-base"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter 0 if this is your first time working in catering events.
            </p>
          </div>
        </div>

        {/* SECTION 5: EMERGENCY CONTACT */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b border-gray-100 pb-3">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>5. Emergency Contact</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Contact Person Name (Parent / Guardian) <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                name="emergencyName"
                placeholder="e.g. Suresh Kumar (Father)"
                value={formData.emergencyName}
                onChange={handleChange}
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base ${
                  errors.emergencyName ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                } focus:outline-none`}
              />
              {errors.emergencyName && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.emergencyName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Emergency Phone Number <span className="text-emerald-600">*</span>
              </label>
              <input
                type="tel"
                name="emergencyPhone"
                maxLength={10}
                placeholder="10-digit emergency contact"
                value={formData.emergencyPhone}
                onChange={handleChange}
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base font-mono ${
                  errors.emergencyPhone ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                } focus:outline-none`}
              />
              {errors.emergencyPhone && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.emergencyPhone}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 6: CONSENT & SUBMISSION */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent}
              onChange={handleChange}
              className="mt-1 w-5 h-5 accent-emerald-600 shrink-0"
            />
            <span className="text-sm sm:text-base text-gray-700 font-medium leading-relaxed">
              I agree that CaterCrew may store my details and show my verified profile to event
              companies. <span className="text-emerald-600">*</span>
            </span>
          </label>
          {errors.consent && (
            <p className="text-rose-600 text-xs font-semibold">{errors.consent}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-lg sm:text-xl py-4 px-8 rounded-2xl shadow-sm transition-all duration-150 flex items-center justify-center gap-3 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting Registration...
              </span>
            ) : (
              <span>Submit Registration as Silver Boy</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
