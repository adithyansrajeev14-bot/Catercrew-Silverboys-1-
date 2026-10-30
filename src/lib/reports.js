/**
 * Event Reports & Attendance Management Service
 * Features:
 * 1. Clean, short links (/r/:token) with cross-device cloud persistence
 * 2. Real-time Supabase cloud synchronization (Storage + Database)
 * 3. Event Access Password / PIN protection configured in Admin panel
 * 4. Offline & local storage fallback
 */
import { supabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = 'catercrew_event_reports_v1'

// Default seed reports for demonstration & testing
export const DEFAULT_REPORTS = [
  {
    id: 'rep_kch_101',
    token: 'cs782',
    eventName: 'Royal Heritage Wedding Reception',
    eventCompany: 'Grandeur Event Planners, Kochi',
    contactPerson: 'Rahul Menon',
    whatsappNumber: '+919847123456',
    accessPassword: '4821',
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
    token: 'ml991',
    eventName: 'Malabar Culinary Expo & Banquet',
    eventCompany: 'Eminence Events & Catering',
    contactPerson: 'Sajid K M',
    whatsappNumber: '+919744112233',
    accessPassword: '5520',
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
 * Generate a random 4-digit PIN
 */
export function generateRandomPin() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

/**
 * Generate a super short, clean slug token (e.g. 'c7x9p')
 */
export function generateShortToken() {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz'
  let res = ''
  for (let i = 0; i < 5; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return res
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
 * Synchronize report state to Supabase (Cloud Storage in 'photos' bucket + 'event_reports' table).
 * This ensures ANY phone or computer across the world can fetch the short link.
 */
export async function syncReportToCloud(report) {
  if (!isSupabaseConfigured || !report) return

  // 1. Upload JSON file to Supabase Storage ('photos' bucket: reports/<token>.json)
  try {
    const jsonBlob = new Blob([JSON.stringify(report)], { type: 'application/json' })
    const storagePath = `reports/${report.token}.json`
    await supabase.storage.from('photos').upload(storagePath, jsonBlob, {
      upsert: true,
      cacheControl: '60',
      contentType: 'application/json',
    })
  } catch (err) {
    console.warn('Supabase storage upload error:', err)
  }

  // 2. Also upsert into 'event_reports' SQL table if table exists
  try {
    await supabase.from('event_reports').upsert({
      id: report.id,
      token: report.token,
      event_name: report.eventName,
      event_company: report.eventCompany,
      contact_person: report.contactPerson,
      whatsapp_number: report.whatsappNumber,
      access_password: report.accessPassword || '',
      event_date: report.eventDate,
      shift_time: report.shiftTime,
      venue: report.venue,
      district: report.district,
      required_count: report.requiredCount,
      supervisor_phone: report.supervisorPhone,
      company_notes: report.companyNotes,
      assigned_workers: report.assignedWorkers,
      attendance: report.attendance,
      status: report.status,
      shortage_reported: report.shortageReported,
      shortage_count: report.shortageCount,
      shortage_reason: report.shortageReason,
      shortage_resolved: report.shortageResolved,
      updated_at: new Date().toISOString(),
    })
  } catch {
    // Graceful fallback if table is not migrated yet
  }
}

/**
 * Decode URL payload if present (for backward compatibility with old links)
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
      accessPassword: compact.pw || '',
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
 * Synchronously find an event report by token or ID from local device
 */
export function getEventReportByToken(tokenOrId) {
  if (!tokenOrId) return null

  // 1. Check if the URL currently open in browser contains legacy payload ?d= or ?data=
  if (typeof window !== 'undefined' && window.location) {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('d') || params.get('data')
    if (encoded) {
      const decoded = decodeReportPayload(encoded)
      if (decoded) {
        saveSingleReportLocally(decoded)
        return decoded
      }
    }
  }

  // 2. Check localStorage
  const reports = getEventReports()
  const clean = tokenOrId.toLowerCase().trim()
  const found = reports.find(
    (r) =>
      r.token?.toLowerCase() === clean ||
      r.id?.toLowerCase() === clean ||
      clean.endsWith(r.token?.toLowerCase()) ||
      r.token?.toLowerCase().endsWith(clean)
  )
  if (found) return found

  return null
}

/**
 * Asynchronously fetch an event report across devices via Supabase Storage / Database
 */
export async function fetchEventReportAsync(tokenOrId) {
  if (!tokenOrId) return null
  const clean = tokenOrId.toLowerCase().trim()

  // 1. Check local device first
  const local = getEventReportByToken(clean)
  if (local) return local

  // If Supabase is available, query Supabase Storage
  if (isSupabaseConfigured) {
    // 2. Fetch from Supabase Storage 'photos' bucket: reports/${clean}.json
    try {
      const { data: fileData, error: fileErr } = await supabase.storage
        .from('photos')
        .download(`reports/${clean}.json`)

      if (!fileErr && fileData) {
        const text = await fileData.text()
        const parsed = JSON.parse(text)
        if (parsed && (parsed.token || parsed.id)) {
          saveSingleReportLocally(parsed)
          return parsed
        }
      }
    } catch (err) {
      console.warn('Storage fetch error:', err)
    }

    // 3. Fetch from 'event_reports' table
    try {
      const { data, error } = await supabase
        .from('event_reports')
        .select('*')
        .or(`token.eq.${clean},id.eq.${clean}`)
        .maybeSingle()

      if (!error && data) {
        const mapped = mapSupabaseToReport(data)
        saveSingleReportLocally(mapped)
        return mapped
      }
    } catch (err) {
      console.warn('Table fetch error:', err)
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
    accessPassword: row.access_password || '',
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
 * Create a new Event Report with short token & password protection
 */
export function createEventReport(data) {
  const reports = getEventReports()
  // Clean short token (e.g. csgj3)
  const token = generateShortToken()
  const id = `rep_${Date.now().toString().slice(-6)}_${token}`

  const newReport = {
    id,
    token,
    eventName: data.eventName.trim(),
    eventCompany: data.eventCompany.trim(),
    contactPerson: data.contactPerson?.trim() || '',
    whatsappNumber: data.whatsappNumber.replace(/[\s-]/g, ''),
    accessPassword: data.accessPassword ? data.accessPassword.trim() : generateRandomPin(),
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

  // Sync to Cloud asynchronously so any mobile device can open it immediately
  syncReportToCloud(newReport)

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
  syncReportToCloud(updatedReport)

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
  syncReportToCloud(updatedReport)

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
  syncReportToCloud(updatedReport)

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
  syncReportToCloud(updatedReport)

  return updatedReport
}

/**
 * Delete / Archive an event report
 */
export function deleteEventReport(id) {
  const reports = getEventReports()
  const target = reports.find((r) => r.id === id || r.token === id)
  const updated = reports.filter((r) => r.id !== id && r.token !== id)
  saveEventReports(updated)

  if (isSupabaseConfigured && target) {
    supabase.storage.from('photos').remove([`reports/${target.token}.json`]).catch(() => {})
    supabase.from('event_reports').delete().eq('id', id).catch(() => {})
  }

  return updated
}

/**
 * Super Short Portal URL:
 * e.g. https://silver.catercrew.online/r/csgj3
 */
export function getReportPortalUrl(report) {
  if (!report) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/r/${report.token}`
}

/**
 * Generate formatted WhatsApp dispatch URL with short link & Access PIN
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
    `Here is your official staff reporting link for:`,
    `📍 *Event*: ${report.eventName}`,
    `🏢 *Venue*: ${report.venue} (${report.district})`,
    `📅 *Date*: ${report.eventDate}`,
    `⏰ *Shift / Reporting Time*: ${report.shiftTime}`,
    `👥 *Expected Catering Boys*: ${report.requiredCount} Staff`,
    ``,
    `👉 *Open Attendance Portal*:`,
    `${portalUrl}`,
    report.accessPassword ? `🔒 *Access PIN*: *${report.accessPassword}*` : '',
    ``,
    `📌 *Instructions for Event Coordinator*:`,
    `1. Click the link above to open the portal.`,
    report.accessPassword ? `2. Enter Access PIN *${report.accessPassword}* to unlock.` : '2. Open portal.',
    `3. Tap *Mark Present* as each catering boy reports on site.`,
    `4. If any boy is late or missing, tap *Report Shortage* so our team can deploy immediate standby staff.`,
    ``,
    `CaterCrew 24/7 Operations Helpline: ${report.supervisorPhone || '+91 94000 88221'}`,
  ]
    .filter(Boolean)
    .join('\n')

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
