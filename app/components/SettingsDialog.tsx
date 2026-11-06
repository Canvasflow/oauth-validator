import { useEffect, useRef, useState } from 'react'
import { getOAuthConfig, saveOAuthConfig, resetOAuthConfig, DEFAULT_AUDIENCE, type OAuthConfig, type VerificationMethod, type AuthFlow } from '../lib/config'
import { SpecDownload } from './SpecDownload'
import { buildConfigExport, downloadConfigExport, parseConfigImport } from '../lib/config-export'
import { SPEC_PDF } from '../lib/spec'

interface Props {
  onClose: () => void
}

const EMPTY_FORM = {
  issuer:                '',
  authorizationEndpoint: '',
  tokenEndpoint:         '',
  clientId:              '',
  redirectUri:           typeof window !== 'undefined' ? `${window.location.origin}/callback` : '',
  scope:                 'openid profile email',
  audience:              '',
  flow:                  'pkce' as AuthFlow,
  verificationMethod:    'jwks' as VerificationMethod,
  jwksUri:               '',
  secret:                '',
  expectedAudience:      '',
  cognitoMode:           false,
  graphqlUrl:            '',
  appKey:                '',
}

// The Canvasflow Resource Server and Specification sections are hidden for
// now; their values still load from and save to the stored config untouched.
const SHOW_RESOURCE_SERVER = false
const SHOW_SPECIFICATION   = false

interface ImportStatus {
  ok: boolean
  name: string
  messages: string[]
}

type Form = typeof EMPTY_FORM

function formFromConfig(cfg: OAuthConfig | null): Form {
  return {
    issuer:                cfg?.issuer                ?? EMPTY_FORM.issuer,
    authorizationEndpoint: cfg?.authorizationEndpoint ?? EMPTY_FORM.authorizationEndpoint,
    tokenEndpoint:         cfg?.tokenEndpoint         ?? EMPTY_FORM.tokenEndpoint,
    clientId:              cfg?.clientId              ?? EMPTY_FORM.clientId,
    redirectUri:           cfg?.redirectUri           ?? EMPTY_FORM.redirectUri,
    scope:                 cfg?.scope                 ?? EMPTY_FORM.scope,
    audience:              cfg?.audience              ?? EMPTY_FORM.audience,
    flow:                  cfg?.flow                  ?? EMPTY_FORM.flow,
    verificationMethod:    cfg?.verificationMethod    ?? EMPTY_FORM.verificationMethod,
    jwksUri:               cfg?.jwksUri               ?? EMPTY_FORM.jwksUri,
    secret:                cfg?.secret                ?? EMPTY_FORM.secret,
    expectedAudience:      cfg?.expectedAudience      ?? EMPTY_FORM.expectedAudience,
    cognitoMode:           cfg?.cognitoMode           ?? EMPTY_FORM.cognitoMode,
    graphqlUrl:            cfg?.graphqlUrl            ?? EMPTY_FORM.graphqlUrl,
    appKey:                cfg?.appKey                ?? EMPTY_FORM.appKey,
  }
}

const inputClass = 'w-full bg-canvas border border-rim text-ink text-sm rounded-lg px-3 py-2 placeholder:text-ink3 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors'
const inputMonoClass = `${inputClass} font-mono`

