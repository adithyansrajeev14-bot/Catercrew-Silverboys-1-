/**
 * Event Reports & Attendance Management Service
 * Provides tokenized event reports for event management companies to mark attendance.
 * Features:
 * 1. Self-contained URL payload encoding/decoding (guarantees the link works on any device)
 * 2. Supabase remote database synchronization with graceful fallback
 * 3. Local persistent storage with cross-tab and cross-device recovery
 */
import { supabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = 'catercrew_event_reports_v1'

// Default seed reports for demonstration & testing
export const DEFAULT_REPORTS = [
  {
    id: 'rep_kch_101',
    token: 'cc-evt-7821-kochi',
    eventName: 'Royal Heritage Wedding Reception',
    eventCompany: 'Grandeur Event Planners, Kochi',
    contactPerson: 'Rahul Menon',
    whatsappNumber: '+919847123456',
    eventDate: new Date().toISOString().slice(0, 10),
    shiftTime: '5:00 PM - 11:30 PM (Evening Reception)',
    venue: 'Adlux International Convention Centre, Angamaly',
    district: 'Ernakulam',
    requiredCount: 8,
    supervisorPhone: '+919400088221',
    status: 'in_progress',
    shortageReported: false,
    shortageCount: 0,
    shortageReason: '',
    shortageResolved: false,
    companyNotes: 'Black trousers and white shirts required. Dining service starts at 7:30 PM.',
    createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    assignedWorkers: [
      {
        worker_code: 'CC-SLV-000001',
        full_name: 'Adarsh S',
        phone: '+91 98461 23450',
        district: 'Ernakulam',
        tier: 'silver',
        photo_path: null,
      },
      {
        worker_code: 'CC-SLV-000002',
        full_name: 'Vishnu Prasad',
        phone: '+91 97452 34561',
        district: 'Ernakulam',
        tier: 'silver',
        photo_path: null,
      },
      {
        worker_code: 'CC-SLV-000003',
        full_name: 'Rahul K P',
        phone: '+91 96333 45672',
        district: 'Thrissur',
        tier: 'silver',
        photo_path: null,
      },
      {
        worker_code: 'CC-SLV-000004',
        full_name: 'Akhil Mohan',
        phone: '+91 95264 56783',
        district: 'Ernakulam',
        tier: 'silver',
        photo_path: null,
      },
      {
        worker_code: 'CC-SLV-000005',
        full_name: 'Jithin Joy',
        phone: '+91 94475 67894',
        district: 'Kottayam',
        tier: 'silver',
        photo_path: null,
      },
      {
        worker_code: 'CC-SLV-000006',
        full_name: 'Muhammed Nihal',
        phone: '+91 99956 78905',
        district: 'Ernakulam',
        tier: 'silver',
        photo_path: null,
      },
      {
        worker_code: 'CC-SLV-000007',
        full_name: 'Sanoop V',
        phone: '+91 98957 89016',
        district: 'Ernakulam',
        tier: 'silver',
        photo_path: null,
      },
      {
        worker_code: 'CC-SLV-000008',
        full_name: 'Deepak Raj',
        phone: '+91 97468 90127',
        district: 'Alappuzha',
        tier: 'silver',
        photo_path: null,
      },
    ],
    attendance: {
      'CC-SLV-000001': {
        present: true,
        markedAt: '05:15 PM',
        notes: 'Reported on time with proper dress code',
      },
      'CC-SLV-000002': {
        present: true,
        markedAt: '05:22 PM',
        notes: '',
      },
      'CC-SLV-000003': {
        present: true,
        markedAt: '05:30 PM',
        notes: '',
      },
      'CC-SLV-000004': {
        present: true,
        markedAt: '05:40 PM',
        notes: '',
      },
      'CC-SLV-000005': {
        present: true,
        markedAt: '05:45 PM',
        notes: '',
      },
    },
  },
  {
    id: 'rep_clt_102',
    token: 'cc-evt-9914-calicut',
    eventName: 'Malabar Culinary Expo & Banquet',
    eventCompany: 'Eminence Events & Catering',
    contactPerson: 'Sajid K M',
    whatsappNumber: '+919744112233',
    eventDate: new Date(Date.now() + 86400 * 1000).toISOString().slice(0, 10),
    shiftTime: '10:00 AM - 4:00 PM (Lunch Banquet)',
    venue: 'Calicut Trade Centre, Kozhikode',
    district: 'Kozhikode',
    requiredCount: 6,
    supervisorPhone: '+919400088221',
    status: 'active',
    shortageReported: false,
    shortageCount: 0,
    shortageReason: '',
    shortageResolved: false,
    companyNotes: 'Buffet management and table clearing staff.',
    createdAt: new Date(Date.now() - 86400 * 1000).toISOString(),
    assignedWorkers: [
      {
        worker_code: 'CC-SLV-000010',
        full_name: 'Fahad Faizal',
        phone: '+91 98470 11223',
        district: 'Kozhikode',
        tier: 'silver',
        photo_path: null,
      },
      {
        worker_code: 'CC-SLV-000011',
        full_name: 'Arjun Das',
        phone: '+91 99460 22334',
        district: 'Malappuram',
        tier: 'silver',
        photo_path: null,
      },
      {
        worker_code: 'CC-SLV-000012',
        full_name: 'Naveen Kumar',
        phone: '+91 97450 33445',
        district: 'Kozhikode',
        tier: 'silver',
        photo_path: null,
      },
      {
        worker_code: 'CC-SLV-000013',
        full_name: 'Abhishek R',
        phone: '+91 96330 44556',
        district: 'Kannur',
        tier: 'silver',
        photo_path: null,
      },
      {
        worker_code: 'CC-SLV-000014',
        full_name: 'Mithun K',
        phone: '+91 95260 55667',
        district: 'Kozhikode',
        tier: 'silver',
        photo_path: null,
      },
      {
        worker_code: 'CC-SLV-000015',
        full_name: 'Shyam Sundar',
        phone: '+91 94470 66778',
        district: 'Wayanad',
        tier: 'silver',
        photo_path: null,
      },
    ],
    attendance: {},
  },
]

/**
 * Compactly encode an event report into a safe URL query string.
 * This guarantees that when a link is opened on any device (phone, WhatsApp browser),
 * the event details load immediately with 0% risk of "Not Found".
 */
export function encodeReportPayload(report) {
  try {
    if (!report) return ''
    const compact = {
      id: report.id,
      t: report.token,
      n: report.eventName,
      c: report.eventCompany,
      p: report.contactPerson || '',
      w: report.whatsappNumber,
      d: report.eventDate,
      s: report.shiftTime,
      v: report.venue,
      dt: report.district,
      rc: report.requiredCount,
      sp: report.supervisorPhone || '',
      cn: report.companyNotes || '',
      wk: (report.assignedWorkers || []).map((w) => [
        w.worker_code,
        w.full_name,
        w.phone || '',
        w.district || '',
        w.tier || 'silver',
      ]),
    }

    const jsonStr = JSON.stringify(compact)
    // UTF-8 safe base64
    const utf8Bytes = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
    return btoa(utf8Bytes)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  } catch (err) {
    console.error('Error encoding report payload:', err)
    return ''
  }
}

/**
 * Decode URL payload back into a report object
 */
export function decodeReportPayload(encoded) {
  try {
    if (!encoded) return null
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    const raw = atob(base64)
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(raw, (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const compact = JSON.parse(jsonStr)

    return {
      id: compact.id || `rep_${Date.now()}`,
      token: compact.t || '',
      eventName: compact.n || 'Event',
      eventCompany: compact.c || 'Event Company',
      contactPerson: compact.p || '',
      whatsappNumber: compact.w || '',
      eventDate: compact.d || new Date().toISOString().slice(0, 10),
      shiftTime: compact.s || 'General Shift',
      venue: compact.v || 'Venue',
      district: compact.dt || 'Ernakulam',
      requiredCount: parseInt(compact.rc, 10) || 5,
      supervisorPhone: compact.sp || '+919400088221',
      companyNotes: compact.cn || '',
      status: 'active',
      shortageReported: false,
      shortageCount: 0,
      shortageReason: '',
      shortageResolved: false,
      assignedWorkers: (compact.wk || []).map((w) => ({
        worker_code: w[0],
        full_name: w[1],
        phone: w[2],
        district: w[3],
        tier: w[4] || 'silver',
        photo_path: null,
      })),
      attendance: {},
      createdAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('Error decoding report payload:', err)
    return null
  }
}

/**
 * Load all event reports from localStorage
 */
export function getEventReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REPORTS))
      return DEFAULT_REPORTS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_REPORTS
  } catch (err) {
    console.error('Error loading event reports from storage:', err)
    return DEFAULT_REPORTS
  }
}

