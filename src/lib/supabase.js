import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://euamrlqdpkzpnrhftjro.supabase.co'
const DEFAULT_SUPABASE_KEY = 'sb_publishable_966dmDHUvo_xg9rV7Hj0Hw_o5OdUncc'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() ||
  DEFAULT_SUPABASE_URL

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  DEFAULT_SUPABASE_KEY

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project')
)

const safeUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co'
const safeAnonKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key'

export const supabase = createClient(safeUrl, safeAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export const supabaseAnon = createClient(safeUrl, safeAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

/**
 * Helper to obtain the public URL of a worker photo from the 'photos' bucket
 */
export function getPhotoPublicUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }
  if (!isSupabaseConfigured) {
    return null
  }
  const { data } = supabase.storage.from('photos').getPublicUrl(path)
  return data?.publicUrl || null
}

/**
 * Helper to obtain a signed URL for private ID proof files (admin only)
 */
export async function getIdProofSignedUrl(path, expiresIn = 3600) {
  if (!path) return { url: null, error: 'No path provided' }
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return { url: path, error: null }
  }
  if (!isSupabaseConfigured) {
    return { url: null, error: 'Supabase is not configured' }
  }

  const { data, error } = await supabase.storage
    .from('id-proofs')
    .createSignedUrl(path, expiresIn)

  if (error) {
    return { url: null, error: error.message }
  }
  return { url: data.signedUrl, error: null }
}

/**
 * Check live connection status to Supabase
 */
export async function checkDatabaseConnection() {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      configured: false,
      message: 'Supabase credentials missing (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY)',
      url: supabaseUrl || null,
    }
  }

  try {
    const start = performance.now()
    const { error, status } = await supabase.from('workers').select('id', { count: 'exact', head: true })
    const latency = Math.round(performance.now() - start)

    if (error && status !== 200 && status !== 406 && status !== 0) {
      if (error.code === '42P01') {
        return {
          connected: true,
          configured: true,
          tableMissing: true,
          latency,
          message: 'Connected to Supabase (workers table not found - run schema.sql)',
          url: supabaseUrl,
        }
      }
      return {
        connected: false,
        configured: true,
        latency,
        message: error.message || 'Database connection error',
        url: supabaseUrl,
      }
    }

    return {
      connected: true,
      configured: true,
      latency,
      message: `Active & connected (${latency}ms)`,
      url: supabaseUrl,
    }
  } catch (err) {
    return {
      connected: false,
      configured: true,
      message: err.message || 'Unable to connect to database',
      url: supabaseUrl,
    }
  }
}

/**
 * Helper to obtain a signed URL for private company documents
 */
export async function getCompanyDocSignedUrl(path, expiresIn = 3600) {
  if (!path) return { url: null, error: 'No path provided' }
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return { url: path, error: null }
  }

  if (!isSupabaseConfigured) {
    return { url: null, error: 'Supabase is not configured' }
  }

  const { data, error } = await supabase.storage
    .from('company-docs')
    .createSignedUrl(path, expiresIn)

  if (error) {
    return { url: null, error: error.message }
  }

  return { url: data.signedUrl, error: null }
}

/**
 * Publish auto-verification receipt for a newly registered worker so public status/QR pages
 * immediately reflect Verified status even before an admin session promotes the DB row,
 * and attempt optional auto_verify_worker RPC if deployed.
 */
export async function publishAutoVerifyReceipt(workerCode, verifiedAt = new Date().toISOString()) {
  if (!workerCode || !isSupabaseConfigured) return
  const cleanCode = workerCode.trim().toUpperCase()

  try {
    await supabaseAnon.rpc('auto_verify_worker', { p_worker_code: cleanCode })
  } catch {
    // Optional RPC may not be migrated yet
  }

  try {
    const payload = new Blob(
      [JSON.stringify({ worker_code: cleanCode, status: 'verified', verified_at: verifiedAt })],
      { type: 'application/json' }
    )
    await supabaseAnon.storage
      .from('photos')
      .upload(`auto_verified/${cleanCode}.json`, payload, {
        cacheControl: '60',
        upsert: false,
        contentType: 'application/json',
      })
  } catch {
    // Ignore if receipt already exists
  }
}

/**
 * Remove auto-verification receipt (used when an admin explicitly sets a worker back to pending or suspended)
 */
export async function removeAutoVerifyReceipt(workerCode) {
  if (!workerCode || !isSupabaseConfigured) return
  const cleanCode = workerCode.trim().toUpperCase()
  try {
    await supabase.storage.from('photos').remove([`auto_verified/${cleanCode}.json`])
  } catch {
    // Ignore storage cleanup errors
  }
}

/**
 * Resolve effective worker verification status using auto-verification receipt when DB row is still 'pending'
 */
export async function resolveEffectiveWorkerStatus(worker) {
  if (!worker || worker.status !== 'pending' || !worker.worker_code || !isSupabaseConfigured) {
    return worker
  }

  const cleanCode = worker.worker_code.trim().toUpperCase()
  const receiptUrl = getPhotoPublicUrl(`auto_verified/${cleanCode}.json`)
  if (!receiptUrl) return worker

  try {
    const res = await fetch(`${receiptUrl}?t=${Date.now()}`, { method: 'GET' })
    if (res.ok) {
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json') || contentType.includes('text/plain')) {
        const data = await res.json()
        if (data && data.status === 'verified') {
          return {
            ...worker,
            status: 'verified',
            verified_at: data.verified_at || worker.verified_at || new Date().toISOString(),
          }
        }
      }
    }
  } catch {
    // Fallback to DB worker status
  }

  return worker
}


