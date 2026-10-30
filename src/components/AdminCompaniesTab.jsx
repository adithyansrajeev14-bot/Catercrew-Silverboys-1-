import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Search,
  ExternalLink,
  X,
  Trash2,
} from 'lucide-react'
import { supabase, isSupabaseConfigured, getCompanyDocSignedUrl } from '../lib/supabase'

export default function AdminCompaniesTab() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all') // all, pending, approved, suspended
  const [searchQuery, setSearchQuery] = useState('')

  // Detail Modal
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [docSignedUrl, setDocSignedUrl] = useState(null)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchCompanies = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setCompanies([
        {
          id: 'demo-c1',
          company_name: 'Al-Saj Conventions & Catering',
          company_type: 'Catering Company',
          years_in_business: 12,
          contact_name: 'Rajesh Nair',
          phone: '+91 98460 11223',
          whatsapp: '+91 98460 11223',
          email: 'events@alsaj.com',
          district: 'Ernakulam',
          area: 'Edappally',
          full_address: 'Toll Junction, Edappally, Kochi',
          gst_number: '32AAAAA0000A1Z5',
          status: 'approved',
          proof_doc_path: null,
          created_at: new Date().toISOString(),
        },
        {
          id: 'demo-c2',
          company_name: 'Royal Feast Caterers',
          company_type: 'Catering Company',
          years_in_business: 4,
          contact_name: 'Shaji Mathew',
          phone: '+91 94470 55667',
          whatsapp: '+91 94470 55667',
          email: 'royalfeast@gmail.com',
          district: 'Kottayam',
          area: 'Pala',
          full_address: 'Main Road, Pala',
          status: 'pending',
          proof_doc_path: 'company-proofs/demo.pdf',
          created_at: new Date().toISOString(),
        },
      ])
      return
    }

    setLoading(true)
    setError('')
    try {
      const { data, error: qErr } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (qErr) throw qErr
      setCompanies(data || [])
    } catch (err) {
      console.error('Error fetching companies:', err)
      setError(err.message || 'Error fetching company list from database.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  // Open detail modal and load signed URL for proof document
  const handleOpenDetail = async (company) => {
    setSelectedCompany(company)
    setDocSignedUrl(null)

    if (company.proof_doc_path) {
      setLoadingDoc(true)
      try {
        const url = await getCompanyDocSignedUrl(company.proof_doc_path)
        setDocSignedUrl(url)
      } catch (err) {
        console.warn('Could not generate signed URL:', err)
      } finally {
        setLoadingDoc(false)
      }
    }
  }

  // Update company status (e.g. approve, suspend)
  const handleUpdateStatus = async (companyId, newStatus) => {
    setActionLoading(true)
    try {
      if (isSupabaseConfigured) {
        // Update company status safely (companies table uses status and optional updated_at)
        const updatePayload = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        }

        let { error: updErr } = await supabase
          .from('companies')
          .update(updatePayload)
          .eq('id', companyId)

        // Fallback if updated_at is missing from schema
        if (updErr && updErr.message && updErr.message.includes('updated_at')) {
          const fallback = await supabase
            .from('companies')
            .update({ status: newStatus })
            .eq('id', companyId)
          updErr = fallback.error
        }

        if (updErr) throw updErr
      }

      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, status: newStatus } : c))
      )
      if (selectedCompany?.id === companyId) {
        setSelectedCompany((prev) => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      alert(`Failed to update status: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Company
  const handleDeleteCompany = async (companyId) => {
    if (!window.confirm('Are you sure you want to delete this company? This action is permanent.')) {
      return
    }
    setActionLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { error: delErr } = await supabase.from('companies').delete().eq('id', companyId)
        if (delErr) throw delErr
      }
      setCompanies((prev) => prev.filter((c) => c.id !== companyId))
      setSelectedCompany(null)
    } catch (err) {
      alert(`Failed to delete company: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (activeTab !== 'all' && c.status !== activeTab) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        return (
          (c.company_name || '').toLowerCase().includes(q) ||
          (c.contact_name || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.district || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [companies, activeTab, searchQuery])

  const counts = useMemo(() => {
    return {
      all: companies.length,
      pending: companies.filter((c) => c.status === 'pending').length,
      approved: companies.filter((c) => c.status === 'approved').length,
      suspended: companies.filter((c) => c.status === 'suspended').length,
    }
  }, [companies])

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchCompanies}
            className="text-xs px-3 py-1 bg-rose-900 rounded-lg text-white font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'border-emerald-500 bg-gray-900 text-white ring-1 ring-emerald-500/40'
              : 'border-gray-800 bg-gray-900/90 text-gray-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-gray-400">Total Companies</span>
          <p className="text-2xl sm:text-3xl font-black mt-1 text-white">{counts.all}</p>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'border-amber-500 bg-amber-950/40 text-amber-200 ring-1 ring-amber-500/40'
              : 'border-gray-800 bg-gray-900/90 text-amber-300'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-amber-400/80">Pending Review</span>
          <p className="text-2xl sm:text-3xl font-black mt-1 text-amber-300">{counts.pending}</p>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            activeTab === 'approved'
              ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500/40'
              : 'border-gray-800 bg-gray-900/90 text-emerald-300'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-emerald-400/80">Approved</span>
          <p className="text-2xl sm:text-3xl font-black mt-1 text-emerald-300">{counts.approved}</p>
        </button>

        <button
          onClick={() => setActiveTab('suspended')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            activeTab === 'suspended'
              ? 'border-rose-500 bg-rose-950/40 text-rose-200 ring-1 ring-rose-500/40'
              : 'border-gray-800 bg-gray-900/90 text-rose-300'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-rose-400/80">Suspended</span>
          <p className="text-2xl sm:text-3xl font-black mt-1 text-rose-300">{counts.suspended}</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto text-sm">
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'pending', label: `Pending (${counts.pending})` },
            { id: 'approved', label: `Approved (${counts.approved})` },
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
            placeholder="Search company, person, phone..."
            className="w-full pl-9 pr-4 py-2 text-sm border-2 border-gray-800 bg-gray-900 rounded-xl focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-950 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-400 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Company Name</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">District / Area</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-medium text-gray-300">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Building2 className="w-6 h-6 text-gray-600 mb-1" />
                      <p className="font-semibold text-gray-300">No company registrations found</p>
                      <p className="text-xs text-gray-500">
                        {companies.length === 0
                          ? 'No event companies have registered yet.'
                          : 'No companies match your search filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => handleOpenDetail(c)}
                    className="hover:bg-gray-800/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center font-bold text-xs shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{c.company_name}</p>
                          <p className="text-xs text-gray-500">
                            {c.years_in_business ? `${c.years_in_business} yrs in business` : 'New partner'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs font-semibold text-gray-300">
                      {c.company_type || 'Event Partner'}
                    </td>

                    <td className="py-3 px-4 text-xs sm:text-sm">
                      <span className="font-semibold text-gray-200">{c.district}</span>
                      {c.area && <span className="text-gray-400 text-xs block truncate">{c.area}</span>}
                    </td>

                    <td className="py-3 px-4 text-xs font-semibold text-gray-200">
                      {c.contact_name}
                    </td>

                    <td className="py-3 px-4 font-mono text-xs text-gray-300">
                      {c.phone}
                    </td>

                    <td className="py-3 px-4">
                      {c.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Approved</span>
                        </span>
                      )}
                      {c.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Pending Review</span>
                        </span>
                      )}
                      {c.status === 'suspended' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-300 bg-rose-950/70 border border-rose-700/60 px-2.5 py-0.5 rounded-full">
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                          <span>Suspended</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDetail(c)
                        }}
                        className="px-3 py-1.5 rounded-lg border border-gray-700 hover:border-emerald-500 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 transition-colors cursor-pointer"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border border-gray-800 text-gray-100">
            <button
              onClick={() => setSelectedCompany(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedCompany.company_name}</h3>
                <span className="text-xs text-gray-400">{selectedCompany.company_type} • {selectedCompany.district}</span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-6 bg-gray-950 p-4 rounded-2xl border border-gray-800">
              <div>
                <span className="text-gray-500 font-semibold block">Contact Person</span>
                <span className="text-white font-bold text-sm">{selectedCompany.contact_name}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block">Phone</span>
                <span className="text-white font-mono">{selectedCompany.phone}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block">WhatsApp</span>
                <span className="text-white font-mono">{selectedCompany.whatsapp || selectedCompany.phone}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block">Email</span>
                <span className="text-white">{selectedCompany.email || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block">GST Number</span>
                <span className="text-white font-mono">{selectedCompany.gst_number || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block">Full Address</span>
                <span className="text-white">{selectedCompany.full_address || selectedCompany.area || '—'}</span>
              </div>
            </div>

            {/* Proof Document section */}
            <div className="mb-6 p-4 rounded-2xl bg-gray-950 border border-gray-800">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Business Verification Proof
              </span>
              {selectedCompany.proof_doc_path ? (
                loadingDoc ? (
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>Generating secure signed document URL...</span>
                  </div>
                ) : docSignedUrl ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 font-mono truncate max-w-[280px]">
                      {selectedCompany.proof_doc_path}
                    </span>
                    <a
                      href={docSignedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Uploaded Document</span>
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-rose-400">Failed to load signed URL for document.</span>
                )
              ) : (
                <span className="text-xs text-gray-500">No proof document uploaded.</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => handleDeleteCompany(selectedCompany.id)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Company</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedCompany.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedCompany.id, 'approved')}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Company</span>
                  </button>
                )}

                {selectedCompany.status !== 'suspended' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedCompany.id, 'suspended')}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Suspend Company
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