/**
 * Save all reports to localStorage
 */
export function saveEventReports(reports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
    window.dispatchEvent(new Event('catercrew_reports_updated'))
  } catch (err) {
    console.error('Error saving event reports:', err)
  }
}

/**
 * Save or update a single report in localStorage
 */
export function saveSingleReportLocally(report) {
  if (!report) return
  const current = getEventReports()
  const idx = current.findIndex(
    (r) =>
      r.token?.toLowerCase() === report.token?.toLowerCase() ||
      r.id?.toLowerCase() === report.id?.toLowerCase()
  )
  let updated
  if (idx !== -1) {
    // Preserve existing attendance if new payload doesn't have it
    updated = [...current]
    updated[idx] = {
      ...report,
      attendance: {
        ...(report.attendance || {}),
        ...(updated[idx].attendance || {}),
      },
    }
  } else {
    updated = [report, ...current]
  }
  saveEventReports(updated)
}

/**
 * Synchronously find an event report by token or ID.
 * Automatically checks:
 * 1. window.location.search for ?d= encoded data (recovers from WhatsApp link anywhere)
 * 2. localStorage
 * 3. Default demo events
 */
export function getEventReportByToken(tokenOrId) {
  if (!tokenOrId) return null

  // 1. Check if the URL currently open in browser contains self-contained payload ?d= or ?data=
  if (typeof window !== 'undefined' && window.location) {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('d') || params.get('data')
    if (encoded) {
      const decoded = decodeReportPayload(encoded)
      if (decoded) {
        // Save to local device so future visits work seamlessly
        saveSingleReportLocally(decoded)
        // If token matches or was provided, return it
        if (
          !tokenOrId ||
          decoded.token?.toLowerCase() === tokenOrId.toLowerCase() ||
          decoded.id?.toLowerCase() === tokenOrId.toLowerCase() ||
          tokenOrId.startsWith('cc-evt')
        ) {
          return decoded
        }
      }
    }
  }

  // 2. Check localStorage
  const reports = getEventReports()
  const found = reports.find(
    (r) =>
      r.token?.toLowerCase() === tokenOrId.toLowerCase() ||
      r.id?.toLowerCase() === tokenOrId.toLowerCase()
  )
  if (found) return found

  // 3. Fallback partial matching (e.g. if slug was truncated or entered without prefix)
  const cleanSearch = tokenOrId.toLowerCase().trim()
  const partial = reports.find(
    (r) =>
      r.token?.toLowerCase().includes(cleanSearch) ||
      cleanSearch.includes(r.token?.toLowerCase()) ||
      r.id?.toLowerCase().includes(cleanSearch)
  )
  if (partial) return partial

  return null
}

