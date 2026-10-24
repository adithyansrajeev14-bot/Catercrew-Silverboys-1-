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
