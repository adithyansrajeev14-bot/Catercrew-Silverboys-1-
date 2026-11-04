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

// In-memory caches to prevent redundant URL recalculations & API requests
const publicUrlCache = new Map()
const signedUrlCache = new Map()

/**
 * Helper to obtain the public URL of a worker photo from the 'photos' bucket (memoized)
 */
export function getPhotoPublicUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }
  if (publicUrlCache.has(path)) {
    return publicUrlCache.get(path)
  }
  if (!isSupabaseConfigured) {
    return null
  }
  const { data } = supabase.storage.from('photos').getPublicUrl(path)
  const url = data?.publicUrl || null
  if (url) {
    publicUrlCache.set(path, url)
  }
  return url
}

/**
 * Get optimal photo URL for worker (thumbnail for lists, 600px for details/certificate)
 */
export function getWorkerPhotoUrl(worker, useThumbnail = false) {
  if (!worker) return null
  const targetPath = useThumbnail
    ? (worker.photo_thumb_path || worker.photo_path)
    : (worker.photo_path || worker.photo_thumb_path)
  return getPhotoPublicUrl(targetPath)
}

/**
 * Helper to obtain a signed URL for private ID proof files with caching and 24h default expiry
 */
export async function getIdProofSignedUrl(path, expiresIn = 86400) {
  if (!path) return { url: null, error: 'No path provided' }
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return { url: path, error: null }
  }

  const cacheKey = `id-proofs:${path}:${expiresIn}`
  const cached = signedUrlCache.get(cacheKey)
  // Check if cache is still fresh (buffer of 60 seconds)
  if (cached && Date.now() < cached.expiresAt - 60000) {
    return { url: cached.url, error: null }
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

  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: Date.now() + expiresIn * 1000,
  })

  return { url: data.signedUrl, error: null }
}

/**
 * Helper to obtain a signed URL for private company documents with caching and 24h default expiry
 */
export async function getCompanyDocSignedUrl(path, expiresIn = 86400) {
  if (!path) return { url: null, error: 'No path provided' }
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return { url: path, error: null }
  }

  const cacheKey = `company-docs:${path}:${expiresIn}`
  const cached = signedUrlCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt - 60000) {
    return { url: cached.url, error: null }
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

  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: Date.now() + expiresIn * 1000,
  })

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

