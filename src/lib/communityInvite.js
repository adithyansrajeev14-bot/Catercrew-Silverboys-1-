import { COMMUNITY_WHATSAPP_LINK } from './constants'
import { supabase, isSupabaseConfigured, getPhotoPublicUrl } from './supabase'

const INVITED_STORAGE_KEY = 'catercrew_community_invited_v1'
const TEMPLATE_STORAGE_KEY = 'catercrew_community_template_v1'
const LINK_STORAGE_KEY = 'catercrew_community_link_v1'
const CLOUD_INVITED_PATH = 'community/invited_workers.json'

export const DEFAULT_COMMUNITY_MESSAGE_TEMPLATE = `*Welcome to CaterCrew Kerala!* 🎉

Hi *{name}*,
Your CaterCrew Silver Boy registration (*{worker_code}*) is officially *Verified* ✅

Join our official *CaterCrew Silver Boys WhatsApp Community* to get priority event bookings, shift schedules, and instant updates in *{district}* and across Kerala:

👉 *Join Official Community*:
{community_link}

🪪 *Your Official Digital ID & QR Badge*:
{status_url}

— *Team CaterCrew Operations*`

/**
 * Normalize Indian/international phone numbers for wa.me links
 */
export function formatWhatsAppPhone(rawPhone) {
  if (!rawPhone) return ''
  let phone = String(rawPhone).replace(/[^\d+]/g, '')
  if (phone.startsWith('+')) {
    phone = phone.slice(1)
  }
  if (phone.startsWith('0') && phone.length === 11) {
    phone = '91' + phone.slice(1)
  } else if (phone.length === 10) {
    phone = '91' + phone
  }
  return phone.replace(/\D/g, '')
}

/**
 * Build personalized WhatsApp direct-message URL for a single worker
 */
export function buildWorkerCommunityWhatsAppUrl(worker, options = {}) {
  if (!worker) return null
  const targetPhone = formatWhatsAppPhone(worker.whatsapp || worker.phone)
  if (!targetPhone || targetPhone.length < 10) return null

  const communityLink = (options.communityLink || getSavedCommunityLink()).trim()
  const template = options.template || getSavedCommunityTemplate()
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://silver.catercrew.online'
  const cleanCode = (worker.worker_code || '').trim()
  const statusUrl = cleanCode ? `${origin}/status/${cleanCode}` : `${origin}/status`

  const message = template
    .replace(/\{name\}/g, (worker.full_name || 'Silver Boy').trim())
    .replace(/\{worker_code\}/g, cleanCode || 'CC-SLV')
    .replace(/\{district\}/g, (worker.district || 'Kerala').trim())
    .replace(/\{community_link\}/g, communityLink)
    .replace(/\{status_url\}/g, statusUrl)

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
}

export function getSavedCommunityLink() {
  try {
    const saved = localStorage.getItem(LINK_STORAGE_KEY)
    return saved && saved.trim() ? saved.trim() : COMMUNITY_WHATSAPP_LINK
  } catch {
    return COMMUNITY_WHATSAPP_LINK
  }
}

export function saveCommunityLink(link) {
  try {
    if (!link || link.trim() === COMMUNITY_WHATSAPP_LINK) {
      localStorage.removeItem(LINK_STORAGE_KEY)
    } else {
      localStorage.setItem(LINK_STORAGE_KEY, link.trim())
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getSavedCommunityTemplate() {
  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY)
    return saved && saved.trim() ? saved : DEFAULT_COMMUNITY_MESSAGE_TEMPLATE
  } catch {
    return DEFAULT_COMMUNITY_MESSAGE_TEMPLATE
  }
}

export function saveCommunityTemplate(template) {
  try {
    if (!template || template === DEFAULT_COMMUNITY_MESSAGE_TEMPLATE) {
      localStorage.removeItem(TEMPLATE_STORAGE_KEY)
    } else {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, template)
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getLocalCommunityInvitedMap() {
  try {
    const raw = localStorage.getItem(INVITED_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveLocalCommunityInvitedMap(map) {
  try {
    localStorage.setItem(INVITED_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Ignore storage errors
  }
}

async function syncInvitedMapToCloud(map) {
  if (!isSupabaseConfigured) return
  try {
    const blob = new Blob([JSON.stringify(map)], { type: 'application/json' })
    await supabase.storage.from('photos').upload(CLOUD_INVITED_PATH, blob, {
      cacheControl: '30',
      upsert: true,
      contentType: 'application/json',
    })
  } catch {
    // Non-fatal if bucket policy restricts overwrite
  }
}

export async function loadMergedCommunityInvitedMap() {
  const localMap = getLocalCommunityInvitedMap()
  if (!isSupabaseConfigured) return localMap

  try {
    const publicUrl = getPhotoPublicUrl(CLOUD_INVITED_PATH)
    if (!publicUrl) return localMap
    const res = await fetch(`${publicUrl}?t=${Date.now()}`)
    if (!res.ok) return localMap
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
      return localMap
    }
    const cloudMap = await res.json()
    if (cloudMap && typeof cloudMap === 'object') {
      const merged = { ...cloudMap, ...localMap }
      saveLocalCommunityInvitedMap(merged)
      return merged
    }
  } catch {
    // Fallback to local map
  }
  return localMap
}

export function markWorkerInvited(workerCode, existingMap = null) {
  if (!workerCode) return existingMap || getLocalCommunityInvitedMap()
  const key = workerCode.trim().toUpperCase()
  const base = existingMap || getLocalCommunityInvitedMap()
  const updated = {
    ...base,
    [key]: new Date().toISOString(),
  }
  saveLocalCommunityInvitedMap(updated)
  syncInvitedMapToCloud(updated)
  return updated
}

export function unmarkWorkerInvited(workerCode, existingMap = null) {
  if (!workerCode) return existingMap || getLocalCommunityInvitedMap()
  const key = workerCode.trim().toUpperCase()
  const base = { ...(existingMap || getLocalCommunityInvitedMap()) }
  delete base[key]
  saveLocalCommunityInvitedMap(base)
  syncInvitedMapToCloud(base)
  return base
}