export function SettingsDialog({ onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [showSecret, setShowSecret] = useState(false)

  const [form, setForm] = useState(() => formFromConfig(getOAuthConfig()))
  const [dragOver, setDragOver] = useState(false)
  const [importResult, setImportResult] = useState<ImportStatus | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validates the file and, only when it is valid, replaces every form field
  // with its values. Nothing is saved until the user clicks Save.
  const importFile = async (file: File) => {
    const result = parseConfigImport(await file.text())
    if (result.ok) {
      setForm(formFromConfig(result.config))
      setShowSecret(false)
      setImportResult({ ok: true, name: file.name, messages: result.warnings })
    } else {
      setImportResult({ ok: false, name: file.name, messages: result.errors })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length !== 1) {
      setImportResult({ ok: false, name: '', messages: ['Drop a single .json file.'] })
      return
    }
    void importFile(files[0])
  }

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    el.showModal()
    const handleNativeClose = () => onClose()
    el.addEventListener('close', handleNativeClose)
    return () => el.removeEventListener('close', handleNativeClose)
  }, [onClose])

  const set = (key: Exclude<keyof typeof form, 'cognitoMode'>) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))

  const setMethod = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, verificationMethod: e.target.value as VerificationMethod }))

  const setFlow = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, flow: e.target.value as AuthFlow }))

  const buildConfig = (): OAuthConfig => ({
    issuer:                form.issuer.trim(),
    authorizationEndpoint: form.authorizationEndpoint.trim(),
    tokenEndpoint:         form.tokenEndpoint.trim(),
    clientId:              form.clientId.trim(),
    redirectUri:           form.redirectUri.trim(),
    scope:                 form.scope.trim(),
    audience:              form.audience.trim() || undefined,
    flow:                  form.flow,
    verificationMethod:    form.verificationMethod,
    jwksUri:               form.verificationMethod === 'jwks'   ? (form.jwksUri.trim() || undefined) : undefined,
    // Not trimmed: the secret's exact UTF-8 bytes are the HMAC key (CF-OAUTH §5.2.2).
    secret:                form.verificationMethod === 'secret' ? (form.secret || undefined)  : undefined,
    expectedAudience:      form.expectedAudience.trim() || undefined,
    cognitoMode:           form.cognitoMode || undefined,
    graphqlUrl:            form.graphqlUrl.trim() || undefined,
    appKey:                form.appKey.trim() || undefined,
  })

  const handleSave = () => {
    saveOAuthConfig(buildConfig())
    dialogRef.current?.close()
  }

  // Same file name and format as the dashboard's Export Configuration panel,
  // built from the settings as currently shown in the form (saved or not).
  // Unlike the dashboard, it always includes the HS256 shared secret.
  const handleDownload = () =>
    downloadConfigExport(buildConfigExport(buildConfig(), { includeSecret: true }))

  const handleReset = () => {
    resetOAuthConfig()
    setForm({ ...EMPTY_FORM, redirectUri: `${window.location.origin}/callback` })
    setShowSecret(false)
    setImportResult(null)
  }

  const isValid = !!(
    form.issuer &&
    form.authorizationEndpoint &&
    (form.flow === 'implicit' || form.tokenEndpoint) &&
    form.clientId &&
    form.redirectUri &&
    form.scope &&
    (form.verificationMethod === 'jwks' || form.secret)
  )

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-[560px] bg-card border border-rim rounded-2xl p-0 text-ink m-auto shadow-xl"
      style={{ maxHeight: 'calc(100dvh - 64px)' }}
      aria-labelledby="settings-title"
    >
      <div className="flex flex-col" style={{ maxHeight: 'calc(100dvh - 64px)' }}>

        {/* Dialog header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rim bg-panel rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="https://canvasflow.io/wp-content/uploads/2022/06/favicon.ico"
              width="20"
              height="20"
              alt="Canvasflow"
              className="rounded-md"
            />
            <h2 id="settings-title" className="text-base font-semibold text-ink">IdP Settings</h2>
          </div>
          <button
            className="p-1.5 rounded-lg text-ink2 hover:text-ink hover:bg-rim transition-colors text-sm leading-none"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
          {/* Import: drop or choose a config file */}
          <div className="flex flex-col gap-2">
            <div
              role="button"
              tabIndex={0}
              aria-label="Import settings from a JSON file: drop it here or press to choose one"
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-brand bg-brand/10' : 'border-rim2 hover:border-ink3 hover:bg-panel'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'copy'
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink3 pointer-events-none" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-sm font-medium text-ink2 pointer-events-none">Drop a configuration .json file here</span>
              <span className="text-xs text-ink3 pointer-events-none">or click to choose one. Fields are filled in; nothing is saved until you click Save.</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void importFile(file)
                  e.target.value = ''
                }}
              />
            </div>

            {importResult && (
              <div
                role={importResult.ok ? 'status' : 'alert'}
                className={`text-sm rounded-xl px-4 py-2.5 leading-relaxed border ${
                  !importResult.ok
                    ? 'bg-bad/10 border-bad/30 text-bad'
                    : importResult.messages.length
                      ? 'bg-warn/10 border-warn/30 text-warn'
                      : 'bg-ok/10 border-ok/30 text-ok'
                }`}
              >
                <p className="font-medium">
                  {importResult.ok
                    ? `Filled the fields from ${importResult.name}. Review them, then Save.`
                    : `Couldn't import${importResult.name ? ` ${importResult.name}` : ''}. The fields were not changed.`}
                </p>
                {importResult.messages.length > 0 && (
                  <ul className="list-disc pl-5 mt-1 text-xs">
                    {importResult.messages.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>

          <p className="text-sm text-ink2 leading-relaxed">
            Configure your OAuth 2.0 / OIDC provider. Values are saved in{' '}
            <code>localStorage</code> and persist across page refreshes.
          </p>

          {/* Grant Type section */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Grant Type</SectionLabel>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink2" htmlFor="s-flow">Flow</label>
              <select
                className={`cf-select ${inputClass}`}
                id="s-flow"
                value={form.flow}
                onChange={setFlow}
              >
                <option value="pkce">Authorization Code + PKCE (recommended)</option>
                <option value="implicit">Implicit — deprecated</option>
              </select>
            </div>

            {form.flow === 'implicit' && (
              <div
                className="flex items-start gap-3 bg-warn/10 border border-warn/30 rounded-xl p-4"
                role="alert"
              >
                <span className="text-base leading-relaxed shrink-0 mt-0.5">⚠️</span>
                <div>
                  <strong className="block text-sm font-semibold text-warn mb-1">
                    Implicit grant is deprecated
                  </strong>
                  <span className="text-xs text-ink2 leading-relaxed">
                    The OAuth 2.0 Security Best Current Practice (RFC 9700) recommends against
                    the implicit grant. Tokens are returned directly in the redirect URL
                    fragment with no proof-of-possession, and no refresh token is issued. Only
                    use this to validate a legacy IdP configuration still running it.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* OAuth Provider section */}
          <div className="flex flex-col gap-3">
            <SectionLabel>OAuth Provider</SectionLabel>
            <Field label="Issuer" id="s-issuer" value={form.issuer} onChange={set('issuer')} placeholder="https://your-idp.example.com" />
            <Field label="Authorization endpoint" id="s-auth-ep" value={form.authorizationEndpoint} onChange={set('authorizationEndpoint')} placeholder="https://your-idp.example.com/authorize" />
            {form.flow !== 'implicit' && (
              <Field label="Token endpoint" id="s-token-ep" value={form.tokenEndpoint} onChange={set('tokenEndpoint')} placeholder="https://your-idp.example.com/oauth/token" />
            )}
            <Field label="Client ID" id="s-client-id" value={form.clientId} onChange={set('clientId')} placeholder="your-client-id" mono />
            <Field label="Redirect URI" id="s-redirect" value={form.redirectUri} onChange={set('redirectUri')} placeholder={`${window.location.origin}/callback`} mono />
            <Field label="Scope" id="s-scope" value={form.scope} onChange={set('scope')} placeholder="openid profile email" mono />
            <Field label="Audience (optional)" id="s-audience" value={form.audience} onChange={set('audience')} placeholder="your-api-identifier" mono />
          </div>

          {/* Token Verification section */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Token Verification</SectionLabel>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink2" htmlFor="s-method">Method</label>
              <select
                className={`cf-select ${inputClass}`}
                id="s-method"
                value={form.verificationMethod}
                onChange={setMethod}
              >
                <option value="jwks">JWKS — asymmetric key (recommended)</option>
                <option value="secret">Shared secret — HMAC</option>
              </select>
            </div>

            {form.verificationMethod === 'jwks' && (
              <Field label="JWKS URI (optional)" id="s-jwks" value={form.jwksUri} onChange={set('jwksUri')} placeholder="https://your-idp.example.com/.well-known/jwks.json" mono />
            )}

            {form.verificationMethod === 'secret' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink2" htmlFor="s-secret">Shared secret</label>
                <div className="flex gap-2">
                  <input
                    className={`${inputMonoClass} flex-1`}
                    id="s-secret"
                    type={showSecret ? 'text' : 'password'}
                    value={form.secret}
                    onChange={set('secret')}
                    placeholder="your-hmac-secret"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="px-3 text-sm text-ink2 border border-rim2 rounded-lg hover:bg-panel hover:text-ink transition-colors flex-shrink-0"
                    onClick={() => setShowSecret(v => !v)}
                    aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-ink3 leading-relaxed">
                  Stored in <code>localStorage</code>. Only use in dev / test environments.
                  Used exactly as typed: its UTF-8 bytes are the HMAC key (at least 32 bytes).
                </p>
              </div>
            )}
          </div>

          {/* Canvasflow Resource Server section */}
          {SHOW_RESOURCE_SERVER && (
            <div className="flex flex-col gap-3">
              <SectionLabel>Canvasflow Resource Server</SectionLabel>
              <Field label="Expected aud" id="s-expected-aud" value={form.expectedAudience} onChange={set('expectedAudience')} placeholder={`${DEFAULT_AUDIENCE} (Cognito: your app client id)`} mono />
              <label className="flex items-start gap-2.5 text-sm text-ink2 cursor-pointer" htmlFor="s-cognito">
                <input
                  id="s-cognito"
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.cognitoMode}
                  onChange={(e) => setForm(prev => ({ ...prev, cognitoMode: e.target.checked }))}
                />
                <span>
                  AWS Cognito mode (<code>typ_strict = false</code>): accept <code>typ</code> "JWT" or
                  absent, and require <code>token_use</code> "access".
                </span>
              </label>
              <Field label="GraphQL URL (V5, optional)" id="s-graphql" value={form.graphqlUrl} onChange={set('graphqlUrl')} placeholder="https://api.example.com/graphql" mono />
              <Field label="PWA app-key (V5, optional)" id="s-app-key" value={form.appKey} onChange={set('appKey')} placeholder="the PWA's app-key" mono />
            </div>
          )}

          {/* Specification section (hidden when the build has no PDF) */}
          {SHOW_SPECIFICATION && SPEC_PDF && (
            <div className="flex flex-col gap-3">
              <SectionLabel>Specification</SectionLabel>
              <p className="text-sm text-ink2 leading-relaxed">
                The Canvasflow Tenant Integration Specification (CF-OAUTH) these checks follow.
              </p>
              <SpecDownload />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-rim bg-panel rounded-b-2xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              className="text-sm font-medium px-3.5 py-2 rounded-xl text-ink2 border border-rim2 hover:bg-rim hover:text-ink transition-colors"
              onClick={handleReset}
            >
              Reset all
            </button>
            <button
              className="p-2.5 rounded-xl text-ink2 border border-rim2 hover:bg-rim hover:text-ink transition-colors"
              onClick={handleDownload}
              title="Download the current settings as JSON"
              aria-label="Download the current settings as JSON"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="text-sm font-medium px-3.5 py-2 rounded-xl text-ink2 border border-rim2 hover:bg-panel hover:text-ink transition-colors"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={!isValid}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.7rem] uppercase tracking-widest text-ink3 pb-2 border-b border-rim">
      {children}
    </p>
  )
}

function Field({
  label, id, value, onChange, placeholder, mono = false,
}: {
  label: string
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-ink2" htmlFor={id}>{label}</label>
      <input
        className={mono ? inputMonoClass : inputClass}
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  )
}
