import { useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  CheckCircle2,
  Copy,
  Check,
  X,
  Key,
} from 'lucide-react'
import { GOOGLE_CLIENT_ID, SUPABASE_PROJECT_REF, SUPABASE_OAUTH_CALLBACK_URL } from '../lib/constants'

export default function GoogleOAuthErrorNotice({ onDismiss, onUseEmail }) {
  const [showGuide, setShowGuide] = useState(true)
  const [copiedField, setCopiedField] = useState(null)

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2500)
  }

  return (
    <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-gray-800 text-left shadow-xs transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base leading-snug">
              Google Sign-In needs 1 last step in Supabase
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
              Your Google Client ID is configured, but the Google Provider must be enabled with your Client Secret in your Supabase Dashboard.
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-amber-100/50 cursor-pointer transition-colors shrink-0"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Immediate Recommended Solution */}
      <div className="mt-4 p-3.5 bg-white rounded-xl border border-amber-200/80 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm text-gray-700">
            <strong className="text-gray-900 font-semibold">Instant Access: </strong>
            You can sign in and register right now using <strong>Email & Password</strong> without waiting!
          </div>
        </div>
        {onUseEmail && (
          <button
            type="button"
            onClick={onUseEmail}
            className="mt-2.5 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Use Email & Password Instead</span>
          </button>
        )}
      </div>

      {/* Accordion Guide: How to complete Google OAuth in Supabase */}
      <div className="mt-4 pt-3 border-t border-amber-200/60">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between text-xs font-bold text-amber-900 hover:text-amber-950 cursor-pointer py-1"
        >
          <span className="flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-700" />
            How to finish enabling Google Sign-In (2 minutes)
          </span>
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showGuide && (
          <div className="mt-3 text-xs text-gray-700 space-y-3 bg-white/80 p-3.5 rounded-xl border border-amber-200/60">
            {/* Step 1: Open Supabase */}
            <div className="flex items-start gap-2.5">
              <span className="font-bold text-amber-900 bg-amber-100 w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                1
              </span>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-gray-900">
                  Open Supabase Auth Providers:
                </p>
                <a
                  href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/providers`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold underline bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                >
                  <span>Open Supabase Google Provider Settings</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Step 2: Toggle & Paste Client ID */}
            <div className="flex items-start gap-2.5">
              <span className="font-bold text-amber-900 bg-amber-100 w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                2
              </span>
              <div className="flex-1 space-y-1.5">
                <p className="font-semibold text-gray-900">
                  Toggle <strong>Enable Sign in with Google</strong> to ON and paste your Client ID:
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-2 rounded-lg font-mono text-[11px] text-gray-700 break-all">
                  <span className="flex-1">{GOOGLE_CLIENT_ID}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(GOOGLE_CLIENT_ID, 'client_id')}
                    className="p-1.5 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-md cursor-pointer shrink-0"
                    title="Copy Client ID"
                  >
                    {copiedField === 'client_id' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Paste Client Secret */}
            <div className="flex items-start gap-2.5">
              <span className="font-bold text-amber-900 bg-amber-100 w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                3
              </span>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-gray-900">
                  Paste your <strong>Client Secret</strong>:
                </p>
                <p className="text-gray-600 text-[11px]">
                  Copy the Client Secret from the Google Cloud Console credentials page where you created this Client ID, paste it into the <strong>Client Secret</strong> field in Supabase, and click <strong>Save</strong>.
                </p>
              </div>
            </div>

            {/* Step 4: Google Cloud Redirect URI */}
            <div className="flex items-start gap-2.5">
              <span className="font-bold text-amber-900 bg-amber-100 w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                4
              </span>
              <div className="flex-1 space-y-1.5">
                <p className="font-semibold text-gray-900">
                  In Google Cloud Console, ensure this <strong>Authorized redirect URI</strong> is added:
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-2 rounded-lg font-mono text-[11px] text-gray-700 break-all">
                  <span className="flex-1">{SUPABASE_OAUTH_CALLBACK_URL}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(SUPABASE_OAUTH_CALLBACK_URL, 'callback_url')}
                    className="p-1.5 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-md cursor-pointer shrink-0"
                    title="Copy Redirect URI"
                  >
                    {copiedField === 'callback_url' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
