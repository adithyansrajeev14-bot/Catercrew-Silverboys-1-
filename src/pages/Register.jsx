import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Upload,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
  User,
  Phone,
  MapPin,
  Briefcase,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { KERALA_DISTRICTS, MAX_PHOTO_SIZE_MB } from '../lib/constants'

// Calculate 18 years ago limit for DOB picker
const getEighteenYearsAgo = () => {
  const d = new Date()
  return new Date(d.getFullYear() - 18, d.getMonth(), d.getDate())
    .toISOString()
    .split('T')[0]
}
const EIGHTEEN_YEARS_AGO = getEighteenYearsAgo()

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

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [errors, setErrors] = useState({})
  const [registeredWorker, setRegisteredWorker] = useState(null)
  const [copiedId, setCopiedId] = useState(false)

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

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, photo: 'Photo must be an image file (JPG, PNG, WebP).' }))
      return
    }

    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        photo: `Photo size must be less than ${MAX_PHOTO_SIZE_MB} MB.`,
      }))
      return
    }

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
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
      if (diffYears < 18) {
        errs.dob = 'You must be at least 18 years old to register.'
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
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!validate()) {
      const firstError = Object.values(errors)[0]
      setErrorMsg(firstError || 'Please fix the errors marked in the form.')
      window.scrollTo({ top: 100, behavior: 'smooth' })
      return
    }

    setIsSubmitting(true)

    try {
      if (!isSupabaseConfigured) {
        // Mock fallback if user hasn't hooked Supabase credentials yet
        await new Promise((r) => setTimeout(r, 1000))
        const mockCode = `CC-SLV-${Math.floor(100000 + Math.random() * 900000)}`
        setRegisteredWorker({
          worker_code: mockCode,
          full_name: formData.fullName,
          status: 'pending',
          tier: 'silver',
        })
        setIsSubmitting(false)
        return
      }

      // 1. Upload Photo to public bucket 'photos'
      const photoExt = photoFile.name.split('.').pop() || 'jpg'
      const photoFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${photoExt}`
      const { error: photoUploadErr } = await supabase.storage
        .from('photos')
        .upload(photoFileName, photoFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (photoUploadErr) {
        throw new Error(`Photo upload failed: ${photoUploadErr.message}`)
      }

      // 2. Register worker via RPC function or direct insert
      const payload = {
        p_full_name: formData.fullName.trim(),
        p_dob: formData.dob,
        p_height_cm: parseFloat(formData.heightCm),
        p_phone: formData.phone.trim(),
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

      // Call register_worker security definer RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc('register_worker', payload)

      if (rpcErr) {
        // Direct insert fallback if RPC schema differs
        console.warn('RPC register_worker error, trying direct insert fallback:', rpcErr)
        const { data: insertData, error: insertErr } = await supabase
          .from('workers')
          .insert([
            {
              full_name: payload.p_full_name,
              dob: payload.p_dob,
              height_cm: payload.p_height_cm,
              phone: payload.p_phone,
              whatsapp: payload.p_whatsapp,
              district: payload.p_district,
              area: payload.p_area,
              travel_ok: payload.p_travel_ok,
              photo_path: payload.p_photo_path,
              experience_years: payload.p_experience_years,
              emergency_name: payload.p_emergency_name,
              emergency_phone: payload.p_emergency_phone,
              consent: true,
              tier: 'silver',
              status: 'pending',
            },
          ])
          .select('id, worker_code, status, tier')
          .single()

        if (insertErr) {
          throw new Error(rpcErr.message || insertErr.message)
        }

        setRegisteredWorker(insertData)
      } else {
        setRegisteredWorker(rpcData)
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

  // SUCCESS SCREEN
  if (registeredWorker) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 sm:py-20 text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xs">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Registration Submitted!
        </h1>

        <p className="mt-3 text-lg text-gray-600">
          Your registration as a Silver Catering Boy has been received and is currently{' '}
          <strong className="text-emerald-700 font-semibold">pending verification</strong>.
        </p>

        {/* Unique Worker Code Card */}
        <div className="mt-8 bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-6 sm:p-8">
          <span className="text-xs font-bold text-emerald-800 tracking-wider uppercase">
            Your Unique Worker ID
          </span>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-3xl sm:text-4xl font-mono font-black text-gray-900 tracking-wider">
              {registeredWorker.worker_code}
            </span>
            <button
              onClick={() => copyToClipboard(registeredWorker.worker_code)}
              className="p-2.5 rounded-xl bg-white border border-emerald-300 text-gray-700 hover:text-emerald-700 hover:border-emerald-500 transition-colors cursor-pointer"
              title="Copy ID"
            >
              {copiedId ? (
                <Check className="w-5 h-5 text-emerald-600" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="mt-3 text-xs sm:text-sm text-emerald-900">
            Please save or screenshot this ID. You will need it to check your status and download
            your certificate.
          </p>
        </div>

        {/* Navigation Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link
            to={`/status/${registeredWorker.worker_code}`}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-4 px-6 rounded-2xl text-lg shadow-sm transition-colors cursor-pointer"
          >
            <span>Check Registration Status</span>
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            to="/"
            className="inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-4 px-6 rounded-2xl text-lg transition-colors cursor-pointer"
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
          silver boy enrolement
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3 tracking-tight">
          Register as Silver Boy
        </h1>
        <p className="text-gray-500 mt-2 text-base sm:text-lg">
          Join Kerala's verified catering network. No registration fees.
        </p>
      </div>

      {errorMsg && (
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
                Date of Birth (18+) <span className="text-emerald-600">*</span>
              </label>
              <input
                type="date"
                name="dob"
                max={EIGHTEEN_YEARS_AGO}
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

        {/* SECTION 3: PHOTO VERIFICATION */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b border-gray-100 pb-3">
            <Upload className="w-5 h-5 text-emerald-600" />
            <span>3. Profile Photo</span>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Passport Size Photo <span className="text-emerald-600">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Clear front-facing photo. Will appear on your verified certificate. (Max {MAX_PHOTO_SIZE_MB} MB)
            </p>

            <div className="flex items-center gap-4">
              {photoPreview ? (
                <div className="relative w-24 h-28 border-2 border-emerald-500 rounded-xl overflow-hidden shrink-0 bg-gray-50 shadow-xs">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-28 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 shrink-0 bg-gray-50">
                  <User className="w-8 h-8" />
                  <span className="text-[10px] mt-1 font-medium">No photo</span>
                </div>
              )}

              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl cursor-pointer transition-colors text-sm">
                  <Upload className="w-4 h-4" />
                  <span>{photoFile ? 'Change Photo' : 'Choose Photo (JPG/PNG)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
                {photoFile && (
                  <p className="text-xs text-emerald-700 font-medium mt-1.5 truncate">
                    ✓ {photoFile.name} ({(photoFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                {errors.photo && (
                  <p className="text-rose-600 text-xs mt-1 font-medium">{errors.photo}</p>
                )}
              </div>
            </div>
          </div>
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
