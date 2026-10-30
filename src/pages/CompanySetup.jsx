import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  Phone,
  MapPin,
  FileCheck,
  CheckCircle2,
  Clock,
  Upload,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { KERALA_DISTRICTS } from '../lib/constants'
import { useAuth } from '../context/AuthContext'

const COMPANY_TYPES = [
  'catering company',
  'event management',
  'wedding planner',
  'hall or venue',
  'other',
]

export default function CompanySetup() {
  const navigate = useNavigate()
  const { user, profile, role, refreshProfile, loading } = useAuth()

  const [formData, setFormData] = useState({
    companyName: '',
    companyType: 'catering company',
    yearsInBusiness: '1',
    contactName: '',
    phone: '',
    whatsapp: '',
    sameAsPhone: true,
    email: user?.email || '',
    district: 'Ernakulam',
    area: '',
    address: '',
    gstNumber: '',
    consent: false,
  })

  const [docFile, setDocFile] = useState(null)
  const [docPreview, setDocPreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [errors, setErrors] = useState({})
  const [submittedCompany, setSubmittedCompany] = useState(null)

  // Sync email from user if available
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData((prev) => ({ ...prev, email: user.email }))
    }
  }, [user, formData.email])

  // Check if user already has a company profile
  useEffect(() => {
    if (role === 'company' && profile) {
      if (profile.status === 'approved') {
        navigate('/company/dashboard')
      } else {
        setSubmittedCompany(profile)
      }
    }
  }, [role, profile, navigate])

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

  const handleDocSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, doc: 'File size must be less than 10 MB.' }))
      return
    }

    setDocFile(file)
    if (file.type.startsWith('image/')) {
      setDocPreview(URL.createObjectURL(file))
    } else {
      setDocPreview(null)
    }
    setErrors((prev) => ({ ...prev, doc: null }))
  }

  const validate = () => {
    const errs = {}
    if (!formData.companyName.trim()) errs.companyName = 'Company name is required'
    if (!formData.companyType) errs.companyType = 'Please select your company type'
    if (!formData.contactName.trim()) errs.contactName = 'Contact person name is required'

    const cleanPhone = formData.phone.replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = 'Valid 10-digit phone number is required'
    }

    const cleanWhatsapp = formData.whatsapp.replace(/\D/g, '')
    if (!cleanWhatsapp || cleanWhatsapp.length < 10) {
      errs.whatsapp = 'Valid 10-digit WhatsApp number is required'
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      errs.email = 'Valid business email is required'
    }

    if (!formData.district) errs.district = 'Please select your district'
    if (!formData.area.trim()) errs.area = 'Town or area is required'
    if (!formData.address.trim()) errs.address = 'Full office or premises address is required'

    if (!formData.consent) {
      errs.consent = 'You must agree to the terms to submit company registration'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!user) {
      setErrorMsg('Please log in or sign up first to set up your company.')
      return
    }

    if (!validate()) {
      setErrorMsg('Please fix the errors highlighted below.')
      window.scrollTo({ top: 120, behavior: 'smooth' })
      return
    }

    setIsSubmitting(true)

    try {
      if (!isSupabaseConfigured) {
        // Mock fallback
        const mockCompany = {
          company_name: formData.companyName,
          status: 'pending',
          district: formData.district,
        }
        setSubmittedCompany(mockCompany)
        return
      }

      let docPath = null

      // Upload business proof to private 'company-docs' bucket
      if (docFile) {
        const fileExt = docFile.name.split('.').pop() || 'pdf'
        docPath = `${user.id}/${Date.now()}_proof.${fileExt}`
        const { error: uploadErr } = await supabase.storage
          .from('company-docs')
          .upload(docPath, docFile, {
            upsert: true,
          })

        if (uploadErr) {
          console.warn('Document upload notice:', uploadErr)
          // Continue if storage bucket permission fails gracefully
        }
      }

      // Upsert into public.companies table
      const companyPayload = {
        user_id: user.id,
        company_name: formData.companyName.trim(),
        company_type: formData.companyType,
        years_in_business: parseFloat(formData.yearsInBusiness) || 0,
        contact_name: formData.contactName.trim(),
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.trim(),
        email: formData.email.trim(),
        district: formData.district,
        area: formData.area.trim(),
        address: formData.address.trim(),
        gst_number: formData.gstNumber.trim() || null,
        doc_path: docPath,
        status: 'pending',
      }

      const { data, error: insertErr } = await supabase
        .from('companies')
        .upsert(companyPayload, { onConflict: 'user_id' })
        .select('*')
        .single()

      if (insertErr) throw insertErr

      await refreshProfile()
      setSubmittedCompany(data || companyPayload)
    } catch (err) {
      console.error('Company setup error:', err)
      setErrorMsg(err.message || 'Failed to submit company details. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Friendly "Your company is under review" state
  if (submittedCompany && submittedCompany.status === 'pending') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 sm:py-24 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Clock className="w-10 h-10 animate-pulse" />
        </div>

        <div className="inline-block bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
          Under Review
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Your company is under review
        </h1>
        <p className="mt-3 text-base text-gray-600 leading-relaxed">
          Thank you for registering <strong className="text-gray-900">{submittedCompany.company_name || 'your company'}</strong> with CaterCrew. Our operations team is reviewing your details and business credentials.
        </p>

        <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-3xl text-left space-y-3">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>What happens next?</span>
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            • We verify your contact and business details to maintain the safety of our catering crew boys across Kerala.
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            • Approvals are typically completed within a few hours.
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            • Once approved, you will be able to post events, set custom wages, and book verified Silver Boys directly.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/events"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl text-sm shadow-sm transition-colors"
          >
            <span>Browse Events Feed</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3.5 px-6 rounded-2xl text-sm transition-colors"
          >
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-20 text-left">
      {/* Page Header */}
      <div className="mb-8 text-center sm:text-left">
        <span className="inline-block bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full mb-3 border border-emerald-200/80">
          Step 2 of 2: Company Profile
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Register Your Event Company
        </h1>
        <p className="mt-2 text-base text-gray-600 max-w-xl leading-relaxed">
          Hire verified catering boys, waiters, and event staff across Kerala.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* NUMBERED CARD 1: COMPANY DETAILS */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b border-gray-100 pb-3">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span>1. Company Details</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Company / Organization Name <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                required
                value={formData.companyName}
                onChange={handleChange}
                placeholder="e.g. Malabar Grandeur Catering & Events"
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base ${
                  errors.companyName ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                } focus:outline-none`}
              />
              {errors.companyName && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.companyName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Business Type <span className="text-emerald-600">*</span>
                </label>
                <select
                  name="companyType"
                  value={formData.companyType}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-base bg-white capitalize"
                >
                  {COMPANY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Years in Business
                </label>
                <input
                  type="number"
                  name="yearsInBusiness"
                  min="0"
                  max="100"
                  value={formData.yearsInBusiness}
                  onChange={handleChange}
                  placeholder="e.g. 3"
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-base"
                />
              </div>
            </div>
          </div>
        </div>

        {/* NUMBERED CARD 2: CONTACT INFORMATION */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b border-gray-100 pb-3">
            <Phone className="w-5 h-5 text-emerald-600" />
            <span>2. Contact Person & Phone</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Contact Person Name <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                name="contactName"
                required
                value={formData.contactName}
                onChange={handleChange}
                placeholder="e.g. Rahul Menon (Event Coordinator)"
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base ${
                  errors.contactName ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                } focus:outline-none`}
              />
              {errors.contactName && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.contactName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Phone Number <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className={`w-full px-4 py-3.5 rounded-xl border-2 text-base ${
                    errors.phone ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                  } focus:outline-none`}
                />
                {errors.phone && (
                  <p className="text-rose-600 text-xs mt-1 font-medium">{errors.phone}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-800">
                    WhatsApp Number <span className="text-emerald-600">*</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      name="sameAsPhone"
                      checked={formData.sameAsPhone}
                      onChange={handleChange}
                      className="rounded accent-emerald-600"
                    />
                    <span>Same as phone</span>
                  </label>
                </div>
                <input
                  type="tel"
                  name="whatsapp"
                  disabled={formData.sameAsPhone}
                  required
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="WhatsApp number"
                  className={`w-full px-4 py-3.5 rounded-xl border-2 text-base ${
                    errors.whatsapp ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                  } ${formData.sameAsPhone ? 'bg-gray-50 text-gray-500' : ''} focus:outline-none`}
                />
                {errors.whatsapp && (
                  <p className="text-rose-600 text-xs mt-1 font-medium">{errors.whatsapp}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Official Business Email <span className="text-emerald-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="events@company.com"
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base ${
                  errors.email ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                } focus:outline-none`}
              />
              {errors.email && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* NUMBERED CARD 3: LOCATION */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b border-gray-100 pb-3">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>3. Office Location</span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  District in Kerala <span className="text-emerald-600">*</span>
                </label>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-base bg-white"
                >
                  {KERALA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Town / Local Area <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="text"
                  name="area"
                  required
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="e.g. Edappally / Aluva"
                  className={`w-full px-4 py-3.5 rounded-xl border-2 text-base ${
                    errors.area ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                  } focus:outline-none`}
                />
                {errors.area && (
                  <p className="text-rose-600 text-xs mt-1 font-medium">{errors.area}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Full Office / Premises Address <span className="text-emerald-600">*</span>
              </label>
              <textarea
                name="address"
                rows="2"
                required
                value={formData.address}
                onChange={handleChange}
                placeholder="Building name, street, landmarks, PIN code"
                className={`w-full px-4 py-3 rounded-xl border-2 text-base ${
                  errors.address ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 focus:border-emerald-600'
                } focus:outline-none resize-none`}
              />
              {errors.address && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.address}</p>
              )}
            </div>
          </div>
        </div>

        {/* NUMBERED CARD 4: VERIFICATION & BUSINESS PROOF */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b border-gray-100 pb-3">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <span>4. Verification & Business Proof</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                GST Number (Optional)
              </label>
              <input
                type="text"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                placeholder="e.g. 32AAAAA0000A1Z5"
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-base uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Business Proof Upload (Optional but speeds up approval)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Visiting card, trade licence, GST certificate, or shop/office signboard photo. Saved securely in a private vault readable only by you and CaterCrew administrators.
              </p>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-6 cursor-pointer bg-gray-50/50 hover:bg-emerald-50/20 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-bold text-gray-700">
                  {docFile ? docFile.name : 'Click to upload proof (PDF, JPG, PNG)'}
                </span>
                <span className="text-xs text-gray-400 mt-1">Maximum size 10 MB</span>
                <input
                  type="file"
                  onChange={handleDocSelect}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
              </label>
              {errors.doc && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.doc}</p>
              )}

              {docPreview && (
                <div className="mt-3">
                  <img
                    src={docPreview}
                    alt="Preview"
                    className="w-32 h-24 object-cover rounded-xl border border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NUMBERED CARD 5: CONSENT & SUBMISSION */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b border-gray-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>5. Consent & Terms</span>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent}
              onChange={handleChange}
              className="mt-1 w-5 h-5 accent-emerald-600 shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed font-medium">
              I certify that I represent this event/catering management business. I agree that CaterCrew may verify these details and store company contact information for coordinating catering crew staff. <span className="text-emerald-600">*</span>
            </span>
          </label>
          {errors.consent && (
            <p className="text-rose-600 text-xs font-semibold">{errors.consent}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl text-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Submitting for Review...</span>
            ) : (
              <>
                <span>Submit Company Registration</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
