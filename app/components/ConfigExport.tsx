import { useMemo, useState } from 'react'
import { getOAuthConfig } from '../lib/config'
import { buildConfigExport, downloadConfigExport } from '../lib/config-export'

// Dashboard panel for the shareable config export (file name and format in lib/config-export).

export function ConfigExport() {
  const [config] = useState(getOAuthConfig)
  const [includeSecret, setIncludeSecret] = useState(false)
  const [copied, setCopied] = useState(false)
  const hasSecret = !!config?.secret

  const exported = useMemo(
    () => (config ? buildConfigExport(config, { includeSecret }) : null),
    [config, includeSecret],
  )

  if (!config || !exported) return null
  const { json } = exported

  const handleDownload = () => downloadConfigExport(exported)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const buttonClass =
    'flex-shrink-0 flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-xl text-ink2 border border-rim2 hover:bg-panel hover:text-ink transition-colors'

  return (
    <div className="bg-card border border-rim rounded-2xl overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-rim bg-panel">
        <div>
          <h3 className="text-base font-semibold text-ink mb-1">Export Configuration</h3>
          <p className="text-sm text-ink2 leading-relaxed max-w-lg">
            Download the IdP configuration used for this sign-in as JSON to share it.
            Tokens are never included.
          </p>
        </div>
        <div className="flex gap-2">
          <button className={buttonClass} onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button className={buttonClass} onClick={handleDownload}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download JSON
          </button>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col gap-4">
        {hasSecret && (
          <label className="flex items-center gap-2 text-sm text-ink2 w-fit cursor-pointer">
            <input
              type="checkbox"
              checked={includeSecret}
              onChange={(e) => setIncludeSecret(e.target.checked)}
            />
            Include the HS256 shared secret
          </label>
        )}
        {hasSecret && includeSecret && (
          <div className="text-sm rounded-xl px-4 py-2.5 leading-relaxed border bg-warn/10 border-warn/30 text-warn">
            The export contains the shared secret. Anyone with the file can sign tokens this
            configuration accepts. Share it only over a secure channel.
          </div>
        )}
        <pre className="text-xs font-mono text-ink2 bg-panel border border-rim rounded-xl px-4 py-3 overflow-x-auto max-h-80">
          {json}
        </pre>
      </div>
    </div>
  )
}