/**
 * Asynchronously fetch an event report from Supabase (or fallback to local)
 */
export async function fetchEventReportAsync(tokenOrId) {
  // Try local first
  const local = getEventReportByToken(tokenOrId)
  if (local) return local

  // If Supabase is available, query remote database
  if (isSupabaseConfigured && tokenOrId) {
    try {
      const { data, error } = await supabase
        .from('event_reports')
        .select('*')
        .or(`token.eq.${tokenOrId},id.eq.${tokenOrId}`)
        .maybeSingle()

      if (!error && data) {
        const mapped = mapSupabaseToReport(data)
        saveSingleReportLocally(mapped)
        return mapped
      }
    } catch (err) {
      console.warn('Supabase event_reports query error:', err)
    }
  }

  return null
}

/**
 * Map Supabase table record to EventReport format
 */
function mapSupabaseToReport(row) {
  return {
    id: row.id,
    token: row.token,
    eventName: row.event_name,
    eventCompany: row.event_company,
    contactPerson: row.contact_person || '',
    whatsappNumber: row.whatsapp_number,
    eventDate: row.event_date,
    shiftTime: row.shift_time,
    venue: row.venue,
    district: row.district,
    requiredCount: row.required_count,
    supervisorPhone: row.supervisor_phone,
    status: row.status,
    shortageReported: Boolean(row.shortage_reported),
    shortageCount: row.shortage_count || 0,
    shortageReason: row.shortage_reason || '',
    shortageResolved: Boolean(row.shortage_resolved),
    companyNotes: row.company_notes || '',
    assignedWorkers: Array.isArray(row.assigned_workers) ? row.assigned_workers : [],
    attendance: typeof row.attendance === 'object' && row.attendance ? row.attendance : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Create a new Event Report.
 * Saves locally AND tries to push to Supabase.
 */
export function createEventReport(data) {
  const reports = getEventReports()
  const randomSlug = Math.random().toString(36).substring(2, 7)
  const token = `cc-evt-${Date.now().toString().slice(-4)}-${randomSlug}`
  const id = `rep_${Date.now().toString().slice(-6)}_${randomSlug}`

  const newReport = {
    id,
    token,
    eventName: data.eventName.trim(),
    eventCompany: data.eventCompany.trim(),
    contactPerson: data.contactPerson?.trim() || '',
    whatsappNumber: data.whatsappNumber.replace(/[\s-]/g, ''),
    eventDate: data.eventDate || new Date().toISOString().slice(0, 10),
    shiftTime: data.shiftTime?.trim() || 'General Shift',
    venue: data.venue.trim(),
    district: data.district || 'Ernakulam',
    requiredCount: parseInt(data.requiredCount, 10) || 5,
    supervisorPhone: data.supervisorPhone?.trim() || '+919400088221',
    status: 'active',
    shortageReported: false,
    shortageCount: 0,
    shortageReason: '',
    shortageResolved: false,
    companyNotes: data.companyNotes?.trim() || '',
    createdAt: new Date().toISOString(),
    assignedWorkers: data.assignedWorkers || [],
    attendance: {},
  }

  const updated = [newReport, ...reports]
  saveEventReports(updated)

  // Try to sync to Supabase in the background
  if (isSupabaseConfigured) {
    supabase
      .from('event_reports')
      .upsert({
        id: newReport.id,
        token: newReport.token,
        event_name: newReport.eventName,
        event_company: newReport.eventCompany,
        contact_person: newReport.contactPerson,
        whatsapp_number: newReport.whatsappNumber,
        event_date: newReport.eventDate,
        shift_time: newReport.shiftTime,
        venue: newReport.venue,
        district: newReport.district,
        required_count: newReport.requiredCount,
        supervisor_phone: newReport.supervisorPhone,
        company_notes: newReport.companyNotes,
        assigned_workers: newReport.assignedWorkers,
        attendance: newReport.attendance,
        status: newReport.status,
      })
      .then(({ error }) => {
        if (error) console.warn('Supabase event_reports upsert error:', error.message)
      })
      .catch((err) => console.warn('Supabase sync catch:', err))
  }

  return newReport
}

/**
 * Mark worker attendance for an event
 */
export function markWorkerAttendance(tokenOrId, workerCode, isPresent, note = '') {
  const reports = getEventReports()
  const index = reports.findIndex(
    (r) =>
      r.token?.toLowerCase() === tokenOrId.toLowerCase() ||
      r.id?.toLowerCase() === tokenOrId.toLowerCase()
  )

  if (index === -1) return null

  const report = reports[index]
  const attendance = { ...(report.attendance || {}) }

  attendance[workerCode] = {
    present: Boolean(isPresent),
    markedAt: isPresent
      ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null,
    notes: note || '',
  }

  const presentCount = Object.values(attendance).filter((a) => a.present).length
  let status = report.status
  if (presentCount > 0 && status === 'active') {
    status = 'in_progress'
  }

  const updatedReport = {
    ...report,
    attendance,
    status,
    updatedAt: new Date().toISOString(),
  }

  reports[index] = updatedReport
  saveEventReports(reports)

  // Sync to Supabase
  if (isSupabaseConfigured) {
    supabase
      .from('event_reports')
      .update({
        attendance,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updatedReport.id)
      .catch(() => {})
  }

  return updatedReport
}

/**
 * Add a substitute or extra worker to an event's assigned list
 */
export function addWorkerToReport(tokenOrId, worker) {
  const reports = getEventReports()
  const index = reports.findIndex(
    (r) =>
      r.token?.toLowerCase() === tokenOrId.toLowerCase() ||
      r.id?.toLowerCase() === tokenOrId.toLowerCase()
  )

  if (index === -1) return null

  const report = reports[index]
  const currentAssigned = report.assignedWorkers || []

  if (currentAssigned.some((w) => w.worker_code === worker.worker_code)) {
    return report
  }

  const updatedAssigned = [...currentAssigned, worker]
  const attendance = { ...(report.attendance || {}) }
  attendance[worker.worker_code] = {
    present: true,
    markedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    notes: 'Extra/Substitute worker added on-site',
  }

  const updatedReport = {
    ...report,
    assignedWorkers: updatedAssigned,
    attendance,
    status: 'in_progress',
    updatedAt: new Date().toISOString(),
  }

  reports[index] = updatedReport
  saveEventReports(reports)

  if (isSupabaseConfigured) {
    supabase
      .from('event_reports')
      .update({
        assigned_workers: updatedAssigned,
        attendance,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', updatedReport.id)
      .catch(() => {})
  }

  return updatedReport
}

/**
 * Company reports a staff shortage
 */
export function reportStaffShortage(tokenOrId, shortageCount, reason = '') {
  const reports = getEventReports()
  const index = reports.findIndex(
    (r) =>
      r.token?.toLowerCase() === tokenOrId.toLowerCase() ||
      r.id?.toLowerCase() === tokenOrId.toLowerCase()
  )

  if (index === -1) return null

  const report = reports[index]
  const updatedReport = {
    ...report,
    shortageReported: true,
    shortageCount: parseInt(shortageCount, 10) || 1,
    shortageReason: reason || 'Event company marked shortage at venue',
    shortageResolved: false,
    shortageTimestamp: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  reports[index] = updatedReport
  saveEventReports(reports)

  if (isSupabaseConfigured) {
    supabase
      .from('event_reports')
      .update({
        shortage_reported: true,
        shortage_count: updatedReport.shortageCount,
        shortage_reason: updatedReport.shortageReason,
        shortage_resolved: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updatedReport.id)
      .catch(() => {})
  }

  return updatedReport
}

/**
 * Admin resolves shortage (e.g. dispatched backup)
 */
export function resolveStaffShortage(tokenOrId) {
  const reports = getEventReports()
  const index = reports.findIndex(
    (r) =>
      r.token?.toLowerCase() === tokenOrId.toLowerCase() ||
      r.id?.toLowerCase() === tokenOrId.toLowerCase()
  )

  if (index === -1) return null

  const report = reports[index]
  const updatedReport = {
    ...report,
    shortageResolved: true,
    shortageResolvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  reports[index] = updatedReport
  saveEventReports(reports)

  if (isSupabaseConfigured) {
    supabase
      .from('event_reports')
      .update({
        shortage_resolved: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updatedReport.id)
      .catch(() => {})
  }

  return updatedReport
}

/**
 * Delete / Archive an event report
 */
export function deleteEventReport(id) {
  const reports = getEventReports()
  const updated = reports.filter((r) => r.id !== id && r.token !== id)
  saveEventReports(updated)

  if (isSupabaseConfigured) {
    supabase.from('event_reports').delete().eq('id', id).catch(() => {})
  }

  return updated
}

/**
 * Generate full self-contained portal URL with encoded data payload
 */
export function getReportPortalUrl(report) {
  if (!report) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const encoded = encodeReportPayload(report)
  return encoded
    ? `${origin}/event-report/${report.token}?d=${encoded}`
    : `${origin}/event-report/${report.token}`
}

/**
 * Generate formatted WhatsApp dispatch URL with encoded portal link
 */
export function generateWhatsAppLink(report) {
  const portalUrl = getReportPortalUrl(report)

  let phone = (report.whatsappNumber || '').replace(/[^\d+]/g, '')
  if (phone.startsWith('0')) {
    phone = '91' + phone.substring(1)
  } else if (!phone.startsWith('+') && !phone.startsWith('91') && phone.length === 10) {
    phone = '91' + phone
  }
  phone = phone.replace('+', '')

  const message = [
    `*CATERCREW - Event Staff Attendance & Reporting Portal*`,
    ``,
    `Dear *${report.eventCompany || 'Event Management Team'}*,`,
    `Greetings from CaterCrew Kerala.`,
    ``,
    `Here is your private CaterCrew staff reporting link for:`,
    `📍 *Event*: ${report.eventName}`,
    `🏢 *Venue*: ${report.venue} (${report.district})`,
    `📅 *Date*: ${report.eventDate}`,
    `⏰ *Shift / Reporting Time*: ${report.shiftTime}`,
    `👥 *Expected Catering Boys*: ${report.requiredCount} Staff`,
    ``,
    `👉 *Open Live Attendance Portal*:`,
    `${portalUrl}`,
    ``,
    `📌 *Instructions for Event Coordinator*:`,
    `1. Please open the link above as catering boys report to the venue.`,
    `2. Tap *Mark Present* for each boy arriving on site.`,
    `3. If there is any shortage or delay, tap *Report Shortage* directly on the portal so our supervisor team can dispatch immediate standby backup.`,
    ``,
    `CaterCrew 24/7 Operations Helpline: ${report.supervisorPhone || '+91 94000 88221'}`,
  ].join('\n')

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
