import { AlertTriangle } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase'

export default function ConfigBanner() {
  if (isSupabaseConfigured) return null

  return (
    <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-start gap-3 text-sm text-emerald-950">
        <AlertTriangle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-900">Supabase is not configured yet</p>
          <p className="text-emerald-800 text-xs sm:text-sm mt-0.5">
            Add your <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
            <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> to the <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-xs">.env</code> file, and run the SQL in <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-xs">supabase/schema.sql</code> in your Supabase SQL editor.
          </p>
        </div>
      </div>
    </div>
  )
}
