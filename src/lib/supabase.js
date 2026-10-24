import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project')
)

// Fallback dummy URL so createClient doesn't throw a fatal module evaluation error
// if the developer opens the app before configuring their .env file
const safeUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co'
const safeAnonKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key'

export const supabase = createClient(safeUrl, safeAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
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

